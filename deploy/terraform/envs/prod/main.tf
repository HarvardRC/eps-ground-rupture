# Prod environment: bucket eps-ground-rapture-prod, database
# eps_ground_rapture_prod. Versioned; bucket destruction blocked while
# it holds objects (no force_destroy).
#
# Usage:
#   cd deploy/terraform/envs/prod
#   terraform init
#   terraform apply
#
# State is local to this directory (terraform.tfstate, gitignored).

terraform {
  required_version = ">= 1.5"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }
}

provider "aws" {
  profile = "urc"
  # Region is taken from the profile (~/.aws/config). Uncomment to override:
  # region = "us-east-1"
}

module "data" {
  source = "../../modules/data"

  env           = "prod"
  tables        = jsondecode(file("${path.module}/../../tables.json"))
  force_destroy = false
  versioning    = true
}

output "bucket" {
  value = module.data.bucket
}

output "database" {
  value = module.data.database
}

output "workgroup" {
  value = module.data.workgroup
}

output "tables" {
  value = module.data.tables
}

output "sync_command" {
  value = module.data.sync_command
}
