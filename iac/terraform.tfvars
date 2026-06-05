subscription_id = "9b2864db-0fc6-4e72-8f37-bb44ce267740"
project         = "opsynca-ai"
location        = "eastasia"
api_location    = "southeastasia"

# Azure for Students: 100 USD / 12 months ~= 8.33 USD/month.
monthly_budget_amount = 8
budget_start_date     = "2026-05-01T00:00:00Z"
budget_end_date       = "2027-05-01T00:00:00Z"
budget_contact_emails = ["ankoayfeno@gmail.com"]

# Prefer TF_VAR_gemini_api_key instead of putting this value here.
# gemini_api_key = "..."

# Leave null if your image is public. If private, set TF_VAR_registry_password.
registry = null

# registry = {
#   server   = "ghcr.io"
#   username = "<github-username>"
# }

container_apps_logs_destination = "none"

apps = {
  portfolio = {
    api = {
      image = "ghcr.io/ankoay-feno/opsynca-ai/api:latest"

      min_replicas = 0
      max_replicas = 1
      cpu          = 0.5
      memory       = "1.0Gi"

      # Custom domains + local dev origins.
      extra_cors_origins = [
        "https://ankoay.dev",
        "https://opsynca.dev",
        "https://www.opsynca.dev",
        "http://localhost:5173",

      ]
    }
  }

  # app2 = {
  #   api = {
  #     image = "ghcr.io/<owner>/<repo>/second-api:latest"
  #   }
  # }
}
