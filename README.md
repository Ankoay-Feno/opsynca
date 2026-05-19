## Portfolio Agent

Architecture **local-first** : une API FastAPI minimaliste sert de proxy stateless vers LiteLLM (Gemini), et tout le stockage RAG (chunks, vecteurs, conversations) vit dans le navigateur via IndexedDB + recherche vectorielle voy-search (WASM).

```txt
api/
  main.py              # entree FastAPI: uvicorn api.main:app
  config.py            # variables d'environnement (LiteLLM uniquement)
  litellm_client.py    # appels au proxy LiteLLM
  rag/
    router.py          # /api/extract /api/embed /api/answer /api/title
    extract_file_contents.py  # extraction PDF/docx/odt/xlsx/images/etc.

docs/
  logical.drawio       # schema logique RAG
  cv-project-entry.md  # formulation professionnelle pour CV / portfolio

litellm_config.yaml             # modeles LiteLLM
docker-compose.yml              # api + litellm + postgres
Dockerfile                      # image Python commune (api / litellm)
frontend/                       # app Vite servie par FastAPI
  src/storage.ts                # IndexedDB (conversations, chunks, documents)
  src/chunking.ts               # decoupage texte cote client
  src/vectorSearch.ts           # voy-search WASM (HNSW local)
  src/apps/                     # shells (topbar + nav)
  src/views/RagView.tsx         # orchestration RAG
  src/components/               # ChatPanel, DocumentsPanel, ConversationsPanel
```

## Variables

Copie `.env.example` vers `.env`, puis remplis au minimum :

```env
GEMINI_API_KEY=ta-cle-gemini
LITELLM_MASTER_KEY=sk-ta-master-key
LITELLM_SALT_KEY=sk-une-cle-longue
POSTGRES_PASSWORD=litellm_password
```

Postgres est conserve uniquement pour la persistence interne de LiteLLM (cles, usage). Le RAG ne l'utilise plus.

Le modele par defaut de l'API est :

```env
LITELLM_MODEL=gemini/gemini-2.5-flash-lite
LITELLM_EMBEDDING_MODEL=gemini/gemini-embedding-001
```

Avec Docker Compose, l'API utilise `API_LITELLM_MODEL` pour eviter les conflits avec une ancienne variable locale.

## Lancer avec Docker

```bash
docker compose up --build
```

Services exposes :

```txt
FastAPI Swagger : http://localhost:8000/docs
LiteLLM Proxy   : http://localhost:4000
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
POST /api/extract    fichier -> texte extrait
POST /api/embed      textes -> vecteurs Gemini
POST /api/answer     question + context chunks + history -> reponse LLM
POST /api/title      messages -> titre conversation
```

## Flux RAG (architecture client-side)

```txt
[UPLOAD]
  fichier --> /api/extract --> texte
  client chunk + /api/embed --> vecteurs
  client stocke {chunks, document} dans IndexedDB
  client ajoute les vecteurs a l'index voy-search en memoire

[CHAT]
  question --> /api/embed --> vecteur
  voy-search local sur IDB --> top-k chunks
  question + chunks + history --> /api/answer --> reponse + indices cites
  client stocke la conversation dans IndexedDB
```

Aucune donnee utilisateur (documents, chunks, conversations) ne quitte le navigateur. Le serveur n'a qu'un role de proxy stateless vers LiteLLM (necessaire pour proteger la cle Gemini).

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

Et le frontend en dev :

```bash
cd frontend
npm run dev
```

## Tests

```bash
# Backend
uv run pytest -q

# Frontend
cd frontend && npm test
```
