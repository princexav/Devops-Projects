# ============================================
# RDS Module — PostgreSQL (for mock API backend)
# ============================================

variable "environment" {
  type = string
}

variable "team_name" {
  type = string
}

variable "vpc_id" {
  type = string
}

variable "subnet_ids" {
  type = list(string)
}

variable "app_sg_id" {
  type = string
}

# TODO: Students — create:
# - aws_db_subnet_group
# - aws_security_group for RDS (allow 5432 from app SG only)
# - aws_db_instance (PostgreSQL, encrypted, multi-AZ for prod)
# - Store credentials in AWS Secrets Manager or parameter store
