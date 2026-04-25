"use client";

import { useState } from "react";
import Image from "next/image";
import { Sparkles, ThumbsUp, ThumbsDown } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const QUICK_PROMPTS = [
  "Diwali outfit",
  "Office Monday",
  "Casual weekend",
  "Wedding guest",
];

interface OutfitSuggestion {
  outfit_name: string;
  item_ids: string[];
  occasion_fit: string;
  styling_tip: string;
  confidence: number;
}

export default function StyleClient({
  initialItems,
  userId,
}: {
  initialItems: any[];
  userId: string;
}) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [outfits, setOutfits] = useState<OutfitSuggestion[]>([]);
  const [selectedItems, setSelectedItems] = useState<Record<string, any>>({});
  const supabase = createClient();

  const handleSearch = async (searchQuery: string) => {
    if (initialItems.length === 0) {
      alert("Add items to your closet first!");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/magicbar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQuery, userId }),
      });
      const data = await res.json();
      setOutfits(data.outfits || []);
      const itemMap: Record<string, any> = {};
      data.outfits?.forEach((o: OutfitSuggestion) => {
        o.item_ids.forEach((id) => {
          const item = initialItems.find((i: any) => i.id === id);
          if (item) itemMap[id] = item;
        });
      });
      setSelectedItems(itemMap);
    } catch (err) {
      console.error(err);
      alert("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (outfit: OutfitSuggestion) => {
    await supabase
      .from("outfits")
      .insert({
        user_id: userId,
        name: outfit.outfit_name,
        item_ids: outfit.item_ids,
        occasion: outfit.occasion_fit,
        notes: outfit.styling_tip,
        ai_generated: true,
      });
    await supabase
      .from("outfit_feedback")
      .insert({
        user_id: userId,
        query_text: query,
        outfit_name: outfit.outfit_name,
        item_ids: outfit.item_ids,
        feedback: "accepted",
      });
    setOutfits(outfits.filter((o) => o.outfit_name !== outfit.outfit_name));
  };

  const handleReject = async (outfit: OutfitSuggestion) => {
    await supabase
      .from("outfit_feedback")
      .insert({
        user_id: userId,
        query_text: query,
        outfit_name: outfit.outfit_name,
        item_ids: outfit.item_ids,
        feedback: "rejected",
      });
    setOutfits(outfits.filter((o) => o.outfit_name !== outfit.outfit_name));
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1" style={{ color: "#2B2B2B" }}>
          Magic Bar
        </h1>
        <p className="text-sm" style={{ color: "#7A6F68" }}>
          Tell me the occasion — I'll style the outfit.
        </p>
      </div>

      {/* Input card */}
      <div
        className="rounded-2xl p-6 mb-6"
        style={{
          backgroundColor: "#FFFFFF",
          boxShadow: "0 2px 16px rgba(0,0,0,0.05)",
          border: "1px solid #F0EBE6",
        }}
      >
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Something for a rainy day meeting..."
          className="w-full px-4 py-3 rounded-xl resize-none text-sm mb-4"
          style={{
            backgroundColor: "#F5F0EA",
            border: "1px solid #E5DDD5",
            color: "#2B2B2B",
            outline: "none",
          }}
          rows={3}
        />

        {/* Quick prompts */}
        <div className="flex gap-2 flex-wrap mb-4">
          {QUICK_PROMPTS.map((p) => (
            <button
              key={p}
              onClick={() => {
                setQuery(p);
                handleSearch(p);
              }}
              className="px-4 py-1.5 rounded-full text-sm font-medium transition-all hover:opacity-80"
              style={{
                backgroundColor: "#F5F0EA",
                color: "#2B2B2B",
                border: "1px solid #E5DDD5",
              }}
            >
              {p}
            </button>
          ))}
        </div>

        <button
          onClick={() => handleSearch(query)}
          disabled={!query.trim() || loading}
          className="w-full py-3.5 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-50"
          style={{
            backgroundColor: "#C9847A",
            boxShadow: "0 4px 16px rgba(201,132,122,0.35)",
          }}
        >
          <Sparkles size={17} />
          {loading ? "Styling..." : "Style Me"}
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div
            className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: "#C9847A", borderTopColor: "transparent" }}
          />
          <p className="text-sm" style={{ color: "#7A6F68" }}>
            Finding the perfect outfits...
          </p>
        </div>
      )}

      {/* Empty state */}
      {!loading && outfits.length === 0 && query && (
        <div className="text-center py-12">
          <p className="text-sm" style={{ color: "#7A6F68" }}>
            No outfits found. Try a different search or add more items to your
            closet.
          </p>
        </div>
      )}

      {/* Outfit cards */}
      <div className="space-y-4">
        {outfits.map((outfit, idx) => (
          <div
            key={idx}
            className="rounded-2xl overflow-hidden"
            style={{
              backgroundColor: "#FFFFFF",
              boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
              border: "1px solid #F0EBE6",
            }}
          >
            <div className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3
                    className="font-bold text-base mb-1.5"
                    style={{ color: "#2B2B2B" }}
                  >
                    {outfit.outfit_name}
                  </h3>
                  <span
                    className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold"
                    style={{
                      backgroundColor: "rgba(201,132,122,0.1)",
                      color: "#C9847A",
                    }}
                  >
                    {outfit.occasion_fit}
                  </span>
                </div>
                <span
                  className="text-xs font-medium"
                  style={{ color: "#7A6F68" }}
                >
                  {Math.round(outfit.confidence * 100)}% match
                </span>
              </div>

              {/* Item thumbnails */}
              <div className="flex gap-2 mb-4 flex-wrap">
                {outfit.item_ids.map((id) => {
                  const item = selectedItems[id];
                  if (!item) return null;
                  return (
                    <div
                      key={id}
                      className="relative rounded-xl overflow-hidden"
                      style={{
                        width: 72,
                        height: 72,
                        backgroundColor: "#F5F0EA",
                      }}
                    >
                      <Image
                        src={item.image_url}
                        alt={item.suggested_name || item.category}
                        fill
                        className="object-cover"
                        sizes="72px"
                      />
                    </div>
                  );
                })}
              </div>

              <p className="text-sm italic mb-4" style={{ color: "#7A6F68" }}>
                {outfit.styling_tip}
              </p>

              <div className="flex gap-2">
                <button
                  onClick={() => handleAccept(outfit)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
                  style={{ backgroundColor: "#2E7D32" }}
                >
                  <ThumbsUp size={15} /> Accept
                </button>
                <button
                  onClick={() => handleReject(outfit)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium transition-all"
                  style={{ backgroundColor: "#F5F0EA", color: "#7A6F68" }}
                >
                  <ThumbsDown size={15} /> Reject
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
