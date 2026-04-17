import { supabase } from "@/lib/supabase";
import { StorageAccessFramework } from "expo-file-system";

const BUCKET_NAME = "wardrobe-items";

/**
 * Upload an image to Supabase Storage.
 * @param userId - The authenticated user's ID
 * @param imageUri - Local URI of the image file
 * @param onProgress - Optional callback for upload progress (0-100)
 * @returns The public URL of the uploaded image
 */
export async function uploadWardrobeImage(
  userId: string,
  imageUri: string,
  onProgress?: (progress: number) => void,
): Promise<string> {
  // Generate a unique filename
  const uuid = generateUUID();
  const filePath = `${userId}/${uuid}.jpg`;

  // Read the file as base64
  const response = await fetch(imageUri);
  const blob = await response.blob();
  const base64 = await blobToBase64(blob);

  // Upload to Supabase Storage with progress tracking
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, decodeBase64ToArrayBuffer(base64), {
      contentType: "image/jpeg",
      upsert: false,
    });

  if (error) {
    throw new UploadError(
      `Upload failed: ${error.message}`,
      "UPLOAD_FAILED",
      error,
    );
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(data.path);

  return urlData.publicUrl;
}

/**
 * Delete an image from Supabase Storage
 */
export async function deleteWardrobeImage(imageUrl: string): Promise<void> {
  // Extract the path from the full URL
  const path = extractPathFromUrl(imageUrl, BUCKET_NAME);

  if (!path) {
    return; // Nothing to delete
  }

  const { error } = await supabase.storage.from(BUCKET_NAME).remove([path]);

  if (error) {
    throw new UploadError(
      `Delete failed: ${error.message}`,
      "DELETE_FAILED",
      error,
    );
  }
}

/**
 * Get the storage path from a public URL
 */
function extractPathFromUrl(url: string, bucket: string): string | null {
  // Expected format: https://xxx.supabase.co/storage/v1/object/public/bucket/path
  const match = url.match(
    new RegExp(`/storage/v1/object/public/${bucket}/(.+)`),
  );
  return match ? match[1] : null;
}

/**
 * Generate a UUID v4
 */
function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Convert a Blob to base64 string
 */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Convert base64 string to Uint8Array
 */
function decodeBase64ToArrayBuffer(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Custom error class for upload operations
 */
export class UploadError extends Error {
  code: string;
  originalError: unknown;

  constructor(message: string, code: string, originalError: unknown) {
    super(message);
    this.name = "UploadError";
    this.code = code;
    this.originalError = originalError;
  }
}

/**
 * Get storage bucket info
 */
export async function ensureBucketExists(): Promise<boolean> {
  const { data, error } = await supabase.storage.getBucket(BUCKET_NAME);

  if (error && error.message.includes("not found")) {
    // Bucket doesn't exist - need to create it via Supabase dashboard
    console.warn(
      `Bucket '${BUCKET_NAME}' does not exist. Create it in Supabase dashboard.`,
    );
    return false;
  }

  return true;
}
