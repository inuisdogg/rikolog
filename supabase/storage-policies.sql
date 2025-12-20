-- Supabase Storage ポリシー
-- Storageバケット作成後に実行してください

-- users バケットのポリシー
CREATE POLICY IF NOT EXISTS "Users can upload own profile images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'users' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY IF NOT EXISTS "Users can view own profile images"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'users' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY IF NOT EXISTS "Users can delete own profile images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'users' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- logs バケットのポリシー
CREATE POLICY IF NOT EXISTS "Users can upload own log attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'logs' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY IF NOT EXISTS "Users can view own log attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'logs' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY IF NOT EXISTS "Users can delete own log attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'logs' AND
  (storage.foldername(name))[1] = auth.uid()::text
);


