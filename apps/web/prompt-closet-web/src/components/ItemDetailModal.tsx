"use client";

import { useState } from "react";
import { X, Trash2, Edit2, Check } from "lucide-react";
import Image from "next/image";

interface ItemDetailModalProps {
  item: any;
  onClose: () => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, data: any) => void;
}

const occasionColors: Record<string, string> = {
  casual: "#7B9E87",
  office: "#4A7B9D",
  festive: "#C9A96E",
  wedding: "#C9A96E",
  party: "#B5A0C9",
  temple: "#C9847A",
  beach: "#5BA8C4",
  date: "#D4847C",
  sport: "#6B8E6B",
};

export default function ItemDetailModal({
  item,
  onClose,
  onDelete,
  onUpdate,
}: ItemDetailModalProps) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(item);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onUpdate(item.id, form);
    setSaving(false);
    setEditing(false);
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50"
        style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        onClick={onClose}
      />
      <div
        className="fixed right-0 top-0 h-full w-full max-w-md z-50 overflow-y-auto"
        style={{
          backgroundColor: "#FFFFFF",
          boxShadow: "-4px 0 32px rgba(0,0,0,0.12)",
        }}
      >
        {/* Header */}
        <div
          className="sticky top-0 bg-white z-10 px-6 py-5 flex items-center justify-between"
          style={{ borderBottom: "1px solid #E5DDD5" }}
        >
          <h2 className="font-bold text-lg" style={{ color: "#2B2B2B" }}>
            Item Details
          </h2>
          <div className="flex items-center gap-2">
            {editing ? (
              <>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white transition-all hover:opacity-90"
                  style={{ backgroundColor: "#C9847A" }}
                >
                  <Check size={15} /> {saving ? "Saving..." : "Save"}
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="p-2 rounded-lg transition-colors"
                  style={{ color: "#7A6F68", backgroundColor: "#F5F0EA" }}
                >
                  <X size={18} />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setEditing(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white transition-all hover:opacity-90"
                  style={{ backgroundColor: "#C9847A" }}
                >
                  <Edit2 size={15} /> Edit
                </button>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg transition-colors"
                  style={{ color: "#7A6F68", backgroundColor: "#F5F0EA" }}
                >
                  <X size={18} />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div
            className="relative aspect-square rounded-2xl overflow-hidden mb-6"
            style={{ backgroundColor: "#F5F0EA" }}
          >
            <Image
              src={item.image_url}
              alt={item.suggested_name || item.category}
              fill
              className="object-contain"
            />
          </div>

          {editing ? (
            <div className="space-y-4">
              <div>
                <label
                  className="block text-xs font-medium mb-1.5 uppercase tracking-wide"
                  style={{ color: "#7A6F68" }}
                >
                  Name
                </label>
                <input
                  value={form.suggested_name || ""}
                  onChange={(e) =>
                    setForm({ ...form, suggested_name: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-xl text-sm"
                  style={{
                    backgroundColor: "#F5F0EA",
                    border: "1px solid #E5DDD5",
                    color: "#2B2B2B",
                    outline: "none",
                  }}
                />
              </div>
              <div>
                <label
                  className="block text-xs font-medium mb-1.5 uppercase tracking-wide"
                  style={{ color: "#7A6F68" }}
                >
                  Category
                </label>
                <select
                  value={form.category}
                  onChange={(e) =>
                    setForm({ ...form, category: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-xl text-sm"
                  style={{
                    backgroundColor: "#F5F0EA",
                    border: "1px solid #E5DDD5",
                    color: "#2B2B2B",
                    outline: "none",
                  }}
                >
                  {[
                    "top",
                    "bottom",
                    "dress",
                    "outerwear",
                    "footwear",
                    "accessory",
                    "traditional",
                  ].map((c) => (
                    <option key={c} value={c}>
                      {c.charAt(0).toUpperCase() + c.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <>
              <h3
                className="text-xl font-bold mb-1"
                style={{ color: "#2B2B2B" }}
              >
                {item.suggested_name ||
                  `${(item.colors?.[0] || "").charAt(0).toUpperCase()}${(item.colors?.[0] || "").slice(1)} ${item.category}`}
              </h3>
              <p
                className="text-sm capitalize mb-5"
                style={{ color: "#7A6F68" }}
              >
                {item.category}
                {item.subcategory ? ` · ${item.subcategory}` : ""}
              </p>

              {item.colors?.length > 0 && (
                <div className="mb-5">
                  <p
                    className="text-xs font-medium uppercase tracking-wide mb-2"
                    style={{ color: "#7A6F68" }}
                  >
                    Colors
                  </p>
                  <p
                    className="text-sm font-medium"
                    style={{ color: "#2B2B2B" }}
                  >
                    {item.colors.join(", ")}
                  </p>
                </div>
              )}

              {item.occasions?.length > 0 && (
                <div className="mb-5">
                  <p
                    className="text-xs font-medium uppercase tracking-wide mb-2"
                    style={{ color: "#7A6F68" }}
                  >
                    Occasions
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {item.occasions.map((occ: string) => (
                      <span
                        key={occ}
                        className="px-3 py-1 rounded-full text-xs font-semibold text-white"
                        style={{
                          backgroundColor:
                            occasionColors[occ.toLowerCase()] || "#7B9E87",
                        }}
                      >
                        {occ.charAt(0).toUpperCase() + occ.slice(1)}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {item.pattern && (
                <div className="mb-5">
                  <p
                    className="text-xs font-medium uppercase tracking-wide mb-1"
                    style={{ color: "#7A6F68" }}
                  >
                    Pattern
                  </p>
                  <p
                    className="text-sm capitalize"
                    style={{ color: "#2B2B2B" }}
                  >
                    {item.pattern}
                  </p>
                </div>
              )}

              {item.fabric && (
                <div className="mb-5">
                  <p
                    className="text-xs font-medium uppercase tracking-wide mb-1"
                    style={{ color: "#7A6F68" }}
                  >
                    Fabric
                  </p>
                  <p
                    className="text-sm capitalize"
                    style={{ color: "#2B2B2B" }}
                  >
                    {item.fabric}
                  </p>
                </div>
              )}

              {item.wear_count > 0 && (
                <p className="text-sm" style={{ color: "#7A6F68" }}>
                  Worn {item.wear_count} times
                </p>
              )}
            </>
          )}

          <div className="mt-8 pt-6" style={{ borderTop: "1px solid #E5DDD5" }}>
            <button
              onClick={() => {
                if (confirm("Delete this item? This cannot be undone."))
                  onDelete(item.id);
              }}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all"
              style={{ backgroundColor: "#FEF2F2", color: "#DC2626" }}
            >
              <Trash2 size={16} /> Delete Item
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
