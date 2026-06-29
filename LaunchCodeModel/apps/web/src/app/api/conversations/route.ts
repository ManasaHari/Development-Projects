import { desc, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { conversations } from "@/db/schema";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");
  const baseQuery = db
    .select({
      id: conversations.id,
      projectId: conversations.projectId,
      title: conversations.title,
      createdAt: conversations.createdAt,
      updatedAt: conversations.updatedAt,
    })
    .from(conversations);

  const rows =
    projectId === "none"
      ? await baseQuery
          .where(isNull(conversations.projectId))
          .orderBy(desc(conversations.updatedAt))
          .limit(50)
      : projectId
        ? await baseQuery
            .where(eq(conversations.projectId, projectId))
            .orderBy(desc(conversations.updatedAt))
            .limit(50)
        : await baseQuery.orderBy(desc(conversations.updatedAt)).limit(50);

  return NextResponse.json({ conversations: rows });
}
