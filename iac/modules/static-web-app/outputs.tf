output "id" {
  description = "Static Web App ID."
  value       = azurerm_static_web_app.this.id
}

output "default_host_name" {
  description = "Default Static Web App hostname."
  value       = azurerm_static_web_app.this.default_host_name
}

output "api_key" {
  description = "Static Web App deployment token."
  value       = azurerm_static_web_app.this.api_key
  sensitive   = true
}
