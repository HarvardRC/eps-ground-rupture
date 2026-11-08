# The performance reference environment (docs/app/ddd.md §2, Reference
# environment; §7.6; ADR-0016). Terraform is the operator's installation,
# never a Gradle download; run.mjs refuses one outside this constraint.
# No backend: the state is local, and the root .gitignore rules
# **/.terraform/, *.tfstate, and *.tfstate.* keep it out of commits. The
# state holds the VM's private key (§7.6, Access).
terraform {
  required_version = "~> 1.7"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
  }
}
