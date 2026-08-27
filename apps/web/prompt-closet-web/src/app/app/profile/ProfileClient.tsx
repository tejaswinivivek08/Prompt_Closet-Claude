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
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// --- Skin tone wheel data ---
type Tone = { hex: string; name: string; undertone: string };

const RING_TONES: Tone[][] = [
  // Ring 0 – Very Fair (outermost, r=125)
  [
    { hex: "#FFE4E0", name: "Porcelain", undertone: "Cool" },
    { hex: "#FEEAE4", name: "Snow", undertone: "Neutral-Cool" },
    { hex: "#FDE8D4", name: "Ivory White", undertone: "Neutral" },
    { hex: "#FDEACC", name: "Warm Ivory", undertone: "Neutral-Warm" },
    { hex: "#FDE0B8", name: "Cream", undertone: "Warm" },
    { hex: "#FDD8A0", name: "Pale Honey", undertone: "Golden" },
    { hex: "#F8D8A8", name: "Vanilla Gold", undertone: "Golden-Olive" },
    { hex: "#F0D8B0", name: "Pearl Olive", undertone: "Olive" },
    { hex: "#F4D4B8", name: "Soft Olive", undertone: "Olive-Warm" },
    { hex: "#FDDEC8", name: "Peach Cream", undertone: "Warm" },
    { hex: "#FFDACC", name: "Blushed Cream", undertone: "Rosy-Warm" },
    { hex: "#FFD8D8", name: "Rosy Fair", undertone: "Rosy" },
    { hex: "#FFD8EC", name: "Rose Ivory", undertone: "Cool-Pink" },
    { hex: "#FFE0F0", name: "Pale Rose", undertone: "Cool" },
  ],
  // Ring 1 – Fair to Light-Medium (r=97)
  [
    { hex: "#F0C0B4", name: "Fair Cool Beige", undertone: "Cool" },
    { hex: "#ECC0A0", name: "Light Beige", undertone: "Neutral-Cool" },
    { hex: "#E8B888", name: "Natural Beige", undertone: "Neutral" },
    { hex: "#E4B070", name: "Warm Sand", undertone: "Warm" },
    { hex: "#E0A858", name: "Golden Sand", undertone: "Golden" },
    { hex: "#D8A860", name: "Sandy Gold", undertone: "Golden-Olive" },
    { hex: "#D0A860", name: "Light Olive Sand", undertone: "Olive" },
    { hex: "#D4B070", name: "Warm Olive Beige", undertone: "Olive-Warm" },
    { hex: "#DCB888", name: "Peachy Beige", undertone: "Warm" },
    { hex: "#E0B0A0", name: "Peach Beige", undertone: "Rosy-Warm" },
    { hex: "#E0B0B0", name: "Rosy Beige", undertone: "Rosy" },
    { hex: "#E8B8C0", name: "Pink Beige", undertone: "Cool-Pink" },
    { hex: "#ECC0C8", name: "Rose Beige", undertone: "Cool" },
    { hex: "#F0C4D0", name: "Cool Rose Beige", undertone: "Cool-Pink" },
  ],
  // Ring 2 – Medium (r=68)
  [
    { hex: "#C0907C", name: "Medium Cool", undertone: "Cool" },
    { hex: "#BC8868", name: "Warm Medium", undertone: "Neutral" },
    { hex: "#B87E58", name: "Warm Tan", undertone: "Warm" },
    { hex: "#B07840", name: "Golden Tan", undertone: "Golden" },
    { hex: "#A87848", name: "Olive Medium", undertone: "Olive" },
    { hex: "#A87840", name: "Warm Caramel", undertone: "Warm-Golden" },
    { hex: "#A07838", name: "Deep Caramel", undertone: "Golden" },
    { hex: "#B08070", name: "Rosy Tan", undertone: "Rosy-Warm" },
    { hex: "#B88888", name: "Dusty Rose Tan", undertone: "Rosy" },
    { hex: "#C09090", name: "Cool Rose Tan", undertone: "Cool-Pink" },
    { hex: "#C89898", name: "Mauve Tan", undertone: "Cool" },
    { hex: "#D0A0A8", name: "Pink Tan", undertone: "Cool-Pink" },
  ],
  // Ring 3 – Tan to Brown (r=42)
  [
    { hex: "#906050", name: "Tan Cool", undertone: "Cool" },
    { hex: "#886048", name: "Medium Brown", undertone: "Neutral" },
    { hex: "#7C5438", name: "Warm Brown", undertone: "Warm" },
    { hex: "#7A5230", name: "Golden Brown", undertone: "Golden" },
    { hex: "#746050", name: "Olive Brown", undertone: "Olive" },
    { hex: "#7C5038", name: "Copper Brown", undertone: "Red-Warm" },
    { hex: "#886060", name: "Deep Rosy Brown", undertone: "Rosy" },
    { hex: "#906870", name: "Cool Deep Tan", undertone: "Cool" },
    { hex: "#997080", name: "Mauve Brown", undertone: "Cool-Pink" },
    { hex: "#A07888", name: "Pink Deep Tan", undertone: "Cool" },
  ],
  // Ring 4 – Very Deep (innermost, r=18)
  [
    { hex: "#4E2E1C", name: "Rich Espresso", undertone: "Warm" },
    { hex: "#3C2018", name: "Espresso", undertone: "Neutral" },
    { hex: "#381C10", name: "Deep Cocoa", undertone: "Cool" },
    { hex: "#342010", name: "Dark Espresso", undertone: "Warm" },
    { hex: "#281408", name: "Rich Ebony", undertone: "Neutral" },
    { hex: "#1E0E06", name: "Ebony", undertone: "Cool" },
  ],
];

const CANVAS_SIZE = 300;
const CX = 150;
const CY = 150;
const RADII = [125, 97, 68, 42, 18];
const DOT_SIZES = [11, 11, 11, 10, 9];

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}

function colorDistance(a: string, b: string) {
  const { r: r1, g: g1, b: b1 } = hexToRgb(a);
  const { r: r2, g: g2, b: b2 } = hexToRgb(b);
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
}

const ALL_TONES = RING_TONES.flat();

type Dot = { x: number; y: number; tone: Tone };

function SkinToneWheel({
  value,
  onChange,
}: {
  value: string;
  onChange: (hex: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dotsRef = useRef<Dot[]>([]);
  const [selectedTone, setSelectedTone] = useState<Tone | null>(() => {
    if (!value) return null;
    return (
      ALL_TONES.find((t) => t.hex.toLowerCase() === value.toLowerCase()) ?? null
    );
  });
  const [copied, setCopied] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const draw = (hoveredHex?: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Subtle background circle
    ctx.beginPath();
    ctx.arc(CX, CY, 142, 0, 2 * Math.PI);
    ctx.fillStyle = "rgba(245,240,234,0.5)";
    ctx.fill();

    const dots: Dot[] = [];
    RING_TONES.forEach((ring, ri) => {
      ring.forEach((tone, i) => {
        const angle = (i / ring.length) * 2 * Math.PI - Math.PI / 2;
        const x = CX + RADII[ri] * Math.cos(angle);
        const y = CY + RADII[ri] * Math.sin(angle);
        const dr = DOT_SIZES[ri];
        dots.push({ x, y, tone });

        const isSelected =
          value && tone.hex.toLowerCase() === value.toLowerCase();
        const isHovered = hoveredHex === tone.hex;

        if (isSelected) {
          ctx.shadowColor = "rgba(0,0,0,0.3)";
          ctx.shadowBlur = 10;
        }
        ctx.beginPath();
        ctx.arc(x, y, dr, 0, 2 * Math.PI);
        ctx.fillStyle = tone.hex;
        ctx.fill();
        ctx.shadowColor = "transparent";
        ctx.shadowBlur = 0;

        if (isSelected) {
          ctx.beginPath();
          ctx.arc(x, y, dr + 3, 0, 2 * Math.PI);
          ctx.strokeStyle = "#2B2B2B";
          ctx.lineWidth = 2.5;
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(x, y, dr + 1.5, 0, 2 * Math.PI);
          ctx.strokeStyle = "#FFFFFF";
          ctx.lineWidth = 1.5;
          ctx.stroke();
        } else if (isHovered) {
          ctx.beginPath();
          ctx.arc(x, y, dr + 2, 0, 2 * Math.PI);
          ctx.strokeStyle = "rgba(43,43,43,0.45)";
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      });
    });
    dotsRef.current = dots;
  };

  useEffect(() => {
    draw();
  }, [value]); // eslint-disable-line

  const getCanvasXY = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const sx = CANVAS_SIZE / rect.width;
    const sy = CANVAS_SIZE / rect.height;
    return {
      mx: (e.clientX - rect.left) * sx,
      my: (e.clientY - rect.top) * sy,
    };
  };

  const hitTest = (mx: number, my: number): Dot | null => {
    let closest: Dot | null = null;
    let minD = Infinity;
    dotsRef.current.forEach((dot) => {
      const d = Math.hypot(mx - dot.x, my - dot.y);
      if (d < 14 && d < minD) {
        minD = d;
        closest = dot;
      }
    });
    return closest;
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { mx, my } = getCanvasXY(e);
    const hit = hitTest(mx, my);
    if (hit) {
      setSelectedTone(hit.tone);
      onChange(hit.tone.hex);
    }
  };

  const handleMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { mx, my } = getCanvasXY(e);
    const hit = hitTest(mx, my);
    draw(hit?.tone.hex);
    if (canvasRef.current)
      canvasRef.current.style.cursor = hit ? "pointer" : "default";
  };

  const handlePhotoMatch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = img.width;
      c.height = img.height;
      const ctx2 = c.getContext("2d");
      if (!ctx2) return;
      ctx2.drawImage(img, 0, 0);
      const cx2 = Math.floor(img.width / 2);
      const cy2 = Math.floor(img.height / 2);
      const d = ctx2.getImageData(cx2 - 10, cy2 - 10, 20, 20).data;
      let r = 0,
        g = 0,
        b = 0,
        count = 0;
      for (let i = 0; i < d.length; i += 4) {
        r += d[i];
        g += d[i + 1];
        b += d[i + 2];
        count++;
      }
      const avgHex = `#${Math.round(r / count)
        .toString(16)
        .padStart(2, "0")}${Math.round(g / count)
        .toString(16)
        .padStart(2, "0")}${Math.round(b / count)
        .toString(16)
        .padStart(2, "0")}`;
      let best = ALL_TONES[0],
        bestD = Infinity;
      ALL_TONES.forEach((t) => {
        const dist = colorDistance(avgHex, t.hex);
        if (dist < bestD) {
          bestD = dist;
          best = t;
        }
      });
      setSelectedTone(best);
      onChange(best.hex);
      URL.revokeObjectURL(url);
    };
    img.src = url;
    e.target.value = "";
  };

  const rgb = selectedTone ? hexToRgb(selectedTone.hex) : null;

  return (
    <div className="flex flex-col sm:flex-row gap-5 items-start">
      <div className="flex-shrink-0">
        <canvas
          ref={canvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          style={{ width: 240, height: 240, display: "block" }}
          onClick={handleClick}
          onMouseMove={handleMove}
          onMouseLeave={() => draw()}
        />
      </div>
      <div className="flex-1 min-w-0 space-y-3">
        {selectedTone && rgb ? (
          <>
            <div className="flex items-center gap-3">
              <div
                className="rounded-full flex-shrink-0"
                style={{
                  width: 52,
                  height: 52,
                  backgroundColor: selectedTone.hex,
                  border: "3px solid #F0EBE6",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
                }}
              />
              <div>
                <p className="text-xs" style={{ color: "#7A6F68" }}>
                  Your Skin Tone
                </p>
                <p className="font-bold text-base" style={{ color: "#2B2B2B" }}>
                  {selectedTone.name}
                </p>
              </div>
            </div>
            <div
              className="rounded-xl p-3 space-y-1.5 text-xs"
              style={{ backgroundColor: "#F5F0EA" }}
            >
              <div className="flex justify-between">
                <span style={{ color: "#7A6F68" }}>HEX</span>
                <span
                  className="font-mono font-semibold"
                  style={{ color: "#2B2B2B" }}
                >
                  {selectedTone.hex.toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: "#7A6F68" }}>RGB</span>
                <span
                  className="font-mono font-semibold"
                  style={{ color: "#2B2B2B" }}
                >
                  {rgb.r}, {rgb.g}, {rgb.b}
                </span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: "#7A6F68" }}>Undertone</span>
                <span className="font-semibold" style={{ color: "#2B2B2B" }}>
                  {selectedTone.undertone}
                </span>
              </div>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(selectedTone.hex.toUpperCase());
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="w-full py-2 rounded-xl text-xs font-semibold transition-all"
              style={{
                backgroundColor: copied ? "#2B2B2B" : "#C9847A",
                color: "#FFFFFF",
              }}
            >
              {copied ? "✓ Copied!" : "Copy HEX Code"}
            </button>
          </>
        ) : (
          <div
            className="rounded-2xl p-4 text-center"
            style={{ backgroundColor: "#F5F0EA", border: "1px dashed #E5DDD5" }}
          >
            <p
              className="text-sm font-medium mb-1"
              style={{ color: "#2B2B2B" }}
            >
              Select your skin tone
            </p>
            <p className="text-xs" style={{ color: "#7A6F68" }}>
              Click any shade in the wheel
            </p>
          </div>
        )}
        <label
          className="flex items-center justify-center gap-2 w-full py-2 rounded-xl cursor-pointer text-xs font-medium hover:opacity-80 transition-all"
          style={{
            backgroundColor: "#F5F0EA",
            color: "#7A6F68",
            border: "1px solid #E5DDD5",
          }}
        >
          <Camera size={13} />
          Match from photo
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoMatch}
          />
        </label>
        <p
          className="text-xs text-center leading-snug"
          style={{ color: "#B0A8A0" }}
        >
          Approximate only — lighting & camera affect results
        </p>
      </div>
    </div>
  );
}

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
      const fetchRes = await fetch(dataUrl);
      const blob = await fetchRes.blob();
      const fd = new FormData();
      fd.append("file", blob, "avatar.jpg");

      const resp = await fetch("/api/upload-profile-photo", {
        method: "POST",
        body: fd,
      });
      if (!resp.ok) {
        const errJson = await resp
          .json()
          .catch(() => ({ error: resp.statusText }));
        throw new Error(errJson.error || "Upload failed");
      }
      const { url } = await resp.json();
      setAvatarUrl(url);
      await supabase.from("profiles").upsert({ id: userId, avatar_url: url });
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
      {/* Header with user info */}
      <div className="mb-8 flex items-center gap-4">
        {/* Small avatar circle */}
        <div className="relative flex-shrink-0">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="Profile"
              className="w-14 h-14 rounded-full object-cover"
              style={{ border: "2px solid #C9847A" }}
            />
          ) : (
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold"
              style={{ backgroundColor: "#C9847A", color: "#FFFFFF" }}
            >
              {initials}
            </div>
          )}
        </div>
        <div>
          <h1
            className="text-2xl font-bold mb-0.5"
            style={{ color: "#2B2B2B" }}
          >
            {form.full_name || "Profile"}
          </h1>
          <p className="text-sm" style={{ color: "#7A6F68" }}>
            Your personal style settings
          </p>
        </div>
      </div>

      {/* Profile Picture Section */}
      <div className="rounded-2xl p-6 mb-6" style={cardStyle}>
        <div className="flex items-center gap-6">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
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

        {/* Skin Tone Wheel */}
        <div>
          <label
            className="block text-sm font-medium mb-4"
            style={{ color: "#2B2B2B" }}
          >
            Skin Tone
          </label>
          <SkinToneWheel
            value={form.skin_tone_palette}
            onChange={(hex) => setForm({ ...form, skin_tone_palette: hex })}
          />
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
