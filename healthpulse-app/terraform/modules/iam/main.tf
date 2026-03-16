# ============================================
# IAM Module
# ============================================

variable "environment" {
  type = string
}

variable "team_name" {
  type = string
}

# EC2 Instance Profile for app servers
resource "aws_iam_role" "app_server" {
  name = "healthpulse-${var.environment}-app-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name        = "healthpulse-${var.environment}-app-role"
    Environment = var.environment
  }
}

# Allow EC2 to pull from S3 and write logs
resource "aws_iam_role_policy" "app_server" {
  name = "healthpulse-${var.environment}-app-policy"
  role = aws_iam_role.app_server.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:ListBucket"
        ]
        Resource = [
          "arn:aws:s3:::healthpulse-${var.team_name}-*",
          "arn:aws:s3:::healthpulse-${var.team_name}-*/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      }
    ]
  })
}

resource "aws_iam_instance_profile" "app_server" {
  name = "healthpulse-${var.environment}-app-profile"
  role = aws_iam_role.app_server.name
}

# TODO: Students — add:
# - SSM managed policy attachment (for Session Manager SSH alternative)
# - CI/CD deployment role with least-privilege permissions
# - S3 read/write for deployment artifacts

output "instance_profile_name" {
  value = aws_iam_instance_profile.app_server.name
}
