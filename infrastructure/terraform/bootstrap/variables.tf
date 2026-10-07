variable "aws_region" {
  type        = string
  description = "AWS deployment region for remote state storage"
  default     = "eu-west-2"
}

variable "aws_profile" {
  type        = string
  description = "AWS CLI named profile to use (leave empty for default / STS session credentials)"
  default     = ""
}

variable "project_name" {
  type        = string
  description = "Project prefix identifier for naming state storage resources"
  default     = "backlyst"
}

variable "environments" {
  type        = list(string)
  description = "List of environments to provision remote state S3 buckets and DynamoDB locking tables for"
  default     = ["prod", "dev"]
}

variable "force_destroy" {
  type        = bool
  description = "Whether to allow bucket deletion even if it contains state files (set to false for safety)"
  default     = false
}

variable "tags" {
  type        = map(string)
  description = "Custom tags to attach to bootstrap state storage resources"
  default     = {}
}
