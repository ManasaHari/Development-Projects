# LaunchCodeModel Project Reference

## Runtime

```text
Browser / Next.js UI
  -> /api/chat
  -> LiteLLM Proxy
  -> Ollama
  -> qwen2.5-coder:1.5b

Postgres stores:
  projects
  conversations
  messages
  model_requests
```

## Main Commands

```bash
cd /Users/manasa/development/LaunchCodeModel
docker compose --env-file .env -f infra/docker-compose.yml up -d

cd apps/web
pnpm dev
pnpm lint
pnpm build
pnpm db:generate
pnpm db:migrate
```

## Local Endpoints

```text
Web app: http://localhost:3000
Health: http://localhost:3000/api/health
Usage: http://localhost:3000/api/usage
LiteLLM: http://localhost:4000/v1
Ollama: http://localhost:11434
Postgres: localhost:5432
```

## API Routes

- `POST /api/chat`
- `GET /api/conversations`
- `GET /api/conversations/[id]`
- `PATCH /api/conversations/[id]`
- `DELETE /api/conversations/[id]`
- `GET /api/projects`
- `POST /api/projects`
- `PATCH /api/projects/[id]`
- `DELETE /api/projects/[id]`
- `GET /api/health`
- `GET /api/usage`

## Database

Connection string format:

```text
postgresql://<user>:<password>@localhost:5432/<database>
```

Tables:

- `projects`
- `conversations`
- `messages`
- `model_requests`

LiteLLM also creates internal tables in the same Postgres database.

## Current Product State

Implemented:

- Next.js local web app.
- LiteLLM and Postgres Docker Compose services.
- Ollama host runtime.
- Persistent project-scoped conversations.
- Rename/delete controls for projects and conversations.
- Health checks.
- Usage dashboard.
- External API panel.
- Technical Docs view with competitive study.
- Continue setup docs/config.

Pending:

- Auth.
- Billing.
- Hosted deployment.
- Model response streaming.
- File reading/editing from the web app.
- Command/test execution from the web app.
- Formal coding eval harness.
- Production monitoring dashboard.

## Verification Notes

`pnpm build` may fail inside the sandbox because Turbopack needs local process/port access. Rerun with escalated permissions when that happens.

Docker and localhost checks often need escalated permissions from Codex.
