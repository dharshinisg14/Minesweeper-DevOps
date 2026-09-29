# Dynamic Ubuntu 22.04 LTS AMI Data Source
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical official account

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# Dynamic TLS Key Pair generation if no key_name or ssh_public_key is provided
resource "tls_private_key" "minesweeper_key" {
  count     = var.key_name == "" && var.ssh_public_key == "" ? 1 : 0
  algorithm = "RSA"
  rsa_bits  = 4096
}

# AWS Key Pair resource
resource "aws_key_pair" "generated_key" {
  count      = var.key_name == "" ? 1 : 0
  key_name   = "minesweeper-key-${var.environment}"
  public_key = var.ssh_public_key != "" ? var.ssh_public_key : tls_private_key.minesweeper_key[0].public_key_openssh
}

# Save generated private key to local file for Ansible SSH use
resource "local_file" "private_key_pem" {
  count           = length(tls_private_key.minesweeper_key) > 0 ? 1 : 0
  content         = tls_private_key.minesweeper_key[0].private_key_pem
  filename        = "${path.module}/../ansible/id_rsa_minesweeper"
  file_permission = "0600"
}

locals {
  selected_key_name = var.key_name != "" ? var.key_name : aws_key_pair.generated_key[0].key_name
}

# ========================================================
# K3s Control Plane / Master Node
# ========================================================
resource "aws_instance" "k3s_master" {
  ami                         = data.aws_ami.ubuntu.id
  instance_type               = var.instance_type
  subnet_id                   = aws_subnet.public_subnets[0].id
  vpc_security_group_ids      = [aws_security_group.k3s_master_sg.id]
  key_name                    = local.selected_key_name
  associate_public_ip_address = true

  root_block_device {
    volume_size           = 30
    volume_type           = "gp3"
    delete_on_termination = true
    encrypted             = true
    tags = {
      Name = "minesweeper-k3s-master-root-${var.environment}"
    }
  }

  tags = {
    Name = "minesweeper-k3s-master-${var.environment}"
    Role = "k3s-master"
    Node = "control-plane"
  }
}

# ========================================================
# K3s Worker Nodes (Configurable Count)
# ========================================================
resource "aws_instance" "k3s_workers" {
  count                       = var.worker_count
  ami                         = data.aws_ami.ubuntu.id
  instance_type               = var.instance_type
  subnet_id                   = aws_subnet.public_subnets[count.index % length(aws_subnet.public_subnets)].id
  vpc_security_group_ids      = [aws_security_group.k3s_worker_sg.id]
  key_name                    = local.selected_key_name
  associate_public_ip_address = true

  root_block_device {
    volume_size           = 25
    volume_type           = "gp3"
    delete_on_termination = true
    encrypted             = true
    tags = {
      Name = "minesweeper-k3s-worker-${count.index + 1}-root-${var.environment}"
    }
  }

  tags = {
    Name = "minesweeper-k3s-worker-${count.index + 1}-${var.environment}"
    Role = "k3s-worker"
    Node = "worker-${count.index + 1}"
  }
}

# ========================================================
# Jenkins Controller Server (Optional Provisioning)
# ========================================================
resource "aws_instance" "jenkins_server" {
  count                       = var.enable_jenkins_ec2 ? 1 : 0
  ami                         = data.aws_ami.ubuntu.id
  instance_type               = var.jenkins_instance_type
  subnet_id                   = aws_subnet.public_subnets[0].id
  vpc_security_group_ids      = [aws_security_group.jenkins_sg[0].id]
  key_name                    = local.selected_key_name
  associate_public_ip_address = true

  root_block_device {
    volume_size           = 40
    volume_type           = "gp3"
    delete_on_termination = true
    encrypted             = true
    tags = {
      Name = "minesweeper-jenkins-root-${var.environment}"
    }
  }

  # Automated bootstrap user_data script for Jenkins controller
  user_data = <<-EOF
              #!/bin/bash
              set -e
              apt-get update -y
              apt-get install -y ca-certificates curl gnupg lsb-release openjdk-17-jdk git unzip jq

              # Install Docker
              mkdir -m 0755 -p /etc/apt/keyrings
              curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
              echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
              apt-get update -y
              apt-get install -y docker-ce docker-ce-cli containerd.io
              usermod -aG docker ubuntu

              # Install Jenkins LTS
              curl -fsSL https://pkg.jenkins.io/debian-stable/jenkins.io-2023.key | tee /usr/share/keyrings/jenkins-keyring.asc > /dev/null
              echo deb [signed-by=/usr/share/keyrings/jenkins-keyring.asc] https://pkg.jenkins.io/debian-stable binary/ | tee /etc/apt/sources.list.d/jenkins.list > /dev/null
              apt-get update -y
              apt-get install -y jenkins
              systemctl enable jenkins
              systemctl start jenkins
              usermod -aG docker jenkins

              # Install kubectl
              curl -fsSL -o /usr/local/bin/kubectl "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
              chmod +x /usr/local/bin/kubectl

              # Install Terraform
              curl -fsSL https://apt.releases.hashicorp.com/gpg | gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg
              echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" | tee /etc/apt/sources.list.d/hashicorp.list
              apt-get update -y && apt-get install -y terraform
              EOF

  tags = {
    Name = "minesweeper-jenkins-${var.environment}"
    Role = "jenkins-controller"
  }
}
