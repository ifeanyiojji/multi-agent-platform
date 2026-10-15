"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, Workflow, ArrowUpRight, ChevronDown } from "lucide-react";
import { StatusPill } from "@/components/status-pill";
import { WorkspaceShell } from "@/components/workspace-shell";

type Item = { id: string; title: string; status: string; totalTokens: number; estimatedCostUsd: number; createdAt: string; completedAt: string | null; _count: { tasks: number } };
type Page = { workflows: Item[]; nextCursor: string | null };

async function getPage(cursor?: string, search = "", status = "ALL") {
  const query = new URLSearchParams({ limit: "30" });
  if (cursor) query.set("cursor", cursor);
  if (search.trim()) query.set("search", search.trim());
  if (status !== "ALL") query.set("status", status);
  const response = await fetch(`/api/workflows?${query}`, { cache: "no-store" });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error ?? "Workflow history is unavailable.");
  return payload as Page;
}

export function WorkflowHistoryClient({ name, email }: { name: string; email: string }) {
  const [items, setItems] = useState<Item[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      void getPage(undefined, query, status)
        .then((page) => { if (active) { setItems(page.workflows); setCursor(page.nextCursor); } })
        .catch((cause) => { if (active) setError(cause.message); })
        .finally(() => { if (active) setLoading(false); });
    }, 180);
    return () => { active = false; window.clearTimeout(timer); };
  }, [query, status]);

  function resetForFilterChange() {
    setItems([]);
    setCursor(null);
    setLoading(true);
    setError("");
  }

  async function loadMore() {
    if (!cursor) return;
    setLoadingMore(true);
    try {
      const page = await getPage(cursor, query, status);
      setItems((current) => [...current, ...page.workflows]);
      setCursor(page.nextCursor);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load more workflows.");
    } finally {
      setLoadingMore(false);
    }
  }

  return <WorkspaceShell name={name} email={email}><main className="content fade-in">
    <div className="page-heading"><div><div className="eyebrow">Workspace / History</div><h1 className="page-title">Workflow history</h1><p className="page-subtitle">Search, filter, and inspect your previous executions.</p></div><Link href="/workflows/new" className="button button-primary"><Workflow size={15} />New workflow</Link></div>
    {error && <div className="error-message" role="alert">{error}</div>}
    <section className="panel history-panel">
      <div className="history-toolbar"><label className="search-field"><Search size={15} /><span className="sr-only">Search workflows</span><input aria-label="Search workflows" placeholder="Search workflow names" value={query} onChange={(event) => { resetForFilterChange(); setQuery(event.target.value); }} /></label><div className="filter-group" aria-label="Filter by status">{["ALL", "QUEUED", "RUNNING", "SUCCEEDED", "FAILED", "CANCELLED"].map((value) => <button key={value} className={`filter-button${status === value ? " selected" : ""}`} type="button" aria-pressed={status === value} onClick={() => { resetForFilterChange(); setStatus(value); }}>{value === "ALL" ? "All" : value[0] + value.slice(1).toLowerCase()}</button>)}</div></div>
      <div className="table-scroll"><table className="data-table"><thead><tr><th>Workflow</th><th>Status</th><th>Agents</th><th>Tokens</th><th>Est. cost</th><th>Created</th><th><span className="sr-only">Open</span></th></tr></thead><tbody>
        {loading && [0, 1, 2].map((row) => <tr key={row}><td colSpan={7}><div className="loading-line table-skeleton" /></td></tr>)}
        {!loading && items.map((item) => <tr key={item.id}><td><Link href={`/workflows/${item.id}`} className="table-title">{item.title}</Link><span className="table-subtitle">ID · {item.id.slice(-8)}</span></td><td><StatusPill status={item.status} /></td><td>{item._count.tasks}</td><td>{item.totalTokens.toLocaleString()}</td><td>${item.estimatedCostUsd.toFixed(4)}</td><td>{new Date(item.createdAt).toLocaleDateString()}</td><td><Link className="icon-button" href={`/workflows/${item.id}`} aria-label={`Inspect ${item.title}`}><ArrowUpRight size={15} /></Link></td></tr>)}
        {!loading && items.length === 0 && <tr><td colSpan={7}><div className="empty-state"><span className="empty-icon"><Workflow size={20} /></span><strong>{query || status !== "ALL" ? "No matching workflows" : "No workflows yet"}</strong><span>{query || status !== "ALL" ? "Try a different search or status." : "Your completed and active runs will appear here."}</span>{!items.length && !query && status === "ALL" && <Link className="button button-secondary" href="/workflows/new">Create a workflow</Link>}</div></td></tr>}
      </tbody></table></div>
      {cursor && <div className="load-more-row"><button className="button button-secondary" type="button" disabled={loadingMore} onClick={loadMore}>{loadingMore ? "Loading…" : <>Load more <ChevronDown size={14} /></>}</button></div>}
    </section>
  </main></WorkspaceShell>;
}