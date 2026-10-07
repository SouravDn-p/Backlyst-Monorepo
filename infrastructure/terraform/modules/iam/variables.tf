variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Deployment environment (e.g. dev, staging, prod)"
  type        = string
}

variable "enable_s3_access" {
  description = "Whether to create S3 access policy and attachment for backend"
  type        = bool
  default     = true
}

variable "s3_bucket_arn" {
  description = "ARN of the S3 bucket the backend needs access to"
  type        = string
  default     = ""
}

variable "enable_secrets_manager_access" {
  description = "Whether to create Secrets Manager access policy and attachment for backend"
  type        = bool
  default     = true
}

variable "secrets_manager_arn" {
  description = "ARN of the Secrets Manager secret the backend needs access to"
  type        = string
  default     = ""
}

variable "ec2_admin_secret_arn" {
  description = "ARN of the dedicated EC2 Admin Password Secrets Manager secret"
  type        = string
  default     = ""
}

variable "enable_ecr_pull" {
  description = "Whether to attach ECR image pull policy to EC2 backend and frontend roles"
  type        = bool
  default     = true
}

variable "ecr_repository_arns" {
  description = "List of ECR repository ARNs for scoped pull and push permissions"
  type        = list(string)
  default     = []
}

variable "enable_github_actions_role" {
  description = "Whether to create a dedicated IAM role for GitHub Actions CI/CD to push to ECR"
  type        = bool
  default     = true
}

variable "github_repository" {
  description = "GitHub repository name in org/repo format (e.g. backlyst/backlystapp) for OIDC trust relationship"
  type        = string
  default     = ""
}

variable "github_branches" {
  description = "List of GitHub branches allowed to assume the CI/CD role (use ['*'] for all branches/tags)"
  type        = list(string)
  default     = ["main", "dev"]
}

variable "create_github_oidc_provider" {
  description = "Whether to create the GitHub Actions OIDC identity provider in the AWS account"
  type        = bool
  default     = true
}

variable "github_oidc_provider_arn" {
  description = "Existing GitHub Actions OIDC provider ARN if create_github_oidc_provider is false"
  type        = string
  default     = ""
}

variable "enable_ses_access" {
  description = "Whether to attach an SES sending policy to the EC2 backend role"
  type        = bool
  default     = true
}

variable "ses_domain_identity_arn" {
  description = "ARN of the SES domain identity to scope the backend SES sending policy (optional, defaults to all if empty)"
  type        = string
  default     = ""
}

variable "tags" {
  description = "Common resource tags"
  type        = map(string)
  default     = {}
}

