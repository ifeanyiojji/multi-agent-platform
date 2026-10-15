import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in to view this workflow." }, { status: 401 });
  const { id } = await params;
  const workflow = await db.workflow.findFirst({
    where: { id, userId: session.user.id },
    include: {
      tasks: { select: { agentKey: true, name: true, status: true, attempts: true, tokenCount: true, costUsd: true, startedAt: true, completedAt: true, output: true } },
      events: { orderBy: { createdAt: "asc" }, select: { id: true, type: true, agentKey: true, message: true, createdAt: true } },
    },
  });
  if (!workflow) return NextResponse.json({ error: "Workflow not found." }, { status: 404 });
  return NextResponse.json({ workflow });
}