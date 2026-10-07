output "instance_id" {
  description = "The ID of the EC2 instance"
  value       = aws_instance.this.id
}

output "arn" {
  description = "The ARN of the EC2 instance"
  value       = aws_instance.this.arn
}

output "private_ip" {
  description = "The private IP address of the EC2 instance"
  value       = aws_instance.this.private_ip
}

output "public_ip" {
  description = "The public IP address of the EC2 instance (if assigned)"
  value       = aws_instance.this.public_ip
}

output "instance_name" {
  description = "The name of the EC2 instance"
  value       = var.instance_name
}
