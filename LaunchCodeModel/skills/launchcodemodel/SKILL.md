---
name: launchcodemodel
description: Operate and extend the local LaunchCodeModel AI coding assistant project. Use when working on /Users/manasa/development/LaunchCodeModel, including its Next.js web app, LiteLLM/Ollama/Postgres stack, Drizzle schema, Continue configuration, technical docs, PRD, README, local API, health checks, usage dashboard, projects/workspaces, and conversation persistence.
---

# LaunchCodeModel

Use this skill for the LaunchCodeModel project at:

```text
/Users/manasa/development/LaunchCodeModel
```

LaunchCodeModel is a local-first AI coding assistant:

```text
Next.js UI :3000 -> LiteLLM :4000 -> Ollama :11434 -> qwen2.5-coder:1.5b
Postgres :5432 -> projects, conversations, messages, model_requests
```

## Project Map

- `apps/web/`: Next.js app.
- `apps/web/src/app/page.tsx`: main UI with Workspace and Technical Docs views.
- `apps/web/src/app/api/`: API routes.
- `apps/web/src/db/schema.ts`: Drizzle schema.
- `apps/web/drizzle/`: generated migrations.
- `infra/docker-compose.yml`: Postgres and LiteLLM services.
- `services/litellm/config.yaml`: LiteLLM model config and local key.
- `docs/continue-vscode.md`: Continue setup guide.
- `README.md`: technical overview and runbook.
- `PRD.md`: product requirements and launch framework.

For fuller context, read `references/project-reference.md`.

## Standard Workflow

1. Work from `/Users/manasa/development/LaunchCodeModel`.
2. Inspect relevant files before editing.
3. Preserve local architecture unless the user asks for a redesign.
4. Use `apply_patch` for file edits.
5. Run verification after changes:

```bash
cd /Users/manasa/development/LaunchCodeModel/apps/web
pnpm lint
pnpm build
```

Run `pnpm build` outside the sandbox when Turbopack needs local process/port access.

## Local Services

Start services:

```bash
cd /Users/manasa/development/LaunchCodeModel
docker compose --env-file .env -f infra/docker-compose.yml up -d
```

Start the web app:

```bash
cd /Users/manasa/development/LaunchCodeModel/apps/web
pnpm dev
```

Useful checks:

```bash
curl http://localhost:3000/api/health
curl http://localhost:3000/api/usage
curl http://localhost:4000/v1/models -H "Authorization: Bearer ${LITELLM_API_KEY}"
ollama list
```

Docker, localhost, and network operations often require escalated execution in Codex.

## Current App Features

- Workspace and Technical Docs top navigation.
- Project/workspace create, select, rename, delete.
- Persistent conversations in Postgres.
- Conversation rename/delete.
- Chat route through LiteLLM and Ollama.
- Live health checks for LiteLLM, Ollama, and Postgres.
- Model usage dashboard.
- External API panel.
- Competitive study in Technical Docs.
- Continue config guidance.
- Copyright footer.

## Model/API Details

- Ollama model: `qwen2.5-coder:1.5b`
- App/LiteLLM model name: `qwen2.5-coder-1.5b`
- LiteLLM base URL: `http://localhost:4000/v1`
- Local API key: configured through `LITELLM_API_KEY`; never commit its value.
- Web app: `http://localhost:3000`

## Continue Configuration

The active local Continue config is:

```text
/Users/manasa/.continue/config.yaml
```

Expected model entry:

```yaml
name: LaunchCodeModel
version: 1.0.0
schema: v1

models:
  - name: LaunchCodeModel Local
    provider: openai
    model: qwen2.5-coder-1.5b
    apiBase: http://localhost:4000/v1
      apiKey: <your-local-api-key>
    roles:
      - chat
      - edit
      - apply
```

## Common Tasks

### Add UI Features

Edit `apps/web/src/app/page.tsx`. Keep the UI dense, operational, and project-focused. Avoid landing-page styling.

### Add API Routes

Add route files under `apps/web/src/app/api/<name>/route.ts`. Use `NextResponse`, Drizzle, and existing patterns.

### Update Database

Edit `apps/web/src/db/schema.ts`, then:

```bash
cd apps/web
pnpm db:generate
pnpm db:migrate
```

Verify with `psql` when needed.

### Update Docs

Update `README.md` and `PRD.md` when features, architecture, setup, or launch state changes. Regenerate DOCX versions only if the user asks.

## Known Boundaries

The web app can chat, save conversations, group by project, show health, and show usage. It does not yet read local files, edit files on disk, run shell commands, run tests, browse the internet, or provide multi-user auth.
