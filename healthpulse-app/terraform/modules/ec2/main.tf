# ============================================
# EC2 Module
# ============================================

variable "environment" {
  type = string
}

variable "team_name" {
  type = string
}

variable "instance_type" {
  type    = string
  default = "t3.micro"
}

variable "instance_count" {
  type    = number
  default = 1
}

variable "subnet_ids" {
  type = list(string)
}

variable "sg_ids" {
  type = list(string)
}

variable "datadog_api_key" {
  type      = string
  sensitive = true
  default   = ""
}

# Get latest Amazon Linux 2023 AMI
data "aws_ami" "amazon_linux" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-*-x86_64"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

resource "aws_instance" "app" {
  count = var.instance_count

  ami                    = data.aws_ami.amazon_linux.id
  instance_type          = var.instance_type
  subnet_id              = var.subnet_ids[count.index % length(var.subnet_ids)]
  vpc_security_group_ids = var.sg_ids

  root_block_device {
    volume_size = var.environment == "prod" ? 30 : var.environment == "qa" ? 20 : 10
    volume_type = "gp3"
    encrypted   = true
  }

  user_data = <<-EOF
    #!/bin/bash
    set -e

    # Install Docker
    yum update -y
    yum install -y docker
    systemctl enable docker
    systemctl start docker
    usermod -aG docker ec2-user

    # Install Docker Compose
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose

    # Install Node.js 20 (for tooling)
    curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
    yum install -y nodejs

    # Install Datadog Agent
    if [ -n "${var.datadog_api_key}" ]; then
      DD_API_KEY="${var.datadog_api_key}" DD_SITE="datadoghq.com" \
        DD_ENV="${var.environment}" DD_SERVICE="healthpulse" \
        bash -c "$(curl -L https://install.datadoghq.com/scripts/install_script_agent7.sh)"
    fi

    echo "Bootstrap complete for healthpulse-${var.environment}-${count.index + 1}"
  EOF

  tags = {
    Name        = "healthpulse-${var.environment}-app-${count.index + 1}"
    Environment = var.environment
    Team        = var.team_name
    Role        = "app-server"
  }
}

output "instance_ids" {
  value = aws_instance.app[*].id
}

output "private_ips" {
  value = aws_instance.app[*].private_ip
}
