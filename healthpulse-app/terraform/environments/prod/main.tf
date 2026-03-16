# ============================================
# PRODUCTION Environment
# ============================================

module "vpc" {
  source = "../../modules/vpc"

  environment = "prod"
  team_name   = var.team_name
  vpc_cidr    = "10.3.0.0/16"
}

module "security_groups" {
  source = "../../modules/security-groups"

  environment = "prod"
  vpc_id      = module.vpc.vpc_id
}

module "ec2" {
  source = "../../modules/ec2"

  environment    = "prod"
  team_name      = var.team_name
  instance_type  = "t3.large"
  instance_count = 2  # Blue-Green: PROD-A and PROD-B
  subnet_ids     = module.vpc.private_subnet_ids
  sg_ids         = [module.security_groups.app_sg_id]
  datadog_api_key = var.datadog_api_key
}

module "alb" {
  source = "../../modules/alb"

  environment       = "prod"
  team_name         = var.team_name
  vpc_id            = module.vpc.vpc_id
  public_subnet_ids = module.vpc.public_subnet_ids
  instance_ids      = module.ec2.instance_ids
  sg_ids            = [module.security_groups.alb_sg_id]
}

module "cloudfront" {
  source = "../../modules/cloudfront"

  environment = "prod"
  team_name   = var.team_name
  alb_dns     = module.alb.alb_dns_name
}
