variable "route53_zone_id" {
  description = "Route 53 hosted zone ID"
  type        = string
}

variable "domain_name" {
  description = "Base domain name (e.g. example.com)"
  type        = string
}

variable "api_subdomain" {
  description = "Subdomain prefix for API (e.g. api)"
  type        = string
}

variable "admin_subdomain" {
  description = "Subdomain prefix for Admin (e.g. admin)"
  type        = string
}

variable "alb_dns_name" {
  description = "DNS name of the Application Load Balancer"
  type        = string
}

variable "alb_zone_id" {
  description = "Route 53 Hosted Zone ID of the Application Load Balancer"
  type        = string
}

# Zoho Mail & Email Records
variable "enable_zoho_mail" {
  description = "Whether to create Zoho Mail MX and SPF records"
  type        = bool
}

variable "zoho_mx_records" {
  description = "List of Zoho MX records with priorities"
  type        = list(string)
}

variable "zoho_spf_record" {
  description = "Zoho SPF TXT record value"
  type        = string
}

# Additional Custom DNS Records (DKIM, DMARC, Domain Verification)
variable "extra_txt_records" {
  description = "Additional TXT records (e.g. DKIM, DMARC, Zoho verification)"
  type = map(object({
    name    = string
    records = list(string)
    ttl     = number
  }))
}

variable "extra_cname_records" {
  description = "Additional CNAME records (e.g. DKIM, Zoho verification)"
  type = map(object({
    name   = string
    record = string
    ttl    = number
  }))
}


