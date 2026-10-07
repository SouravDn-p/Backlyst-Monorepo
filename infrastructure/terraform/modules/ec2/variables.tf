variable "instance_name" {
  description = "Name tag of the EC2 instance"
  type        = string
}

variable "ami_id" {
  description = "AMI ID to use for the instance. If empty, defaults to Debian 13 AMI"
  type        = string
  default     = ""
}

variable "instance_type" {
  description = "Type of EC2 instance to launch"
  type        = string
  default     = "t3.small"
}

variable "subnet_id" {
  description = "VPC Subnet ID where the instance will be launched"
  type        = string
}

variable "security_group_ids" {
  description = "List of Security Group IDs to attach to the instance"
  type        = list(string)
}

variable "iam_instance_profile" {
  description = "IAM instance profile name to attach to the instance"
  type        = string
  default     = null
}

variable "key_name" {
  description = "AWS key pair name for SSH access (optional; SSM Session Manager is preferred)"
  type        = string
  default     = null
}

variable "root_volume_size" {
  description = "Root volume size in GB"
  type        = number
  default     = 20
}

variable "root_volume_type" {
  description = "Root volume EBS type (e.g. gp3)"
  type        = string
  default     = "gp3"
}

variable "enable_monitoring" {
  description = "Enable detailed CloudWatch monitoring"
  type        = bool
  default     = false
}

variable "user_data" {
  description = "User data script to bootstrap the instance (e.g. install Docker, SSM)"
  type        = string
  default     = null
}

variable "tags" {
  description = "Common resource tags"
  type        = map(string)
  default     = {}
}
