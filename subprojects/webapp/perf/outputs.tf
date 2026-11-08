# The values run.mjs reads (docs/app/ddd.md §7.6). The private key is
# sensitive: run.mjs writes it only to a mode-0600 file in a fresh
# temporary directory, deleted afterwards, and never prints it.

output "instance_id" {
  description = "The reference VM's EC2 instance ID."
  value       = aws_instance.reference.id
}

output "public_ip" {
  description = "The reference VM's public IPv4 address."
  value       = aws_instance.reference.public_ip
}

output "ssh_private_key" {
  description = "The VM's per-lifetime SSH key, OpenSSH format."
  value       = tls_private_key.ssh.private_key_openssh
  sensitive   = true
}
