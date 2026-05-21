output "id" {
  description = "Container Apps Environment ID."
  value       = azurerm_container_app_environment.this.id
}

output "name" {
  description = "Container Apps Environment name."
  value       = azurerm_container_app_environment.this.name
}
