variable "identifier" {
  description = "RDS instance identifier and prefix for related resources"
  type        = string
}

variable "engine_version" {
  description = "PostgreSQL engine version"
  type        = string
  default     = "17.5"
}

variable "db_instance_class" {
  description = "RDS Instance type (e.g. db.t3.micro, db.t4g.micro)"
  type        = string
  default     = "db.t3.micro"
}

variable "db_allocated_storage" {
  description = "Allocated storage size in GB"
  type        = number
  default     = 20
}

variable "max_allocated_storage" {
  description = "Max allocated storage for autoscaling in GB (0 to disable)"
  type        = number
  default     = 50
}

variable "storage_type" {
  description = "Storage type (e.g. gp3, gp2)"
  type        = string
  default     = "gp3"
}

variable "db_name" {
  description = "Initial database name"
  type        = string
  default     = "backlyst_db"
}

variable "db_username" {
  description = "Database master username"
  type        = string
  default     = "backlyst_user"
}

variable "db_password" {
  description = "Database master password"
  type        = string
  sensitive   = true
}

variable "subnet_ids" {
  description = "List of subnet IDs for the RDS DB subnet group"
  type        = list(string)
}

variable "security_group_ids" {
  description = "List of security group IDs to attach to RDS"
  type        = list(string)
}

variable "publicly_accessible" {
  description = "Whether the DB instance is publicly accessible (must be false for private databases)"
  type        = bool
  default     = false
}

variable "skip_final_snapshot" {
  description = "Skip final snapshot before deletion (true for dev, false for prod)"
  type        = bool
  default     = true
}

variable "deletion_protection" {
  description = "Enable deletion protection"
  type        = bool
  default     = false
}

variable "backup_retention_period" {
  description = "Backup retention period in days (0 to disable for dev)"
  type        = number
  default     = 0
}

variable "auto_minor_version_upgrade" {
  description = "Automatically apply minor engine upgrades"
  type        = bool
  default     = true
}

variable "apply_immediately" {
  description = "Apply database modifications immediately"
  type        = bool
  default     = true
}

variable "storage_encrypted" {
  description = "Specifies whether DB storage is encrypted"
  type        = bool
  default     = true
}

variable "multi_az" {
  description = "Specifies if DB instance is Multi-AZ"
  type        = bool
  default     = false
}

variable "tags" {
  description = "Common resource tags"
  type        = map(string)
  default     = {}
}
