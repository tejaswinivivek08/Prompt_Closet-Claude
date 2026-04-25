"use client";

import { useState, useMemo } from "react";
import { Plus, Shirt, Upload, Loader2, Wand2 } from "lucide-react";
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadFile(file);
    e.target.value = "";
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      await uploadFile(file);
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
        <label
          className="flex items-center gap-2 px-5 py-2.5 rounded-full cursor-pointer transition-all hover:opacity-90"
          style={{
            backgroundColor: "#C9847A",
            color: "#FFFFFF",
            boxShadow: "0 4px 16px rgba(201,132,122,0.35)",
          }}
        >
          <Plus size={18} />
          <span className="text-sm font-semibold">Add Item</span>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
            disabled={uploading}
          />
        </label>
      </div>

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
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className="rounded-2xl border-2 border-dashed p-12 mb-8 flex flex-col items-center justify-center cursor-pointer transition-all hover:border-rose-gold"
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
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </label>
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
