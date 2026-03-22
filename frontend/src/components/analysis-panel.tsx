"use client";

import { useState, useRef, useCallback } from "react";
import { Mic, MicOff, Send, Upload, ChevronDown } from "lucide-react";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";

export type WordTimestamp = { word: string; start?: number; end?: number };

export type AnalysisInput =
  | { type: "text"; content: string }
  | {
      type: "transcript";
      content: string;
      pauseMap?: number[];
      wordTimestamps?: WordTimestamp[];
      duration?: number;
    }
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
    ({
      transcript,
      pauseMap,
      wordTimestamps,
      duration,
    }: {
      transcript: string;
      pauseMap?: number[];
      wordTimestamps?: WordTimestamp[];
      duration?: number;
    }) => {
      const words = Array.isArray(wordTimestamps)
        ? wordTimestamps.map((w) => w.word).join(" ")
        : transcript;
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
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onSubmit?.({ type: "file", file });
  };

  const statusDot = (status: AgentStep["status"]) => {
    if (status === "running") return "bg-amber-400 animate-pulse";
    if (status === "done") return "bg-emerald-500";
    if (status === "error") return "bg-red-500";
    return "bg-black/20";
  };

  const statusLabel = (status: AgentStep["status"]) => {
    if (status === "running") return "text-amber-600 font-medium";
    if (status === "done") return "text-emerald-700";
    if (status === "error") return "text-red-600";
    return "text-black/40";
  };

  return (
    <div className="w-full max-w-[42rem] mx-auto flex flex-col gap-2">
      {/* Agent steps — solid white, easy to read */}
      {agentSteps.length > 0 && (
        <div
          className="rounded-xl overflow-hidden"
          style={{
            background: "rgba(252, 251, 249, 0.70)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            border: "1px solid rgba(255,255,255,0.65)",
            boxShadow: "0 2px 12px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.8)",
          }}
        >
          <div className="px-4 py-2.5 flex flex-col gap-1">
            {agentSteps.map((step, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusDot(step.status)}`} />
                <span className={`text-xs ${statusLabel(step.status)}`}>{step.name}</span>
                {step.detail && (
                  <span className="text-xs text-black/35 ml-auto">{step.detail}</span>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex items-center gap-2.5 mt-0.5 pt-1.5 border-t border-black/5">
                <span className="w-1.5 h-1.5 rounded-full bg-black/20 animate-pulse shrink-0" />
                <span className="text-xs text-black/40">Processing…</span>
              </div>
            )}
          </div>
        </div>
      )}

      {transcriptPreview && (
        <div
          className="rounded-xl px-3.5 py-2.5"
          style={{
            background: "rgba(252, 251, 249, 0.70)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            border: "1px solid rgba(255,255,255,0.65)",
            boxShadow: "0 2px 10px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.8)",
          }}
        >
          <div className="text-[10px] font-medium uppercase tracking-widest text-black/35 mb-1.5">
            Transcription
          </div>
          <div className="text-sm text-black/75 break-words leading-relaxed">{transcriptPreview}</div>
        </div>
      )}

      {/* Input — solid white */}
      <div
        className="rounded-xl overflow-hidden"
        style={{
          background: "rgba(252, 251, 249, 0.72)",
          backdropFilter: "blur(18px)",
          WebkitBackdropFilter: "blur(18px)",
          border: "1px solid rgba(255,255,255,0.68)",
          boxShadow: "0 4px 20px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,0.85)",
        }}
      >
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={2}
          disabled={isLoading}
          className="w-full px-4 pt-3 pb-1 text-sm text-black/80 placeholder:text-black/30 bg-transparent resize-none outline-none"
        />
        <div className="flex items-center gap-2 px-3 pb-2.5 pt-1">
          {/* Model badge */}
          <div
            className="flex items-center gap-1.5 text-[11px] text-black/45 rounded-lg px-2 py-1"
            style={{ background: "rgba(0,0,0,0.03)", border: "1px solid rgba(0,0,0,0.06)" }}
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
            className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
              isTranscribing
                ? "bg-blue-50 text-blue-500 border border-blue-200"
                : isRecording
                  ? "bg-red-50 text-red-500 border border-red-200"
                  : "text-black/35 hover:text-black/60 hover:bg-black/5"
            }`}
          >
            {isTranscribing ? (
              <div className="w-3 h-3 rounded-full border border-blue-400/50 border-t-blue-500 animate-spin" />
            ) : isRecording ? (
              <MicOff size={13} />
            ) : (
              <Mic size={13} />
            )}
          </button>

          {/* Recording status */}
          {(isRecording || isTranscribing) && (
            <div className="flex items-center gap-2 text-xs text-black/55">
              <span className="font-medium">{isRecording ? "Recording" : "Transcribing…"}</span>
              <span className="tabular-nums">{`00:${recordSeconds.toString().padStart(2, "0")}`}</span>
              <div className="w-14 h-1.5 bg-black/8 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all"
                  style={{ width: `${Math.round(audioLevel * 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* File upload */}
          <button
            onClick={() => fileRef.current?.click()}
            title="Upload file"
            className="w-7 h-7 rounded-full flex items-center justify-center text-black/35 hover:text-black/60 hover:bg-black/5 transition-colors"
          >
            <Upload size={13} />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".txt,.pdf,.wav,.mp3,.m4a"
            className="hidden"
            onChange={handleFile}
          />

          <div className="flex-1" />

          {/* Send */}
          <button
            onClick={handleSend}
            disabled={!text.trim() || isLoading}
            className="h-7 px-3 rounded-full flex items-center gap-1.5 text-[11px] font-medium bg-black text-white disabled:opacity-25 hover:bg-black/80 transition-colors"
          >
            {isLoading ? (
              <div className="w-3 h-3 rounded-full border border-white/40 border-t-white animate-spin" />
            ) : (
              <>
                <Send size={11} />
                <span>Analyse</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
