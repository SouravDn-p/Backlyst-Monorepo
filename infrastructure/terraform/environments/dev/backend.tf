# Remote S3 Backend Configuration with Native S3 State Locking
terraform {
  backend "s3" {
    bucket       = "backlyst-dev-tfstate"
    key          = "dev/terraform.tfstate"
    region       = "eu-west-2"
    profile      = "tom"
    encrypt      = true
    use_lockfile = true
  }
}
