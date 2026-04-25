"use client";

import { useState } from "react";
import { Save, Shirt, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const SKIN_TONES = [
  { id: "fair-cool", label: "Fair Cool", color: "#FDDBB4" },
  { id: "fair-warm", label: "Fair Warm", color: "#E8B89D" },
  { id: "medium-cool", label: "Medium Cool", color: "#C68E6A" },
  { id: "medium-warm", label: "Medium Warm", color: "#A0674A" },
  { id: "deep-cool", label: "Deep Cool", color: "#6B4423" },
  { id: "deep-warm", label: "Deep Warm", color: "#4A2C17" },
];

const STYLE_PREFS = ["casual", "formal", "festive", "sporty", "minimal"];

export default function ProfileClient({
  profile,
  itemCount,
  outfitCount,
  userId,
}: {
  profile: any;
  itemCount: number;
  outfitCount: number;
  userId: string;
}) {
  const [form, setForm] = useState({
    full_name: profile?.full_name || "",
    skin_tone_palette: profile?.skin_tone_palette || "",
    style_preferences: profile?.style_preferences || [],
  });
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  const handleSave = async () => {
    setSaving(true);
    await supabase.from("profiles").upsert({
      id: userId,
      full_name: form.full_name,
      skin_tone_palette: form.skin_tone_palette,
      style_preferences: form.style_preferences,
    });
    setSaving(false);
    alert("Profile saved!");
  };

  const toggleStylePref = (pref: string) => {
    setForm((f) => ({
      ...f,
      style_preferences: f.style_preferences.includes(pref)
        ? f.style_preferences.filter((p: string) => p !== pref)
        : [...f.style_preferences, pref],
    }));
  };

  return (
    <div className="max-w-xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1" style={{ color: "#2B2B2B" }}>
          Profile
        </h1>
        <p className="text-sm" style={{ color: "#7A6F68" }}>
          Your personal style settings
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div
          className="rounded-2xl p-5 flex items-center gap-4"
          style={{
            backgroundColor: "#FFFFFF",
            boxShadow: "0 2px 16px rgba(0,0,0,0.05)",
            border: "1px solid #F0EBE6",
          }}
        >
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ backgroundColor: "rgba(201,132,122,0.1)" }}
          >
            <Shirt size={22} style={{ color: "#C9847A" }} />
          </div>
          <div>
            <p className="text-2xl font-bold" style={{ color: "#2B2B2B" }}>
              {itemCount}
            </p>
            <p className="text-xs" style={{ color: "#7A6F68" }}>
              Wardrobe Items
            </p>
          </div>
        </div>
        <div
          className="rounded-2xl p-5 flex items-center gap-4"
          style={{
            backgroundColor: "#FFFFFF",
            boxShadow: "0 2px 16px rgba(0,0,0,0.05)",
            border: "1px solid #F0EBE6",
          }}
        >
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ backgroundColor: "rgba(201,132,122,0.1)" }}
          >
            <Sparkles size={22} style={{ color: "#C9847A" }} />
          </div>
          <div>
            <p className="text-2xl font-bold" style={{ color: "#2B2B2B" }}>
              {outfitCount}
            </p>
            <p className="text-xs" style={{ color: "#7A6F68" }}>
              Outfits Created
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div
        className="rounded-2xl p-6 space-y-6"
        style={{
          backgroundColor: "#FFFFFF",
          boxShadow: "0 2px 16px rgba(0,0,0,0.05)",
          border: "1px solid #F0EBE6",
        }}
      >
        <div>
          <label
            className="block text-sm font-medium mb-2"
            style={{ color: "#2B2B2B" }}
          >
            Display Name
          </label>
          <input
            type="text"
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            className="w-full px-4 py-3.5 rounded-xl text-sm transition-all"
            style={{
              backgroundColor: "#F5F0EA",
              border: "1px solid #E5DDD5",
              color: "#2B2B2B",
              outline: "none",
            }}
          />
        </div>

        <div>
          <label
            className="block text-sm font-medium mb-3"
            style={{ color: "#2B2B2B" }}
          >
            Skin Tone
          </label>
          <div className="grid grid-cols-3 gap-2">
            {SKIN_TONES.map((tone) => (
              <button
                key={tone.id}
                onClick={() => setForm({ ...form, skin_tone_palette: tone.id })}
                className="flex items-center gap-2 p-2.5 rounded-xl transition-all"
                style={{
                  backgroundColor:
                    form.skin_tone_palette === tone.id
                      ? "rgba(201,132,122,0.08)"
                      : "#F5F0EA",
                  border:
                    form.skin_tone_palette === tone.id
                      ? "2px solid #C9847A"
                      : "2px solid transparent",
                }}
              >
                <div
                  className="w-7 h-7 rounded-full"
                  style={{ backgroundColor: tone.color }}
                />
                <span
                  className="text-xs font-medium"
                  style={{ color: "#2B2B2B" }}
                >
                  {tone.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label
            className="block text-sm font-medium mb-3"
            style={{ color: "#2B2B2B" }}
          >
            Style Preferences
          </label>
          <div className="flex gap-2 flex-wrap">
            {STYLE_PREFS.map((pref) => (
              <button
                key={pref}
                onClick={() => toggleStylePref(pref)}
                className="px-4 py-1.5 rounded-full text-sm font-medium transition-all hover:opacity-80"
                style={{
                  backgroundColor: form.style_preferences.includes(pref)
                    ? "#C9847A"
                    : "#F5F0EA",
                  color: form.style_preferences.includes(pref)
                    ? "#FFFFFF"
                    : "#2B2B2B",
                  border: form.style_preferences.includes(pref)
                    ? "none"
                    : "1px solid #E5DDD5",
                }}
              >
                {pref.charAt(0).toUpperCase() + pref.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3.5 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-50"
          style={{
            backgroundColor: "#C9847A",
            boxShadow: "0 4px 16px rgba(201,132,122,0.35)",
          }}
        >
          <Save size={17} />
          {saving ? "Saving..." : "Save Profile"}
        </button>
      </div>
    </div>
  );
}
