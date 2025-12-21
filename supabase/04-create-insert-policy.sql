-- ============================================================
-- 【ステップ4】INSERTポリシーを作成（最重要）
-- ============================================================
-- 誰でも（ログインしていなくても）メールアドレスを登録できるようにする

-- INSERTポリシーを作成
CREATE POLICY "Anyone can insert email leads"
  ON email_leads
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- 確認：ポリシーが作成されたか確認
SELECT 
  policyname AS "ポリシー名",
  cmd AS "操作",
  roles AS "対象ロール",
  with_check AS "挿入条件",
  CASE 
    WHEN policyname = 'Anyone can insert email leads' 
     AND cmd = 'INSERT' 
     AND roles = '{anon,authenticated}' 
     AND with_check = 'true' THEN '✅ 正しく設定されている'
    ELSE '❌ 設定が正しくない'
  END AS "状態"
FROM pg_policies 
WHERE tablename = 'email_leads'
AND policyname = 'Anyone can insert email leads';


