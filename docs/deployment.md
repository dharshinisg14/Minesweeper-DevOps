# Comprehensive Deployment Guide

This guide provides end-to-end instructions for deploying the Minesweeper Clone web application manually or via the automated Jenkins CI/CD pipeline.

---

## 1. Prerequisites

Ensure the following CLI tools are installed on your administration machine or Jenkins agent:

- **Git** (>= 2.30)
- **Node.js** (>= 18.x) & **npm** (>= 9.x)
- **Docker** (>= 24.0) & **Docker Compose**
- **Terraform** (>= 1.5.0)
- **Ansible** (>= 2.14)
- **kubectl** (>= 1.28)
- **AWS CLI** (configured with `aws configure`)

---

## 2. Local Development & Testing

### Run Jest Unit Tests
```bash
cd app
npm ci
npm test
npm run test:coverage
```

### Local Docker Build & Execution
```bash
# Build multi-stage image
docker build -t minesweeper-clone:local .

# Run container on port 8080
docker run -d --name minesweeper-app -p 8080:80 minesweeper-clone:local

# Verify health endpoint
curl http://localhost:8080/healthz

# Open in browser:
# http://localhost:8080
```

---

## 3. Infrastructure Provisioning (Terraform)

1. Navigate to the terraform directory:
   ```bash
   cd terraform
   ```

2. Create your `terraform.tfvars` from the example:
   ```bash
   cp terraform.tfvars.example terraform.tfvars
   ```

3. Configure your variables in `terraform.tfvars`:
   ```hcl
   aws_region       = "us-east-1"
   environment      = "production"
   instance_type    = "t3.medium"
   worker_count     = 2
   allowed_ssh_cidr = "YOUR_PUBLIC_IP/32" # Restrict SSH to your IP
   ```

4. Initialize and apply:
   ```bash
   terraform init
   terraform validate
   terraform plan -out=tfplan
   terraform apply tfplan
   ```

5. Terraform automatically generates `../ansible/inventory/hosts.ini` and outputs public IPs.

---

## 4. Kubernetes Cluster Configuration (Ansible)

1. Navigate to the Ansible directory:
   ```bash
   cd ../ansible
   ```

2. Test SSH connectivity to all provisioned EC2 instances:
   ```bash
   ansible -i inventory/hosts.ini all -m ping
   ```

3. Execute the full cluster bootstrap playbook:
   ```bash
   ansible-playbook -i inventory/hosts.ini playbooks/site.yml
   ```

4. The playbook will:
   - Configure base operating system and disable swap.
   - Install K3s server on the control plane.
   - Fetch the cluster join token dynamically.
   - Install K3s agents on worker nodes and join the cluster.
   - Retrieve `kubeconfig` to your project root and replace `127.0.0.1` with the master public IP.
   - Deploy the NGINX Ingress Controller.

5. Verify the cluster from your machine:
   ```bash
   export KUBECONFIG="$(pwd)/../kubeconfig"
   kubectl get nodes -o wide
   ```

Expected output:
```text
NAME           STATUS   ROLES                  AGE   VERSION
k3s-master     Ready    control-plane,master   3m    v1.28.8+k3s1
k3s-worker-1   Ready    <none>                 2m    v1.28.8+k3s1
k3s-worker-2   Ready    <none>                 2m    v1.28.8+k3s1
```

---

## 5. Kubernetes Application Deployment

1. Deploy the full stack via Kustomize:
   ```bash
   cd ..
   export KUBECONFIG="$(pwd)/kubeconfig"
   kubectl apply -k k8s/
   ```

2. Update to a specific Docker image tag:
   ```bash
   kubectl set image deployment/minesweeper \
     minesweeper=<your-dockerhub-user>/minesweeper-clone:latest \
     -n minesweeper
   ```

3. Monitor the rolling update:
   ```bash
   kubectl rollout status deployment/minesweeper -n minesweeper --timeout=120s
   ```

4. Run the post-deployment health check:
   ```bash
   ./scripts/health-check.sh
   ```

---

## 6. Accessing the Web Application

To access the application using the configured Ingress hostname (`minesweeper.local`):

1. Find the public IP of your K3s Master node:
   ```bash
   terraform -chdir=terraform output -raw k3s_master_public_ip
   ```

2. Add a local DNS mapping to your hosts file (`/etc/hosts` on Linux/macOS or `C:\Windows\System32\drivers\etc\hosts` on Windows):
   ```text
   <K3S_MASTER_PUBLIC_IP>   minesweeper.local
   ```

3. Open your browser and navigate to:
   ```text
   http://minesweeper.local
   ```

---

## 7. Jenkins CI/CD Setup

1. **Install Required Jenkins Plugins**:
   - `Git Plugin`
   - `Pipeline`
   - `Docker Pipeline`
   - `Credentials Binding Plugin`
   - `Amazon Web Services SDK` / `AWS Steps`

2. **Configure Jenkins Credentials**:
   - `dockerhub-credentials`: Username & Password for Docker Hub
   - `aws-credentials`: AWS Access Key ID & Secret Access Key
   - `k3s-ssh-key`: SSH Private Key for EC2 access (`id_rsa_minesweeper`)

3. **Configure GitHub Webhook**:
   - Go to GitHub Repo -> **Settings** -> **Webhooks** -> **Add Webhook**
   - Payload URL: `http://<JENKINS_PUBLIC_IP>:8080/github-webhook/`
   - Content Type: `application/json`
   - Events: `Just the push event` and `Pull requests`

4. **Create Pipeline Job**:
   - New Item -> Pipeline -> Name: `minesweeper-pipeline`
   - Definition: `Pipeline script from SCM`
   - SCM: `Git`
   - Repository URL: `https://github.com/<your-user>/minesweeper-devops.git`
   - Script Path: `Jenkinsfile`

---

## 8. Cleanup & Teardown

To destroy all AWS infrastructure when no longer needed:
```bash
cd terraform
terraform destroy -auto-approve
```
