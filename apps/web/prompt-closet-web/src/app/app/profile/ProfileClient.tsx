"use client";

import { useState, useRef, useEffect } from "react";
import {
  Save,
  Shirt,
  Sparkles,
  Calendar,
  Heart,
  Camera,
  X,
  Check,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const SKIN_TONE_COLORS = [
  // Fair Cool
  ["#FDDBB4", "#F5C9A8", "#E8B89D", "#E0A882", "#D4946A", "#C68050"],
  // Fair Warm
  ["#FFECD2", "#FFE0B8", "#F5D0A0", "#E8B88A", "#DCA070", "#C88858"],
  // Medium Cool
  ["#D4A574", "#C68E6A", "#B8785A", "#A0674A", "#8A563A", "#70442A"],
  // Medium Warm
  ["#C49A6C", "#B08458", "#9C6E44", "#885830", "#74421C", "#602C08"],
  // Deep Cool
  ["#8B5E3C", "#6B4423", "#5A3A1E", "#4A2C17", "#3A1E10", "#2A1008"],
  // Deep Warm
  ["#A0674A", "#8B4E32", "#763A1A", "#612600", "#4C1200", "#370000"],
];

const BODY_TYPES = [
  { id: "hourglass", label: "Hourglass", icon: "◐" },
  { id: "pear", label: "Pear", icon: "◓" },
  { id: "apple", label: "Apple", icon: "◒" },
  { id: "rectangle", label: "Rectangle", icon: "▬" },
  { id: "inverted_triangle", label: "Inverted Triangle", icon: "◁" },
];

const STYLE_PREFERENCES = [
  "Minimalist",
  "Streetwear",
  "Formal",
  "Festive",
  "Casual",
  "Maximalist",
  "Vintage",
  "Bohemian",
  "Indo-western",
];

interface ProfileClientProps {
  profile: any;
  itemCount: number;
  outfitCount: number;
  userId: string;
  mostWornItem?: string;
}

export default function ProfileClient({
  profile,
  itemCount,
  outfitCount,
  userId,
  mostWornItem,
}: ProfileClientProps) {
  const [form, setForm] = useState({
    full_name: profile?.full_name || "",
    skin_tone_palette: profile?.skin_tone_palette || "",
    style_preferences: profile?.style_preferences || [],
    height: profile?.height || "",
    weight: profile?.weight || "",
    bust: profile?.bust || "",
    waist: profile?.waist || "",
    hips: profile?.hips || "",
    body_type: profile?.body_type || "",
  });

  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || "");
  const [saving, setSaving] = useState(false);
  const [showWebcam, setShowWebcam] = useState(false);
  const [webcamStream, setWebcamStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const supabase = createClient();

  const daysActive = profile?.created_at
    ? Math.floor(
        (Date.now() - new Date(profile.created_at).getTime()) /
          (1000 * 60 * 60 * 24),
      )
    : 0;

  const initials = form.full_name
    ? form.full_name.charAt(0).toUpperCase()
    : "?";

  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setWebcamStream(stream);
      setShowWebcam(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Webcam error:", err);
      alert("Could not access webcam. Please check permissions.");
    }
  };

  const stopWebcam = () => {
    if (webcamStream) {
      webcamStream.getTracks().forEach((track) => track.stop());
      setWebcamStream(null);
    }
    setShowWebcam(false);
    setCapturedImage(null);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
        setCapturedImage(dataUrl);
      }
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      await uploadAvatar(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleWebcamCapture = async () => {
    if (!capturedImage) return;
    await uploadAvatar(capturedImage);
    stopWebcam();
  };

  const uploadAvatar = async (dataUrl: string) => {
    setSaving(true);
    try {
      const base64 = dataUrl.split(",")[1];
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: "image/jpeg" });

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(`${userId}/avatar.jpg`, blob, {
          contentType: "image/jpeg",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(`${userId}/avatar.jpg`);
      setAvatarUrl(publicUrl);
      alert("Photo uploaded successfully!");
    } catch (err) {
      console.error(err);
      alert("Upload failed. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await supabase.from("profiles").upsert({
        id: userId,
        full_name: form.full_name,
        skin_tone_palette: form.skin_tone_palette,
        style_preferences: form.style_preferences,
        avatar_url: avatarUrl,
        height: form.height ? Number(form.height) : null,
        weight: form.weight ? Number(form.weight) : null,
        bust: form.bust ? Number(form.bust) : null,
        waist: form.waist ? Number(form.waist) : null,
        hips: form.hips ? Number(form.hips) : null,
        body_type: form.body_type,
      });
      alert("Profile saved!");
    } catch (err) {
      console.error(err);
      alert("Save failed. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const toggleStylePref = (pref: string) => {
    setForm((f) => ({
      ...f,
      style_preferences: f.style_preferences.includes(pref)
        ? f.style_preferences.filter((p: string) => p !== pref)
        : [...f.style_preferences, pref],
    }));
  };

  const inputStyle = {
    backgroundColor: "#F5F0EA",
    border: "1px solid #E5DDD5",
    color: "#2B2B2B",
    outline: "none",
  };

  const cardStyle = {
    backgroundColor: "#FFFFFF",
    boxShadow: "0 2px 16px rgba(0,0,0,0.05)",
    border: "1px solid #F0EBE6",
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1" style={{ color: "#2B2B2B" }}>
          Profile
        </h1>
        <p className="text-sm" style={{ color: "#7A6F68" }}>
          Your personal style settings
        </p>
      </div>

      {/* Profile Picture Section */}
      <div className="rounded-2xl p-6 mb-6" style={cardStyle}>
        <div className="flex items-center gap-6">
          {/* Avatar */}
          <div className="relative">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Profile"
                className="w-[120px] h-[120px] rounded-full object-cover"
                style={{ border: "3px solid #C9847A" }}
              />
            ) : (
              <div
                className="w-[120px] h-[120px] rounded-full flex items-center justify-center text-4xl font-bold"
                style={{ backgroundColor: "#C9847A", color: "#FFFFFF" }}
              >
                {initials}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <div className="flex gap-3">
              <label
                className="flex items-center gap-2 px-4 py-2.5 rounded-full cursor-pointer transition-all hover:opacity-90 text-sm font-medium"
                style={{
                  backgroundColor: "#C9847A",
                  color: "#FFFFFF",
                  boxShadow: "0 4px 16px rgba(201,132,122,0.35)",
                }}
              >
                <Camera size={16} />
                Change Photo
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </label>
              <button
                onClick={startWebcam}
                className="flex items-center gap-2 px-4 py-2.5 rounded-full cursor-pointer transition-all hover:opacity-90 text-sm font-medium"
                style={{
                  backgroundColor: "#F5F0EA",
                  color: "#2B2B2B",
                  border: "1px solid #E5DDD5",
                }}
              >
                <Camera size={16} />
                Use Webcam
              </button>
            </div>
            <p className="text-xs" style={{ color: "#7A6F68" }}>
              Upload a photo or take one with your webcam
            </p>
          </div>
        </div>
      </div>

      {/* Webcam Modal */}
      {showWebcam && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
        >
          <div className="rounded-2xl p-6 w-full max-w-md" style={cardStyle}>
            <div className="flex items-center justify-between mb-4">
              <h3
                className="text-lg font-semibold"
                style={{ color: "#2B2B2B" }}
              >
                Take Photo
              </h3>
              <button
                onClick={stopWebcam}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <X size={20} style={{ color: "#7A6F68" }} />
              </button>
            </div>

            <div className="relative bg-black rounded-xl overflow-hidden mb-4">
              {!capturedImage ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-auto"
                />
              ) : (
                <img
                  src={capturedImage}
                  alt="Captured"
                  className="w-full h-auto"
                />
              )}
            </div>

            <canvas ref={canvasRef} className="hidden" />

            <div className="flex gap-3">
              {!capturedImage ? (
                <button
                  onClick={capturePhoto}
                  className="flex-1 py-3 rounded-xl font-semibold text-sm text-white transition-all hover:opacity-90"
                  style={{
                    backgroundColor: "#C9847A",
                    boxShadow: "0 4px 16px rgba(201,132,122,0.35)",
                  }}
                >
                  Capture
                </button>
              ) : (
                <>
                  <button
                    onClick={() => setCapturedImage(null)}
                    className="flex-1 py-3 rounded-xl font-semibold text-sm transition-all hover:opacity-90"
                    style={{
                      backgroundColor: "#F5F0EA",
                      color: "#2B2B2B",
                      border: "1px solid #E5DDD5",
                    }}
                  >
                    Retake
                  </button>
                  <button
                    onClick={handleWebcamCapture}
                    disabled={saving}
                    className="flex-1 py-3 rounded-xl font-semibold text-sm text-white transition-all hover:opacity-90 disabled:opacity-50"
                    style={{
                      backgroundColor: "#C9847A",
                      boxShadow: "0 4px 16px rgba(201,132,122,0.35)",
                    }}
                  >
                    {saving ? "Uploading..." : "Use Photo"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="rounded-2xl p-5" style={cardStyle}>
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center mb-3"
            style={{ backgroundColor: "rgba(201,132,122,0.1)" }}
          >
            <Shirt size={18} style={{ color: "#C9847A" }} />
          </div>
          <p className="text-2xl font-bold" style={{ color: "#2B2B2B" }}>
            {itemCount}
          </p>
          <p className="text-xs" style={{ color: "#7A6F68" }}>
            Wardrobe Items
          </p>
        </div>

        <div className="rounded-2xl p-5" style={cardStyle}>
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center mb-3"
            style={{ backgroundColor: "rgba(201,132,122,0.1)" }}
          >
            <Sparkles size={18} style={{ color: "#C9847A" }} />
          </div>
          <p className="text-2xl font-bold" style={{ color: "#2B2B2B" }}>
            {outfitCount}
          </p>
          <p className="text-xs" style={{ color: "#7A6F68" }}>
            Outfits Created
          </p>
        </div>

        <div className="rounded-2xl p-5" style={cardStyle}>
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center mb-3"
            style={{ backgroundColor: "rgba(201,132,122,0.1)" }}
          >
            <Calendar size={18} style={{ color: "#C9847A" }} />
          </div>
          <p className="text-2xl font-bold" style={{ color: "#2B2B2B" }}>
            {daysActive}
          </p>
          <p className="text-xs" style={{ color: "#7A6F68" }}>
            Days Active
          </p>
        </div>

        <div className="rounded-2xl p-5" style={cardStyle}>
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center mb-3"
            style={{ backgroundColor: "rgba(201,132,122,0.1)" }}
          >
            <Heart size={18} style={{ color: "#C9847A" }} />
          </div>
          <p
            className="text-sm font-bold truncate"
            style={{ color: "#2B2B2B" }}
          >
            {mostWornItem || "None yet"}
          </p>
          <p className="text-xs" style={{ color: "#7A6F68" }}>
            Most Worn Item
          </p>
        </div>
      </div>

      {/* Main Form */}
      <div className="rounded-2xl p-6 space-y-6" style={cardStyle}>
        {/* Display Name */}
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
            style={inputStyle}
            placeholder="Your name"
          />
        </div>

        {/* Body Measurements */}
        <div>
          <label
            className="block text-sm font-medium mb-3"
            style={{ color: "#2B2B2B" }}
          >
            Body Measurements
          </label>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                className="block text-xs mb-1.5"
                style={{ color: "#7A6F68" }}
              >
                Height (cm)
              </label>
              <input
                type="number"
                value={form.height}
                onChange={(e) => setForm({ ...form, height: e.target.value })}
                className="w-full px-4 py-3 rounded-xl text-sm transition-all"
                style={inputStyle}
                placeholder="165"
              />
            </div>
            <div>
              <label
                className="block text-xs mb-1.5"
                style={{ color: "#7A6F68" }}
              >
                Weight (kg)
              </label>
              <input
                type="number"
                value={form.weight}
                onChange={(e) => setForm({ ...form, weight: e.target.value })}
                className="w-full px-4 py-3 rounded-xl text-sm transition-all"
                style={inputStyle}
                placeholder="60"
              />
            </div>
            <div>
              <label
                className="block text-xs mb-1.5"
                style={{ color: "#7A6F68" }}
              >
                Bust (cm)
              </label>
              <input
                type="number"
                value={form.bust}
                onChange={(e) => setForm({ ...form, bust: e.target.value })}
                className="w-full px-4 py-3 rounded-xl text-sm transition-all"
                style={inputStyle}
                placeholder="Optional"
              />
            </div>
            <div>
              <label
                className="block text-xs mb-1.5"
                style={{ color: "#7A6F68" }}
              >
                Waist (cm)
              </label>
              <input
                type="number"
                value={form.waist}
                onChange={(e) => setForm({ ...form, waist: e.target.value })}
                className="w-full px-4 py-3 rounded-xl text-sm transition-all"
                style={inputStyle}
                placeholder="Optional"
              />
            </div>
            <div className="col-span-2">
              <label
                className="block text-xs mb-1.5"
                style={{ color: "#7A6F68" }}
              >
                Hips (cm)
              </label>
              <input
                type="number"
                value={form.hips}
                onChange={(e) => setForm({ ...form, hips: e.target.value })}
                className="w-full px-4 py-3 rounded-xl text-sm transition-all"
                style={inputStyle}
                placeholder="Optional"
              />
            </div>
          </div>
        </div>

        {/* Body Type Selector */}
        <div>
          <label
            className="block text-sm font-medium mb-3"
            style={{ color: "#2B2B2B" }}
          >
            Body Type
          </label>
          <div className="grid grid-cols-5 gap-2">
            {BODY_TYPES.map((type) => (
              <button
                key={type.id}
                onClick={() => setForm({ ...form, body_type: type.id })}
                className="flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all"
                style={{
                  backgroundColor:
                    form.body_type === type.id
                      ? "rgba(201,132,122,0.1)"
                      : "#F5F0EA",
                  border:
                    form.body_type === type.id
                      ? "2px solid #C9847A"
                      : "2px solid transparent",
                }}
              >
                <span className="text-xl" style={{ color: "#2B2B2B" }}>
                  {type.icon}
                </span>
                <span
                  className="text-xs font-medium text-center"
                  style={{ color: "#2B2B2B" }}
                >
                  {type.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Skin Tone Picker - 6x5 Grid */}
        <div>
          <label
            className="block text-sm font-medium mb-3"
            style={{ color: "#2B2B2B" }}
          >
            Skin Tone
          </label>
          <div className="grid grid-cols-6 gap-2">
            {SKIN_TONE_COLORS.flat().map((color, index) => (
              <button
                key={index}
                onClick={() => setForm({ ...form, skin_tone_palette: color })}
                className="relative w-full aspect-square rounded-lg transition-all hover:scale-105"
                style={{
                  backgroundColor: color,
                  border:
                    form.skin_tone_palette === color
                      ? "3px solid #2B2B2B"
                      : "2px solid transparent",
                  boxShadow:
                    form.skin_tone_palette === color
                      ? "0 4px 12px rgba(0,0,0,0.2)"
                      : "none",
                }}
                title={color}
              >
                {form.skin_tone_palette === color && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Check
                      size={16}
                      style={{
                        color:
                          color === "#FFFFFF" ||
                          color === "#FFECD2" ||
                          color === "#FDDBB4" ||
                          color === "#F5C9A8" ||
                          color === "#F5D0A0" ||
                          color === "#FFE0B8"
                            ? "#2B2B2B"
                            : "#FFFFFF",
                      }}
                    />
                  </div>
                )}
              </button>
            ))}
          </div>
          {form.skin_tone_palette && (
            <p className="text-xs mt-2" style={{ color: "#7A6F68" }}>
              Selected: {form.skin_tone_palette}
            </p>
          )}
        </div>

        {/* Style Preferences */}
        <div>
          <label
            className="block text-sm font-medium mb-3"
            style={{ color: "#2B2B2B" }}
          >
            Style Preferences
          </label>
          <div className="flex gap-2 flex-wrap">
            {STYLE_PREFERENCES.map((pref) => (
              <button
                key={pref}
                onClick={() => toggleStylePref(pref)}
                className="px-4 py-2 rounded-full text-sm font-medium transition-all hover:opacity-80"
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
                {pref}
              </button>
            ))}
          </div>
        </div>

        {/* Save Button */}
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
