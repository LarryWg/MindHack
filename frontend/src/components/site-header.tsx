"use client";

type SiteHeaderProps = {
  title?: string;
  subtitle?: string;
};

export function SiteHeader({ title = "Cognitive Analysis", subtitle }: SiteHeaderProps) {
  return (
    <header
      className="flex items-center gap-3 px-5 h-11 shrink-0"
      style={{
        background: "rgba(252, 251, 249, 0.70)",
        borderBottom: "1px solid rgba(255,255,255,0.6)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
      }}
    >
      <div
        className="w-3.5 h-3.5 rounded-sm flex items-center justify-center"
        style={{ border: "1.5px solid rgba(0,0,0,0.25)" }}
      >
        <div className="w-1.5 h-1.5 rounded-[1px] bg-black/30" />
      </div>
      <span
        className="text-[13px] font-medium text-black/65 tracking-tight"
        style={{ fontFamily: "var(--font-dm-sans), sans-serif" }}
      >
        {title}
      </span>
      {subtitle && (
        <>
          <span className="text-black/15 text-sm">/</span>
          <span className="text-[13px] text-black/40">{subtitle}</span>
        </>
      )}
    </header>
  );
}
