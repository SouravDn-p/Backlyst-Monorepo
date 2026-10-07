output "valkey_endpoint" {
  description = "ElastiCache Valkey/Redis Serverless endpoint hostname"
  value       = aws_elasticache_serverless_cache.valkey.endpoint[0].address
}

output "valkey_port" {
  description = "ElastiCache Valkey/Redis Serverless port"
  value       = aws_elasticache_serverless_cache.valkey.endpoint[0].port
}

output "redis_url" {
  description = "Full Redis connection URL"
  value       = "redis://${aws_elasticache_serverless_cache.valkey.endpoint[0].address}:${aws_elasticache_serverless_cache.valkey.endpoint[0].port}"
}

output "arn" {
  description = "ARN of the ElastiCache serverless cache"
  value       = aws_elasticache_serverless_cache.valkey.arn
}
