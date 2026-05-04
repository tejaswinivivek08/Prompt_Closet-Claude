"use client";

import { useState, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Sparkles,
  Shirt,
  X,
  RotateCcw,
  Camera,
  ZoomIn,
  ZoomOut,
  Download,
  Share2,
  Loader2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import AvatarViewer from "@/components/AvatarViewer";

type OutfitItem = {
  id: string;
  image_url: string;
  category: string;
  suggested_name: string | null;
};

type Profile = {
  avatar_url: string | null;
  avatar_glb_url: string | null;
  avatar_params: Record<string, unknown> | null;
  bust_cm: number | null;
  waist_cm: number | null;
  hip_cm: number | null;
  body_type: string | null;
  hair_style: string | null;
  hair_color: string | null;
  clothing_size: string | null;
} | null;

// Step 1: Gender selection
const GENDERS = [
  { value: "female", label: "Female", icon: "♀" },
  { value: "male", label: "Male", icon: "♂" },
  { value: "nonbinary", label: "Non-binary", icon: "⚥" },
];

// Step 2: Skin tones - organized by undertone and depth
const SKIN_TONES = [
  // Cool undertone - light
  { hex: "#FFDBD2", undertone: "cool", depth: "light" },
  { hex: "#F5D0C5", undertone: "cool", depth: "light" },
  { hex: "#E8C4B8", undertone: "cool", depth: "light" },
  { hex: "#D4A88E", undertone: "cool", depth: "light" },
  // Cool undertone - medium
  { hex: "#C68642", undertone: "cool", depth: "medium" },
  { hex: "#A57256", undertone: "cool", depth: "medium" },
  { hex: "#8B5A42", undertone: "cool", depth: "medium" },
  { hex: "#6F4520", undertone: "cool", depth: "medium" },
  // Cool undertone - deep
  { hex: "#5C3D2E", undertone: "cool", depth: "deep" },
  { hex: "#4A3225", undertone: "cool", depth: "deep" },
  { hex: "#3B2418", undertone: "cool", depth: "deep" },
  { hex: "#2B1A10", undertone: "cool", depth: "deep" },
  // Neutral undertone - light
  { hex: "#FFE5DC", undertone: "neutral", depth: "light" },
  { hex: "#F5D5C8", undertone: "neutral", depth: "light" },
  { hex: "#E8C4B5", undertone: "neutral", depth: "light" },
  { hex: "#D4B8A0", undertone: "neutral", depth: "light" },
  // Neutral undertone - medium
  { hex: "#C9A08A", undertone: "neutral", depth: "medium" },
  { hex: "#A67C52", undertone: "neutral", depth: "medium" },
  { hex: "#8B6347", undertone: "neutral", depth: "medium" },
  { hex: "#6E4E35", undertone: "neutral", depth: "medium" },
  // Neutral undertone - deep
  { hex: "#5A3D28", undertone: "neutral", depth: "deep" },
  { hex: "#463020", undertone: "neutral", depth: "deep" },
  { hex: "#352515", undertone: "neutral", depth: "deep" },
  { hex: "#251A0D", undertone: "neutral", depth: "deep" },
  // Warm undertone - light
  { hex: "#FFDFC4", undertone: "warm", depth: "light" },
  { hex: "#F5CDB0", undertone: "warm", depth: "light" },
  { hex: "#E8BC9C", undertone: "warm", depth: "light" },
  { hex: "#D4A480", undertone: "warm", depth: "light" },
  // Warm undertone - medium
  { hex: "#C9956C", undertone: "warm", depth: "medium" },
  { hex: "#A67D5A", undertone: "warm", depth: "medium" },
  { hex: "#8B6040", undertone: "warm", depth: "medium" },
  { hex: "#6E4A30", undertone: "warm", depth: "medium" },
  // Warm undertone - deep
  { hex: "#5A3D25", undertone: "warm", depth: "deep" },
  { hex: "#452D1A", undertone: "warm", depth: "deep" },
  { hex: "#331F12", undertone: "warm", depth: "deep" },
  { hex: "#221208", undertone: "warm", depth: "deep" },
];

// Step 3: Hair styles
const HAIR_LENGTHS = [
  { value: "short", label: "Short", description: "Above shoulders" },
  { value: "medium", label: "Medium", description: "At shoulders" },
  { value: "long", label: "Long", description: "Below shoulders" },
  { value: "very_long", label: "Very Long", description: "Past mid-back" },
];

const HAIR_TEXTURES = [
  { value: "straight", label: "Straight" },
  { value: "wavy", label: "Wavy" },
  { value: "curly", label: "Curly" },
  { value: "coily", label: "Coily" },
];

const HAIR_COLORS = [
  { value: "black", label: "Black", hex: "#0C0C0C" },
  { value: "dark_brown", label: "Dark Brown", hex: "#1C0A00" },
  { value: "brown", label: "Brown", hex: "#3B2219" },
  { value: "auburn", label: "Auburn", hex: "#6B2D1A" },
  { value: "blonde", label: "Blonde", hex: "#D4A857" },
  { value: "grey", label: "Grey", hex: "#9E9E9E" },
];

const CLOTHING_SIZES = ["XS", "S", "M", "L", "XL", "XXL"];

interface AvatarFormData {
  gender: "female" | "male" | "nonbinary" | null;
  skinTone: string | null;
  height: number;
  weight: number;
  clothingSize: string | null;
  waist: number | null;
  bust: number | null;
  hips: number | null;
  hairLength: string | null;
  hairTexture: string | null;
  hairColor: string | null;
  selfieImage: string | null;
}

interface AvatarData {
  avatarUrl: string;
  avatarGlbUrl: string | null;
  avatarParams: AvatarFormData;
}

// Demo pre-populated values for investor presentation
const DEMO_FORM_DATA: AvatarFormData = {
  gender: "female",
  skinTone: "#C68642",
  height: 157,
  weight: 53,
  clothingSize: "S",
  waist: 27,
  bust: null,
  hips: null,
  hairLength: "long",
  hairTexture: "wavy",
  hairColor: "dark_brown",
  selfieImage: null,
};

const INITIAL_FORM_DATA: AvatarFormData = {
  gender: null,
  skinTone: null,
  height: 157,
  weight: 53,
  clothingSize: null,
  waist: 27,
  bust: null,
  hips: null,
  hairLength: null,
  hairTexture: null,
  hairColor: null,
  selfieImage: null,
};

const CREATING_MESSAGES = [
  "Analyzing your measurements...",
  "Generating your body shape...",
  "Adding your skin tone...",
  "Styling your hair...",
  "Almost ready...",
];

export default function TwinClient({
  initialItems,
  initialProfile,
  userId,
}: {
  initialItems: OutfitItem[];
  initialProfile: Profile;
  userId: string;
}) {
  const supabase = createClient();

  // Core state
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<AvatarFormData>(INITIAL_FORM_DATA);
  const [avatar, setAvatar] = useState<AvatarData | null>(
    initialProfile?.avatar_url
      ? {
          avatarUrl: initialProfile.avatar_url,
          avatarGlbUrl: initialProfile.avatar_glb_url || null,
          avatarParams:
            (initialProfile.avatar_params as unknown as AvatarFormData) ||
            INITIAL_FORM_DATA,
        }
      : null,
  );
  const [creating, setCreating] = useState(false);
  const [creatingMessage, setCreatingMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Try-on state
  const [selectedOutfit, setSelectedOutfit] = useState<string[]>([]);
  const [tryonLoading, setTryonLoading] = useState(false);
  const [tryonResult, setTryonResult] = useState<string | null>(null);

  // UI state
  const [showHeightCm, setShowHeightCm] = useState(true);
  const [selectedOutfitItems, setSelectedOutfitItems] = useState<OutfitItem[]>(
    [],
  );

  // Step navigation
  const canProceed = (step: number): boolean => {
    switch (step) {
      case 1:
        return formData.gender !== null;
      case 2:
        return formData.skinTone !== null;
      case 3:
        return true; // Height/weight optional
      case 4:
        return true; // Size optional
      case 5:
        return formData.hairLength !== null && formData.hairTexture !== null;
      case 6:
        return true; // Selfie optional
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (canProceed(currentStep)) {
      setCurrentStep((s) => Math.min(s + 1, 6));
    }
  };

  const handleBack = () => {
    setCurrentStep((s) => Math.max(s - 1, 1));
  };

  // Create avatar
  const handleCreateAvatar = async () => {
    setCreating(true);
    setError(null);

    // Cycle through messages
    let messageIndex = 0;
    const messageInterval = setInterval(() => {
      setCreatingMessage(
        CREATING_MESSAGES[messageIndex % CREATING_MESSAGES.length],
      );
      messageIndex++;
    }, 2000);

    try {
      // Simulate API call delay (8-12 seconds)
      await new Promise((resolve) => setTimeout(resolve, 10000));

      // Save avatar params to profile
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          avatar_params: formData,
          skin_tone: formData.skinTone,
          height_cm: formData.height,
          weight_kg: formData.weight,
          clothing_size: formData.clothingSize,
          waist_cm: formData.waist,
          bust_cm: formData.bust,
          hip_cm: formData.hips,
          hair_style: `${formData.hairLength}-${formData.hairTexture}`,
          hair_color: formData.hairColor,
        })
        .eq("id", userId);

      if (updateError) throw updateError;

      // Generate avatar image using MiniMax if available
      let avatarUrl = initialProfile?.avatar_url || "";
      const miniMaxKey =
        process.env.NEXT_PUBLIC_MINIMAX_API_KEY || process.env.MINIMAX_API_KEY;

      if (miniMaxKey && miniMaxKey !== "your-minimax-api-key-here") {
        try {
          const hairColorMap: Record<string, string> = {
            black: "black",
            dark_brown: "dark brown",
            brown: "brown",
            auburn: "auburn",
            blonde: "blonde",
            grey: "grey",
          };
          const hairColorLabel =
            hairColorMap[formData.hairColor || ""] || "dark";
          const skinToneLabel = formData.skinTone || "#C68642";
          const heightLabel = `${formData.height}cm`;

          const prompt = `Fashion illustration of an Indian woman, wheatish skin tone hex ${skinToneLabel}, ${heightLabel} tall, slim build, ${formData.hairLength} ${formData.hairTexture} hair in ${hairColorLabel} color, wearing modern fashionable outfit, full body view, white background, high quality fashion photography style, realistic but stylized, respectful dignified fashion illustration, appropriate clothing coverage maintained, professional fashion photography, suitable for all audiences`;

          const res = await fetch("/api/avatar", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              imageData: formData.selfieImage,
              userId,
              customPrompt: prompt,
            }),
          });

          const data = await res.json();
          if (data.avatarUrl) {
            avatarUrl = data.avatarUrl;

            // Update profile with avatar URL
            await supabase
              .from("profiles")
              .update({ avatar_url: avatarUrl })
              .eq("id", userId);
          }
        } catch (e) {
          console.error("Avatar generation failed:", e);
        }
      }

      // Demo avatar URL for testing (when no MiniMax key)
      if (!avatarUrl) {
        avatarUrl =
          "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&h=800&fit=crop";
      }

      setAvatar({
        avatarUrl,
        avatarGlbUrl: null,
        avatarParams: formData,
      });
    } catch (err) {
      console.error(err);
      setError("Failed to create avatar. Please try again.");
    } finally {
      clearInterval(messageInterval);
      setCreating(false);
      setCreatingMessage("");
    }
  };

  // Try-on handler
  const handleTryOn = async () => {
    if (selectedOutfit.length === 0 || !avatar) return;
    setTryonLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/avatar/tryon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          avatarUrl: avatar.avatarUrl,
          outfitItemIds: selectedOutfit,
        }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        return;
      }
      setTryonResult(data.resultUrl || null);
    } catch (err) {
      console.error(err);
      setError("Failed to generate try-on. Please try again.");
    } finally {
      setTryonLoading(false);
    }
  };

  // Regenerate avatar
  const handleRegenerate = () => {
    setAvatar(null);
    setCurrentStep(1);
    setFormData(INITIAL_FORM_DATA);
  };

  // cm to feet/inches
  const cmToFeetInches = (cm: number): string => {
    const totalInches = cm / 2.54;
    const feet = Math.floor(totalInches / 12);
    const inches = Math.round(totalInches % 12);
    return `${feet}'${inches}"`;
  };

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2
                className="text-xl font-bold mb-2"
                style={{ color: "#2B2B2B" }}
              >
                Tell us about you
              </h2>
              <p className="text-sm" style={{ color: "#7A6F68" }}>
                Step 1: What is your gender?
              </p>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {GENDERS.map((gender) => (
                <button
                  key={gender.value}
                  onClick={() =>
                    setFormData({
                      ...formData,
                      gender: gender.value as AvatarFormData["gender"],
                    })
                  }
                  className="p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-3"
                  style={{
                    borderColor:
                      formData.gender === gender.value ? "#C9847A" : "#E5DDD5",
                    backgroundColor:
                      formData.gender === gender.value
                        ? "rgba(201,132,122,0.08)"
                        : "#FFFFFF",
                  }}
                >
                  <span className="text-3xl">{gender.icon}</span>
                  <span
                    className="font-semibold text-sm"
                    style={{ color: "#2B2B2B" }}
                  >
                    {gender.label}
                  </span>
                  {formData.gender === gender.value && (
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: "#C9847A" }}
                    >
                      <Check size={14} className="text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2
                className="text-xl font-bold mb-2"
                style={{ color: "#2B2B2B" }}
              >
                What is your skin tone?
              </h2>
              <p className="text-sm" style={{ color: "#7A6F68" }}>
                Step 2: Select your closest match
              </p>
            </div>
            <div className="grid grid-cols-6 gap-2">
              {SKIN_TONES.map((tone) => (
                <button
                  key={tone.hex}
                  onClick={() =>
                    setFormData({ ...formData, skinTone: tone.hex })
                  }
                  className="aspect-square rounded-xl transition-all relative"
                  style={{
                    backgroundColor: tone.hex,
                    border:
                      formData.skinTone === tone.hex
                        ? "3px solid #C9847A"
                        : "2px solid transparent",
                    boxShadow:
                      formData.skinTone === tone.hex
                        ? "0 4px 12px rgba(201,132,122,0.4)"
                        : "none",
                  }}
                >
                  {formData.skinTone === tone.hex && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Check size={20} className="text-white drop-shadow-md" />
                    </div>
                  )}
                </button>
              ))}
            </div>
            {formData.skinTone && (
              <div className="flex items-center justify-center gap-3 mt-4">
                <div
                  className="w-8 h-8 rounded-full"
                  style={{ backgroundColor: formData.skinTone }}
                />
                <span className="text-sm" style={{ color: "#7A6F68" }}>
                  Selected: {formData.skinTone}
                </span>
              </div>
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-8">
            <div className="text-center mb-6">
              <h2
                className="text-xl font-bold mb-2"
                style={{ color: "#2B2B2B" }}
              >
                What is your height?
              </h2>
              <p className="text-sm" style={{ color: "#7A6F68" }}>
                Step 3: Slide to set your height
              </p>
            </div>

            {/* Height */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label
                  className="text-sm font-medium"
                  style={{ color: "#2B2B2B" }}
                >
                  Height
                </label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowHeightCm(!showHeightCm)}
                    className="text-xs px-2 py-1 rounded"
                    style={{ backgroundColor: "#F5F0EA", color: "#7A6F68" }}
                  >
                    {showHeightCm ? "Show ft/in" : "Show cm"}
                  </button>
                  <span className="font-bold" style={{ color: "#C9847A" }}>
                    {showHeightCm
                      ? `${formData.height} cm`
                      : cmToFeetInches(formData.height)}
                  </span>
                </div>
              </div>
              <input
                type="range"
                min="140"
                max="200"
                value={formData.height}
                onChange={(e) =>
                  setFormData({ ...formData, height: parseInt(e.target.value) })
                }
                className="w-full h-2 rounded-full appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #C9847A 0%, #C9847A ${((formData.height - 140) / 60) * 100}%, #E5DDD5 ${((formData.height - 140) / 60) * 100}%, #E5DDD5 100%)`,
                }}
              />
              <div
                className="flex justify-between text-xs mt-1"
                style={{ color: "#7A6F68" }}
              >
                <span>140cm (4'7")</span>
                <span>200cm (6'7")</span>
              </div>
            </div>

            {/* Weight */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label
                  className="text-sm font-medium"
                  style={{ color: "#2B2B2B" }}
                >
                  Weight
                </label>
                <span className="font-bold" style={{ color: "#C9847A" }}>
                  {formData.weight} kg
                </span>
              </div>
              <input
                type="range"
                min="40"
                max="120"
                value={formData.weight}
                onChange={(e) =>
                  setFormData({ ...formData, weight: parseInt(e.target.value) })
                }
                className="w-full h-2 rounded-full appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #C9847A 0%, #C9847A ${((formData.weight - 40) / 80) * 100}%, #E5DDD5 ${((formData.weight - 40) / 80) * 100}%, #E5DDD5 100%)`,
                }}
              />
              <div
                className="flex justify-between text-xs mt-1"
                style={{ color: "#7A6F68" }}
              >
                <span>40 kg</span>
                <span>120 kg</span>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-8">
            <div className="text-center mb-6">
              <h2
                className="text-xl font-bold mb-2"
                style={{ color: "#2B2B2B" }}
              >
                What is your clothing size?
              </h2>
              <p className="text-sm" style={{ color: "#7A6F68" }}>
                Step 4: Select your preferred size (Indian sizing)
              </p>
            </div>

            {/* Clothing Size */}
            <div>
              <label
                className="text-sm font-medium mb-3 block"
                style={{ color: "#2B2B2B" }}
              >
                Clothing Size
              </label>
              <div className="grid grid-cols-6 gap-2">
                {CLOTHING_SIZES.map((size) => (
                  <button
                    key={size}
                    onClick={() =>
                      setFormData({ ...formData, clothingSize: size })
                    }
                    className="py-3 rounded-xl border-2 font-semibold text-sm transition-all"
                    style={{
                      borderColor:
                        formData.clothingSize === size ? "#C9847A" : "#E5DDD5",
                      backgroundColor:
                        formData.clothingSize === size
                          ? "rgba(201,132,122,0.08)"
                          : "#FFFFFF",
                      color:
                        formData.clothingSize === size ? "#C9847A" : "#2B2B2B",
                    }}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Optional Measurements */}
            <div>
              <label
                className="text-sm font-medium mb-3 block"
                style={{ color: "#2B2B2B" }}
              >
                Body Measurements (optional)
              </label>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label
                    className="text-xs mb-1 block"
                    style={{ color: "#7A6F68" }}
                  >
                    Waist (inches)
                  </label>
                  <input
                    type="number"
                    value={formData.waist || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        waist: e.target.value ? parseInt(e.target.value) : null,
                      })
                    }
                    placeholder="27"
                    className="w-full px-3 py-2 rounded-xl border-2 text-sm"
                    style={{
                      borderColor: "#E5DDD5",
                      backgroundColor: "#FFFFFF",
                    }}
                  />
                </div>
                <div>
                  <label
                    className="text-xs mb-1 block"
                    style={{ color: "#7A6F68" }}
                  >
                    Bust (inches)
                  </label>
                  <input
                    type="number"
                    value={formData.bust || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        bust: e.target.value ? parseInt(e.target.value) : null,
                      })
                    }
                    placeholder="32"
                    className="w-full px-3 py-2 rounded-xl border-2 text-sm"
                    style={{
                      borderColor: "#E5DDD5",
                      backgroundColor: "#FFFFFF",
                    }}
                  />
                </div>
                <div>
                  <label
                    className="text-xs mb-1 block"
                    style={{ color: "#7A6F68" }}
                  >
                    Hips (inches)
                  </label>
                  <input
                    type="number"
                    value={formData.hips || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        hips: e.target.value ? parseInt(e.target.value) : null,
                      })
                    }
                    placeholder="36"
                    className="w-full px-3 py-2 rounded-xl border-2 text-sm"
                    style={{
                      borderColor: "#E5DDD5",
                      backgroundColor: "#FFFFFF",
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-8">
            <div className="text-center mb-6">
              <h2
                className="text-xl font-bold mb-2"
                style={{ color: "#2B2B2B" }}
              >
                How is your hair?
              </h2>
              <p className="text-sm" style={{ color: "#7A6F68" }}>
                Step 5: Hair length, texture, and color
              </p>
            </div>

            {/* Hair Length */}
            <div>
              <label
                className="text-sm font-medium mb-3 block"
                style={{ color: "#2B2B2B" }}
              >
                Hair Length
              </label>
              <div className="grid grid-cols-4 gap-2">
                {HAIR_LENGTHS.map((length) => (
                  <button
                    key={length.value}
                    onClick={() =>
                      setFormData({ ...formData, hairLength: length.value })
                    }
                    className="p-4 rounded-xl border-2 text-center transition-all"
                    style={{
                      borderColor:
                        formData.hairLength === length.value
                          ? "#C9847A"
                          : "#E5DDD5",
                      backgroundColor:
                        formData.hairLength === length.value
                          ? "rgba(201,132,122,0.08)"
                          : "#FFFFFF",
                    }}
                  >
                    <div
                      className="font-semibold text-sm mb-1"
                      style={{
                        color:
                          formData.hairLength === length.value
                            ? "#C9847A"
                            : "#2B2B2B",
                      }}
                    >
                      {length.label}
                    </div>
                    <div className="text-xs" style={{ color: "#7A6F68" }}>
                      {length.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Hair Texture */}
            <div>
              <label
                className="text-sm font-medium mb-3 block"
                style={{ color: "#2B2B2B" }}
              >
                Hair Texture
              </label>
              <div className="grid grid-cols-4 gap-2">
                {HAIR_TEXTURES.map((texture) => (
                  <button
                    key={texture.value}
                    onClick={() =>
                      setFormData({ ...formData, hairTexture: texture.value })
                    }
                    className="p-3 rounded-xl border-2 text-center transition-all"
                    style={{
                      borderColor:
                        formData.hairTexture === texture.value
                          ? "#C9847A"
                          : "#E5DDD5",
                      backgroundColor:
                        formData.hairTexture === texture.value
                          ? "rgba(201,132,122,0.08)"
                          : "#FFFFFF",
                    }}
                  >
                    <div
                      className="font-semibold text-sm"
                      style={{
                        color:
                          formData.hairTexture === texture.value
                            ? "#C9847A"
                            : "#2B2B2B",
                      }}
                    >
                      {texture.label}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Hair Color */}
            <div>
              <label
                className="text-sm font-medium mb-3 block"
                style={{ color: "#2B2B2B" }}
              >
                Hair Color
              </label>
              <div className="flex flex-wrap gap-2">
                {HAIR_COLORS.map((color) => (
                  <button
                    key={color.value}
                    onClick={() =>
                      setFormData({ ...formData, hairColor: color.value })
                    }
                    className="w-12 h-12 rounded-full transition-all relative"
                    style={{
                      backgroundColor: color.hex,
                      border:
                        formData.hairColor === color.value
                          ? "3px solid #C9847A"
                          : "2px solid #E5DDD5",
                      boxShadow:
                        formData.hairColor === color.value
                          ? "0 4px 12px rgba(201,132,122,0.4)"
                          : "none",
                    }}
                  >
                    {formData.hairColor === color.value && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Check
                          size={18}
                          className="text-white drop-shadow-md"
                        />
                      </div>
                    )}
                    <span className="sr-only">{color.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2
                className="text-xl font-bold mb-2"
                style={{ color: "#2B2B2B" }}
              >
                Upload your photo
              </h2>
              <p className="text-sm" style={{ color: "#7A6F68" }}>
                Step 6: For personalized styling recommendations (optional)
              </p>
            </div>

            {/* Privacy notice */}
            <div
              className="rounded-xl p-3 text-xs"
              style={{
                backgroundColor: "rgba(201,132,122,0.08)",
                color: "#7A6F68",
              }}
            >
              <p className="font-semibold mb-1" style={{ color: "#C9847A" }}>
                🔒 Your privacy is protected
              </p>
              <p>
                Your photo is used only to personalize your style
                recommendations. We never share or sell your images.
              </p>
            </div>

            {/* Hidden file input */}
            <input
              id="selfie-file-input"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (ev) => {
                    setFormData({
                      ...formData,
                      selfieImage: ev.target?.result as string,
                    });
                  };
                  reader.readAsDataURL(file);
                }
              }}
            />

            {/* Webcam capture area */}
            <div
              className="rounded-2xl overflow-hidden"
              style={{ border: "2px solid #E5DDD5" }}
            >
              {formData.selfieImage ? (
                <div className="relative">
                  <img
                    src={formData.selfieImage}
                    alt="Selfie preview"
                    className="w-full max-h-64 object-contain"
                    style={{ backgroundColor: "#F5F0EA" }}
                  />
                  <button
                    onClick={() =>
                      setFormData({ ...formData, selfieImage: null })
                    }
                    className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
                  >
                    <X size={16} className="text-white" />
                  </button>
                </div>
              ) : (
                <div
                  className="flex flex-col items-center justify-center py-12"
                  style={{ backgroundColor: "#F5F0EA" }}
                >
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                    style={{ backgroundColor: "rgba(201,132,122,0.1)" }}
                  >
                    <Camera size={28} style={{ color: "#C9847A" }} />
                  </div>
                  <p
                    className="font-semibold mb-4"
                    style={{ color: "#2B2B2B" }}
                  >
                    Upload your photo
                  </p>
                  <div className="flex gap-3">
                    <label
                      className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white cursor-pointer transition-all hover:opacity-90"
                      style={{ backgroundColor: "#C9847A" }}
                    >
                      Choose File
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                              setFormData({
                                ...formData,
                                selfieImage: ev.target?.result as string,
                              });
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                    <button
                      onClick={async () => {
                        try {
                          const stream =
                            await navigator.mediaDevices.getUserMedia({
                              video: { facingMode: "user" },
                            });
                          // Show video preview
                          const video = document.createElement("video");
                          video.srcObject = stream;
                          video.autoplay = true;
                          video.playsInline = true;
                          video.muted = true;
                          video.className = "w-full max-h-48 object-contain";

                          const container = document.createElement("div");
                          container.className = "relative";
                          const previewDiv = document.querySelector(
                            "#webcam-preview-container",
                          ) as HTMLElement;
                          if (previewDiv) {
                            previewDiv.innerHTML = "";
                            previewDiv.appendChild(video);

                            // Add capture button
                            const captureBtn = document.createElement("button");
                            captureBtn.className =
                              "absolute bottom-2 left-1/2 -translate-x-1/2 px-6 py-2 rounded-xl text-sm font-semibold text-white";
                            captureBtn.style.backgroundColor = "#C9847A";
                            captureBtn.textContent = "Capture";
                            captureBtn.onclick = () => {
                              const canvas = document.createElement("canvas");
                              canvas.width = video.videoWidth;
                              canvas.height = video.videoHeight;
                              canvas.getContext("2d")?.drawImage(video, 0, 0);
                              const imageData = canvas.toDataURL("image/jpeg");
                              setFormData({
                                ...formData,
                                selfieImage: imageData,
                              });
                              stream.getTracks().forEach((t) => t.stop());
                              if (previewDiv) previewDiv.innerHTML = "";
                            };
                            container.appendChild(captureBtn);

                            // Add cancel button
                            const cancelBtn = document.createElement("button");
                            cancelBtn.className =
                              "absolute bottom-2 right-2 px-4 py-2 rounded-xl text-sm font-medium";
                            cancelBtn.style.backgroundColor = "#E5DDD5";
                            cancelBtn.style.color = "#7A6F68";
                            cancelBtn.textContent = "Cancel";
                            cancelBtn.onclick = () => {
                              stream.getTracks().forEach((t) => t.stop());
                              if (previewDiv) previewDiv.innerHTML = "";
                            };
                            container.appendChild(cancelBtn);
                          }
                        } catch {
                          alert("Camera access denied or not available");
                        }
                      }}
                      className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-80"
                      style={{
                        backgroundColor: "#F5F0EA",
                        color: "#2B2B2B",
                        border: "1px solid #E5DDD5",
                      }}
                    >
                      Use Camera
                    </button>
                  </div>
                  <p className="text-xs mt-3" style={{ color: "#7A6F68" }}>
                    JPG, PNG, WEBP supported
                  </p>
                  <div id="webcam-preview-container" className="mt-4 w-full" />
                </div>
              )}
            </div>

            <button
              onClick={() => handleCreateAvatar()}
              disabled={creating}
              className="w-full py-4 rounded-2xl font-bold text-base text-white flex items-center justify-center gap-2 transition-all"
              style={{
                backgroundColor: "#C9847A",
                boxShadow: "0 4px 16px rgba(201,132,122,0.35)",
              }}
            >
              {creating ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Creating your twin...
                </>
              ) : (
                <>
                  <Sparkles size={20} />
                  Create My Style Twin
                </>
              )}
            </button>

            <button
              onClick={() => handleCreateAvatar()}
              disabled={creating}
              className="w-full py-3 rounded-xl font-medium text-sm transition-all"
              style={{
                backgroundColor: "transparent",
                color: "#7A6F68",
                border: "1px solid #E5DDD5",
              }}
            >
              Skip photo - use default features
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1" style={{ color: "#2B2B2B" }}>
          Style Twin
        </h1>
        <p className="text-sm" style={{ color: "#7A6F68" }}>
          Create your digital avatar and virtually try on outfits.
        </p>
      </div>

      {/* Error message */}
      {error && (
        <div
          className="mb-5 px-4 py-3 rounded-xl text-sm flex items-start gap-2"
          style={{
            backgroundColor: "rgba(220, 38, 38, 0.06)",
            border: "1px solid rgba(220, 38, 38, 0.2)",
            color: "#B91C1C",
          }}
        >
          <span className="mt-0.5 flex-shrink-0">
            <X size={14} />
          </span>
          {error}
        </div>
      )}

      {/* Creating state */}
      {creating ? (
        <div
          className="rounded-2xl p-10 flex flex-col items-center"
          style={{
            backgroundColor: "#FFFFFF",
            boxShadow: "0 2px 16px rgba(0,0,0,0.05)",
            border: "1px solid #F0EBE6",
          }}
        >
          {/* Animated avatar silhouette */}
          <div className="relative w-48 h-48 mb-8">
            <div
              className="absolute inset-0 rounded-full animate-pulse"
              style={{
                background:
                  "linear-gradient(135deg, #C9847A 0%, #E8B4A8 50%, #C9847A 100%)",
                opacity: 0.3,
              }}
            />
            <div
              className="absolute inset-8 rounded-full animate-bounce"
              style={{ backgroundColor: "#C9847A", animationDuration: "2s" }}
            />
            <div
              className="absolute w-2 h-2 rounded-full animate-ping"
              style={{
                backgroundColor: "#C9847A",
                top: "50%",
                left: "50%",
                animationDuration: "1.5s",
              }}
            />
          </div>

          <h2
            className="text-lg font-bold text-center mb-2"
            style={{ color: "#2B2B2B" }}
          >
            Creating your Style Twin...
          </h2>
          <p className="text-sm text-center mb-4" style={{ color: "#7A6F68" }}>
            {creatingMessage || "Please wait..."}
          </p>

          {/* Progress bar */}
          <div
            className="w-full max-w-xs h-1 rounded-full overflow-hidden"
            style={{ backgroundColor: "#E5DDD5" }}
          >
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                backgroundColor: "#C9847A",
                width: "100%",
                animation: "loading 10s ease-in-out infinite",
              }}
            />
          </div>

          <style>{`
            @keyframes loading {
              0% { width: 0%; }
              100% { width: 100%; }
            }
          `}</style>
        </div>
      ) : avatar ? (
        /* === AVATAR DISPLAY + TRY ON === */
        <div className="space-y-5">
          {/* Avatar viewer */}
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              backgroundColor: "#FFFFFF",
              boxShadow: "0 2px 16px rgba(0,0,0,0.05)",
              border: "1px solid #F0EBE6",
            }}
          >
            <div
              className="p-4 flex items-center justify-between border-b"
              style={{ borderColor: "#F0EBE6" }}
            >
              <h2 className="font-bold" style={{ color: "#2B2B2B" }}>
                Meet Your Style Twin
              </h2>
              <button
                onClick={handleRegenerate}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-all"
                style={{
                  backgroundColor: "rgba(201,132,122,0.08)",
                  color: "#C9847A",
                }}
              >
                <RotateCcw size={13} />
                Start Over
              </button>
            </div>

            {/* 3D Avatar Viewer */}
            <div className="relative" style={{ aspectRatio: "3/4" }}>
              <AvatarViewer
                modelUrl={avatar.avatarGlbUrl || undefined}
                fallbackImageUrl={avatar.avatarUrl}
                autoRotate={true}
                showControls={true}
                className="w-full h-full"
              />
            </div>

            {/* Avatar details */}
            <div className="p-4 border-t" style={{ borderColor: "#F0EBE6" }}>
              <div className="flex flex-wrap gap-2 text-xs">
                <span
                  className="px-2 py-1 rounded-full"
                  style={{ backgroundColor: "#F5F0EA", color: "#7A6F68" }}
                >
                  {formData.gender}
                </span>
                <span
                  className="px-2 py-1 rounded-full"
                  style={{ backgroundColor: "#F5F0EA", color: "#7A6F68" }}
                >
                  {formData.height}cm
                </span>
                <span
                  className="px-2 py-1 rounded-full"
                  style={{ backgroundColor: "#F5F0EA", color: "#7A6F68" }}
                >
                  {formData.clothingSize || "M"}
                </span>
                <span
                  className="px-2 py-1 rounded-full"
                  style={{ backgroundColor: "#F5F0EA", color: "#7A6F68" }}
                >
                  {formData.hairLength} {formData.hairTexture}
                </span>
              </div>
            </div>
          </div>

          {/* Try-on section */}
          <div
            className="rounded-2xl p-6"
            style={{
              backgroundColor: "#FFFFFF",
              boxShadow: "0 2px 16px rgba(0,0,0,0.05)",
              border: "1px solid #F0EBE6",
            }}
          >
            <h2
              className="font-bold text-base mb-1"
              style={{ color: "#2B2B2B" }}
            >
              Virtual Try-On
            </h2>
            <p className="text-xs mb-4" style={{ color: "#7A6F68" }}>
              Select items from your closet to try on your twin
            </p>

            {initialItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10">
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center mb-3"
                  style={{ backgroundColor: "rgba(201,132,122,0.08)" }}
                >
                  <Shirt size={24} style={{ color: "#C9847A" }} />
                </div>
                <p className="text-sm" style={{ color: "#7A6F68" }}>
                  No items in your closet yet
                </p>
                <p className="text-xs mt-1" style={{ color: "#7A6F68" }}>
                  Add items to start trying on outfits
                </p>
              </div>
            ) : (
              <>
                <div
                  className="grid grid-cols-4 gap-2 mb-5 max-h-60 overflow-y-auto pr-1"
                  style={{
                    scrollbarWidth: "thin",
                    scrollbarColor: "#E5DDD5 transparent",
                  }}
                >
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
                        <img
                          src={item.image_url}
                          alt={item.suggested_name || item.category}
                          className="object-cover w-full h-full"
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

                <div className="space-y-3">
                  <button
                    onClick={handleTryOn}
                    disabled={selectedOutfit.length === 0 || tryonLoading}
                    className="w-full py-3.5 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2 transition-all disabled:opacity-40"
                    style={{
                      backgroundColor: "#C9847A",
                      boxShadow:
                        selectedOutfit.length > 0
                          ? "0 4px 16px rgba(201,132,122,0.35)"
                          : "none",
                    }}
                  >
                    {tryonLoading ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Dressing your twin...
                      </>
                    ) : (
                      <>
                        <Sparkles size={16} />
                        Try this outfit
                      </>
                    )}
                  </button>

                  {/* Demo: Try Black Look button */}
                  <button
                    onClick={async () => {
                      if (!avatar) return;
                      setTryonLoading(true);
                      setError(null);
                      try {
                        const res = await fetch("/api/avatar/tryon", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            avatarUrl: avatar.avatarUrl,
                            outfitItemIds: [],
                            demoBlackLook: true,
                          }),
                        });
                        const data = await res.json();
                        if (data.error) {
                          setError(data.error);
                          return;
                        }
                        setTryonResult(data.resultUrl || null);
                      } catch (err) {
                        console.error(err);
                        setError(
                          "Failed to generate try-on. Please try again.",
                        );
                      } finally {
                        setTryonLoading(false);
                      }
                    }}
                    disabled={tryonLoading || !avatar}
                    className="w-full py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-40"
                    style={{
                      backgroundColor: "#1a1a1a",
                      color: "#ffffff",
                      boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
                    }}
                  >
                    <Sparkles size={16} />
                    Try Black Look — Demo
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Try-on result */}
          {tryonResult && (
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                backgroundColor: "#FFFFFF",
                boxShadow: "0 2px 16px rgba(0,0,0,0.05)",
                border: "1px solid #F0EBE6",
              }}
            >
              <div
                className="p-4 flex items-center justify-between border-b"
                style={{ borderColor: "#F0EBE6" }}
              >
                <h2 className="font-bold" style={{ color: "#2B2B2B" }}>
                  Your Outfit
                </h2>
                <button
                  onClick={() => setTryonResult(null)}
                  className="text-xs px-2 py-1 rounded"
                  style={{ backgroundColor: "#F5F0EA", color: "#7A6F68" }}
                >
                  Show original
                </button>
              </div>
              <div style={{ aspectRatio: "3/4" }}>
                <img
                  src={tryonResult}
                  alt="Try-on result"
                  className="w-full h-full object-contain"
                  style={{ backgroundColor: "#F5F0EA" }}
                />
              </div>
            </div>
          )}
        </div>
      ) : (
        /* === STEP-BY-STEP FORM === */
        <div
          className="rounded-2xl p-6"
          style={{
            backgroundColor: "#FFFFFF",
            boxShadow: "0 2px 16px rgba(0,0,0,0.05)",
            border: "1px solid #F0EBE6",
          }}
        >
          {/* Progress indicator */}
          <div className="flex items-center justify-between mb-8">
            {[1, 2, 3, 4, 5, 6].map((step) => (
              <div key={step} className="flex items-center">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                  style={{
                    backgroundColor:
                      currentStep >= step ? "#C9847A" : "#E5DDD5",
                    color: currentStep >= step ? "#FFFFFF" : "#7A6F68",
                  }}
                >
                  {currentStep > step ? <Check size={14} /> : step}
                </div>
                {step < 6 && (
                  <div
                    className="w-8 h-0.5 mx-1"
                    style={{
                      backgroundColor:
                        currentStep > step ? "#C9847A" : "#E5DDD5",
                    }}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Step content */}
          {renderStepContent()}

          {/* Navigation */}
          {currentStep < 6 && (
            <div className="flex gap-3 mt-8">
              {currentStep > 1 && (
                <button
                  onClick={handleBack}
                  className="flex-1 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all"
                  style={{
                    backgroundColor: "#F5F0EA",
                    color: "#2B2B2B",
                    border: "1px solid #E5DDD5",
                  }}
                >
                  <ChevronLeft size={16} />
                  Back
                </button>
              )}
              <button
                onClick={currentStep === 5 ? handleCreateAvatar : handleNext}
                disabled={!canProceed(currentStep)}
                className="flex-1 py-3 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2 transition-all disabled:opacity-40"
                style={{
                  backgroundColor: "#C9847A",
                  boxShadow: canProceed(currentStep)
                    ? "0 4px 16px rgba(201,132,122,0.35)"
                    : "none",
                }}
              >
                {currentStep === 5 ? (
                  <>
                    <Sparkles size={16} />
                    Create Twin
                  </>
                ) : (
                  <>
                    Next
                    <ChevronRight size={16} />
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
