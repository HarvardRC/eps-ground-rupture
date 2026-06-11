output "bucket" {
  description = "Name of the data bucket."
  value       = aws_s3_bucket.data.bucket
}

output "database" {
  description = "Glue / Athena database name."
  value       = aws_glue_catalog_database.this.name
}

output "workgroup" {
  description = "Athena workgroup to select when connecting (Tableau, Superset, console)."
  value       = aws_athena_workgroup.this.name
}

output "tables" {
  description = "Registered table names."
  value       = sort(keys(var.tables))
}

output "data_location" {
  description = "S3 prefix the Parquet directories must be synced to."
  value       = "s3://${aws_s3_bucket.data.bucket}/${var.data_prefix}/"
}

output "sync_command" {
  description = "Upload the pipeline outputs (run from the repo root)."
  value       = "aws --profile urc s3 sync data/processed/ s3://${aws_s3_bucket.data.bucket}/${var.data_prefix}/ --exclude '*.gitkeep'"
}
