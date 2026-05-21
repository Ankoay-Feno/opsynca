output "id" {
  description = "Container App ID."
  value       = azurerm_container_app.this.id
}

output "fqdn" {
  description = "Container App public FQDN."
  value       = azurerm_container_app.this.ingress[0].fqdn
}
