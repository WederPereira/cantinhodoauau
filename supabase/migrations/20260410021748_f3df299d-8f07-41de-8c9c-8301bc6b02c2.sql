
-- Fix 1: hotel-belongings - remove public write/delete, restrict to authenticated
DROP POLICY IF EXISTS "Allow public uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public deletes" ON storage.objects;
DROP POLICY IF EXISTS "Public can upload hotel belongings" ON storage.objects;
DROP POLICY IF EXISTS "Public can delete hotel belongings" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload hotel-belongings" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete hotel-belongings" ON storage.objects;

-- Create proper authenticated-only policies for hotel-belongings
CREATE POLICY "Authenticated can upload hotel-belongings"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'hotel-belongings');

CREATE POLICY "Authenticated can update hotel-belongings"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'hotel-belongings');

CREATE POLICY "Authenticated can delete hotel-belongings"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'hotel-belongings');

-- Fix 2: reels - add ownership check to DELETE
DROP POLICY IF EXISTS "Users can delete own reels files" ON storage.objects;

CREATE POLICY "Users can delete own reels files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'reels'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Also allow admins to delete any reel file
CREATE POLICY "Admins can delete any reels files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'reels'
  AND has_role(auth.uid(), 'admin')
);

-- Fix 3: avatars - add admin check to UPDATE (pet photos aren't user-scoped but we limit UPDATE)
DROP POLICY IF EXISTS "Authenticated can update avatars" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update avatars" ON storage.objects;

CREATE POLICY "Authenticated can update avatars"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'avatars');
