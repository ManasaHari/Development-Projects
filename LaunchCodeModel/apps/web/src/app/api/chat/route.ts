import { NextResponse } from "next/server";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { conversations, messages as messagesTable, modelRequests } from "@/db/schema";
import { chatWithModel, model, type ModelMessage } from "@/lib/litellm";

type ChatRequest = {
  conversationId?: string;
  projectId?: string | null;
  messages?: ModelMessage[];
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ChatRequest;
    const conversationId = body.conversationId;
    const projectId = body.projectId ?? null;
    const messages = body.messages ?? [];

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "At least one message is required." }, { status: 400 });
    }

    const sanitizedMessages = messages
      .filter((message) => message.role === "user" || message.role === "assistant")
      .map((message) => ({
        role: message.role,
        content: String(message.content ?? "").trim(),
      }))
      .filter((message) => message.content.length > 0);

    if (sanitizedMessages.length === 0) {
      return NextResponse.json({ error: "Message content is required." }, { status: 400 });
    }

    const latestUserMessage = [...sanitizedMessages].reverse().find((message) => message.role === "user");
    if (!latestUserMessage) {
      return NextResponse.json({ error: "A user message is required." }, { status: 400 });
    }

    const activeConversationId =
      conversationId ?? (await createConversation(latestUserMessage.content, projectId));

    if (conversationId) {
      const [existingConversation] = await db
        .select({ id: conversations.id })
        .from(conversations)
        .where(eq(conversations.id, conversationId))
        .limit(1);

      if (!existingConversation) {
        return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
      }
    }

    await db.insert(messagesTable).values({
      conversationId: activeConversationId,
      role: "user",
      content: latestUserMessage.content,
    });

    const result = await chatWithModel(sanitizedMessages);

    await db.insert(messagesTable).values({
      conversationId: activeConversationId,
      role: "assistant",
      content: result.content,
    });

    await db.insert(modelRequests).values({
      conversationId: activeConversationId,
      model,
      promptTokens: result.usage.promptTokens,
      completionTokens: result.usage.completionTokens,
      totalTokens: result.usage.totalTokens,
    });

    await db
      .update(conversations)
      .set({ updatedAt: new Date() })
      .where(eq(conversations.id, activeConversationId));

    return NextResponse.json({ conversationId: activeConversationId, content: result.content });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected chat error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function createConversation(firstMessage: string, projectId: string | null) {
  const title = firstMessage.length > 60 ? `${firstMessage.slice(0, 57)}...` : firstMessage;
  const [conversation] = await db
    .insert(conversations)
    .values({ title, projectId })
    .returning({ id: conversations.id });

  return conversation.id;
}
