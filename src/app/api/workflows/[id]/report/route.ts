import { NextResponse } from "next/server";
import { WorkflowStatus } from "@prisma/client";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in to retrieve this report." }, { status: 401 });
  const { id } = await params;
  const workflow = await db.workflow.findFirst({
    where: { id, userId: session.user.id },
    select: { status: true, report: true, title: true },
  });
  if (!workflow) return NextResponse.json({ error: "Workflow not found." }, { status: 404 });
  if (workflow.status !== WorkflowStatus.SUCCEEDED || !workflow.report) {
    return NextResponse.json({ error: "The final report is not ready." }, { status: 409 });
  }
  return new Response(workflow.report, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${workflow.title.replace(/[^a-z0-9-_]/gi, "-").slice(0, 60)}.md"`,
      "Cache-Control": "private, no-store",
    },
  });
}