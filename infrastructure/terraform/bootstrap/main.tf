# S3 Remote State Buckets (Provisioned per Environment)
resource "aws_s3_bucket" "terraform_state" {
  for_each = toset(var.environments)

  bucket        = "${var.project_name}-${each.value}-tfstate"
  force_destroy = var.force_destroy

  tags = {
    Name        = "${var.project_name}-${each.value}-tfstate"
    Environment = each.value
    Purpose     = "Terraform Remote State Storage"
  }
}

# Enforce Bucket Ownership Controls
resource "aws_s3_bucket_ownership_controls" "terraform_state" {
  for_each = toset(var.environments)

  bucket = aws_s3_bucket.terraform_state[each.key].id

  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

# Enable Object Versioning for State History and Rollback Protection
resource "aws_s3_bucket_versioning" "terraform_state" {
  for_each = toset(var.environments)

  bucket = aws_s3_bucket.terraform_state[each.key].id

  versioning_configuration {
    status = "Enabled"
  }
}

# Enable Server-Side Encryption (AES256 SSE-S3)
resource "aws_s3_bucket_server_side_encryption_configuration" "terraform_state" {
  for_each = toset(var.environments)

  bucket = aws_s3_bucket.terraform_state[each.key].id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Block all Public Access to Remote State Buckets
resource "aws_s3_bucket_public_access_block" "terraform_state" {
  for_each = toset(var.environments)

  bucket = aws_s3_bucket.terraform_state[each.key].id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# DynamoDB State Locking Tables (Provisioned per Environment)
resource "aws_dynamodb_table" "terraform_locks" {
  for_each = toset(var.environments)

  name         = "${var.project_name}-${each.value}-tflocks"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }

  point_in_time_recovery {
    enabled = true
  }

  tags = {
    Name        = "${var.project_name}-${each.value}-tflocks"
    Environment = each.value
    Purpose     = "Terraform State Locking"
  }
}
