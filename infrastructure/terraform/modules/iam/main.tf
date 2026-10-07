# Common EC2 Assume Role Policy
data "aws_iam_policy_document" "ec2_assume_role" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

# Backend IAM Role & Policies
resource "aws_iam_role" "backend" {
  name               = "${var.project_name}-${var.environment}-backend-role"
  assume_role_policy = data.aws_iam_policy_document.ec2_assume_role.json

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-backend-role"
  })
}

# Backend S3 Policy - Scoped strictly to the specified bucket and its objects
data "aws_iam_policy_document" "backend_s3" {
  count = var.enable_s3_access ? 1 : 0

  statement {
    sid    = "S3BucketAccess"
    effect = "Allow"
    actions = [
      "s3:ListBucket",
      "s3:GetBucketLocation"
    ]
    resources = [var.s3_bucket_arn]
  }

  statement {
    sid    = "S3ObjectAccess"
    effect = "Allow"
    actions = [
      "s3:GetObject",
      "s3:PutObject",
      "s3:DeleteObject"
    ]
    resources = ["${var.s3_bucket_arn}/*"]
  }
}

resource "aws_iam_policy" "backend_s3" {
  count       = var.enable_s3_access ? 1 : 0
  name        = "${var.project_name}-${var.environment}-backend-s3-policy"
  description = "Allows Backend EC2 instance to access its designated S3 bucket"
  policy      = data.aws_iam_policy_document.backend_s3[0].json

  tags = var.tags
}

resource "aws_iam_role_policy_attachment" "backend_s3" {
  count      = var.enable_s3_access ? 1 : 0
  role       = aws_iam_role.backend.name
  policy_arn = aws_iam_policy.backend_s3[0].arn
}

# Backend Secrets Manager Policy - Scoped strictly to the application secret ARN
data "aws_iam_policy_document" "backend_secrets" {
  count = var.enable_secrets_manager_access ? 1 : 0

  statement {
    sid    = "SecretsManagerAccess"
    effect = "Allow"
    actions = [
      "secretsmanager:GetSecretValue",
      "secretsmanager:DescribeSecret"
    ]
    resources = [var.secrets_manager_arn]
  }
}

resource "aws_iam_policy" "backend_secrets" {
  count       = var.enable_secrets_manager_access ? 1 : 0
  name        = "${var.project_name}-${var.environment}-backend-secrets-policy"
  description = "Allows Backend EC2 instance to read its designated Secrets Manager secret"
  policy      = data.aws_iam_policy_document.backend_secrets[0].json

  tags = var.tags
}

resource "aws_iam_role_policy_attachment" "backend_secrets" {
  count      = var.enable_secrets_manager_access ? 1 : 0
  role       = aws_iam_role.backend.name
  policy_arn = aws_iam_policy.backend_secrets[0].arn
}

# AWS Systems Manager Session Manager access for secure SSH-less management
resource "aws_iam_role_policy_attachment" "backend_ssm" {
  role       = aws_iam_role.backend.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

# Backend SES Policy - Allows Backend EC2 to send emails via SES directly
data "aws_iam_policy_document" "backend_ses" {
  count = var.enable_ses_access ? 1 : 0

  statement {
    sid    = "SESEmailAccess"
    effect = "Allow"
    actions = [
      "ses:SendEmail",
      "ses:SendRawEmail"
    ]
    resources = var.ses_domain_identity_arn != "" ? [
      var.ses_domain_identity_arn,
      "${var.ses_domain_identity_arn}/*"
    ] : ["*"]
  }
}

resource "aws_iam_policy" "backend_ses" {
  count       = var.enable_ses_access ? 1 : 0
  name        = "${var.project_name}-${var.environment}-backend-ses-policy"
  description = "Allows Backend EC2 instance to send emails via SES"
  policy      = data.aws_iam_policy_document.backend_ses[0].json

  tags = var.tags
}

resource "aws_iam_role_policy_attachment" "backend_ses" {
  count      = var.enable_ses_access ? 1 : 0
  role       = aws_iam_role.backend.name
  policy_arn = aws_iam_policy.backend_ses[0].arn
}

# CloudWatch basic logging policy
data "aws_iam_policy_document" "backend_cloudwatch" {
  statement {
    sid    = "CloudWatchLogs"
    effect = "Allow"
    actions = [
      "logs:CreateLogGroup",
      "logs:CreateLogStream",
      "logs:PutLogEvents",
      "logs:DescribeLogStreams"
    ]
    resources = ["arn:aws:logs:*:*:*"]
  }
}

resource "aws_iam_policy" "backend_cloudwatch" {
  name        = "${var.project_name}-${var.environment}-backend-cw-policy"
  description = "Allows Backend EC2 instance to push logs to CloudWatch"
  policy      = data.aws_iam_policy_document.backend_cloudwatch.json

  tags = var.tags
}

resource "aws_iam_role_policy_attachment" "backend_cloudwatch" {
  role       = aws_iam_role.backend.name
  policy_arn = aws_iam_policy.backend_cloudwatch.arn
}

# Backend Instance Profile
resource "aws_iam_instance_profile" "backend" {
  name = "${var.project_name}-${var.environment}-backend-instance-profile"
  role = aws_iam_role.backend.name

  tags = var.tags
}

# Frontend IAM Role & Policies
resource "aws_iam_role" "frontend" {
  name               = "${var.project_name}-${var.environment}-frontend-role"
  assume_role_policy = data.aws_iam_policy_document.ec2_assume_role.json

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-frontend-role"
  })
}

# AWS Systems Manager Session Manager access for secure SSH-less management
resource "aws_iam_role_policy_attachment" "frontend_ssm" {
  role       = aws_iam_role.frontend.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

# Dedicated EC2 Admin Password Policy (Scoped strictly to the admin password secret)
data "aws_iam_policy_document" "ec2_admin_secret" {
  count = var.ec2_admin_secret_arn != "" ? 1 : 0

  statement {
    sid    = "EC2AdminPasswordSecretAccess"
    effect = "Allow"
    actions = [
      "secretsmanager:GetSecretValue",
      "secretsmanager:DescribeSecret"
    ]
    resources = [var.ec2_admin_secret_arn]
  }
}

resource "aws_iam_policy" "ec2_admin_secret" {
  count       = var.ec2_admin_secret_arn != "" ? 1 : 0
  name        = "${var.project_name}-${var.environment}-ec2-admin-secret-policy"
  description = "Allows EC2 instances to read strictly the dedicated EC2 Admin Password secret"
  policy      = data.aws_iam_policy_document.ec2_admin_secret[0].json

  tags = var.tags
}

resource "aws_iam_role_policy_attachment" "backend_ec2_admin_secret" {
  count      = var.ec2_admin_secret_arn != "" ? 1 : 0
  role       = aws_iam_role.backend.name
  policy_arn = aws_iam_policy.ec2_admin_secret[0].arn
}

resource "aws_iam_role_policy_attachment" "frontend_ec2_admin_secret" {
  count      = var.ec2_admin_secret_arn != "" ? 1 : 0
  role       = aws_iam_role.frontend.name
  policy_arn = aws_iam_policy.ec2_admin_secret[0].arn
}

# Frontend Instance Profile
resource "aws_iam_instance_profile" "frontend" {
  name = "${var.project_name}-${var.environment}-frontend-instance-profile"
  role = aws_iam_role.frontend.name

  tags = var.tags
}

# ==============================================================================
# ECR Image Pull Policies for EC2 Instances (Backend & Frontend)
# ==============================================================================
data "aws_iam_policy_document" "ecr_pull" {
  count = var.enable_ecr_pull ? 1 : 0

  statement {
    sid    = "ECRAuthToken"
    effect = "Allow"
    actions = [
      "ecr:GetAuthorizationToken"
    ]
    resources = ["*"]
  }

  statement {
    sid    = "ECRImagePull"
    effect = "Allow"
    actions = [
      "ecr:BatchCheckLayerAvailability",
      "ecr:GetDownloadUrlForLayer",
      "ecr:BatchGetImage",
      "ecr:DescribeRepositories",
      "ecr:ListImages"
    ]
    resources = length(var.ecr_repository_arns) > 0 ? var.ecr_repository_arns : ["*"]
  }
}

resource "aws_iam_policy" "ecr_pull" {
  count       = var.enable_ecr_pull ? 1 : 0
  name        = "${var.project_name}-${var.environment}-ecr-pull-policy"
  description = "Allows EC2 instances to pull Docker images from ECR"
  policy      = data.aws_iam_policy_document.ecr_pull[0].json

  tags = var.tags
}

resource "aws_iam_role_policy_attachment" "backend_ecr_pull" {
  count      = var.enable_ecr_pull ? 1 : 0
  role       = aws_iam_role.backend.name
  policy_arn = aws_iam_policy.ecr_pull[0].arn
}

resource "aws_iam_role_policy_attachment" "frontend_ecr_pull" {
  count      = var.enable_ecr_pull ? 1 : 0
  role       = aws_iam_role.frontend.name
  policy_arn = aws_iam_policy.ecr_pull[0].arn
}

# ==============================================================================
# GitHub Actions CI/CD ECR Push IAM Role & OIDC Authentication
# ==============================================================================
data "aws_caller_identity" "current" {}

resource "aws_iam_openid_connect_provider" "github" {
  count = var.enable_github_actions_role && var.create_github_oidc_provider ? 1 : 0

  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1", "1c58a3a8518e8759bf075b76b750d4f2df264fcd"]

  tags = merge(var.tags, {
    Name = "github-actions-oidc-provider"
  })
}

locals {
  github_oidc_provider_arn = var.enable_github_actions_role ? (
    var.create_github_oidc_provider ? (
      length(aws_iam_openid_connect_provider.github) > 0 ? aws_iam_openid_connect_provider.github[0].arn : ""
      ) : (
      var.github_oidc_provider_arn != "" ? var.github_oidc_provider_arn : "arn:aws:iam::${data.aws_caller_identity.current.account_id}:oidc-provider/token.actions.githubusercontent.com"
    )
  ) : ""

  github_sub_conditions = length(var.github_branches) == 1 && var.github_branches[0] == "*" ? [
    "repo:${var.github_repository}:*"
    ] : [
    for branch in var.github_branches : "repo:${var.github_repository}:ref:refs/heads/${branch}"
  ]
}

data "aws_iam_policy_document" "github_actions_assume_role" {
  count = var.enable_github_actions_role && var.github_repository != "" ? 1 : 0

  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [local.github_oidc_provider_arn]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }

    condition {
      test     = "StringLike"
      variable = "token.actions.githubusercontent.com:sub"
      values   = local.github_sub_conditions
    }
  }
}

resource "aws_iam_role" "github_actions_ecr" {
  count              = var.enable_github_actions_role && var.github_repository != "" ? 1 : 0
  name               = "${var.project_name}-${var.environment}-github-actions-ecr-role"
  assume_role_policy = data.aws_iam_policy_document.github_actions_assume_role[0].json

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-github-actions-ecr-role"
  })
}

data "aws_iam_policy_document" "github_actions_ecr_push" {
  count = var.enable_github_actions_role && var.github_repository != "" ? 1 : 0

  statement {
    sid    = "ECRGetAuthorizationToken"
    effect = "Allow"
    actions = [
      "ecr:GetAuthorizationToken"
    ]
    resources = ["*"]
  }

  statement {
    sid    = "ECRPushPullImages"
    effect = "Allow"
    actions = [
      "ecr:BatchCheckLayerAvailability",
      "ecr:GetDownloadUrlForLayer",
      "ecr:GetRepositoryPolicy",
      "ecr:DescribeRepositories",
      "ecr:ListImages",
      "ecr:DescribeImages",
      "ecr:BatchGetImage",
      "ecr:InitiateLayerUpload",
      "ecr:UploadLayerPart",
      "ecr:CompleteLayerUpload",
      "ecr:PutImage"
    ]
    resources = length(var.ecr_repository_arns) > 0 ? var.ecr_repository_arns : ["*"]
  }
}

resource "aws_iam_policy" "github_actions_ecr_push" {
  count       = var.enable_github_actions_role && var.github_repository != "" ? 1 : 0
  name        = "${var.project_name}-${var.environment}-github-actions-ecr-push-policy"
  description = "Allows GitHub Actions CI/CD to build, tag, and push Docker images to ECR"
  policy      = data.aws_iam_policy_document.github_actions_ecr_push[0].json

  tags = var.tags
}

resource "aws_iam_role_policy_attachment" "github_actions_ecr_push" {
  count      = var.enable_github_actions_role && var.github_repository != "" ? 1 : 0
  role       = aws_iam_role.github_actions_ecr[0].name
  policy_arn = aws_iam_policy.github_actions_ecr_push[0].arn
}


# ==============================================================================
# GitHub Actions CI/CD EC2 Describe & SSM Command Execution Policy
# ==============================================================================
data "aws_iam_policy_document" "github_actions_ssm_ec2" {
  count = var.enable_github_actions_role && var.github_repository != "" ? 1 : 0

  statement {
    sid    = "EC2DescribeInstances"
    effect = "Allow"
    actions = [
      "ec2:DescribeInstances",
      "ec2:DescribeTags"
    ]
    resources = ["*"]
  }

  statement {
    sid    = "SSMDescribeAndList"
    effect = "Allow"
    actions = [
      "ssm:GetCommandInvocation",
      "ssm:DescribeInstanceInformation",
      "ssm:ListCommands",
      "ssm:ListCommandInvocations",
      "ssm:DescribeDocument"
    ]
    resources = ["*"]
  }

  statement {
    sid    = "SSMSendCommandDocument"
    effect = "Allow"
    actions = [
      "ssm:SendCommand"
    ]
    resources = [
      "arn:aws:ssm:*:*:document/AWS-RunShellScript",
      "arn:aws:ssm:*:*:command/*"
    ]
  }

  statement {
    sid    = "SSMSendCommandInstances"
    effect = "Allow"
    actions = [
      "ssm:SendCommand"
    ]
    resources = [
      "arn:aws:ec2:*:*:instance/*"
    ]

    condition {
      test     = "StringLike"
      variable = "aws:ResourceTag/Name"
      values   = ["${var.project_name}-${var.environment}-*"]
    }
  }
}

resource "aws_iam_policy" "github_actions_ssm_ec2" {
  count       = var.enable_github_actions_role && var.github_repository != "" ? 1 : 0
  name        = "${var.project_name}-${var.environment}-github-actions-ssm-policy"
  description = "Allows GitHub Actions CI/CD to query EC2 instances and execute deployment commands via SSM"
  policy      = data.aws_iam_policy_document.github_actions_ssm_ec2[0].json

  tags = var.tags
}

resource "aws_iam_role_policy_attachment" "github_actions_ssm_ec2" {
  count      = var.enable_github_actions_role && var.github_repository != "" ? 1 : 0
  role       = aws_iam_role.github_actions_ecr[0].name
  policy_arn = aws_iam_policy.github_actions_ssm_ec2[0].arn
}
