data "aws_region" "current" {}

locals {
  smtp_user_name   = var.smtp_user_name != "" ? var.smtp_user_name : "${var.project_name}-${var.environment}-ses-smtp-user"
  mail_from_domain = "${var.mail_from_subdomain}.${var.domain_name}"
}

# ------------------------------------------------------------------------------
# 1. SES Domain Identity & Easy DKIM
# ------------------------------------------------------------------------------

# SES Domain Identity
resource "aws_ses_domain_identity" "domain" {
  domain = var.domain_name
}

# Generate 3 DKIM tokens for the domain
resource "aws_ses_domain_dkim" "dkim" {
  domain = aws_ses_domain_identity.domain.domain
}

# Route 53 CNAME Records for Easy DKIM verification
resource "aws_route53_record" "ses_dkim" {
  count           = 3
  allow_overwrite = true
  zone_id         = var.route53_zone_id
  name            = "${aws_ses_domain_dkim.dkim.dkim_tokens[count.index]}._domainkey.${var.domain_name}"
  type            = "CNAME"
  ttl             = 300
  records         = ["${aws_ses_domain_dkim.dkim.dkim_tokens[count.index]}.dkim.amazonses.com"]
}

# ------------------------------------------------------------------------------
# 2. Custom MAIL FROM Domain (Eliminates MX conflict & achieves SPF alignment)
# ------------------------------------------------------------------------------

resource "aws_ses_domain_mail_from" "mail_from" {
  count                  = var.enable_mail_from ? 1 : 0
  domain                 = aws_ses_domain_identity.domain.domain
  mail_from_domain       = local.mail_from_domain
  behavior_on_mx_failure = var.mail_from_behavior_on_mx_failure
}

# Route 53 MX record for the custom MAIL FROM domain
resource "aws_route53_record" "ses_mail_from_mx" {
  count           = var.enable_mail_from ? 1 : 0
  allow_overwrite = true
  zone_id         = var.route53_zone_id
  name            = local.mail_from_domain
  type            = "MX"
  ttl             = 300
  records         = ["${var.mail_from_mx_priority} feedback-smtp.${data.aws_region.current.region}.amazonses.com"]
}

# Route 53 TXT (SPF) record for the custom MAIL FROM domain
resource "aws_route53_record" "ses_mail_from_spf" {
  count           = var.enable_mail_from ? 1 : 0
  allow_overwrite = true
  zone_id         = var.route53_zone_id
  name            = local.mail_from_domain
  type            = "TXT"
  ttl             = 300
  records         = ["v=spf1 include:amazonses.com ~all"]
}

# ------------------------------------------------------------------------------
# 3. DMARC TXT Record
# ------------------------------------------------------------------------------

resource "aws_route53_record" "dmarc" {
  count           = var.enable_dmarc ? 1 : 0
  allow_overwrite = false
  zone_id         = var.route53_zone_id
  name            = "_dmarc.${var.domain_name}"
  type            = "TXT"
  ttl             = 300
  records         = [var.dmarc_policy]
}

# ------------------------------------------------------------------------------
# 4. IAM User & Credentials for SES SMTP Access
# ------------------------------------------------------------------------------

resource "aws_iam_user" "ses_smtp" {
  count = var.create_smtp_user ? 1 : 0
  name  = local.smtp_user_name

  tags = merge(var.tags, {
    Name = local.smtp_user_name
  })
}

resource "aws_iam_access_key" "ses_smtp" {
  count = var.create_smtp_user ? 1 : 0
  user  = aws_iam_user.ses_smtp[0].name
}

data "aws_iam_policy_document" "ses_send_email" {
  count = var.create_smtp_user ? 1 : 0

  statement {
    sid    = "AllowSESSendEmail"
    effect = "Allow"
    actions = [
      "ses:SendEmail",
      "ses:SendRawEmail"
    ]
    resources = [
      aws_ses_domain_identity.domain.arn,
      "${aws_ses_domain_identity.domain.arn}/*"
    ]
  }
}

resource "aws_iam_user_policy" "ses_smtp_policy" {
  count  = var.create_smtp_user ? 1 : 0
  name   = "${local.smtp_user_name}-policy"
  user   = aws_iam_user.ses_smtp[0].name
  policy = data.aws_iam_policy_document.ses_send_email[0].json
}
