resource "aws_secretsmanager_secret" "this" {
  name                    = var.secret_name
  description             = var.description
  recovery_window_in_days = var.recovery_window_in_days

  tags = merge(var.tags, {
    Name = var.secret_name
  })
}

# Creates the initial secret schema structure with placeholder values.
# The lifecycle ignore_changes block prevents Terraform from overwriting actual secrets populated later.
resource "aws_secretsmanager_secret_version" "this" {
  secret_id     = aws_secretsmanager_secret.this.id
  secret_string = jsonencode(var.initial_secret_keys)

  lifecycle {
    ignore_changes = [
      secret_string
    ]
  }
}
