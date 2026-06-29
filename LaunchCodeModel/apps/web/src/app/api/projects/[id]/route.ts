import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { conversations, projects } from "@/db/schema";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const body = (await request.json()) as { name?: string };
  const name = body.name?.trim();

  if (!name) {
    return NextResponse.json({ error: "Project name is required." }, { status: 400 });
  }

  const [project] = await db
    .update(projects)
    .set({
      name: name.length > 80 ? `${name.slice(0, 77)}...` : name,
      updatedAt: new Date(),
    })
    .where(eq(projects.id, id))
    .returning({
      id: projects.id,
      name: projects.name,
      createdAt: projects.createdAt,
      updatedAt: projects.updatedAt,
    });

  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  return NextResponse.json({ project });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  await db
    .update(conversations)
    .set({ projectId: null, updatedAt: new Date() })
    .where(eq(conversations.projectId, id));

  const [deleted] = await db
    .delete(projects)
    .where(eq(projects.id, id))
    .returning({ id: projects.id });

  if (!deleted) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
