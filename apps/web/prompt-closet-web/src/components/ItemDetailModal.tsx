"use client";

import { useState } from "react";
import { X, Trash2, Edit2, Check, X as XIcon } from "lucide-react";
import Image from "next/image";

interface ItemDetailModalProps {
  item: any;
  onClose: () => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, data: any) => void;
}

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

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-50" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white z-50 shadow-xl overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-border p-4 flex items-center justify-between">
          <h2 className="font-bold text-charcoal">Item Details</h2>
          <div className="flex gap-2">
            {editing ? (
              <>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                >
                  <Check size={18} />
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="p-2 text-muted hover:bg-ivory rounded-lg"
                >
                  <XIcon size={18} />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setEditing(true)}
                  className="p-2 text-rose-gold hover:bg-rose-gold/10 rounded-lg"
                >
                  <Edit2 size={18} />
                </button>
                <button
                  onClick={onClose}
                  className="p-2 text-muted hover:bg-ivory rounded-lg"
                >
                  <X size={18} />
                </button>
              </>
            )}
          </div>
        </div>

        <div className="p-4">
          <div className="relative aspect-square bg-ivory rounded-lg overflow-hidden mb-4">
            <Image
              src={item.image_url}
              alt={item.suggested_name}
              fill
              className="object-contain"
            />
          </div>

          {editing ? (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted uppercase">
                  Name
                </label>
                <input
                  value={form.suggested_name || ""}
                  onChange={(e) =>
                    setForm({ ...form, suggested_name: e.target.value })
                  }
                  className="w-full mt-1 px-3 py-2 border border-border rounded-lg text-charcoal"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted uppercase">
                  Category
                </label>
                <select
                  value={form.category}
                  onChange={(e) =>
                    setForm({ ...form, category: e.target.value })
                  }
                  className="w-full mt-1 px-3 py-2 border border-border rounded-lg text-charcoal"
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
              <h3 className="text-lg font-bold text-charcoal mb-1">
                {item.suggested_name ||
                  `${(item.colors?.[0] || "").charAt(0).toUpperCase()}${(item.colors?.[0] || "").slice(1)} ${item.category}`}
              </h3>
              <p className="text-sm text-muted capitalize mb-4">
                {item.category}
                {item.subcategory ? ` · ${item.subcategory}` : ""}
              </p>

              {item.colors && item.colors.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-medium text-muted uppercase mb-2">
                    Colors
                  </p>
                  <p className="text-sm text-charcoal">
                    {item.colors.join(", ")}
                  </p>
                </div>
              )}

              {item.occasions && item.occasions.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-medium text-muted uppercase mb-2">
                    Occasions
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {item.occasions.map((occ: string) => (
                      <span
                        key={occ}
                        className="px-3 py-1 rounded-full text-xs font-medium text-white"
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
                <div className="mb-4">
                  <p className="text-xs font-medium text-muted uppercase mb-1">
                    Pattern
                  </p>
                  <p className="text-sm text-charcoal capitalize">
                    {item.pattern}
                  </p>
                </div>
              )}

              {item.fabric && (
                <div className="mb-4">
                  <p className="text-xs font-medium text-muted uppercase mb-1">
                    Fabric
                  </p>
                  <p className="text-sm text-charcoal capitalize">
                    {item.fabric}
                  </p>
                </div>
              )}

              {item.wear_count !== undefined && item.wear_count > 0 && (
                <p className="text-sm text-muted mb-4">
                  Worn {item.wear_count} times
                </p>
              )}
            </>
          )}

          <div className="mt-6 pt-4 border-t border-border">
            <button
              onClick={() => {
                if (confirm("Delete this item?")) onDelete(item.id);
              }}
              className="w-full flex items-center justify-center gap-2 py-3 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
            >
              <Trash2 size={16} />
              Delete Item
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
