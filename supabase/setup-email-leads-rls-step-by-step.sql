-- ============================================================
-- email_leadsテーブルのRLSポリシー設定（ステップバイステップ）
-- ============================================================
-- このSQLをSupabaseの「SQLエディタ」で実行してください
-- ============================================================

-- 【ステップ1】現在の状態を確認
-- このクエリを実行して、email_leadsテーブルにどんなポリシーがあるか確認
SELECT 
  policyname AS "ポリシー名",
  cmd AS "操作",
  roles AS "対象ロール",
  with_check AS "挿入条件"
FROM pg_policies 
WHERE tablename = 'email_leads';

-- 【ステップ2】既存のポリシーを削除（エラーが出ても無視してOK）
-- 古いポリシーが残っていると干渉する可能性があるため、一度削除
DROP POLICY IF EXISTS "Anyone can insert email leads" ON email_leads;
DROP POLICY IF EXISTS "Users can view own email" ON email_leads;

-- 【ステップ3】RLSを確実に有効化
-- テーブルにRLS（Row Level Security）を有効にする
ALTER TABLE email_leads ENABLE ROW LEVEL SECURITY;

-- 【ステップ4】INSERTポリシーを作成
-- 「誰でも（ログインしていなくても）メールアドレスを登録できる」というルール
CREATE POLICY "Anyone can insert email leads"
  ON email_leads                    -- email_leadsテーブルに対して
  FOR INSERT                        -- INSERT（データを追加する）操作を
  TO anon, authenticated            -- 匿名ユーザー（anon）とログインユーザー（authenticated）に許可
  WITH CHECK (true);                -- 条件なし（誰でもOK）

-- 【ステップ5】確認
-- 再度ポリシーを確認して、正しく作成されたかチェック
SELECT 
  policyname AS "ポリシー名",
  cmd AS "操作",
  roles AS "対象ロール",
  with_check AS "挿入条件"
FROM pg_policies 
WHERE tablename = 'email_leads';

-- ============================================================
-- 実行後の確認ポイント
-- ============================================================
-- ステップ5の結果に以下が表示されていれば成功：
-- ポリシー名: "Anyone can insert email leads"
-- 操作: "INSERT"
-- 対象ロール: "{anon,authenticated}"
-- 挿入条件: "true"
-- ============================================================

