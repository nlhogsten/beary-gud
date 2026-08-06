output "environment" {
  description = "Configured AWS environment name."
  value       = var.environment
}

output "name_prefix" {
  description = "Deterministic prefix for resources added in later infrastructure phases."
  value       = local.name_prefix
}

output "planned_component_names" {
  description = "Names reserved for planned components; these outputs do not represent created resources."
  value       = local.planned_components
}
