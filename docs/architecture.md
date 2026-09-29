# System Architecture & Technical Specifications

This document outlines the architectural design, networking topology, orchestration, and continuous integration / continuous deployment (CI/CD) pipelines for the **Minesweeper Clone** project.

---

## 1. High-Level Architecture Overview

The system implements a production-grade DevSecOps lifecycle connecting developer commits to an automatically provisioned, self-healing multi-node Kubernetes cluster on AWS.

```text
+----------------------------------------------------------------------------------------------------+
|                                     DEVELOPER WORKSPACE                                            |
|                                                                                                    |
|    +----------------------+           git push           +-----------------------------------+    |
|    | Local Feature Branch | ----------------------------> | GitHub Repository                 |    |
|    +----------------------+       (Pull Request)          | (main / develop / feature-*)      |    |
|                                                           +-----------------------------------+    |
+---------------------------------------------------------------------|------------------------------+
                                                                      | Webhook Trigger
                                                                      v
+----------------------------------------------------------------------------------------------------+
|                                      JENKINS CI/CD SERVER                                          |
|                                                                                                    |
|  +--------------------+    +--------------------+    +--------------------+    +----------------+  |
|  | 1. Code Checkout   | -> | 2. Dependency Init | -> | 3. Jest Unit Tests | -> | 4. Code Lint   |  |
|  +--------------------+    +--------------------+    +--------------------+    +----------------+  |
|                                                                                         |          |
|  +--------------------+    +--------------------+    +--------------------+             |          |
|  | 7. Docker Registry | <- | 6. Smoke Container | <- | 5. Docker Multi-   | <-----------+          |
|  |    (Docker Hub)    |    |    (Healthz Probe) |    |    Stage Build     |                        |
|  +--------------------+    +--------------------+    +--------------------+                        |
|            |                                                                                       |
|            v                                                                                       |
|  +--------------------+    +--------------------+    +--------------------+    +----------------+  |
|  | 8. Terraform IaC   | -> | 9. Dynamic Ansible | -> | 10. K3s Rollout    | -> | 11. End-to-End |  |
|  |    (AWS VPC & EC2) |    |    (Cluster Boot)  |    |     (Zero-Downtime)|    |     Health Check|  |
|  +--------------------+    +--------------------+    +--------------------+    +----------------+  |
+----------------------------------------------------------------------------------------------------+
                                             |
                                             v
+----------------------------------------------------------------------------------------------------+
|                                   AMAZON WEB SERVICES (VPC)                                        |
|                                                                                                    |
|   +--------------------------------------------------------------------------------------------+   |
|   | Internet Gateway (0.0.0.0/0) & Public Route Tables                                         |   |
|   +--------------------------------------------------------------------------------------------+   |
|         |                                              |                                           |
|         v                                              v                                           |
|   +-------------------------------+              +---------------------------------------------+   |
|   | Public Subnet A (10.0.1.0/24) |              | Public Subnet B (10.0.2.0/24)               |   |
|   |                               |              |                                             |   |
|   |  +-------------------------+  |              |  +-------------------------+                |   |
|   |  | K3s Control Plane /     |  |              |  | K3s Worker Node 2       |                |   |
|   |  | Master Node (EC2)       |  |              |  | (EC2)                   |                |   |
|   |  | K3s Server API (6443)   |  |              |  | Kubelet (10250)         |                |   |
|   |  | Flannel (8472 UDP)      |  |              |  | Flannel (8472 UDP)      |                |   |
|   |  | NGINX Ingress (80/443)  |  |              |  +-------------------------+                |   |
|   |  +-------------------------+  |              |                                             |   |
|   |               ^               |              +---------------------------------------------+   |
|   |               | Flannel VXLAN |                                                                |
|   |               v               |                                                                |
|   |  +-------------------------+  |                                                                |
|   |  | K3s Worker Node 1       |  |                                                                |
|   |  | (EC2)                   |  |                                                                |
|   |  | Kubelet (10250)         |  |                                                                |
|   |  | Flannel (8472 UDP)      |  |                                                                |
|   |  +-------------------------+  |                                                                |
|   +-------------------------------+                                                                |
+----------------------------------------------------------------------------------------------------+
                                             |
                                             v
+----------------------------------------------------------------------------------------------------+
|                                  KUBERNETES WORKLOAD TOPOLOGY                                      |
|                                                                                                    |
|    Namespace: `minesweeper`                                                                        |
|                                                                                                    |
|    +-----------------------------------------------------------------------------------------+     |
|    | Ingress Controller (Host: `minesweeper.local` -> Port 80)                                |     |
|    +-----------------------------------------------------------------------------------------+     |
|                                                |                                                   |
|                                                v                                                   |
|    +-----------------------------------------------------------------------------------------+     |
|    | ClusterIP Service (`minesweeper-service`:80)                                            |     |
|    +-----------------------------------------------------------------------------------------+     |
|                                                |                                                   |
|                        +-----------------------+-----------------------+                           |
|                        |                                               |                           |
|                        v                                               v                           |
|         +-----------------------------+                 +-----------------------------+            |
|         | Pod: minesweeper-replica-1  |                 | Pod: minesweeper-replica-2  |            |
|         | - Nginx Slim Static Server  |                 | - Nginx Slim Static Server  |            |
|         | - Liveness: /healthz        |                 | - Liveness: /healthz        |            |
|         | - Readiness: /healthz       |                 | - Readiness: /healthz       |            |
|         | - Limits: 200m CPU / 128Mi  |                 | - Limits: 200m CPU / 128Mi  |            |
|         +-----------------------------+                 +-----------------------------+            |
|                        ^                                               ^                           |
|                        +-----------------------+-----------------------+                           |
|                                                |                                                   |
|    +-----------------------------------------------------------------------------------------+     |
|    | HorizontalPodAutoscaler (Min: 2, Max: 5, Target CPU: 70%)                               |     |
|    +-----------------------------------------------------------------------------------------+     |
+----------------------------------------------------------------------------------------------------+
```

---

## 2. Infrastructure as Code (Terraform)

- **VPC & Subnets**: Custom 10.0.0.0/16 VPC spanning across 2 Availability Zones.
- **Node Allocation**:
  - `1 x Control Plane` (t3.medium, Ubuntu 22.04 LTS, 30GB gp3)
  - `N x Worker Nodes` (default 2, configurable via `worker_count`, 25GB gp3)
  - `1 x Jenkins Controller` (optional, configurable via `enable_jenkins_ec2`)
- **Security Boundaries**:
  - Ingress on port 22 (SSH) is strictly bound to `var.allowed_ssh_cidr`.
  - Ingress on port 6443 (K8s API) is accessible from worker nodes and authorized CIDR.
  - Flannel overlay (8472 UDP) and Kubelet (10250 TCP) are restricted to the VPC CIDR.
  - Ports 80/443 are opened for public web traffic to the Ingress controller.

---

## 3. Configuration Management (Ansible)

- **Zero-Touch Bootstrap**: Terraform generates `ansible/inventory/hosts.ini` on apply.
- **Roles**:
  - `common`: Prerequisite kernel modules (`overlay`, `br_netfilter`), sysctl params, swap disabling, and base packages.
  - `docker`: Optional container runtime for testing and utilities.
  - `k3s`:
    - Master task installs K3s server with `--disable traefik`, captures the join token from `/var/lib/rancher/k3s/server/node-token`.
    - Distributes kubeconfig to host, replacing loopback (`127.0.0.1`) with the public Elastic/EC2 IP.
    - Worker task uses the dynamically retrieved token to join the control plane.
    - Installs NGINX Ingress controller.

---

## 4. Kubernetes Architecture & Resiliency

- **Namespace Isolation**: All application resources reside inside the `minesweeper` namespace.
- **Zero-Downtime Deployment**: Uses `RollingUpdate` with `maxSurge: 1` and `maxUnavailable: 0`.
- **Self-Healing Probes**:
  - `livenessProbe`: Periodically hits `/healthz`. Restarts container if unresponsive.
  - `readinessProbe`: Ensures static content is ready before allowing the Service to send traffic.
- **Horizontal Scaling**: Scales pods between 2 and 5 replicas based on CPU load.
