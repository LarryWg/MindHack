"use client";

type SiteHeaderProps = {
  title?: string;
  subtitle?: string;
};

export function SiteHeader({ title = "Genome Analysis", subtitle }: SiteHeaderProps) {
  return (
    <header className="flex items-center gap-3 px-4 h-12 border-b border-black/5 shrink-0">
      <div className="w-4 h-4 rounded border border-black/20 flex items-center justify-center">
        <div className="w-2 h-2 rounded-[1px] bg-black/30" />
      </div>
      <span className="text-sm text-black/60">{title}</span>
      {subtitle && (
        <>
          <span className="text-black/20">/</span>
          <span className="text-sm text-black/40">{subtitle}</span>
        </>
      )}
    </header>
  );
}
