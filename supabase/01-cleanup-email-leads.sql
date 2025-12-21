-- ============================================================
-- 【ステップ1】完全にクリーンアップ
-- ============================================================
-- 既存のemail_leadsテーブルとポリシーを完全に削除
-- エラーが出ても無視してOK（存在しない場合はエラーになる）

-- 1. すべてのポリシーを削除
DROP POLICY IF EXISTS "Anyone can insert email leads" ON email_leads;
DROP POLICY IF EXISTS "Users can view own email" ON email_leads;
DROP POLICY IF EXISTS "anon can insert" ON email_leads;
DROP POLICY IF EXISTS "authenticated can insert" ON email_leads;

-- 2. テーブルを削除（データもすべて消えます）
DROP TABLE IF EXISTS email_leads CASCADE;

-- 3. 確認：何も残っていないことを確認
SELECT 
  'テーブル削除確認' AS "確認項目",
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ 削除完了'
    ELSE '❌ まだ存在する'
  END AS "状態"
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'email_leads';


