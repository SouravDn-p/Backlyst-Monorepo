output "alb_id" {
  description = "The ID of the Load Balancer"
  value       = aws_lb.this.id
}

output "alb_arn" {
  description = "The ARN of the Load Balancer"
  value       = aws_lb.this.arn
}

output "alb_dns_name" {
  description = "The DNS name of the Load Balancer"
  value       = aws_lb.this.dns_name
}

output "alb_zone_id" {
  description = "The canonical hosted zone ID of the Load Balancer"
  value       = aws_lb.this.zone_id
}

output "http_listener_arn" {
  description = "The ARN of the HTTP listener"
  value       = aws_lb_listener.http.arn
}

output "https_listener_arn" {
  description = "The ARN of the HTTPS listener"
  value       = aws_lb_listener.https.arn
}

output "backend_target_group_arn" {
  description = "ARN of the Backend target group"
  value       = aws_lb_target_group.backend.arn
}

output "nextjs_target_group_arn" {
  description = "ARN of the Next.js target group"
  value       = aws_lb_target_group.nextjs.arn
}

output "admin_target_group_arn" {
  description = "ARN of the Admin dashboard target group"
  value       = aws_lb_target_group.admin.arn
}
