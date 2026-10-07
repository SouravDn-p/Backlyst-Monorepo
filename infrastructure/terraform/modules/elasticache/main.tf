# ElastiCache Serverless Cache (Valkey / Redis engine)
resource "aws_elasticache_serverless_cache" "valkey" {
  name        = var.cache_name
  engine      = var.engine
  description = "${var.cache_name} serverless ${var.engine} cache"

  major_engine_version = var.major_engine_version

  subnet_ids         = var.subnet_ids
  security_group_ids = var.security_group_ids

  # Cost guardrails — limits maximum memory and CPU usage
  cache_usage_limits {
    data_storage {
      maximum = var.max_storage_gb
      unit    = "GB"
    }
    ecpu_per_second {
      maximum = var.max_ecpu_per_second
    }
  }

  snapshot_retention_limit = var.snapshot_retention_limit

  tags = merge(var.tags, {
    Name        = var.cache_name
    Environment = var.environment
  })
}
