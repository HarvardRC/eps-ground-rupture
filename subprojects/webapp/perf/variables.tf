# Inputs of the reference environment (docs/app/ddd.md §7.6). run.mjs
# supplies the two without a default: aws_profile from the environment
# as TF_VAR_aws_profile, and operator_cidr as one -var argument on every
# apply, destroy, and plan (§7.6, Terraform commands).

variable "aws_profile" {
  description = "The AWS profile that egr.perf.awsProfile names, allowed exactly the §7.6 permissions."
  type        = string
}

variable "operator_cidr" {
  description = "The operator's public IPv4 address as a /32, the one source the security group admits on tcp/22."
  type        = string

  validation {
    condition     = can(cidrnetmask(var.operator_cidr)) && endswith(var.operator_cidr, "/32")
    error_message = "operator_cidr must be a single IPv4 address as a /32."
  }
}

# Canonical's Ubuntu Server 24.04 LTS (amd64, gp3) in us-east-1, as the SSM
# parameter
# /aws/service/canonical/ubuntu/server/24.04/stable/current/amd64/hvm/ebs-gp3/ami-id
# named it when the owner read it on 2026-10-31 (OA-16). Changed only by a
# deliberate commit: a report is budget evidence only when its ami_id equals
# this default at its source_commit.
variable "ami_id" {
  description = "The pinned Ubuntu Server 24.04 LTS image of the reference VM (DD-12)."
  type        = string
  default     = "ami-0d6dd9e8265d48906"
}
