"use client";

import { useState, useRef } from "react";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Check,
  ImageIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface ItemDetailModalProps {
  item: any;
  onClose: () => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, data: any) => void;
  userId?: string;
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

const CATEGORIES = [
  "top",
  "bottom",
  "dress",
  "outerwear",
  "footwear",
  "accessory",
  "traditional",
];

const OCCASIONS = [
  "casual",
  "office",
  "festive",
  "wedding",
  "party",
  "temple",
  "beach",
  "date",
  "sport",
];

export default function ItemDetailModal({
  item,
  onClose,
  onDelete,
  onUpdate,
  userId,
}: ItemDetailModalProps) {
  const supabase = createClient();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [imageLoading, setImageLoading] = useState<Record<number, boolean>>({});
  const [imageErrors, setImageErrors] = useState<Record<number, boolean>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Normalize item to always have image_urls array
  const imageUrls: string[] =
    item.image_urls && item.image_urls.length > 0
      ? item.image_urls
      : item.image_url
        ? [item.image_url]
        : [];

  const [form, setForm] = useState({
    suggested_name: item.suggested_name || "",
    category: item.category || "top",
    colors: item.colors || [],
    occasions: item.occasions || [],
    pattern: item.pattern || "",
    fabric: item.fabric || "",
    formality_score: item.formality_score || 3,
    season: item.season || [],
    style_notes: item.style_notes || "",
    image_urls: imageUrls,
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: updated, error } = await supabase
        .from("wardrobe_items")
        .update({
          suggested_name: form.suggested_name,
          category: form.category,
          colors: form.colors,
          occasions: form.occasions,
          pattern: form.pattern,
          fabric: form.fabric,
          formality_score: form.formality_score,
          season: form.season,
          style_notes: form.style_notes,
          image_urls: form.image_urls,
          image_url: form.image_urls[0],
        })
        .eq("id", item.id)
        .select()
        .single();

      if (error) throw error;
      onUpdate(item.id, updated);
      setEditing(false);
    } catch (err) {
      console.error("Save error:", err);
      alert("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this item? This cannot be undone.")) return;
    setDeleting(true);
    try {
      await onDelete(item.id);
      onClose();
    } catch {
      setDeleting(false);
    }
  };

  const handleAddPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    if (form.image_urls.length >= 5) {
      alert("Maximum 5 photos allowed.");
      return;
    }

    setUploadingPhoto(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${userId}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("wardrobe-items")
        .upload(path, file, { contentType: file.type });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("wardrobe-items")
        .getPublicUrl(path);

      const newUrls = [...form.image_urls, urlData.publicUrl];
      setForm({ ...form, image_urls: newUrls });

      // Auto-save the new photo URL and sync cover
      await supabase
        .from("wardrobe_items")
        .update({ image_urls: newUrls, image_url: newUrls[0] })
        .eq("id", item.id);
    } catch (err) {
      console.error("Photo upload error:", err);
      alert("Failed to upload photo. Please try again.");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSetCover = async (index: number) => {
    if (index === 0) return;
    const newUrls = [
      form.image_urls[index],
      ...form.image_urls.slice(0, index),
      ...form.image_urls.slice(index + 1),
    ];
    setForm({ ...form, image_urls: newUrls });
    setCurrentPhotoIndex(0);
    await supabase
      .from("wardrobe_items")
      .update({ image_urls: newUrls, image_url: newUrls[0] })
      .eq("id", item.id);
    onUpdate(item.id, { ...item, image_url: newUrls[0], image_urls: newUrls });
  };

  const handleRemovePhoto = async (index: number) => {
    if (form.image_urls.length <= 1) {
      alert("Must have at least one photo.");
      return;
    }
    const newUrls = form.image_urls.filter(
      (_: string, i: number) => i !== index,
    );
    setForm({ ...form, image_urls: newUrls });
    if (currentPhotoIndex >= newUrls.length) {
      setCurrentPhotoIndex(newUrls.length - 1);
    }
    await supabase
      .from("wardrobe_items")
      .update({ image_urls: newUrls, image_url: newUrls[0] })
      .eq("id", item.id);
    onUpdate(item.id, { ...item, image_url: newUrls[0], image_urls: newUrls });
  };

  const toggleColor = (color: string) => {
    const colors = form.colors.includes(color)
      ? form.colors.filter((c: string) => c !== color)
      : [...form.colors, color];
    setForm({ ...form, colors });
  };

  const toggleOccasion = (occ: string) => {
    const occasions = form.occasions.includes(occ)
      ? form.occasions.filter((o: string) => o !== occ)
      : [...form.occasions, occ];
    setForm({ ...form, occasions });
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50"
        style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        onClick={onClose}
      />
      <div
        className="fixed right-0 top-0 h-full w-full max-w-lg z-50 overflow-y-auto"
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
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white transition-all hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: "#C9847A" }}
                >
                  <Check size={15} /> {saving ? "Saving..." : "Save"}
                </button>
                <button
                  onClick={() => {
                    setEditing(false);
                    setForm({
                      suggested_name: item.suggested_name || "",
                      category: item.category || "top",
                      colors: item.colors || [],
                      occasions: item.occasions || [],
                      pattern: item.pattern || "",
                      fabric: item.fabric || "",
                      formality_score: item.formality_score || 3,
                      season: item.season || [],
                      style_notes: item.style_notes || "",
                      image_urls: imageUrls,
                    });
                  }}
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
                  Edit
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
          {/* Photo Gallery */}
          <div className="mb-6">
            {/* Main Photo */}
            <div
              className="relative aspect-square rounded-2xl overflow-hidden mb-3"
              style={{ backgroundColor: "#F5F0EA" }}
            >
              {form.image_urls.length > 0 ? (
                <>
                  {imageLoading[currentPhotoIndex] !== false &&
                    !imageErrors[currentPhotoIndex] && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div
                          className="w-8 h-8 border-3 border-t-transparent rounded-full animate-spin"
                          style={{
                            borderColor: "#C9847A",
                            borderTopColor: "transparent",
                          }}
                        />
                      </div>
                    )}
                  <img
                    src={form.image_urls[currentPhotoIndex]}
                    alt={`Photo ${currentPhotoIndex + 1}`}
                    className="object-cover w-full h-full"
                    onLoad={() =>
                      setImageLoading((prev) => ({
                        ...prev,
                        [currentPhotoIndex]: false,
                      }))
                    }
                    onError={() => {
                      setImageErrors((prev) => ({
                        ...prev,
                        [currentPhotoIndex]: true,
                      }));
                      setImageLoading((prev) => ({
                        ...prev,
                        [currentPhotoIndex]: false,
                      }));
                    }}
                    style={
                      imageLoading[currentPhotoIndex] === false &&
                      !imageErrors[currentPhotoIndex]
                        ? {}
                        : { display: "none" }
                    }
                  />
                  {imageErrors[currentPhotoIndex] && (
                    <div
                      className="absolute inset-0 flex items-center justify-center"
                      style={{ backgroundColor: "#F5F0EA" }}
                    >
                      <ImageIcon size={48} style={{ color: "#C9847A" }} />
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-center justify-center w-full h-full">
                  <ImageIcon size={48} style={{ color: "#C9847A" }} />
                </div>
              )}

              {/* Navigation arrows */}
              {form.image_urls.length > 1 && (
                <>
                  <button
                    onClick={() =>
                      setCurrentPhotoIndex((prev) =>
                        prev === 0 ? form.image_urls.length - 1 : prev - 1,
                      )
                    }
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: "rgba(255,255,255,0.9)" }}
                  >
                    <ChevronLeft size={18} style={{ color: "#2B2B2B" }} />
                  </button>
                  <button
                    onClick={() =>
                      setCurrentPhotoIndex((prev) =>
                        prev === form.image_urls.length - 1 ? 0 : prev + 1,
                      )
                    }
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: "rgba(255,255,255,0.9)" }}
                  >
                    <ChevronRight size={18} style={{ color: "#2B2B2B" }} />
                  </button>
                </>
              )}

              {/* Photo counter */}
              {form.image_urls.length > 1 && (
                <div
                  className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-medium"
                  style={{
                    backgroundColor: "rgba(0,0,0,0.6)",
                    color: "#FFFFFF",
                  }}
                >
                  {currentPhotoIndex + 1} / {form.image_urls.length}
                </div>
              )}
            </div>

            {/* Thumbnail Strip */}
            {form.image_urls.length > 0 && (
              <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
                {form.image_urls.map((url: string, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentPhotoIndex(idx)}
                    className="relative w-16 h-16 rounded-xl overflow-hidden border-2 transition-all flex-shrink-0"
                    style={{
                      borderColor:
                        idx === currentPhotoIndex ? "#C9847A" : "#E5DDD5",
                      opacity: idx === currentPhotoIndex ? 1 : 0.7,
                    }}
                  >
                    {imageErrors[idx] ? (
                      <div
                        className="w-full h-full flex items-center justify-center"
                        style={{ backgroundColor: "#E5DDD5" }}
                      >
                        <ImageIcon size={16} style={{ color: "#C9847A" }} />
                      </div>
                    ) : (
                      <img
                        src={url}
                        alt={`Thumbnail ${idx + 1}`}
                        className="object-cover w-full h-full"
                        onLoad={() =>
                          setImageLoading((prev) => ({ ...prev, [idx]: false }))
                        }
                        onError={() =>
                          setImageErrors((prev) => ({ ...prev, [idx]: true }))
                        }
                      />
                    )}
                    {idx === 0 && (
                      <div
                        className="absolute bottom-0 left-0 right-0 text-center text-xs py-0.5"
                        style={{
                          backgroundColor: "rgba(201,132,122,0.9)",
                          color: "#FFFFFF",
                        }}
                      >
                        Cover
                      </div>
                    )}
                  </button>
                ))}

                {/* Add Photo Button */}
                {form.image_urls.length < 5 && (
                  <label
                    className="w-16 h-16 rounded-xl border-2 border-dashed flex items-center justify-center cursor-pointer transition-all hover:border-rose-gold flex-shrink-0"
                    style={{
                      borderColor: "#E5DDD5",
                      backgroundColor: "#F5F0EA",
                    }}
                  >
                    {uploadingPhoto ? (
                      <div
                        className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
                        style={{
                          borderColor: "#C9847A",
                          borderTopColor: "transparent",
                        }}
                      />
                    ) : (
                      <Plus size={18} style={{ color: "#C9847A" }} />
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAddPhoto}
                      disabled={uploadingPhoto}
                    />
                  </label>
                )}
              </div>
            )}

            {/* Set Cover / Remove buttons */}
            {editing && form.image_urls.length > 1 && currentPhotoIndex > 0 && (
              <button
                onClick={() => handleSetCover(currentPhotoIndex)}
                className="text-xs font-medium mb-1 mr-4 underline"
                style={{ color: "#C9847A" }}
              >
                Set as cover photo
              </button>
            )}
            {editing && form.image_urls.length > 1 && (
              <button
                onClick={() => handleRemovePhoto(currentPhotoIndex)}
                className="text-xs font-medium underline"
                style={{ color: "#DC2626" }}
              >
                Remove this photo
              </button>
            )}
          </div>

          {editing ? (
            /* Edit Mode */
            <div className="space-y-5">
              {/* Name */}
              <div>
                <label
                  className="block text-xs font-medium mb-1.5 uppercase tracking-wide"
                  style={{ color: "#7A6F68" }}
                >
                  Name
                </label>
                <input
                  value={form.suggested_name}
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
                  placeholder="Item name"
                />
              </div>

              {/* Category */}
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
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c.charAt(0).toUpperCase() + c.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Colors */}
              <div>
                <label
                  className="block text-xs font-medium mb-2 uppercase tracking-wide"
                  style={{ color: "#7A6F68" }}
                >
                  Colors
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    "#FFFFFF",
                    "#1a1a1a",
                    "#c62828",
                    "#1565c0",
                    "#2e7d32",
                    "#f9a825",
                    "#ef6c00",
                    "#ec407a",
                    "#7b1fa2",
                    "#4e342e",
                    "#616161",
                    "#fffdd0",
                    "#f5f5dc",
                    "#800000",
                    "#808000",
                    "#ff7f50",
                    "#800020",
                    "#ffd700",
                    "#1a237e",
                  ].map((color) => (
                    <button
                      key={color}
                      onClick={() => toggleColor(color)}
                      className="w-8 h-8 rounded-full border-2 transition-all"
                      style={{
                        backgroundColor: color,
                        borderColor: form.colors.includes(color)
                          ? "#C9847A"
                          : "#E5DDD5",
                        boxShadow: form.colors.includes(color)
                          ? "0 0 0 2px rgba(201,132,122,0.3)"
                          : "none",
                      }}
                    />
                  ))}
                </div>
                {form.colors.length > 0 && (
                  <p className="text-xs mt-2" style={{ color: "#7A6F68" }}>
                    Selected:{" "}
                    {form.colors.map((c: string) => c.toUpperCase()).join(", ")}
                  </p>
                )}
              </div>

              {/* Occasions */}
              <div>
                <label
                  className="block text-xs font-medium mb-2 uppercase tracking-wide"
                  style={{ color: "#7A6F68" }}
                >
                  Occasions
                </label>
                <div className="flex flex-wrap gap-2">
                  {OCCASIONS.map((occ) => (
                    <button
                      key={occ}
                      onClick={() => toggleOccasion(occ)}
                      className="px-3 py-1.5 rounded-full text-xs font-semibold capitalize transition-all"
                      style={{
                        backgroundColor: form.occasions.includes(occ)
                          ? occasionColors[occ] || "#7B9E87"
                          : "rgba(201,132,122,0.1)",
                        color: form.occasions.includes(occ)
                          ? "#FFFFFF"
                          : "#C9847A",
                      }}
                    >
                      {occ}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pattern */}
              <div>
                <label
                  className="block text-xs font-medium mb-1.5 uppercase tracking-wide"
                  style={{ color: "#7A6F68" }}
                >
                  Pattern
                </label>
                <input
                  value={form.pattern}
                  onChange={(e) =>
                    setForm({ ...form, pattern: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-xl text-sm"
                  style={{
                    backgroundColor: "#F5F0EA",
                    border: "1px solid #E5DDD5",
                    color: "#2B2B2B",
                    outline: "none",
                  }}
                  placeholder="e.g. solid, striped, floral"
                />
              </div>

              {/* Fabric */}
              <div>
                <label
                  className="block text-xs font-medium mb-1.5 uppercase tracking-wide"
                  style={{ color: "#7A6F68" }}
                >
                  Fabric
                </label>
                <input
                  value={form.fabric}
                  onChange={(e) => setForm({ ...form, fabric: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl text-sm"
                  style={{
                    backgroundColor: "#F5F0EA",
                    border: "1px solid #E5DDD5",
                    color: "#2B2B2B",
                    outline: "none",
                  }}
                  placeholder="e.g. cotton, silk, linen"
                />
              </div>

              {/* Formality Slider */}
              <div>
                <label
                  className="block text-xs font-medium mb-2 uppercase tracking-wide"
                  style={{ color: "#7A6F68" }}
                >
                  Formality:{" "}
                  <span className="capitalize" style={{ color: "#2B2B2B" }}>
                    {form.formality_score <= 2
                      ? "Casual"
                      : form.formality_score === 3
                        ? "Smart Casual"
                        : form.formality_score === 4
                          ? "Formal"
                          : "Black Tie"}
                  </span>
                </label>
                <div className="flex items-center gap-3">
                  <span className="text-xs" style={{ color: "#7A6F68" }}>
                    Casual
                  </span>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={form.formality_score}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        formality_score: parseInt(e.target.value),
                      })
                    }
                    className="flex-1 h-2 rounded-full appearance-none cursor-pointer"
                    style={{
                      backgroundColor: "#E5DDD5",
                      accentColor: "#C9847A",
                    }}
                  />
                  <span className="text-xs" style={{ color: "#7A6F68" }}>
                    Formal
                  </span>
                </div>
                <div className="flex justify-between mt-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <span
                      key={n}
                      className="text-xs w-5 text-center"
                      style={{
                        color:
                          form.formality_score === n ? "#C9847A" : "#E5DDD5",
                        fontWeight:
                          form.formality_score === n ? "bold" : "normal",
                      }}
                    >
                      {n}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* View Mode */
            <div>
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

              {form.colors.length > 0 && (
                <div className="mb-5">
                  <p
                    className="text-xs font-medium uppercase tracking-wide mb-2"
                    style={{ color: "#7A6F68" }}
                  >
                    Colors
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    {form.colors.map((color: string) => (
                      <div
                        key={color}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-full"
                        style={{ backgroundColor: "rgba(201,132,122,0.1)" }}
                      >
                        <div
                          className="w-4 h-4 rounded-full border"
                          style={{
                            backgroundColor: color,
                            borderColor: "#E5DDD5",
                          }}
                        />
                        <span
                          className="text-xs font-medium capitalize"
                          style={{ color: "#2B2B2B" }}
                        >
                          {color.toUpperCase()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {form.occasions.length > 0 && (
                <div className="mb-5">
                  <p
                    className="text-xs font-medium uppercase tracking-wide mb-2"
                    style={{ color: "#7A6F68" }}
                  >
                    Occasions
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {form.occasions.map((occ: string) => (
                      <span
                        key={occ}
                        className="px-3 py-1.5 rounded-full text-xs font-semibold text-white capitalize"
                        style={{
                          backgroundColor:
                            occasionColors[occ.toLowerCase()] || "#7B9E87",
                        }}
                      >
                        {occ}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {form.pattern && (
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
                    {form.pattern}
                  </p>
                </div>
              )}

              {form.fabric && (
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
                    {form.fabric}
                  </p>
                </div>
              )}

              {form.formality_score && (
                <div className="mb-5">
                  <p
                    className="text-xs font-medium uppercase tracking-wide mb-1"
                    style={{ color: "#7A6F68" }}
                  >
                    Formality
                  </p>
                  <p className="text-sm" style={{ color: "#2B2B2B" }}>
                    {form.formality_score <= 2
                      ? "Casual"
                      : form.formality_score === 3
                        ? "Smart Casual"
                        : form.formality_score === 4
                          ? "Formal"
                          : "Black Tie"}{" "}
                    ({form.formality_score}/5)
                  </p>
                </div>
              )}

              {item.wear_count > 0 && (
                <p className="text-sm mb-5" style={{ color: "#7A6F68" }}>
                  Worn {item.wear_count} times
                </p>
              )}
            </div>
          )}

          {/* Delete Button */}
          <div className="mt-8 pt-6" style={{ borderTop: "1px solid #E5DDD5" }}>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
              style={{ backgroundColor: "#FEF2F2", color: "#DC2626" }}
            >
              <Trash2 size={16} /> {deleting ? "Deleting..." : "Delete Item"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
