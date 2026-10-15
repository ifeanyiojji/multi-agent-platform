"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowLeft, Ban, Check, Clipboard, Clock3, Download, RefreshCw, ShieldCheck, X } from "lucide-react";
import { WorkspaceShell } from "@/components/workspace-shell";
import { StatusPill } from "@/components/status-pill";

type Task = { agentKey: string; name: string; status: string; attempts: number; tokenCount: number; costUsd: number; startedAt: string | null; completedAt: string | null; output: string | null };
type Event = { id: string; type: string; agentKey: string | null; message: string; createdAt: string };
type Workflow = { id: string; title: string; prompt: string; status: string; report: string | null; errorMessage: string | null; totalTokens: number; estimatedCostUsd: number; createdAt: string; startedAt: string | null; completedAt: string | null; tasks: Task[]; events: Event[] };

const activeStatuses = new Set(["QUEUED", "RUNNING"]);
const duration = (start: string | null, end: string | null) => start && end ? `${Math.max(1, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 1000))} sec` : start ? "In progress" : "—";

export function WorkflowDetailClient({ id, name, email }: { id: string; name: string; email: string }) {
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [copied, setCopied] = useState(false);

  const refresh = useCallback(async () => {
    const response = await fetch(`/api/workflows/${id}`, { cache: "no-store" });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error ?? "Workflow details are unavailable.");
    setWorkflow(payload.workflow as Workflow);
    setError("");
  }, [id]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try { await refresh(); } catch (cause) { if (mounted) setError(cause instanceof Error ? cause.message : "Workflow details are unavailable."); }
      finally { if (mounted) setLoading(false); }
    };
    void load();
    return () => { mounted = false; };
  }, [refresh]);

  useEffect(() => {
    if (!workflow || !activeStatuses.has(workflow.status)) return;
    const timer = window.setInterval(() => { void refresh().catch((cause) => setError(cause.message)); }, 2500);
    return () => window.clearInterval(timer);
  }, [workflow, refresh]);

  async function cancel() {
    setCancelling(true);
    try {
      const response = await fetch(`/api/workflows/${id}/cancel`, { method: "POST" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Cancellation could not be requested.");
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Cancellation could not be requested.");
    } finally { setCancelling(false); }
  }

  async function copyReport() {
    if (!workflow?.report) return;
    try {
      await navigator.clipboard.writeText(workflow.report);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch { setError("Clipboard access is unavailable in this browser."); }
  }

  const active = workflow ? activeStatuses.has(workflow.status) : false;
  const completedTasks = workflow?.tasks.filter((task) => task.status === "SUCCEEDED").length ?? 0;

  return <WorkspaceShell name={name} email={email}><main className="content fade-in">
    <div className="detail-back"><Link className="quiet-link" href="/workflows"><ArrowLeft size={14} />Workflow history</Link></div>
    {loading && <div className="panel loading-detail"><div className="loading-line" /><div className="loading-line" /><div className="loading-line" /></div>}
    {!loading && error && !workflow && <div className="error-message" role="alert">{error} <Link href="/workflows" className="quiet-link">Back to history</Link></div>}
    {!loading && workflow && <>
      <div className="page-heading detail-heading"><div><div className="eyebrow">Workflow inspection · {workflow.id.slice(-8)}</div><h1 className="page-title">{workflow.title}</h1><p className="page-subtitle">Submitted {new Date(workflow.createdAt).toLocaleString()} · {duration(workflow.startedAt, workflow.completedAt)}</p></div><div className="detail-actions"><StatusPill status={workflow.status} />{active && <button className="button button-danger" type="button" disabled={cancelling} onClick={cancel}><Ban size={14} />{cancelling ? "Requesting…" : "Cancel workflow"}</button>}</div></div>
      {error && <div className="error-message detail-error" role="alert">{error}</div>}
      <section className="detail-metrics" aria-label="Workflow execution metrics"><div><span>Agent steps</span><strong>{completedTasks} / {workflow.tasks.length}</strong></div><div><span>Tokens used</span><strong>{workflow.totalTokens.toLocaleString()}</strong></div><div><span>Estimated cost</span><strong>${workflow.estimatedCostUsd.toFixed(4)}</strong></div><div><span>Execution duration</span><strong>{duration(workflow.startedAt, workflow.completedAt)}</strong></div></section>
      {workflow.errorMessage && <div className="error-message" role="status">{workflow.errorMessage}</div>}
      <div className="detail-grid">
        <section className="panel graph-panel"><div className="panel-heading"><div><h2 className="panel-title">Agent execution</h2><div className="panel-meta">Live persisted states · parallel work shown together</div></div><button className="icon-button" type="button" title="Refresh now" aria-label="Refresh execution state" onClick={() => void refresh().catch((cause) => setError(cause.message))}><RefreshCw size={15} /></button></div>
          <div className="agent-list">{workflow.tasks.map((task, index) => <article className={`agent-row${task.status === "RUNNING" ? " agent-current" : ""}`} key={task.agentKey}>
            <span className={`agent-node node-${task.status.toLowerCase()}`}>{task.status === "SUCCEEDED" ? <Check size={14} /> : task.status === "FAILED" ? <X size={14} /> : <span>{String(index + 1).padStart(2, "0")}</span>}</span>
            <span className="agent-copy"><span className="agent-name">{task.name}</span><span className="agent-meta">{task.attempts ? `${task.attempts} attempt${task.attempts === 1 ? "" : "s"}` : "Waiting for dependencies"}{task.tokenCount ? ` · ${task.tokenCount.toLocaleString()} tokens` : ""}</span></span>
            <StatusPill status={task.status} />
          </article>)}</div>
          <div className="dependency-note"><ShieldCheck size={14} />Research → Analysis, Planning, Technical → Validation → Synthesis</div>
          {workflow.tasks.some((task) => task.output) && <details className="agent-output-details"><summary>Show structured agent outputs</summary><div className="agent-outputs">{workflow.tasks.filter((task) => task.output).map((task) => <section key={task.agentKey}><h3>{task.name}</h3><pre>{JSON.stringify(JSON.parse(task.output!), null, 2)}</pre></section>)}</div></details>}
        </section>
        <section className="panel timeline-panel"><div className="panel-heading"><div><h2 className="panel-title">Execution timeline</h2><div className="panel-meta">Timestamped status transitions</div></div><Clock3 size={15} className="muted" /></div>
          <ol className="timeline">{workflow.events.map((event) => <li className="timeline-item" key={event.id}><span className="timeline-dot" /><div className="timeline-copy"><strong>{event.agentKey ? `${event.agentKey[0].toUpperCase()}${event.agentKey.slice(1)} agent` : event.type.split(".").map((part) => part[0].toUpperCase() + part.slice(1)).join(" ")}</strong><span>{event.message}</span><time dateTime={event.createdAt}>{new Date(event.createdAt).toLocaleTimeString()}</time></div></li>)}</ol>
        </section>
      </div>
      <section className="panel report-panel"><div className="panel-heading"><div><h2 className="panel-title">Final report</h2><div className="panel-meta">{workflow.report ? "Validated synthesis output" : "Available after synthesis completes"}</div></div>{workflow.report && <div className="report-actions"><button className="button button-secondary" type="button" onClick={copyReport}>{copied ? <Check size={14} /> : <Clipboard size={14} />}{copied ? "Copied" : "Copy Markdown"}</button><a className="button button-secondary" href={`/api/workflows/${id}/report`}><Download size={14} />Export .md</a></div>}</div>
        {workflow.report ? <div className="panel-body"><article className="report-markdown"><ReactMarkdown remarkPlugins={[remarkGfm]}>{workflow.report}</ReactMarkdown></article></div> : <div className="report-placeholder"><span className="report-placeholder-icon">{active ? <RefreshCw size={17} /> : <Ban size={17} />}</span><strong>{active ? "Agents are still working" : workflow.status === "FAILED" ? "A final report could not be produced" : "No report available"}</strong><span>{active ? "This view refreshes automatically as the workflow advances." : "Review the execution events above for the last recorded status."}</span></div>}
      </section>
      <section className="panel brief-panel"><div className="panel-heading"><h2 className="panel-title">Original task brief</h2></div><div className="brief-copy">{workflow.prompt}</div></section>
    </>}
  </main></WorkspaceShell>;
}