# Terraform Remote State Bootstrap

This module provisions the foundational **AWS S3 Buckets** and **DynamoDB State Locking Tables** required before running `terraform init` in any application environment (`prod` or `dev`).

---

## 🎯 Purpose

Terraform environments store remote state and lock state concurrently using:
- **S3 Bucket:** `backlyst-prod-tfstate` and `backlyst-dev-tfstate` (with AES256 server-side encryption, versioning, and public access blocked).
- **DynamoDB Table:** `backlyst-prod-tflocks` and `backlyst-dev-tflocks` (with `LockID` string partition key).

Because these backend resources must exist **before** running `terraform init` with an S3 backend in `environments/prod` or `environments/dev`, this bootstrap configuration uses **local state** and is executed **only once**.

---

## 🚀 One-Time Setup Instructions

### Step 1: Navigate to the Bootstrap Directory

```bash
cd infrastructure/terraform/bootstrap
```

### Step 2: Initialize Terraform (Local Backend)

```bash
terraform init
```

### Step 3: Review Execution Plan

```bash
terraform plan
```

### Step 4: Apply Bootstrap Infrastructure

```bash
terraform apply
```

Upon successful completion, Terraform outputs the names and ARNs of your remote state buckets and DynamoDB lock tables:

```text
dynamodb_lock_table_names = {
  "dev"  = "backlyst-dev-tflocks"
  "prod" = "backlyst-prod-tflocks"
}
s3_state_bucket_names = {
  "dev"  = "backlyst-dev-tfstate"
  "prod" = "backlyst-prod-tfstate"
}
```

---

## ⏭ Next Step: Deploying Environments

Once the bootstrap resources exist in your AWS account, you can initialize and deploy either environment:

```bash
# Production
cd ../environments/prod
terraform init
terraform plan
terraform apply

# Development
cd ../environments/dev
terraform init
terraform plan
terraform apply
```
