"use client";

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
      className="overflow-hidden cursor-pointer transition-all hover:-translate-y-1 hover:shadow-lg"
      style={{
        backgroundColor: "#FFFFFF",
        borderRadius: 12,
        boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
        border: "1px solid #F0EBE6",
      }}
    >
      <div
        className="relative aspect-square"
        style={{ backgroundColor: "#F5F0EA" }}
      >
        <img
          src={item.image_url}
          alt={item.suggested_name || item.category}
          className="object-cover w-full h-full"
        />
      </div>
      <div className="p-3">
        <span
          className="text-xs font-medium capitalize"
          style={{ color: "#C9847A" }}
        >
          {item.category}
        </span>
        {item.colors && item.colors.length > 0 && (
          <div className="flex gap-1 mt-1">
            {item.colors.slice(0, 3).map((color) => (
              <div
                key={color}
                className="rounded-full"
                style={{
                  width: 12,
                  height: 12,
                  backgroundColor: colorMap[color.toLowerCase()] || "#ccc",
                  border: "1px solid #E5DDD5",
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
