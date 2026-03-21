"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { NeuroTraceSplash } from "@/components/neurotrace-splash";
import { NeuroSidebar } from "@/components/neuro-sidebar";
import { SiteHeader } from "@/components/site-header";
import { AgentCard, MOCK_AGENTS } from "@/components/agent-card";
import { AnalysisPanel, type AnalysisInput } from "@/components/analysis-panel";
import GlassSurface from "@/components/GlassSurface";

// Heavy components — dynamic, no SSR (same pattern as Callio)
const Dither = dynamic(() => import("@/components/Dither"), { ssr: false });
const BrainViewer = dynamic(
  () => import("@/components/brain-viewer").then((m) => ({ default: m.BrainViewer })),
  { ssr: false }
);

type AgentStep = { name: string; status: "pending" | "running" | "done" | "error"; detail?: string };

export default function DashboardPage() {
  const [hasStarted, setHasStarted] = useState(false);
  const [panelsOpen, setPanelsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [agentSteps, setAgentSteps] = useState<AgentStep[]>([]);
  const [activePage, setActivePage] = useState("analysis");

  // Shift+P toggles panels — same shortcut as Callio
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

  // Auto-open panels when analysis starts
  useEffect(() => {
    if (hasStarted) setPanelsOpen(true);
  }, [hasStarted]);

  const handleSubmit = useCallback(
    async (input: AnalysisInput) => {
      setHasStarted(true);
      setIsLoading(true);
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
            ? { transcript: input.content, pause_map: input.pauseMap, ...(sessionId ? { session_id: sessionId } : {}) }
            : null;

        if (!body) {
          // File upload — TODO: handle separately
          setIsLoading(false);
          return;
        }

        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!res.body) {
          setIsLoading(false);
          return;
        }

        // Stream NDJSON — same pattern as Callio's chatbot-panel
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
                  s.name === event.step.name ? { ...s, status: event.step.status, detail: event.step.detail } : s
                )
              );
            } else if (event.type === "end") {
              if (event.session_id) setSessionId(event.session_id);
              setAgentSteps((prev) => prev.map((s) => ({ ...s, status: "done" as const })));
            } else if (event.type === "error") {
              setAgentSteps((prev) => prev.map((s) => s.status === "running" ? { ...s, status: "error" as const } : s));
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
    [sessionId]
  );

  return (
    <div className="relative h-screen w-full overflow-hidden">
      {/* Splash */}
      <NeuroTraceSplash />

      {/* Dither background — fixed, full screen */}
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
            }}
          />
        </GlassSurface>

        {/* Main area */}
        <div className="flex flex-col flex-1 min-w-0">
          {/* Header */}
          <SiteHeader title="Genome Analysis" />

          {/* Content */}
          <div className="relative flex flex-1 min-h-0 flex-col items-center justify-center gap-4 px-4 pb-4">

            {/* Left agent panels */}
            <div
              className={`absolute left-4 top-4 bottom-4 flex flex-col gap-4 transition-opacity duration-300 ease-out ${
                panelsOpen ? "opacity-100" : "opacity-0 pointer-events-none"
              }`}
              style={{ width: "calc((100% - 42rem) / 2 - 2rem)" }}
            >
              {[MOCK_AGENTS[0], MOCK_AGENTS[1]].map((agent, i) => (
                <div key={i} className="flex-1 min-h-0">
                  <GlassSurface
                    width={"100%" as unknown as number}
                    height={"100%" as unknown as number}
                    borderRadius={16}
                    className="overflow-hidden h-full"
                    contentClassName="!p-0 !m-0 !items-start !justify-start"
                  >
                    <AgentCard {...agent} isLoading={isLoading && i === 0} />
                  </GlassSurface>
                </div>
              ))}
            </div>

            {/* Center — brain viewer */}
            <div className="flex-1" />
            <div
              className={`transition-all duration-500 ${
                panelsOpen ? "opacity-100" : "opacity-0"
              }`}
              style={{ width: "42rem", maxWidth: "100%" }}
            >
              {hasStarted && (
                <GlassSurface
                  width={"100%" as unknown as number}
                  height={300}
                  borderRadius={20}
                  opacity={0.6}
                  blur={14}
                  className="overflow-hidden"
                  contentClassName="!p-0"
                >
                  <BrainViewer />
                </GlassSurface>
              )}
            </div>

            {/* Right agent panels */}
            <div
              className={`absolute right-4 top-4 bottom-4 flex flex-col gap-4 transition-opacity duration-300 ease-out ${
                panelsOpen ? "opacity-100" : "opacity-0 pointer-events-none"
              }`}
              style={{ width: "calc((100% - 42rem) / 2 - 2rem)" }}
            >
              {[MOCK_AGENTS[2], MOCK_AGENTS[3]].map((agent, i) => (
                <div key={i} className="flex-1 min-h-0">
                  <GlassSurface
                    width={"100%" as unknown as number}
                    height={"100%" as unknown as number}
                    borderRadius={16}
                    className="overflow-hidden h-full"
                    contentClassName="!p-0 !m-0 !items-start !justify-start"
                  >
                    <AgentCard {...agent} isLoading={isLoading && i === 1} />
                  </GlassSurface>
                </div>
              ))}
            </div>

            {/* Bottom spacer that collapses when started — same animation as Callio */}
            <div
              className="transition-[flex-grow] duration-[1400ms] ease-in-out"
              style={{ flexGrow: hasStarted ? 0 : 1, flexShrink: 0, flexBasis: 0 }}
            />

            {/* Analysis input panel */}
            <AnalysisPanel
              onSubmit={handleSubmit}
              isLoading={isLoading}
              agentSteps={agentSteps}
              placeholder="Ask about cognitive signature analysis..."
            />

            <div
              className="transition-[flex-grow] duration-[1400ms] ease-in-out"
              style={{ flexGrow: hasStarted ? 0 : 0.5, flexShrink: 0, flexBasis: 0 }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}