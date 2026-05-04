"use client";

import { useState, useMemo, useRef } from "react";
import { Shirt, Upload, Loader2, Wand2, Camera, X, Check } from "lucide-react";
import ItemCard from "@/components/ItemCard";
import FilterPill from "@/components/FilterPill";
import ItemDetailModal from "@/components/ItemDetailModal";
import { createClient } from "@/lib/supabase/client";

const CATEGORIES = [
  "All",
  "Top",
  "Bottom",
  "Dress",
  "Traditional",
  "Outerwear",
  "Footwear",
  "Accessory",
];

interface ClosetClientProps {
  initialItems: any[];
  userId: string;
}

export default function ClosetClient({
  initialItems,
  userId,
}: ClosetClientProps) {
  const [items, setItems] = useState(initialItems);
  const [filter, setFilter] = useState("All");
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [webcamStream, setWebcamStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { All: items.length };
    items.forEach((item) => {
      const cat =
        item.category.charAt(0).toUpperCase() + item.category.slice(1);
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [items]);

  const filtered = useMemo(() => {
    if (filter === "All") return items;
    return items.filter(
      (item) => item.category.toLowerCase() === filter.toLowerCase(),
    );
  }, [items, filter]);

  const uploadFile = async (file: File) => {
    setUploading(true);
    setAnalyzing(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${userId}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("wardrobe-items")
        .upload(path, file, { contentType: file.type });
      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("wardrobe-items").getPublicUrl(path);

      // Call AI analysis API
      try {
        const response = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageUrl: publicUrl, userId }),
        });
        const { item: analyzedItem } = await response.json();

        // Add the new item to state
        setItems([analyzedItem, ...items]);
      } catch {
        // Fallback: create item with basic data
        const { data: newItem, error: insertError } = await supabase
          .from("wardrobe_items")
          .insert({
            user_id: userId,
            image_url: publicUrl,
            category: "top",
            image_urls: [publicUrl],
            suggested_name: "New Item",
          })
          .select()
          .single();
        if (insertError) throw insertError;
        setItems([newItem, ...items]);
      }
    } catch (err) {
      console.error(err);
      alert("Upload failed. Please try again.");
    } finally {
      setUploading(false);
      setAnalyzing(false);
    }
  };

  const handleDelete = async (id: string) => {
    await supabase.from("wardrobe_items").delete().eq("id", id);
    setItems(items.filter((i) => i.id !== id));
    setSelectedItem(null);
  };

  const handleUpdate = async (id: string, data: any) => {
    setItems(items.map((i) => (i.id === id ? { ...i, ...data } : i)));
    if (selectedItem?.id === id) {
      setSelectedItem({ ...selectedItem, ...data });
    }
  };

  const openUploadModal = () => {
    setShowUploadModal(true);
    setPreviewImage(null);
    stopWebcam();
  };

  const closeUploadModal = () => {
    setShowUploadModal(false);
    setPreviewImage(null);
    stopWebcam();
  };

  const stopWebcam = () => {
    if (webcamStream) {
      webcamStream.getTracks().forEach((t) => t.stop());
      setWebcamStream(null);
    }
  };

  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      setWebcamStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      alert("Camera access denied or not available");
    }
  };

  const captureFromWebcam = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext("2d")?.drawImage(videoRef.current, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg");
    setPreviewImage(dataUrl);
    stopWebcam();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setPreviewImage(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
    stopWebcam();
  };

  const handleDropOnModal = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setPreviewImage(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadPreviewImage = async () => {
    if (!previewImage) return;
    setUploading(true);
    setAnalyzing(true);
    setShowUploadModal(false);

    try {
      // Convert data URL to blob
      const res = await fetch(previewImage);
      const blob = await res.blob();
      const file = new File([blob], "capture.jpg", { type: "image/jpeg" });

      const ext = "jpg";
      const path = `${userId}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("wardrobe-items")
        .upload(path, file, { contentType: file.type });
      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("wardrobe-items").getPublicUrl(path);

      // Call AI analysis API
      try {
        const response = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageUrl: publicUrl, userId }),
        });
        const { item: analyzedItem } = await response.json();
        setItems([analyzedItem, ...items]);
      } catch {
        const { data: newItem, error: insertError } = await supabase
          .from("wardrobe_items")
          .insert({
            user_id: userId,
            image_url: publicUrl,
            category: "top",
            image_urls: [publicUrl],
            suggested_name: "New Item",
          })
          .select()
          .single();
        if (insertError) throw insertError;
        setItems([newItem, ...items]);
      }
    } catch (err) {
      console.error(err);
      alert("Upload failed. Please try again.");
    } finally {
      setUploading(false);
      setAnalyzing(false);
      setPreviewImage(null);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold mb-1" style={{ color: "#2B2B2B" }}>
            My Closet
          </h1>
          <p className="text-sm" style={{ color: "#7A6F68" }}>
            {items.length} items
          </p>
        </div>
        <button
          onClick={openUploadModal}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full cursor-pointer transition-all hover:opacity-90"
          style={{
            backgroundColor: "#C9847A",
            color: "#FFFFFF",
            boxShadow: "0 4px 16px rgba(201,132,122,0.35)",
          }}
        >
          <img
            src="/icons/Add Icon.png"
            alt="Add"
            className="w-5 h-5 object-contain brightness-0 invert"
          />
          <span className="text-sm font-semibold">Add Item</span>
        </button>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div
            className="w-full max-w-md rounded-2xl overflow-hidden"
            style={{ backgroundColor: "#FFFFFF" }}
          >
            {/* Modal Header */}
            <div
              className="flex items-center justify-between p-4 border-b"
              style={{ borderColor: "#F0EBE6" }}
            >
              <h2 className="font-bold" style={{ color: "#2B2B2B" }}>
                Add New Item
              </h2>
              <button
                onClick={closeUploadModal}
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ backgroundColor: "#F5F0EA" }}
              >
                <X size={16} style={{ color: "#7A6F68" }} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Preview or Upload Area */}
              {previewImage ? (
                <div className="relative">
                  <img
                    src={previewImage}
                    alt="Preview"
                    className="w-full max-h-64 object-contain rounded-xl"
                    style={{ backgroundColor: "#F5F0EA" }}
                  />
                  <button
                    onClick={() => setPreviewImage(null)}
                    className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
                  >
                    <X size={16} className="text-white" />
                  </button>
                </div>
              ) : (
                <div
                  className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all"
                  style={{ borderColor: "#E5DDD5", backgroundColor: "#F5F0EA" }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDropOnModal}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
                    style={{ backgroundColor: "rgba(201,132,122,0.1)" }}
                  >
                    <Upload size={24} style={{ color: "#C9847A" }} />
                  </div>
                  <p
                    className="font-semibold mb-1"
                    style={{ color: "#2B2B2B" }}
                  >
                    Drop photo here or click to browse
                  </p>
                  <p className="text-xs" style={{ color: "#7A6F68" }}>
                    JPG, PNG, WEBP supported
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                </div>
              )}

              {/* Webcam Section */}
              {!previewImage && (
                <div className="space-y-3">
                  {webcamStream ? (
                    <div
                      className="relative rounded-xl overflow-hidden"
                      style={{ backgroundColor: "#1a1a1a" }}
                    >
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full max-h-48 object-contain"
                      />
                      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-2">
                        <button
                          onClick={captureFromWebcam}
                          className="px-6 py-2 rounded-xl text-sm font-semibold text-white"
                          style={{ backgroundColor: "#C9847A" }}
                        >
                          Capture
                        </button>
                        <button
                          onClick={stopWebcam}
                          className="px-4 py-2 rounded-xl text-sm font-medium"
                          style={{
                            backgroundColor: "rgba(255,255,255,0.2)",
                            color: "#ffffff",
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={startWebcam}
                      className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
                      style={{
                        backgroundColor: "#F5F0EA",
                        color: "#2B2B2B",
                        border: "1px solid #E5DDD5",
                      }}
                    >
                      <Camera size={16} />
                      Use Camera
                    </button>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              {previewImage && (
                <div className="flex gap-3">
                  <button
                    onClick={() => setPreviewImage(null)}
                    className="flex-1 py-3 rounded-xl font-semibold text-sm transition-all"
                    style={{
                      backgroundColor: "#F5F0EA",
                      color: "#7A6F68",
                      border: "1px solid #E5DDD5",
                    }}
                  >
                    Retake
                  </button>
                  <button
                    onClick={uploadPreviewImage}
                    className="flex-1 py-3 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2"
                    style={{
                      backgroundColor: "#C9847A",
                      boxShadow: "0 4px 16px rgba(201,132,122,0.35)",
                    }}
                  >
                    <Wand2 size={14} />
                    Analyze with AI
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Filter pills */}
      <div className="flex gap-2 flex-wrap mb-8">
        {CATEGORIES.map((cat) => (
          <FilterPill
            key={cat}
            label={cat}
            count={categoryCounts[cat] || 0}
            active={filter === cat}
            onClick={() => setFilter(cat)}
          />
        ))}
      </div>

      {/* Upload Drop Zone */}
      {uploading && (
        <div
          className="rounded-2xl border-2 border-dashed p-12 mb-8 flex flex-col items-center justify-center"
          style={{
            borderColor: dragOver ? "#C9847A" : "#E5DDD5",
            backgroundColor: "rgba(201,132,122,0.05)",
          }}
        >
          {analyzing ? (
            <>
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center mb-4"
                style={{ backgroundColor: "rgba(201,132,122,0.1)" }}
              >
                <Wand2
                  size={24}
                  className="animate-pulse"
                  style={{ color: "#C9847A" }}
                />
              </div>
              <p
                className="text-base font-medium mb-2"
                style={{ color: "#2B2B2B" }}
              >
                Analyzing with AI...
              </p>
              <p className="text-sm" style={{ color: "#7A6F68" }}>
                Detecting colors, patterns, and style
              </p>
            </>
          ) : (
            <>
              <div
                className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin mb-4"
                style={{
                  borderColor: "#C9847A",
                  borderTopColor: "transparent",
                }}
              />
              <p className="text-sm" style={{ color: "#7A6F68" }}>
                Uploading photo...
              </p>
            </>
          )}
        </div>
      )}

      {/* Drag and Drop Zone (when not uploading) */}
      {!uploading && items.length === 0 && (
        <button
          onClick={openUploadModal}
          className="w-full rounded-2xl border-2 border-dashed p-12 mb-8 flex flex-col items-center justify-center cursor-pointer transition-all hover:border-rose-gold"
          style={{
            borderColor: dragOver ? "#C9847A" : "#E5DDD5",
            backgroundColor: dragOver ? "rgba(201,132,122,0.05)" : "#FFFFFF",
          }}
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
            style={{ backgroundColor: "rgba(201,132,122,0.1)" }}
          >
            <Upload size={28} style={{ color: "#C9847A" }} />
          </div>
          <p
            className="text-base font-medium mb-1"
            style={{ color: "#2B2B2B" }}
          >
            Drop photos here
          </p>
          <p className="text-sm" style={{ color: "#7A6F68" }}>
            or click to upload (up to 5 photos per item)
          </p>
        </button>
      )}

      {/* Empty State */}
      {filtered.length === 0 && !uploading && items.length > 0 && (
        <div className="flex flex-col items-center justify-center py-24">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
            style={{ backgroundColor: "rgba(201,132,122,0.1)" }}
          >
            <Shirt size={28} style={{ color: "#C9847A" }} />
          </div>
          <p
            className="text-base font-medium mb-1"
            style={{ color: "#2B2B2B" }}
          >
            No {filter !== "All" ? filter : ""} items
          </p>
          <p className="text-sm" style={{ color: "#7A6F68" }}>
            {filter !== "All"
              ? "Try a different category"
              : "Add your first item to get started"}
          </p>
        </div>
      )}

      {/* Skeleton Loaders */}
      {items.length === 0 && !uploading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="rounded-2xl overflow-hidden animate-pulse"
              style={{
                backgroundColor: "#FFFFFF",
                border: "1px solid #F0EBE6",
              }}
            >
              <div
                className="aspect-square"
                style={{ backgroundColor: "#F5F0EA" }}
              />
              <div className="p-3 space-y-2">
                <div
                  className="h-4 rounded"
                  style={{ backgroundColor: "#F5F0EA", width: "70%" }}
                />
                <div
                  className="h-3 rounded"
                  style={{ backgroundColor: "#F5F0EA", width: "40%" }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Items Grid */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
          {filtered.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              onClick={() => setSelectedItem(item)}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Item Detail Modal */}
      {selectedItem && (
        <ItemDetailModal
          item={selectedItem}
          userId={userId}
          onClose={() => setSelectedItem(null)}
          onDelete={handleDelete}
          onUpdate={handleUpdate}
        />
      )}
    </div>
  );
}
