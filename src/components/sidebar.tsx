"use client";

import { useState } from "react";

interface NavItem {
  label: string;
  icon: React.ReactNode;
  active?: boolean;
}

const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const HistoryIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.2" />
    <path d="M7 4.5V7l2 1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ReportIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <rect x="2" y="1.5" width="10" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
    <path d="M4.5 5h5M4.5 7.5h5M4.5 10h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);

const MicIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <rect x="6.5" y="1.5" width="5" height="8" rx="2.5" stroke="currentColor" strokeWidth="1.4" />
    <path d="M3.5 9a5.5 5.5 0 0 0 11 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    <path d="M9 14.5v2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

const navItems: NavItem[] = [
  { label: "New Analysis", icon: <PlusIcon />, active: true },
  { label: "History", icon: <HistoryIcon /> },
  { label: "Reports", icon: <ReportIcon /> },
];

export function Sidebar() {
  const [activeItem, setActiveItem] = useState("New Analysis");

  return (
    <aside
      className="flex flex-col h-full w-60 shrink-0"
      style={{
        background: "var(--surface)",
        borderRight: "1px solid var(--border)",
      }}
    >
      {/* Logo */}
      <div
        className="px-5 py-5"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
            style={{
              background: "var(--accent-cyan-dim)",
              border: "1px solid rgba(0, 229, 255, 0.2)",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="3" fill="var(--accent-cyan)" opacity="0.9" />
              <circle cx="7" cy="7" r="5.5" stroke="var(--accent-cyan)" strokeWidth="0.8" opacity="0.4" />
              <path d="M4 7h-2M10 7h2M7 4V2M7 10v2" stroke="var(--accent-cyan)" strokeWidth="0.8" strokeLinecap="round" />
            </svg>
          </div>
          <span
            className="text-sm font-display font-700 tracking-wider uppercase"
            style={{ color: "var(--text-primary)", fontFamily: "var(--font-syne)", fontWeight: 700, letterSpacing: "0.12em" }}
          >
            NeuroTrace
          </span>
        </div>
        <p
          className="mt-1.5 text-xs leading-tight"
          style={{ color: "var(--text-muted)", fontFamily: "var(--font-jetbrains-mono)", fontSize: "0.65rem" }}
        >
          Cognitive Biomarker Analysis
        </p>
      </div>

      {/* Analyze button */}
      <div className="px-4 pt-4 pb-2">
        <button
          className="w-full flex items-center justify-center gap-2 rounded-md py-2.5 text-sm font-medium transition-all duration-150 cursor-pointer"
          style={{
            background: "var(--accent-cyan-dim)",
            border: "1px solid rgba(0, 229, 255, 0.25)",
            color: "var(--accent-cyan)",
            fontFamily: "var(--font-dm-sans)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "rgba(0, 229, 255, 0.18)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "var(--accent-cyan-dim)";
          }}
        >
          <MicIcon />
          <span>Analyze Speech</span>
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 pt-3">
        <p
          className="px-2 mb-2 text-xs uppercase tracking-widest"
          style={{ color: "var(--text-muted)", fontFamily: "var(--font-jetbrains-mono)", fontSize: "0.6rem" }}
        >
          Navigation
        </p>
        <ul className="space-y-0.5">
          {navItems.map((item) => {
            const isActive = activeItem === item.label;
            return (
              <li key={item.label}>
                <button
                  onClick={() => setActiveItem(item.label)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-left transition-all duration-150 cursor-pointer"
                  style={{
                    background: isActive ? "var(--accent-cyan-dim)" : "transparent",
                    color: isActive ? "var(--accent-cyan)" : "var(--text-secondary)",
                    border: isActive ? "1px solid rgba(0, 229, 255, 0.15)" : "1px solid transparent",
                    fontFamily: "var(--font-dm-sans)",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.03)";
                      (e.currentTarget as HTMLButtonElement).style.color = "var(--text-primary)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                      (e.currentTarget as HTMLButtonElement).style.color = "var(--text-secondary)";
                    }
                  }}
                >
                  <span style={{ opacity: isActive ? 1 : 0.6 }}>{item.icon}</span>
                  {item.label}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer status */}
      <div
        className="px-5 py-4"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-2 h-2 rounded-full shrink-0 animate-pulse-dot"
            style={{ background: "var(--accent-cyan)" }}
          />
          <div>
            <p
              className="text-xs font-medium"
              style={{ color: "var(--text-primary)", fontFamily: "var(--font-dm-sans)" }}
            >
              System Ready
            </p>
            <p
              className="text-xs"
              style={{ color: "var(--text-muted)", fontFamily: "var(--font-jetbrains-mono)", fontSize: "0.62rem" }}
            >
              All agents standby
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
