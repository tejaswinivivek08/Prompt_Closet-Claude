"use client";

interface FilterPillProps {
  label: string;
  count?: number;
  active?: boolean;
  onClick?: () => void;
}

export default function FilterPill({
  label,
  count,
  active,
  onClick,
}: FilterPillProps) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors min-h-[36px] ${
        active
          ? "bg-rose-gold text-white"
          : "bg-white text-charcoal border border-border hover:border-rose-gold"
      }`}
    >
      {label}
      {count !== undefined && (
        <span className={`text-xs ${active ? "text-white/80" : "text-muted"}`}>
          ({count})
        </span>
      )}
    </button>
  );
}
