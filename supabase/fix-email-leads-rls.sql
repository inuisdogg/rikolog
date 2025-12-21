-- email_leadsテーブルのRLSポリシーを修正・作成
-- このSQLを実行すると、誰でもメールアドレスを登録できるようになります

-- 既存のポリシーを削除（エラーが出ても無視）
DROP POLICY IF EXISTS "Anyone can insert email leads" ON email_leads;
DROP POLICY IF EXISTS "Users can view own email" ON email_leads;

-- INSERTポリシーを作成（誰でもメールアドレスを登録できる）
CREATE POLICY "Anyone can insert email leads"
  ON email_leads 
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- 確認用：ポリシーが作成されたか確認
SELECT 
  policyname,
  cmd,
  roles
FROM pg_policies 
WHERE tablename = 'email_leads';


