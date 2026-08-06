locals {
  name_prefix = "${var.project_name}-${var.environment}"

  required_tags = {
    Application = "VOXL"
    Environment = var.environment
    ManagedBy   = "OpenTofu"
    Repository  = var.project_name
  }

  planned_components = {
    studio_distribution = "${local.name_prefix}-studio"
    api_service         = "${local.name_prefix}-api"
    worker_service      = "${local.name_prefix}-worker"
    asset_store         = "${local.name_prefix}-assets"
    relational_store    = "${local.name_prefix}-postgres"
  }
}
