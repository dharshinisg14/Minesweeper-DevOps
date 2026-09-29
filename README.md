# Minesweeper Clone – Automated CI/CD Deployment using GitHub, Jenkins, Docker, Terraform, Ansible and Kubernetes

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)](https://github.com)
[![Kubernetes](https://img.shields.io/badge/k8s-K3s%20v1.28-blue.svg)](https://k3s.io)
[![Terraform](https://img.shields.io/badge/IaC-Terraform%20v1.5+-purple.svg)](https://terraform.io)
[![Ansible](https://img.shields.io/badge/Config-Ansible%202.14+-red.svg)](https://ansible.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

An enterprise-grade, end-to-end DevOps demonstration that deploys a modern, grid-based **Minesweeper web application** across AWS infrastructure using **GitHub**, **Jenkins CI/CD**, **Docker**, **Terraform**, **Ansible**, and a **K3s Kubernetes cluster**.

---

## Table of Contents

1. [Project Title & Overview](#1-project-title--overview)
2. [Problem Statement](#2-problem-statement)
3. [Project Objective](#3-project-objective)
4. [Application Features](#4-application-features)
5. [Architecture Diagram](#5-architecture-diagram)
6. [Technology Stack](#6-technology-stack)
7. [Repository Structure](#7-repository-structure)
8. [Branching Strategy](#8-branching-strategy)
9. [Local Application Setup](#9-local-application-setup)
10. [Unit Testing](#10-unit-testing)
11. [Docker Containerization](#11-docker-containerization)
12. [Docker Hub Registry Setup](#12-docker-hub-registry-setup)
13. [AWS Cloud Prerequisites](#13-aws-cloud-prerequisites)
14. [Terraform Infrastructure as Code](#14-terraform-infrastructure-as-code)
15. [Ansible Configuration Management](#15-ansible-configuration-management)
16. [K3s Kubernetes Cluster Setup](#16-k3s-kubernetes-cluster-setup)
17. [Kubernetes Manifests & Deployment](#17-kubernetes-manifests--deployment)
18. [Jenkins CI/CD Server Configuration](#18-jenkins-cicd-server-configuration)
19. [GitHub Webhook Integration](#19-github-webhook-integration)
20. [CI/CD Pipeline Workflow](#20-cicd-pipeline-workflow)
21. [Monitoring & Health Checks](#21-monitoring--health-checks)
22. [Zero-Downtime Rollout & Rollback](#22-zero-downtime-rollout--rollback)
23. [Operational Troubleshooting](#23-operational-troubleshooting)
24. [DevSecOps Security Considerations](#24-devsecops-security-considerations)
25. [Cleanup & Resource Teardown](#25-cleanup--resource-teardown)
26. [Future Improvements](#26-future-improvements)

---

## 1. Project Title & Overview

**Minesweeper Clone – Automated CI/CD Deployment using GitHub, Jenkins, Docker, Terraform, Ansible and Kubernetes**

This project demonstrates the complete software delivery lifecycle (SDLC) from code commit to automated zero-downtime production deployment. The web application is built strictly with **pure HTML5, CSS3, and Vanilla JavaScript** without heavy frontend frameworks, pairing lightweight client performance with robust cloud-native infrastructure automation.

---

## 2. Problem Statement

Modern cloud operations require seamless collaboration between application code, infrastructure provisioning, automated configuration management, and container orchestration. Traditional application deployments often suffer from:
- Manual, error-prone server provisioning and configuration drift.
- Downtime during releases and lack of automated rollbacks.
- Insufficient testing stages before containerization.
- Hardcoded secrets and insecure credential distribution in source code.

---

## 3. Project Objective

The primary objective of this project is to build a production-ready, highly reliable cloud delivery pipeline that:
1. Dynamically provisions AWS network infrastructure (VPC, Subnets, Routing, Security Groups) and EC2 instances using **Terraform**.
2. Automatically bootstraps and configures a multi-node **K3s Kubernetes cluster** (1 control-plane, 2 worker nodes) using **Ansible**.
3. Containerizes the Minesweeper application with an optimized multi-stage **Docker** build running unit tests before packaging.
4. Executes an automated **Jenkins CI/CD** pipeline triggered by GitHub pull requests and branch merges.
5. Deploys the containerized game onto Kubernetes using declarative **Kustomize** manifests, rolling update strategies, and self-healing health probes.

---

## 4. Application Features

- **Dynamic Board Generation**: Created entirely via JavaScript DOM manipulation.
- **Random Mine Distribution**: Non-duplicate placement with first-click safety.
- **Adjacent Mine Calculation**: Real-time 8-directional neighbor detection.
- **Recursive Flood-Fill**: Automatic discovery of adjoining blank cells when a zero-count cell is revealed.
- **Flagging Mechanism**: Right-click on desktop or touch mode toggle on mobile to flag suspected mines.
- **Three Standard Difficulty Levels**:
  - **Easy**: 9 × 9 grid, 10 mines
  - **Medium**: 16 × 16 grid, 40 mines
  - **Hard**: 30 × 16 grid, 99 mines
- **Interactive UI Dashboard**:
  - Retro-modern red LCD digital counters for remaining mines and elapsed time.
  - Interactive status face button (🙂 normal, 😮 clicking, 😎 win, 😵 game over) for immediate restarts.
  - Distinct styling and color-coding for numbers 1 through 8.
- **Audio Synthesis**: Pure Web Audio API sound effects (reveal click, flag chime, mine explosion, win fanfare) with mute toggle.
- **Mobile Responsive**: Custom touch mode switcher (Dig ⛏️ / Flag 🚩) and horizontal scroll container for large boards.
- **Zero Framework Bloat**: Pure Vanilla JS, zero runtime NPM dependencies.

---

## 5. Architecture Diagram

```text
Developer
   |
   | git push / Pull Request
   v
GitHub Repository
   |
   | Webhook (POST /github-webhook/)
   v
Jenkins CI/CD Controller
   |
   +----> 1. npm install (in /app)
   |
   +----> 2. Jest Unit Tests & Linting
   |
   +----> 3. Docker Multi-Stage Build (Node.js test stage -> Nginx Slim runtime)
   |
   +----> 4. Container Smoke Test (HTTP GET /healthz)
   |
   +----> 5. Docker Push (Docker Hub: latest, Git SHA, Build #)
   |
   +----> 6. Terraform IaC
   |          |
   |          v
   |        Amazon Web Services (AWS)
   |          |
   |     +----+--------------------------------+
   |     |                                     |
   |   VPC (10.0.0.0/16)                 Internet Gateway
   |     |                                     |
   |     +----------------+--------------------+
   |                      |
   |          +-----------+-----------+
   |          |                       |
   |     Subnet A (AZ-1)         Subnet B (AZ-2)
   |          |                       |
   |     K3s Control Plane        K3s Worker 1 & 2
   |          |                       |
   |          +-----------+-----------+
   |                      |
   +----> 7. Dynamic Ansible Inventory Generation (hosts.ini)
   |          |
   |          v
   +----> 8. Ansible Playbooks (site.yml)
   |          |-- Prereqs, swapoff, sysctl
   |          |-- K3s server on master
   |          |-- Dynamic token extraction
   |          |-- K3s agent join on workers
   |          |-- Kubeconfig distribution
   |          +-- NGINX Ingress controller installation
   |
   +----> 9. Kubernetes Orchestration (k8s/)
              |
         +----+----------------------------------+
         |                                       |
     Namespace                               ConfigMap
  (`minesweeper`)                      (`minesweeper-config`)
         |                                       |
         +-------------------+-------------------+
                             |
                             v
                  Deployment (2 Replicas)
                  - Strategy: RollingUpdate
                  - Liveness & Readiness Probes
                  - Resource Requests & Limits
                             |
                             v
                 ClusterIP Service (Port 80)
                             |
                             v
                 NGINX Ingress Controller
                             |
                             v
               http://minesweeper.local
```

---

## 6. Technology Stack

| Category | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | HTML5, CSS3, Vanilla JavaScript | Responsive grid UI, state management, Web Audio |
| **Unit Testing** | Node.js, npm, Jest | Automated logic test suite & code coverage |
| **Source Control** | Git, GitHub | Feature branching, pull requests, automated webhooks |
| **CI/CD Automation** | Jenkins LTS | Declarative pipeline orchestrating test, build, deploy |
| **Containerization** | Docker, Nginx Alpine | Multi-stage image build, static serving |
| **Image Registry** | Docker Hub | Versioned container image artifact storage |
| **Infrastructure as Code** | Terraform (v1.5+) | Declarative AWS VPC, subnets, SGs, and EC2 provisioning |
| **Configuration Management**| Ansible (v2.14+) | OS hardening, dependencies, K3s clustering |
| **Kubernetes Cluster** | K3s (Rancher) | Lightweight production-grade Kubernetes v1.28 |
| **Kubernetes Manifests** | Kustomize, YAML | Declarative deployments, services, ingress, HPA |
| **Ingress Controller** | NGINX Ingress Controller | Layer 7 HTTP path and host routing |
| **Cloud Provider** | Amazon Web Services (AWS) | EC2, VPC, Internet Gateway, Route Tables |

---

## 7. Repository Structure

```text
minesweeper-devops/
├── app/
│   ├── index.html              # Modern, accessible responsive HTML5 structure
│   ├── style.css               # Modern dark-mode cyber design system
│   ├── script.js               # Client controller, sound synthesis, event wiring
│   ├── minesweeper-game.js     # Decoupled core game engine (UMD / CommonJS)
│   ├── package.json            # npm metadata, Jest test runner, coverage rules
│   └── tests/
│       └── minesweeper.test.js # Comprehensive Jest test suite (9 test suites)
│
├── Dockerfile                  # Multi-stage build (Node.js test -> Nginx slim runtime)
├── .dockerignore               # Build optimization exclusions
├── nginx.conf                  # Production Nginx config (gzip, security headers, /healthz)
│
├── Jenkinsfile                 # Declarative CI/CD pipeline (PR testing vs. main release)
│
├── terraform/
│   ├── main.tf                 # Global project locals and shared metadata
│   ├── versions.tf             # Provider requirements (aws, local, tls)
│   ├── provider.tf             # AWS provider with default tags
│   ├── variables.tf            # Parameter definitions with security warnings
│   ├── networking.tf           # AWS VPC, subnets across AZs, IGW, route tables
│   ├── security.tf             # Security groups for K3s master, workers, Jenkins
│   ├── ec2.tf                  # Ubuntu 22.04 LTS instances, dynamic TLS key pair
│   ├── inventory.tf            # Automated Ansible inventory generator (hosts.ini)
│   ├── outputs.tf              # IPs, endpoints, and VPC connection outputs
│   ├── terraform.tfvars.example# Parameter template (never commit real secrets)
│   └── backend.tf.example      # S3 remote state and DynamoDB locking example
│
├── ansible/
│   ├── ansible.cfg             # SSH connection tuning, disabled host key check
│   ├── inventory/
│   │   └── hosts.ini           # Cluster inventory (auto-managed by Terraform)
│   ├── group_vars/
│   │   └── all.yml             # Global variables (K3s version, server flags, URLs)
│   ├── playbooks/
│   │   ├── site.yml            # Master orchestration playbook
│   │   ├── common.yml          # OS prerequisites, swapoff, sysctl networking
│   │   ├── docker.yml          # Docker CE setup
│   │   └── k3s.yml             # Control plane bootstrap, worker join, verification
│   └── roles/
│       ├── common/tasks/main.yml
│       ├── docker/tasks/main.yml
│       └── k3s/
│           ├── tasks/
│           │   ├── main.yml    # Role dispatcher (master vs. worker)
│           │   ├── master.yml  # K3s server setup, token capture, kubeconfig fetch
│           │   ├── worker.yml  # Dynamic token validation, K3s agent join
│           │   └── verify.yml  # Node readiness and pod verification
│
├── k8s/
│   ├── namespace.yaml          # Isolated namespace (`minesweeper`)
│   ├── configmap.yaml          # Application runtime configuration
│   ├── deployment.yaml         # 2 replicas, rolling update, liveness/readiness probes
│   ├── service.yaml            # Internal ClusterIP service exposing port 80
│   ├── ingress.yaml            # Ingress rule for host `minesweeper.local`
│   ├── hpa.yaml                # HorizontalPodAutoscaler (2 to 5 pods, 70% CPU)
│   └── kustomization.yaml      # Master Kustomize bundle with image tagging
│
├── scripts/
│   ├── build.sh                # Multi-tagged Docker container build script
│   ├── test.sh                 # Unit test and lint validation script
│   ├── deploy.sh               # K8s rollout script with automatic rollback
│   └── health-check.sh         # End-to-end post-deployment verification script
│
├── docs/
│   ├── architecture.md         # Detailed architectural and network specifications
│   ├── deployment.md           # Step-by-step infrastructure and deployment runbook
│   ├── troubleshooting.md      # Operational runbook and debugging guide
│   └── screenshots.md          # UI wireframes and Jenkins pipeline visualizations
│
├── .gitignore                  # Git exclusions for secrets, state, and node_modules
├── README.md                   # Master project documentation
└── LICENSE                     # MIT Open Source License
```

---

## 8. Branching Strategy

The repository follows an enterprise **Git-Flow** branching model:

```text
[feature/minesweeper-board] ---\
                                \ (Pull Request)
[feature/docker-k8s] -----------> [develop] -------------> [main] (Production Deployment)
                                          (Staging Test)     ^
[fix/timer-bug] ---------------------------------------------/
```

- `main`: Represents production-ready code. Protected branch; direct pushes are prohibited. Merges into `main` trigger full infrastructure provisioning and Kubernetes deployment.
- `develop`: Integration branch for completed features. Triggers automated testing and staging builds.
- `feature/<name>`: Short-lived branches created for isolated feature work.
- `fix/<name>`: Bugfix branches for targeted defects.
- **Pull Request Policy**: All PRs targeting `main` or `develop` must pass the Jenkins CI validation pipeline (linting, Jest tests, Docker build, and container smoke test) before approval.

---

## 9. Local Application Setup

You can run the web application locally without any backend server:

```bash
# 1. Clone the repository
git clone https://github.com/<your-username>/minesweeper-devops.git
cd minesweeper-devops/app

# 2. Open index.html directly in your preferred web browser:
# On Windows:
start index.html

# On macOS:
open index.html

# On Linux:
xdg-open index.html
```

---

## 10. Unit Testing

The game logic is isolated inside `app/minesweeper-game.js` and verified using **Jest**.

### Covered Scenarios:
1. **Board Generation**: Correct row/column initialization and cell data models.
2. **Difficulty Configuration**: Verification of Easy (9x9, 10), Medium (16x16, 40), Hard (30x16, 99), and custom settings.
3. **Mine Placement**: Total mine count verification and zero duplicate placement guarantee.
4. **Safe First-Click**: Asserts that the first clicked coordinate never contains a mine.
5. **Neighbor Mine Calculation**: Tests correct 8-directional mine tallies on adjacent tiles.
6. **Recursive Blank Reveal**: Validates flood-fill expansion when zero-count cells are clicked.
7. **Flag Toggling**: Tests flag addition/removal, mine counter decrementing, and reveal prevention on flagged tiles.
8. **Win Condition**: Detects victory when all non-mine cells are uncovered.
9. **Lose Condition**: Detects game over and tile explosion when a mine is clicked.

### Run Tests:
```bash
cd app
npm install
npm test
npm run test:coverage
```

---

## 11. Docker Containerization

The project uses an optimized **Multi-Stage Dockerfile**:
- **Stage 1 (test-runner)**: Uses `node:20-alpine` to install dependencies and execute `npm test`. If any test fails, the build terminates immediately.
- **Stage 2 (production)**: Uses `nginx:1.27-alpine-slim` to serve static assets. Copies only the verified HTML, CSS, and JS files, includes a custom `nginx.conf`, and adds an automated healthcheck.

### Build and Run Locally:
```bash
# Build multi-stage image
docker build -t minesweeper-clone:latest .

# Run container on port 8080
docker run -d --name minesweeper -p 8080:80 minesweeper-clone:latest

# Check container health status
docker inspect --format='{{json .State.Health.Status}}' minesweeper
```

---

## 12. Docker Hub Registry Setup

1. Create a free account on [Docker Hub](https://hub.docker.com).
2. Generate an Access Token under **Account Settings -> Security -> New Access Token**.
3. In Jenkins, create a **Username with password** credential named `dockerhub-credentials`.
4. Images are automatically published with three immutable tags:
   - `devopsdemo/minesweeper-clone:latest`
   - `devopsdemo/minesweeper-clone:<git-commit-sha>`
   - `devopsdemo/minesweeper-clone:build-<build-number>`

---

## 13. AWS Cloud Prerequisites

Before running Terraform:
1. An active AWS Account.
2. An IAM User with permissions for EC2, VPC, Internet Gateways, Route Tables, and Security Groups.
3. Configure AWS CLI locally:
   ```bash
   aws configure
   ```

---

## 14. Terraform Infrastructure as Code

Terraform provisions the underlying virtual machines and network architecture on AWS:

```bash
cd terraform

# 1. Copy sample variables
cp terraform.tfvars.example terraform.tfvars

# 2. Modify variables (Set allowed_ssh_cidr to your IP for security)
nano terraform.tfvars

# 3. Initialize, validate, and apply
terraform init
terraform validate
terraform plan -out=tfplan
terraform apply tfplan
```

### Dynamic Inventory Generation
Terraform includes `inventory.tf`, which converts the provisioned EC2 instance IP addresses into `ansible/inventory/hosts.ini` without manual intervention.

---

## 15. Ansible Configuration Management

Ansible automates server baseline configuration:
```bash
cd ansible

# Verify connectivity
ansible -i inventory/hosts.ini all -m ping

# Execute master playbook
ansible-playbook -i inventory/hosts.ini playbooks/site.yml
```

---

## 16. K3s Kubernetes Cluster Setup

Why K3s over AWS EKS?
- Lightweight resource footprint suitable for development and cost optimization on standard EC2 instances.
- Demonstrates true bare-metal/VM Kubernetes bootstrapping, control-plane initialization, and dynamic token joining via Ansible.

### Verification:
```bash
export KUBECONFIG="$(pwd)/kubeconfig"
kubectl get nodes -o wide
```

Expected node states:
```text
NAME           STATUS   ROLES                  AGE   VERSION
k3s-master     Ready    control-plane,master   3m    v1.28.8+k3s1
k3s-worker-1   Ready    <none>                 2m    v1.28.8+k3s1
k3s-worker-2   Ready    <none>                 2m    v1.28.8+k3s1
```

---

## 17. Kubernetes Manifests & Deployment

All Kubernetes resources are located in `k8s/` and managed with **Kustomize**:

```bash
# Deploy all resources
kubectl apply -k k8s/

# Update image during CI/CD
kubectl set image deployment/minesweeper \
  minesweeper=devopsdemo/minesweeper-clone:<git-commit-sha> \
  -n minesweeper
```

---

## 18. Jenkins CI/CD Server Configuration

### Required Jenkins Plugins:
- Pipeline
- Git Plugin
- Docker Pipeline
- Credentials Binding Plugin
- CloudBees AWS Credentials Plugin

### Required Jenkins Credentials:
| Credential ID | Type | Description |
| :--- | :--- | :--- |
| `dockerhub-credentials` | Username with password | Docker Hub registry authentication |
| `aws-credentials` | AWS Credentials | AWS Access Key ID & Secret Access Key |
| `k3s-ssh-key` | SSH Username with private key | EC2 SSH access (`ansible/id_rsa_minesweeper`) |

---

## 19. GitHub Webhook Integration

To trigger builds on code push or pull request creation:
1. Open your GitHub repository -> **Settings** -> **Webhooks** -> **Add webhook**.
2. **Payload URL**: `http://<JENKINS_PUBLIC_IP>:8080/github-webhook/`
3. **Content type**: `application/json`
4. **Events**: Select *Pushes* and *Pull requests*.
5. Click **Add webhook**.

> *Note for local Jenkins*: Use a secure tunnel such as `ngrok http 8080` to provide a publicly accessible webhook endpoint.

---

## 20. CI/CD Pipeline Workflow

The declarative `Jenkinsfile` enforces distinct logic depending on the trigger:

```text
[ Incoming Webhook Trigger ]
            |
            v
[ Checkout Source Code ]
            |
            v
[ Install Dependencies & Lint ]
            |
            v
[ Run Jest Unit Tests ]
            |
            v
[ Multi-Stage Docker Build ]
            |
            v
[ Ephemeral Container Smoke Test ]
            |
            +-----------------------------------------------+
            |                                               |
     (Pull Request?)                                   (Main Branch?)
            |                                               |
            v                                               v
    [ Stop & Report PR Status ]                  [ Push Images to Docker Hub ]
    (Do NOT deploy to production)                           |
                                                            v
                                                 [ Terraform Plan & Apply ]
                                                            |
                                                            v
                                                 [ Ansible K3s Bootstrap ]
                                                            |
                                                            v
                                                 [ Zero-Downtime K8s Rollout ]
                                                            |
                                                            v
                                                 [ End-to-End Health Checks ]
```

---

## 21. Monitoring & Health Checks

Post-deployment verification is managed by `./scripts/health-check.sh`:
1. **Deployment Status**: Confirms available replicas >= 1.
2. **Pod Health**: Ensures zero pods are in `Error` or `CrashLoopBackOff`.
3. **Service & Endpoints**: Verifies internal ClusterIP and healthy endpoints.
4. **Ingress Configuration**: Validates routing rules.
5. **HTTP Probe**: Probes `/healthz` via port-forwarding and verifies HTTP `200 OK`.

---

## 22. Zero-Downtime Rollout & Rollback

### Rolling Update Strategy:
```yaml
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxSurge: 1
    maxUnavailable: 0
```
Kubernetes ensures that traffic continues flowing to healthy existing pods while new pods pass their `readinessProbe` before terminating old pods.

### Automated Rollback:
If a rollout times out or fails health checks, Jenkins triggers:
```bash
kubectl rollout undo deployment/minesweeper -n minesweeper
```

---

## 23. Operational Troubleshooting

Refer to [`docs/troubleshooting.md`](docs/troubleshooting.md) for detailed diagnostics:
- **SSH Connectivity**: Adjust `allowed_ssh_cidr` in `terraform.tfvars`.
- **K3s Joining**: Verify ports `6443` and `8472 UDP` in security groups.
- **Kubeconfig Loopback**: Replace `127.0.0.1` with the master's public IP.
- **Ingress 404**: Confirm `/etc/hosts` contains `<MASTER_IP> minesweeper.local`.

---

## 24. DevSecOps Security Considerations

- **No Secrets in Source Control**: All sensitive values are managed through Jenkins Credentials and `.gitignore`.
- **Minimal Ingress Exposure**: Port 22 SSH is configurable to trusted CIDR blocks.
- **Multi-Stage Build Security**: Production Docker image contains only Nginx and static assets; dev dependencies are excluded.
- **Kubernetes Pod Hardening**: Containers run with dropped capabilities and non-escalating privileges.
- **Immutable Artifacts**: Deployments use unique Git commit SHA tags rather than mutable `:latest`.

---

## 25. Cleanup & Resource Teardown

To avoid unnecessary AWS charges, destroy all provisioned infrastructure when finished:

```bash
cd terraform
terraform destroy -auto-approve
```

---

## 26. Future Improvements

- Implement **Prometheus & Grafana** monitoring stack for node and cluster observability.
- Automate SSL/TLS certificate issuing using **Cert-Manager** and **Let's Encrypt**.
- Introduce **Trivy** vulnerability scanning into the Jenkins Docker build stage.
- Implement **ArgoCD** for GitOps-driven continuous deployment.
- Integrate **HashiCorp Vault** for enterprise secret rotation.
