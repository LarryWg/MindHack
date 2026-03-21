"use client";

import { useState, useRef } from "react";
import { Mic, MicOff, Send, Upload, ChevronDown } from "lucide-react";

export type AnalysisInput =
  | { type: "text"; content: string }
  | { type: "transcript"; content: string; pauseMap?: number[] }
  | { type: "file"; file: File };

type AnalysisAgentStep = {
  name: string;
  status: "pending" | "running" | "done" | "error";
  detail?: string;
};

type AnalysisPanelProps = {
  onSubmit?: (input: AnalysisInput) => void;
  isLoading?: boolean;
  agentSteps?: AnalysisAgentStep[];
  placeholder?: string;
};

export function AnalysisPanel({
  onSubmit,
  isLoading = false,
  agentSteps = [],
  placeholder = "Ask about cognitive signature analysis...",
}: AnalysisPanelProps) {
  const [text, setText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

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

  const toggleRecording = () => {
    setIsRecording((v) => !v);
    // TODO: wire to friend's Whisper STT flow
    // When recording stops, call: onSubmit({ type: "transcript", content: transcript, pauseMap })
  };

  const statusDot = (status: AnalysisAgentStep["status"]) => {
    if (status === "running") return "bg-amber-400 animate-pulse";
    if (status === "done") return "bg-emerald-400";
    if (status === "error") return "bg-red-400";
    return "bg-black/15";
  };

  return (
    <div className="w-full max-w-[42rem] flex flex-col gap-3">
      {/* Agent steps — shown while loading */}
      {agentSteps.length > 0 && (
        <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.55)", backdropFilter: "blur(12px)" }}>
          <div className="px-4 py-3 flex flex-col gap-1.5">
            {agentSteps.map((step, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusDot(step.status)}`} />
                <span className="text-xs text-black/50">{step.name}</span>
                {step.detail && (
                  <span className="text-xs text-black/30 ml-auto">{step.detail}</span>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex items-center gap-2 mt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-black/20 animate-pulse shrink-0" />
                <span className="text-xs text-black/30">Agent is working...</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Input box */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: "rgba(255,255,255,0.6)", backdropFilter: "blur(16px)" }}
      >
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={2}
          disabled={isLoading}
          className="w-full px-4 pt-3 pb-1 text-sm text-black/70 placeholder:text-black/30 bg-transparent resize-none outline-none"
        />
        <div className="flex items-center gap-2 px-3 pb-3 pt-1">
          {/* Model selector */}
          <button className="flex items-center gap-1 text-xs text-black/40 hover:text-black/60 transition-colors rounded-lg px-2 py-1 hover:bg-black/5">
            <div className="w-3 h-3 rounded-full bg-emerald-400" />
            GPT-4.1
            <ChevronDown size={11} />
          </button>

          {/* Mic */}
          <button
            onClick={toggleRecording}
            title={isRecording ? "Stop recording" : "Record voice"}
            className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
              isRecording
                ? "bg-red-100 text-red-500"
                : "text-black/30 hover:text-black/60 hover:bg-black/5"
            }`}
          >
            {isRecording ? <MicOff size={13} /> : <Mic size={13} />}
          </button>

          {/* File upload */}
          <button
            onClick={() => fileRef.current?.click()}
            title="Upload file"
            className="w-7 h-7 rounded-full flex items-center justify-center text-black/30 hover:text-black/60 hover:bg-black/5 transition-colors"
          >
            <Upload size={13} />
          </button>
          <input ref={fileRef} type="file" accept=".txt,.pdf,.wav,.mp3,.m4a" className="hidden" onChange={handleFile} />

          <div className="flex-1" />

          {/* Send */}
          <button
            onClick={handleSend}
            disabled={!text.trim() || isLoading}
            className="w-7 h-7 rounded-full flex items-center justify-center bg-black/80 text-white disabled:opacity-30 hover:bg-black transition-colors"
          >
            {isLoading ? (
              <div className="w-3 h-3 rounded-full border border-white/50 border-t-white animate-spin" />
            ) : (
              <Send size={12} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
