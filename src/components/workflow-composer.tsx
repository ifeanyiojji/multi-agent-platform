"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function WorkflowComposer() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const response = await fetch("/api/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim() || undefined, prompt: prompt.trim() }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Workflow could not be started.");
      router.push(`/workflows/${result.workflowId}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Workflow could not be started.");
      setSubmitting(false);
    }
  }

  return <form className="composer panel" onSubmit={submit}>
    <div className="composer-heading"><span className="composer-symbol"><Sparkles size={18} /></span><div><h2 className="panel-title">Define the outcome</h2><p className="panel-meta">The orchestrator creates a plan, then delegates to six specialized agents.</p></div></div>
    <div className="field"><label htmlFor="workflow-title">Workflow name <span className="muted">(optional)</span></label><input className="input" id="workflow-title" maxLength={100} placeholder="e.g. Evaluate our onboarding funnel" value={title} onChange={(event) => setTitle(event.target.value)} /></div>
    <div className="field"><label htmlFor="workflow-prompt">Task brief</label><textarea className="textarea composer-textarea" id="workflow-prompt" maxLength={8000} minLength={20} required placeholder="Describe the objective, relevant context, constraints, and what a useful final report should include." value={prompt} onChange={(event) => setPrompt(event.target.value)} /><div className="composer-meta"><span className="field-hint">20–8,000 characters. Do not include credentials or other secrets.</span><span className={prompt.length > 7600 ? "limit-warning" : "field-hint"}>{prompt.length.toLocaleString()} / 8,000</span></div></div>
    {error && <div className="error-message" role="alert">{error}</div>}
    <div className="composer-footer"><div className="privacy-note"><ShieldCheck size={15} /><span>Private to your account · bounded model output · no external tools by default</span></div><div className="composer-actions"><Button asChild variant="secondary"><Link href="/"><ArrowLeft size={14} />Cancel</Link></Button><Button type="submit" disabled={submitting || prompt.trim().length < 20}>{submitting ? "Queueing workflow…" : <>Start orchestration <ArrowRight size={14} /></>}</Button></div></div>
  </form>;
}