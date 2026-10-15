"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Bot, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const registering = mode === "register";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      if (registering) {
        const response = await fetch("/api/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Account could not be created.");
      }
      const result = await signIn("credentials", { email, password, redirect: false });
      if (!result?.ok) throw new Error("Email or password was not accepted.");
      router.replace("/");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to sign in right now.");
      setSubmitting(false);
    }
  }

  return <div className="auth-page">
    <aside className="auth-aside">
      <Link className="brand" href="/" aria-label="Agentic home"><span className="brand-mark"><Bot size={19} /></span><span><span className="brand-name">Agentic</span><span className="brand-caption">Orchestration platform</span></span></Link>
      <div className="auth-aside-copy"><h1>Complex work,<br />with a clearer path.</h1><p>Coordinate specialist agents, follow each decision, and receive one structured report that keeps the reasoning in view.</p></div>
      <span className="small" style={{ color: "#b9c5ee" }}>Private by design · Powered by durable workflows</span>
    </aside>
    <main className="auth-main"><form className="auth-form" onSubmit={submit}>
      <div className="eyebrow">Secure workspace access</div>
      <h2>{registering ? "Create your account" : "Welcome back"}</h2>
      <p>{registering ? "Set up a private workspace to start coordinating AI agents." : "Sign in to continue to your workspace."}</p>
      {registering && <div className="field"><label htmlFor="name">Full name</label><Input id="name" autoComplete="name" required maxLength={80} value={name} onChange={(event) => setName(event.target.value)} /></div>}
      <div className="field"><label htmlFor="email">Work email</label><Input id="email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} /></div>
      <div className="field"><label htmlFor="password">Password</label><Input id="password" type="password" autoComplete={registering ? "new-password" : "current-password"} required minLength={12} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} /><span className="field-hint">Use at least 12 characters.</span></div>
      {error && <div className="error-message" role="alert">{error}</div>}
      <Button className="auth-submit" type="submit" disabled={submitting}>{submitting && <LoaderCircle className="spin" size={15} />}{registering ? "Create account" : "Sign in"}</Button>
      <div className="auth-switch">{registering ? "Already have an account?" : "New to Agentic?"} <Link href={registering ? "/login" : "/register"}>{registering ? "Sign in" : "Create account"}</Link></div>
    </form></main>
  </div>;
}