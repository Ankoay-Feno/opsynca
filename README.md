## LiteLLM Proxy avec Gemini

Ce setup utilise uniquement Gemini gratuit via LiteLLM Proxy.

Dans `litellm_config.yaml`, le modele doit garder le prefixe provider `gemini/`, par exemple `gemini/gemini-2.5-flash-lite`. Sans ce prefixe, LiteLLM peut essayer Vertex AI et demander des credentials Google Cloud ADC.

Variables dans `.env` :

```env
GEMINI_API_KEY=ta-cle-gemini
LITELLM_MASTER_KEY=sk-remplace-par-ta-vraie-cle
```

Tu peux generer la master key LiteLLM comme ca :

```bash
echo "sk-$(openssl rand -hex 32)"
```

La master key sert seulement a appeler ton proxy LiteLLM. La cle Gemini sert seulement au proxy pour appeler Gemini.

## Lancer le proxy

```bash
set -a
source .env
set +a

echo "${GEMINI_API_KEY:+gemini key chargee}"
echo "${LITELLM_MASTER_KEY:+master key chargee}"

uv run litellm --config litellm_config.yaml
```

Si tu modifies `.env`, stoppe le proxy avec `Ctrl+C`, puis relance-le. Un proxy deja demarre ne voit pas les nouvelles variables.

## Tester

Dans un autre terminal :

```bash
set -a
source .env
set +a

curl -X POST 'http://localhost:4000/chat/completions' \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $LITELLM_MASTER_KEY" \
  -d '{
    "model": "portfolio-agent",
    "messages": [
      {"role": "system", "content": "Tu es l agent personnel d Ankoay. Reponds avec le CV fourni."},
      {"role": "user", "content": "Presente-toi rapidement."}
    ]
  }'
```

## Depannage

`No connected db.` veut dire que la cle envoyee dans `Authorization` n'est pas la master key chargee par le proxy. Recharge `.env` dans le terminal du `curl` et relance le proxy avec le meme `.env`.

`429 quota exceeded` veut dire que le quota gratuit Gemini est atteint. Comme ce setup utilise uniquement Gemini, il n'y a pas de fallback : il faut attendre le reset du quota, utiliser un autre modele Gemini disponible, ou changer de projet/cle Gemini.

`503 high demand` veut dire que le modele Gemini choisi est temporairement sature. Les modeles preview peuvent avoir ce probleme plus souvent. Essaie `gemini/gemini-2.5-flash-lite` ou attends quelques minutes.

Si l'erreur mentionne encore `portfolio-agent-groq`, `portfolio-agent-openrouter` ou `Fallbacks`, le proxy tourne encore avec l'ancienne config. Stoppe-le avec `Ctrl+C`, puis relance `uv run litellm --config litellm_config.yaml`.

Test d'auth proxy sans consommer de quota LLM :

```bash
set -a
source .env
set +a

curl -i 'http://localhost:4000/models' \
  -H "Authorization: Bearer $LITELLM_MASTER_KEY"
```

## API Swagger avec FastAPI

Le fichier `main.py` expose une petite API FastAPI. Le router principal est monte sur `/api`.

Routes disponibles :

- `GET /` : message simple.
- `GET /api/health` : verifie la config de l'API.
- `GET /api/models` : liste les modeles disponibles via LiteLLM Proxy.
- `POST /api/chat` : envoie un message a `portfolio-agent`.

Lance d'abord LiteLLM Proxy sur le port `4000` :

```bash
set -a
source .env
set +a

uv run litellm --config litellm_config.yaml
```

Puis lance l'API sur le port `8000` dans un deuxieme terminal :

```bash
set -a
source .env
set +a

uv run uvicorn main:app --reload --port 8000
```

Swagger sera disponible ici :

```txt
http://localhost:8000/docs
```

Test direct de l'API :

```bash
curl -X POST 'http://localhost:8000/api/chat' \
  -H 'Content-Type: application/json' \
  -d '{
    "message": "Presente-toi rapidement."
  }'
```
