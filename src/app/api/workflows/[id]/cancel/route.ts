import { WorkflowStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in to cancel a workflow." }, { status: 401 });
  const { id } = await params;
  const result = await db.workflow.updateMany({
    where: { id, userId: session.user.id, status: { in: [WorkflowStatus.QUEUED, WorkflowStatus.RUNNING] } },
    data: { status: WorkflowStatus.CANCELLED, completedAt: new Date() },
  });
  if (!result.count) return NextResponse.json({ error: "Workflow is not active or was not found." }, { status: 409 });
  await db.workflowEvent.create({
    data: { workflowId: id, type: "workflow.cancelled", message: "Cancellation requested; no new agent steps will start." },
  });
  return NextResponse.json({ cancelled: true });
}