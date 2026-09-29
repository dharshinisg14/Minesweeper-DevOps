# Dedicated VPC for Minesweeper Kubernetes Architecture
resource "aws_vpc" "minesweeper_vpc" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "minesweeper-vpc-${var.environment}"
  }
}

# Internet Gateway for internet egress/ingress
resource "aws_internet_gateway" "minesweeper_igw" {
  vpc_id = aws_vpc.minesweeper_vpc.id

  tags = {
    Name = "minesweeper-igw-${var.environment}"
  }
}

# Public Subnets across multiple Availability Zones
resource "aws_subnet" "public_subnets" {
  count                   = length(var.public_subnet_cidrs)
  vpc_id                  = aws_vpc.minesweeper_vpc.id
  cidr_block              = var.public_subnet_cidrs[count.index]
  availability_zone       = var.availability_zones[count.index % length(var.availability_zones)]
  map_public_ip_on_launch = true

  tags = {
    Name                   = "minesweeper-public-subnet-${count.index + 1}-${var.environment}"
    "kubernetes.io/role/elb" = "1"
  }
}

# Public Route Table directing outbound internet traffic to IGW
resource "aws_route_table" "public_rt" {
  vpc_id = aws_vpc.minesweeper_vpc.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.minesweeper_igw.id
  }

  tags = {
    Name = "minesweeper-public-rt-${var.environment}"
  }
}

# Associate Public Subnets with Public Route Table
resource "aws_route_table_association" "public_assoc" {
  count          = length(aws_subnet.public_subnets)
  subnet_id      = aws_subnet.public_subnets[count.index].id
  route_table_id = aws_route_table.public_rt.id
}
