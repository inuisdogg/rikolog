-- email_leadsテーブルのRLSポリシーを確認

-- 1. テーブルが存在するか確認
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'email_leads';

-- 2. RLSが有効か確認
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'email_leads';

-- 3. 現在のRLSポリシーを確認
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'email_leads';


