# ============================================
# DEV Environment
# ============================================
# Students: This is a starter template.
# Build out the modules and wire them together.

module "vpc" {
  source = "../../modules/vpc"

  environment = "dev"
  team_name   = var.team_name
  vpc_cidr    = "10.0.0.0/16"
}

module "security_groups" {
  source = "../../modules/security-groups"

  environment = "dev"
  vpc_id      = module.vpc.vpc_id
}

module "ec2" {
  source = "../../modules/ec2"

  environment    = "dev"
  team_name      = var.team_name
  instance_type  = "t3.micro"
  instance_count = 1
  subnet_ids     = module.vpc.private_subnet_ids
  sg_ids         = [module.security_groups.app_sg_id]
  datadog_api_key = var.datadog_api_key
}
