"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type ProjectSummary = {
  id: string;
  name: string;
  updatedAt: string;
};

type ConversationSummary = {
  id: string;
  projectId: string | null;
  title: string;
  updatedAt: string;
};

type UsageSummary = {
  requestCount: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
};

type UsageRequest = {
  id: string;
  model: string;
  totalTokens: number | null;
  createdAt: string;
};

type UsageResponse = {
  summary: UsageSummary;
  recent: UsageRequest[];
};

type HealthStatus = "healthy" | "degraded" | "unavailable" | "checking";

type ServiceHealth = {
  status: HealthStatus;
  detail: string;
  latencyMs?: number;
};

type HealthResponse = {
  overall: HealthStatus;
  checkedAt: string;
  services: {
    litellm: ServiceHealth;
    ollama: ServiceHealth;
    postgres: ServiceHealth;
  };
};

const emptyState =
  "Ask a coding question. Requests go through Next.js to LiteLLM, then to Ollama running qwen2.5-coder:1.5b. Messages are saved in Postgres.";

const checkingHealth: HealthResponse = {
  overall: "checking",
  checkedAt: "",
  services: {
    litellm: { status: "checking", detail: "Checking..." },
    ollama: { status: "checking", detail: "Checking..." },
    postgres: { status: "checking", detail: "Checking..." },
  },
};

const emptyUsage: UsageResponse = {
  summary: {
    requestCount: 0,
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
  },
  recent: [],
};

export default function Home() {
  const [activeView, setActiveView] = useState<"workspace" | "docs">("workspace");
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [newProjectName, setNewProjectName] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversationTitle, setConversationTitle] = useState("");
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [health, setHealth] = useState<HealthResponse>(checkingHealth);
  const [usage, setUsage] = useState<UsageResponse>(emptyUsage);
  const [error, setError] = useState<string | null>(null);

  const canSend = useMemo(() => prompt.trim().length > 0 && !isLoading, [isLoading, prompt]);
  const activeProject = projects.find((project) => project.id === projectId);

  useEffect(() => {
    void refreshProjects();
    void refreshConversations(null);
    void refreshUsage();
    void refreshHealth();

    const interval = window.setInterval(() => {
      void refreshHealth();
    }, 15000);

    return () => window.clearInterval(interval);
    // Initial dashboard load only; event handlers refresh scoped data after mutations.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refreshProjects() {
    const response = await fetch("/api/projects");
    const data = (await response.json()) as { projects?: ProjectSummary[] };
    setProjects(data.projects ?? []);
  }

  async function refreshConversations(nextProjectId = projectId) {
    const suffix = nextProjectId ? `?projectId=${nextProjectId}` : "";
    const response = await fetch(`/api/conversations${suffix}`);
    const data = (await response.json()) as { conversations?: ConversationSummary[] };
    setConversations(data.conversations ?? []);
  }

  async function refreshUsage() {
    const response = await fetch("/api/usage", { cache: "no-store" });
    const data = (await response.json()) as UsageResponse;
    setUsage(data);
  }

  async function refreshHealth() {
    try {
      const response = await fetch("/api/health", { cache: "no-store" });
      const data = (await response.json()) as HealthResponse;

      if (!response.ok) throw new Error("Health check failed.");
      setHealth(data);
    } catch {
      setHealth({
        overall: "unavailable",
        checkedAt: new Date().toISOString(),
        services: {
          litellm: { status: "unavailable", detail: "Health check failed" },
          ollama: { status: "unavailable", detail: "Health check failed" },
          postgres: { status: "unavailable", detail: "Health check failed" },
        },
      });
    }
  }

  async function createProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = newProjectName.trim();
    if (!name) return;

    const response = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = (await response.json()) as { project?: ProjectSummary; error?: string };

    if (!response.ok || !data.project) {
      setError(data.error ?? "Could not create project.");
      return;
    }

    setNewProjectName("");
    setProjectId(data.project.id);
    setConversationId(null);
    setConversationTitle("");
    setMessages([]);
    await refreshProjects();
    await refreshConversations(data.project.id);
  }

  async function renameProject() {
    if (!activeProject) return;
    const name = window.prompt("Rename project", activeProject.name)?.trim();
    if (!name) return;

    const response = await fetch(`/api/projects/${activeProject.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });

    if (!response.ok) {
      setError("Could not rename project.");
      return;
    }

    await refreshProjects();
  }

  async function deleteProject() {
    if (!activeProject) return;
    const confirmed = window.confirm(
      `Delete project "${activeProject.name}"? Conversations will be kept and moved to All Projects.`,
    );
    if (!confirmed) return;

    const response = await fetch(`/api/projects/${activeProject.id}`, { method: "DELETE" });
    if (!response.ok) {
      setError("Could not delete project.");
      return;
    }

    setProjectId(null);
    setConversationId(null);
    setConversationTitle("");
    setMessages([]);
    await refreshProjects();
    await refreshConversations(null);
  }

  async function selectProject(nextProjectId: string | null) {
    setProjectId(nextProjectId);
    setConversationId(null);
    setConversationTitle("");
    setMessages([]);
    await refreshConversations(nextProjectId);
  }

  async function loadConversation(id: string) {
    setIsLoadingHistory(true);
    setError(null);

    try {
      const response = await fetch(`/api/conversations/${id}`);
      const data = (await response.json()) as {
        conversation?: ConversationSummary;
        messages?: ChatMessage[];
        error?: string;
      };

      if (!response.ok || !data.conversation) {
        throw new Error(data.error ?? "Could not load conversation.");
      }

      setConversationId(id);
      setConversationTitle(data.conversation.title);
      setProjectId(data.conversation.projectId);
      setMessages(
        (data.messages ?? []).filter(
          (message) => message.role === "user" || message.role === "assistant",
        ),
      );
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load conversation.");
    } finally {
      setIsLoadingHistory(false);
    }
  }

  function startNewConversation() {
    setConversationId(null);
    setConversationTitle("");
    setMessages([]);
    setPrompt("");
    setError(null);
  }

  async function renameConversation() {
    if (!conversationId) return;
    const title = window.prompt("Rename conversation", conversationTitle)?.trim();
    if (!title) return;

    const response = await fetch(`/api/conversations/${conversationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });

    const data = (await response.json()) as { conversation?: ConversationSummary; error?: string };
    if (!response.ok || !data.conversation) {
      setError(data.error ?? "Could not rename conversation.");
      return;
    }

    setConversationTitle(data.conversation.title);
    await refreshConversations(projectId);
  }

  async function deleteConversation() {
    if (!conversationId) return;
    const confirmed = window.confirm("Delete this conversation?");
    if (!confirmed) return;

    const response = await fetch(`/api/conversations/${conversationId}`, { method: "DELETE" });
    if (!response.ok) {
      setError("Could not delete conversation.");
      return;
    }

    startNewConversation();
    await refreshConversations(projectId);
    await refreshUsage();
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const content = prompt.trim();
    if (!content) return;

    const previousMessages = messages;
    const nextMessages: ChatMessage[] = [...messages, { role: "user", content }];
    setMessages(nextMessages);
    setPrompt("");
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, projectId, messages: nextMessages }),
      });

      const data = (await response.json()) as {
        conversationId?: string;
        content?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "The model request failed.");
      }

      if (data.conversationId) {
        setConversationId(data.conversationId);
        if (!conversationTitle) {
          setConversationTitle(content.length > 60 ? `${content.slice(0, 57)}...` : content);
        }
      }

      setMessages((current) => [
        ...current,
        { role: "assistant", content: data.content ?? "" },
      ]);
      await refreshConversations(projectId);
      await refreshUsage();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "The model request failed.");
      setMessages(previousMessages);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f7f2] text-[#202124]">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-3 sm:px-6">
        <header className="border-b border-[#d8d8d0] pb-3">
          <p className="text-sm font-medium uppercase tracking-[0.12em] text-[#5f6f52]">
            Local AI Coding Runtime
          </p>
          <div className="mt-1 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-normal text-[#1f2933] sm:text-4xl">
                LaunchCodeModel
              </h1>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-[#52605d]">
                A local-first coding assistant powered by Next.js, LiteLLM, Ollama,
                Postgres, and qwen2.5-coder:1.5b.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <Status label="LiteLLM" service={health.services.litellm} />
              <Status label="Ollama" service={health.services.ollama} />
              <Status label="Postgres" service={health.services.postgres} />
            </div>
          </div>
          <nav className="mt-3 flex flex-wrap gap-2">
            <button
              className={`rounded-md border px-4 py-2 text-sm font-semibold transition ${
                activeView === "workspace"
                  ? "border-[#1f4d3a] bg-[#1f4d3a] text-white"
                  : "border-[#cfd6cf] bg-white text-[#1f4d3a] hover:bg-[#f0f3ed]"
              }`}
              type="button"
              onClick={() => setActiveView("workspace")}
            >
              Workspace
            </button>
            <button
              className={`rounded-md border px-4 py-2 text-sm font-semibold transition ${
                activeView === "docs"
                  ? "border-[#1f4d3a] bg-[#1f4d3a] text-white"
                  : "border-[#cfd6cf] bg-white text-[#1f4d3a] hover:bg-[#f0f3ed]"
              }`}
              type="button"
              onClick={() => setActiveView("docs")}
            >
              Technical Docs
            </button>
          </nav>
        </header>

        {activeView === "workspace" ? (
        <section className="grid min-h-0 flex-1 gap-4 py-3 lg:h-[calc(100vh-190px)] lg:grid-cols-[290px_1fr_310px]">
          <aside className="flex min-h-[560px] flex-col rounded-lg border border-[#d8d8d0] bg-white lg:min-h-0">
            <div className="border-b border-[#e4e4dd] p-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-[#1f2933]">Projects</h2>
                <button
                  className="text-xs font-semibold text-[#1f4d3a]"
                  type="button"
                  onClick={() => void selectProject(null)}
                >
                  All
                </button>
              </div>
              <form className="mt-3 flex gap-2" onSubmit={createProject}>
                <input
                  className="min-w-0 flex-1 rounded-md border border-[#cfd6cf] px-2 py-1.5 text-sm outline-none ring-[#4f7f5f] focus:ring-2"
                  value={newProjectName}
                  onChange={(event) => setNewProjectName(event.target.value)}
                  placeholder="New project"
                />
                <button
                  className="rounded-md bg-[#1f4d3a] px-3 py-1.5 text-xs font-semibold text-white disabled:bg-[#9ca8a0]"
                  type="submit"
                  disabled={!newProjectName.trim()}
                >
                  Add
                </button>
              </form>
              <div className="mt-3 max-h-40 space-y-1 overflow-y-auto">
                <ProjectButton
                  active={projectId === null}
                  name="All Projects"
                  onClick={() => void selectProject(null)}
                />
                {projects.map((project) => (
                  <ProjectButton
                    key={project.id}
                    active={project.id === projectId}
                    name={project.name}
                    onClick={() => void selectProject(project.id)}
                  />
                ))}
              </div>
              {activeProject ? (
                <div className="mt-3 flex gap-2">
                  <button
                    className="rounded-md border border-[#cfd6cf] px-2 py-1 text-xs font-semibold text-[#1f4d3a]"
                    type="button"
                    onClick={() => void renameProject()}
                  >
                    Rename
                  </button>
                  <button
                    className="rounded-md border border-[#f0c7c1] px-2 py-1 text-xs font-semibold text-[#9b1c1c]"
                    type="button"
                    onClick={() => void deleteProject()}
                  >
                    Delete
                  </button>
                </div>
              ) : null}
            </div>

            <div className="flex items-center justify-between border-b border-[#e4e4dd] px-4 py-3">
              <h2 className="text-sm font-semibold text-[#1f2933]">Conversations</h2>
              <button
                className="rounded-md border border-[#cfd6cf] px-3 py-1.5 text-xs font-semibold text-[#1f4d3a] transition hover:bg-[#f0f3ed]"
                type="button"
                onClick={startNewConversation}
              >
                New
              </button>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto p-3">
              {conversations.length === 0 ? (
                <p className="px-1 py-2 text-sm leading-6 text-[#6c766f]">
                  No saved conversations here yet.
                </p>
              ) : null}
              {conversations.map((conversation) => (
                <button
                  key={conversation.id}
                  className={`block w-full rounded-md px-3 py-2 text-left transition ${
                    conversation.id === conversationId
                      ? "bg-[#e8efe6] text-[#1f4d3a]"
                      : "text-[#52605d] hover:bg-[#f7f7f2]"
                  }`}
                  type="button"
                  onClick={() => void loadConversation(conversation.id)}
                >
                  <span className="block truncate text-sm font-semibold">
                    {conversation.title}
                  </span>
                  <span className="mt-1 block text-xs text-[#7a837d]">
                    {formatDate(conversation.updatedAt)}
                  </span>
                </button>
              ))}
            </div>
          </aside>

          <div className="flex min-h-[560px] flex-col overflow-hidden rounded-lg border border-[#d8d8d0] bg-white lg:min-h-0">
            <div className="flex items-center justify-between gap-3 border-b border-[#e4e4dd] px-4 py-3">
              <div className="min-w-0">
                <h2 className="truncate text-sm font-semibold text-[#1f2933]">
                  {conversationTitle || "Model Chat"}
                </h2>
                <p className="mt-1 text-xs text-[#6c766f]">
                  {activeProject?.name ?? "All Projects"} ·{" "}
                  {conversationId ? conversationId.slice(0, 8) : "new chat"}
                </p>
              </div>
              {conversationId ? (
                <div className="flex shrink-0 gap-2">
                  <button
                    className="rounded-md border border-[#cfd6cf] px-2.5 py-1.5 text-xs font-semibold text-[#1f4d3a]"
                    type="button"
                    onClick={() => void renameConversation()}
                  >
                    Rename
                  </button>
                  <button
                    className="rounded-md border border-[#f0c7c1] px-2.5 py-1.5 text-xs font-semibold text-[#9b1c1c]"
                    type="button"
                    onClick={() => void deleteConversation()}
                  >
                    Delete
                  </button>
                </div>
              ) : null}
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
              {messages.length === 0 ? (
                <article className="mr-auto max-w-[84%] rounded-lg border border-[#e4e4dd] bg-[#fafaf7] px-4 py-3 text-sm leading-6 text-[#52605d]">
                  {isLoadingHistory ? "Loading conversation..." : emptyState}
                </article>
              ) : null}
              {messages.map((message, index) => (
                <article
                  key={`${message.role}-${index}`}
                  className={`max-w-[84%] rounded-lg px-4 py-3 text-sm leading-6 ${
                    message.role === "user"
                      ? "ml-auto bg-[#1f4d3a] text-white"
                      : "mr-auto border border-[#e4e4dd] bg-[#fafaf7] text-[#26312f]"
                  }`}
                >
                  <p className="mb-1 text-xs font-semibold uppercase tracking-[0.08em] opacity-70">
                    {message.role}
                  </p>
                  <div className="whitespace-pre-wrap">{message.content}</div>
                </article>
              ))}
              {isLoading ? (
                <article className="mr-auto max-w-[84%] rounded-lg border border-[#e4e4dd] bg-[#fafaf7] px-4 py-3 text-sm text-[#52605d]">
                  Thinking...
                </article>
              ) : null}
            </div>

            <form onSubmit={sendMessage} className="border-t border-[#e4e4dd] p-4">
              {error ? (
                <p className="mb-3 rounded-md border border-[#f0c7c1] bg-[#fff5f3] px-3 py-2 text-sm text-[#9b1c1c]">
                  {error}
                </p>
              ) : null}
              <div className="flex flex-col gap-3 sm:flex-row">
                <textarea
                  className="min-h-24 flex-1 resize-none rounded-md border border-[#cfd6cf] bg-white px-3 py-2 text-sm leading-6 outline-none ring-[#4f7f5f] transition focus:ring-2"
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  placeholder="Example: Write a TypeScript function that validates an email address."
                />
                <button
                  className="h-11 rounded-md bg-[#1f4d3a] px-5 text-sm font-semibold text-white transition hover:bg-[#183d2e] disabled:cursor-not-allowed disabled:bg-[#9ca8a0]"
                  type="submit"
                  disabled={!canSend}
                >
                  Send
                </button>
              </div>
            </form>
          </div>

          <aside className="min-h-0 space-y-3 overflow-y-auto pr-1">
            <Panel title="Runtime Path">
              <ol className="space-y-2 text-sm leading-6 text-[#52605d]">
                <li>1. Browser submits prompt to Next.js.</li>
                <li>2. API route saves messages in Postgres.</li>
                <li>3. API route calls LiteLLM.</li>
                <li>4. LiteLLM routes to Ollama.</li>
              </ol>
            </Panel>
            <Panel title="Model Usage">
              <div className="grid grid-cols-2 gap-2">
                <Metric label="Requests" value={usage.summary.requestCount} />
                <Metric label="Tokens" value={usage.summary.totalTokens} />
                <Metric label="Prompt" value={usage.summary.promptTokens} />
                <Metric label="Completion" value={usage.summary.completionTokens} />
              </div>
              <div className="mt-3 space-y-2">
                {usage.recent.slice(0, 3).map((request) => (
                  <div key={request.id} className="rounded-md bg-[#fafaf7] px-3 py-2">
                    <p className="truncate font-mono text-xs text-[#1f2933]">{request.model}</p>
                    <p className="mt-1 text-xs text-[#6c766f]">
                      {request.totalTokens ?? 0} tokens · {formatDate(request.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            </Panel>
            <Panel title="External API">
              <dl className="space-y-3 text-sm">
                <Info label="Base URL" value="http://localhost:4000/v1" />
                <Info label="Chat endpoint" value="/chat/completions" />
                <Info label="API key" value="Set in LITELLM_API_KEY" />
              </dl>
              <div className="mt-4 rounded-md border border-[#d8d8d0] bg-[#fafaf7] p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-[#6c766f]">
                  Example
                </p>
                <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-xs leading-5 text-[#26312f]">
{`curl http://localhost:4000/v1/chat/completions \\
  -H "Authorization: Bearer <your-local-api-key>" \\
  -H "Content-Type: application/json" \\
  -d '{"model":"qwen2.5-coder-1.5b","messages":[{"role":"user","content":"Write a hello world function in TypeScript"}]}'`}
                </pre>
              </div>
              <p className="mt-3 text-xs leading-5 text-[#6c766f]">
                Local development key only. In production, issue separate keys per user or app.
              </p>
            </Panel>
            <Panel title="Current Model">
              <dl className="space-y-3 text-sm">
                <Info label="App model name" value="qwen2.5-coder-1.5b" />
                <Info label="Ollama model" value="qwen2.5-coder:1.5b" />
                <Info label="Provider" value="LiteLLM Proxy" />
              </dl>
            </Panel>
          </aside>
        </section>
        ) : null}
        {activeView === "docs" ? (
        <section className="my-5 flex flex-col rounded-lg border border-[#d8d8d0] bg-white p-5">
          <div className="flex flex-col gap-2 border-b border-[#e4e4dd] pb-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#5f6f52]">
                Technical Docs
              </p>
              <h2 className="mt-1 text-xl font-semibold text-[#1f2933]">
                How to use this page
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-[#52605d]">
              This interface is a local coding assistant console. It manages project-scoped
              chats, sends prompts through LiteLLM to Ollama, and records usage in Postgres.
            </p>
          </div>

          <div className="order-2 mt-5 rounded-lg border border-[#e4e4dd] bg-[#fafaf7] p-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
              <div>
                <h3 className="text-sm font-semibold text-[#1f2933]">Competitive Study</h3>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-[#52605d]">
                  Planning snapshot for positioning LaunchCodeModel against hosted coding
                  models. These values are supplied comparison inputs and should be revalidated
                  before model-selection or launch-gate decisions.
                </p>
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#6c766f]">
                Launch reference
              </p>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[1120px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-[#d8d8d0] text-xs uppercase tracking-[0.08em] text-[#6c766f]">
                    <th className="py-2 pr-4 font-semibold">Model</th>
                    <th className="py-2 pr-4 font-semibold">Quality Tier</th>
                    <th className="py-2 pr-4 font-semibold">SWE-Bench</th>
                    <th className="py-2 pr-4 font-semibold">Model Size</th>
                    <th className="py-2 pr-4 font-semibold">Input $/1M</th>
                    <th className="py-2 pr-4 font-semibold">Output $/1M</th>
                    <th className="py-2 pr-4 font-semibold">Speed</th>
                    <th className="py-2 font-semibold">Launch Recommendation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e4e4dd] text-[#26312f]">
                  {[
                    [
                      "Claude Opus 4.5",
                      "A+",
                      "~79%",
                      "Undisclosed",
                      "$5",
                      "$25",
                      "Medium",
                      "Premium coding, agents, difficult repos",
                    ],
                    [
                      "Claude Sonnet 4.5/4.6",
                      "A",
                      "~77-80%",
                      "Undisclosed",
                      "$3",
                      "$15",
                      "Medium-Fast",
                      "Default production coding model",
                    ],
                    [
                      "GPT-5",
                      "A",
                      "~74%",
                      "Undisclosed",
                      "$5",
                      "$30",
                      "Fast",
                      "Broad deployment",
                    ],
                    [
                      "GPT-5 Codex",
                      "A",
                      "Strong code specialization",
                      "Undisclosed",
                      "~$1.75-$3",
                      "~$14-$15",
                      "Fast",
                      "IDE workflows, coding assistants",
                    ],
                    [
                      "Gemini 2.5 Pro",
                      "A-",
                      "~67%",
                      "Undisclosed",
                      "~$1.25-$2",
                      "~$10-$12",
                      "Fast",
                      "Long-context codebases",
                    ],
                    [
                      "Gemini 2.5 Flash",
                      "B+",
                      "~50%",
                      "Undisclosed",
                      "~$0.30",
                      "~$2.50",
                      "Very Fast",
                      "High-volume traffic",
                    ],
                    [
                      "DeepSeek V3",
                      "B",
                      "~53%",
                      "~685B MoE",
                      "~$0.28-$0.44",
                      "~$0.42-$0.87",
                      "Fast",
                      "Cost-sensitive deployments",
                    ],
                    [
                      "DeepSeek R1",
                      "B+",
                      "Strong reasoning",
                      "~671B MoE",
                      "~$0.55",
                      "~$2.19",
                      "Medium",
                      "Reasoning-heavy coding",
                    ],
                    [
                      "Grok 4",
                      "B+/A-",
                      "~64%",
                      "Undisclosed",
                      "~$1-$3",
                      "~$3-$15",
                      "Fast",
                      "General assistant with coding",
                    ],
                    [
                      "Qwen3 Coder",
                      "B",
                      "Strong open model",
                      "32B-235B variants",
                      "Self-hosted",
                      "Self-hosted",
                      "Depends on infra",
                      "Enterprise self-hosting",
                    ],
                  ].map(
                    ([
                      modelName,
                      tier,
                      sweBench,
                      size,
                      inputPrice,
                      outputPrice,
                      speed,
                      recommendation,
                    ]) => (
                    <tr key={modelName}>
                      <td className="py-2 pr-4 font-semibold text-[#1f2933]">{modelName}</td>
                      <td className="py-2 pr-4">{tier}</td>
                      <td className="py-2 pr-4 font-mono">{sweBench}</td>
                      <td className="py-2 pr-4">{size}</td>
                      <td className="py-2 pr-4 font-mono">{inputPrice}</td>
                      <td className="py-2 pr-4 font-mono">{outputPrice}</td>
                      <td className="py-2 pr-4">{speed}</td>
                      <td className="py-2">{recommendation}</td>
                    </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
            <div className="mt-4 rounded-md border border-[#d8d8d0] bg-white p-3 text-sm leading-6 text-[#52605d]">
              <p>
                LaunchCodeModel currently uses <strong>qwen2.5-coder:1.5b</strong>, a small
                local development model rather than a frontier hosted model. Its expected
                advantage is local control, low cost, privacy, and fast iteration; its expected
                weakness is lower coding quality on complex, multi-file, or agentic tasks.
              </p>
            </div>
          </div>

          <div className="order-1 mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <DocCard title="1. Check Runtime Health">
              <p>
                Use the top-right status boxes before sending prompts. Healthy means the app can
                reach the service; degraded or unavailable means requests may fail.
              </p>
              <ul>
                <li>LiteLLM routes API traffic on port 4000.</li>
                <li>Ollama hosts the local model on port 11434.</li>
                <li>Postgres stores projects, conversations, and usage on port 5432.</li>
              </ul>
            </DocCard>

            <DocCard title="2. Organize Work by Project">
              <p>
                Create a project from the left panel when you want to group related coding
                conversations. Selecting a project filters the conversation list.
              </p>
              <ul>
                <li>Use Add to create a project.</li>
                <li>Use Rename or Delete when a project is selected.</li>
                <li>Deleting a project keeps its conversations and moves them back to All Projects.</li>
              </ul>
            </DocCard>

            <DocCard title="3. Chat With the Model">
              <p>
                Type a coding question in the center chat box. The app saves your prompt and the
                model response in Postgres, then refreshes the conversation list and usage panel.
              </p>
              <ul>
                <li>New starts a fresh conversation.</li>
                <li>Rename updates the active conversation title.</li>
                <li>Delete removes the active conversation and its saved messages.</li>
              </ul>
            </DocCard>

            <DocCard title="4. Understand Model Usage">
              <p>
                The usage panel counts model calls and tokens returned by LiteLLM. Tokens are text
                chunks used by the model, not exact words.
              </p>
              <ul>
                <li>Requests is the number of saved model calls.</li>
                <li>Prompt tokens are input tokens.</li>
                <li>Completion tokens are output tokens.</li>
              </ul>
            </DocCard>

            <DocCard title="5. Use the External API">
              <p>
                Other local tools can call the OpenAI-compatible LiteLLM endpoint directly.
                Use the External API panel values when configuring clients.
              </p>
              <pre>{`Base URL: http://localhost:4000/v1
Model: qwen2.5-coder-1.5b
API key: use your LITELLM_API_KEY value`}</pre>
            </DocCard>

            <DocCard title="6. Connect VS Code">
              <p>
                Continue should use the same LiteLLM endpoint so VS Code and the web app share the
                same local model route.
              </p>
              <ul>
                <li>Provider: OpenAI-compatible.</li>
                <li>Base URL: http://localhost:4000/v1.</li>
                <li>Model: qwen2.5-coder-1.5b.</li>
              </ul>
            </DocCard>

            <DocCard title="Model Boundaries">
              <p>
                The web app can generate, explain, and debug code you paste into chat. It does not
                read local files, edit files on disk, run commands, or inspect your repo unless a
                client such as Continue sends that context.
              </p>
            </DocCard>

            <DocCard title="Troubleshooting">
              <p>
                If chat fails, check health first. Then verify Docker, Ollama, and the model list
                from your terminal.
              </p>
              <pre>{`docker compose -f infra/docker-compose.yml ps
ollama list
curl http://localhost:3000/api/health`}</pre>
            </DocCard>
          </div>
        </section>
        ) : null}
        <footer className="border-t border-[#d8d8d0] py-2 text-center text-xs text-[#6c766f]">
          Copyright 2026. Created by Manasa Hari. June 25, 2026.
        </footer>
      </div>
    </main>
  );
}

function ProjectButton({
  active,
  name,
  onClick,
}: {
  active: boolean;
  name: string;
  onClick: () => void;
}) {
  return (
    <button
      className={`block w-full truncate rounded-md px-3 py-2 text-left text-sm font-semibold transition ${
        active ? "bg-[#e8efe6] text-[#1f4d3a]" : "text-[#52605d] hover:bg-[#f7f7f2]"
      }`}
      type="button"
      onClick={onClick}
    >
      {name}
    </button>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-[#d8d8d0] bg-[#fafaf7] px-3 py-2">
      <p className="text-xs text-[#6c766f]">{label}</p>
      <p className="mt-1 font-mono text-lg font-semibold text-[#1f2933]">
        {new Intl.NumberFormat().format(value)}
      </p>
    </div>
  );
}

function Status({ label, service }: { label: string; service: ServiceHealth }) {
  const styles = {
    healthy: "border-[#b8d7bf] bg-[#f2faf3] text-[#1f6b3a]",
    degraded: "border-[#ead79c] bg-[#fff9e6] text-[#7a5a00]",
    unavailable: "border-[#efc1ba] bg-[#fff4f2] text-[#9b1c1c]",
    checking: "border-[#d8d8d0] bg-white text-[#6c766f]",
  }[service.status];

  return (
    <div className={`rounded-md border px-3 py-2 ${styles}`} title={service.detail}>
      <p className="text-xs text-[#6c766f]">{label}</p>
      <p className="text-sm font-semibold capitalize">{service.status}</p>
      <p className="mt-0.5 font-mono text-[11px]">
        {service.latencyMs !== undefined ? `${service.latencyMs}ms` : "--"}
      </p>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-[#d8d8d0] bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold text-[#1f2933]">{title}</h2>
      {children}
    </section>
  );
}

function DocCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <article className="rounded-lg border border-[#e4e4dd] bg-[#fafaf7] p-4 text-sm leading-6 text-[#52605d]">
      <h3 className="mb-2 text-sm font-semibold text-[#1f2933]">{title}</h3>
      <div className="space-y-2 [&_li]:ml-4 [&_li]:list-disc [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-white [&_pre]:p-3 [&_pre]:font-mono [&_pre]:text-xs [&_pre]:leading-5 [&_pre]:text-[#26312f]">
        {children}
      </div>
    </article>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-[0.08em] text-[#6c766f]">
        {label}
      </dt>
      <dd className="mt-1 break-words font-mono text-sm text-[#1f2933]">{value}</dd>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}
