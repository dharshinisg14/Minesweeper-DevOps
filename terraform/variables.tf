variable "aws_region" {
  description = "AWS target deployment region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Target deployment environment (e.g. dev, staging, production)"
  type        = string
  default     = "production"
}

variable "vpc_cidr" {
  description = "CIDR block for the dedicated Minesweeper AWS VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets across distinct availability zones"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "availability_zones" {
  description = "List of availability zones for multi-AZ placement"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b"]
}

variable "instance_type" {
  description = "EC2 instance type for K3s master and worker nodes"
  type        = string
  default     = "t3.medium"
}

variable "worker_count" {
  description = "Configurable number of Kubernetes K3s worker nodes"
  type        = number
  default     = 2
}

variable "key_name" {
  description = "Optional existing AWS EC2 Key Pair name. If blank, an SSH key pair is dynamically generated."
  type        = string
  default     = ""
}

variable "ssh_public_key" {
  description = "Optional SSH public key string for EC2 access. If empty and key_name is empty, Terraform generates a new TLS key pair."
  type        = string
  default     = ""
}

variable "allowed_ssh_cidr" {
  description = "WARNING: Restrict this CIDR block to your trusted IP/VPN (e.g., '203.0.113.50/32') in production. Defaults to '0.0.0.0/0' for demo/educational initial boot."
  type        = string
  default     = "0.0.0.0/0"
}

variable "enable_jenkins_ec2" {
  description = "Whether to provision a dedicated Jenkins controller EC2 instance within the VPC. Set to false if Jenkins is managed externally."
  type        = bool
  default     = false
}

variable "jenkins_instance_type" {
  description = "EC2 instance type for Jenkins server if enabled"
  type        = string
  default     = "t3.large"
}

variable "domain_name" {
  description = "Domain name for the Ingress controller"
  type        = string
  default     = "minesweeper.local"
}
