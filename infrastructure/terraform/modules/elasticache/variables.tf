variable "cache_name" {
  description = "Unique name for the ElastiCache Valkey/Redis Serverless cache"
  type        = string
}

variable "engine" {
  description = "Engine to use: valkey or redis"
  type        = string
  default     = "valkey"
}

variable "major_engine_version" {
  description = "Major engine version (e.g. 8 for valkey, 7 for redis)"
  type        = string
  default     = "8"
}

variable "subnet_ids" {
  description = "List of subnet IDs for ElastiCache"
  type        = list(string)
}

variable "security_group_ids" {
  description = "List of security group IDs to attach to ElastiCache"
  type        = list(string)
}

variable "max_storage_gb" {
  description = "Maximum data storage in GB (cost guardrail)"
  type        = number
  default     = 1
}

variable "max_ecpu_per_second" {
  description = "Maximum ECPUs per second (cost guardrail)"
  type        = number
  default     = 1000
}

variable "snapshot_retention_limit" {
  description = "Number of days to retain snapshots. 0 = disabled (good for dev)"
  type        = number
  default     = 0
}

variable "environment" {
  description = "Environment tag (e.g. dev, staging, prod)"
  type        = string
  default     = "staging"
}

variable "tags" {
  description = "Common resource tags"
  type        = map(string)
  default     = {}
}
