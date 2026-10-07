# Route 53 Public Hosted Zone for the base domain
resource "aws_route53_zone" "primary" {
  name          = var.domain_name
  comment       = "Managed by Terraform for ${var.project_name} (${var.environment})"
  force_destroy = false

  tags = {
    Name = "${var.project_name}-${var.environment}-hosted-zone"
  }
}
