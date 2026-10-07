output "domain_identity_arn" {
  description = "ARN of the SES domain identity"
  value       = aws_ses_domain_identity.domain.arn
}

output "domain_identity_verification_token" {
  description = "Verification token for the SES domain identity"
  value       = aws_ses_domain_identity.domain.verification_token
}

output "dkim_tokens" {
  description = "DKIM tokens generated for the SES domain"
  value       = aws_ses_domain_dkim.dkim.dkim_tokens
}

output "mail_from_domain" {
  description = "Custom MAIL FROM domain name"
  value       = var.enable_mail_from ? local.mail_from_domain : null
}

output "ses_smtp_host" {
  description = "SMTP endpoint host for AWS SES in the current region"
  value       = "email-smtp.${data.aws_region.current.region}.amazonaws.com"
}

output "ses_smtp_port" {
  description = "Recommended SMTP STARTTLS port for AWS SES"
  value       = 587
}

output "ses_smtp_username" {
  description = "IAM Access Key ID used as SES SMTP username"
  value       = var.create_smtp_user ? aws_iam_access_key.ses_smtp[0].id : null
}

output "ses_smtp_password_v4" {
  description = "SES SMTP password calculated using SigV4 algorithm"
  value       = var.create_smtp_user ? aws_iam_access_key.ses_smtp[0].ses_smtp_password_v4 : null
  sensitive   = true
}

output "ses_smtp_user_arn" {
  description = "ARN of the IAM user created for SES SMTP"
  value       = var.create_smtp_user ? aws_iam_user.ses_smtp[0].arn : null
}
