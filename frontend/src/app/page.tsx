"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { NeuroTraceSplash } from "@/components/neurotrace-splash";
import { NeuroSidebar } from "@/components/neuro-sidebar";
import { SiteHeader } from "@/components/site-header";
import { type AgentCardProps } from "@/components/agent-card";
import { AnalysisPanel, type AnalysisInput, type WordTimestamp } from "@/components/analysis-panel";
import { WaveformPanel } from "@/components/waveform-panel";
import { ReportPanel, type CognitiveReport } from "@/components/report-panel";
import { HistoryPanel } from "@/components/history-panel";
import { DashboardView } from "@/components/dashboard-view";
import GlassSurface from "@/components/GlassSurface";
import type { RegionActivation } from "@/components/brain-viewer";
import { useAnalysisHistory } from "@/hooks/useAnalysisHistory";
import { useTheme } from "@/hooks/useTheme";
import { NeuroRadarChart } from "@/components/radar-chart";

// ─── Brain region definitions ─────────────────────────────────────────────────

const BRAIN_REGIONS: RegionActivation[] = [
  { region: "Broca's area",    mni: [-44, 20, 8],    activation: 0.72, agent: "Lexical"   },
  { region: "Wernicke's area", mni: [-54, -40, 14],  activation: 0.58, agent: "Semantic"  },
  { region: "DLPFC",           mni: [-46, 20, 32],   activation: 0.83, agent: "Syntax"    },
  { region: "SMA",             mni: [0, -4, 60],     activation: 0.44, agent: "Prosody"   },
  { region: "Amygdala",        mni: [-24, -4, -22],  activation: 0.31, agent: "Affective" },
];

const AGENT_KEY: Record<string, string> = {
  Lexical: "lexical", Semantic: "semantic",
  Prosody: "prosody", Syntax: "syntax", Affective: "affective",
};

const AGENT_DETAILS: Record<string, { primerSet: string; markers: { name: string; value: number; unit?: string }[] }> = {
  Lexical: {
    primerSet: "TTR · Density · Filler",
    markers: [
      { name: "TTR", value: 68 },
      { name: "Lexical density", value: 74 },
      { name: "Filler rate", value: 42 },
    ],
  },
  Semantic: {
    primerSet: "Coherence · Density · Tang",
    markers: [
      { name: "Coherence", value: 58 },
      { name: "Idea density", value: 61 },
      { name: "Tangentiality", value: 33 },
    ],
  },
  Prosody: {
    primerSet: "Rate · Pause · Hesitation",
    markers: [
      { name: "Speech rate", value: 44, unit: "wpm" },
      { name: "Pause freq", value: 51, unit: "/min" },
      { name: "Hesitation", value: 38 },
    ],
  },
  Syntax: {
    primerSet: "MLU · Depth · Passive",
    markers: [
      { name: "MLU", value: 83 },
      { name: "Clause depth", value: 79 },
      { name: "Passive voice", value: 22 },
    ],
  },
  Affective: {
    primerSet: "Valence · Arousal · Intensity",
    markers: [
      { name: "Valence", value: 55 },
      { name: "Arousal", value: 62 },
      { name: "Intensity", value: 48 },
    ],
  },
};

function scoreColor(v: number) {
  if (v > 75) return "#D85A30";
  if (v > 50) return "#BA7517";
  if (v > 25) return "#1D9E75";
  return "#888780";
}

// ─── Dynamic imports ──────────────────────────────────────────────────────────

const Dither = dynamic(() => import("@/components/Dither"), { ssr: false });
const BrainViewer = dynamic(() => import("@/components/brain-viewer"), { ssr: false });

// ─── Types ────────────────────────────────────────────────────────────────────

type AgentStep = {
  name: string;
  status: "pending" | "running" | "done" | "error";
  detail?: string;
};

// ─── Biomarkers Information Panel ────────────────────────────────────────────

function BiomarkersPanel() {
  const biomarkers = [
    {
      id: "lexical",
      name: "Lexical Diversity",
      agent: "Lexical Agent",
      region: "Broca's Area",
      description: "Measures vocabulary richness and word choice patterns",
      metrics: ["Type-Token Ratio (TTR)", "Lexical Density", "Filler Word Frequency", "Noun-to-Verb Ratio", "First-person Pronoun Ratio"],
      clinical: "Reduced diversity may indicate aphasia or cognitive decline",
      color: "#ff6b6b",
    },
    {
      id: "semantic",
      name: "Semantic Coherence",
      agent: "Semantic Agent",
      region: "Wernicke's Area",
      description: "Evaluates meaning connectivity and conceptual relationships",
      metrics: ["Idea Density", "Coherence Score", "Tangentiality Index", "Semantc Similarity Score", "Conceptual Repetition Rate (CRR)","Narrative Structure Score (NSS)"],
      clinical: "Disrupted coherence often seen in schizophrenia or dementia",
      color: "#f59e0b",
    },
    {
      id: "syntax",
      name: "Syntactic Complexity",
      agent: "Syntax Agent",
      region: "DLPFC",
      description: "Analyzes grammatical structure and sentence organization",
      metrics: ["Mean Length of Utterance (MLU)", "Clause Density", "Passive Voice Usage"],
      clinical: "Simplified syntax may indicate cognitive impairment",
      color: "#00e5ff",
    },
    {
      id: "prosody",
      name: "Prosodic Features",
      agent: "Prosody Agent",
      region: "SMA",
      description: "Assesses speech rhythm, timing, and intonation patterns",
      metrics: ["Speech Rate (wpm)", "Pause Frequency", "Hesitation Duration"],
      clinical: "Abnormal prosody common in Parkinson's and depression",
      color: "#1d9e75",
    },
    {
      id: "affective",
      name: "Affective Markers",
      agent: "Affective Agent",
      region: "Amygdala",
      description: "Monitors emotional tone and affective expression patterns",
      metrics: ["Valence Score", "Arousal Level", "Emotional Intensity"],
      clinical: "Altered affective markers seen in mood disorders",
      color: "#a855f7",
    },
  ];

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold mb-2" style={{ color: "var(--nt-text-hi)" }}>
            Cognitive Biomarkers
          </h1>
          <p className="text-sm" style={{ color: "var(--nt-text-md)" }}>
            Quantitative measures of cognitive function derived from speech and language analysis.
            Each biomarker provides insights into specific aspects of neural processing and cognitive health.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-1">
          {biomarkers.map((biomarker) => (
            <div
              key={biomarker.id}
              className="rounded-xl p-6"
              style={{
                background: "var(--nt-glass)",
                backdropFilter: "blur(18px)",
                border: "1px solid var(--nt-glass-border)",
                boxShadow: "var(--nt-glass-shadow)",
              }}
            >
              <div className="flex items-start gap-4">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-sm shrink-0"
                  style={{ backgroundColor: biomarker.color }}
                >
                  {biomarker.id.charAt(0).toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold mb-1" style={{ color: "var(--nt-text-hi)" }}>
                    {biomarker.name}
                  </h3>

                  <div className="mb-3">
                    <span
                      className="inline-block px-2 py-1 rounded-md text-xs font-medium mr-2"
                      style={{
                        backgroundColor: `${biomarker.color}20`,
                        color: biomarker.color,
                        border: `1px solid ${biomarker.color}30`,
                      }}
                    >
                      {biomarker.agent}
                    </span>
                    <span
                      className="inline-block px-2 py-1 rounded-md text-xs font-medium"
                      style={{
                        backgroundColor: "rgba(0,0,0,0.05)",
                        color: "var(--nt-text-md)",
                        border: "1px solid rgba(0,0,0,0.1)",
                      }}
                    >
                      {biomarker.region}
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <h4 className="text-sm font-medium mb-1" style={{ color: "var(--nt-text-hi)" }}>
                        Description
                      </h4>
                      <p className="text-sm" style={{ color: "var(--nt-text-md)" }}>
                        {biomarker.description}
                      </p>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium mb-1" style={{ color: "var(--nt-text-hi)" }}>
                        Key Metrics
                      </h4>
                      <ul className="text-sm space-y-0.5" style={{ color: "var(--nt-text-md)" }}>
                        {biomarker.metrics.map((metric, index) => (
                          <li key={index} className="flex items-center gap-2">
                            <span className="w-1 h-1 rounded-full bg-current opacity-50 shrink-0" />
                            {metric}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium mb-1" style={{ color: "var(--nt-text-hi)" }}>
                        Clinical Significance
                      </h4>
                      <p className="text-sm" style={{ color: "var(--nt-text-md)" }}>
                        {biomarker.clinical}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <div className="p-6 rounded-xl" style={{
            background: "var(--nt-glass)",
            backdropFilter: "blur(18px)",
            border: "1px solid var(--nt-glass-border)",
            boxShadow: "var(--nt-glass-shadow)",
          }}>
            <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--nt-text-hi)" }}>
              Biomarker Calculation
            </h2>
            <div className="space-y-3 text-sm" style={{ color: "var(--nt-text-md)" }}>
              <p>
                <strong>Automated Analysis:</strong> Machine learning algorithms process speech
                and text input to extract quantitative features.
              </p>
              <p>
                <strong>Normalization:</strong> Raw metrics are normalized against healthy
                population baselines for comparative assessment.
              </p>
              <p>
                <strong>Scoring:</strong> Results are scaled 0-100, where higher scores
                indicate greater deviation from normal patterns.
              </p>
            </div>
          </div>

          <div className="p-6 rounded-xl" style={{
            background: "var(--nt-glass)",
            backdropFilter: "blur(18px)",
            border: "1px solid var(--nt-glass-border)",
            boxShadow: "var(--nt-glass-shadow)",
          }}>
            <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--nt-text-hi)" }}>
              Research Applications
            </h2>
            <ul className="space-y-2 text-sm" style={{ color: "var(--nt-text-md)" }}>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-current opacity-50 shrink-0 mt-1.5" />
                <span>Early detection of neurodegenerative diseases</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-current opacity-50 shrink-0 mt-1.5" />
                <span>Personal Reflection Tool used to track speech patterns over time</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-current opacity-50 shrink-0 mt-1.5" />
                <span>Objective assessment of cognitive rehabilitation</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-current opacity-50 shrink-0 mt-1.5" />
                <span>Population-level cognitive health screening</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function BrainRegionsPanel() {
  const regions = [
    {
      id: "dlpfc",
      name: "DLPFC (Dorolateral Prefrontal Cortex)",
      location: "Frontal Lobe",
      function: "Executive function, working memory, cognitive control, and decision-making",
      agent: "Syntax Agent",
      analysis: "Analyzes grammatical structure, sentence complexity, and language organization patterns",
      color: "#00e5ff",
    },
    {
      id: "broca",
      name: "Broca's Area",
      location: "Frontal Lobe",
      function: "Speech production, language processing, and motor planning for articulation",
      agent: "Lexical Agent",
      analysis: "Examines vocabulary richness, word choice patterns, and lexical diversity",
      color: "#ff6b6b",
    },
    {
      id: "wernicke",
      name: "Wernicke's Area",
      location: "Temporal Lobe",
      function: "Language comprehension, semantic processing, and understanding of spoken/written words",
      agent: "Semantic Agent",
      analysis: "Evaluates meaning coherence, idea connectivity, and conceptual relationships",
      color: "#f59e0b",
    },
    {
      id: "sma",
      name: "Supplementary Motor Area",
      location: "Frontal Lobe",
      function: "Motor planning, speech rhythm, and coordination of complex movements",
      agent: "Prosody Agent",
      analysis: "Assesses speech timing, intonation patterns, and prosodic features",
      color: "#1d9e75",
    },
    {
      id: "amygdala",
      name: "Amygdala",
      location: "Temporal Lobe",
      function: "Emotional processing, fear response, and affective state regulation",
      agent: "Affective Agent",
      analysis: "Monitors emotional tone, affective markers, and emotional expression patterns",
      color: "#a855f7",
    },
  ];

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold mb-2" style={{ color: "var(--nt-text-hi)" }}>
            Brain Regions & Cognitive Analysis
          </h1>
          <p className="text-sm" style={{ color: "var(--nt-text-md)" }}>
            Explore the neural foundations of language and cognition. Each brain region plays a specialized role
            in processing different aspects of communication and thought.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-1">
          {regions.map((region) => (
            <div
              key={region.id}
              className="rounded-xl p-6"
              style={{
                background: "var(--nt-glass)",
                backdropFilter: "blur(18px)",
                border: "1px solid var(--nt-glass-border)",
                boxShadow: "var(--nt-glass-shadow)",
              }}
            >
              <div className="flex flex-col gap-6">
                {/* Brain Region Diagram */}
                <div className="flex justify-center">
                  <div
                    className="w-64 h-48 rounded-lg overflow-hidden border-2"
                    style={{ borderColor: region.color }}
                  >
                    <img
                      src={`/images/${region.id}.png`}
                      alt={`${region.name} diagram`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Fallback to colored placeholder if image fails to load
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                          parent.innerHTML = `
                            <div class="w-full h-full flex flex-col items-center justify-center text-white font-semibold" style="background: linear-gradient(135deg, ${region.color}80, ${region.color}40)">
                              <div class="text-2xl mb-2">${region.id.toUpperCase()}</div>
                              <div class="text-sm opacity-80">Brain Diagram</div>
                            </div>
                          `;
                        }
                      }}
                    />
                  </div>
                </div>

                {/* Region Information */}
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-xs shrink-0"
                      style={{ backgroundColor: region.color }}
                    >
                      {region.id.toUpperCase()}
                    </div>
                    <h3 className="text-lg font-semibold" style={{ color: "var(--nt-text-hi)" }}>
                      {region.name}
                    </h3>
                  </div>

                  <div className="mb-3">
                    <span
                      className="inline-block px-2 py-1 rounded-md text-xs font-medium"
                      style={{
                        backgroundColor: `${region.color}20`,
                        color: region.color,
                        border: `1px solid ${region.color}30`,
                      }}
                    >
                      {region.location}
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <h4 className="text-sm font-medium mb-1" style={{ color: "var(--nt-text-hi)" }}>
                        Neural Function
                      </h4>
                      <p className="text-sm" style={{ color: "var(--nt-text-md)" }}>
                        {region.function}
                      </p>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium mb-1" style={{ color: "var(--nt-text-hi)" }}>
                        Cognitive Agent
                      </h4>
                      <p className="text-sm" style={{ color: "var(--nt-text-md)" }}>
                        <span style={{ color: region.color, fontWeight: 500 }}>{region.agent}</span> - {region.analysis}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 p-6 rounded-xl" style={{
          background: "var(--nt-glass)",
          backdropFilter: "blur(18px)",
          border: "1px solid var(--nt-glass-border)",
          boxShadow: "var(--nt-glass-shadow)",
        }}>
          <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--nt-text-hi)" }}>
            How It Works
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h3 className="text-sm font-medium mb-2" style={{ color: "var(--nt-text-hi)" }}>
                Neural Analysis Pipeline
              </h3>
              <ul className="text-sm space-y-1" style={{ color: "var(--nt-text-md)" }}>
                <li>• Speech/text input processing</li>
                <li>• Feature extraction from multiple modalities</li>
                <li>• Region-specific biomarker calculation</li>
                <li>• Cognitive signature generation</li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-medium mb-2" style={{ color: "var(--nt-text-hi)" }}>
                Clinical Applications
              </h3>
              <ul className="text-sm space-y-1" style={{ color: "var(--nt-text-md)" }}>
                <li>• Early detection of cognitive decline</li>
                <li>• Language disorder assessment</li>
                <li>• Treatment progress monitoring</li>
                <li>• Research biomarker validation</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniAgentCard({ agent, isActive }: { agent: AgentCardProps; isActive: boolean }) {
  const score = agent.topScore ?? 0;
  const color = scoreColor(score);

  return (
    <div
      className="rounded-xl p-3 h-full flex flex-col"
      style={{
        background: "var(--nt-glass)",
        backdropFilter: "blur(16px)",
        border: isActive ? `1px solid rgba(216,90,48,0.35)` : "1px solid var(--nt-glass-border)",
        boxShadow: isActive
          ? "0 0 0 2px rgba(216,90,48,0.08), var(--nt-glass-shadow)"
          : "var(--nt-glass-shadow)",
        transition: "border-color 0.3s, box-shadow 0.3s",
      }}
    >
      {/* Name + score */}
      <div className="flex items-start justify-between gap-1 mb-1.5">
        <div>
          <p className="text-[11px] font-semibold leading-tight" style={{ color: "var(--nt-text-hi)" }}>{agent.agentName}</p>
          <p className="text-[9px] mt-0.5" style={{ color: "var(--nt-text-xs)", fontFamily: "var(--font-jetbrains-mono)" }}>
            {agent.brainRegion}
          </p>
        </div>
        <span className="text-sm font-bold tabular-nums leading-none pt-0.5" style={{ color }}>
          {score}
        </span>
      </div>

      {/* Overall score bar */}
      <div className="h-1 rounded-full overflow-hidden mb-2" style={{ background: "var(--nt-track)" }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${score}%`, background: color }}
        />
      </div>

      {/* Compact metrics */}
      <div className="flex flex-col gap-1 flex-1">
        {agent.markers.slice(0, 2).map((m) => (
          <div key={m.name} className="flex items-center justify-between gap-1">
            <span className="text-[10px] truncate" style={{ color: "var(--nt-text-lo)" }}>{m.name}</span>
            <span
              className="text-[10px] tabular-nums shrink-0"
              style={{ color: scoreColor(m.value), fontFamily: "var(--font-jetbrains-mono)" }}
            >
              {m.value}{m.unit ? ` ${m.unit}` : ""}
            </span>
          </div>
        ))}
      </div>

      {/* Active indicator */}
      <div className="flex items-center gap-1.5 pt-2 mt-auto" style={{ borderTop: "1px solid var(--nt-divider)" }}>
        <div
          className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-amber-400 animate-pulse" : ""}`}
          style={!isActive ? { background: "var(--nt-track)" } : {}}
        />
        <span
          className="text-[9px] uppercase tracking-widest"
          style={{ color: "var(--nt-text-ghost)", fontFamily: "var(--font-jetbrains-mono)" }}
        >
          {isActive ? "Processing" : "Standby"}
        </span>
      </div>
    </div>
  );
}

// ─── Processing steps overlay ────────────────────────────────────────────────

const STEP_REGIONS: Record<string, string> = {
  "STT preprocessor": "Whisper · Pause map",
  "Lexical agent":     "Broca's area",
  "Semantic agent":    "Wernicke's area",
  "Prosody agent":     "SMA",
  "Syntax agent":      "DLPFC",
  "Biomarker mapper":  "MNI normalisation",
  "Report composer":   "Claude claude-sonnet-4-6",
};

function ProcessingSteps({ steps, glass }: { steps: AgentStep[]; glass: React.CSSProperties }) {
  const doneCount  = steps.filter((s) => s.status === "done").length;
  const totalCount = steps.length;
  const pct        = totalCount ? Math.round((doneCount / totalCount) * 100) : 0;

  return (
    <div className="w-full flex flex-col gap-3 animate-fade-up" style={{ animationFillMode: "both" }}>

      {/* Progress bar + label */}
      <div className="flex items-center justify-between mb-0.5">
        <span
          style={{
            color: "var(--nt-text-xs)",
            fontSize: 9,
            fontFamily: "var(--font-jetbrains-mono)",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          Pipeline · {doneCount}/{totalCount} complete
        </span>
        <span style={{ color: "var(--nt-text-xs)", fontSize: 9, fontFamily: "var(--font-jetbrains-mono)" }}>
          {pct}%
        </span>
      </div>
      <div className="h-px w-full rounded-full overflow-hidden mb-1" style={{ background: "var(--nt-track)" }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: "linear-gradient(90deg, #3b82f6, #8b5cf6)" }}
        />
      </div>

      {/* Step rows */}
      <div className="rounded-2xl overflow-hidden" style={glass}>
        {steps.map((step, i) => {
          const isRunning = step.status === "running";
          const isDone    = step.status === "done";
          const isError   = step.status === "error";
          const region    = STEP_REGIONS[step.name] ?? "";

          return (
            <div
              key={step.name}
              className="flex items-center gap-3 px-4 py-2.5 transition-colors duration-300 animate-fade-up"
              style={{
                animationDelay: `${i * 55}ms`,
                animationFillMode: "both",
                borderBottom: i < steps.length - 1 ? "1px solid var(--nt-divider)" : "none",
                background: isRunning ? "var(--nt-hover)" : "transparent",
              }}
            >
              {/* Status dot */}
              <div className="w-4 h-4 flex items-center justify-center shrink-0">
                {isRunning && (
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse-amber" />
                )}
                {isDone && (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="#1D9E75" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
                {isError && (
                  <span style={{ color: "#D85A30", fontSize: 11, fontWeight: 700, lineHeight: 1 }}>✕</span>
                )}
                {step.status === "pending" && (
                  <span className="w-1.5 h-1.5 rounded-full block" style={{ background: "var(--nt-track)" }} />
                )}
              </div>

              {/* Name + region */}
              <div className="flex-1 min-w-0">
                <div
                  style={{
                    fontSize: 11,
                    fontFamily: "var(--font-dm-sans)",
                    fontWeight: isRunning ? 600 : 400,
                    color: isRunning ? "var(--nt-text-hi)" : isDone ? "var(--nt-text-lo)" : "var(--nt-text-ghost)",
                    transition: "color 0.3s",
                  }}
                >
                  {step.name}
                </div>
                {region && (
                  <div style={{ fontSize: 9, fontFamily: "var(--font-jetbrains-mono)", color: "var(--nt-text-ghost)", marginTop: 1 }}>
                    {region}
                  </div>
                )}
              </div>

              {/* Status tag */}
              <span
                className="shrink-0 text-[8px] font-semibold tracking-widest uppercase px-1.5 py-0.5 rounded-md"
                style={{
                  fontFamily: "var(--font-jetbrains-mono)",
                  color: isRunning ? "#f59e0b" : isDone ? "#1D9E75" : isError ? "#D85A30" : "var(--nt-text-ghost)",
                  background: isRunning ? "rgba(245,158,11,0.10)" : isDone ? "rgba(29,158,117,0.08)" : "transparent",
                  border: isRunning ? "1px solid rgba(245,158,11,0.22)" : isDone ? "1px solid rgba(29,158,117,0.18)" : "1px solid transparent",
                  minWidth: 36,
                  textAlign: "center",
                }}
              >
                {isRunning ? "live" : isDone ? "done" : isError ? "err" : "·"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { isDark, toggle: toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { entries: historyEntries, addEntry, removeEntry, clearAll } = useAnalysisHistory();
  const [hasStarted, setHasStarted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [agentSteps, setAgentSteps] = useState<AgentStep[]>([]);
  const [activations, setActivations] = useState<RegionActivation[]>(BRAIN_REGIONS);
  const [biomarkerScores, setBiomarkerScores] = useState<Record<string, number> | undefined>();
  const [wordTimestamps, setWordTimestamps] = useState<WordTimestamp[] | undefined>();
  const [audioDuration, setAudioDuration] = useState<number | undefined>();
  const [activePage, setActivePage] = useState("analysis");
  const [cognitiveReport, setCognitiveReport] = useState<CognitiveReport | undefined>();
  const [currentAgentIndex, setCurrentAgentIndex] = useState(0);

  const agentCards = useMemo(() => {
    return activations.map((r) => {
      const details = AGENT_DETAILS[r.agent] ?? AGENT_DETAILS.Lexical;
      const topScore = Math.round((r.activation || 0) * 100);
      return {
        agentName: `${r.agent} Agent`,
        primerSet: details.primerSet,
        brainRegion: r.region,
        markers: details.markers,
        topScore,
      };
    });
  }, [activations]);

  const nextAgent = useCallback(() => {
    setCurrentAgentIndex((prev) => (prev + 1) % agentCards.length);
  }, [agentCards.length]);

  const prevAgent = useCallback(() => {
    setCurrentAgentIndex((prev) => (prev - 1 + agentCards.length) % agentCards.length);
  }, [agentCards.length]);

  const activeAgentName = useMemo(() => {
    const running = agentSteps.find((s) => s.status === "running");
    if (!running) return undefined;
    return { "Lexical agent": "Lexical", "Semantic agent": "Semantic", "Prosody agent": "Prosody", "Syntax agent": "Syntax" }[running.name];
  }, [agentSteps]);

  // Shift+P toggles side panels (kept for power users)
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.shiftKey && e.key === "P") e.preventDefault(); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, []);

  const handleSubmit = useCallback(async (input: AnalysisInput) => {
    setHasStarted(true);
    setIsLoading(true);
    setBiomarkerScores(undefined);
    setCognitiveReport(undefined);
    setActivations(BRAIN_REGIONS);

    // Capture word timestamps from voice recording
    if (input.type === "transcript") {
      setWordTimestamps(input.wordTimestamps);
      setAudioDuration(input.duration);
    } else {
      setWordTimestamps(undefined);
      setAudioDuration(undefined);
    }

    setAgentSteps([
      { name: "STT preprocessor", status: "running" },
      { name: "Lexical agent",     status: "pending" },
      { name: "Semantic agent",    status: "pending" },
      { name: "Prosody agent",     status: "pending" },
      { name: "Syntax agent",      status: "pending" },
      { name: "Biomarker mapper",  status: "pending" },
      { name: "Report composer",   status: "pending" },
    ]);

    try {
      const body =
        input.type === "text"
          ? { input_value: input.content, ...(sessionId ? { session_id: sessionId } : {}) }
          : input.type === "transcript"
            ? { transcript: input.content, pause_map: input.pauseMap, ...(sessionId ? { session_id: sessionId } : {}) }
            : null;

      if (!body) { setIsLoading(false); return; }

      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.body) { setIsLoading(false); return; }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      const processLine = (line: string) => {
        const t = line.trim();
        if (!t) return;
        try {
          const ev = JSON.parse(t);
          if (ev.type === "step" && ev.step) {
            setAgentSteps((prev) => prev.map((s) => s.name === ev.step.name ? { ...s, status: ev.step.status, detail: ev.step.detail } : s));
          } else if (ev.type === "end") {
            if (ev.session_id) setSessionId(ev.session_id);
            if (ev.report) setCognitiveReport(ev.report as CognitiveReport);
            if (ev.scores) {
              console.log("RAW SCORES:", ev.scores);
              // Handle both flat ({ lexical: 0.72 }) and nested ({ lexical: { overall: 0.72 } }) shapes
              const raw = ev.scores as Record<string, number | { overall: number }>;
              const scores: Record<string, number> = {};
              for (const [key, val] of Object.entries(raw)) {
                scores[key] = typeof val === "number" ? val : val.overall;
              }
              setBiomarkerScores(scores);
              setActivations(BRAIN_REGIONS.map((r) => ({ ...r, activation: scores[AGENT_KEY[r.agent]] ?? r.activation })));
              // Save to history when we have both scores and report
              if (ev.report) {
                addEntry({
                  inputType: input.type === "transcript" ? "transcript" : "text",
                  inputSnippet: ("content" in input ? input.content : "").slice(0, 300),
                  scores,
                  report: ev.report as CognitiveReport,
                  sessionId: ev.session_id ?? "",
                  wordTimestamps: input.type === "transcript" ? input.wordTimestamps : undefined,
                  audioDuration: input.type === "transcript" ? input.duration : undefined,
                });
              }
            }
            setAgentSteps((prev) => prev.map((s) => ({ ...s, status: "done" as const })));
          } else if (ev.type === "error") {
            setAgentSteps((prev) => prev.map((s) => s.status === "running" ? { ...s, status: "error" as const } : s));
          }
        } catch { /* skip */ }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) processLine(line);
      }
      if (buffer.trim()) processLine(buffer);
    } catch (err) {
      console.error("Analysis error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, addEntry]);

  // ── Restore a history entry ──────────────────────────────────────────────────
  const handleRestore = useCallback((entry: import("@/hooks/useAnalysisHistory").HistoryEntry) => {
    setHasStarted(true);
    setBiomarkerScores(entry.scores);
    setCognitiveReport(entry.report);
    setWordTimestamps(entry.wordTimestamps);
    setAudioDuration(entry.audioDuration);
    setActivations(BRAIN_REGIONS.map((r) => ({ ...r, activation: entry.scores[AGENT_KEY[r.agent]] ?? r.activation })));
    setAgentSteps([]);
    setActivePage("analysis");
  }, []);

  // ── Shared glass style ──────────────────────────────────────────────────────
  const glassStyle: React.CSSProperties = {
    background: "var(--nt-glass)",
    backdropFilter: "blur(18px)",
    border: "1px solid var(--nt-glass-border)",
    boxShadow: "var(--nt-glass-shadow)",
  };

  return (
    <div className="relative h-screen w-full overflow-hidden">
      <NeuroTraceSplash />

      {/* Dither background */}
      <div className="fixed inset-0 z-0 h-screen w-screen">
        <Dither
          waveSpeed={0.025} waveFrequency={3} waveAmplitude={0.35}
          backgroundColor={isDark ? [0.04, 0.05, 0.09] : [1, 1, 1]}
          waveColor={isDark ? [0.78, 0.85, 0.98] : [0, 0, 0]}
          colorNum={5} pixelSize={2} enableMouseInteraction mouseRadius={1.2}
        />
      </div>

      {/* App shell */}
      <div className="relative z-10 flex h-screen w-full">
        {/* Sidebar — animated width wrapper clips the panel in/out */}
        <div
          className="shrink-0 overflow-hidden"
          style={{
            width: sidebarOpen ? 240 : 0,
            transition: "width 280ms cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          <GlassSurface
            width={240}
            height={"100%" as unknown as number}
            borderRadius={0}
            brightness={isDark ? 6 : 50}
            opacity={isDark ? 0.85 : 0.7}
            blur={14}
            className="border-r"
            style={{ borderRight: "1px solid var(--nt-divider)" } as React.CSSProperties}
            contentClassName="!p-0 !items-start !justify-start"
          >
            <NeuroSidebar
              activePage={activePage}
              onNavItemClick={(item) => setActivePage(item.title.toLowerCase())}
              onNewAnalysis={() => {
                setActivePage("analysis");
                setHasStarted(false);
                setAgentSteps([]);
                setBiomarkerScores(undefined);
                setCognitiveReport(undefined);
                setActivations(BRAIN_REGIONS);
                setWordTimestamps(undefined);
                setAudioDuration(undefined);
              }}
            />
          </GlassSurface>
        </div>

        {/* Main content — flex-1 fills whatever space the sidebar leaves */}
        <div className="flex flex-col flex-1 min-w-0">
          <SiteHeader
            title="Cognitive Analysis"
            sidebarOpen={sidebarOpen}
            onToggleSidebar={() => setSidebarOpen((o) => !o)}
            isDark={isDark}
            onToggleTheme={toggleTheme}
          />

          <div className="relative flex-1 min-h-0 overflow-hidden">

            {/* ══════ DASHBOARD VIEW ══════ */}
            <div
              className="absolute inset-0 transition-all duration-[350ms] ease-out"
              style={{
                opacity: activePage === "dashboard" ? 1 : 0,
                transform: activePage === "dashboard" ? "none" : "translateY(12px)",
                pointerEvents: activePage === "dashboard" ? "auto" : "none",
              }}
              aria-hidden={activePage !== "dashboard"}
            >
              <DashboardView
                entries={historyEntries}
                onStartAnalysis={() => {
                  setActivePage("analysis");
                  setHasStarted(false);
                }}
              />
            </div>

            {/* ══════ HISTORY VIEW ══════ */}
            <div
              className="absolute inset-0 transition-all duration-[350ms] ease-out"
              style={{
                opacity: activePage === "history" ? 1 : 0,
                transform: activePage === "history" ? "none" : "translateY(12px)",
                pointerEvents: activePage === "history" ? "auto" : "none",
              }}
              aria-hidden={activePage !== "history"}
            >
              <HistoryPanel
                entries={historyEntries}
                onRestore={handleRestore}
                onRemove={removeEntry}
                onClearAll={clearAll}
              />
            </div>

            {/* ══════ BRAIN REGIONS VIEW ══════ */}
            <div
              className="absolute inset-0 transition-all duration-[350ms] ease-out"
              style={{
                opacity: activePage === "brain regions" ? 1 : 0,
                transform: activePage === "brain regions" ? "none" : "translateY(12px)",
                pointerEvents: activePage === "brain regions" ? "auto" : "none",
              }}
              aria-hidden={activePage !== "brain regions"}
            >
              <BrainRegionsPanel />
            </div>

            {/* ══════ BIOMARKERS VIEW ══════ */}
            <div
              className="absolute inset-0 transition-all duration-[350ms] ease-out"
              style={{
                opacity: activePage === "biomarkers" ? 1 : 0,
                transform: activePage === "biomarkers" ? "none" : "translateY(12px)",
                pointerEvents: activePage === "biomarkers" ? "auto" : "none",
              }}
              aria-hidden={activePage !== "biomarkers"}
            >
              <BiomarkersPanel />
            </div>

            {/* ══════ PHASE 1 — Pre-submission + Processing ══════ */}
            <div
              className="absolute inset-0 flex flex-col items-center justify-center px-8 transition-all duration-[400ms] ease-out overflow-y-auto"
              style={{
                opacity: (hasStarted && !isLoading) || activePage === "history" || activePage === "brain regions" || activePage === "biomarkers" || activePage === "dashboard" ? 0 : 1,
                transform: hasStarted && !isLoading ? "translateY(-24px)" : "translateY(0)",
                pointerEvents: (hasStarted && !isLoading) || activePage === "history" || activePage === "brain regions" || activePage === "biomarkers" || activePage === "dashboard" ? "none" : "auto",
              }}
              aria-hidden={(hasStarted && !isLoading) || activePage === "history" || activePage === "brain regions" || activePage === "biomarkers" || activePage === "dashboard"}
            >
              <div className="w-full max-w-[42rem] flex flex-col items-center gap-5 py-8">

                {/* Title */}
                <div className="flex flex-col items-center gap-2">
                  <span
                    className="text-[30px] font-light tracking-[0.14em]"
                    style={{
                      fontFamily: "var(--font-syne), sans-serif",
                      color: "var(--nt-text-hi)",
                      textShadow: "0 0 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.14)",
                    }}
                  >
                    neurotrace
                  </span>
                  <span
                    className="text-[11px] tracking-[0.32em] uppercase font-medium"
                    style={{
                      color: "var(--nt-text-md)",
                      textShadow: "0 1px 4px rgba(0,0,0,0.12)",
                    }}
                  >
                    cognitive signature analysis
                  </span>
                </div>

                {/* Agent pipeline — appears above input while processing */}
                {agentSteps.length > 0 && (
                  <div className="w-full">
                    <ProcessingSteps steps={agentSteps} glass={glassStyle} />
                  </div>
                )}

                {/* Input panel — dimmed while agents are running */}
                <div
                  className="w-full transition-opacity duration-300"
                  style={{ opacity: isLoading ? 0.45 : 1, pointerEvents: isLoading ? "none" : "auto" }}
                >
                  <AnalysisPanel
                    onSubmit={handleSubmit}
                    isLoading={isLoading}
                    agentSteps={[]}
                    placeholder="Paste text or record speech to begin analysis…"
                  />
                </div>

              </div>
            </div>

            {/* ══════ PHASE 2 — Brain left · Report right · Input bottom ══════ */}
            <div
              className="absolute inset-0 flex flex-col gap-2.5 transition-all duration-[400ms] ease-out"
              style={{
                opacity: hasStarted && !isLoading && activePage !== "history" && activePage !== "brain regions" && activePage !== "biomarkers" && activePage !== "dashboard" ? 1 : 0,
                transform: hasStarted && !isLoading ? "none" : "translateY(24px)",
                pointerEvents: hasStarted && !isLoading && activePage !== "history" && activePage !== "brain regions" && activePage !== "biomarkers" && activePage !== "dashboard" ? "auto" : "none",
                padding: "10px",
              }}
              aria-hidden={!hasStarted || isLoading || activePage === "history" || activePage === "brain regions" || activePage === "biomarkers" || activePage === "dashboard"}
            >
              {/* ── Top row: Brain + Report ── */}
              <div className="flex gap-2.5 flex-1 min-h-0">

              {/* ── LEFT: Brain viewer (60%) ── */}
              <div className="rounded-2xl overflow-hidden relative" style={{ flex: "3 0 0%", ...glassStyle }}>
                {/* MNI badge */}
                <div className="absolute top-3 left-3 z-10 px-2 py-0.5 rounded-md text-[9px] font-semibold tracking-widest uppercase pointer-events-none"
                  style={{ background: "var(--nt-glass)", backdropFilter: "blur(8px)", color: "var(--nt-text-lo)", border: "1px solid var(--nt-glass-border)", fontFamily: "var(--font-jetbrains-mono)" }}>
                  MNI152 · 3D Atlas
                </div>

                {/* Activation legend */}
                {biomarkerScores && (
                  <div className="absolute bottom-3 left-3 z-10 flex flex-col gap-1 p-2 rounded-xl pointer-events-none"
                    style={{ background: "var(--nt-glass)", backdropFilter: "blur(8px)", border: "1px solid var(--nt-glass-border)" }}>
                    {BRAIN_REGIONS.map((r) => {
                      const score = biomarkerScores[AGENT_KEY[r.agent]] ?? 0;
                      const color = scoreColor(score * 100);
                      return (
                        <div key={r.region} className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ background: color, opacity: 0.4 + score * 0.6 }} />
                          <span className="text-[9px] uppercase tracking-wider" style={{ color: "var(--nt-text-lo)", fontFamily: "var(--font-jetbrains-mono)", minWidth: 70 }}>{r.region}</span>
                          <div className="w-12 h-0.5 rounded-full overflow-hidden" style={{ background: "var(--nt-track)" }}>
                            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${score * 100}%`, background: color }} />
                          </div>
                          <span className="text-[9px] tabular-nums w-6 text-right" style={{ color, fontFamily: "var(--font-jetbrains-mono)" }}>{Math.round(score * 100)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="absolute bottom-3 right-3 z-10 text-[9px] pointer-events-none"
                  style={{ color: "var(--nt-text-ghost)", fontFamily: "var(--font-jetbrains-mono)" }}>
                  Drag · Scroll to zoom
                </div>

                <BrainViewer activations={activations} onRegionClick={(r) => console.log("Region clicked:", r)} activeAgentName={activeAgentName} />
              </div>

              {/* ── RIGHT: Report (40%) — always visible ── */}
              <div className="rounded-2xl overflow-hidden flex flex-col" style={{ flex: "2 0 0%", ...glassStyle }}>
                <div className="flex-1 min-h-0 overflow-y-auto">
                  {cognitiveReport ? (
                    <>
                      <ReportPanel report={cognitiveReport} />
                      {wordTimestamps && wordTimestamps.length > 0 && (
                        <div className="px-1 pb-2">
                          <WaveformPanel wordTimestamps={wordTimestamps} duration={audioDuration} />
                        </div>
                      )}
                    </>
                  ) : null}
                </div>
              </div>

              </div>{/* end top row */}

              {/* ── BOTTOM CENTER: Chat input ── */}
              <div className="shrink-0 flex justify-center">
                <div style={{ width: "100%", maxWidth: 660 }}>
                  <AnalysisPanel
                    onSubmit={handleSubmit}
                    isLoading={isLoading}
                    agentSteps={[]}
                    placeholder="Analyze again or ask a follow-up…"
                  />
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
