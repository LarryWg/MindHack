"use client";

import { useState, useRef, useCallback } from "react";
import { Mic, MicOff, Send, Upload, ChevronDown } from "lucide-react";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";

export type WordTimestamp = { word: string; start?: number; end?: number };

export type AnalysisInput =
  | { type: "text"; content: string }
  | { type: "transcript"; content: string; pauseMap?: number[]; wordTimestamps?: WordTimestamp[]; duration?: number }
  | { type: "file"; file: File };

type AgentStep = {
  name: string;
  status: "pending" | "running" | "done" | "error";
  detail?: string;
};

type AnalysisPanelProps = {
  onSubmit?: (input: AnalysisInput) => void;
  isLoading?: boolean;
  agentSteps?: AgentStep[];
  placeholder?: string;
};

const GLASS: React.CSSProperties = {
  background: "var(--nt-glass)",
  backdropFilter: "blur(18px)",
  WebkitBackdropFilter: "blur(18px)",
  border: "1px solid var(--nt-glass-border)",
  boxShadow: "var(--nt-glass-shadow)",
};

export function AnalysisPanel({
  onSubmit,
  isLoading = false,
  agentSteps = [],
  placeholder = "Ask about cognitive signature analysis…",
}: AnalysisPanelProps) {
  const [text, setText] = useState("");
  const [transcriptPreview, setTranscriptPreview] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleTranscriptReady = useCallback(
    ({ transcript, pauseMap, wordTimestamps, duration }: {
      transcript: string; pauseMap?: number[]; wordTimestamps?: WordTimestamp[]; duration?: number;
    }) => {
      const words = Array.isArray(wordTimestamps) ? wordTimestamps.map((w) => w.word).join(" ") : transcript;
      setTranscriptPreview(words || transcript);
      setText(transcript);
      onSubmit?.({ type: "transcript", content: transcript, pauseMap, wordTimestamps, duration });
    },
    [onSubmit],
  );

  const { isRecording, isTranscribing, recordSeconds, audioLevel, toggle } =
    useAudioRecorder(handleTranscriptReady);

  const handleSend = () => {
    if (!text.trim() || isLoading) return;
    onSubmit?.({ type: "text", content: text.trim() });
    setText("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onSubmit?.({ type: "file", file });
  };

  const statusDot = (s: AgentStep["status"]) => {
    if (s === "running") return "bg-amber-400 animate-pulse";
    if (s === "done")    return "bg-emerald-500";
    if (s === "error")   return "bg-red-500";
    return "";
  };

  const statusLabel = (s: AgentStep["status"]) => {
    if (s === "running") return "text-amber-500 font-medium";
    if (s === "done")    return "text-emerald-600";
    if (s === "error")   return "text-red-500";
    return "";
  };

  return (
    <div className="w-full max-w-[42rem] mx-auto flex flex-col gap-2">
      {/* Agent steps */}
      {agentSteps.length > 0 && (
        <div className="rounded-xl overflow-hidden" style={GLASS}>
          <div className="px-4 py-2.5 flex flex-col gap-1">
            {agentSteps.map((step, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusDot(step.status)}`}
                  style={step.status === "pending" ? { background: "var(--nt-track)" } : {}}
                />
                <span
                  className={`text-xs ${statusLabel(step.status)}`}
                  style={step.status === "pending" ? { color: "var(--nt-text-xs)" } : {}}
                >
                  {step.name}
                </span>
                {step.detail && (
                  <span className="text-xs ml-auto" style={{ color: "var(--nt-text-ghost)" }}>{step.detail}</span>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex items-center gap-2.5 mt-0.5 pt-1.5" style={{ borderTop: "1px solid var(--nt-divider)" }}>
                <span className="w-1.5 h-1.5 rounded-full animate-pulse shrink-0" style={{ background: "var(--nt-track)" }} />
                <span className="text-xs" style={{ color: "var(--nt-text-xs)" }}>Processing…</span>
              </div>
            )}
          </div>
        </div>
      )}

      {transcriptPreview && (
        <div className="rounded-xl px-3.5 py-2.5" style={GLASS}>
          <div className="text-[10px] font-medium uppercase tracking-widest mb-1.5" style={{ color: "var(--nt-text-xs)", fontFamily: "var(--font-jetbrains-mono)" }}>
            Transcription
          </div>
          <div className="text-sm leading-relaxed break-words" style={{ color: "var(--nt-text-lo)" }}>
            {transcriptPreview}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="rounded-xl overflow-hidden" style={GLASS}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={2}
          disabled={isLoading}
          className="w-full px-4 pt-3 pb-1 text-sm bg-transparent resize-none outline-none"
          style={{ color: "var(--nt-text-hi)" }}
        />
        <style>{`textarea { caret-color: var(--nt-text-hi); } textarea::placeholder { color: var(--nt-text-ghost) !important; }`}</style>

        <div className="flex items-center gap-2 px-3 pb-2.5 pt-1">
          {/* Model badge */}
          <div
            className="flex items-center gap-1.5 text-[11px] rounded-lg px-2 py-1"
            style={{ background: "var(--nt-hover)", border: "1px solid var(--nt-divider)", color: "var(--nt-text-xs)" }}
          >
            <div className="w-2 h-2 rounded-full bg-orange-400" />
            <span>Claude</span>
            <ChevronDown size={10} className="opacity-50" />
          </div>

          {/* Mic */}
          <button
            onClick={toggle}
            disabled={isTranscribing}
            title={isRecording ? "Stop" : isTranscribing ? "Transcribing…" : "Record"}
            className="w-7 h-7 rounded-full flex items-center justify-center transition-colors"
            style={{
              color: isTranscribing ? "rgba(99,179,237,0.85)" : isRecording ? "rgba(252,129,129,0.85)" : "var(--nt-icon)",
              background: isTranscribing ? "rgba(99,179,237,0.08)" : isRecording ? "rgba(252,129,129,0.08)" : undefined,
              border: isTranscribing ? "1px solid rgba(99,179,237,0.30)" : isRecording ? "1px solid rgba(252,129,129,0.30)" : "none",
            }}
          >
            {isTranscribing
              ? <div className="w-3 h-3 rounded-full border border-blue-400/40 border-t-blue-400 animate-spin" />
              : isRecording ? <MicOff size={13} /> : <Mic size={13} />
            }
          </button>

          {(isRecording || isTranscribing) && (
            <div className="flex items-center gap-2 text-xs" style={{ color: "var(--nt-text-lo)" }}>
              <span className="font-medium">{isRecording ? "Recording" : "Transcribing…"}</span>
              <span className="tabular-nums">{`00:${recordSeconds.toString().padStart(2, "0")}`}</span>
              <div className="w-14 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--nt-track)" }}>
                <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${Math.round(audioLevel * 100)}%` }} />
              </div>
            </div>
          )}

          {/* File upload */}
          <button
            onClick={() => fileRef.current?.click()}
            title="Upload file"
            className="nt-nav-btn w-7 h-7 rounded-full flex items-center justify-center"
          >
            <Upload size={13} />
          </button>
          <input ref={fileRef} type="file" accept=".txt,.pdf,.wav,.mp3,.m4a" className="hidden" onChange={handleFile} />

          <div className="flex-1" />

          {/* Send */}
          <button
            onClick={handleSend}
            disabled={!text.trim() || isLoading}
            className="h-7 px-3 rounded-full flex items-center gap-1.5 text-[11px] font-medium transition-colors disabled:opacity-25"
            style={{ background: "var(--nt-btn-bg)", color: "var(--nt-btn-fg)" }}
          >
            {isLoading
              ? <div className="w-3 h-3 rounded-full border-2 border-current/40 border-t-current animate-spin" />
              : <><Send size={11} /><span>Analyse</span></>
            }
          </button>
        </div>
      </div>
    </div>
  );
}
