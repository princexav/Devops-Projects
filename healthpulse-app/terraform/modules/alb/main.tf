# ============================================
# ALB Module
# ============================================
# Students: Complete this module for production load balancing

variable "environment" {
  type = string
}

variable "team_name" {
  type = string
}

variable "vpc_id" {
  type = string
}

variable "public_subnet_ids" {
  type = list(string)
}

variable "instance_ids" {
  type = list(string)
}

variable "sg_ids" {
  type = list(string)
}

resource "aws_lb" "main" {
  name               = "hp-${var.environment}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = var.sg_ids
  subnets            = var.public_subnet_ids

  tags = {
    Name        = "healthpulse-${var.environment}-alb"
    Environment = var.environment
    Team        = var.team_name
  }
}

# Blue target group (active)
resource "aws_lb_target_group" "blue" {
  name     = "hp-${var.environment}-blue"
  port     = 80
  protocol = "HTTP"
  vpc_id   = var.vpc_id

  health_check {
    path                = "/health"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 10
    matcher             = "200"
  }

  tags = {
    Name = "healthpulse-${var.environment}-blue-tg"
    Slot = "blue"
  }
}

# Green target group (standby)
resource "aws_lb_target_group" "green" {
  name     = "hp-${var.environment}-green"
  port     = 80
  protocol = "HTTP"
  vpc_id   = var.vpc_id

  health_check {
    path                = "/health"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 10
    matcher             = "200"
  }

  tags = {
    Name = "healthpulse-${var.environment}-green-tg"
    Slot = "green"
  }
}

# TODO: Students — add:
# - aws_lb_listener (HTTP on port 80, redirect to HTTPS)
# - aws_lb_listener (HTTPS on port 443, forward to blue target group)
# - aws_lb_target_group_attachment for each instance

output "alb_dns_name" {
  value = aws_lb.main.dns_name
}

output "alb_arn" {
  value = aws_lb.main.arn
}

output "blue_tg_arn" {
  value = aws_lb_target_group.blue.arn
}

output "green_tg_arn" {
  value = aws_lb_target_group.green.arn
}
