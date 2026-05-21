resource "azurerm_static_web_app" "this" {
  name                = var.name
  resource_group_name = var.resource_group
  location            = var.location
  sku_tier            = "Free"
  sku_size            = "Free"
  app_settings        = var.app_settings
  tags                = var.tags
}
