# ============================================
# S3 Module — Static hosting + backups
# ============================================

variable "environment" {
  type = string
}

variable "team_name" {
  type = string
}

# S3 bucket for hosting production static files
resource "aws_s3_bucket" "static" {
  bucket = "healthpulse-${var.team_name}-${var.environment}-static"

  tags = {
    Name        = "healthpulse-${var.environment}-static"
    Environment = var.environment
  }
}

resource "aws_s3_bucket_public_access_block" "static" {
  bucket                  = aws_s3_bucket.static.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "static" {
  bucket = aws_s3_bucket.static.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# TODO: Students — add:
# - CloudFront Origin Access Identity
# - S3 bucket policy allowing CloudFront OAI access
# - Backup bucket with lifecycle rules

output "bucket_name" {
  value = aws_s3_bucket.static.id
}

output "bucket_arn" {
  value = aws_s3_bucket.static.arn
}

output "bucket_regional_domain" {
  value = aws_s3_bucket.static.bucket_regional_domain_name
}
