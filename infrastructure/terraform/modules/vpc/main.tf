data "aws_availability_zones" "available" {
  state = "available"
}

locals {
  selected_azs = length(var.azs) > 0 ? var.azs : data.aws_availability_zones.available.names
  nat_count    = var.enable_nat_gateway ? (var.single_nat_gateway ? 1 : length(var.public_subnet_cidrs)) : 0
}

# 1. Custom VPC
resource "aws_vpc" "this" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-vpc"
    Environment = var.environment
  })
}

# 2. Internet Gateway (for Public Subnets)
resource "aws_internet_gateway" "this" {
  vpc_id = aws_vpc.this.id

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-igw"
    Environment = var.environment
  })
}

# 3. Public Subnet Tier (ALB & NAT Gateways)
resource "aws_subnet" "public" {
  count                   = length(var.public_subnet_cidrs)
  vpc_id                  = aws_vpc.this.id
  cidr_block              = var.public_subnet_cidrs[count.index]
  availability_zone       = local.selected_azs[count.index % length(local.selected_azs)]
  map_public_ip_on_launch = var.map_public_ip_on_launch

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-public-subnet-${count.index + 1}"
    Tier        = "public"
    Environment = var.environment
  })
}

# 4. Private Application Subnet Tier (Backend & Frontend EC2 Instances)
resource "aws_subnet" "private_app" {
  count                   = length(var.private_app_subnet_cidrs)
  vpc_id                  = aws_vpc.this.id
  cidr_block              = var.private_app_subnet_cidrs[count.index]
  availability_zone       = local.selected_azs[count.index % length(local.selected_azs)]
  map_public_ip_on_launch = false

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-private-app-subnet-${count.index + 1}"
    Tier        = "private-app"
    Environment = var.environment
  })
}

# 5. Private Database / Storage Subnet Tier (RDS PostgreSQL & ElastiCache)
resource "aws_subnet" "private_db" {
  count                   = length(var.private_db_subnet_cidrs)
  vpc_id                  = aws_vpc.this.id
  cidr_block              = var.private_db_subnet_cidrs[count.index]
  availability_zone       = local.selected_azs[count.index % length(local.selected_azs)]
  map_public_ip_on_launch = false

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-private-db-subnet-${count.index + 1}"
    Tier        = "private-db"
    Environment = var.environment
  })
}

# 6. Elastic IPs for NAT Gateway(s)
resource "aws_eip" "nat" {
  count  = local.nat_count
  domain = "vpc"

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-nat-eip-${count.index + 1}"
    Environment = var.environment
  })

  depends_on = [aws_internet_gateway.this]
}

# 7. NAT Gateway(s)
resource "aws_nat_gateway" "this" {
  count         = local.nat_count
  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-nat-gw-${count.index + 1}"
    Environment = var.environment
  })

  depends_on = [aws_internet_gateway.this]
}

# 8. Public Route Table (0.0.0.0/0 -> Internet Gateway)
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.this.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.this.id
  }

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-public-rt"
    Environment = var.environment
  })
}

# Associate Public Subnets with Public Route Table
resource "aws_route_table_association" "public" {
  count          = length(var.public_subnet_cidrs)
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# 9. Private App Route Table(s) (0.0.0.0/0 -> NAT Gateway for outbound internet)
resource "aws_route_table" "private_app" {
  count  = var.enable_nat_gateway ? (var.single_nat_gateway ? 1 : length(var.private_app_subnet_cidrs)) : 1
  vpc_id = aws_vpc.this.id

  dynamic "route" {
    for_each = var.enable_nat_gateway ? [1] : []
    content {
      cidr_block     = "0.0.0.0/0"
      nat_gateway_id = var.single_nat_gateway ? aws_nat_gateway.this[0].id : aws_nat_gateway.this[count.index].id
    }
  }

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-private-app-rt-${count.index + 1}"
    Environment = var.environment
  })
}

# Associate Private App Subnets with Private App Route Table(s)
resource "aws_route_table_association" "private_app" {
  count          = length(var.private_app_subnet_cidrs)
  subnet_id      = aws_subnet.private_app[count.index].id
  route_table_id = var.single_nat_gateway ? aws_route_table.private_app[0].id : aws_route_table.private_app[count.index].id
}

# 10. Private Database Route Table (Isolated Tier - No external internet route)
resource "aws_route_table" "private_db" {
  vpc_id = aws_vpc.this.id

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-private-db-rt"
    Environment = var.environment
  })
}

# Associate Private Database Subnets with Private DB Route Table
resource "aws_route_table_association" "private_db" {
  count          = length(var.private_db_subnet_cidrs)
  subnet_id      = aws_subnet.private_db[count.index].id
  route_table_id = aws_route_table.private_db.id
}
