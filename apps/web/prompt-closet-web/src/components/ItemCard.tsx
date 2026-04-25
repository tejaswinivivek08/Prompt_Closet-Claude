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
      className="rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 hover:-translate-y-1"
      style={{
        backgroundColor: "#FFFFFF",
        boxShadow: hovering
          ? "0 8px 24px rgba(0,0,0,0.12)"
          : "0 2px 16px rgba(0,0,0,0.05)",
        border: "1px solid #F0EBE6",
      }}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onClick={onClick}
    >
      {/* Photo */}
      <div
        className="relative aspect-square"
        style={{ backgroundColor: "#F5F0EA" }}
      >
        <img
          src={item.image_url}
          alt={item.suggested_name || item.category}
          className="object-cover w-full h-full"
        />

        {/* Hover overlay with Edit/Delete */}
        {hovering && (
          <div
            className="absolute inset-0 flex items-center justify-center gap-2"
            style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClick();
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: "#C9847A" }}
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
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: "#DC2626" }}
              >
                Delete
              </button>
            )}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <p
          className="font-semibold text-sm truncate mb-1"
          style={{ color: "#2B2B2B" }}
        >
          {item.suggested_name || item.category}
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="text-xs font-medium px-2 py-0.5 rounded-full capitalize"
            style={{
              backgroundColor: "rgba(201,132,122,0.1)",
              color: "#C9847A",
            }}
          >
            {item.category}
          </span>
          {item.colors?.slice(0, 3).map((color: string) => (
            <div
              key={color}
              className="w-4 h-4 rounded-full border"
              style={{ backgroundColor: color, borderColor: "#E5DDD5" }}
              title={color}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
