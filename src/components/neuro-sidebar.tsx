"use client";

import * as React from "react";
import {
  Activity,
  Brain,
  Clock,
  FileText,
  HelpCircle,
  LayoutDashboard,
  Mic,
  Plus,
  Settings,
} from "lucide-react";

type NavItem = { title: string; icon: React.ComponentType<{ size?: number; className?: string }>; url: string };

type NeuroSidebarProps = {
  onNewAnalysis?: () => void;
  onNavItemClick?: (item: NavItem) => void;
  activePage?: string;
  userName?: string;
  userEmail?: string;
};

export function NeuroSidebar({
  onNewAnalysis,
  onNavItemClick,
  activePage = "analysis",
  userName = "Researcher",
  userEmail = "",
}: NeuroSidebarProps) {
  const navMain: NavItem[] = [
    { title: "New Analysis", icon: Plus, url: "#" },
    { title: "Dashboard", icon: LayoutDashboard, url: "#" },
    { title: "History", icon: Clock, url: "#" },
    { title: "Reports", icon: FileText, url: "#" },
  ];

  const navSecondary: NavItem[] = [
    { title: "Settings", icon: Settings, url: "#" },
    { title: "Get Help", icon: HelpCircle, url: "#" },
  ];

  const handleClick = (item: NavItem) => {
    if (item.title === "New Analysis") onNewAnalysis?.();
    onNavItemClick?.(item);
  };

  return (
    <aside className="flex flex-col h-full w-[240px] shrink-0 py-4 px-2 gap-1">
      {/* Logo */}
      <div className="px-3 py-3 mb-2">
        <div className="flex items-center gap-2">
          <Brain size={18} className="text-black/70" />
          <span className="text-xl font-semibold tracking-tight text-black">
            neurotrace
          </span>
        </div>
      </div>

      {/* New Analysis button */}
      <button
        onClick={() => handleClick(navMain[0])}
        className="mx-1 mb-2 flex items-center gap-2 rounded-lg bg-black/5 hover:bg-black/10 px-3 py-2 text-sm font-medium text-black/80 transition-colors"
      >
        <Mic size={14} />
        New Analysis
      </button>

      {/* Main nav */}
      <div className="flex flex-col gap-0.5 px-1">
        {navMain.slice(1).map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.title.toLowerCase();
          return (
            <button
              key={item.title}
              onClick={() => handleClick(item)}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors w-full text-left ${
                isActive
                  ? "bg-black/10 text-black font-medium"
                  : "text-black/60 hover:text-black hover:bg-black/5"
              }`}
            >
              <Icon size={15} />
              {item.title}
            </button>
          );
        })}
      </div>

      {/* Genome Analysis section label */}
      <div className="mt-4 mb-1 px-4">
        <span className="text-[10px] uppercase tracking-widest text-black/30 font-medium">
          Analysis
        </span>
      </div>
      <div className="flex flex-col gap-0.5 px-1">
        {[
          { title: "Brain Regions", icon: Brain, url: "#" },
          { title: "Biomarkers", icon: Activity, url: "#" },
          { title: "Reports", icon: FileText, url: "#" },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.title}
              onClick={() => handleClick(item)}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-black/60 hover:text-black hover:bg-black/5 transition-colors w-full text-left"
            >
              <Icon size={15} />
              {item.title}
            </button>
          );
        })}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Secondary nav */}
      <div className="flex flex-col gap-0.5 px-1 mb-2">
        {navSecondary.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.title}
              onClick={() => handleClick(item)}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-black/50 hover:text-black hover:bg-black/5 transition-colors w-full text-left"
            >
              <Icon size={15} />
              {item.title}
            </button>
          );
        })}
      </div>

      {/* User */}
      <div className="mx-1 flex items-center gap-2.5 rounded-lg px-3 py-2 hover:bg-black/5 cursor-pointer transition-colors">
        <div className="w-6 h-6 rounded-full bg-black/10 flex items-center justify-center text-xs font-medium text-black/60 shrink-0">
          {userName?.[0]?.toUpperCase() ?? "R"}
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-xs font-medium text-black/70 truncate">{userName}</span>
          {userEmail && (
            <span className="text-[10px] text-black/40 truncate">{userEmail}</span>
          )}
        </div>
      </div>
    </aside>
  );
}
