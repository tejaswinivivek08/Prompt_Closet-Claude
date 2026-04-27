// Ready Player Me Integration
// Free avatar API - no key required for basic avatars

export interface AvatarParams {
  gender: "female" | "male" | "nonbinary";
  skinTone: string; // hex color
  hairStyle: string;
  hairColor: string;
  height: number; // cm
  weight: number; // kg
  bustCm?: number;
  waistCm?: number;
  hipsCm?: number;
}

export interface OutfitItem {
  id: string;
  category: string;
  imageUrl: string;
}

const RPM_BASE_URL = "https://api.readyplayer.me/v1";
const RPM_PARTNER = "prompt-closet";

export type RPMSubPartner = "avatar" | "tryon" | "outfit";

function getRPMUrl(subPartner: RPMSubPartner = "avatar"): string {
  return `https://.readyplayer.me/${subPartner}`;
}

// Hair style mapping for RPM
const HAIR_STYLE_MAP: Record<string, string> = {
  short: "short",
  medium: "medium",
  long: "long",
  very_long: "very-long",
  bald: "bald",
  pixie: "short",
  bob: "medium",
  undercut: "medium",
  dreadlocks: "long",
  afro: "short",
};

// Hair color mapping for RPM
const HAIR_COLOR_MAP: Record<string, string> = {
  black: "#0C0C0C",
  dark_brown: "#1C0A00",
  brown: "#3B2219",
  auburn: "#6B2D1A",
  blonde: "#D4A857",
  platinum_blonde: "#F0E6D2",
  grey: "#9E9E9E",
  white: "#FFFFFF",
  red: "#8B0000",
  ginger: "#B55239",
};

export function mapHairStyle(style: string): string {
  return HAIR_STYLE_MAP[style.toLowerCase()] || "medium";
}

export function mapHairColor(color: string): string {
  return HAIR_COLOR_MAP[color.toLowerCase()] || color;
}

// Generate avatar model URL from RPM
export async function createAvatar(params: AvatarParams): Promise<string> {
  const { gender, skinTone, hairStyle, hairColor, height } = params;

  // Build RPM query params
  // Height is in cm, RPM expects meters
  const heightM = height / 100;

  // Build the avatar URL with query parameters
  const queryParams = new URLSearchParams({
    gender: gender === "nonbinary" ? "female" : gender, // RPM uses binary
    height: heightM.toFixed(2),
    hairStyle: mapHairStyle(hairStyle),
    hairColor: mapHairColor(hairColor),
    skinTone: skinTone,
  });

  // For a real integration, we'd use their API
  // But for now, generate a model URL with parameters
  const modelUrl = `${RPM_BASE_URL}/avatar?${queryParams.toString()}`;

  // Since RPM doesn't have a direct API for avatar creation without iframe,
  // we'll return a placeholder that will be loaded in an iframe
  return modelUrl;
}

// Open RPM iframe for avatar creation
export function openRPMAvatarCreator(
  onAvatarReady: (avatarUrl: string) => void,
  containerElement?: HTMLElement,
): { close: () => void } {
  const iframe = document.createElement("iframe");
  iframe.src = `${getRPMUrl("avatar")}?frameApi=true&parent=${window.location.hostname}`;
  iframe.style.position = "fixed";
  iframe.style.top = "0";
  iframe.style.left = "0";
  iframe.style.width = "100%";
  iframe.style.height = "100%";
  iframe.style.border = "none";
  iframe.style.zIndex = "9999";
  iframe.style.backgroundColor = "white";

  document.body.appendChild(iframe);

  // Listen for postMessage from RPM iframe
  const messageHandler = (event: MessageEvent) => {
    // RPM sends avatar URL via postMessage
    if (
      event.data?.type === "avatar-selected" ||
      event.data?.type === "v1.avatar-selected"
    ) {
      const avatarUrl = event.data?.data?.url || event.data?.avatarUrl;
      if (avatarUrl) {
        onAvatarReady(avatarUrl);
        closeIframe();
      }
    }
  };

  window.addEventListener("message", messageHandler);

  function closeIframe() {
    if (iframe.parentNode) {
      iframe.parentNode.removeChild(iframe);
    }
    window.removeEventListener("message", messageHandler);
  }

  // Auto-cleanup after 5 minutes
  setTimeout(closeIframe, 5 * 60 * 1000);

  return { close: closeIframe };
}

// Load a GLB model from URL
export async function loadGLBModel(
  modelUrl: string,
): Promise<ArrayBuffer | null> {
  try {
    const response = await fetch(modelUrl);
    if (!response.ok) {
      console.error("Failed to load GLB model:", response.status);
      return null;
    }
    return await response.arrayBuffer();
  } catch (error) {
    console.error("Error loading GLB model:", error);
    return null;
  }
}

// Fallback: Use MiniMax to generate fashion illustration
export async function generateFashionIllustration(
  avatarImageUrl: string,
  outfitDescription: string,
): Promise<string | null> {
  const miniMaxKey =
    process.env.NEXT_PUBLIC_MINIMAX_API_KEY || process.env.MINIMAX_API_KEY;

  if (!miniMaxKey) {
    console.warn("MiniMax API key not configured for fallback");
    return null;
  }

  try {
    const response = await fetch(
      "https://api.minimaxi.chat/v1/images/txt2img",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${miniMaxKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "image-01",
          prompt: `Fashion illustration of a person ${outfitDescription}, full body, neutral studio background, high quality fashion editorial, digital art`,
          image_urls: [avatarImageUrl],
        }),
      },
    );

    if (!response.ok) {
      console.error("MiniMax fallback failed:", response.status);
      return null;
    }

    const data = await response.json();
    return data.data?.[0]?.url || null;
  } catch (error) {
    console.error("MiniMax fallback error:", error);
    return null;
  }
}

// Demo avatar URL (pre-generated for demo)
export const DEMO_AVATAR_URL =
  "https://models.readyplayer.me/64f1b2c3d4e5f6a7b8c9d0e1.glb";
export const DEMO_AVATAR_FALLBACK =
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&h=800&fit=crop";

// Check if RPM GLB URL is valid
export function isValidGLBUrl(url: string): boolean {
  return (
    url.includes(".glb") ||
    url.includes(".gltf") ||
    url.includes("models.readyplayer.me")
  );
}

// Convert Unsplash/image URL to avatar URL for try-on
export async function processAvatarForTryon(
  avatarUrl: string,
): Promise<string> {
  // If it's already a GLB URL, return as-is
  if (isValidGLBUrl(avatarUrl)) {
    return avatarUrl;
  }

  // For image URLs, we'd use MiniMax to generate a dressed avatar
  // For now, return the image URL as-is
  return avatarUrl;
}
