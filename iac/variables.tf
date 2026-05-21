variable "subscription_id" {
  description = "Azure subscription ID. Can also be provided with ARM_SUBSCRIPTION_ID."
  type        = string
  default     = null
}

variable "project" {
  description = "Short project suffix used in Azure resource names."
  type        = string
  default     = "studentapps"

  validation {
    condition     = can(regex("^[A-Za-z0-9_-]+$", var.project))
    error_message = "project can contain only letters, numbers, underscores, and hyphens."
  }
}

variable "location" {
  description = "Azure region for the resources."
  type        = string
  default     = "westeurope"
}

variable "api_location" {
  description = "Optional Azure region for the backend Container App Environment. Defaults to var.location. Use a different region to bypass external API geo-restrictions (e.g. Gemini blocks eastasia)."
  type        = string
  default     = null
}

variable "tags" {
  description = "Tags applied to all resources."
  type        = map(string)
  default = {
    managed_by = "terraform"
    cost_mode  = "student-low-cost"
  }
}

variable "backend_secret_env_vars" {
  description = "Optional backend secret env vars such as GROQ_API_KEY or MISTRAL_API_KEY. Values are stored in Terraform state."
  type        = map(string)
  default     = {}
  sensitive   = true

  validation {
    condition = alltrue([
      for key in keys(var.backend_secret_env_vars) :
      can(regex("^[A-Z][A-Z0-9_]*$", key))
    ])
    error_message = "backend_secret_env_vars keys must be uppercase env var names, for example GROQ_API_KEY."
  }
}

variable "registry" {
  description = "Optional private container registry identity. Leave null for public images."
  type = object({
    server   = string
    username = string
  })
  default = null
}

variable "registry_password" {
  description = "Optional private container registry password or token. Do not commit it; pass it with TF_VAR_registry_password."
  type        = string
  default     = null
  sensitive   = true
}

variable "container_apps_logs_destination" {
  description = "Use none for minimum cost, or log-analytics while debugging."
  type        = string
  default     = "none"

  validation {
    condition     = contains(["none", "log-analytics"], var.container_apps_logs_destination)
    error_message = "container_apps_logs_destination must be either none or log-analytics."
  }
}

variable "apps" {
  description = "Static frontend + stateless API apps to provision."
  type = map(object({
    backend_env_file  = optional(string, "backend_env.json")
    frontend_env_file = optional(string, "frontend_env.json")

    api = object({
      image              = string
      container_name     = optional(string)
      target_port        = optional(number, 8000)
      cpu                = optional(number, 0.5)
      memory             = optional(string, "1.0Gi")
      min_replicas       = optional(number, 0)
      max_replicas       = optional(number, 1)
      http_concurrency   = optional(number, 20)
      env_vars           = optional(map(string), {})
      extra_cors_origins = optional(list(string), [])
    })
  }))

  validation {
    condition = alltrue([
      for app_key in keys(var.apps) :
      can(regex("^[A-Za-z0-9_-]+$", app_key))
    ])
    error_message = "App keys can contain only letters, numbers, underscores, and hyphens."
  }
}

variable "monthly_budget_amount" {
  description = "Optional monthly Azure budget in USD. Set to 0 to disable."
  type        = number
  default     = 8
}

variable "budget_start_date" {
  description = "Budget start date in RFC3339 format, usually the first day of your current billing month."
  type        = string
  default     = null
}

variable "budget_end_date" {
  description = "Budget end date in RFC3339 format, usually just after your student credit expires."
  type        = string
  default     = null
}

variable "budget_contact_emails" {
  description = "Email addresses that receive budget alerts. Empty list disables the budget resource."
  type        = list(string)
  default     = []
}
