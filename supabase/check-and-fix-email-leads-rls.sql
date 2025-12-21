-- ============================================================
-- email_leadsテーブルのRLSポリシー確認と修正
-- ============================================================
-- このSQLをSupabaseのSQL Editorで実行してください
-- ============================================================

-- 1. 現在のポリシーを確認
SELECT 
  policyname,
  cmd,
  roles,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'email_leads';

-- 2. 既存のポリシーをすべて削除（エラーが出ても無視）
DROP POLICY IF EXISTS "Anyone can insert email leads" ON email_leads;
DROP POLICY IF EXISTS "Users can view own email" ON email_leads;
DROP POLICY IF EXISTS "anon can insert" ON email_leads;
DROP POLICY IF EXISTS "authenticated can insert" ON email_leads;

-- 3. RLSが有効か確認
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'email_leads';

-- 4. RLSを確実に有効化
ALTER TABLE email_leads ENABLE ROW LEVEL SECURITY;

-- 5. INSERTポリシーを作成（anonとauthenticatedの両方に許可）
-- 重要: WITH CHECK (true) で誰でもINSERTできるようにする
CREATE POLICY "Anyone can insert email leads"
  ON email_leads 
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- 6. 再度ポリシーを確認
SELECT 
  policyname,
  cmd,
  roles,
  with_check
FROM pg_policies 
WHERE tablename = 'email_leads';


