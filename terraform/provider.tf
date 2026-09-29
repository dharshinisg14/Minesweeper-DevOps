provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "Minesweeper-DevOps"
      Environment = var.environment
      ManagedBy   = "Terraform"
      Repository  = "https://github.com/example/minesweeper-devops"
    }
  }
}
