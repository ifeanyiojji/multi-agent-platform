"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Bot, Coins, Layers3, RefreshCw, Workflow } from "lucide-react";
import { WorkspaceShell } from "@/components/workspace-shell";
import { StatusPill } from "@/components/status-pill";

type WorkflowSummary = {
  id: string;
  title: string;
  status: string;
  totalTokens: number;
  estimatedCostUsd: number;
  createdAt: string;
  completedAt: string | null;
  _count: { tasks: number };
};
type DashboardData = {
  workflows: WorkflowSummary[];
  analytics: { total: number; running: number; successRate: number | null; totalTokens: number; estimatedCostUsd: number };
  activity: { day: string; count: number }[];
};

async function loadDashboard() {
  const response = await fetch("/api/workflows?limit=8", { cache: "no-store" });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error ?? "Unable to load workspace data.");
  return payload as DashboardData;
}

const money = (value: number) => `$${value.toFixed(4)}`;
const number = (value: number) => new Intl.NumberFormat().format(value);

export function DashboardClient({ name, email }: { name: string; email: string }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const active = data?.analytics.running ? data.analytics.running > 0 : false;

  useEffect(() => {
    let mounted = true;
    const load = async (quiet = false) => {
      if (!quiet) setLoading(true);
      try {
        const next = await loadDashboard();
        if (mounted) { setData(next); setError(""); }
      } catch (cause) {
        if (mounted) setError(cause instanceof Error ? cause.message : "Unable to load workspace data.");
      } finally {
        if (mounted) { setLoading(false); setRefreshing(false); }
      }
    };
    void load();
    const timer = active ? window.setInterval(() => void load(true), 5000) : undefined;
    return () => { mounted = false; if (timer) window.clearInterval(timer); };
  }, [active]);

  const metrics = [
    { label: "Workflows created", value: data ? number(data.analytics.total) : "—", icon: Workflow, note: "Across your workspace" },
    { label: "Currently active", value: data ? number(data.analytics.running) : "—", icon: Bot, note: "Queued or executing" },
    { label: "Tokens processed", value: data ? number(data.analytics.totalTokens) : "—", icon: Layers3, note: "Recorded from model usage" },
    { label: "Estimated spend", value: data ? money(data.analytics.estimatedCostUsd) : "—", icon: Coins, note: "Based on model token rates" },
  ];

  return <WorkspaceShell name={name} email={email}>
    <main className="content fade-in">
      <div className="page-heading">
        <div><div className="eyebrow">Workspace / Overview</div><h1 className="page-title">Good work starts with a clear brief.</h1><p className="page-subtitle">Coordinate specialized agents and inspect every step of their work.</p></div>
        <Link className="button button-primary" href="/workflows/new"><Workflow size={15} />New workflow</Link>
      </div>
      {error && <div className="error-message" role="alert"><span>{error}</span> <button className="text-button" type="button" onClick={() => { setRefreshing(true); void loadDashboard().then(setData).catch((cause) => setError(cause.message)).finally(() => setRefreshing(false)); }}>Retry</button></div>}
      <section className="metric-grid" aria-label="Workspace analytics">
        {metrics.map(({ label, value, icon: Icon, note }) => <div className="metric-card" key={label}>
          <div className="metric-top"><span className="metric-label">{label}</span><span className="metric-icon"><Icon size={16} /></span></div>
          {loading ? <div className="loading-line metric-skeleton" /> : <div className="metric-value">{value}</div>}
          <div className="metric-note">{note}</div>
        </div>)}
      </section>

      <div className="dashboard-grid">
        <section className="panel activity-panel">
          <div className="panel-heading"><div><h2 className="panel-title">Execution activity</h2><div className="panel-meta">Workflow submissions · last 7 days</div></div><span className="live-label"><span />Live data</span></div>
          <div className="activity-chart" role="img" aria-label="Daily workflow submissions in the last seven days">
            {(data?.activity ?? []).map((item) => {
              const peak = Math.max(1, ...((data?.activity ?? []).map((day) => day.count)));
              return <div className="activity-day" key={item.day}>
                <div className="activity-bar-wrap"><div className="activity-bar" style={{ height: `${item.count ? Math.max(8, (item.count / peak) * 100) : 2}%` }} title={`${item.count} workflow${item.count === 1 ? "" : "s"}`} /></div>
                <span>{new Date(`${item.day}T12:00:00Z`).toLocaleDateString(undefined, { weekday: "short" })}</span>
              </div>;
            })}
            {loading && <div className="chart-loading"><div className="loading-line" /><div className="loading-line" /><div className="loading-line" /></div>}
            {!loading && data?.activity.every((day) => day.count === 0) && <div className="chart-empty">No workflow submissions in this period.</div>}
          </div>
          <div className="activity-foot"><span>Success rate</span><strong>{data?.analytics.successRate === null ? "Not available yet" : `${data?.analytics.successRate}%`}</strong><span className="muted">Completed workflows only</span></div>
        </section>

        <section className="panel recent-panel">
          <div className="panel-heading"><div><h2 className="panel-title">Recent workflows</h2><div className="panel-meta">Latest runs in your workspace</div></div><Link className="quiet-link" href="/workflows">View history <ArrowRight size={13} /></Link></div>
          <div className="recent-list">
            {loading && <>{[0, 1, 2].map((item) => <div className="recent-row" key={item}><div className="loading-line" /><div className="loading-line short" /></div>)}</>}
            {!loading && data?.workflows.length === 0 && <div className="empty-state compact"><span className="empty-icon"><Workflow size={20} /></span><strong>No workflows yet</strong><span>Start with a request that needs multiple perspectives.</span><Link className="button button-secondary" href="/workflows/new">Create a workflow</Link></div>}
            {!loading && data?.workflows.map((workflow) => <Link className="recent-row" href={`/workflows/${workflow.id}`} key={workflow.id}>
              <span className="recent-icon"><Workflow size={15} /></span><span className="recent-copy"><span className="recent-title">{workflow.title}</span><span className="recent-detail">{new Date(workflow.createdAt).toLocaleString()} · {workflow._count.tasks} agents</span></span>
              <StatusPill status={workflow.status} /><ArrowUpRight size={14} className="muted" />
            </Link>)}
          </div>
          <div className="recent-footer"><button className="icon-button" type="button" aria-label="Refresh workspace data" title="Refresh" disabled={refreshing} onClick={() => { setRefreshing(true); void loadDashboard().then(setData).catch((cause) => setError(cause.message)).finally(() => setRefreshing(false)); }}><RefreshCw size={15} className={refreshing ? "spin" : ""} /></button><span className="muted small">Updated from your workflow history</span></div>
        </section>
      </div>
    </main>
  </WorkspaceShell>;
}