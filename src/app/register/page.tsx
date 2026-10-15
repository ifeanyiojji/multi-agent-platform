import { redirect } from "next/navigation";
import { connection } from "next/server";
import { auth } from "@/auth";
import { AuthForm } from "@/components/auth-form";

export const instant = false;

export default async function RegisterPage() {
  await connection();
  const session = await auth();
  if (session?.user?.id) redirect("/");
  return <AuthForm mode="register" />;
}