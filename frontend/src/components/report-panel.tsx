"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ReportHighlight = {
  region: string;
  activation: number;
  finding: string;
  clinical_context: string;
};

export type RiskIndicator = {
  indicator: string;
  severity: "low" | "moderate" | "high";
  explanation: string;
  citation?: string;
};

export type CognitiveCitation = {
  apa: string;
  pmid?: string;
  relevance?: string;
};

export type CognitiveReport = {
  summary: string;
  risk_level: "low" | "moderate" | "high";
  overall_cognitive_load: number;
  highlights?: ReportHighlight[];
  risk_indicators?: RiskIndicator[];
  recommendation?: string;
  citations?: CognitiveCitation[];
  disclaimer?: string;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const RISK_CONFIG = {
  low:      { label: "Low Risk",      color: "#1D9E75", bg: "rgba(29,158,117,0.08)",  border: "rgba(29,158,117,0.2)"  },
  moderate: { label: "Moderate Risk", color: "#BA7517", bg: "rgba(186,117,23,0.08)",  border: "rgba(186,117,23,0.2)"  },
  high:     { label: "High Risk",     color: "#D85A30", bg: "rgba(216,90,48,0.08)",   border: "rgba(216,90,48,0.2)"   },
};

const SEVERITY_COLOR: Record<string, string> = {
  low:      "#1D9E75",
  moderate: "#BA7517",
  high:     "#D85A30",
};

// ─── Component ────────────────────────────────────────────────────────────────

type ReportPanelProps = {
  report: CognitiveReport;
};

export function ReportPanel({ report }: ReportPanelProps) {
  const [showCitations, setShowCitations] = useState(false);

  const risk = RISK_CONFIG[report.risk_level] ?? RISK_CONFIG.moderate;
  const loadPct = Math.round((report.overall_cognitive_load ?? 0) * 100);

  const glassStyle: React.CSSProperties = {
    background: "rgba(252, 251, 249, 0.70)",
    backdropFilter: "blur(16px)",
    border: "1px solid rgba(255,255,255,0.65)",
    boxShadow: "0 2px 12px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.8)",
  };

  return (
    <div className="rounded-xl overflow-hidden flex flex-col gap-0" style={glassStyle}>
      {/* ── Header ── */}
      <div className="px-4 pt-3.5 pb-3 border-b border-black/5">
        <div className="flex items-center justify-between gap-3 mb-2">
          <span
            className="text-[10px] font-semibold uppercase tracking-widest text-black/35"
            style={{ fontFamily: "var(--font-jetbrains-mono)" }}
          >
            Cognitive Report
          </span>
          {/* Risk badge */}
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
            style={{
              color: risk.color,
              background: risk.bg,
              border: `1px solid ${risk.border}`,
              fontFamily: "var(--font-jetbrains-mono)",
            }}
          >
            {risk.label}
          </span>
        </div>

        {/* Cognitive load bar */}
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1 rounded-full bg-black/8 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${loadPct}%`,
                background: risk.color,
              }}
            />
          </div>
          <span
            className="text-[10px] tabular-nums text-black/45 shrink-0"
            style={{ fontFamily: "var(--font-jetbrains-mono)" }}
          >
            {loadPct}% load
          </span>
        </div>
      </div>

      {/* ── Summary ── */}
      <div className="px-4 py-3 border-b border-black/5">
        <p className="text-[12px] text-black/70 leading-relaxed">{report.summary}</p>
      </div>

      {/* ── Risk indicators ── */}
      {report.risk_indicators && report.risk_indicators.length > 0 && (
        <div className="px-4 py-3 border-b border-black/5 flex flex-col gap-2">
          <span
            className="text-[9px] font-semibold uppercase tracking-widest text-black/30"
            style={{ fontFamily: "var(--font-jetbrains-mono)" }}
          >
            Indicators
          </span>
          {report.risk_indicators.map((ind, i) => (
            <div key={i} className="flex items-start gap-2">
              <div
                className="w-1 h-1 rounded-full mt-1.5 shrink-0"
                style={{ background: SEVERITY_COLOR[ind.severity] ?? "#888" }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold text-black/70 leading-snug">
                  {ind.indicator}
                </p>
                <p className="text-[10px] text-black/50 leading-relaxed mt-0.5">
                  {ind.explanation}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Recommendation ── */}
      {report.recommendation && (
        <div className="px-4 py-3 border-b border-black/5">
          <span
            className="text-[9px] font-semibold uppercase tracking-widest text-black/30 block mb-1.5"
            style={{ fontFamily: "var(--font-jetbrains-mono)" }}
          >
            Recommendation
          </span>
          <p className="text-[11px] text-black/65 leading-relaxed">{report.recommendation}</p>
        </div>
      )}

      {/* ── Citations (collapsible) ── */}
      {report.citations && report.citations.length > 0 && (
        <div className="px-4 py-2.5">
          <button
            onClick={() => setShowCitations((v) => !v)}
            className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-widest text-black/30 hover:text-black/50 transition-colors"
            style={{ fontFamily: "var(--font-jetbrains-mono)" }}
          >
            {showCitations ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
            Citations ({report.citations.length})
          </button>
          {showCitations && (
            <div className="mt-2 flex flex-col gap-2">
              {report.citations.map((c, i) => (
                <div key={i} className="flex items-start gap-1.5">
                  <span
                    className="text-[9px] text-black/25 shrink-0 mt-0.5"
                    style={{ fontFamily: "var(--font-jetbrains-mono)" }}
                  >
                    [{i + 1}]
                  </span>
                  <p className="text-[9px] text-black/40 leading-relaxed">{c.apa}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Disclaimer ── */}
      {report.disclaimer && (
        <div className="px-4 pb-3 pt-0">
          <p
            className="text-[9px] text-black/25 italic leading-relaxed"
            style={{ fontFamily: "var(--font-jetbrains-mono)" }}
          >
            {report.disclaimer}
          </p>
        </div>
      )}
    </div>
  );
}
