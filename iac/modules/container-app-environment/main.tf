resource "azurerm_log_analytics_workspace" "this" {
  count = var.logs_destination == "log-analytics" ? 1 : 0

  name                = "log-${var.name}"
  location            = var.location
  resource_group_name = var.resource_group
  sku                 = "PerGB2018"
  retention_in_days   = 30
  tags                = var.tags
}

resource "azurerm_container_app_environment" "this" {
  name                       = var.name
  location                   = var.location
  resource_group_name        = var.resource_group
  logs_destination           = var.logs_destination == "none" ? "" : var.logs_destination
  log_analytics_workspace_id = var.logs_destination == "log-analytics" ? azurerm_log_analytics_workspace.this[0].id : null
  tags                       = var.tags
}
