# Backlyst AWS Infrastructure Architecture

This document provides a comprehensive breakdown of the production-ready Infrastructure-as-Code (IaC) architecture for the **Backlyst** platform on Amazon Web Services (AWS), managed via Terraform.

---

## 1. Architectural Topology

Backlyst is deployed using a secure **3-Tier Multi-AZ Custom VPC Architecture** designed for high security, zero-trust network isolation, high availability, and operational simplicity.

```mermaid
flowchart TB
    Internet([Public Internet / Clients])

    subgraph Route53_DNS ["Route 53 & ACM"]
        DNS["Route 53 Hosted Zone\nbacklyst.co.uk\n• api.backlyst.co.uk\n• admin.backlyst.co.uk\n• backlyst.co.uk / www"]
        ACM["ACM SSL/TLS Certificate\nDNS Validated Wildcard (*.backlyst.co.uk)"]
    end

    subgraph Custom_VPC ["Custom 3-Tier Multi-AZ VPC (10.0.0.0/16 or 10.1.0.0/16)"]
        subgraph Tier1_Public ["Tier 1: Public Subnets (10.x.1.0/24, 10.x.2.0/24)"]
            IGW["Internet Gateway (IGW)"]
            ALB["Application Load Balancer (ALB)\n• Port 80 -> 443 HTTPS Redirect\n• Port 443 Host-Header Routing"]
            NAT["NAT Gateway (EIP Egress)\nOutbound Internet for Private App Subnets"]
        end

        subgraph Tier2_PrivateApp ["Tier 2: Private Application Subnets (10.x.10.0/24, 10.x.11.0/24)"]
            BE_EC2["Backend EC2 Instance\n• Debian 13 + Docker\n• FastAPI / Node.js Container (:5000)\n• IAM Instance Profile (SSM, S3, Secrets Manager)\n• Zero Public IP"]
            FE_EC2["Frontend EC2 Instance\n• Debian 13 + Docker\n• Next.js Web App (:3000)\n• React Admin Dashboard (:3043)\n• IAM Instance Profile (SSM)\n• Zero Public IP"]
        end

        subgraph Tier3_PrivateData ["Tier 3: Isolated Private Database Subnets (10.x.20.0/24, 10.x.21.0/24)"]
            RDS[("Amazon RDS PostgreSQL 17.5\n• Multi-AZ Subnet Group\n• gp3 Encrypted Storage\n• Port 5432 (Backend SG Ingress Only)\n• Completely Isolated (No Internet Route)")]
            Valkey[("Amazon ElastiCache Serverless\n• Valkey 8 / Redis Protocol\n• Port 6379 (Backend SG Ingress Only)\n• Capped ECPU & Storage Guardrails")]
        end
    end

    subgraph Supporting_Services ["AWS Managed Services"]
        ECR[("Amazon ECR\n• backend, frontend, admin repos\n• Scan on Push & Lifecycle Rules")]
        S3[("Amazon S3 Private Storage\n• SSE-AES256 Encrypted\n• Versioning & Block Public Access")]
        SES["Amazon SES (Simple Email Service)\n• Easy DKIM & DMARC DNS Records\n• Custom MAIL FROM (mail.backlyst.co.uk)\n• Dedicated SMTP Credentials & IAM Policy"]
        SM["AWS Secrets Manager\n• Backend Application Secrets\n• Ignore Changes Lifecycle"]
        SSM["AWS Systems Manager (SSM)\n• Encrypted Session Manager Shell\n• No Inbound SSH Required"]
    end

    Internet <-->|HTTPS 443| DNS
    DNS --> IGW
    IGW --> ALB
    ACM -.->|TLS 1.3 / 1.2 Terminate| ALB

    ALB -->|Host: api.backlyst.co.uk (Port 5000)| BE_EC2
    ALB -->|Host: backlyst.co.uk (Port 3000)| FE_EC2
    ALB -->|Host: admin.backlyst.co.uk (Port 3043)| FE_EC2

    BE_EC2 -->|Egress for apt/docker/SSM| NAT
    FE_EC2 -->|Egress for apt/docker/SSM| NAT
    NAT --> IGW

    BE_EC2 -->|TCP 5432| RDS
    BE_EC2 -->|TCP 6379| Valkey

    BE_EC2 -.->|IAM / S3 API| S3
    BE_EC2 -.->|IAM / Secrets API| SM
    BE_EC2 -.->|IAM / ECR Pull| ECR
    BE_EC2 -.->|SMTP / IAM / SES API| SES
    FE_EC2 -.->|IAM / ECR Pull| ECR
    BE_EC2 -.->|SSM Agent / Outbound| SSM
    FE_EC2 -.->|SSM Agent / Outbound| SSM
```

---

## 2. Network Tiers & CIDR Allocations

| Environment | VPC CIDR      | Public Subnets (ALB, NAT)    | Private App Subnets (EC2)      | Private Data Subnets (RDS, Cache) |
| :---------- | :------------ | :--------------------------- | :----------------------------- | :-------------------------------- |
| **Dev**     | `10.1.0.0/16` | `10.1.1.0/24`, `10.1.2.0/24` | `10.1.10.0/24`, `10.1.11.0/24` | `10.1.20.0/24`, `10.1.21.0/24`    |
| **Prod**    | `10.0.0.0/16` | `10.0.1.0/24`, `10.0.2.0/24` | `10.0.10.0/24`, `10.0.11.0/24` | `10.0.20.0/24`, `10.0.21.0/24`    |

### Routing Topology

- **Public Subnet Route Table**: `0.0.0.0/0 -> Internet Gateway (IGW)`.
- **Private App Subnet Route Table**: `0.0.0.0/0 -> NAT Gateway (EIP)`.
  - Grants outbound connectivity for OS package updates (`apt`), Docker image downloads, and SSM agent tunnels.
  - No inbound traffic from the public internet.
- **Private Database Subnet Route Table**: Local VPC routing only. Completely isolated from the internet and NAT Gateway.

---

## 3. Zero-Trust Security Group Rules

Traffic is restricted strictly using security group chaining (least privilege):

| Security Group                  | Ingress Source      | Allowed Ports / Protocols                | Purpose                       |
| :------------------------------ | :------------------ | :--------------------------------------- | :---------------------------- |
| **ALB SG** (`alb-sg`)           | `0.0.0.0/0`, `::/0` | `80/tcp` (HTTP), `443/tcp` (HTTPS)       | Public ingress for users      |
| **Backend SG** (`backend-sg`)   | `alb-sg` ONLY       | `5000/tcp`                               | API traffic from ALB          |
| **Frontend SG** (`frontend-sg`) | `alb-sg` ONLY       | `3000/tcp` (Next.js), `3043/tcp` (Admin) | Frontend traffic from ALB     |
| **RDS SG** (`rds-sg`)           | `backend-sg` ONLY   | `5432/tcp`                               | Database queries from backend |
| **Redis SG** (`redis-sg`)       | `backend-sg` ONLY   | `6379/tcp`                               | Cache access from backend     |

---

## 4. Terraform Module Breakdown

```
infrastructure/terraform/modules/
├── vpc/              # 3-Tier Multi-AZ VPC, IGW, Subnets, NAT GW, Route Tables
├── acm/              # DNS-validated ACM Wildcard Certificate (*.backlyst.co.uk)
├── alb/              # Public ALB, Listeners, Target Groups & Host Rules
├── ec2/              # Debian 13 instances with Docker bootstrapping, IMDSv2, EBS encryption
├── ecr/              # Dedicated ECR repositories (backend, frontend, admin) with lifecycle rules & scan on push
├── elasticache/      # AWS ElastiCache Serverless (Valkey 8 / Redis engine) with cost guardrails
├── iam/              # IAM roles, instance profiles, SSM, S3, Secrets Manager, ECR pull, & GitHub Actions OIDC push role
├── rds-postgres/     # RDS PostgreSQL 17.5 in isolated DB subnets with gp3 storage encryption
├── route53/          # DNS Alias records for apex and subdomains
├── s3/               # Encrypted, private S3 bucket with versioning & block public access
├── secrets-manager/  # AWS Secrets Manager secret with ignore_changes lifecycle
└── security-groups/  # Zero-trust security group firewall rules
```


---

## 5. Deployment & Access Guide

### Initializing and Applying Infrastructure

```bash
cd infrastructure/terraform/environments/dev   # or prod

# Initialize modules & providers
terraform init

# Validate configuration
terraform validate

# Plan and inspect resources
terraform plan

# Apply infrastructure
terraform apply
```

### SSH-Less Access via AWS SSM Session Manager

Since EC2 instances have no public IPs and open no inbound SSH ports, connect securely using AWS Systems Manager:

```bash
# Connect to Backend instance
aws ssm start-session --target $(terraform output -raw backend_instance_id) --region eu-west-2 --profile tom

# Connect to Frontend instance
aws ssm start-session --target $(terraform output -raw frontend_instance_id) --region eu-west-2 --profile tom
```
