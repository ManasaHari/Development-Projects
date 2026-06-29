import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { conversations, messages, modelRequests } from "@/db/schema";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  const [conversation] = await db
    .select({
      id: conversations.id,
      projectId: conversations.projectId,
      title: conversations.title,
      createdAt: conversations.createdAt,
      updatedAt: conversations.updatedAt,
    })
    .from(conversations)
    .where(eq(conversations.id, id))
    .limit(1);

  if (!conversation) {
    return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  }

  const rows = await db
    .select({
      id: messages.id,
      role: messages.role,
      content: messages.content,
      createdAt: messages.createdAt,
    })
    .from(messages)
    .where(eq(messages.conversationId, id))
    .orderBy(messages.createdAt);

  return NextResponse.json({ conversation, messages: rows });
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const body = (await request.json()) as {
    title?: string;
    projectId?: string | null;
  };

  const title = body.title?.trim();
  const updates: {
    title?: string;
    projectId?: string | null;
    updatedAt: Date;
  } = {
    updatedAt: new Date(),
  };

  if (title !== undefined) {
    if (title.length === 0) {
      return NextResponse.json({ error: "Title is required." }, { status: 400 });
    }

    updates.title = title.length > 80 ? `${title.slice(0, 77)}...` : title;
  }

  if ("projectId" in body) {
    updates.projectId = body.projectId ?? null;
  }

  const [conversation] = await db
    .update(conversations)
    .set(updates)
    .where(eq(conversations.id, id))
    .returning({
      id: conversations.id,
      projectId: conversations.projectId,
      title: conversations.title,
      createdAt: conversations.createdAt,
      updatedAt: conversations.updatedAt,
    });

  if (!conversation) {
    return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  }

  return NextResponse.json({ conversation });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  await db.delete(modelRequests).where(eq(modelRequests.conversationId, id));
  await db.delete(messages).where(eq(messages.conversationId, id));
  const [deleted] = await db
    .delete(conversations)
    .where(eq(conversations.id, id))
    .returning({ id: conversations.id });

  if (!deleted) {
    return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
