# Terraform Azure low-cost

Objectif: tenir **3 apps stateless** sur Azure for Students **100 USD / 12 mois** sans service a cout fixe.

Architecture provisionnee:

- 1 resource group
- 1 Azure Container Apps Environment partage
- 1 Azure Static Web Apps Free par frontend
- 1 Azure Container App Consumption par API, `min_replicas = 0`
- 1 budget mensuel optionnel
- pas de Front Door, pas de CDN payant, pas d'ACR obligatoire, pas de Log Analytics par defaut

## Structure

```txt
iac/
  main.tf
  variables.tf
  outputs.tf
  terraform.tfvars.example
  env_variables/
    backend/
    frontend/
  modules/
    budget/
    container-app/
    container-app-environment/
    static-web-app/
```

## Credentials Azure

### Option locale simple

Pour travailler depuis ta machine:

```bash
az login
az account list --output table
az account set --subscription "<SUBSCRIPTION_ID>"

export ARM_SUBSCRIPTION_ID="$(az account show --query id -o tsv)"
export ARM_TENANT_ID="$(az account show --query tenantId -o tsv)"
```

Terraform peut utiliser ta session Azure CLI. Garde quand meme `subscription_id` dans `terraform.tfvars` pour eviter de deployer dans la mauvaise subscription.

Si certains providers Azure ne sont pas encore enregistres:

```bash
az provider register --namespace Microsoft.App
az provider register --namespace Microsoft.Web
az provider register --namespace Microsoft.Consumption
az provider register --namespace Microsoft.OperationalInsights
```

### Option service principal pour CI

Pour GitHub Actions ou Azure DevOps, cree un service principal limite a ta subscription:

```bash
export ARM_SUBSCRIPTION_ID="$(az account show --query id -o tsv)"

az ad sp create-for-rbac \
  --name "sp-terraform-studentapps" \
  --role Contributor \
  --scopes "/subscriptions/$ARM_SUBSCRIPTION_ID"
```

La commande retourne:

- `appId` -> `ARM_CLIENT_ID`
- `password` -> `ARM_CLIENT_SECRET`
- `tenant` -> `ARM_TENANT_ID`

Ensuite:

```bash
export ARM_CLIENT_ID="<appId>"
export ARM_CLIENT_SECRET="<password>"
export ARM_TENANT_ID="<tenant>"
export ARM_SUBSCRIPTION_ID="<subscription_id>"
```

Ne commit jamais ces valeurs.

## Env vars JSON

Les variables non-secretes sont stockees dans des fichiers JSON:

```txt
iac/env_variables/backend/backend_env.json
iac/env_variables/frontend/frontend_env.json
```

Exemple backend:

```json
{
  "LITELLM_MODEL": "gemini/gemini-2.5-flash-lite",
  "LITELLM_EMBEDDING_MODEL": "gemini/gemini-embedding-001"
}
```

Exemple frontend:

```json
{
  "VITE_APP_ENV": "production"
}
```

Le fichier `backend_env.json` est gitignore et peut contenir des secrets (par exemple `GEMINI_API_KEY`). Terraform lit son contenu tel quel et le passe en variables d'environnement au Container App.

Pour les autres secrets gerees hors JSON (registry, fallbacks LiteLLM optionnels), utilise `TF_VAR_registry_password` ou `TF_VAR_backend_secret_env_vars`.

Pour chaque app, tu peux choisir les fichiers JSON:

```hcl
apps = {
  portfolio = {
    backend_env_file  = "backend_env.json"
    frontend_env_file = "frontend_env.json"

    api = {
      image = "ghcr.io/<owner>/<repo>/portfolio-api:latest"
    }
  }
}
```

Les fichiers references doivent exister. Si tu indiques `app2_backend_env.json`, cree le fichier dans `iac/env_variables/backend/`.

Terraform merge les env vars backend dans cet ordre:

```txt
env_variables/backend/<backend_env_file>
apps.<app>.api.env_vars
valeurs calculees par Terraform, comme CORS_ALLOW_ORIGINS
```

Pour le frontend, `frontend_env_file` est passe en `app_settings` Static Web Apps. Attention: avec Vite, les variables `VITE_*` doivent aussi etre presentes pendant `npm run build`. Terraform expose donc un output `frontend_build_env_vars` qui ajoute automatiquement `VITE_API_BASE_URL`.

## Secrets applicatifs

### Gemini

Le backend lit `GEMINI_API_KEY`. Ajoute-la dans `iac/env_variables/backend/backend_env.json` (fichier gitignore):

```json
{
  "LITELLM_MODEL": "gemini/gemini-2.5-flash-lite",
  "LITELLM_EMBEDDING_MODEL": "gemini/gemini-embedding-001",
  "GEMINI_API_KEY": "<ta-cle-gemini>"
}
```

### Autres providers LiteLLM

Si tu gardes les fallbacks Groq, Hugging Face, Mistral ou Evenlake, passe-les avec une variable sensible:

```bash
export TF_VAR_backend_secret_env_vars='{
  "GROQ_API_KEY": "...",
  "HUGGINGFACE_API_KEY": "...",
  "MISTRAL_API_KEY": "...",
  "EVENLAKE_API_KEY": "..."
}'
```

Important: si Terraform gere un secret Container Apps, la valeur est presente dans le `terraform.tfstate`. Pour ce projet etudiant, le state local est ignore par Git via `.gitignore`, mais ne le pousse jamais dans un repo. Pour une equipe/CI, utilise un backend remote securise.

### Registry container

Si ton image GHCR/Docker Hub est publique:


```hcl
registry = null
```

Si ton image est privee:

```hcl
registry = {
  server   = "ghcr.io"
  username = "<github-username>"
}
```

Puis:

```bash
export TF_VAR_registry_password="<ghcr-token-ou-docker-token>"
```

## Configuration

```bash
cd iac
cp terraform.tfvars.example terraform.tfvars
```

Edite au minimum:

- `subscription_id`
- `project`
- `budget_contact_emails`
- `apps.portfolio.api.image`
- `apps.portfolio.backend_env_file` si tu veux un fichier backend specifique
- `apps.portfolio.frontend_env_file` si tu veux un fichier frontend specifique

## Convention de nommage

Tous les noms Azure crees par ce projet sont suffixes par `project`.

Avec:

```hcl
project = "portfolio-student"

apps = {
  portfolio = {
    api = {
      image = "ghcr.io/<owner>/<repo>/portfolio-api:latest"
    }
  }
}
```

Terraform genere:

```txt
rg-portfolio-student
cae-portfolio-student
stapp-portfolio-portfolio-student
ca-portfolio-api-portfolio-student
api-portfolio-portfolio-student
http-scale-portfolio-portfolio-student
gemini-api-key-portfolio-student
```

La cle de chaque app (`portfolio`, `app2`, etc.) sert de nom fonctionnel. Le suffixe `project` isole les environnements et rend le code reproductible.

Budget conseille pour 100 USD / 12 mois:

```hcl
monthly_budget_amount = 8
```

Le budget n'est cree que si `budget_contact_emails`, `budget_start_date` et `budget_end_date` sont renseignes.

## Provisionner

```bash
terraform init
terraform fmt -recursive
terraform validate
terraform plan -out tfplan
terraform apply tfplan
```

## Recuperer les URLs

```bash
terraform output static_web_app_urls
terraform output container_app_urls
```

Pour recuperer les tokens de deploiement Static Web Apps:

```bash
terraform output -json static_web_app_deployment_tokens
```

Pour recuperer les env vars de build frontend:

```bash
terraform output -json frontend_build_env_vars
```

Mets le token correspondant dans tes secrets GitHub, par exemple:

- `AZURE_STATIC_WEB_APPS_API_TOKEN`
- `VITE_API_BASE_URL` avec la valeur sortie par `frontend_build_env_vars`

## Deploiement frontend

Terraform cree la Static Web App, mais le build/deploiement du frontend reste mieux dans CI.

Dans GitHub Actions, le frontend doit avoir:

- `AZURE_STATIC_WEB_APPS_API_TOKEN`
- les valeurs sorties par `terraform output -json frontend_build_env_vars`

Pour Vite, `VITE_API_BASE_URL` doit etre disponible pendant `npm run build`, car elle est injectee dans les fichiers statiques.

## Ajouter une deuxieme ou troisieme app

Ajoute une entree dans `apps`:

```hcl
apps = {
  portfolio = {
    backend_env_file  = "backend_env.json"
    frontend_env_file = "frontend_env.json"

    api = {
      image = "ghcr.io/<owner>/<repo>/portfolio-api:latest"
    }
  }

  app2 = {
    backend_env_file  = "app2_backend_env.json"
    frontend_env_file = "app2_frontend_env.json"

    api = {
      image = "ghcr.io/<owner>/<repo>/second-api:latest"
    }
  }
}
```

Les 3 APIs partagent le meme Container Apps Environment pour reduire la surface et garder le setup simple.

## Nettoyer

```bash
terraform destroy
```

## Sources

- Azure for Students: https://azure.microsoft.com/free/students
- Terraform Azure service principal: https://learn.microsoft.com/azure/developer/terraform/authenticate-to-azure-with-service-principle
- Azure Static Web Apps Free: https://azure.microsoft.com/pricing/details/app-service/static/
- Azure Container Apps pricing: https://azure.microsoft.com/pricing/details/container-apps/
- Azure Container Apps scaling: https://learn.microsoft.com/azure/container-apps/scale-app
- Azure spending limit: https://learn.microsoft.com/azure/cost-management-billing/manage/spending-limit
- Azure budgets: https://learn.microsoft.com/azure/cost-management-billing/costs/tutorial-acm-create-budgets
