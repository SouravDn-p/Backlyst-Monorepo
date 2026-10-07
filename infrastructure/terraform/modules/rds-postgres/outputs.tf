output "database_endpoint" {
  description = "The connection endpoint in address:port format"
  value       = aws_db_instance.postgres.endpoint
}

output "database_address" {
  description = "The hostname of the RDS instance"
  value       = aws_db_instance.postgres.address
}

output "database_port" {
  description = "The database port"
  value       = aws_db_instance.postgres.port
}

output "database_name" {
  description = "The database name"
  value       = aws_db_instance.postgres.db_name
}

output "database_username" {
  description = "The database master username"
  value       = aws_db_instance.postgres.username
}

output "database_id" {
  description = "The RDS instance ID"
  value       = aws_db_instance.postgres.id
}

output "database_arn" {
  description = "The ARN of the RDS instance"
  value       = aws_db_instance.postgres.arn
}
