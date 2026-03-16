# ============================================
# CloudFront Module
# ============================================
# Students: Complete this module for CDN distribution

variable "environment" {
  type = string
}

variable "team_name" {
  type = string
}

variable "alb_dns" {
  description = "ALB DNS name to use as origin"
  type        = string
}

# TODO: Students — create:
# - aws_cloudfront_distribution with ALB origin
# - Cache behavior for /assets/* (long TTL)
# - Default cache behavior (short TTL, forward to ALB)
# - Custom error responses for SPA routing (403/404 -> /index.html)
# - ACM certificate association
# - Viewer protocol policy: redirect-to-https

output "distribution_domain" {
  value = ""  # Replace with cloudfront distribution domain
}
