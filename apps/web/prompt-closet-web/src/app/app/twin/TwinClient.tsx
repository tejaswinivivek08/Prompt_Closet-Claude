"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { Upload, Sparkles, Check } from "lucide-react";
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

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

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
      alert("Failed to generate avatar. Please try again.");
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

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1" style={{ color: "#2B2B2B" }}>
          Digital Twin
        </h1>
        <p className="text-sm" style={{ color: "#7A6F68" }}>
          Create your AI avatar and try on outfits virtually.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Avatar card */}
        <div
          className="rounded-2xl p-6"
          style={{
            backgroundColor: "#FFFFFF",
            boxShadow: "0 2px 16px rgba(0,0,0,0.05)",
            border: "1px solid #F0EBE6",
          }}
        >
          <h2 className="font-bold text-base mb-4" style={{ color: "#2B2B2B" }}>
            Your Avatar
          </h2>

          {avatar ? (
            <div
              className="relative rounded-2xl overflow-hidden mb-5"
              style={{ aspectRatio: "3/4", backgroundColor: "#F5F0EA" }}
            >
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
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                const file = e.dataTransfer.files[0];
                if (file?.type.startsWith("image/")) handleFile(file);
              }}
              onClick={() => fileRef.current?.click()}
              className="rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer mb-5 transition-all"
              style={{
                aspectRatio: "3/4",
                borderColor: dragging ? "#C9847A" : "#E5DDD5",
                backgroundColor: dragging
                  ? "rgba(201,132,122,0.05)"
                  : "#F5F0EA",
              }}
            >
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center mb-3"
                style={{ backgroundColor: "rgba(201,132,122,0.1)" }}
              >
                <Upload size={24} style={{ color: "#C9847A" }} />
              </div>
              <p
                className="text-sm font-medium mb-1"
                style={{ color: "#2B2B2B" }}
              >
                Drop your selfie here
              </p>
              <p className="text-xs" style={{ color: "#7A6F68" }}>
                or click to upload
              </p>
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

          {generating ? (
            <div className="flex items-center justify-center gap-2 py-3">
              <div
                className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
                style={{
                  borderColor: "#C9847A",
                  borderTopColor: "transparent",
                }}
              />
              <span className="text-sm" style={{ color: "#7A6F68" }}>
                Generating avatar...
              </span>
            </div>
          ) : (
            !avatar && (
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full py-3 rounded-xl font-semibold text-sm text-white transition-all hover:opacity-90"
                style={{
                  backgroundColor: "#C9847A",
                  boxShadow: "0 4px 16px rgba(201,132,122,0.35)",
                }}
              >
                Generate Avatar
              </button>
            )
          )}
        </div>

        {/* Outfit selection card */}
        <div
          className="rounded-2xl p-6"
          style={{
            backgroundColor: "#FFFFFF",
            boxShadow: "0 2px 16px rgba(0,0,0,0.05)",
            border: "1px solid #F0EBE6",
          }}
        >
          <h2 className="font-bold text-base mb-1" style={{ color: "#2B2B2B" }}>
            Select Outfit
          </h2>
          <p className="text-xs mb-4" style={{ color: "#7A6F68" }}>
            Tap items from your closet to try on
          </p>

          {initialItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <p className="text-sm" style={{ color: "#7A6F68" }}>
                No items in your closet yet
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2 mb-5 max-h-72 overflow-y-auto pr-1">
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
                    className="relative rounded-xl overflow-hidden cursor-pointer transition-all"
                    style={{
                      aspectRatio: "1",
                      border: isSelected
                        ? "2px solid #C9847A"
                        : "2px solid transparent",
                    }}
                  >
                    <Image
                      src={item.image_url}
                      alt={item.suggested_name || item.category}
                      fill
                      className="object-cover"
                      sizes="100px"
                    />
                    {isSelected && (
                      <div
                        className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: "#C9847A" }}
                      >
                        <Check size={11} className="text-white" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <button
            onClick={handleTryOn}
            disabled={selectedOutfit.length === 0 || !avatar || tryonLoading}
            className="w-full py-3.5 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-40"
            style={{
              backgroundColor: "#C9847A",
              boxShadow:
                selectedOutfit.length > 0 && avatar
                  ? "0 4px 16px rgba(201,132,122,0.35)"
                  : "none",
            }}
          >
            {tryonLoading ? (
              <>
                <div
                  className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"
                  style={{
                    borderColor: "#FFFFFF",
                    borderTopColor: "transparent",
                  }}
                />
                Generating...
              </>
            ) : (
              <>
                <Sparkles size={16} /> Try Outfit On Me
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
