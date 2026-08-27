"use client";

import { useState } from "react";

interface ItemCardProps {
  item: {
    id: string;
    image_url: string;
    category: string;
    colors: string[];
    occasions?: string[];
    suggested_name?: string;
    image_urls?: string[];
  };
  onClick: () => void;
  onDelete?: (id: string) => void;
}

export default function ItemCard({ item, onClick, onDelete }: ItemCardProps) {
  const [hovering, setHovering] = useState(false);

  return (
    <div
      className="rounded-2xl overflow-hidden cursor-pointer transition-all duration-200"
      style={{
        backgroundColor: "#FFFFFF",
        boxShadow: hovering
          ? "0 12px 32px rgba(0,0,0,0.13)"
          : "0 2px 12px rgba(0,0,0,0.06)",
        border: "1px solid #F0EBE6",
        transform: hovering ? "translateY(-3px)" : "translateY(0)",
      }}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onClick={onClick}
    >
      {/* Photo */}
      <div
        className="relative"
        style={{ paddingBottom: "110%", backgroundColor: "#F5F0EA" }}
      >
        <img
          src={item.image_url}
          alt={item.suggested_name || item.category}
          className="absolute inset-0 object-cover w-full h-full"
        />

        {/* Category pill top-left */}
        <div className="absolute top-2 left-2">
          <span
            className="px-2 py-0.5 rounded-full text-xs font-semibold capitalize"
            style={{
              backgroundColor: "rgba(255,255,255,0.9)",
              color: "#C9847A",
              backdropFilter: "blur(4px)",
            }}
          >
            {item.category}
          </span>
        </div>

        {/* Color dots top-right */}
        {item.colors && item.colors.length > 0 && (
          <div className="absolute top-2 right-2 flex gap-1">
            {item.colors.slice(0, 3).map((color: string) => (
              <div
                key={color}
                className="rounded-full border-2"
                style={{
                  width: 14,
                  height: 14,
                  backgroundColor: color,
                  borderColor: "rgba(255,255,255,0.8)",
                }}
              />
            ))}
          </div>
        )}

        {/* Hover overlay */}
        {hovering && (
          <div
            className="absolute inset-0 flex items-end justify-center pb-4 gap-2"
            style={{ backgroundColor: "rgba(0,0,0,0.35)" }}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClick();
              }}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white transition-opacity hover:opacity-90 active:scale-95"
              style={{
                backgroundColor: "#C9847A",
                boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
              }}
            >
              Edit
            </button>
            {onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm("Delete this item? This cannot be undone.")) {
                    onDelete(item.id);
                  }
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white transition-opacity hover:opacity-90 active:scale-95"
                style={{
                  backgroundColor: "#DC2626",
                  boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
                }}
              >
                Delete
              </button>
            )}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="px-3 py-2.5">
        <p
          className="font-semibold text-sm truncate"
          style={{ color: "#2B2B2B" }}
        >
          {item.suggested_name || item.category}
        </p>
        {item.occasions && item.occasions.length > 0 && (
          <p className="text-xs truncate mt-0.5" style={{ color: "#7A6F68" }}>
            {item.occasions.slice(0, 2).join(" · ")}
          </p>
        )}
      </div>
    </div>
  );
}
