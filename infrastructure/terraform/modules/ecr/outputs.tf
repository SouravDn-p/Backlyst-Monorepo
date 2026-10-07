output "repository_urls" {
  description = "Map of microservice name to ECR repository URL"
  value       = { for k, v in aws_ecr_repository.this : k => v.repository_url }
}

output "repository_arns" {
  description = "Map of microservice name to ECR repository ARN"
  value       = { for k, v in aws_ecr_repository.this : k => v.arn }
}

output "repository_names" {
  description = "Map of microservice name to ECR repository name"
  value       = { for k, v in aws_ecr_repository.this : k => v.name }
}

output "repository_arns_list" {
  description = "List of all ECR repository ARNs created by this module"
  value       = [for k, v in aws_ecr_repository.this : v.arn]
}

output "registry_id" {
  description = "The registry ID where the repositories were created"
  value       = length(aws_ecr_repository.this) > 0 ? values(aws_ecr_repository.this)[0].registry_id : ""
}

output "backend_repository_url" {
  description = "ECR repository URL for backend service"
  value       = lookup({ for k, v in aws_ecr_repository.this : k => v.repository_url }, "backend", null)
}

output "backend_repository_arn" {
  description = "ECR repository ARN for backend service"
  value       = lookup({ for k, v in aws_ecr_repository.this : k => v.arn }, "backend", null)
}

output "frontend_repository_url" {
  description = "ECR repository URL for frontend service"
  value       = lookup({ for k, v in aws_ecr_repository.this : k => v.repository_url }, "frontend", null)
}

output "frontend_repository_arn" {
  description = "ECR repository ARN for frontend service"
  value       = lookup({ for k, v in aws_ecr_repository.this : k => v.arn }, "frontend", null)
}

output "admin_repository_url" {
  description = "ECR repository URL for admin dashboard service"
  value       = lookup({ for k, v in aws_ecr_repository.this : k => v.repository_url }, "admin-dashboard", null)
}

output "admin_repository_arn" {
  description = "ECR repository ARN for admin dashboard service"
  value       = lookup({ for k, v in aws_ecr_repository.this : k => v.arn }, "admin-dashboard", null)
}
