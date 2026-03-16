variable "aws_region" {
  description = "AWS region to deploy resources"
  type        = string
  default     = "us-east-1"
}

variable "team_name" {
  description = "Team name for resource naming (lowercase, no spaces)"
  type        = string
}

variable "environment" {
  description = "Deployment environment"
  type        = string
  validation {
    condition     = contains(["dev", "staging", "qa", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, qa, prod"
  }
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "datadog_api_key" {
  description = "Datadog API key for agent installation"
  type        = string
  sensitive   = true
  default     = ""
}
