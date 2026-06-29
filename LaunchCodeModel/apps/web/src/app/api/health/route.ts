import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { apiKey, baseUrl } from "@/lib/litellm";

type HealthState = "healthy" | "degraded" | "unavailable";

type ServiceHealth = {
  status: HealthState;
  detail: string;
  latencyMs?: number;
};

const ollamaBaseUrl = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";

export async function GET() {
  const [litellm, ollama, postgres] = await Promise.all([
    checkHttp(`${baseUrl}/v1/models`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      okDetail: "Models endpoint reachable",
    }),
    checkHttp(`${ollamaBaseUrl}/api/tags`, {
      okDetail: "Model runtime reachable",
    }),
    checkPostgres(),
  ]);

  const statuses = [litellm.status, ollama.status, postgres.status];
  const overall: HealthState = statuses.every((status) => status === "healthy")
    ? "healthy"
    : statuses.some((status) => status === "healthy")
      ? "degraded"
      : "unavailable";

  return NextResponse.json({
    overall,
    checkedAt: new Date().toISOString(),
    services: {
      litellm,
      ollama,
      postgres,
    },
  });
}

async function checkHttp(
  url: string,
  options: {
    headers?: HeadersInit;
    okDetail: string;
  },
): Promise<ServiceHealth> {
  const startedAt = performance.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2500);

  try {
    const response = await fetch(url, {
      cache: "no-store",
      headers: options.headers,
      signal: controller.signal,
    });
    const latencyMs = Math.round(performance.now() - startedAt);

    if (!response.ok) {
      return {
        status: response.status >= 500 ? "unavailable" : "degraded",
        detail: `HTTP ${response.status}`,
        latencyMs,
      };
    }

    return {
      status: "healthy",
      detail: options.okDetail,
      latencyMs,
    };
  } catch (error) {
    return {
      status: "unavailable",
      detail: error instanceof Error ? error.message : "Request failed",
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function checkPostgres(): Promise<ServiceHealth> {
  const startedAt = performance.now();

  try {
    await db.execute(sql`select 1`);

    return {
      status: "healthy",
      detail: "Database query succeeded",
      latencyMs: Math.round(performance.now() - startedAt),
    };
  } catch (error) {
    return {
      status: "unavailable",
      detail: error instanceof Error ? error.message : "Database query failed",
    };
  }
}
