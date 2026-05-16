## Portfolio Agent

Architecture simple pour une API FastAPI qui appelle un LiteLLM Proxy, indexe les documents dans Qdrant et sert une interface React.

```txt
api/
  main.py              # entree FastAPI: uvicorn api.main:app
  config.py            # variables d'environnement
  litellm_client.py    # appels au proxy LiteLLM
  rag/
    router.py          # /api/rag/upload, /api/rag/chat, documents indexes

docs/
  logical.drawio       # schema logique RAG
  cv-project-entry.md  # formulation professionnelle pour CV / portfolio

litellm_config.yaml             # modeles LiteLLM
docker-compose.yml              # api + litellm + postgres + qdrant
Dockerfile                      # image Python commune (api / litellm)
frontend/                       # app Vite servie par FastAPI
  index.html / src/main.tsx     # / -> Console RAG
  src/apps/                     # shells (topbar + nav)
  src/views/                    # RagView
  src/components/               # composants partages
```

## Variables

Copie `.env.example` vers `.env`, puis remplis au minimum :

```env
GEMINI_API_KEY=ta-cle-gemini
LITELLM_MASTER_KEY=sk-ta-master-key
LITELLM_SALT_KEY=sk-une-cle-longue
POSTGRES_PASSWORD=litellm_password
```

Le modele par defaut de l'API est :

```env
LITELLM_MODEL=gemini/gemini-2.5-flash-lite
```

Avec Docker Compose, l'API utilise plutot `API_LITELLM_MODEL` pour eviter les conflits avec une ancienne variable locale.

## Lancer avec Docker

```bash
docker compose up --build
```

Services exposes :

```txt
FastAPI Swagger : http://localhost:8000/docs
LiteLLM Proxy   : http://localhost:4000
Qdrant          : http://localhost:6333
Postgres        : localhost:5432
```

## Frontend

L'interface est dans `frontend/` et se construit en assets statiques servis par FastAPI.

```bash
cd frontend
npm install
npm run dev
```

Pour generer le bundle utilise par FastAPI en local :

```bash
cd frontend
npm run build:api
```

## Routes API

```txt
GET  /               interface React Console RAG
GET  /api/health     verifie la configuration API
GET  /api/models     liste les modeles via LiteLLM
POST /api/chat       chat simple via LiteLLM
POST /api/rag/upload
POST /api/rag/chat
```

Le flux RAG suit ce chemin :

```txt
upload fichier -> extraction texte/OCR -> chunks -> embeddings -> Qdrant
question -> embedding -> recherche Qdrant -> contexte -> LiteLLM
```

## Lancer en local sans Docker

Demarre d'abord LiteLLM :

```bash
set -a
source .env
set +a

uv run litellm --config litellm_config.yaml
```

Puis demarre l'API :

```bash
set -a
source .env
set +a

uv run uvicorn api.main:app --reload --port 8000
```

Test rapide :

```bash
curl -X POST 'http://localhost:8000/api/chat' \
  -H 'Content-Type: application/json' \
  -d '{"message": "Presente-toi rapidement."}'
```
