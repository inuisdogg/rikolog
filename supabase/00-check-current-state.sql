-- ============================================================
-- 【ステップ0】現在の状態を確認
-- ============================================================
-- まずこれを実行して、現在の状態を確認してください

-- 1. email_leadsテーブルが存在するか確認
SELECT 
  table_name AS "テーブル名",
  CASE 
    WHEN table_name = 'email_leads' THEN '✅ 存在する'
    ELSE '❌ 存在しない'
  END AS "状態"
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'email_leads';

-- 2. RLSが有効か確認
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

-- 3. 現在のポリシーを確認
SELECT 
  policyname AS "ポリシー名",
  cmd AS "操作",
  roles AS "対象ロール",
  with_check AS "挿入条件"
FROM pg_policies 
WHERE tablename = 'email_leads';

-- 4. テーブルの構造を確認
SELECT 
  column_name AS "カラム名",
  data_type AS "データ型",
  is_nullable AS "NULL許可"
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'email_leads'
ORDER BY ordinal_position;

