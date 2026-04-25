"use client";

import { useState, useRef, useEffect } from "react";
import {
  Upload,
  Sparkles,
  Check,
  Camera,
  X,
  RotateCcw,
  Shirt,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type OutfitItem = {
  id: string;
  image_url: string;
  category: string;
  suggested_name: string | null;
};

type Avatar = {
  id: string;
  avatar_url: string;
  style: string;
  created_at: string;
};

const STEPS = [
  { num: 1, label: "Upload" },
  { num: 2, label: "Generate" },
  { num: 3, label: "Try On" },
];

export default function TwinClient({
  initialItems,
  initialAvatar,
  userId,
}: {
  initialItems: OutfitItem[];
  initialAvatar: Avatar | null;
  userId: string;
}) {
  const supabase = createClient();

  // Core state
  const [avatar, setAvatar] = useState<Avatar | null>(initialAvatar);
  const [generating, setGenerating] = useState(false);
  const [generatingStep, setGeneratingStep] = useState<
    "upload" | "regenerate" | null
  >(null);
  const [tryonLoading, setTryonLoading] = useState(false);
  const [tryonResult, setTryonResult] = useState<string | null>(null);

  // Upload state
  const [dragging, setDragging] = useState(false);
  const [showWebcam, setShowWebcam] = useState(false);
  const [webcamStream, setWebcamStream] = useState<MediaStream | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Outfit selection
  const [selectedOutfit, setSelectedOutfit] = useState<string[]>([]);

  // Refs
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const webcamStreamRef = useRef<MediaStream | null>(null);

  // Cleanup webcam on unmount
  useEffect(() => {
    return () => {
      if (webcamStreamRef.current) {
        webcamStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setUploadError("Please upload an image file");
      return;
    }
    setUploadError(null);
    setGeneratingStep("upload");
    setGenerating(true);
    try {
      const base64 = await fileToBase64(file);
      const res = await fetch("/api/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageData: base64, userId }),
      });
      const data = await res.json();
      if (data.error) {
        setUploadError(
          data.error === "MINIMAX_NOT_CONFIGURED"
            ? "Avatar generation requires a MiniMax API key. Please upload a regular selfie instead."
            : data.error || "Failed to generate avatar. Please try again.",
        );
        return;
      }
      if (data.avatarUrl) {
        setAvatar({
          id: data.avatarId || "",
          avatar_url: data.avatarUrl,
          style: "fashion_model",
          created_at: new Date().toISOString(),
        });
        setTryonResult(null);
        setCapturedPhoto(null);
      }
    } catch (err) {
      console.error(err);
      setUploadError("Failed to generate avatar. Please try again.");
    } finally {
      setGenerating(false);
      setGeneratingStep(null);
    }
  };

  const handleRegenerate = async () => {
    setGeneratingStep("regenerate");
    setGenerating(true);
    try {
      const res = await fetch("/api/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageData: null, userId, regenerate: true }),
      });
      const data = await res.json();
      if (data.error) {
        setUploadError(
          data.error === "MINIMAX_NOT_CONFIGURED"
            ? "Avatar regeneration requires a MiniMax API key."
            : data.error || "Failed to regenerate avatar.",
        );
        return;
      }
      if (data.avatarUrl) {
        setAvatar({
          id: data.avatarId || "",
          avatar_url: data.avatarUrl,
          style: "fashion_model",
          created_at: new Date().toISOString(),
        });
        setTryonResult(null);
      }
    } catch (err) {
      console.error(err);
      setUploadError("Failed to regenerate avatar. Please try again.");
    } finally {
      setGenerating(false);
      setGeneratingStep(null);
    }
  };

  // Webcam handlers
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      webcamStreamRef.current = stream;
      setWebcamStream(stream);
      setShowWebcam(true);
      setCapturedPhoto(null);
      setUploadError(null);
    } catch {
      setUploadError(
        "Could not access camera. Please allow camera permissions or upload a photo instead.",
      );
    }
  };

  const stopCamera = () => {
    if (webcamStreamRef.current) {
      webcamStreamRef.current.getTracks().forEach((t) => t.stop());
      webcamStreamRef.current = null;
    }
    setWebcamStream(null);
    setShowWebcam(false);
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg");
    setCapturedPhoto(dataUrl);
    stopCamera();
  };

  const handleCapturedPhoto = () => {
    if (capturedPhoto) {
      handleFile(dataURLToFile(capturedPhoto, "webcam-capture.jpg"));
    }
  };

  const dataURLToFile = (dataUrl: string, filename: string): File => {
    const arr = dataUrl.split(",");
    const mime = arr[0].match(/:(.*?);/)?.[1] || "image/jpeg";
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) u8arr[n] = bstr.charCodeAt(n);
    return new File([u8arr], filename, { type: mime });
  };

  // Try-on
  const handleTryOn = async () => {
    if (selectedOutfit.length === 0 || !avatar) return;
    setTryonLoading(true);
    try {
      const res = await fetch("/api/avatar/tryon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          avatarUrl: avatar.avatar_url,
          outfitItemIds: selectedOutfit,
        }),
      });
      const data = await res.json();
      if (data.error) {
        setUploadError(data.error);
        return;
      }
      setTryonResult(data.resultUrl || null);
    } catch (err) {
      console.error(err);
      setUploadError("Failed to generate try-on. Please try again.");
    } finally {
      setTryonLoading(false);
    }
  };

  // Derived state
  const currentStep = avatar ? 3 : generating ? 2 : 1;
  const hasAvatar = !!avatar;
  const hasTryonResult = !!tryonResult;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1" style={{ color: "#2B2B2B" }}>
          Digital Twin
        </h1>
        <p className="text-sm" style={{ color: "#7A6F68" }}>
          Create your AI avatar and virtually try on outfits.
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center justify-center gap-0 mb-8">
        {STEPS.map((step, idx) => (
          <div key={step.num} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all"
                style={{
                  backgroundColor:
                    currentStep >= step.num ? "#C9847A" : "#F5F0EA",
                  color: currentStep >= step.num ? "#FFFFFF" : "#7A6F68",
                  border:
                    currentStep >= step.num ? "none" : "2px solid #E5DDD5",
                  boxShadow:
                    currentStep >= step.num
                      ? "0 4px 12px rgba(201,132,122,0.35)"
                      : "none",
                }}
              >
                {currentStep > step.num ? <Check size={18} /> : step.num}
              </div>
              <span
                className="text-xs mt-1.5 font-medium"
                style={{
                  color: currentStep >= step.num ? "#2B2B2B" : "#7A6F68",
                }}
              >
                {step.label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div
                className="h-0.5 w-16 mx-1 mb-5 transition-all"
                style={{
                  backgroundColor:
                    currentStep > step.num ? "#C9847A" : "#E5DDD5",
                }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Error message */}
      {uploadError && (
        <div
          className="mb-5 px-4 py-3 rounded-xl text-sm flex items-start gap-2"
          style={{
            backgroundColor: "rgba(220, 38, 38, 0.06)",
            border: "1px solid rgba(220, 38, 38, 0.2)",
            color: "#B91C1C",
          }}
        >
          <span className="mt-0.5 flex-shrink-0">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
            </svg>
          </span>
          {uploadError}
        </div>
      )}

      {/* === STEP 1: UPLOAD === */}
      {!hasAvatar && !generating && !showWebcam && (
        <div
          className="rounded-2xl p-8"
          style={{
            backgroundColor: "#FFFFFF",
            boxShadow: "0 2px 16px rgba(0,0,0,0.05)",
            border: "1px solid #F0EBE6",
          }}
        >
          <h2
            className="text-lg font-bold text-center mb-1"
            style={{ color: "#2B2B2B" }}
          >
            Create Your Style Twin
          </h2>
          <p className="text-sm text-center mb-6" style={{ color: "#7A6F68" }}>
            Stand straight, good lighting, full body visible
          </p>

          {/* Upload zone */}
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
              if (file) handleFile(file);
            }}
            onClick={() => fileRef.current?.click()}
            className="rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer mb-5 transition-all"
            style={{
              aspectRatio: "4/3",
              borderColor: dragging ? "#C9847A" : "#E5DDD5",
              backgroundColor: dragging ? "rgba(201,132,122,0.06)" : "#F5F0EA",
            }}
          >
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
              style={{ backgroundColor: "rgba(201,132,122,0.1)" }}
            >
              <Upload size={28} style={{ color: "#C9847A" }} />
            </div>
            <p
              className="text-base font-semibold mb-1"
              style={{ color: "#2B2B2B" }}
            >
              Drop your photo here
            </p>
            <p className="text-xs mb-3" style={{ color: "#7A6F68" }}>
              or click to browse
            </p>
            <p className="text-xs" style={{ color: "#7A6F68" }}>
              JPG, PNG, WEBP supported
            </p>
          </div>

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

          {/* Divider */}
          <div className="flex items-center gap-3 mb-5">
            <div
              className="flex-1 h-px"
              style={{ backgroundColor: "#E5DDD5" }}
            />
            <span className="text-xs" style={{ color: "#7A6F68" }}>
              or
            </span>
            <div
              className="flex-1 h-px"
              style={{ backgroundColor: "#E5DDD5" }}
            />
          </div>

          {/* Webcam button */}
          <button
            onClick={startCamera}
            className="w-full py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all hover:opacity-90"
            style={{
              backgroundColor: "#F5F0EA",
              color: "#2B2B2B",
              border: "1px solid #E5DDD5",
            }}
          >
            <Camera size={18} style={{ color: "#C9847A" }} />
            Take Photo with Camera
          </button>
        </div>
      )}

      {/* === WEBCAM VIEW === */}
      {showWebcam && (
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            backgroundColor: "#FFFFFF",
            boxShadow: "0 2px 16px rgba(0,0,0,0.05)",
            border: "1px solid #F0EBE6",
          }}
        >
          <div className="relative">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full aspect-[4/3] object-cover"
              style={{ display: "block" }}
            />
            <button
              onClick={stopCamera}
              className="absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center"
              style={{
                backgroundColor: "rgba(0,0,0,0.4)",
                color: "#FFFFFF",
              }}
            >
              <X size={18} />
            </button>
          </div>
          <div className="p-5 flex gap-3">
            <button
              onClick={stopCamera}
              className="flex-1 py-3 rounded-xl font-semibold text-sm transition-all hover:opacity-90"
              style={{
                backgroundColor: "#F5F0EA",
                color: "#2B2B2B",
                border: "1px solid #E5DDD5",
              }}
            >
              Cancel
            </button>
            <button
              onClick={capturePhoto}
              className="flex-1 py-3 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2 transition-all hover:opacity-90"
              style={{
                backgroundColor: "#C9847A",
                boxShadow: "0 4px 16px rgba(201,132,122,0.35)",
              }}
            >
              <Camera size={16} />
              Capture
            </button>
          </div>
        </div>
      )}

      {/* === CAPTURED PHOTO REVIEW === */}
      {capturedPhoto && !hasAvatar && !generating && (
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            backgroundColor: "#FFFFFF",
            boxShadow: "0 2px 16px rgba(0,0,0,0.05)",
            border: "1px solid #F0EBE6",
          }}
        >
          <div className="relative" style={{ aspectRatio: "4/3" }}>
            <img
              src={capturedPhoto}
              alt="Captured photo"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="p-5 flex gap-3">
            <button
              onClick={() => {
                setCapturedPhoto(null);
                startCamera();
              }}
              className="flex-1 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all hover:opacity-90"
              style={{
                backgroundColor: "#F5F0EA",
                color: "#2B2B2B",
                border: "1px solid #E5DDD5",
              }}
            >
              <RotateCcw size={15} />
              Retake
            </button>
            <button
              onClick={handleCapturedPhoto}
              className="flex-1 py-3 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2 transition-all hover:opacity-90"
              style={{
                backgroundColor: "#C9847A",
                boxShadow: "0 4px 16px rgba(201,132,122,0.35)",
              }}
            >
              <Sparkles size={15} />
              Create Twin
            </button>
          </div>
        </div>
      )}

      {/* === STEP 2: GENERATING === */}
      {generating && (
        <div
          className="rounded-2xl p-10 flex flex-col items-center"
          style={{
            backgroundColor: "#FFFFFF",
            boxShadow: "0 2px 16px rgba(0,0,0,0.05)",
            border: "1px solid #F0EBE6",
          }}
        >
          <div
            className="w-full max-w-xs rounded-2xl overflow-hidden mb-6"
            style={{
              aspectRatio: "3/4",
              background:
                "linear-gradient(90deg, #F5F0EA 25%, #EDE5DB 50%, #F5F0EA 75%)",
              backgroundSize: "200% 100%",
              animation: "shimmer 1.5s infinite",
            }}
          />
          <h2
            className="text-lg font-bold text-center mb-1"
            style={{ color: "#2B2B2B" }}
          >
            Creating Your Style Twin...
          </h2>
          <p className="text-sm text-center" style={{ color: "#7A6F68" }}>
            Our AI is crafting your personalized fashion avatar
          </p>
          <style>{`
            @keyframes shimmer {
              0% { background-position: 200% 0; }
              100% { background-position: -200% 0; }
            }
          `}</style>
        </div>
      )}

      {/* === STEP 3: DISPLAY AVATAR + TRY ON === */}
      {hasAvatar && !generating && (
        <div className="space-y-5">
          {/* Avatar display */}
          <div
            className="rounded-2xl p-6"
            style={{
              backgroundColor: "#FFFFFF",
              boxShadow: "0 2px 16px rgba(0,0,0,0.05)",
              border: "1px solid #F0EBE6",
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-base" style={{ color: "#2B2B2B" }}>
                Your Style Twin
              </h2>
              <button
                onClick={handleRegenerate}
                disabled={generating}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-all hover:opacity-80 disabled:opacity-50"
                style={{
                  backgroundColor: "rgba(201,132,122,0.08)",
                  color: "#C9847A",
                }}
              >
                <RotateCcw size={13} />
                Regenerate
              </button>
            </div>

            <div
              className="rounded-2xl overflow-hidden mb-5"
              style={{
                aspectRatio: "3/4",
                backgroundColor: "#F5F0EA",
              }}
            >
              <img
                src={tryonResult || avatar.avatar_url}
                alt="Your digital twin"
                className="object-cover w-full h-full"
                style={{ objectFit: "cover" }}
              />
            </div>

            {tryonResult && (
              <p
                className="text-xs text-center mb-3"
                style={{ color: "#7A6F68" }}
              >
                Wearing your selected outfit
              </p>
            )}
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
              Try an Outfit On
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
                          style={{ objectFit: "cover" }}
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

                <button
                  onClick={handleTryOn}
                  disabled={selectedOutfit.length === 0 || tryonLoading}
                  className="w-full py-3.5 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-40"
                  style={{
                    backgroundColor: "#C9847A",
                    boxShadow:
                      selectedOutfit.length > 0 && !tryonLoading
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
                      Styling your twin...
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      See it on me
                    </>
                  )}
                </button>
              </>
            )}
          </div>

          {/* Clear try-on result */}
          {tryonResult && (
            <button
              onClick={() => setTryonResult(null)}
              className="w-full py-2.5 rounded-xl font-medium text-sm transition-all hover:opacity-80"
              style={{
                backgroundColor: "transparent",
                color: "#7A6F68",
                border: "1px solid #E5DDD5",
              }}
            >
              Show original twin
            </button>
          )}
        </div>
      )}
    </div>
  );
}
