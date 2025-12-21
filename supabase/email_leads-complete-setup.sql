-- ============================================================
-- email_leadsテーブル 完全セットアップSQL
-- ============================================================
-- このSQLをSupabaseのSQL Editorで一度に実行してください
-- 「New query」で新規タブを作成 → このSQLを全部コピー → 貼り付け → 「Run」ボタン
-- ============================================================

-- 1. テーブルを作成
CREATE TABLE IF NOT EXISTS email_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  source TEXT DEFAULT 'landing_page',
  purpose TEXT,
  subscribed_at TIMESTAMPTZ DEFAULT NOW(),
  notified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. インデックスを作成
CREATE INDEX IF NOT EXISTS idx_email_leads_email ON email_leads(email);
CREATE INDEX IF NOT EXISTS idx_email_leads_subscribed_at ON email_leads(subscribed_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_leads_notified ON email_leads(notified);

-- 3. RLSを有効化
ALTER TABLE email_leads ENABLE ROW LEVEL SECURITY;

-- 4. 既存のポリシーを削除（エラーが出ても無視してOK）
DROP POLICY IF EXISTS "Anyone can insert email leads" ON email_leads;
DROP POLICY IF EXISTS "Users can view own email" ON email_leads;

-- 5. INSERTポリシーを作成（誰でもメールアドレスを登録できる）
CREATE POLICY "Anyone can insert email leads"
  ON email_leads 
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- 6. SELECTポリシーを作成（認証済みユーザーは自分のメールアドレスを確認できる）
CREATE POLICY "Users can view own email"
  ON email_leads 
  FOR SELECT
  TO authenticated
  USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- ============================================================
-- 実行後、以下で確認できます（オプション）
-- ============================================================
-- SELECT 
--   policyname,
--   cmd,
--   roles
-- FROM pg_policies 
-- WHERE tablename = 'email_leads';


