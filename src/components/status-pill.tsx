export function StatusPill({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const label = normalized === "succeeded" ? "Completed" : normalized[0].toUpperCase() + normalized.slice(1);
  return <span className={`status-pill status-${normalized}`}><span className="status-dot" aria-hidden="true" />{label}</span>;
}