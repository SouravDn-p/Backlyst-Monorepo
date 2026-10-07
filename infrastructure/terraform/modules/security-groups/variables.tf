variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Deployment environment (e.g. dev, staging, prod)"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID where the security groups will be created"
  type        = string
}

variable "backend_port" {
  description = "Port the backend application listens on"
  type        = number
  default     = 5000
}

variable "nextjs_port" {
  description = "Port the Next.js frontend application listens on"
  type        = number
  default     = 3000
}

variable "admin_port" {
  description = "Port the React Admin application listens on"
  type        = number
  default     = 3043
}

variable "postgres_port" {
  description = "Port PostgreSQL database listens on"
  type        = number
  default     = 5432
}

variable "redis_port" {
  description = "Port Redis / Valkey cache listens on"
  type        = number
  default     = 6379
}

variable "tags" {
  description = "Common resource tags"
  type        = map(string)
  default     = {}
}

variable "alb_ingress_cidr_blocks" {
  description = "Allow CIDR blocks for ALB HTTP/HTTPS ingress"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}
