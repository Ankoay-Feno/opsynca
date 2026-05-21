output "resource_group_name" {
  description = "Resource group created for the app stack."
  value       = azurerm_resource_group.main.name
}

output "static_web_app_urls" {
  description = "Default frontend URLs."
  value = {
    for key, app in module.static_web_apps :
    key => "https://${app.default_host_name}"
  }
}

output "container_app_urls" {
  description = "Default API URLs."
  value = {
    for key, app in module.api_apps :
    key => "https://${app.fqdn}"
  }
}

output "frontend_build_env_vars" {
  description = "Frontend build-time env vars to pass to CI. VITE_API_BASE_URL is computed after the API exists."
  value = {
    for key, app in local.apps :
    key => merge(app.frontend_env_vars, {
      VITE_API_BASE_URL = "https://${module.api_apps[key].fqdn}"
    })
  }
}

output "api_cors_allow_origins" {
  description = "Allowed CORS origins configured on each API Container App."
  value       = local.api_cors_allow_origins
}

output "static_web_app_deployment_tokens" {
  description = "Deployment tokens for CI. Store them in GitHub secrets, then treat this output as sensitive."
  value = {
    for key, app in module.static_web_apps :
    key => app.api_key
  }
  sensitive = true
}
