import { redirect } from "next/navigation";
import { connection } from "next/server";
import { auth } from "@/auth";
import { WorkspaceShell } from "@/components/workspace-shell";
import { WorkflowComposer } from "@/components/workflow-composer";

export const instant = false;

export default async function NewWorkflowPage() {
  await connection();
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return <WorkspaceShell name={session.user.name ?? ""} email={session.user.email ?? ""}><main className="content fade-in">
    <div className="page-heading"><div><div className="eyebrow">Workspace / New workflow</div><h1 className="page-title">Start an orchestration</h1><p className="page-subtitle">Give the agent team enough context to return a specific, useful result.</p></div></div>
    <WorkflowComposer />
  </main></WorkspaceShell>;
}