-- ============================================================
-- 【ステップ3】RLSを有効化
-- ============================================================
-- RLS（Row Level Security）を有効にする

-- RLSを有効化
ALTER TABLE email_leads ENABLE ROW LEVEL SECURITY;

-- 確認：RLSが有効か確認
SELECT 
  tablename AS "テーブル名",
  rowsecurity AS "RLS有効",
  CASE 
    WHEN rowsecurity = true THEN '✅ RLS有効'
    ELSE '❌ RLS無効'
  END AS "状態"
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'email_leads';


