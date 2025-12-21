-- メールアドレス収集用テーブル
-- ランディングページからのメールアドレス登録用

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

CREATE INDEX IF NOT EXISTS idx_email_leads_email ON email_leads(email);
CREATE INDEX IF NOT EXISTS idx_email_leads_subscribed_at ON email_leads(subscribed_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_leads_notified ON email_leads(notified);

-- RLS ポリシー（誰でもメールアドレスを登録できるが、管理者のみ閲覧可能）
ALTER TABLE email_leads ENABLE ROW LEVEL SECURITY;

-- 誰でもメールアドレスを登録できる
DROP POLICY IF EXISTS "Anyone can insert email leads" ON email_leads;
CREATE POLICY "Anyone can insert email leads"
  ON email_leads FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- 認証済みユーザーは自分のメールアドレスを確認できる（オプション）
DROP POLICY IF EXISTS "Users can view own email" ON email_leads;
CREATE POLICY "Users can view own email"
  ON email_leads FOR SELECT
  TO authenticated
  USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- 既存のテーブルにpurposeカラムを追加する場合（テーブルが既に存在する場合）
-- ALTER TABLE email_leads ADD COLUMN IF NOT EXISTS purpose TEXT;

