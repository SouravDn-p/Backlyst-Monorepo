variable "domain_name" {
  description = "Domain name for SES identity verification (e.g. backlyst.co.uk)"
  type        = string
}

variable "route53_zone_id" {
  description = "Route 53 hosted zone ID to create verification, DKIM, and MAIL FROM DNS records"
  type        = string
}

variable "enable_mail_from" {
  description = "Whether to configure a custom MAIL FROM domain for improved SPF alignment"
  type        = bool
  default     = true
}

variable "mail_from_subdomain" {
  description = "Subdomain prefix for custom MAIL FROM domain (e.g. 'mail' creates 'mail.domain_name')"
  type        = string
  default     = "mail"
}

variable "mail_from_mx_priority" {
  description = "MX priority for the custom MAIL FROM domain"
  type        = number
  default     = 10
}

variable "mail_from_behavior_on_mx_failure" {
  description = "Action when MX record verification fails: UseDefaultValue or RejectMessage"
  type        = string
  default     = "UseDefaultValue"
}

variable "enable_dmarc" {
  description = "Whether to create a DMARC TXT record in Route 53"
  type        = bool
  default     = true
}

variable "dmarc_policy" {
  description = "DMARC policy record value"
  type        = string
  default     = "v=DMARC1; p=none; sp=none; aspf=r; adkim=r;"
}

variable "create_smtp_user" {
  description = "Whether to create an IAM user with credentials for sending email via SES SMTP"
  type        = bool
  default     = true
}

variable "smtp_user_name" {
  description = "Optional explicit name for the IAM SMTP user (defaults to project-env-ses-smtp-user)"
  type        = string
  default     = ""
}

variable "project_name" {
  description = "Project name identifier"
  type        = string
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
}

variable "tags" {
  description = "Tags to attach to resources"
  type        = map(string)
  default     = {}
}
