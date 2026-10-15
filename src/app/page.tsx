import { redirect } from "next/navigation";
import { connection } from "next/server";
import { auth } from "@/auth";
import { DashboardClient } from "@/components/dashboard-client";

export const instant = false;

export default async function HomePage() {
  await connection();
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return <DashboardClient name={session.user.name ?? ""} email={session.user.email ?? ""} />;
}