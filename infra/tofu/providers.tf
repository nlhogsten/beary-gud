provider "aws" {
  region = var.aws_region

  default_tags {
    tags = merge(local.required_tags, var.additional_tags)
  }
}
