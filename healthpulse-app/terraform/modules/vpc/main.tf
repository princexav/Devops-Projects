# ============================================
# VPC Module
# ============================================
# Students: Complete this module to create:
# - VPC with provided CIDR
# - 2 public subnets (for ALB)
# - 2 private subnets (for app servers)
# - Internet Gateway
# - NAT Gateway (for private subnet internet access)
# - Route tables

variable "environment" {
  type = string
}

variable "team_name" {
  type = string
}

variable "vpc_cidr" {
  type    = string
  default = "10.0.0.0/16"
}

data "aws_availability_zones" "available" {
  state = "available"
}

resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name        = "healthpulse-${var.environment}-vpc"
    Environment = var.environment
    Team        = var.team_name
  }
}

resource "aws_subnet" "public" {
  count = 2

  vpc_id                  = aws_vpc.main.id
  cidr_block              = cidrsubnet(var.vpc_cidr, 8, count.index)
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name        = "healthpulse-${var.environment}-public-${count.index + 1}"
    Environment = var.environment
  }
}

resource "aws_subnet" "private" {
  count = 2

  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index + 10)
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name        = "healthpulse-${var.environment}-private-${count.index + 1}"
    Environment = var.environment
  }
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name        = "healthpulse-${var.environment}-igw"
    Environment = var.environment
  }
}

# TODO: Students — add the following resources:
# - aws_eip for NAT Gateway
# - aws_nat_gateway
# - aws_route_table for public subnets (route to IGW)
# - aws_route_table for private subnets (route to NAT GW)
# - aws_route_table_association for all subnets

output "vpc_id" {
  value = aws_vpc.main.id
}

output "public_subnet_ids" {
  value = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  value = aws_subnet.private[*].id
}
