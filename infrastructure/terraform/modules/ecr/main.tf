# AWS Elastic Container Registry (ECR) Repositories
resource "aws_ecr_repository" "this" {
  for_each = toset(var.repository_names)

  name                 = "${var.project_name}-${var.environment}-${each.key}"
  image_tag_mutability = var.image_tag_mutability
  force_delete         = var.force_delete

  image_scanning_configuration {
    scan_on_push = var.scan_on_push
  }

  encryption_configuration {
    encryption_type = var.encryption_type
    kms_key         = var.kms_key
  }

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-${each.key}"
    Service     = each.key
    Environment = var.environment
    ManagedBy   = "Terraform"
  })
}

# Automated ECR Lifecycle Policy to Manage Storage Costs & Image Retention
resource "aws_ecr_lifecycle_policy" "this" {
  for_each = var.enable_lifecycle_policy ? toset(var.repository_names) : toset([])

  repository = aws_ecr_repository.this[each.key].name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Expire untagged images older than ${var.untagged_image_expiry_days} days"
        selection = {
          tagStatus   = "untagged"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = var.untagged_image_expiry_days
        }
        action = {
          type = "expire"
        }
      },
      {
        rulePriority = 2
        description  = "Keep last ${var.max_tagged_image_count} tagged image versions"
        selection = {
          tagStatus   = "any"
          countType   = "imageCountMoreThan"
          countNumber = var.max_tagged_image_count
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}
