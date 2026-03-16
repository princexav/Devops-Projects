# ============================================
# Route 53 Module
# ============================================

variable "domain_name" {
  description = "Domain name for the application"
  type        = string
}

variable "alb_dns_name" {
  description = "ALB DNS name"
  type        = string
  default     = ""
}

variable "alb_zone_id" {
  description = "ALB hosted zone ID"
  type        = string
  default     = ""
}

# TODO: Students — create:
# - aws_route53_zone (if managing DNS in Route 53)
# - aws_route53_record (A record alias to ALB or CloudFront)
# - aws_acm_certificate + validation records
