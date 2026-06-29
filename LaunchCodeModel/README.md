# LaunchCodeModel

Technical documentation for a local-first AI coding model product built with Ollama, LiteLLM Proxy, Next.js, Postgres, and optional VS Code integration through Continue.

## Purpose

LaunchCodeModel is a proposed product stack for running a small coding-focused AI model locally, exposing it through an API gateway, and building a web product around it. The initial goal is to create a working local development environment before adding production concerns such as authentication, billing, and monitoring.

In one sentence: this stack runs a small local coding model with Ollama, exposes it through LiteLLM, builds a Next.js product interface, stores app data in Postgres, and optionally connects VS Code through Continue.

## Current Implementation

The local MVP now includes:

- Next.js web app at `http://localhost:3000`.
- LiteLLM Proxy at `http://localhost:4000`.
- Ollama runtime at `http://localhost:11434`.
- Postgres at `localhost:5432`.
- Model: `qwen2.5-coder:1.5b`.
- App-facing model name: `qwen2.5-coder-1.5b`.
- Project/workspace support.
- Persistent conversations and messages.
- Rename/delete controls for projects and conversations.
- Live health checks for LiteLLM, Ollama, and Postgres.
- Model usage dashboard with request and token counts.
- External API panel with a local OpenAI-compatible endpoint.
- Continue local config updated at `/Users/manasa/.continue/config.yaml`.
- Footer copyright note: `Copyright 2026. Created by Manasa Hari. June 25, 2026.`

## Running Locally

Create local configuration files and replace every placeholder value:

```bash
cp .env.example .env
cp apps/web/.env.example apps/web/.env.local
```

Use the same API key for `LITELLM_MASTER_KEY` and `LITELLM_API_KEY`, and the
same Postgres password in both files. These local files are ignored by Git.

Start Docker services:

```bash
docker compose --env-file .env -f infra/docker-compose.yml up -d
```

Start the web app:

```bash
cd apps/web
pnpm dev
```

Open:

```text
http://localhost:3000
```

Health check:

```bash
curl http://localhost:3000/api/health
```

Run checks:

```bash
cd apps/web
pnpm lint
pnpm build
```

## Architecture Overview

```text
VS Code / Continue         Next.js Web App
        |                         |
        |                         |
        +-----------+-------------+
                    |
              LiteLLM Proxy
                    |
                  Ollama
                    |
        qwen2.5-coder:1.5b

Postgres stores users, projects, conversations, messages, usage, and settings.
Stripe, auth, and monitoring are added after the local MVP is stable.
```

Current local service map:

```text
Browser UI :3000
  -> Next.js API routes
  -> LiteLLM Proxy :4000
  -> Ollama :11434
  -> qwen2.5-coder:1.5b

Postgres :5432
  -> projects
  -> conversations
  -> messages
  -> model_requests
```

## Core Stack

| Layer | Tool | Role |
|---|---|---|
| Model runtime | Ollama | Downloads, runs, and serves local AI models. |
| Coding model | qwen2.5-coder:1.5b | Small coding-focused model for local code generation, explanation, and edits. |
| API gateway | LiteLLM Proxy | Provides an OpenAI-compatible API facade in front of Ollama and future model providers. |
| Product interface | Next.js | Builds the web app, including chat UI, settings, dashboards, and documentation. |
| Authentication | Clerk or Auth.js | Handles login, accounts, sessions, and access control. |
| Database | Postgres | Stores long-term product data such as users, projects, chat history, prompts, billing status, usage, and settings. |
| Billing | Stripe | Handles checkout, subscriptions, invoices, payment events, and cancellations. |
| Monitoring | Prometheus and Grafana | Collects and visualizes request count, latency, errors, resource usage, and model usage. |
| VS Code client | Continue | Connects VS Code to Ollama or LiteLLM for chat, edits, autocomplete, and repo-aware coding help. |

## Model Capabilities

The current model is `qwen2.5-coder:1.5b`, a small local coding model. It is useful for lightweight coding assistance, but it is not a full autonomous coding agent by itself.

Useful tasks:

- Generate code snippets.
- Explain code.
- Suggest bug fixes for pasted or selected code.
- Refactor small functions.
- Write small unit tests.
- Convert code between languages.
- Explain errors and stack traces.
- Draft TypeScript, JavaScript, Python, SQL, React, and API examples.

Current web app capabilities:

- Chat with the model.
- Save conversations and messages to Postgres.
- Group conversations by project/workspace.
- Rename and delete projects.
- Rename and delete conversations.
- Show live health for LiteLLM, Ollama, and Postgres.
- Show request/token usage.
- Expose a local OpenAI-compatible API endpoint.

Current web app limitations:

- It does not read local files automatically.
- It does not edit files on disk.
- It does not run commands or tests.
- It does not inspect the repo unless code is pasted into chat.
- It does not browse the internet.
- It does not have multi-user auth yet.

Continue capabilities depend on what Continue sends to the model. Through Continue, the model can work with selected/open file context and can participate in edit/apply workflows, but the 1.5B model is best suited for small and medium scoped tasks.

## Recommended MVP Scope

The first milestone should focus on a local end-to-end loop:

1. Run Ollama locally.
2. Pull and verify `qwen2.5-coder:1.5b`.
3. Run LiteLLM Proxy against Ollama.
4. Scaffold the Next.js web app.
5. Add a simple chat/code assistant UI.
6. Store conversations and messages in Postgres.
7. Connect Continue to the same local model endpoint.

Auth, billing, and production monitoring should come after the local model path works reliably.

## Suggested Repository Structure

```text
LaunchCodeModel/
  apps/
    web/                 # Next.js product UI
  services/
    litellm/             # LiteLLM proxy config
  apps/web/src/db/       # Drizzle schema and database client
  apps/web/drizzle/      # Database migrations
  infra/
    docker-compose.yml   # Postgres and LiteLLM
  docs/
    continue-vscode.md
  .env.example
  README.md
  PRD.md
```

## Installed Tooling

The local development machine should have:

- Homebrew for installing macOS development tools.
- Git for source control.
- Node.js for Next.js.
- npm, bundled with Node.js.
- pnpm as the recommended JavaScript package manager.
- Docker Desktop for local containers.
- Ollama for running local models.
- VS Code as the editor.
- Continue VS Code extension as the IDE AI client.
- Postgres client tools, including `psql`.

Verified local versions at the time this documentation was created:

```text
Homebrew 6.0.3
git version 2.54.0
node v26.3.1
npm 11.16.0
pnpm 11.9.0
Docker version 29.5.3
psql PostgreSQL 16.14
Ollama model installed: qwen2.5-coder:1.5b
```

Note: Node `v26.3.1` is newer than the usual production LTS line. It may work for development, but if Next.js or dependencies report compatibility issues, switch to the current Node.js LTS release.

## Local Model Setup

Install and pull the coding model:

```bash
ollama pull qwen2.5-coder:1.5b
```

List installed models:

```bash
ollama list
```

Run a quick model check:

```bash
ollama run qwen2.5-coder:1.5b
```

## LiteLLM Proxy Plan

LiteLLM should sit between the app and Ollama. The app should call LiteLLM using an OpenAI-compatible API shape, which keeps the application decoupled from the model provider.

For local macOS development, keep Ollama running on the host and let containerized LiteLLM call:

```text
http://host.docker.internal:11434
```

This avoids extra Docker complexity around local model runtime access.

## Next.js Product Plan

The web app currently includes:

- A chat/code prompt interface.
- Conversation history.
- Project selector/workspace concept.
- Project and conversation rename/delete controls.
- Usage tracking in Postgres.
- Live health checks.
- External API usage panel.

Still pending:

- Model response streaming.
- Better auto-generated conversation titles.
- Auth.
- Hosted deployment.
- Formal evaluation prompts.

Recommended defaults:

- TypeScript.
- App Router.
- Tailwind CSS.
- Server-side API route that calls LiteLLM.
- Database access through Prisma or Drizzle.

## Database Plan

Postgres should store application state that needs to survive restarts.

Current entities:

- `projects`
- `conversations`
- `messages`
- `model_requests`

Future entities:

- `users`
- `settings`
- `subscriptions`
- `invoices`
- `api_keys`
- `teams`
- `audit_events`

## Auth Decision

Two reasonable options:

- Clerk: fastest hosted authentication and user-management path.
- Auth.js: more developer-controlled and flexible, but usually requires more setup.

Recommendation: start with Auth.js if this is a local-first developer product and Clerk if fast hosted user management is more important than control.

## Billing Plan

Stripe should be added after authentication and usage tracking exist.

Billing should eventually handle:

- Checkout sessions.
- Subscription plans.
- Customer portal.
- Webhook handling.
- Subscription status sync to Postgres.
- Usage or quota enforcement.

Install Stripe CLI later for local webhook testing.

## Monitoring Plan

Start with structured application logs during the MVP. Add Prometheus and Grafana when the app has enough behavior to measure.

Useful metrics:

- Request count.
- Error count.
- Request latency.
- Model latency.
- Tokens or approximate usage.
- Active users.
- Docker container CPU and memory.
- Ollama health.

Hosted logging or error tracking can be added later through tools such as Sentry, Axiom, Datadog, or Logtail.

## Continue VS Code Integration

Continue should connect to either:

- Ollama directly for the simplest local path.
- LiteLLM Proxy for consistency with the web app and future provider switching.

The long-term preference is to connect Continue through LiteLLM so both the web product and VS Code client use the same routing, logging, and model configuration.

See [docs/continue-vscode.md](docs/continue-vscode.md) for the local Continue setup.

The active local Continue config was updated at:

```text
/Users/manasa/.continue/config.yaml
```

Current model entry:

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

## External API

LiteLLM exposes an OpenAI-compatible API for local tools and clients.

```text
Base URL: http://localhost:4000/v1
Model: qwen2.5-coder-1.5b
API key: use the value configured in `LITELLM_API_KEY`
```

Example:

```bash
curl http://localhost:4000/v1/chat/completions \
  -H "Authorization: Bearer ${LITELLM_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"model":"qwen2.5-coder-1.5b","messages":[{"role":"user","content":"Write a hello world function in TypeScript"}]}'
```

## Implementation Phases

### Phase 1: Local Runtime

- Verify Ollama is running.
- Verify `qwen2.5-coder:1.5b` is installed.
- Create LiteLLM configuration.
- Test a direct LiteLLM-to-Ollama request.

### Phase 2: Web MVP

- Scaffold Next.js app.
- Add simple chat UI.
- Add server API route to LiteLLM.
- Add Postgres container and schema.
- Persist conversations and messages.
- Add projects/workspaces.
- Add live health checks.
- Add usage dashboard.
- Add external API panel.

### Phase 3: Developer Workflow

- Add Continue configuration.
- Document VS Code setup.
- Add local setup scripts.
- Add `.env.example`.

### Phase 4: Product Features

- Add auth.
- Add user/project scoping.
- Add saved prompts and settings.
- Add usage tracking.

### Phase 5: Commercial and Operations

- Add Stripe billing.
- Add Prometheus/Grafana.
- Add hosted logging or error tracking.
- Add deployment documentation.

## Open Decisions

- Whether to use Clerk or Auth.js.
- Whether to use Prisma or Drizzle for database access.
- Whether LiteLLM should run in Docker immediately or after the web MVP is stable.
- Whether the product should be fully local-first or designed for hosted multi-user deployment.
- Whether usage tracking should count approximate tokens, request count, elapsed model time, or a combination.

Resolved for current MVP:

- Drizzle is the selected ORM.
- LiteLLM runs in Docker.
- Postgres runs in Docker.
- Ollama runs on the host machine.
- The product is currently local-first.

## Next Step

The next engineering step is to scaffold the repository structure, add a Docker Compose file for Postgres and LiteLLM, create the Next.js app under `apps/web`, and wire a basic prompt form to the local LiteLLM endpoint.
