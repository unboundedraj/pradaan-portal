"use client";

export function PollTicker({ items }: { items: string[] }) {
  if (!items.length) return null;

  const text = items.join("   ·   ");
  // Duplicate content for a seamless loop
  const content = `${text}   ·   ${text}`;

  return (
    <div className="border-t border-[var(--border)] bg-[var(--card)] px-0 py-2 overflow-hidden">
      <div className="flex items-center gap-3">
        <span className="shrink-0 bg-[var(--primary)] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[var(--primary-foreground)]">
          Poll results
        </span>
        <div className="flex-1 overflow-hidden">
          <p
            className="whitespace-nowrap text-xs text-[var(--muted-foreground)]"
            style={{
              display: "inline-block",
              animation: "pradaan-ticker 30s linear infinite",
            }}
          >
            {content}
          </p>
        </div>
      </div>
      <style>{`
        @keyframes pradaan-ticker {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
