# The reference VM of DD-12 (docs/app/ddd.md §7.6): one c6i.xlarge in
# us-east-1 from the pinned Ubuntu image, its SSH key pair, and the
# security group that admits the operator. It runs in the reference
# network that the owner creates once, outside this root, and finds by
# tag. This root never references the parked data layer elsewhere in the
# repository and shares nothing with it.

locals {
  # The four tags the owner requires of every AWS resource of the project,
  # and ManagedBy, which marks what this root manages.
  tags = {
    Purpose     = "perf-reference"
    School      = "EPS"
    Project     = "eps-ground-rupture"
    Stakeholder = "John Shaw"
    ManagedBy   = "terraform"
  }
}

provider "aws" {
  region  = "us-east-1"
  profile = var.aws_profile

  # Every resource carries the tags from its create request.
  default_tags {
    tags = local.tags
  }
}

# The one public subnet of the reference network, tagged
# Purpose=perf-reference. Exactly one must match, or the plan fails; that
# includes the refresh before every destroy, so the network stays while
# the state records anything.
data "aws_subnet" "reference" {
  filter {
    name   = "tag:Purpose"
    values = ["perf-reference"]
  }
}

# The VM's SSH key, created once per VM lifetime and kept by a re-apply,
# so an existing VM is reused. It lives only in the local state (Access).
resource "tls_private_key" "ssh" {
  algorithm = "ED25519"
}

resource "aws_key_pair" "ssh" {
  key_name_prefix = "egr-perf-reference-"
  public_key      = tls_private_key.ssh.public_key_openssh
}

# Admits tcp/22 from the operator's current /32 only; egress is open. A
# changed operator IP updates only this rule.
resource "aws_security_group" "ssh" {
  name_prefix = "egr-perf-reference-"
  description = "egr perf reference: SSH from the operator only"
  vpc_id      = data.aws_subnet.reference.vpc_id

  ingress {
    description = "SSH from the operator"
    protocol    = "tcp"
    from_port   = 22
    to_port     = 22
    cidr_blocks = [var.operator_cidr]
  }

  egress {
    description = "All outbound"
    protocol    = "-1"
    from_port   = 0
    to_port     = 0
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_instance" "reference" {
  ami                    = var.ami_id
  instance_type          = "c6i.xlarge"
  subnet_id              = data.aws_subnet.reference.id
  key_name               = aws_key_pair.ssh.key_name
  vpc_security_group_ids = [aws_security_group.ssh.id]

  # cloud-init's shutdown -h +1440 must terminate, not stop: EC2 stops an
  # EBS-backed instance on shutdown by default.
  instance_initiated_shutdown_behavior = "terminate"

  user_data                   = file("${path.module}/cloud-init.yaml")
  user_data_replace_on_change = true

  metadata_options {
    http_tokens = "required"
  }

  root_block_device {
    volume_type           = "gp3"
    volume_size           = 30
    delete_on_termination = true
  }

  # The launch request tags the root volume too, and Terraform reads the
  # volume's tags back.
  volume_tags = local.tags

  tags = {
    Name = "egr-perf-reference"
  }
}
