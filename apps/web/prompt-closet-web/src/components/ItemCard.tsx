"use client";

import Image from "next/image";

interface ItemCardProps {
  item: {
    id: string;
    image_url: string;
    category: string;
    colors: string[];
    occasions: string[];
    suggested_name?: string;
  };
  onClick?: () => void;
}

const colorMap: Record<string, string> = {
  navy: "#1a237e",
  black: "#1a1a1a",
  white: "#f5f5f5",
  red: "#c62828",
  blue: "#1565c0",
  green: "#2e7d32",
  yellow: "#f9a825",
  orange: "#ef6c00",
  pink: "#ec407a",
  purple: "#7b1fa2",
  brown: "#4e342e",
  grey: "#616161",
  gray: "#616161",
  cream: "#fffdd0",
  beige: "#f5f5dc",
  maroon: "#800000",
  olive: "#808000",
  coral: "#ff7f50",
  burgundy: "#800020",
  gold: "#ffd700",
};

export default function ItemCard({ item, onClick }: ItemCardProps) {
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-card border border-border overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
    >
      <div className="relative aspect-square bg-ivory">
        <Image
          src={item.image_url}
          alt={item.suggested_name || item.category}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
        />
      </div>
      <div className="p-3">
        <div className="flex items-center gap-1 mb-1">
          <span className="text-xs font-medium text-rose-gold capitalize">
            {item.category}
          </span>
        </div>
        {item.colors && item.colors.length > 0 && (
          <div className="flex gap-1">
            {item.colors.slice(0, 3).map((color) => (
              <div
                key={color}
                className="w-3 h-3 rounded-full border border-border"
                style={{
                  backgroundColor: colorMap[color.toLowerCase()] || "#ccc",
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
