"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { NeuroTraceSplash } from "@/components/neurotrace-splash";
import { NeuroSidebar } from "@/components/neuro-sidebar";
import { SiteHeader } from "@/components/site-header";
import { AgentCard, MOCK_AGENTS } from "@/components/agent-card";
import { AnalysisPanel, type AnalysisInput } from "@/components/analysis-panel";
import { NeuroRadarChart } from "@/components/radar-chart";
import GlassSurface from "@/components/GlassSurface";
import type { RegionActivation } from "@/components/brain-viewer";

// Brain regions: MNI coords are fixed from neuroimaging literature.
// Agents only control activation intensity (0–1).
const BRAIN_REGIONS: RegionActivation[] = [
  { region: "Broca's area",    mni: [-44, 20, 8],    activation: 0.72, agent: "Lexical"   },
  { region: "Wernicke's area", mni: [-54, -40, 14],  activation: 0.58, agent: "Semantic"  },
  { region: "DLPFC",           mni: [-46, 20, 32],   activation: 0.83, agent: "Syntax"    },
  { region: "SMA",             mni: [0, -4, 60],     activation: 0.44, agent: "Prosody"   },
  { region: "Amygdala",        mni: [-24, -4, -22],  activation: 0.31, agent: "Affective" },
];

const AGENT_TO_SCORE_KEY: Record<string, string> = {
  Lexical: "lexical",
  Semantic: "semantic",
  Prosody: "prosody",
  Syntax: "syntax",
  Affective: "affective",
};

// Heavy components — client only, no SSR
const Dither = dynamic(() => import("@/components/Dither"), { ssr: false });
const BrainViewer = dynamic(() => import("@/components/brain-viewer"), { ssr: false });

type AgentStep = {
  name: string;
  status: "pending" | "running" | "done" | "error";
  detail?: string;
};

export default function DashboardPage() {
  const [hasStarted, setHasStarted] = useState(false);
  const [panelsOpen, setPanelsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [agentSteps, setAgentSteps] = useState<AgentStep[]>([]);
  const [activations, setActivations] = useState<RegionActivation[]>(BRAIN_REGIONS);
  const [biomarkerScores, setBiomarkerScores] = useState<Record<string, number> | undefined>();
  const [activePage, setActivePage] = useState("analysis");

  const activeAgentName = useMemo(() => {
    const running = agentSteps.find((s) => s.status === "running");
    if (!running) return undefined;
    const map: Record<string, string> = {
      "Lexical agent": "Lexical",
      "Semantic agent": "Semantic",
      "Prosody agent": "Prosody",
      "Syntax agent": "Syntax",
    };
    return map[running.name];
  }, [agentSteps]);

  // Shift+P toggles side panels
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey && e.key === "P") {
        e.preventDefault();
        setPanelsOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (hasStarted) setPanelsOpen(true);
  }, [hasStarted]);

  const handleSubmit = useCallback(
    async (input: AnalysisInput) => {
      setHasStarted(true);
      setIsLoading(true);
      setBiomarkerScores(undefined);
      setActivations(BRAIN_REGIONS); // reset to defaults while loading
      setAgentSteps([
        { name: "STT preprocessor", status: "running" },
        { name: "Lexical agent", status: "pending" },
        { name: "Semantic agent", status: "pending" },
        { name: "Prosody agent", status: "pending" },
        { name: "Syntax agent", status: "pending" },
        { name: "Biomarker mapper", status: "pending" },
        { name: "Report composer", status: "pending" },
      ]);

      try {
        const body =
          input.type === "text"
            ? { input_value: input.content, ...(sessionId ? { session_id: sessionId } : {}) }
            : input.type === "transcript"
              ? {
                  transcript: input.content,
                  pause_map: input.pauseMap,
                  ...(sessionId ? { session_id: sessionId } : {}),
                }
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
          const trimmed = line.trim();
          if (!trimmed) return;
          try {
            const event = JSON.parse(trimmed);
            if (event.type === "step" && event.step) {
              setAgentSteps((prev) =>
                prev.map((s) =>
                  s.name === event.step.name
                    ? { ...s, status: event.step.status, detail: event.step.detail }
                    : s,
                ),
              );
            } else if (event.type === "end") {
              if (event.session_id) setSessionId(event.session_id);
              if (event.scores) {
                const scores = event.scores as Record<string, number>;
                setBiomarkerScores(scores);
                setActivations(
                  BRAIN_REGIONS.map((r) => ({
                    ...r,
                    activation: scores[AGENT_TO_SCORE_KEY[r.agent]] ?? r.activation,
                  })),
                );
              }
              setAgentSteps((prev) => prev.map((s) => ({ ...s, status: "done" as const })));
            } else if (event.type === "error") {
              setAgentSteps((prev) =>
                prev.map((s) =>
                  s.status === "running" ? { ...s, status: "error" as const } : s,
                ),
              );
            }
          } catch {
            // skip unparseable lines
          }
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
    },
    [sessionId],
  );

  return (
    <div className="relative h-screen w-full overflow-hidden">
      <NeuroTraceSplash />

      {/* Dither background */}
      <div className="fixed inset-0 z-0 h-screen w-screen">
        <Dither
          waveSpeed={0.02}
          waveFrequency={3}
          waveAmplitude={0.3}
          backgroundColor={[1, 1, 1]}
          waveColor={[0, 0, 0]}
          colorNum={4}
          pixelSize={2}
          enableMouseInteraction
          mouseRadius={1.2}
        />
      </div>

      {/* App shell */}
      <div className="relative z-10 flex h-screen w-full">
        {/* Sidebar */}
        <GlassSurface
          width={240}
          height={"100%" as unknown as number}
          borderRadius={0}
          opacity={0.7}
          blur={14}
          className="shrink-0 border-r border-black/5"
          contentClassName="!p-0 !items-start !justify-start"
        >
          <NeuroSidebar
            activePage={activePage}
            onNavItemClick={(item) => setActivePage(item.title.toLowerCase())}
            onNewAnalysis={() => {
              setActivePage("analysis");
              setHasStarted(false);
              setPanelsOpen(false);
              setAgentSteps([]);
              setBiomarkerScores(undefined);
              setActivations(BRAIN_REGIONS);
            }}
          />
        </GlassSurface>

        {/* Main area */}
        <div className="flex flex-col flex-1 min-w-0">
          <SiteHeader title="Cognitive Analysis" />

          <div className="relative flex-1 min-h-0 overflow-hidden">
            {/* ═══ PHASE 1: Pre-submission ═══ */}
            <div
              className="absolute inset-0 flex flex-col items-center justify-center px-6 transition-all duration-[400ms] ease-out"
              style={{
                opacity: hasStarted ? 0 : 1,
                transform: hasStarted ? "translateY(-20px)" : "translateY(0)",
                pointerEvents: hasStarted ? "none" : "auto",
              }}
              aria-hidden={hasStarted}
            >
              <div className="mb-8 flex flex-col items-center gap-2" aria-hidden="true">
                <span
                  className="text-[28px] font-light tracking-[0.12em] text-black/15"
                  style={{ fontFamily: "var(--font-syne), sans-serif" }}
                >
                  neurotrace
                </span>
                <span className="text-[11px] tracking-[0.3em] uppercase text-black/15 font-medium">
                  cognitive signature analysis
                </span>
              </div>
              <AnalysisPanel
                onSubmit={handleSubmit}
                isLoading={isLoading}
                agentSteps={[]}
                placeholder="Paste text or record speech to begin analysis…"
              />
            </div>

            {/* ═══ PHASE 2: Post-submission ═══ */}
            <div
              className="absolute inset-0 grid transition-all duration-[400ms] ease-out"
              style={{
                opacity: hasStarted ? 1 : 0,
                transform: hasStarted ? "translateY(0)" : "translateY(20px)",
                pointerEvents: hasStarted ? "auto" : "none",
                gridTemplateColumns: "1fr 2.4fr 1fr",
                gridTemplateRows: "1fr",
                gap: "12px",
                padding: "12px",
              }}
              aria-hidden={!hasStarted}
            >
              {/* Left column — Lexical + Semantic agents */}
              <div
                className="flex-col gap-3 min-h-0 hidden min-[1200px]:flex"
                style={{
                  opacity: panelsOpen ? 1 : 0,
                  transition: "opacity 300ms ease-out",
                }}
              >
                {[MOCK_AGENTS[0], MOCK_AGENTS[1]].map((agent, i) => (
                  <div key={agent.agentName} className="flex-1 min-h-0">
                    <GlassSurface
                      width={"100%" as unknown as number}
                      height={"100%" as unknown as number}
                      borderRadius={16}
                      className="overflow-hidden h-full"
                      contentClassName="!p-0 !m-0 !items-start !justify-start"
                    >
                      <AgentCard
                        {...agent}
                        isActive={isLoading && activeAgentName === agent.agentName.replace(" Agent", "")}
                        isLoading={isLoading && i === 0 && !biomarkerScores}
                      />
                    </GlassSurface>
                  </div>
                ))}
              </div>

              {/* Center column — Brain + Radar + Input */}
              <div className="flex flex-col gap-3 min-h-0 col-span-full min-[1200px]:col-span-1">
                {/* 3D Brain viewer (NiiVue) */}
                <div className="flex-1 min-h-0 rounded-[20px] overflow-hidden bg-black/[0.03] border border-black/[0.04]">
                  <BrainViewer
                    activations={activations}
                    activeAgentName={activeAgentName}
                  />
                </div>

                {/* Radar chart */}
                <GlassSurface
                  width={"100%" as unknown as number}
                  height={180}
                  borderRadius={16}
                  opacity={0.55}
                  blur={12}
                  className="overflow-hidden shrink-0"
                  contentClassName="!p-0"
                >
                  <div className="p-3 h-full flex flex-col">
                    <span className="text-[10px] uppercase tracking-widest text-black/30 font-medium mb-1">
                      Cognitive Domains
                    </span>
                    <NeuroRadarChart scores={biomarkerScores} isLoading={isLoading} />
                  </div>
                </GlassSurface>

                {/* Analysis input */}
                <div className="shrink-0">
                  <AnalysisPanel
                    onSubmit={handleSubmit}
                    isLoading={isLoading}
                    agentSteps={agentSteps}
                    placeholder="Ask about cognitive signature analysis…"
                  />
                </div>
              </div>

              {/* Right column — Prosody + Syntax agents */}
              <div
                className="flex-col gap-3 min-h-0 hidden min-[1200px]:flex"
                style={{
                  opacity: panelsOpen ? 1 : 0,
                  transition: "opacity 300ms ease-out",
                }}
              >
                {[MOCK_AGENTS[2], MOCK_AGENTS[3]].map((agent, i) => (
                  <div key={agent.agentName} className="flex-1 min-h-0">
                    <GlassSurface
                      width={"100%" as unknown as number}
                      height={"100%" as unknown as number}
                      borderRadius={16}
                      className="overflow-hidden h-full"
                      contentClassName="!p-0 !m-0 !items-start !justify-start"
                    >
                      <AgentCard
                        {...agent}
                        isActive={isLoading && activeAgentName === agent.agentName.replace(" Agent", "")}
                        isLoading={isLoading && i === 1 && !biomarkerScores}
                      />
                    </GlassSurface>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
