# Image Pipeline Specification

## Overview

Camera capture or gallery pick → client-side compression → upload to Supabase Storage → trigger tagging and embedding pipelines.

## Flow

```
[Camera capture] or [Gallery pick]
       |
       v
[1] Client-side validation
    - Max file size: 10MB
    - Accepted formats: JPEG, PNG (convert HEIC to JPEG on iOS)
    - Reject: non-image files, corrupted images
       |
       v
[2] Client-side compression
    - Resize to 1024x1024 (maintain aspect ratio, center crop for square thumbnail)
    - Quality: 0.7 JPEG
    - Result: ~200-400KB per image
    - Tool: expo-image-manipulator
       |
       v
[3] Generate thumbnail
    - Resize to 200x200 (square crop)
    - Quality: 0.5 JPEG
    - Result: ~20-50KB per thumbnail
       |
       v
[4] Upload original + thumbnail to Supabase Storage
    - Bucket: "closet-images"
    - Path: /{user_id}/{uuid}.jpeg
    - Thumbnail path: /{user_id}/{uuid}_thumb.jpeg
    - Use FormData with uri field (not Blob — RN compatibility)
    - Show progress indicator during upload
       |
       v
[5] Insert clothing_items row
    - image_url = public URL of uploaded image
    - image_storage_path = storage path
    - thumbnail_url = public URL of thumbnail
    - tag_status = 'pending'
    - embedding_status = 'pending'
       |
       v
[6] Trigger parallel processing
    - Claude Vision auto-tagging (see auto-tagging.md)
    - CLIP embedding generation (see embeddings.md)
    - Both run concurrently, update their respective status fields independently
```

## Batch Upload

For gallery multi-select (up to 10 images):

- Process uploads in parallel (3 concurrent)
- Show progress: "Tagging 3 of 8..."
- Each item appears in closet as soon as its tagging completes
- Embeddings generate asynchronously (may complete after item is visible)

## Error States

| Error                    | User-Facing Message                          | Action             |
| ------------------------ | -------------------------------------------- | ------------------ |
| Camera permission denied | "Camera access needed to photograph clothes" | Link to Settings   |
| File too large           | "Image is too large. Try a different photo." | Return to picker   |
| Upload fails (network)   | "Upload failed. Check your connection."      | Retry button       |
| Storage quota exceeded   | "Storage full. Delete some items first."     | Redirect to closet |
| HEIC format (iOS)        | (handled automatically — convert to JPEG)    | Transparent        |

## URI Handling (Platform-Specific)

```typescript
// iOS: file:///path/to/image.jpeg
// Android: content:///path/to/image.jpeg
// Both must be converted via FormData for Supabase upload

const formData = new FormData();
formData.append("file", {
  uri: imageUri,
  type: "image/jpeg",
  name: `${uuid}.jpeg`,
});
```

## Supabase Storage RLS

```sql
-- Bucket: closet-images (public read for authenticated, user-scoped write)
-- Each user can only upload to their own folder
-- Signed URLs for image access (or public if acceptable for demo)

CREATE POLICY "Users can upload own images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'closet-images' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can read own images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'closet-images' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'closet-images' AND (storage.foldername(name))[1] = auth.uid()::text);
```
