# ============================================
# Security Groups Module
# ============================================

variable "environment" {
  type = string
}

variable "vpc_id" {
  type = string
}

# ALB Security Group — allows HTTP/HTTPS from the internet
resource "aws_security_group" "alb" {
  name_prefix = "healthpulse-${var.environment}-alb-"
  vpc_id      = var.vpc_id
  description = "Security group for Application Load Balancer"

  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "healthpulse-${var.environment}-alb-sg"
    Environment = var.environment
  }
}

# App Security Group — allows traffic only from ALB
resource "aws_security_group" "app" {
  name_prefix = "healthpulse-${var.environment}-app-"
  vpc_id      = var.vpc_id
  description = "Security group for application servers"

  ingress {
    description     = "HTTP from ALB"
    from_port       = 80
    to_port         = 80
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # TODO: Students — add SSH access via bastion host or SSM
  # Do NOT open port 22 to 0.0.0.0/0

  tags = {
    Name        = "healthpulse-${var.environment}-app-sg"
    Environment = var.environment
  }
}

output "alb_sg_id" {
  value = aws_security_group.alb.id
}

output "app_sg_id" {
  value = aws_security_group.app.id
}
