variable "domain_name" {
  description = "The primary domain name for the certificate (e.g. example.com)"
  type        = string
}

variable "subject_alternative_names" {
  description = "List of Subject Alternative Names (SANs) for the certificate (e.g. [*.example.com])"
  type        = list(string)
  default     = []
}

variable "route53_zone_id" {
  description = "Route 53 hosted zone ID for DNS validation"
  type        = string
}

variable "validation_method" {
  description = "Validation method for the certificate"
  type        = string
  default     = "DNS"
}

variable "tags" {
  description = "Common resource tags"
  type        = map(string)
  default     = {}
}
