# RLSポリシー設定ガイド

## 今回の目的

`email_leads`テーブルに「誰でも（ログインしていなくても）メールアドレスを登録できる」というRLSポリシーを設定する。

## 手順

### 1. Supabaseダッシュボードを開く
- https://supabase.com/dashboard にアクセス
- プロジェクトを選択

### 2. SQLエディタを開く
- 左メニューの「SQL Editor」をクリック
- 「New query」ボタンをクリック（新しいタブが開く）

### 3. SQLを貼り付けて実行
- `supabase/setup-email-leads-rls-step-by-step.sql` の内容を**全部コピー**
- SQLエディタに**貼り付け**
- 右下の「Run」ボタン（または `⌘↩` / `Ctrl+Enter`）をクリック

### 4. 結果を確認
- 「Success. No rows returned」または結果テーブルが表示されれば成功
- ステップ5の結果に `"Anyone can insert email leads"` が表示されていればOK

## 各ステップの説明

### ステップ1: 現在の状態を確認
```sql
SELECT policyname, cmd, roles, with_check
FROM pg_policies 
WHERE tablename = 'email_leads';
```
**目的**: 既存のポリシーがあるか確認。空ならポリシーが存在しない。

### ステップ2: 既存のポリシーを削除
```sql
DROP POLICY IF EXISTS "Anyone can insert email leads" ON email_leads;
```
**目的**: 古いポリシーが残っていると干渉する可能性があるため、一度削除。

### ステップ3: RLSを有効化
```sql
ALTER TABLE email_leads ENABLE ROW LEVEL SECURITY;
```
**目的**: テーブルにRLS（Row Level Security）を有効にする。これがないとポリシーが機能しない。

### ステップ4: INSERTポリシーを作成
```sql
CREATE POLICY "Anyone can insert email leads"
  ON email_leads
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
```
**目的**: 
- `FOR INSERT`: INSERT（データ追加）操作に対して
- `TO anon, authenticated`: 匿名ユーザー（anon）とログインユーザー（authenticated）に許可
- `WITH CHECK (true)`: 条件なし（誰でもOK）

### ステップ5: 確認
```sql
SELECT policyname, cmd, roles, with_check
FROM pg_policies 
WHERE tablename = 'email_leads';
```
**目的**: ポリシーが正しく作成されたか確認。

## トラブルシューティング

### エラー: "relation email_leads does not exist"
→ テーブルがまだ作成されていません。先に `supabase/email_leads-complete-setup.sql` を実行してください。

### エラー: "permission denied"
→ SQLエディタの右下で「Role」が「postgres」になっているか確認してください。

### ポリシーが作成されてもエラーが出る
→ ブラウザをリロード（`Cmd+Shift+R` / `Ctrl+Shift+R`）して、再度登録を試してください。

## なぜこれが必要か

Supabaseは初期設定では非常に厳しく、「明示的に許可された操作」以外はすべてブロックします。

- RLSが有効なテーブルでは、**ポリシーがないと何もできない**
- `email_leads`テーブルは誰でも登録できる必要があるため、`anon`（匿名ユーザー）にもINSERTを許可する必要がある
- `WITH CHECK (true)` で「条件なしでOK」と明示する

## 実行後の確認

1. ブラウザをリロード
2. ランディングページでメールアドレスを入力
3. 「登録する」をクリック
4. 成功すれば、エラーが出ずに「登録完了」と表示される

