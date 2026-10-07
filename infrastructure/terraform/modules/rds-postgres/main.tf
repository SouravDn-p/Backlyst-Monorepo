# RDS DB Subnet Group
resource "aws_db_subnet_group" "postgres" {
  name        = "dbsng-${var.identifier}"
  description = "DB Subnet Group for ${var.identifier}"
  subnet_ids  = var.subnet_ids

  tags = merge(var.tags, {
    Name = "dbsng-${var.identifier}"
  })
}

# RDS PostgreSQL Instance
resource "aws_db_instance" "postgres" {
  identifier     = var.identifier
  engine         = "postgres"
  engine_version = var.engine_version
  instance_class = var.db_instance_class

  allocated_storage     = var.db_allocated_storage
  max_allocated_storage = var.max_allocated_storage > 0 ? var.max_allocated_storage : null
  storage_type          = var.storage_type
  storage_encrypted     = var.storage_encrypted

  db_name  = var.db_name
  username = var.db_username
  password = var.db_password

  publicly_accessible = var.publicly_accessible
  multi_az            = var.multi_az

  db_subnet_group_name   = aws_db_subnet_group.postgres.name
  vpc_security_group_ids = var.security_group_ids

  skip_final_snapshot        = var.skip_final_snapshot
  deletion_protection        = var.deletion_protection
  backup_retention_period    = var.backup_retention_period
  auto_minor_version_upgrade = var.auto_minor_version_upgrade
  apply_immediately          = var.apply_immediately

  tags = merge(var.tags, {
    Name = var.identifier
  })
}
