"use client";

import { useState } from "react";
import Image from "next/image";
import { Sparkles, ThumbsUp, ThumbsDown, Loader2 } from "lucide-react";
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

      // Pre-select items from suggestions
      const itemMap: Record<string, any> = {};
      data.outfits?.forEach((o: OutfitSuggestion) => {
        o.item_ids.forEach((id) => {
          const item = initialItems.find((i) => i.id === id);
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
    await supabase.from("outfits").insert({
      user_id: userId,
      name: outfit.outfit_name,
      item_ids: outfit.item_ids,
      occasion: outfit.occasion_fit,
      notes: outfit.styling_tip,
      ai_generated: true,
    });
    await supabase.from("outfit_feedback").insert({
      user_id: userId,
      query_text: query,
      outfit_name: outfit.outfit_name,
      item_ids: outfit.item_ids,
      feedback: "accepted",
    });
    setOutfits(outfits.filter((o) => o.outfit_name !== outfit.outfit_name));
  };

  const handleReject = async (outfit: OutfitSuggestion) => {
    await supabase.from("outfit_feedback").insert({
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
      <h1 className="text-2xl font-bold text-charcoal mb-2">Magic Bar</h1>
      <p className="text-muted mb-6">
        Tell me what you want to wear, and I'll style it.
      </p>

      <div className="bg-white rounded-card border border-border p-6 mb-6">
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Something for a rainy day meeting..."
          className="w-full px-4 py-3 border border-border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-rose-gold text-charcoal"
          rows={3}
        />

        <div className="flex gap-2 mt-3 flex-wrap">
          {QUICK_PROMPTS.map((p) => (
            <button
              key={p}
              onClick={() => {
                setQuery(p);
                handleSearch(p);
              }}
              className="px-3 py-1.5 bg-ivory text-charcoal text-sm rounded-full border border-border hover:border-rose-gold transition-colors"
            >
              {p}
            </button>
          ))}
        </div>

        <button
          onClick={() => handleSearch(query)}
          disabled={!query.trim() || loading}
          className="mt-4 w-full py-3 bg-rose-gold text-white font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 size={18} className="animate-spin" /> Styling...
            </>
          ) : (
            <>
              <Sparkles size={18} /> Style Me
            </>
          )}
        </button>
      </div>

      {loading && (
        <div className="text-center py-12">
          <div className="inline-flex items-center gap-2 text-muted">
            <Loader2 size={24} className="animate-spin" />
            <span>Finding the perfect outfits...</span>
          </div>
        </div>
      )}

      {!loading && outfits.length === 0 && query && (
        <div className="text-center py-12 text-muted">
          No outfits found. Try a different search or add more items to your
          closet.
        </div>
      )}

      <div className="space-y-4">
        {outfits.map((outfit, idx) => (
          <div
            key={idx}
            className="bg-white rounded-card border border-border p-4"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-bold text-charcoal">
                  {outfit.outfit_name}
                </h3>
                <span className="text-xs px-2 py-0.5 bg-rose-gold/10 text-rose-gold rounded-full">
                  {outfit.occasion_fit}
                </span>
              </div>
              <span className="text-xs text-muted">
                {Math.round(outfit.confidence * 100)}% match
              </span>
            </div>

            <div className="flex gap-2 mb-3 flex-wrap">
              {outfit.item_ids.map((id) => {
                const item = selectedItems[id];
                if (!item) return null;
                return (
                  <div
                    key={id}
                    className="relative w-16 h-16 bg-ivory rounded-lg overflow-hidden"
                  >
                    <Image
                      src={item.image_url}
                      alt={item.suggested_name || item.category}
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  </div>
                );
              })}
            </div>

            <p className="text-sm text-muted mb-4 italic">
              {outfit.styling_tip}
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => handleAccept(outfit)}
                className="flex-1 flex items-center justify-center gap-2 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors text-sm font-medium"
              >
                <ThumbsUp size={16} /> Accept
              </button>
              <button
                onClick={() => handleReject(outfit)}
                className="flex-1 flex items-center justify-center gap-2 py-2 bg-gray-100 text-muted rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
              >
                <ThumbsDown size={16} /> Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
