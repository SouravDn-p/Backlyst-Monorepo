# Backlyst Infrastructure

This directory contains the complete Infrastructure-as-Code (IaC) configuration for the **Backlyst** platform built with Terraform for Amazon Web Services (AWS).

---

## 📖 Detailed Documentation

For a comprehensive explanation of every resource, architecture diagram, security group rule, IAM policy, and exact variable breakdown from `terraform.tfvars`, refer to:

👉 **[INFRASTRUCTURE_ARCHITECTURE.md](file:///Users/anonymous/workspace/backlystapp/infrastructure/INFRASTRUCTURE_ARCHITECTURE.md)**

---

## 🗂 Directory Structure

```
infrastructure/
├── INFRASTRUCTURE_ARCHITECTURE.md    # Comprehensive architectural breakdown & guide
├── README.md                         # Quick reference & directory index
└── terraform/
    ├── bootstrap/                    # One-time bootstrap for S3 remote state & DynamoDB lock tables
    │   ├── main.tf                   # S3 state buckets & DynamoDB locking tables
    │   ├── variables.tf              # Region, project_name, and environments list
    │   ├── outputs.tf                # Exported bucket and table names/ARNs
    │   ├── providers.tf              # AWS provider specification
    │   ├── versions.tf               # Required Terraform & provider versions
    │   ├── terraform.tfvars.example  # Example variable values
    │   └── README.md                 # Bootstrap setup instructions
    ├── environments/
    │   ├── dev/                      # Development environment configuration (CIDR 10.1.0.0/16)
    │   │   ├── main.tf               # Environment module composition & cloud-init
    │   │   ├── variables.tf          # Variable type definitions & descriptions
    │   │   ├── terraform.tfvars      # Active dev parameters & values
    │   │   ├── terraform.tfvars.example
    │   │   ├── data.tf               # Route 53 public hosted zone
    │   │   ├── outputs.tf            # Exported endpoints, name servers & VPC IDs
    │   │   ├── providers.tf          # AWS provider specification
    │   │   └── versions.tf           # Required Terraform & provider versions
    │   └── prod/                     # Production environment configuration (CIDR 10.0.0.0/16)
    └── modules/
        ├── vpc/                      # 3-Tier Multi-AZ Custom VPC, IGW, Subnets, NAT GW, Route Tables
        ├── acm/                      # SSL/TLS Wildcard Certificate with Route 53 validation
        ├── alb/                      # Public ALB with host routing rules (API, Frontend, Admin)
        ├── ec2/                      # Debian 13 EC2 instances with Docker bootstrapping & IMDSv2
        ├── ecr/                      # Dedicated ECR repositories (backend, frontend, admin) with lifecycle rules & scan on push
        ├── elasticache/              # AWS ElastiCache Serverless (Valkey 8 / Redis engine)
        ├── iam/                      # Least-privilege IAM roles, instance profiles, SSM, ECR pull & GitHub Actions OIDC push
        ├── rds-postgres/             # Amazon RDS PostgreSQL 17.5 in isolated DB subnets
        ├── route53/                  # DNS Alias records for apex and subdomains
        ├── s3/                       # Encrypted, private S3 bucket with versioning & block public access
        ├── secrets-manager/          # AWS Secrets Manager with ignore_changes lifecycle
        └── security-groups/          # Strict 3-tier zero-trust security group firewall rules

```

---

## 🚀 Quick Start Deployment Workflow

### 1. One-Time Bootstrap (Create Remote State Storage & Locks)

Before initializing `prod` or `dev`, run the bootstrap module with local state:

```bash
cd infrastructure/terraform/bootstrap
terraform init
terraform apply
```

### 2. Deploy Environment (`prod` or `dev`)

Once the S3 backend buckets and DynamoDB tables exist:

```bash
cd ../environments/prod   # or ../environments/dev

# 1. Initialize Terraform (Connects to S3 Remote Backend)
terraform init

# 2. Review Execution Plan
terraform plan

# 3. Apply Changes
terraform apply
```

To connect to your instances without SSH keys:

```bash
# Backend EC2
aws ssm start-session --target $(terraform output -raw backend_instance_id) --region eu-west-2 --profile tom

# Frontend EC2
aws ssm start-session --target $(terraform output -raw frontend_instance_id) --region eu-west-2 --profile tom
```
