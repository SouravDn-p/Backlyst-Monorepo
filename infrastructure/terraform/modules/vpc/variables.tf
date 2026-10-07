variable "project_name" {
  type        = string
  description = "Name of the project"
}

variable "environment" {
  type        = string
  description = "Deployment environment (e.g. dev, staging, prod)"
}

variable "vpc_cidr" {
  type        = string
  description = "CIDR block for the custom VPC"
  default     = "10.0.0.0/16"
}

variable "azs" {
  type        = list(string)
  description = "List of Availability Zones to deploy subnets into (defaults to available AZs in the current region)"
  default     = []
}

variable "public_subnet_cidrs" {
  type        = list(string)
  description = "List of CIDR blocks for public subnets (ALB & NAT Gateways)"
  default     = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "private_app_subnet_cidrs" {
  type        = list(string)
  description = "List of CIDR blocks for private application subnets (Backend & Frontend EC2)"
  default     = ["10.0.10.0/24", "10.0.11.0/24"]
}

variable "private_db_subnet_cidrs" {
  type        = list(string)
  description = "List of CIDR blocks for private database subnets (RDS PostgreSQL & ElastiCache)"
  default     = ["10.0.20.0/24", "10.0.21.0/24"]
}

variable "enable_nat_gateway" {
  type        = bool
  description = "Whether to provision NAT Gateway(s) for private app subnet internet egress"
  default     = true
}

variable "single_nat_gateway" {
  type        = bool
  description = "Set to true to share a single NAT Gateway across all AZs (cost-effective), or false for 1 per AZ (high availability)"
  default     = true
}

variable "map_public_ip_on_launch" {
  type        = bool
  description = "Whether to assign public IPs to resources launched in public subnets"
  default     = false
}

variable "tags" {
  type        = map(string)
  description = "Additional tags to merge with resource tags"
  default     = {}
}
