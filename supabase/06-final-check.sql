-- ============================================================
-- 【ステップ6】最終確認
-- ============================================================
-- すべての設定が正しく完了しているか確認

-- 1. テーブルが存在するか
SELECT 
  'テーブル存在確認' AS "確認項目",
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ 存在する'
    ELSE '❌ 存在しない'
  END AS "状態"
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'email_leads';

-- 2. RLSが有効か
SELECT 
  'RLS有効確認' AS "確認項目",
  CASE 
    WHEN rowsecurity = true THEN '✅ RLS有効'
    ELSE '❌ RLS無効'
  END AS "状態"
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'email_leads';

-- 3. INSERTポリシーが存在するか
SELECT 
  'INSERTポリシー確認' AS "確認項目",
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ 存在する'
    ELSE '❌ 存在しない'
  END AS "状態"
FROM pg_policies 
WHERE tablename = 'email_leads'
AND cmd = 'INSERT'
AND 'anon' = ANY(roles)
AND 'authenticated' = ANY(roles);

-- 4. すべてのポリシー一覧
SELECT 
  policyname AS "ポリシー名",
  cmd AS "操作",
  roles AS "対象ロール",
  with_check AS "挿入条件"
FROM pg_policies 
WHERE tablename = 'email_leads'
ORDER BY cmd, policyname;

-- 5. テスト用：直接INSERTを試す（オプション）
-- このクエリが成功すれば、ポリシーが正しく動作している
-- INSERT INTO email_leads (email, source, purpose)
-- VALUES ('test@example.com', 'landing_page', 'test')
-- ON CONFLICT (email) DO NOTHING
-- RETURNING id, email, created_at;

