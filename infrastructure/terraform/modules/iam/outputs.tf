output "backend_iam_role_arn" {
  description = "ARN of the Backend IAM role"
  value       = aws_iam_role.backend.arn
}

output "backend_iam_role_name" {
  description = "Name of the Backend IAM role"
  value       = aws_iam_role.backend.name
}

output "backend_instance_profile_name" {
  description = "Name of the Backend IAM instance profile"
  value       = aws_iam_instance_profile.backend.name
}

output "backend_instance_profile_arn" {
  description = "ARN of the Backend IAM instance profile"
  value       = aws_iam_instance_profile.backend.arn
}

output "frontend_iam_role_arn" {
  description = "ARN of the Frontend IAM role"
  value       = aws_iam_role.frontend.arn
}

output "frontend_iam_role_name" {
  description = "Name of the Frontend IAM role"
  value       = aws_iam_role.frontend.name
}

output "frontend_instance_profile_name" {
  description = "Name of the Frontend IAM instance profile"
  value       = aws_iam_instance_profile.frontend.name
}

output "frontend_instance_profile_arn" {
  description = "ARN of the Frontend IAM instance profile"
  value       = aws_iam_instance_profile.frontend.arn
}

output "ecr_pull_policy_arn" {
  description = "ARN of the IAM policy granting EC2 instances pull access to ECR"
  value       = length(aws_iam_policy.ecr_pull) > 0 ? aws_iam_policy.ecr_pull[0].arn : null
}

output "github_actions_ecr_role_arn" {
  description = "ARN of the IAM role assumed by GitHub Actions to push images to ECR"
  value       = length(aws_iam_role.github_actions_ecr) > 0 ? aws_iam_role.github_actions_ecr[0].arn : null
}

output "github_actions_ecr_role_name" {
  description = "Name of the IAM role assumed by GitHub Actions to push images to ECR"
  value       = length(aws_iam_role.github_actions_ecr) > 0 ? aws_iam_role.github_actions_ecr[0].name : null
}

output "github_actions_ecr_push_policy_arn" {
  description = "ARN of the IAM policy granting GitHub Actions push access to ECR"
  value       = length(aws_iam_policy.github_actions_ecr_push) > 0 ? aws_iam_policy.github_actions_ecr_push[0].arn : null
}

