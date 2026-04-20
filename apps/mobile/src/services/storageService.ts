/**
 * Supabase Storage Service — Image Upload Pipeline
 *
 * Handles uploading wardrobe item images to Supabase Storage.
 * Images are stored at: wardrobe-items/{user_id}/{uuid}.jpg
 */

import { supabase } from "../lib/supabase";

export class UploadError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.name = "UploadError";
    this.code = code;
  }
}

/**
 * Upload a wardrobe item image to Supabase Storage.
 *
 * @param userId   - Current user's UUID
 * @param imageUri - Local file URI (from ImagePicker or ImageManipulator)
 * @param onProgress - Optional callback receiving upload progress 0.0–1.0
 * @returns Public URL of the uploaded image
 */
export async function uploadWardrobeImage(
  userId: string,
  imageUri: string,
  onProgress?: (progress: number) => void,
): Promise<string> {
  // Generate a unique filename
  const uuid = crypto.randomUUID();
  const filePath = `${userId}/${uuid}.jpg`;

  // Read the file as binary
  const response = await fetch(imageUri);
  if (!response.ok) {
    throw new UploadError(
      `Failed to read image file: ${response.status}`,
      "FILE_READ_ERROR",
    );
  }
  const blob = await response.blob();

  // Upload to Supabase Storage with progress tracking
  const { data, error } = await supabase.storage
    .from("wardrobe-items")
    .upload(filePath, blob, {
      contentType: "image/jpeg",
      upsert: false,
    });

  if (error) {
    console.error("[StorageService] Upload error:", error.message);
    throw new UploadError(`Upload failed: ${error.message}`, "UPLOAD_FAILED");
  }

  // Get the public URL
  const { data: urlData } = supabase.storage
    .from("wardrobe-items")
    .getPublicUrl(filePath);

  if (!urlData?.publicUrl) {
    throw new UploadError(
      "Failed to get public URL after upload",
      "URL_GENERATION_FAILED",
    );
  }

  console.log(`[StorageService] Uploaded: ${urlData.publicUrl}`);
  return urlData.publicUrl;
}

/**
 * Delete a wardrobe item image from Supabase Storage.
 *
 * @param imageUrl - Full public URL of the image to delete
 */
export async function deleteWardrobeImage(imageUrl: string): Promise<void> {
  // Extract the storage path from the public URL
  // URL format: https://{project}.supabase.co/storage/v1/object/public/wardrobe-items/{path}
  try {
    const url = new URL(imageUrl);
    const pathParts = url.pathname.split(
      "/storage/v1/object/public/wardrobe-items/",
    );
    if (pathParts.length < 2) {
      console.warn(
        "[StorageService] Could not parse storage path from URL:",
        imageUrl,
      );
      return;
    }
    const filePath = pathParts[1];

    const { error } = await supabase.storage
      .from("wardrobe-items")
      .remove([filePath]);
    if (error) {
      console.error("[StorageService] Delete error:", error.message);
      throw new UploadError(`Delete failed: ${error.message}`, "DELETE_FAILED");
    }
    console.log(`[StorageService] Deleted: ${filePath}`);
  } catch (err) {
    console.error("[StorageService] deleteWardrobeImage error:", err);
  }
}
