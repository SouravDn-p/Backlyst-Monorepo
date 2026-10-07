variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Deployment environment (e.g. dev, staging, prod)"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID where the ALB and Target Groups are created"
  type        = string
}

variable "subnet_ids" {
  description = "List of public subnet IDs for the internet-facing ALB (minimum 2 in distinct AZs)"
  type        = list(string)
}

variable "security_group_ids" {
  description = "List of Security Group IDs to attach to the ALB"
  type        = list(string)
}

variable "certificate_arn" {
  description = "ARN of the ACM certificate for HTTPS listener"
  type        = string
}

variable "domain_name" {
  description = "Base domain name (e.g. example.com)"
  type        = string
}

variable "api_subdomain" {
  description = "Subdomain prefix for API (e.g. api)"
  type        = string
  default     = "api"
}

variable "admin_subdomain" {
  description = "Subdomain prefix for Admin (e.g. admin)"
  type        = string
  default     = "admin"
}

variable "backend_instance_id" {
  description = "EC2 Instance ID for Backend API"
  type        = string
}

variable "frontend_instance_id" {
  description = "EC2 Instance ID for Frontend (Next.js & Admin)"
  type        = string
}

variable "backend_port" {
  description = "Port the backend application listens on"
  type        = number
  default     = 5000
}

variable "nextjs_port" {
  description = "Port the Next.js application listens on"
  type        = number
  default     = 3000
}

variable "admin_port" {
  description = "Port the React Admin application listens on"
  type        = number
  default     = 3043
}

variable "backend_health_check_path" {
  description = "Health check path for backend service"
  type        = string
  default     = "/health"
}

variable "nextjs_health_check_path" {
  description = "Health check path for Next.js service"
  type        = string
  default     = "/"
}

variable "admin_health_check_path" {
  description = "Health check path for Admin service"
  type        = string
  default     = "/"
}

variable "enable_deletion_protection" {
  description = "If true, deletion of the load balancer will be disabled via the AWS API"
  type        = bool
  default     = false
}

variable "tags" {
  description = "Common resource tags"
  type        = map(string)
  default     = {}
}
