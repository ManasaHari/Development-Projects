# Continue VS Code Setup

This guide connects the Continue VS Code extension to the local LaunchCodeModel LiteLLM endpoint.

## Prerequisites

- Docker Desktop is running.
- Ollama is running.
- The model is installed:

```bash
ollama pull qwen2.5-coder:1.5b
```

- LaunchCodeModel services are running:

```bash
docker compose --env-file .env -f infra/docker-compose.yml up -d
```

- LiteLLM is reachable at:

```text
http://localhost:4000/v1
```

## Model Settings

Use these values in Continue:

```text
Provider/API style: OpenAI-compatible
Base URL: http://localhost:4000/v1
Model: qwen2.5-coder-1.5b
API key: use the value configured in `LITELLM_API_KEY`
```

The API key is a local development key from `services/litellm/config.yaml`. Do not reuse it for hosted or production deployments.

## Example Continue Configuration

Open Continue settings/config in VS Code and add an OpenAI-compatible model entry similar to:

```json
{
  "models": [
    {
      "title": "LaunchCodeModel Local",
      "provider": "openai",
      "model": "qwen2.5-coder-1.5b",
      "apiBase": "http://localhost:4000/v1",
      "apiKey": "<your-local-api-key>"
    }
  ]
}
```

Continue configuration formats can vary by extension version. If your installed Continue version uses a different config shape, keep the same endpoint, model, and API key values.

You can also use the committed example config at `docs/continue-vscode-config.json`.

## Verify The Endpoint

Run:

```bash
curl http://localhost:4000/v1/chat/completions \
  -H "Authorization: Bearer ${LITELLM_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"model":"qwen2.5-coder-1.5b","messages":[{"role":"user","content":"Reply with exactly: continue ok"}]}'
```

Expected result:

```text
The response should include "continue ok".
```

## Troubleshooting

If Continue cannot connect:

- Confirm Docker containers are running:

```bash
docker compose --env-file .env -f infra/docker-compose.yml ps
```

- Confirm Ollama can see the model:

```bash
ollama list
```

- Confirm LiteLLM can list the configured model:

```bash
curl http://localhost:4000/v1/models \
  -H "Authorization: Bearer ${LITELLM_API_KEY}"
```

- Confirm the web app health endpoint is healthy:

```bash
curl http://localhost:3000/api/health
```
