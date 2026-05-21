# Deploiement Azure low-cost

Ce projet est bien adapte a un deploiement tres leger. Avec Azure for Students, pars sur une enveloppe prudente de **100 USD sur 12 mois**, soit environ:

- 8.33 USD/mois au total
- 2.78 USD/mois par app si tu veux heberger 3 apps similaires

La regle d'or: eviter tout service avec cout fixe mensuel.

## Choix recommande pour 3 apps et 100 USD/an

Utiliser:

- Azure Static Web Apps Free pour chaque frontend
- Azure Container Apps Consumption pour chaque API, avec `minReplicas=0`
- un seul Container Apps Environment partage pour les 3 APIs
- pas de Front Door
- pas de CDN payant
- pas d'Azure Container Registry si GHCR/Docker Hub suffit
- pas de Log Analytics persistant si tu veux minimiser le cout

Cette option est plus economique que Blob + CDN quand tu veux HTTPS et domaine custom, car Static Web Apps Free inclut l'hebergement, SSL et des domaines custom dans les limites du plan.

Une version Terraform modulaire est disponible dans `iac/`.

## Variante Blob Storage

Blob Storage Static Website reste possible:

- frontend Vite/React statique dans Azure Storage Static Website ou Azure Static Web Apps Free
- backend FastAPI stateless dans Azure Container Apps Consumption
- pas de base de donnees Azure, car les documents, chunks, vecteurs et conversations restent dans le navigateur

Mais evite d'ajouter Azure Front Door/CDN pour un petit projet etudiant, car Front Door Standard peut consommer plusieurs mois de budget a lui seul.

## Choix recommande

### Option A - cout minimum

Utiliser:

- Azure Static Web Apps Free pour `frontend/dist`
- Azure Container Apps Consumption pour l'API, avec `minReplicas=0`
- pas de CDN Azure au debut
- URL frontend Azure par defaut: `https://<nom>.azurestaticapps.net`
- URL API Azure par defaut: `https://<app>.<hash>.<region>.azurecontainerapps.io`

C'est souvent le meilleur point de depart: pas de frais fixes CDN/Front Door, le backend peut scale-to-zero, et le frontend reste dans le plan gratuit tant que tu respectes les limites Static Web Apps.

### Option B - domaine perso HTTPS + edge Azure

Utiliser Azure Front Door Standard devant:

- le frontend Blob Static Website comme origin par defaut
- l'API Container Apps comme origin pour `/api/*`

Avantages:

- un seul domaine, par exemple `https://app.example.com`
- HTTPS managé
- cache edge/CDN
- plus besoin de CORS si `/api/*` passe par le meme domaine

Inconvenient:

- Azure Front Door Standard ajoute un cout fixe mensuel. A utiliser seulement si le domaine perso HTTPS ou le CDN Azure est vraiment necessaire.

> Note 2026: Azure CDN Standard from Microsoft (classic) est en retrait. Pour un nouveau deploiement Azure, Front Door Standard est le chemin Microsoft recommande pour le role CDN/edge.

## Variables

```bash
APP=portfolio-agent
RG=rg-$APP
LOCATION=westeurope
STORAGE=st${APP//-/}$RANDOM
API_APP=ca-$APP-api
ACA_ENV=cae-$APP
IMAGE=ghcr.io/<owner>/<repo>/portfolio-api:latest
```

Choisis une region proche de tes utilisateurs. `westeurope` est un bon defaut si tu vises Europe/Afrique.

## 1. Creer le groupe de ressources

```bash
az group create \
  --name "$RG" \
  --location "$LOCATION"
```

## 2. Creer le frontend statique

### Option recommandee: Azure Static Web Apps Free

Depuis le portail Azure:

1. Cree une ressource `Static Web App`.
2. Choisis le plan `Free`.
3. Connecte ton repo GitHub.
4. Configure:
   - app location: `frontend`
   - output location: `dist`
   - build command: `npm run build`
5. Note l'URL `https://<nom>.azurestaticapps.net`.
6. Ajoute la variable de build `VITE_API_BASE_URL` apres avoir cree l'API Container Apps.

Pour le cout, c'est le meilleur choix pour tes 3 frontends.

### Alternative: Blob Storage Static Website

```bash
az storage account create \
  --name "$STORAGE" \
  --resource-group "$RG" \
  --location "$LOCATION" \
  --sku Standard_LRS \
  --kind StorageV2 \
  --access-tier Hot \
  --allow-blob-public-access true

az storage blob service-properties update \
  --account-name "$STORAGE" \
  --static-website \
  --index-document index.html \
  --404-document index.html
```

Recuperer l'URL du frontend:

```bash
FRONTEND_URL=$(az storage account show \
  --name "$STORAGE" \
  --resource-group "$RG" \
  --query "primaryEndpoints.web" \
  --output tsv)

echo "$FRONTEND_URL"
```

## 3. Construire et pousser l'image API

Le Dockerfile racine construit l'API FastAPI avec ses dependances OCR.

```bash
docker build -t "$IMAGE" .
docker push "$IMAGE"
```

Si l'image est dans un registre prive, ajoute les options de registre a `az containerapp create`:

```bash
--registry-server ghcr.io \
--registry-username "$GHCR_USER" \
--registry-password "$GHCR_PAT"
```

Pour rester 100% Azure, remplace GHCR/Docker Hub par Azure Container Registry Basic, mais garde en tete que cela ajoute un petit cout fixe.

## 4. Deployer l'API dans Container Apps

Pour reduire les couts de logs, tu peux creer l'environnement sans stockage de logs persistant:

```bash
az containerapp env create \
  --name "$ACA_ENV" \
  --resource-group "$RG" \
  --location "$LOCATION" \
  --logs-destination none
```

Si tu utilises Azure Static Web Apps, renseigne l'URL du frontend avant de creer l'API:

```bash
FRONTEND_URL=https://<nom>.azurestaticapps.net
```

Creer l'API. Exemple avec une image deja poussee dans GHCR/Docker Hub:

```bash
az containerapp create \
  --name "$API_APP" \
  --resource-group "$RG" \
  --environment "$ACA_ENV" \
  --image "$IMAGE" \
  --target-port 8000 \
  --ingress external \
  --min-replicas 0 \
  --max-replicas 1 \
  --cpu 0.5 \
  --memory 1.0Gi \
  --secrets gemini-api-key="$GEMINI_API_KEY" \
  --env-vars \
    GEMINI_API_KEY=secretref:gemini-api-key \
    LITELLM_MODEL=gemini/gemini-2.5-flash-lite \
    LITELLM_EMBEDDING_MODEL=gemini/gemini-embedding-001 \
    CORS_ALLOW_ORIGINS="$FRONTEND_URL"
```

Recuperer l'URL API:

```bash
API_URL=https://$(az containerapp show \
  --name "$API_APP" \
  --resource-group "$RG" \
  --query "properties.configuration.ingress.fqdn" \
  --output tsv)

echo "$API_URL"
```

Tester:

```bash
curl "$API_URL/"
```

## 5. Builder et publier le frontend

Le frontend lit `VITE_API_BASE_URL` au build. Il faut donc builder apres avoir l'URL API.

Avec Azure Static Web Apps, mets cette variable dans la configuration de build/deploiement:

```bash
VITE_API_BASE_URL="$API_URL"
```

Si tu utilises l'alternative Blob Storage, build et upload comme ceci:

```bash
cd frontend
npm ci
VITE_API_BASE_URL="$API_URL" npm run build
cd ..
```

Uploader tout le build avec un cache raisonnable:

```bash
az storage blob upload-batch \
  --account-name "$STORAGE" \
  --destination '$web' \
  --source frontend/dist \
  --overwrite true \
  --content-cache-control "public, max-age=3600"
```

Re-uploader les assets hashes avec cache long:

```bash
az storage blob upload-batch \
  --account-name "$STORAGE" \
  --destination '$web' \
  --source frontend/dist \
  --overwrite true \
  --content-cache-control "public, max-age=31536000, immutable" \
  --pattern "assets/*"
```

Re-uploader `index.html` avec cache court:

```bash
az storage blob upload \
  --account-name "$STORAGE" \
  --container-name '$web' \
  --name index.html \
  --file frontend/dist/index.html \
  --overwrite true \
  --content-type "text/html; charset=utf-8" \
  --content-cache-control "no-cache"
```

## 6. Option Front Door Standard

A ajouter seulement si tu veux un domaine perso HTTPS et un vrai edge/CDN Azure.

Topologie:

```txt
app.example.com
  Front Door Standard
    /*      -> Azure Storage Static Website
    /api/*  -> Azure Container Apps
```

Dans cette variante:

- build le frontend avec `VITE_API_BASE_URL=""`
- configure une route Front Door `/api/*` vers l'origin Container Apps
- configure la route par defaut vers l'origin Storage Static Website
- configure le custom domain + certificat managé dans Front Door
- configure `CORS_ALLOW_ORIGINS=https://app.example.com`, ou supprime presque tout le besoin CORS si le navigateur appelle `/api/*` sur le meme domaine

## Points de cout a surveiller

- Container Apps: `minReplicas=0`, `maxReplicas=1`, petite taille CPU/RAM.
- Logs: `--logs-destination none` reduit le cout, mais garde moins d'historique pour debugger.
- Registry: GHCR/Docker Hub evite un Azure Container Registry payant. Si tu veux rester 100% Azure, utilise ACR Basic.
- Front Door/CDN: a eviter au debut si l'URL Azure par defaut suffit.
- Static Web Apps: privilegie le plan Free pour les 3 frontends.
- Stockage: `Standard_LRS` suffit pour un portfolio/projet demo.
- LLM: le principal cout variable peut etre Gemini/LiteLLM, pas Azure.

## Sources Microsoft utiles

- Static website Azure Storage: https://learn.microsoft.com/azure/storage/blobs/storage-blob-static-website-how-to
- Domaine custom Blob/HTTPS: https://learn.microsoft.com/azure/storage/blobs/storage-custom-domain-name
- Container Apps pricing: https://azure.microsoft.com/pricing/details/container-apps/
- Container Apps scale: https://learn.microsoft.com/azure/container-apps/scale-app
- Container Apps logging options: https://learn.microsoft.com/azure/container-apps/log-options
- Azure Front Door pricing: https://azure.microsoft.com/pricing/details/frontdoor/
- Azure CDN pricing/retirement note: https://azure.microsoft.com/pricing/details/cdn/
