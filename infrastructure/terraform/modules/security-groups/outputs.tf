output "alb_security_group_id" {
  description = "ID of the ALB security group"
  value       = aws_security_group.alb.id
}

output "backend_security_group_id" {
  description = "ID of the Backend EC2 security group"
  value       = aws_security_group.backend.id
}

output "frontend_security_group_id" {
  description = "ID of the Frontend EC2 security group"
  value       = aws_security_group.frontend.id
}

output "rds_security_group_id" {
  description = "ID of the RDS PostgreSQL security group"
  value       = aws_security_group.rds.id
}

output "redis_security_group_id" {
  description = "ID of the ElastiCache Redis security group"
  value       = aws_security_group.redis.id
}
