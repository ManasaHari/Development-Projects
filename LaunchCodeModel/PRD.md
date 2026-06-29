# LaunchCodeModel PRD

## 1. Product Summary

LaunchCodeModel is a local-first AI coding assistant product that runs a small coding model locally through Ollama, exposes it through LiteLLM Proxy, and provides a Next.js web interface for coding chat workflows. The current MVP proves the basic runtime path:

```text
Next.js Web App :3000
  -> LiteLLM Proxy :4000
  -> Ollama :11434
  -> qwen2.5-coder:1.5b

Postgres :5432
  -> stores projects, conversations, messages, and model request metadata
```

The product goal is to create a disciplined launch process for a coding model product, balancing model quality, infrastructure readiness, safety, and product readiness.

## 2. Launch Goal

LaunchCodeModel should be treated as four parallel launch workstreams:

- Model quality
- Infrastructure readiness
- Safety and trust
- Product readiness

The launch must use clear launch gates with owners and exit criteria. The team should validate benchmark and real-world coding performance, ensure serving capacity and rollback plans are in place, run progressive rollouts from internal dogfood to canary to full launch, and monitor a dashboard covering quality, latency, reliability, cost, and user adoption.

The guiding launch principle is to balance coding quality improvements against serving cost and operational risk.

## 3. Target Users

Primary users:

- Individual developers who want a local coding assistant.
- Developers experimenting with small local coding models.
- Builders who want a simple OpenAI-compatible local model gateway.

Future users:

- Enterprise developers who need privacy-aware local or private deployment.
- AI coding agents that need a local model endpoint.
- Teams evaluating model quality and cost tradeoffs before production rollout.

## 4. Current MVP State

Already implemented:

- Next.js app under `apps/web`.
- Local chat UI.
- `/api/chat` route that sends requests to LiteLLM.
- LiteLLM Proxy running in Docker.
- Ollama running locally with `qwen2.5-coder:1.5b`.
- Postgres running in Docker.
- Drizzle ORM installed with initial schema and migration.
- Database tables for `projects`, `conversations`, `messages`, and `model_requests`.
- Environment files for local LiteLLM and Postgres connectivity.
- Project/workspace creation, selection, rename, and delete.
- Project-scoped conversations.
- Persistent conversation history.
- Conversation rename and delete.
- Live health checks for LiteLLM, Ollama, and Postgres.
- Model usage dashboard with request count, prompt tokens, completion tokens, and total tokens.
- External API panel showing the local OpenAI-compatible LiteLLM endpoint.
- Continue local config updated for `LaunchCodeModel Local`.
- Footer copyright note.

Verified:

- LiteLLM model endpoint returns `qwen2.5-coder-1.5b` when called with the configured API key.
- Next.js API route successfully calls LiteLLM and returns a model response.
- Production build passes.
- ESLint passes.
- Database migration applies successfully.
- Project-scoped chat works end-to-end through Next.js, LiteLLM, Ollama, and Postgres.
- Project and conversation rename/delete API flows work.
- Health and usage APIs return expected data.

Not yet implemented:

- Auth.
- Billing.
- Hosted deployment.
- Model response streaming.
- Better conversation auto-titles.
- File reading/editing from the web app.
- Command/test execution from the web app.
- Production monitoring dashboard.
- Safety evaluation workflow.
- Formal model benchmark harness.

## 5. Objectives and Success Metrics

### 5.1 Product Objectives

- Provide a working local coding assistant web interface.
- Route all model traffic through LiteLLM so the model provider can be changed later.
- Persist coding conversations and model usage metadata.
- Establish a launch framework that can scale from local MVP to broader rollout.
- Support future integration with Continue in VS Code.

### 5.2 Model Objectives

Example target objectives for future model launches:

- Improve coding benchmark performance by 15% over baseline.
- Increase IDE or chat acceptance rate by 10%.
- Reduce hallucinated or invalid code suggestions by 20%.
- Maintain defined inference cost and latency targets.
- Avoid major regressions on key coding languages and task types.

### 5.3 MVP Success Metrics

MVP is successful when:

- A user can open `http://localhost:3000` and send a coding prompt.
- The prompt is routed through Next.js, LiteLLM, Ollama, and `qwen2.5-coder:1.5b`.
- The response is displayed in the web UI.
- Conversations and messages are stored in Postgres.
- Projects can be created and used to group conversations.
- Conversations can be renamed, deleted, reopened, and continued.
- A basic dashboard shows runtime health and model usage.
- The local setup can be reproduced from documentation.

## 6. Product Scope

### 6.1 In Scope for MVP

- Local Next.js web app.
- LiteLLM proxy integration.
- Ollama model integration.
- Postgres persistence for projects, conversations, messages, and model request metadata.
- Basic chat UI.
- Basic runtime status indicators.
- Local developer setup documentation.
- Drizzle migration workflow.
- Project/workspace management.
- Conversation management.
- Local OpenAI-compatible API display.
- Continue setup documentation.

### 6.2 Out of Scope for MVP

- Multi-user hosted deployment.
- Clerk/Auth.js login.
- Stripe billing.
- Prometheus/Grafana dashboards.
- Enterprise admin controls.
- Fine-tuning workflow.
- Model training pipeline.
- Full safety red-team automation.

These are deferred until the local product loop is stable.

## 7. User Experience Requirements

### 7.1 Chat Interface

Users must be able to:

- Type a coding question or instruction.
- Submit it to the model.
- See loading state while the model responds.
- See assistant responses in the chat thread.
- See clear errors if LiteLLM, Ollama, or the model request fails.

### 7.2 Conversation Persistence

Users should be able to:

- Start a new conversation.
- See previous conversations.
- Reopen a conversation.
- Continue a previous conversation.
- Associate conversations with a project or workspace.
- Rename a conversation.
- Delete a conversation.

Current status:

Implemented.

### 7.3 Project and Workspace Management

Users should be able to:

- Create a project.
- Select a project.
- See project-scoped conversations.
- Rename a project.
- Delete a project while keeping conversations by moving them back to the all-projects view.

Current status:

Implemented.

### 7.4 Runtime Visibility

The app should show:

- LiteLLM status.
- Ollama status.
- Postgres status.
- Active model name.
- Current model provider.

Current status:

Implemented. The app polls `/api/health` and shows `healthy`, `degraded`, `unavailable`, or `checking`.

### 7.5 Usage Visibility

The app should show:

- Total model requests.
- Total prompt tokens.
- Total completion tokens.
- Total tokens.
- Recent model requests.

Current status:

Implemented through `/api/usage`.

## 8. Technical Requirements

### 8.1 Runtime

Ollama hosts the actual model locally:

```text
http://localhost:11434
```

Current Ollama model:

```text
qwen2.5-coder:1.5b
```

### 8.2 Gateway

LiteLLM Proxy exposes an OpenAI-compatible API:

```text
http://localhost:4000/v1/chat/completions
```

Current app-facing model name:

```text
qwen2.5-coder-1.5b
```

Local API key:

```text
<your-local-api-key>
```

### 8.3 Web App

The web app is built with:

- Next.js
- TypeScript
- Tailwind CSS
- App Router
- Server API route for LiteLLM calls

The app runs locally at:

```text
http://localhost:3000
```

### 8.4 Database

Postgres runs locally through Docker Compose:

```text
postgresql://<user>:<password>@localhost:5432/<database>
```

Drizzle is the selected ORM because it is lightweight, TypeScript-friendly, and close to SQL.

Initial database entities:

- `projects`
- `conversations`
- `messages`
- `model_requests`

### 8.5 Current API Routes

Current app API routes:

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

### 8.6 Model Capability Boundaries

The current model can:

- Generate code snippets.
- Explain code.
- Suggest fixes for pasted or selected code.
- Refactor small functions.
- Draft unit tests.
- Explain errors and stack traces.
- Help with lightweight TypeScript, JavaScript, Python, SQL, React, and API examples.

The current web app cannot yet:

- Read local project files automatically.
- Edit files on disk.
- Run shell commands or tests.
- Inspect the repo unless code is pasted into chat.
- Browse the internet.
- Act as an autonomous coding agent.

Continue can provide selected/open file context and edit/apply workflows, but capability depends on Continue configuration and the limits of the small 1.5B local model.

## 9. Launch Workstreams

### 9.1 Workstream 1: Model Quality

Purpose:

Validate that the coding model is good enough for the intended user and launch surface.

Metrics:

- SWE-bench
- HumanEval
- MBPP
- LiveCodeBench
- Internal coding tasks
- Pass@1
- Pass@k
- Chat answer usefulness
- Code correctness
- Edit quality
- Regression rate

Key questions:

- Is the model actually better than the current baseline?
- Where does it regress?
- Which languages and frameworks perform best?
- Which coding tasks fail most often?
- Does the small local model provide enough value despite its size?

MVP application:

For the current local MVP, formal benchmark automation is not yet built. The first step is to create a small internal evaluation set of coding prompts and expected outcomes.

### 9.2 Workstream 2: Infrastructure Readiness

Purpose:

Ensure the serving path can support the expected traffic, latency, and reliability targets.

Metrics:

- Throughput
- P50 latency
- P95 latency
- Request failure rate
- LiteLLM availability
- Ollama availability
- Postgres availability
- Cost per request
- CPU, memory, and GPU utilization where applicable

Key questions:

- Can serving handle launch traffic?
- Do we have rollback capacity?
- Can LiteLLM route to fallback models?
- What happens if Ollama is unavailable?
- What happens if Postgres is unavailable?

MVP application:

The current stack runs locally with Docker Compose for LiteLLM and Postgres, and Ollama on the host machine. Live health checks are implemented for LiteLLM, Ollama, and Postgres. The next infrastructure step is adding latency history, request failure tracking, and fallback behavior.

### 9.3 Workstream 3: Safety and Trust

Purpose:

Reduce risks specific to coding model usage.

Coding-specific risks:

- Vulnerable code generation
- Secrets leakage
- License contamination
- Malware generation
- Prompt injection susceptibility
- Unsafe shell command suggestions
- Hallucinated APIs or dependencies
- Insecure authentication or database examples

Key questions:

- Have we red-teamed the model?
- What are known failure modes?
- Does the model generate insecure code?
- Does it expose or invent secrets?
- Does it comply with safe coding expectations?

MVP application:

The current MVP does not include automated safety checks. Before broader release, add a safety evaluation set covering insecure code, secrets, malware-like requests, and prompt injection.

### 9.4 Workstream 4: Product Readiness

Purpose:

Ensure the product surface is useful, understandable, and ready for users.

Questions:

- Which surfaces use the model?
- Web chat?
- IDE completion?
- Agent workflows?
- Which tasks should the product optimize for first?
- What documentation is required for setup and troubleshooting?

Metrics:

- Acceptance rate
- Retention
- User satisfaction
- Prompt success rate
- Conversation continuation rate
- Setup completion rate
- Error rate in the UI

MVP application:

The current product surface is a web chat UI with projects, persistent conversations, conversation controls, live health, model usage, and an external API panel. Continue setup is documented in `docs/continue-vscode.md`, and the local Continue config has been updated on the development machine.

## 10. Launch Gates

### Gate 1: Training or Model Selection Complete

Owner:

Research or model owner

Exit criteria:

- Model selected or training complete.
- Loss stabilized if training is involved.
- Model artifact available.
- Baseline benchmarks available.
- Model can be served through Ollama or target runtime.

Current MVP status:

Complete for local MVP. The selected model is `qwen2.5-coder:1.5b`.

### Gate 2: Quality Approval

Owner:

Model evaluation

Exit criteria:

- Coding benchmarks exceed baseline.
- Internal coding tasks pass defined thresholds.
- No major regressions in target languages.
- Known weaknesses documented.

Current MVP status:

Not complete. Manual prompting works, but formal quality evaluation is not yet built.

### Gate 3: Safety Approval

Owner:

Safety or security reviewer

Exit criteria:

- Red-team review complete.
- Security review complete.
- Known safety failure modes documented.
- Mitigations or refusals defined for high-risk coding requests.

Current MVP status:

Not complete. Safety review is deferred.

### Gate 4: Infrastructure Approval

Owner:

Serving/platform

Exit criteria:

- Capacity allocated.
- Load testing complete.
- Rollback validated.
- LiteLLM and Ollama health checks available.
- Failure modes tested.

Current MVP status:

Partially complete. Local serving works, Docker services are running, the app can call the model, and live health checks are implemented. Load testing and rollback validation are not complete.

### Gate 5: Product Approval

Owner:

Product

Exit criteria:

- User experience validated.
- Setup documentation ready.
- Error handling is clear.
- Conversation persistence works.
- Product surface matches target workflow.

Current MVP status:

Partially complete. The chat UI, persistence, projects, usage dashboard, external API panel, Continue setup documentation, and real status checks are implemented. Auth, formal evaluation, hosted deployment, and production monitoring are still pending.

### Gate 6: Launch Approval

Owner:

Cross-functional launch review

Exit criteria:

- Model quality approved.
- Safety approved.
- Infrastructure approved.
- Product approved.
- Rollout plan approved.
- Monitoring dashboard ready.
- Go / No-Go decision recorded.

Current MVP status:

Not complete. This gate applies to broader launch, not the local MVP.

## 11. Rollout Strategy

LaunchCodeModel should not launch to all users at once.

### Stage 1: Internal Dogfood

Audience:

Project owner and internal testers only.

Monitor:

- Prompt success rate
- Response usefulness
- Latency
- UI errors
- LiteLLM errors
- Ollama errors
- Postgres write failures

Exit criteria:

- Core workflows work reliably.
- No repeated model-serving failures.
- Known usability issues are documented.

### Stage 2: Canary

Audience:

Small trusted group or 1% of target users.

Monitor:

- Acceptance rate
- User complaints
- Cost
- Latency
- Error rate
- Safety escalations

Exit criteria:

- Metrics remain within thresholds.
- No critical safety or reliability issues.
- Rollback path is validated.

### Stage 3: Gradual Rollout

Recommended rollout sequence:

```text
1% -> 5% -> 25% -> 50% -> 100%
```

Each stage must have predefined success criteria.

### Stage 4: Full Launch

Launch only after:

- Quality gate passes.
- Safety gate passes.
- Infrastructure gate passes.
- Product gate passes.
- Monitoring dashboard is live.
- Rollback plan is tested.

## 12. Metrics Dashboard

The launch dashboard should include four groups of metrics.

### 12.1 Model Quality

- HumanEval
- SWE-bench
- MBPP
- LiveCodeBench
- Acceptance rate
- User satisfaction
- Code correctness
- Regression rate

### 12.2 Infrastructure

- P50 latency
- P95 latency
- Availability
- Error rate
- Throughput
- GPU utilization if applicable
- CPU and memory usage
- Cost per request
- LiteLLM health
- Ollama health
- Postgres health

### 12.3 Business and Product

- Active users
- Retention
- Engagement
- Conversation count
- Prompt count
- Repeat usage
- Setup completion
- Continue integration usage

### 12.4 Safety

- Harmful generations
- Vulnerable code generations
- Security incidents
- Escalations
- Prompt injection failures
- Secrets leakage incidents
- Malware-related attempts

## 13. Cost and Quality Tradeoff Plan

If a model performs better on benchmarks but costs 2x more to serve, evaluate:

- Quality gain
- Revenue impact
- User value
- Infrastructure cost
- Capacity constraints
- Latency impact
- Which users or tasks benefit most

Possible decisions:

- Launch to premium users first.
- Route only complex requests to the expensive model.
- Use hybrid model routing.
- Keep the small local model as the default.
- Delay full launch until optimization is complete.
- Use LiteLLM routing to compare providers or model tiers.

For LaunchCodeModel, LiteLLM is intentionally part of the architecture so future routing decisions can be made without rewriting the product UI.

## 14. Launch Day Incident Plan

If launch traffic is 3x expected and latency doubles:

1. Protect availability first.
2. Enable fallback routing if available.
3. Rate limit if necessary.
4. Shift traffic gradually.
5. Communicate status.
6. Investigate root cause.
7. Pause rollout if thresholds are exceeded.

For the current local MVP, this translates to:

- Detect LiteLLM or Ollama failures.
- Show clear errors in the UI.
- Avoid losing user prompts.
- Keep Postgres writes reliable.
- Add fallback or retry behavior only after persistence exists.

## 15. Functional Requirements

### FR1: Submit Coding Prompt

User can submit a coding prompt from the web UI.

Acceptance criteria:

- Prompt is sent to `/api/chat`.
- API route calls LiteLLM.
- LiteLLM routes to Ollama.
- Model response appears in the UI.

Status:

Complete.

### FR2: Persist Conversation

User conversations are saved to Postgres.

Acceptance criteria:

- New conversation row is created.
- User message is saved.
- Assistant response is saved.
- Conversation can be reopened.

Status:

Pending.

### FR3: View Conversation History

User can view and reopen previous conversations.

Acceptance criteria:

- Conversation list is visible.
- Selecting a conversation loads messages.
- Empty state is handled.

Status:

Pending.

### FR4: Runtime Health Status

User can see live health for LiteLLM, Ollama, and Postgres.

Acceptance criteria:

- LiteLLM status is checked server-side.
- Ollama status is checked server-side.
- Postgres status is checked server-side.
- UI shows healthy, degraded, or unavailable states.

Status:

Pending.

### FR5: Continue VS Code Integration

Developer can connect Continue to the same LiteLLM endpoint.

Acceptance criteria:

- Continue configuration is documented.
- Continue can send requests to `http://localhost:4000/v1`.
- Continue uses model `qwen2.5-coder-1.5b`.

Status:

Pending documentation/config commit.

## 16. Non-Functional Requirements

Reliability:

- Local services should restart unless stopped.
- API route should return clear errors when LiteLLM or Ollama is unavailable.

Performance:

- Local chat response should feel interactive for short coding prompts.
- P95 latency target should be defined after baseline measurement.

Security:

- LiteLLM key must stay server-side.
- Browser must not directly call LiteLLM with the API key.
- Future auth should protect user-specific conversations.

Maintainability:

- TypeScript should remain strict.
- ESLint should pass before changes are accepted.
- Database migrations should be generated and committed.

Observability:

- Basic request logs should be available during MVP.
- Metrics dashboard should be added before broader launch.

## 17. Open Decisions

- Should the product remain local-first or become a hosted multi-user product?
- Should Auth.js or Clerk be used for authentication?
- Should Continue configuration be committed as an example file?
- What benchmark suite should be used for the first model quality gate?
- What is the baseline model for quality comparison?
- What are acceptable latency and cost targets?
- Should LiteLLM and app data share one Postgres database, or should LiteLLM get a separate database?

## 18. Next Implementation Steps

Recommended next steps:

1. Persist chat conversations and messages to Postgres.
2. Add a conversation history sidebar.
3. Add live runtime health checks for LiteLLM, Ollama, and Postgres.
4. Add a `docs/continue-vscode.md` setup guide.
5. Add a small internal coding evaluation set.
6. Add basic request logging and model request metadata persistence.
7. Define the first internal dogfood launch gate.

## 19. Go / No-Go Checklist

Before broader launch, confirm:

- Model quality gate passed.
- Safety review passed.
- Infrastructure load test passed.
- Rollback plan tested.
- Product UX validated.
- Documentation ready.
- Monitoring dashboard live.
- Support and incident response owner assigned.
- Go / No-Go decision recorded.
