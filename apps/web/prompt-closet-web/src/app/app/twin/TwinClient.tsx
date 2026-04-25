"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { Upload, Sparkles, Loader2, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function TwinClient({
  initialItems,
  initialAvatar,
  userId,
}: {
  initialItems: any[];
  initialAvatar: any | null;
  userId: string;
}) {
  const [avatar, setAvatar] = useState(initialAvatar);
  const [generating, setGenerating] = useState(false);
  const [tryonLoading, setTryonLoading] = useState(false);
  const [tryonResult, setTryonResult] = useState<string | null>(null);
  const [selectedOutfit, setSelectedOutfit] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const handleFile = async (file: File) => {
    setGenerating(true);
    try {
      const base64 = await fileToBase64(file);
      const res = await fetch("/api/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageData: base64, userId }),
      });
      const data = await res.json();
      if (data.avatarUrl) {
        setAvatar({ avatar_url: data.avatarUrl, style: "fashion_model" });
        setTryonResult(null);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to generate avatar");
    } finally {
      setGenerating(false);
    }
  };

  const handleTryOn = async () => {
    if (selectedOutfit.length === 0) return;
    setTryonLoading(true);
    try {
      const res = await fetch("/api/avatar/tryon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          avatarUrl: avatar?.avatar_url,
          outfitItemIds: selectedOutfit,
        }),
      });
      const data = await res.json();
      setTryonResult(data.resultUrl || null);
    } catch (err) {
      console.error(err);
    } finally {
      setTryonLoading(false);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) handleFile(file);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-charcoal mb-2">Digital Twin</h1>
      <p className="text-muted mb-6">
        Create your AI avatar and try on outfits virtually.
      </p>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Avatar section */}
        <div className="bg-white rounded-card border border-border p-6">
          <h2 className="font-bold text-charcoal mb-4">Your Avatar</h2>

          {avatar ? (
            <div className="relative aspect-[3/4] bg-ivory rounded-lg overflow-hidden mb-4">
              <Image
                src={tryonResult || avatar.avatar_url}
                alt="Your digital twin"
                fill
                className="object-cover"
              />
            </div>
          ) : (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              className={`aspect-[3/4] bg-ivory rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors mb-4 ${dragging ? "border-rose-gold" : "border-border"}`}
            >
              <Upload size={40} className="text-muted mb-3" />
              <p className="text-sm text-charcoal font-medium">
                Drop your selfie here
              </p>
              <p className="text-xs text-muted mt-1">or click to upload</p>
            </div>
          )}

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />

          {generating && (
            <div className="flex items-center justify-center gap-2 py-3 text-muted">
              <Loader2 size={18} className="animate-spin" />
              <span>Generating avatar...</span>
            </div>
          )}

          {!generating && !avatar && (
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full py-3 bg-rose-gold text-white font-semibold rounded-lg hover:opacity-90 transition-opacity"
            >
              Generate Avatar
            </button>
          )}
        </div>

        {/* Outfit selection */}
        <div className="bg-white rounded-card border border-border p-6">
          <h2 className="font-bold text-charcoal mb-4">Select Outfit</h2>
          <p className="text-sm text-muted mb-4">
            Pick items from your closet to try on
          </p>

          <div className="grid grid-cols-3 gap-2 mb-4 max-h-64 overflow-y-auto">
            {initialItems.map((item) => {
              const isSelected = selectedOutfit.includes(item.id);
              return (
                <div
                  key={item.id}
                  onClick={() =>
                    setSelectedOutfit(
                      isSelected
                        ? selectedOutfit.filter((id) => id !== item.id)
                        : [...selectedOutfit, item.id],
                    )
                  }
                  className={`relative aspect-square bg-ivory rounded-lg overflow-hidden cursor-pointer border-2 transition-colors ${isSelected ? "border-rose-gold" : "border-transparent"}`}
                >
                  <Image
                    src={item.image_url}
                    alt={item.suggested_name || item.category}
                    fill
                    className="object-cover"
                    sizes="100px"
                  />
                  {isSelected && (
                    <div className="absolute top-1 right-1 bg-rose-gold rounded-full p-0.5">
                      <Check size={12} className="text-white" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <button
            onClick={handleTryOn}
            disabled={selectedOutfit.length === 0 || !avatar || tryonLoading}
            className="w-full py-3 bg-charcoal text-white font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {tryonLoading ? (
              <>
                <Loader2 size={18} className="animate-spin" /> Generating...
              </>
            ) : (
              <>
                <Sparkles size={18} /> Try Outfit On Me
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
