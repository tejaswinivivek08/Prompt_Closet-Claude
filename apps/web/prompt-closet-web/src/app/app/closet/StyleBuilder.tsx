"use client";

import { useState, useRef, useCallback } from "react";
import { X, ChevronLeft, ChevronUp, ChevronDown } from "lucide-react";
import MannequinSvg from "./MannequinSvg";
import type {
  LayerState,
  SavedStyle,
  WardrobeItemBasic,
  StyleBuilderSavePayload,
} from "./types";

const CANVAS_W = 300;
const CANVAS_H = 500;
const ITEM_CATEGORIES = [
  "All",
  "Top",
  "Bottom",
  "Dress",
  "Traditional",
  "Outerwear",
  "Footwear",
  "Accessory",
];
const LOOK_TAGS = [
  "Casual",
  "Party",
  "Date",
  "Office",
  "Festive",
  "Travel",
  "Weekend",
  "Formal",
];

interface StyleBuilderProps {
  wardrobeItems: WardrobeItemBasic[];
  initialLook: SavedStyle | null;
  onSave: (payload: StyleBuilderSavePayload) => Promise<void>;
  onBack: () => void;
}

export default function StyleBuilder({
  wardrobeItems,
  initialLook,
  onSave,
  onBack,
}: StyleBuilderProps) {
  const [gender, setGender] = useState<"female" | "male">(
    initialLook?.gender ?? "female",
  );
  const [layers, setLayers] = useState<LayerState[]>(
    initialLook?.item_layers ?? [],
  );
  const [selectedLayerItemId, setSelectedLayerItemId] = useState<string | null>(
    null,
  );
  const [catFilter, setCatFilter] = useState("All");
  const [showSaveSheet, setShowSaveSheet] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lookName, setLookName] = useState(initialLook?.name ?? "");
  const [selectedTags, setSelectedTags] = useState<string[]>(
    initialLook?.tags ?? [],
  );
  const [notes, setNotes] = useState(initialLook?.notes ?? "");

  const dragging = useRef<{
    itemId: string;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);
  const resizing = useRef<{
    itemId: string;
    startX: number;
    startY: number;
    origW: number;
    origH: number;
  } | null>(null);

  const filteredItems =
    catFilter === "All"
      ? wardrobeItems
      : wardrobeItems.filter(
          (i) => i.category.toLowerCase() === catFilter.toLowerCase(),
        );

  const addItem = (item: WardrobeItemBasic) => {
    if (layers.some((l) => l.item_id === item.id)) return;
    const newLayer: LayerState = {
      item_id: item.id,
      image_url: item.image_url,
      x: CANVAS_W / 2 - 60,
      y: CANVAS_H / 2 - 80,
      width: 120,
      height: 160,
      z_index: layers.length + 1,
    };
    setLayers((prev) => [...prev, newLayer]);
    setSelectedLayerItemId(item.id);
  };

  const removeLayer = (itemId: string) => {
    setLayers((prev) => prev.filter((l) => l.item_id !== itemId));
    if (selectedLayerItemId === itemId) setSelectedLayerItemId(null);
  };

  const updateLayer = (itemId: string, patch: Partial<LayerState>) => {
    setLayers((prev) =>
      prev.map((l) => (l.item_id === itemId ? { ...l, ...patch } : l)),
    );
  };

  const bringForward = (itemId: string) => {
    const layer = layers.find((l) => l.item_id === itemId);
    if (!layer) return;
    const above = layers.find((l) => l.z_index === layer.z_index + 1);
    if (above) updateLayer(above.item_id, { z_index: above.z_index - 1 });
    updateLayer(itemId, { z_index: layer.z_index + 1 });
  };

  const sendBack = (itemId: string) => {
    const layer = layers.find((l) => l.item_id === itemId);
    if (!layer || layer.z_index <= 1) return;
    const below = layers.find((l) => l.z_index === layer.z_index - 1);
    if (below) updateLayer(below.item_id, { z_index: below.z_index + 1 });
    updateLayer(itemId, { z_index: layer.z_index - 1 });
  };

  const onCanvasPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (dragging.current) {
        const dx = e.clientX - dragging.current.startX;
        const dy = e.clientY - dragging.current.startY;
        updateLayer(dragging.current.itemId, {
          x: dragging.current.origX + dx,
          y: dragging.current.origY + dy,
        });
      }
      if (resizing.current) {
        const dx = e.clientX - resizing.current.startX;
        const dy = e.clientY - resizing.current.startY;
        updateLayer(resizing.current.itemId, {
          width: Math.max(40, resizing.current.origW + dx),
          height: Math.max(40, resizing.current.origH + dy),
        });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [layers],
  );

  const onCanvasPointerUp = useCallback(() => {
    dragging.current = null;
    resizing.current = null;
  }, []);

  const startDrag = (e: React.PointerEvent, layer: LayerState) => {
    e.stopPropagation();
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    setSelectedLayerItemId(layer.item_id);
    dragging.current = {
      itemId: layer.item_id,
      startX: e.clientX,
      startY: e.clientY,
      origX: layer.x,
      origY: layer.y,
    };
  };

  const startResize = (e: React.PointerEvent, layer: LayerState) => {
    e.stopPropagation();
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    resizing.current = {
      itemId: layer.item_id,
      startX: e.clientX,
      startY: e.clientY,
      origW: layer.width,
      origH: layer.height,
    };
  };

  const handleSave = async () => {
    if (!lookName.trim()) return;
    setSaving(true);
    try {
      await onSave({
        name: lookName.trim(),
        tags: selectedTags,
        notes,
        item_ids: layers.map((l) => l.item_id),
        item_layers: layers,
        gender,
      });
    } finally {
      setSaving(false);
      setShowSaveSheet(false);
    }
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const selectedLayer = layers.find((l) => l.item_id === selectedLayerItemId);
  const itemsOnCanvas = new Set(layers.map((l) => l.item_id));

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ backgroundColor: "#F5F0EA" }}
    >
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{
          backgroundColor: "rgba(255,255,255,0.97)",
          borderBottom: "1px solid #E5DDD5",
        }}
      >
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-sm font-medium"
          style={{ color: "#7A6F68" }}
        >
          <ChevronLeft size={18} />
          Back
        </button>
        <p className="font-semibold text-sm" style={{ color: "#2B2B2B" }}>
          {initialLook ? "Edit Look" : "New Look"}
        </p>
        <button
          onClick={() => setShowSaveSheet(true)}
          disabled={layers.length === 0}
          className="px-4 py-1.5 rounded-full text-sm font-semibold text-white disabled:opacity-40"
          style={{ backgroundColor: "#C9847A" }}
        >
          Save
        </button>
      </div>

      {/* Gender toggle */}
      <div className="flex justify-center gap-2 pt-3 pb-1 shrink-0">
        {(["female", "male"] as const).map((g) => (
          <button
            key={g}
            onClick={() => setGender(g)}
            className="px-4 py-1 rounded-full text-xs font-semibold capitalize transition-all"
            style={{
              backgroundColor: gender === g ? "#C9847A" : "#FFFFFF",
              color: gender === g ? "#FFFFFF" : "#7A6F68",
              border: `1px solid ${gender === g ? "#C9847A" : "#E5DDD5"}`,
            }}
          >
            {g}
          </button>
        ))}
      </div>

      {/* Main area */}
      <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden">
        {/* Mannequin canvas */}
        <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
          <div
            className="relative select-none"
            style={{
              width: CANVAS_W,
              height: CANVAS_H,
              backgroundColor: "#FFFFFF",
              borderRadius: 16,
              border: "1px solid #E5DDD5",
              overflow: "hidden",
              touchAction: "none",
            }}
            onPointerMove={onCanvasPointerMove}
            onPointerUp={onCanvasPointerUp}
            onPointerLeave={onCanvasPointerUp}
          >
            {/* Mannequin SVG background */}
            <div className="absolute inset-0 opacity-20">
              <MannequinSvg gender={gender} />
            </div>

            {/* Item layers */}
            {[...layers]
              .sort((a, b) => a.z_index - b.z_index)
              .map((layer) => (
                <div
                  key={layer.item_id}
                  className="absolute cursor-grab active:cursor-grabbing"
                  style={{
                    left: layer.x,
                    top: layer.y,
                    width: layer.width,
                    height: layer.height,
                    zIndex: layer.z_index,
                    outline:
                      selectedLayerItemId === layer.item_id
                        ? "2px solid #C9847A"
                        : "none",
                    borderRadius: 4,
                  }}
                  onPointerDown={(e) => startDrag(e, layer)}
                  onClick={() => setSelectedLayerItemId(layer.item_id)}
                >
                  <img
                    src={layer.image_url}
                    alt=""
                    draggable={false}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                    }}
                  />

                  {selectedLayerItemId === layer.item_id && (
                    <button
                      className="absolute -top-3 -right-3 w-6 h-6 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: "#C9847A", zIndex: 99 }}
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        removeLayer(layer.item_id);
                      }}
                    >
                      <X size={12} color="white" />
                    </button>
                  )}

                  {selectedLayerItemId === layer.item_id && (
                    <div
                      className="absolute -bottom-2 -right-2 w-5 h-5 rounded cursor-se-resize"
                      style={{ backgroundColor: "#C9847A", zIndex: 99 }}
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        startResize(e, layer);
                      }}
                    />
                  )}
                </div>
              ))}
          </div>
        </div>

        {/* Item selector panel */}
        <div
          className="md:w-64 flex flex-col shrink-0"
          style={{
            borderTop: "1px solid #E5DDD5",
            backgroundColor: "#FFFFFF",
          }}
        >
          {/* Category filter */}
          <div
            className="flex gap-1.5 p-3 overflow-x-auto shrink-0"
            style={{ borderBottom: "1px solid #E5DDD5" }}
          >
            {ITEM_CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setCatFilter(cat)}
                className="px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap shrink-0"
                style={{
                  backgroundColor: catFilter === cat ? "#C9847A" : "#F5F0EA",
                  color: catFilter === cat ? "#FFFFFF" : "#7A6F68",
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Layer order controls */}
          {selectedLayer && (
            <div
              className="flex items-center gap-2 px-3 py-2 shrink-0"
              style={{
                borderBottom: "1px solid #F0EBE6",
                backgroundColor: "#F5F0EA",
              }}
            >
              <span
                className="text-xs font-medium"
                style={{ color: "#7A6F68" }}
              >
                Layer:
              </span>
              <button
                onClick={() => bringForward(selectedLayer.item_id)}
                className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium"
                style={{
                  backgroundColor: "#FFFFFF",
                  color: "#2B2B2B",
                  border: "1px solid #E5DDD5",
                }}
              >
                <ChevronUp size={12} /> Forward
              </button>
              <button
                onClick={() => sendBack(selectedLayer.item_id)}
                className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium"
                style={{
                  backgroundColor: "#FFFFFF",
                  color: "#2B2B2B",
                  border: "1px solid #E5DDD5",
                }}
              >
                <ChevronDown size={12} /> Back
              </button>
            </div>
          )}

          {/* Item grid */}
          <div className="flex-1 overflow-y-auto p-3">
            <div className="grid grid-cols-3 md:grid-cols-2 gap-2">
              {filteredItems.map((item) => {
                const onCanvas = itemsOnCanvas.has(item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => addItem(item)}
                    disabled={onCanvas}
                    className="relative rounded-xl overflow-hidden transition-all"
                    style={{
                      aspectRatio: "1",
                      border: onCanvas
                        ? "2px solid #C9847A"
                        : "1px solid #E5DDD5",
                      opacity: onCanvas ? 0.6 : 1,
                    }}
                  >
                    <img
                      src={item.image_url}
                      alt={item.suggested_name ?? item.category}
                      className="w-full h-full object-cover"
                    />
                    {onCanvas && (
                      <div
                        className="absolute inset-0 flex items-center justify-center"
                        style={{
                          backgroundColor: "rgba(201,132,122,0.25)",
                        }}
                      >
                        <span className="text-xs font-bold text-white">✓</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            {filteredItems.length === 0 && (
              <p
                className="text-xs text-center mt-6"
                style={{ color: "#7A6F68" }}
              >
                No {catFilter} items in your wardrobe
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Save bottom sheet */}
      {showSaveSheet && (
        <div
          className="fixed inset-0 z-[60] flex items-end"
          style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
          onClick={() => setShowSaveSheet(false)}
        >
          <div
            className="w-full rounded-t-2xl p-6 space-y-4"
            style={{ backgroundColor: "#FFFFFF" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-bold" style={{ color: "#2B2B2B" }}>
              Save Look
            </h3>

            <input
              type="text"
              placeholder="Look name (e.g. Diwali 2025)"
              value={lookName}
              onChange={(e) => setLookName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-sm"
              style={{
                border: "1.5px solid #E5DDD5",
                backgroundColor: "#F5F0EA",
                color: "#2B2B2B",
                outline: "none",
              }}
            />

            <div>
              <p
                className="text-xs font-medium mb-2"
                style={{ color: "#7A6F68" }}
              >
                Tags
              </p>
              <div className="flex flex-wrap gap-2">
                {LOOK_TAGS.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className="px-3 py-1 rounded-full text-xs font-semibold"
                    style={{
                      backgroundColor: selectedTags.includes(tag)
                        ? "#C9847A"
                        : "#F5F0EA",
                      color: selectedTags.includes(tag) ? "#FFFFFF" : "#7A6F68",
                      border: `1px solid ${selectedTags.includes(tag) ? "#C9847A" : "#E5DDD5"}`,
                    }}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <input
              type="text"
              placeholder="Style note (optional) — e.g. tuck the top, belt sits high"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-sm"
              style={{
                border: "1.5px solid #E5DDD5",
                backgroundColor: "#F5F0EA",
                color: "#2B2B2B",
                outline: "none",
              }}
            />

            <button
              onClick={handleSave}
              disabled={!lookName.trim() || saving}
              className="w-full py-3 rounded-xl font-semibold text-sm text-white disabled:opacity-50"
              style={{ backgroundColor: "#C9847A" }}
            >
              {saving ? "Saving..." : "Save Look"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
