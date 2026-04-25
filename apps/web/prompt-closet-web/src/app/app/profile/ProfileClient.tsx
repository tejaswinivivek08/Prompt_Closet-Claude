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
      <h1 className="text-2xl font-bold text-charcoal mb-6">Profile</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-card border border-border p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-rose-gold/10 rounded-full flex items-center justify-center">
            <Shirt size={20} className="text-rose-gold" />
          </div>
          <div>
            <p className="text-2xl font-bold text-charcoal">{itemCount}</p>
            <p className="text-xs text-muted">Wardrobe Items</p>
          </div>
        </div>
        <div className="bg-white rounded-card border border-border p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-rose-gold/10 rounded-full flex items-center justify-center">
            <Sparkles size={20} className="text-rose-gold" />
          </div>
          <div>
            <p className="text-2xl font-bold text-charcoal">{outfitCount}</p>
            <p className="text-xs text-muted">Outfits Created</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white rounded-card border border-border p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-charcoal mb-1">
            Display Name
          </label>
          <input
            type="text"
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-gold text-charcoal"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-charcoal mb-2">
            Skin Tone
          </label>
          <div className="grid grid-cols-3 gap-2">
            {SKIN_TONES.map((tone) => (
              <button
                key={tone.id}
                onClick={() => setForm({ ...form, skin_tone_palette: tone.id })}
                className={`flex items-center gap-2 p-2 rounded-lg border transition-colors ${
                  form.skin_tone_palette === tone.id
                    ? "border-rose-gold bg-rose-gold/5"
                    : "border-border hover:border-rose-gold"
                }`}
              >
                <div
                  className="w-6 h-6 rounded-full border border-border"
                  style={{ backgroundColor: tone.color }}
                />
                <span className="text-xs text-charcoal">{tone.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-charcoal mb-2">
            Style Preferences
          </label>
          <div className="flex gap-2 flex-wrap">
            {STYLE_PREFS.map((pref) => (
              <button
                key={pref}
                onClick={() => toggleStylePref(pref)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  form.style_preferences.includes(pref)
                    ? "bg-rose-gold text-white"
                    : "bg-ivory text-charcoal border border-border"
                }`}
              >
                {pref.charAt(0).toUpperCase() + pref.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3 bg-rose-gold text-white font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Save size={18} />
          {saving ? "Saving..." : "Save Profile"}
        </button>
      </div>
    </div>
  );
}
