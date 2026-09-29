output "vpc_id" {
  description = "The ID of the provisioned AWS VPC"
  value       = aws_vpc.minesweeper_vpc.id
}

output "k3s_master_public_ip" {
  description = "Public IP address of the K3s Control Plane / Master node"
  value       = aws_instance.k3s_master.public_ip
}

output "k3s_master_private_ip" {
  description = "Private IP address of the K3s Control Plane / Master node"
  value       = aws_instance.k3s_master.private_ip
}

output "worker_public_ips" {
  description = "List of public IP addresses for K3s worker nodes"
  value       = aws_instance.k3s_workers[*].public_ip
}

output "worker_private_ips" {
  description = "List of private IP addresses for K3s worker nodes"
  value       = aws_instance.k3s_workers[*].private_ip
}

output "jenkins_public_ip" {
  description = "Public IP address of the Jenkins server (if enabled)"
  value       = var.enable_jenkins_ec2 ? aws_instance.jenkins_server[0].public_ip : "Jenkins EC2 disabled (managed externally)"
}

output "k3s_cluster_endpoint" {
  description = "Kubernetes API Server endpoint URL"
  value       = "https://${aws_instance.k3s_master.public_ip}:6443"
}

output "ingress_access_url" {
  description = "URL to access the Minesweeper application via Ingress (requires local /etc/hosts mapping)"
  value       = "http://${var.domain_name} (Mapped to IP: ${aws_instance.k3s_master.public_ip})"
}

output "ansible_inventory_path" {
  description = "Path to the generated Ansible inventory file"
  value       = local_file.ansible_inventory.filename
}
