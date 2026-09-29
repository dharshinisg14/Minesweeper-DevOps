# ========================================================
# K3s Master Node Security Group
# ========================================================
resource "aws_security_group" "k3s_master_sg" {
  name        = "minesweeper-k3s-master-sg-${var.environment}"
  description = "Security group for K3s Control Plane / Master node"
  vpc_id      = aws_vpc.minesweeper_vpc.id

  # SSH access (restricted to allowed_ssh_cidr)
  ingress {
    description = "SSH Administration"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.allowed_ssh_cidr]
  }

  # Kubernetes API server access (from workers and admin/Jenkins)
  ingress {
    description = "Kubernetes API Server"
    from_port   = 6443
    to_port     = 6443
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr, var.allowed_ssh_cidr]
  }

  # Ingress Web Traffic (HTTP)
  ingress {
    description = "HTTP Ingress Traffic"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Ingress Web Traffic (HTTPS)
  ingress {
    description = "HTTPS Ingress Traffic"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Flannel VXLAN overlay network (internal cluster communication)
  ingress {
    description = "Flannel VXLAN overlay"
    from_port   = 8472
    to_port     = 8472
    protocol    = "udp"
    cidr_blocks = [var.vpc_cidr]
  }

  # Kubelet metrics and logs
  ingress {
    description = "Kubelet API metrics"
    from_port   = 10250
    to_port     = 10250
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  # Outbound access to internet (for packages, images, updates)
  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "minesweeper-k3s-master-sg-${var.environment}"
  }
}

# ========================================================
# K3s Worker Nodes Security Group
# ========================================================
resource "aws_security_group" "k3s_worker_sg" {
  name        = "minesweeper-k3s-worker-sg-${var.environment}"
  description = "Security group for K3s Worker nodes"
  vpc_id      = aws_vpc.minesweeper_vpc.id

  # SSH access (restricted to allowed_ssh_cidr)
  ingress {
    description = "SSH Administration"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.allowed_ssh_cidr]
  }

  # Ingress Web Traffic (HTTP)
  ingress {
    description = "HTTP Traffic to Ingress/Pods"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Ingress Web Traffic (HTTPS)
  ingress {
    description = "HTTPS Traffic to Ingress/Pods"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Flannel VXLAN overlay network
  ingress {
    description = "Flannel VXLAN overlay"
    from_port   = 8472
    to_port     = 8472
    protocol    = "udp"
    cidr_blocks = [var.vpc_cidr]
  }

  # Kubelet API
  ingress {
    description = "Kubelet API"
    from_port   = 10250
    to_port     = 10250
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  # Kubernetes NodePort range (internal VPC access)
  ingress {
    description = "Kubernetes NodePort range"
    from_port   = 30000
    to_port     = 32767
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  # Outbound access
  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "minesweeper-k3s-worker-sg-${var.environment}"
  }
}

# ========================================================
# Jenkins Security Group (Optional / Configurable)
# ========================================================
resource "aws_security_group" "jenkins_sg" {
  count       = var.enable_jenkins_ec2 ? 1 : 0
  name        = "minesweeper-jenkins-sg-${var.environment}"
  description = "Security group for Jenkins CI/CD controller instance"
  vpc_id      = aws_vpc.minesweeper_vpc.id

  # SSH access
  ingress {
    description = "SSH Administration"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.allowed_ssh_cidr]
  }

  # Jenkins Web UI
  ingress {
    description = "Jenkins Web UI Console"
    from_port   = 8080
    to_port     = 8080
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Outbound access to git, dockerhub, and AWS
  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "minesweeper-jenkins-sg-${var.environment}"
  }
}
