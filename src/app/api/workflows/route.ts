import { Prisma, WorkflowStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { inngest } from "@/lib/inngest/client";
import { db } from "@/lib/db";
import { readBoundedJson, RequestBodyTooLargeError } from "@/lib/http";
import { AGENTS } from "@/lib/workflows/definitions";
import { workflowRequestSchema } from "@/lib/workflows/schemas";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in to view workflows." }, { status: 401 });

  const ownerWhere = { userId: session.user.id };
  const url = new URL(request.url);
  const limitValue = Number(url.searchParams.get("limit") ?? 25);
  const limit = Number.isFinite(limitValue) ? Math.min(50, Math.max(1, Math.floor(limitValue))) : 25;
  const search = url.searchParams.get("search")?.trim().slice(0, 100) ?? "";
  const requestedStatus = url.searchParams.get("status")?.toUpperCase();
  if (requestedStatus && requestedStatus !== "ALL" && !Object.values(WorkflowStatus).includes(requestedStatus as WorkflowStatus)) {
    return NextResponse.json({ error: "Invalid workflow status filter." }, { status: 400 });
  }
  const where: Prisma.WorkflowWhereInput = {
    ...ownerWhere,
    ...(search ? { title: { contains: search, mode: "insensitive" } } : {}),
    ...(requestedStatus && requestedStatus !== "ALL" ? { status: requestedStatus as WorkflowStatus } : {}),
  };
  const cursor = url.searchParams.get("cursor") ?? undefined;
  const cursorRecord = cursor
    ? await db.workflow.findFirst({ where: { ...where, id: cursor }, select: { id: true } })
    : null;
  if (cursor && !cursorRecord) return NextResponse.json({ error: "Invalid workflow cursor." }, { status: 400 });

  const weekStart = new Date();
  weekStart.setUTCHours(0, 0, 0, 0);
  weekStart.setUTCDate(weekStart.getUTCDate() - 6);
  const [page, totals, running, succeeded, failed, daily] = await Promise.all([
    db.workflow.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursorRecord ? { cursor: { id: cursorRecord.id }, skip: 1 } : {}),
      select: {
        id: true,
        title: true,
        status: true,
        totalTokens: true,
        estimatedCostUsd: true,
        createdAt: true,
        completedAt: true,
        _count: { select: { tasks: true } },
      },
    }),
    db.workflow.aggregate({ where: ownerWhere, _count: { _all: true }, _sum: { totalTokens: true, estimatedCostUsd: true } }),
    db.workflow.count({ where: { ...ownerWhere, status: { in: [WorkflowStatus.QUEUED, WorkflowStatus.RUNNING] } } }),
    db.workflow.count({ where: { ...ownerWhere, status: WorkflowStatus.SUCCEEDED } }),
    db.workflow.count({ where: { ...ownerWhere, status: WorkflowStatus.FAILED } }),
    db.$queryRaw<Array<{ day: string; count: number }>>`
      SELECT to_char(date_trunc('day', "createdAt"), 'YYYY-MM-DD') AS day, COUNT(*)::int AS count
      FROM "Workflow"
      WHERE "userId" = ${session.user.id} AND "createdAt" >= ${weekStart}
      GROUP BY 1 ORDER BY 1
    `,
  ]);
  const finished = succeeded + failed;
  const workflows = page.slice(0, limit);
  const nextCursor = page.length > limit ? workflows.at(-1)?.id ?? null : null;
  const activity = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setUTCDate(date.getUTCDate() + index);
    const day = date.toISOString().slice(0, 10);
    return { day, count: daily.find((entry) => entry.day === day)?.count ?? 0 };
  });

  return NextResponse.json({
    workflows,
    nextCursor,
    activity,
    analytics: {
      total: totals._count._all,
      running,
      successRate: finished ? Math.round((succeeded / finished) * 100) : null,
      totalTokens: totals._sum.totalTokens ?? 0,
      estimatedCostUsd: totals._sum.estimatedCostUsd ?? 0,
    },
  });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in to start a workflow." }, { status: 401 });
  if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error: "AI execution is not configured." }, { status: 503 });

  let body: unknown;
  try {
    body = await readBoundedJson(request, 40_000);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json({ error: "Request payload is too large." }, { status: 413 });
    }
    return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
  }
  const parsed = workflowRequestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Enter a task between 20 and 8,000 characters." }, { status: 400 });

  let workflow;
  try {
    workflow = await db.$transaction(async (transaction) => {
      const active = await transaction.workflow.count({
        where: { userId: session.user.id, status: { in: [WorkflowStatus.QUEUED, WorkflowStatus.RUNNING] } },
      });
      if (active >= 2) throw new Error("ACTIVE_LIMIT");
      return transaction.workflow.create({
        data: {
          userId: session.user.id,
          title: parsed.data.title ?? parsed.data.prompt.slice(0, 72).trim(),
          prompt: parsed.data.prompt,
          tasks: {
            create: AGENTS.map((agent) => ({ agentKey: agent.key, name: agent.name, input: agent.role })),
          },
          events: { create: { type: "workflow.queued", message: "Workflow queued for execution." } },
        },
        select: { id: true },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof Error && error.message === "ACTIVE_LIMIT") {
      return NextResponse.json({ error: "You can run up to two workflows at a time." }, { status: 429 });
    }
    return NextResponse.json({ error: "Workflow could not be saved. Check the database configuration." }, { status: 503 });
  }

  try {
    await inngest.send({ name: "workflow/run.requested", data: { workflowId: workflow.id, userId: session.user.id } });
  } catch {
    await db.$transaction([
      db.workflow.update({
        where: { id: workflow.id },
        data: { status: WorkflowStatus.FAILED, errorMessage: "The background worker is unavailable.", completedAt: new Date() },
      }),
      db.workflowTask.updateMany({
        where: { workflowId: workflow.id, status: "PENDING" },
        data: { status: "SKIPPED" },
      }),
      db.workflowEvent.create({
        data: { workflowId: workflow.id, type: "workflow.failed", message: "The background worker is unavailable." },
      }),
    ]);
    return NextResponse.json({ error: "Background execution is unavailable. Verify the Inngest configuration." }, { status: 503 });
  }

  return NextResponse.json({ workflowId: workflow.id }, { status: 202 });
}