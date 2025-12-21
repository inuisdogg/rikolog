-- ============================================================
-- 【ステップ2】email_leadsテーブルを作成
-- ============================================================
-- このSQLを実行して、テーブルを新規作成

-- テーブルを作成
CREATE TABLE email_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  source TEXT DEFAULT 'landing_page',
  purpose TEXT,
  subscribed_at TIMESTAMPTZ DEFAULT NOW(),
  notified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックスを作成（検索を高速化）
CREATE INDEX idx_email_leads_email ON email_leads(email);
CREATE INDEX idx_email_leads_subscribed_at ON email_leads(subscribed_at DESC);
CREATE INDEX idx_email_leads_notified ON email_leads(notified);

-- 確認：テーブルが作成されたか確認
SELECT 
  'テーブル作成確認' AS "確認項目",
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ 作成完了'
    ELSE '❌ 作成失敗'
  END AS "状態"
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'email_leads';


