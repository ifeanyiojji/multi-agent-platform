import { redirect } from "next/navigation";
import { connection } from "next/server";
import { auth } from "@/auth";
import { WorkflowHistoryClient } from "@/components/workflow-history-client";

export const instant = false;

export default async function WorkflowsPage() {
  await connection();
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return <WorkflowHistoryClient name={session.user.name ?? ""} email={session.user.email ?? ""} />;
}