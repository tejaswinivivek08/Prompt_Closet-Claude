"use client";

import { useState, useMemo } from "react";
import { Plus, Shirt } from "lucide-react";
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
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
      const { data: newItem, error: insertError } = await supabase
        .from("wardrobe_items")
        .insert({
          user_id: userId,
          image_url: publicUrl,
          category: "top",
        })
        .select()
        .single();
      if (insertError) throw insertError;
      setItems([newItem, ...items]);
    } catch (err) {
      console.error(err);
      alert("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    await supabase
      .from("wardrobe_items")
      .update({ is_active: false })
      .eq("id", id);
    setItems(items.filter((i) => i.id !== id));
    setSelectedItem(null);
  };

  const handleUpdate = async (id: string, data: any) => {
    const { data: updated } = await supabase
      .from("wardrobe_items")
      .update(data)
      .eq("id", id)
      .select()
      .single();
    setItems(items.map((i) => (i.id === id ? updated : i)));
    setSelectedItem(updated);
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

      {uploading && (
        <div className="flex items-center justify-center gap-3 py-16">
          <div
            className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: "#C9847A", borderTopColor: "transparent" }}
          />
          <span className="text-sm" style={{ color: "#7A6F68" }}>
            Uploading...
          </span>
        </div>
      )}

      {filtered.length === 0 && !uploading && (
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
            Your closet is empty
          </p>
          <p className="text-sm" style={{ color: "#7A6F68" }}>
            Add your first item to get started
          </p>
        </div>
      )}

      {filtered.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
          {filtered.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              onClick={() => setSelectedItem(item)}
            />
          ))}
        </div>
      )}

      {selectedItem && (
        <ItemDetailModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onDelete={handleDelete}
          onUpdate={handleUpdate}
        />
      )}
    </div>
  );
}
