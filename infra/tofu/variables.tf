variable "project_name" {
  description = "Target-neutral name used as the prefix for VOXL AWS resources."
  type        = string
  default     = "voxl"

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{1,20}[a-z0-9]$", var.project_name))
    error_message = "project_name must be 3-22 lowercase letters, digits, or hyphens and cannot end in a hyphen."
  }
}

variable "environment" {
  description = "Isolated deployment environment. Localhost development does not require an AWS environment."
  type        = string
  default     = "development"

  validation {
    condition     = contains(["development", "staging", "production"], var.environment)
    error_message = "environment must be development, staging, or production."
  }
}

variable "aws_region" {
  description = "AWS region selected for this environment."
  type        = string

  validation {
    condition     = can(regex("^[a-z]{2}(-gov)?-[a-z]+-[0-9]$", var.aws_region))
    error_message = "aws_region must be a valid AWS region name such as us-west-2."
  }
}

variable "additional_tags" {
  description = "Non-secret tags added to every supported AWS resource."
  type        = map(string)
  default     = {}
}
