# Route 53 Alias Record: Root Domain (example.com)
resource "aws_route53_record" "root" {
  allow_overwrite = true
  zone_id         = var.route53_zone_id
  name            = var.domain_name
  type            = "A"

  alias {
    name                   = var.alb_dns_name
    zone_id                = var.alb_zone_id
    evaluate_target_health = true
  }
}

# Route 53 Alias Record: API Subdomain (api.example.com)
resource "aws_route53_record" "api" {
  allow_overwrite = true
  zone_id         = var.route53_zone_id
  name            = "${var.api_subdomain}.${var.domain_name}"
  type            = "A"

  alias {
    name                   = var.alb_dns_name
    zone_id                = var.alb_zone_id
    evaluate_target_health = true
  }
}

# Route 53 Alias Record: Admin Subdomain (admin.example.com)
resource "aws_route53_record" "admin" {
  allow_overwrite = true
  zone_id         = var.route53_zone_id
  name            = "${var.admin_subdomain}.${var.domain_name}"
  type            = "A"

  alias {
    name                   = var.alb_dns_name
    zone_id                = var.alb_zone_id
    evaluate_target_health = true
  }
}

# Route 53 Alias Record: WWW Subdomain (www.example.com)
resource "aws_route53_record" "www" {
  allow_overwrite = true
  zone_id         = var.route53_zone_id
  name            = "www.${var.domain_name}"
  type            = "A"

  alias {
    name                   = var.alb_dns_name
    zone_id                = var.alb_zone_id
    evaluate_target_health = true
  }
}

# ------------------------------------------------------------------------------
# Zoho Mail DNS Records
# ------------------------------------------------------------------------------

# Route 53 MX Records for Zoho Mail
resource "aws_route53_record" "zoho_mx" {
  count           = var.enable_zoho_mail ? 1 : 0
  allow_overwrite = true
  zone_id         = var.route53_zone_id
  name            = var.domain_name
  type            = "MX"
  ttl             = 300
  records         = var.zoho_mx_records
}

# Route 53 SPF / TXT Record for Zoho Mail
resource "aws_route53_record" "zoho_spf" {
  count           = var.enable_zoho_mail ? 1 : 0
  allow_overwrite = true
  zone_id         = var.route53_zone_id
  name            = var.domain_name
  type            = "TXT"
  ttl             = 300
  records         = [var.zoho_spf_record]
}

# ------------------------------------------------------------------------------
# Optional Custom Records (DKIM, DMARC, Domain Verification, etc.)
# ------------------------------------------------------------------------------

resource "aws_route53_record" "extra_txt" {
  for_each        = var.extra_txt_records
  allow_overwrite = true

  zone_id = var.route53_zone_id
  name    = each.value.name
  type    = "TXT"
  ttl     = each.value.ttl
  records = each.value.records
}

resource "aws_route53_record" "extra_cname" {
  for_each        = var.extra_cname_records
  allow_overwrite = true

  zone_id = var.route53_zone_id
  name    = each.value.name
  type    = "CNAME"
  ttl     = each.value.ttl
  records = [each.value.record]
}


