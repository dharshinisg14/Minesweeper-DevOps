# Troubleshooting Guide & Operational Runbook

This runbook catalogs frequent operational challenges encountered across the CI/CD pipeline, AWS infrastructure, Ansible automation, and Kubernetes orchestration, along with practical remediation steps.

---

## 1. AWS & Terraform Issues

### Issue: SSH Connection Timed Out to EC2 Instances
- **Symptom**: `ssh: connect to host <PUBLIC_IP> port 22: Connection timed out`
- **Root Cause**:
  1. The security group does not allow traffic from your current public IP.
  2. The instance is in a private subnet without public IP association.
- **Resolution**:
  - Update `allowed_ssh_cidr` in `terraform/terraform.tfvars` with your current public IP (`curl ifconfig.me`).
  - Run `terraform -chdir=terraform apply -auto-approve` to update security group rules.
  - Verify key file permissions are `0600`: `chmod 0600 ansible/id_rsa_minesweeper`.

### Issue: Terraform State Locking
- **Symptom**: `Error: Error acquiring the state lock`
- **Resolution**:
  - If another process crashed: `terraform -chdir=terraform force-unlock <LOCK_ID>`.

---

## 2. Ansible & K3s Cluster Issues

### Issue: Worker Node Fails to Join Cluster
- **Symptom**: Worker node is stuck in `NotReady` or does not appear in `kubectl get nodes`.
- **Diagnostic Commands**:
  ```bash
  # SSH into worker node
  ssh -i ansible/id_rsa_minesweeper ubuntu@<WORKER_IP>
  sudo systemctl status k3s-agent
  journalctl -u k3s-agent -xe
  ```
- **Root Cause**:
  1. Master port `6443` or Flannel overlay port `8472 UDP` is blocked between security groups.
  2. Token mismatch in `/var/lib/rancher/k3s/server/node-token`.
- **Resolution**:
  - Verify security group rules allow traffic from the VPC CIDR (`10.0.0.0/16`) on ports `6443` and `8472 UDP`.
  - Re-run the Ansible k3s playbook: `ansible-playbook -i ansible/inventory/hosts.ini ansible/playbooks/k3s.yml`.

### Issue: Kubeconfig Connects to `127.0.0.1:6443` Instead of Master IP
- **Symptom**: `Unable to connect to the server: dial tcp 127.0.0.1:6443: connect: connection refused`
- **Root Cause**: Default K3s kubeconfig uses localhost endpoint.
- **Resolution**:
  - Ensure the Ansible playbook has fetched and replaced the IP:
    ```bash
    MASTER_IP=$(terraform -chdir=terraform output -raw k3s_master_public_ip)
    sed -i "s|127.0.0.1|${MASTER_IP}|g" kubeconfig
    ```

---

## 3. Kubernetes & Workload Issues

### Issue: Pods in `CrashLoopBackOff`
- **Diagnostic Commands**:
  ```bash
  kubectl get pods -n minesweeper
  kubectl logs deployment/minesweeper -n minesweeper --previous
  kubectl describe pod <POD_NAME> -n minesweeper
  ```
- **Root Cause**:
  - Container health check failed.
  - Port binding issue (e.g. attempting to bind privileged port as non-root without proper capabilities).
- **Resolution**:
  - Inspect Nginx configuration syntax.
  - Verify `/healthz` returns 200: `kubectl exec -it <POD_NAME> -n minesweeper -- wget -q -O - http://127.0.0.1/healthz`.

### Issue: Ingress Returns `404 Not Found` or `503 Service Temporarily Unavailable`
- **Symptom**: Browser shows default Nginx 404 or connection refused.
- **Root Cause**:
  1. The HTTP request does not include the Host header `minesweeper.local`.
  2. Ingress controller pods are not yet running in `ingress-nginx` namespace.
- **Resolution**:
  - Ensure `/etc/hosts` includes: `<MASTER_IP> minesweeper.local`.
  - Test directly with curl: `curl -H "Host: minesweeper.local" http://<MASTER_IP>/`.
  - Check ingress controller status: `kubectl get pods -n ingress-nginx`.

---

## 4. CI/CD & Jenkins Issues

### Issue: GitHub Webhook Fails to Trigger Local Jenkins
- **Symptom**: Commits to GitHub do not start the Jenkins build.
- **Root Cause**: GitHub cannot send HTTP POST payloads to private `localhost` or internal IP addresses.
- **Resolution**:
  - For local development, expose Jenkins via tunneling:
    ```bash
    ngrok http 8080
    # Or Cloudflare Tunnel:
    cloudflared tunnel --url http://localhost:8080
    ```
  - Copy the public HTTPS URL from ngrok/cloudflared into GitHub Webhook settings: `https://<tunnel-id>.ngrok-free.app/github-webhook/`.
  - For AWS deployment, use the public IP of the Jenkins EC2 instance: `http://<JENKINS_PUBLIC_IP>:8080/github-webhook/`.

### Issue: Rollout Failure & Automatic Rollback
- **Symptom**: Jenkins logs report `ROLLOUT FAILED OR TIMED OUT! Triggering automatic rollback...`.
- **Diagnostic**:
  ```bash
  kubectl rollout history deployment/minesweeper -n minesweeper
  kubectl rollout status deployment/minesweeper -n minesweeper
  ```
- **Remediation**:
  - The pipeline automatically triggers `kubectl rollout undo deployment/minesweeper -n minesweeper`.
  - Inspect previous revision: `kubectl rollout history deployment/minesweeper -n minesweeper --revision=1`.
