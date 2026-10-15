"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Activity, Bot, Boxes, ChevronUp, LogOut, Moon, Plus, Sun } from "lucide-react";

type Props = { name: string; email: string; children: ReactNode };
const navigation = [
  { label: "Overview", href: "/", icon: Activity },
  { label: "Workflows", href: "/workflows", icon: Boxes },
  { label: "New workflow", href: "/workflows/new", icon: Plus },
];

export function WorkspaceShell({ name, email, children }: Props) {
  const pathname = usePathname();

  useEffect(() => {
    const enabled = localStorage.getItem("agentic-theme") === "dark";
    document.documentElement.classList.toggle("dark", enabled);
  }, []);

  function toggleTheme() {
    const enabled = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", enabled);
    localStorage.setItem("agentic-theme", enabled ? "dark" : "light");
  }

  const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || email[0]?.toUpperCase() || "A";

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link className="brand" href="/" aria-label="Agentic overview">
          <span className="brand-mark"><Bot size={19} strokeWidth={2.1} /></span>
          <span><span className="brand-name">Agentic</span><span className="brand-caption">Orchestration platform</span></span>
        </Link>
        <div className="nav-label">Workspace</div>
        <nav className="side-nav" aria-label="Main navigation">
          {navigation.map(({ label, href, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
            return <Link key={href} href={href} className={`nav-link${active ? " active" : ""}`} aria-current={active ? "page" : undefined}>
              <Icon size={16} strokeWidth={1.8} /><span>{label}</span>
            </Link>;
          })}
        </nav>
        <div className="nav-spacer" />
        <div className="sidebar-note"><div className="sidebar-note-title">Private workspace</div><div className="sidebar-note-copy">Your workflows and reports are visible only to your account.</div></div>
        <div className="account-row">
          <span className="avatar" aria-hidden="true">{initials}</span>
          <div className="account-copy"><div className="account-name">{name || "Workspace member"}</div><div className="account-email">{email}</div></div>
          <button className="icon-button" type="button" title="Sign out" aria-label="Sign out" onClick={() => signOut({ callbackUrl: "/login" })}><LogOut size={15} /></button>
          <ChevronUp size={13} className="muted" aria-hidden="true" />
        </div>
      </aside>
      <section className="workspace">
        <header className="topbar"><span className="muted small">Enterprise workspace</span><button className="icon-button theme-toggle" type="button" onClick={toggleTheme} title="Toggle color theme" aria-label="Toggle color theme"><Moon className="theme-moon" size={17} /><Sun className="theme-sun" size={17} /></button></header>
        {children}
      </section>
    </div>
  );
}