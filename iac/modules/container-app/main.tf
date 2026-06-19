locals {
  all_secrets = var.registry == null ? var.secrets : merge(var.secrets, {
    (var.registry.password_secret_name) = var.registry_password
  })
}

resource "azurerm_container_app" "this" {
  name                         = var.name
  container_app_environment_id = var.container_app_environment_id
  resource_group_name          = var.resource_group
  revision_mode                = "Single"
  tags                         = var.tags

  dynamic "secret" {
    for_each = nonsensitive(local.all_secrets)

    content {
      name  = secret.key
      value = secret.value
    }
  }

  dynamic "registry" {
    for_each = var.registry == null ? [] : [var.registry]

    content {
      server               = registry.value.server
      username             = registry.value.username
      password_secret_name = registry.value.password_secret_name
    }
  }

  ingress {
    external_enabled           = true
    target_port                = var.target_port
    transport                  = "auto"
    allow_insecure_connections = false

    traffic_weight {
      percentage      = 100
      latest_revision = true
    }
  }

  template {
    min_replicas = var.min_replicas
    max_replicas = var.max_replicas

    http_scale_rule {
      name                = var.scale_rule_name
      concurrent_requests = var.http_concurrency
    }

    container {
      name   = var.container_name
      image  = var.image
      cpu    = var.cpu
      memory = var.memory

      dynamic "env" {
        # nonsensitive() pour autoriser l'iteration (les NOMS de variables ne sont
        # pas secrets) ; sensitive() re-marque chaque VALEUR pour qu'aucune cle API
        # n'apparaisse en clair dans terraform plan/state.
        for_each = nonsensitive(var.environment_variables)

        content {
          name  = env.key
          value = sensitive(env.value)
        }
      }

      dynamic "env" {
        for_each = nonsensitive(var.secret_environment_variables)

        content {
          name        = env.key
          secret_name = env.value
        }
      }
    }
  }
}
