variable "project_name" {
  description = "Unique project identifier"
  type        = string
}

variable "environment" {
  description = "Deployment environment (e.g. dev, staging, prod)"
  type        = string
}

variable "repository_names" {
  description = "List of microservice / component names to create dedicated ECR repositories for"
  type        = list(string)
  default     = ["backend", "frontend", "admin-dashboard"]
}

variable "image_tag_mutability" {
  description = "The tag mutability setting for the repository. Must be one of: MUTABLE or IMMUTABLE"
  type        = string
  default     = "MUTABLE"
}

variable "scan_on_push" {
  description = "Indicates whether images are scanned after being pushed to the repository"
  type        = bool
  default     = true
}

variable "encryption_type" {
  description = "The encryption type to use for the repository. Valid values are AES256 or KMS"
  type        = string
  default     = "AES256"
}

variable "kms_key" {
  description = "The ARN of the KMS key to use when encryption_type is KMS. If not specified when KMS is used, uses default AWS KMS key"
  type        = string
  default     = null
}

variable "force_delete" {
  description = "If true, will delete the repository even if it contains images"
  type        = bool
  default     = false
}

variable "enable_lifecycle_policy" {
  description = "Whether to attach an automated image lifecycle management policy to each repository"
  type        = bool
  default     = true
}

variable "untagged_image_expiry_days" {
  description = "Number of days after which untagged images will be expired and deleted"
  type        = number
  default     = 14
}

variable "max_tagged_image_count" {
  description = "Maximum number of tagged image versions to retain in the repository"
  type        = number
  default     = 30
}

variable "tags" {
  description = "Resource tags to attach to the ECR repositories"
  type        = map(string)
  default     = {}
}
