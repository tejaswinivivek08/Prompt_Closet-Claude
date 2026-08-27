"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2 } from "lucide-react";
import StyleBuilder from "./StyleBuilder";
import type {
  SavedStyle,
  WardrobeItemBasic,
  StyleBuilderSavePayload,
} from "./types";

interface MyStylesGalleryProps {
  wardrobeItems: WardrobeItemBasic[];
  userId: string;
}

function LookCard({
  look,
  onEdit,
  onDelete,
}: {
  look: SavedStyle;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const previewItems = look.item_layers.slice(0, 4);

  return (
    <div
      className="rounded-2xl overflow-hidden cursor-pointer transition-all hover:shadow-md"
      style={{
        backgroundColor: "#FFFFFF",
        border: "1px solid #F0EBE6",
        boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
      }}
      onClick={onEdit}
    >
      {/* Thumbnail: up to 4 item photos in a grid */}
      <div
        className="grid gap-0.5"
        style={{
          height: 120,
          backgroundColor: "#F5F0EA",
          gridTemplateColumns: previewItems.length > 1 ? "1fr 1fr" : "1fr",
        }}
      >
        {previewItems.length === 0 ? (
          <div className="flex items-center justify-center">
            <span className="text-2xl">👗</span>
          </div>
        ) : (
          previewItems.map((layer) => (
            <div key={layer.item_id} className="overflow-hidden">
              <img
                src={layer.image_url}
                alt=""
                className="w-full h-full object-cover"
              />
            </div>
          ))
        )}
      </div>

      <div className="p-3">
        <p
          className="font-semibold text-sm truncate mb-1.5"
          style={{ color: "#2B2B2B" }}
        >
          {look.name}
        </p>

        {look.tags.length > 0 && (
          <div className="flex gap-1 flex-wrap mb-2">
            {look.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 rounded-full text-xs font-medium"
                style={{
                  backgroundColor: "rgba(201,132,122,0.1)",
                  color: "#C9847A",
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <button
          onClick={(e) => {
            e.stopPropagation();
            if (confirmDelete) {
              onDelete();
            } else {
              setConfirmDelete(true);
            }
          }}
          className="flex items-center gap-1 text-xs mt-1 hover:opacity-70 transition-opacity"
          style={{ color: confirmDelete ? "#EF4444" : "#7A6F68" }}
        >
          <Trash2 size={11} />
          {confirmDelete ? "Confirm delete" : "Delete"}
        </button>
      </div>
    </div>
  );
}

export default function MyStylesGallery({
  wardrobeItems,
  userId: _userId,
}: MyStylesGalleryProps) {
  const [looks, setLooks] = useState<SavedStyle[]>([]);
  const [loading, setLoading] = useState(true);
  // undefined = gallery, null = new look, SavedStyle = edit existing
  const [editingLook, setEditingLook] = useState<SavedStyle | null | undefined>(
    undefined,
  );

  useEffect(() => {
    fetch("/api/saved-styles")
      .then((r) => r.json())
      .then((data) => {
        setLooks(data.styles ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSave = async (payload: StyleBuilderSavePayload) => {
    if (editingLook && "id" in editingLook) {
      const res = await fetch(`/api/saved-styles/${editingLook.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const { style } = await res.json();
      setLooks((prev) =>
        prev.map((l) => (l.id === editingLook.id ? style : l)),
      );
    } else {
      const res = await fetch("/api/saved-styles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const { style } = await res.json();
      setLooks((prev) => [style, ...prev]);
    }
    setEditingLook(undefined);
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/saved-styles/${id}`, { method: "DELETE" });
    setLooks((prev) => prev.filter((l) => l.id !== id));
  };

  if (editingLook !== undefined) {
    return (
      <StyleBuilder
        wardrobeItems={wardrobeItems}
        initialLook={editingLook}
        onSave={handleSave}
        onBack={() => setEditingLook(undefined)}
      />
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold" style={{ color: "#2B2B2B" }}>
            My Styles
          </h2>
          <p className="text-sm" style={{ color: "#7A6F68" }}>
            {looks.length} saved look{looks.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => setEditingLook(null)}
          className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold text-white"
          style={{
            backgroundColor: "#C9847A",
            boxShadow: "0 4px 16px rgba(201,132,122,0.35)",
          }}
        >
          <Plus size={16} />
          New Look
        </button>
      </div>

      {loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="rounded-2xl animate-pulse"
              style={{
                height: 180,
                backgroundColor: "#FFFFFF",
                border: "1px solid #F0EBE6",
              }}
            />
          ))}
        </div>
      )}

      {!loading && looks.length === 0 && (
        <div
          className="rounded-2xl p-12 flex flex-col items-center justify-center text-center"
          style={{
            backgroundColor: "#FFFFFF",
            border: "1px dashed #E5DDD5",
          }}
        >
          <span className="text-4xl mb-4">👗</span>
          <p className="font-semibold mb-1" style={{ color: "#2B2B2B" }}>
            No looks yet
          </p>
          <p className="text-sm mb-4" style={{ color: "#7A6F68" }}>
            Tap + New Look to style your first outfit on the mannequin
          </p>
          <button
            onClick={() => setEditingLook(null)}
            className="px-5 py-2.5 rounded-full text-sm font-semibold text-white"
            style={{ backgroundColor: "#C9847A" }}
          >
            Create First Look
          </button>
        </div>
      )}

      {!loading && looks.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {looks.map((look) => (
            <LookCard
              key={look.id}
              look={look}
              onEdit={() => setEditingLook(look)}
              onDelete={() => handleDelete(look.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
