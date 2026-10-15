import { redirect } from "next/navigation";
import { connection } from "next/server";
import { auth } from "@/auth";
import { WorkflowDetailClient } from "@/components/workflow-detail-client";

export const instant = false;

export default async function WorkflowPage({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const { id } = await params;
  return <WorkflowDetailClient id={id} name={session.user.name ?? ""} email={session.user.email ?? ""} />;
}