output "s3_state_bucket_names" {
  description = "Names of the provisioned S3 remote state buckets"
  value = {
    for env, bucket in aws_s3_bucket.terraform_state : env => bucket.id
  }
}

output "s3_state_bucket_arns" {
  description = "ARNs of the provisioned S3 remote state buckets"
  value = {
    for env, bucket in aws_s3_bucket.terraform_state : env => bucket.arn
  }
}

output "dynamodb_lock_table_names" {
  description = "Names of the provisioned DynamoDB state locking tables"
  value = {
    for env, table in aws_dynamodb_table.terraform_locks : env => table.name
  }
}

output "dynamodb_lock_table_arns" {
  description = "ARNs of the provisioned DynamoDB state locking tables"
  value = {
    for env, table in aws_dynamodb_table.terraform_locks : env => table.arn
  }
}
