locals {
  project_suffix                = lower(replace(var.project, "_", "-"))
  registry_password_secret_name = "registry-password-${local.project_suffix}"
  api_location                  = coalesce(var.api_location, var.location)

  backend_secret_names = {
    for key in keys(var.backend_secret_env_vars) :
    key => "${lower(replace(key, "_", "-"))}-${local.project_suffix}"
  }

  app_slugs = {
    for app_key, app in var.apps :
    app_key => lower(replace(app_key, "_", "-"))
  }

  app_env_files = {
    for app_key, app in var.apps :
    app_key => {
      backend  = "${path.root}/env_variables/backend/${app.backend_env_file}"
      frontend = "${path.root}/env_variables/frontend/${app.frontend_env_file}"
    }
  }

  backend_env_vars = {
    for app_key, env_files in local.app_env_files :
    app_key => {
      for key, value in jsondecode(file(env_files.backend)) :
      key => tostring(value)
    }
  }

  frontend_env_vars = {
    for app_key, env_files in local.app_env_files :
    app_key => {
      for key, value in jsondecode(file(env_files.frontend)) :
      key => tostring(value)
    }
  }

  apps = {
    for app_key, app in var.apps :
    app_key => {
      static_site_name  = "stapp-${local.app_slugs[app_key]}-${local.project_suffix}"
      api_name          = "ca-${local.app_slugs[app_key]}-api-${local.project_suffix}"
      container_name    = coalesce(app.api.container_name, "api-${local.app_slugs[app_key]}-${local.project_suffix}")
      scale_rule_name   = "http-scale-${local.app_slugs[app_key]}-${local.project_suffix}"
      backend_env_vars  = local.backend_env_vars[app_key]
      frontend_env_vars = local.frontend_env_vars[app_key]
      api               = app.api
    }
  }

  api_cors_allow_origins = {
    for app_key, app in local.apps :
    app_key => distinct([
      for origin in concat(
        ["https://${module.static_web_apps[app_key].default_host_name}"],
        app.api.extra_cors_origins
      ) :
      trimsuffix(trimspace(origin), "/")
      if trimspace(origin) != ""
    ])
  }

  common_tags = merge(var.tags, {
    project = local.project_suffix
  })
}

resource "azurerm_resource_group" "main" {
  name     = "rg-${local.project_suffix}"
  location = var.location
  tags     = local.common_tags
}

module "budget" {
  source = "./modules/budget"
  count  = var.monthly_budget_amount > 0 && length(var.budget_contact_emails) > 0 && var.budget_start_date != null && var.budget_end_date != null ? 1 : 0

  name            = "budget-monthly-${local.project_suffix}"
  subscription_id = data.azurerm_subscription.current.id
  amount          = var.monthly_budget_amount
  start_date      = var.budget_start_date
  end_date        = var.budget_end_date
  contact_emails  = var.budget_contact_emails
}

module "container_app_environment" {
  source = "./modules/container-app-environment"

  name             = "cae-${local.project_suffix}"
  location         = local.api_location
  resource_group   = azurerm_resource_group.main.name
  logs_destination = var.container_apps_logs_destination
  tags             = local.common_tags
}

module "static_web_apps" {
  source   = "./modules/static-web-app"
  for_each = local.apps

  name           = each.value.static_site_name
  location       = azurerm_resource_group.main.location
  resource_group = azurerm_resource_group.main.name
  app_settings   = each.value.frontend_env_vars
  tags           = local.common_tags
}

module "api_apps" {
  source   = "./modules/container-app"
  for_each = local.apps

  name                         = each.value.api_name
  resource_group               = azurerm_resource_group.main.name
  container_app_environment_id = module.container_app_environment.id

  container_name   = each.value.container_name
  image            = each.value.api.image
  target_port      = each.value.api.target_port
  cpu              = each.value.api.cpu
  memory           = each.value.api.memory
  min_replicas     = each.value.api.min_replicas
  max_replicas     = each.value.api.max_replicas
  http_concurrency = each.value.api.http_concurrency
  scale_rule_name  = each.value.scale_rule_name

  environment_variables = merge(each.value.backend_env_vars, each.value.api.env_vars, {
    CORS_ALLOW_ORIGINS = join(",", local.api_cors_allow_origins[each.key])
  })

  secret_environment_variables = local.backend_secret_names

  secrets = {
    for key, value in var.backend_secret_env_vars :
    local.backend_secret_names[key] => value
  }

  registry = var.registry == null ? null : {
    server               = var.registry.server
    username             = var.registry.username
    password_secret_name = local.registry_password_secret_name
  }

  registry_password = var.registry == null ? null : var.registry_password
  tags              = local.common_tags
}
