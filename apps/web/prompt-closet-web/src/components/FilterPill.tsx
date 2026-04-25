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
      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all min-h-[36px]"
      style={{
        backgroundColor: active ? "#C9847A" : "#FFFFFF",
        color: active ? "#FFFFFF" : "#2B2B2B",
        border: active ? "none" : "1px solid #E5DDD5",
        boxShadow: active ? "0 2px 8px rgba(201,132,122,0.3)" : "none",
      }}
    >
      {label}
      {count !== undefined && (
        <span
          style={{
            color: active ? "rgba(255,255,255,0.8)" : "#7A6F68",
            fontSize: 11,
          }}
        >
          ({count})
        </span>
      )}
    </button>
  );
}
