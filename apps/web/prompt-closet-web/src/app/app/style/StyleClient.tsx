"use client";

import { useState, useEffect } from "react";
import {
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  Clock,
  Thermometer,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const QUICK_PROMPTS = [
  "Diwali outfit",
  "Office Monday",
  "Wedding guest",
  "Casual weekend",
  "Date night",
];

const PLACEHOLDERS = [
  "Something for a rainy day meeting...",
  "Diwali party outfit, festive but not too heavy...",
  "Casual Sunday brunch, feel good vibes...",
  "First date, want to impress but not overdo it...",
  "Beach vacation, light and comfortable...",
];

interface OutfitItem {
  id: string;
  image_url: string;
  category: string;
  suggested_name?: string;
  colors?: string[];
}

interface OutfitSuggestion {
  id: string;
  outfit_name: string;
  item_ids: string[];
  occasion_fit: string;
  styling_tip: string;
  confidence: number;
  weather_context?: string;
}

interface SavedOutfit {
  id: string;
  name: string;
  occasion?: string;
  notes?: string;
  created_at: string;
  item_ids: string[];
}

function ShimmerLoader() {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <div className="flex gap-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-3 h-3 rounded-full"
            style={{
              backgroundColor: "#C9847A",
              opacity: 0.5 + i * 0.15,
              animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </div>
      <p className="text-sm font-medium" style={{ color: "#7A6F68" }}>
        Finding the perfect outfits...
      </p>
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(0.8); opacity: 0.4; }
          50% { transform: scale(1.2); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function OutfitCard({
  outfit,
  onAccept,
  onReject,
}: {
  outfit: OutfitSuggestion & { items?: OutfitItem[] };
  onAccept: (outfit: OutfitSuggestion) => void;
  onReject: (outfit: OutfitSuggestion) => void;
}) {
  // Use embedded items from API, fallback to item_ids mapping
  const outfitItems = outfit.items || [];

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        backgroundColor: "#FFFFFF",
        boxShadow: "0 2px 16px rgba(0,0,0,0.06)",
        border: "1px solid #F0EBE6",
      }}
    >
      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3
              className="font-bold text-base mb-2"
              style={{ color: "#2B2B2B" }}
            >
              {outfit.outfit_name}
            </h3>
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold"
                style={{
                  backgroundColor: "rgba(201,132,122,0.12)",
                  color: "#C9847A",
                }}
              >
                {outfit.occasion_fit}
              </span>
              {outfit.weather_context && (
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                  style={{
                    backgroundColor: "#F5F0EA",
                    color: "#7A6F68",
                    border: "1px solid #E5DDD5",
                  }}
                >
                  <Thermometer size={10} />
                  {outfit.weather_context}
                </span>
              )}
            </div>
          </div>
          <span
            className="text-xs font-semibold ml-2 shrink-0"
            style={{ color: "#C9847A" }}
          >
            {Math.round(outfit.confidence * 100)}% match
          </span>
        </div>

        {/* Item photos */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {outfitItems.map((item) => (
            <div
              key={item.id}
              className="relative rounded-xl overflow-hidden"
              style={{
                width: 76,
                height: 76,
                backgroundColor: "#F5F0EA",
                border: "1px solid #E5DDD5",
              }}
            >
              <img
                src={item.image_url}
                alt={item.suggested_name || item.category}
                className="object-cover w-full h-full"
              />
            </div>
          ))}
          {outfitItems.length === 0 && (
            <div
              className="flex items-center justify-center rounded-xl"
              style={{
                width: 76,
                height: 76,
                backgroundColor: "#F5F0EA",
                border: "1px dashed #E5DDD5",
              }}
            >
              <span className="text-xs" style={{ color: "#7A6F68" }}>
                No preview
              </span>
            </div>
          )}
        </div>

        {/* AI explanation */}
        <p
          className="text-sm italic mb-5 leading-relaxed"
          style={{ color: "#7A6F68" }}
        >
          {outfit.styling_tip}
        </p>

        {/* Action buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => onAccept(outfit)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95"
            style={{
              backgroundColor: "#2E7D32",
              boxShadow: "0 2px 8px rgba(46,125,50,0.25)",
            }}
          >
            <ThumbsUp size={14} />
            Accept
          </button>
          <button
            onClick={() => onReject(outfit)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-80 active:scale-95"
            style={{
              backgroundColor: "#F5F0EA",
              color: "#7A6F68",
              border: "1px solid #E5DDD5",
            }}
          >
            <ThumbsDown size={14} />
            Reject
          </button>
        </div>
      </div>
    </div>
  );
}

function SavedOutfitCard({
  outfit,
  items,
}: {
  outfit: SavedOutfit;
  items: OutfitItem[];
}) {
  const outfitItems = outfit.item_ids
    .map((id) => items.find((i) => i.id === id))
    .filter(Boolean) as OutfitItem[];

  const date = new Date(outfit.created_at);
  const dateStr = date.toLocaleDateString("en-SG", {
    day: "numeric",
    month: "short",
  });

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        backgroundColor: "#FFFFFF",
        boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
        border: "1px solid #F0EBE6",
      }}
    >
      {/* Item photos strip */}
      <div className="flex h-20 bg-stone-100 overflow-hidden">
        {outfitItems.slice(0, 4).map((item) => (
          <div key={item.id} className="flex-1 relative">
            <img
              src={item.image_url}
              alt={item.suggested_name || item.category}
              className="object-cover w-full h-full"
            />
          </div>
        ))}
        {outfitItems.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <span className="text-xs" style={{ color: "#7A6F68" }}>
              No items
            </span>
          </div>
        )}
      </div>
      <div className="p-3">
        <p
          className="font-semibold text-sm truncate mb-1"
          style={{ color: "#2B2B2B" }}
        >
          {outfit.name}
        </p>
        <div className="flex items-center justify-between">
          {outfit.occasion && (
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{
                backgroundColor: "rgba(201,132,122,0.1)",
                color: "#C9847A",
              }}
            >
              {outfit.occasion}
            </span>
          )}
          <span
            className="text-xs flex items-center gap-1 ml-auto"
            style={{ color: "#7A6F68" }}
          >
            <Clock size={10} />
            {dateStr}
          </span>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center"
        style={{ backgroundColor: "rgba(201,132,122,0.1)" }}
      >
        <Sparkles size={24} style={{ color: "#C9847A" }} />
      </div>
      <p className="text-sm font-medium" style={{ color: "#7A6F68" }}>
        {message}
      </p>
    </div>
  );
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
  const [error, setError] = useState<string | null>(null);
  const [savedOutfits, setSavedOutfits] = useState<SavedOutfit[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [placeholderIdx] = useState(() =>
    Math.floor(Math.random() * PLACEHOLDERS.length),
  );
  const supabase = createClient();

  // Load saved outfits on mount
  useEffect(() => {
    const loadSaved = async () => {
      const { data } = await supabase
        .from("outfits")
        .select("id, name, occasion, notes, created_at, item_ids")
        .eq("user_id", userId)
        .eq("ai_generated", true)
        .order("created_at", { ascending: false })
        .limit(12);
      if (data) setSavedOutfits(data);
    };
    loadSaved();
  }, [userId, supabase]);

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;

    if (initialItems.length === 0) {
      setError("Add items to your closet first!");
      return;
    }

    setLoading(true);
    setError(null);
    setOutfits([]);
    setShowHistory(false);

    try {
      const res = await fetch("/api/magicbar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQuery, userId }),
      });
      const data = await res.json();

      if (data.error) {
        setError(data.error);
        return;
      }

      if (!data.outfits || data.outfits.length === 0) {
        setError("I couldn't find anything matching your request.");
        return;
      }

      setOutfits(data.outfits);
    } catch {
      setError("Something went wrong. Try again.");
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

    // Reload saved outfits
    const { data } = await supabase
      .from("outfits")
      .select("id, name, occasion, notes, created_at, item_ids")
      .eq("user_id", userId)
      .eq("ai_generated", true)
      .order("created_at", { ascending: false })
      .limit(12);
    if (data) setSavedOutfits(data);

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

  const handleQuickPrompt = (prompt: string) => {
    setQuery(prompt);
    handleSearch(prompt);
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1" style={{ color: "#2B2B2B" }}>
          Magic Bar
        </h1>
        <p className="text-sm" style={{ color: "#7A6F68" }}>
          Tell me the occasion — I&apos;ll style the outfit.
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
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              handleSearch(query);
            }
          }}
          placeholder={PLACEHOLDERS[placeholderIdx]}
          className="w-full px-4 py-3.5 rounded-xl resize-none text-sm mb-4 transition-all"
          style={{
            backgroundColor: "#F5F0EA",
            border: "1px solid #E5DDD5",
            color: "#2B2B2B",
            outline: "none",
            lineHeight: 1.6,
          }}
          rows={3}
        />

        {/* Quick prompts — 5 chips */}
        <div className="flex gap-2 flex-wrap mb-4">
          {QUICK_PROMPTS.map((p) => (
            <button
              key={p}
              onClick={() => handleQuickPrompt(p)}
              className="px-4 py-1.5 rounded-full text-sm font-medium transition-all hover:opacity-80 active:scale-95"
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
          className="w-full py-3.5 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-50 active:scale-98"
          style={{
            backgroundColor: "#C9847A",
            boxShadow: "0 4px 16px rgba(201,132,122,0.35)",
          }}
        >
          <Sparkles size={16} />
          {loading ? "Finding outfits..." : "Style Me"}
        </button>

        <p className="text-xs text-center mt-2" style={{ color: "#7A6F68" }}>
          Press{" "}
          <kbd
            className="px-1.5 py-0.5 rounded text-xs font-mono"
            style={{ backgroundColor: "#E5DDD5", color: "#2B2B2B" }}
          >
            Ctrl
          </kbd>{" "}
          +{" "}
          <kbd
            className="px-1.5 py-0.5 rounded text-xs font-mono"
            style={{ backgroundColor: "#E5DDD5", color: "#2B2B2B" }}
          >
            Enter
          </kbd>{" "}
          to search
        </p>
      </div>

      {/* Error state */}
      {error && (
        <div
          className="rounded-2xl p-5 mb-6 text-center"
          style={{
            backgroundColor: "#FFFFFF",
            border: "1px solid #E5DDD5",
          }}
        >
          <p className="text-sm font-medium" style={{ color: "#7A6F68" }}>
            {error}
          </p>
          {error.includes("MiniMax") && (
            <p className="text-xs mt-2" style={{ color: "#7A6F68" }}>
              Add{" "}
              <code
                className="px-1 py-0.5 rounded text-xs font-mono"
                style={{ backgroundColor: "#F5F0EA" }}
              >
                MINIMAX_API_KEY
              </code>{" "}
              to your environment variables to enable AI styling.
            </p>
          )}
        </div>
      )}

      {/* Loading shimmer */}
      {loading && <ShimmerLoader />}

      {/* Outfit cards */}
      {!loading && outfits.length > 0 && (
        <div className="space-y-4">
          {outfits.map((outfit) => (
            <OutfitCard
              key={outfit.id}
              outfit={outfit}
              onAccept={handleAccept}
              onReject={handleReject}
            />
          ))}
        </div>
      )}

      {/* No outfits found, no error, was a search */}
      {!loading && outfits.length === 0 && query && !error && (
        <EmptyState message="I couldn't find anything matching your request." />
      )}

      {/* Style history section */}
      <div className="mt-10">
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="flex items-center gap-2 mb-4 text-sm font-semibold transition-all hover:opacity-80"
          style={{ color: "#2B2B2B" }}
        >
          <img
            src="/icons/History Icon.png"
            alt="History"
            className="w-4 h-4 object-contain"
          />
          Previously Saved Outfits
          <span
            className="ml-1 text-xs font-medium px-2 py-0.5 rounded-full"
            style={{
              backgroundColor: "rgba(201,132,122,0.1)",
              color: "#C9847A",
            }}
          >
            {savedOutfits.length}
          </span>
        </button>

        {showHistory && (
          <>
            {savedOutfits.length === 0 ? (
              <div
                className="rounded-2xl p-6 text-center"
                style={{
                  backgroundColor: "#FFFFFF",
                  border: "1px solid #F0EBE6",
                }}
              >
                <p className="text-sm" style={{ color: "#7A6F68" }}>
                  No saved outfits yet. Accept an outfit suggestion to save it
                  here.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {savedOutfits.map((outfit) => (
                  <SavedOutfitCard
                    key={outfit.id}
                    outfit={outfit}
                    items={initialItems}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
