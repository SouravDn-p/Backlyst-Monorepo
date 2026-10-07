data "aws_ami" "debian" {
  most_recent = true
  owners      = ["136693071363"] # Debian Official AWS account ID

  filter {
    name   = "name"
    values = ["debian-12-amd64-*", "debian-13-amd64-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}
