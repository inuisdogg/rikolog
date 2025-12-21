-- ============================================================
-- 【ステップ5】SELECTポリシーを作成（オプション）
-- ============================================================
-- 認証済みユーザーは自分のメールアドレスを確認できるようにする
-- （ランディングページでは不要ですが、将来のために設定）

-- SELECTポリシーを作成
CREATE POLICY "Users can view own email"
  ON email_leads
  FOR SELECT
  TO authenticated
  USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- 確認：ポリシーが作成されたか確認
SELECT 
  policyname AS "ポリシー名",
  cmd AS "操作",
  roles AS "対象ロール"
FROM pg_policies 
WHERE tablename = 'email_leads'
AND policyname = 'Users can view own email';

