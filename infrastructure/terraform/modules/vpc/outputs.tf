output "vpc_id" {
  description = "The ID of the custom VPC"
  value       = aws_vpc.this.id
}

output "vpc_cidr_block" {
  description = "The CIDR block of the custom VPC"
  value       = aws_vpc.this.cidr_block
}

output "internet_gateway_id" {
  description = "The ID of the Internet Gateway"
  value       = aws_internet_gateway.this.id
}

output "public_subnet_ids" {
  description = "List of IDs of the public subnets (ALB & NAT)"
  value       = aws_subnet.public[*].id
}

output "private_app_subnet_ids" {
  description = "List of IDs of the private application subnets (EC2 Instances)"
  value       = aws_subnet.private_app[*].id
}

output "private_db_subnet_ids" {
  description = "List of IDs of the isolated private database subnets (RDS & ElastiCache)"
  value       = aws_subnet.private_db[*].id
}

output "nat_gateway_ids" {
  description = "List of IDs of the NAT Gateways"
  value       = aws_nat_gateway.this[*].id
}

output "nat_gateway_public_ips" {
  description = "List of Elastic IP addresses associated with the NAT Gateways"
  value       = aws_eip.nat[*].public_ip
}
