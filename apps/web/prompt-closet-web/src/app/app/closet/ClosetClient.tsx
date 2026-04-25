"use client";

import { useState, useMemo } from "react";
import { Plus } from "lucide-react";
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
      // Upload to Supabase Storage
      const ext = file.name.split(".").pop();
      const path = `${userId}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("wardrobe-items")
        .upload(path, file, { contentType: file.type });
      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("wardrobe-items").getPublicUrl(path);

      // Save to wardrobe_items
      const { data: newItem, error: insertError } = await supabase
        .from("wardrobe_items")
        .insert({
          user_id: userId,
          image_url: publicUrl,
          category: "top", // default
        })
        .select()
        .single();

      if (insertError) throw insertError;
      setItems([newItem, ...items]);
    } catch (err) {
      console.error(err);
      alert("Upload failed");
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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-charcoal">My Closet</h1>
        <label className="flex items-center gap-2 px-4 py-2 bg-rose-gold text-white rounded-lg cursor-pointer hover:opacity-90 transition-opacity">
          <Plus size={18} />
          <span>Add Item</span>
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
      <div className="flex gap-2 flex-wrap mb-6">
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
        <div className="text-center py-8 text-muted">Uploading...</div>
      )}

      {filtered.length === 0 && !uploading ? (
        <div className="text-center py-16">
          <p className="text-muted mb-4">
            Your closet is empty. Add your first item!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
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
