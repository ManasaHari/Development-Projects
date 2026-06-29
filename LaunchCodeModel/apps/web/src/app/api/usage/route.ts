import { desc, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { modelRequests } from "@/db/schema";

export async function GET() {
  const [summary] = await db
    .select({
      requestCount: sql<number>`count(*)::int`,
      promptTokens: sql<number>`coalesce(sum(${modelRequests.promptTokens}), 0)::int`,
      completionTokens: sql<number>`coalesce(sum(${modelRequests.completionTokens}), 0)::int`,
      totalTokens: sql<number>`coalesce(sum(${modelRequests.totalTokens}), 0)::int`,
    })
    .from(modelRequests);

  const recent = await db
    .select({
      id: modelRequests.id,
      conversationId: modelRequests.conversationId,
      model: modelRequests.model,
      promptTokens: modelRequests.promptTokens,
      completionTokens: modelRequests.completionTokens,
      totalTokens: modelRequests.totalTokens,
      createdAt: modelRequests.createdAt,
    })
    .from(modelRequests)
    .orderBy(desc(modelRequests.createdAt))
    .limit(8);

  return NextResponse.json({ summary, recent });
}
