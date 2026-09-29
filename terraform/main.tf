# ===================================================================
# Minesweeper Cloud Infrastructure Automation
# Provisions VPC, Subnets, Gateways, Security Groups, and EC2 Nodes
# For a Multi-Node K3s Kubernetes Cluster and optional Jenkins Server
# ===================================================================

# Local values for naming conventions and resource grouping
locals {
  name_prefix = "minesweeper-${var.environment}"
  common_tags = {
    Project     = "Minesweeper-DevOps"
    Environment = var.environment
    ManagedBy   = "Terraform"
    ClusterType = "K3s"
  }
}
