-- Prompt Closet Storage Setup
-- Run in Supabase SQL Editor ONCE to create the wardrobe-items bucket
-- Dashboard > SQL Editor > paste this > Run

-- 1. Create the bucket (public so image URLs work without signed tokens)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'wardrobe-items',
  'wardrobe-items',
  true,
  10485760,  -- 10 MB per file
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic'];

-- 2. Allow authenticated users to upload into their own folder (userId/filename)
CREATE POLICY "Users can upload their own wardrobe items"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'wardrobe-items'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 3. Public read — needed so image_url works in the app without auth tokens
CREATE POLICY "Wardrobe items are publicly readable"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'wardrobe-items');

-- 4. Users can delete their own files
CREATE POLICY "Users can delete their own wardrobe items"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'wardrobe-items'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Verify
SELECT id, name, public, file_size_limit FROM storage.buckets WHERE id = 'wardrobe-items';
