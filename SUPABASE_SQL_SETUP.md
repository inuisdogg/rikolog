# Supabase SQL Editor セットアップガイド

## SQL Editorの使い方

### 基本的な手順

1. **Supabaseダッシュボードにログイン**
   - https://supabase.com/dashboard にアクセス
   - プロジェクトを選択

2. **SQL Editorを開く**
   - 左メニューの「SQL Editor」をクリック
   - または、上部の「SQL Editor」タブをクリック

3. **新しいクエリを作成**
   - 「New query」ボタンをクリック
   - または、既存のクエリタブをクリックして編集

4. **SQLを貼り付けて実行**
   - SQLコードを貼り付け
   - 右下の「Run」ボタン（または `⌘↩` / `Ctrl+Enter`）をクリック
   - 結果が下部に表示されます

## 今回必要なSQLの実行手順

### 方法1: 一度に全部実行（推奨）

1. SQL Editorで「New query」をクリック
2. 以下のSQLを**全部コピー**して貼り付け：

```sql
-- email_leadsテーブルを作成
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

-- インデックスを作成
CREATE INDEX IF NOT EXISTS idx_email_leads_email ON email_leads(email);
CREATE INDEX IF NOT EXISTS idx_email_leads_subscribed_at ON email_leads(subscribed_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_leads_notified ON email_leads(notified);

-- RLSを有効化
ALTER TABLE email_leads ENABLE ROW LEVEL SECURITY;

-- 既存のポリシーを削除（エラーが出ても無視）
DROP POLICY IF EXISTS "Anyone can insert email leads" ON email_leads;
DROP POLICY IF EXISTS "Users can view own email" ON email_leads;

-- INSERTポリシーを作成（誰でもメールアドレスを登録できる）
CREATE POLICY "Anyone can insert email leads"
  ON email_leads 
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- 認証済みユーザーは自分のメールアドレスを確認できる（オプション）
CREATE POLICY "Users can view own email"
  ON email_leads 
  FOR SELECT
  TO authenticated
  USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );
```

3. 「Run」ボタンをクリック
4. 「Success. No rows returned」と表示されれば成功

### 方法2: 既にテーブルを作成済みの場合

もし既にテーブルを作成している場合は、**RLSポリシーだけ**を実行：

```sql
-- 既存のポリシーを削除（エラーが出ても無視）
DROP POLICY IF EXISTS "Anyone can insert email leads" ON email_leads;
DROP POLICY IF EXISTS "Users can view own email" ON email_leads;

-- INSERTポリシーを作成（誰でもメールアドレスを登録できる）
CREATE POLICY "Anyone can insert email leads"
  ON email_leads 
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
```

## SQLコードが増えていくことについて

### 現状の理解

- **SQL Editorのタブ**: 一時的な作業スペース（保存はされるが、主に作業用）
- **プロジェクト内のSQLファイル**: コードベースに保存されている管理用ファイル

### 推奨される管理方法

1. **SQL Editorでの実行**: 
   - 実際にデータベースに適用するための実行場所
   - タブは残しておいても問題ありません（履歴として残る）

2. **プロジェクト内のSQLファイル**:
   - `supabase/email_leads.sql` など、コードベースに保存
   - バージョン管理（Git）で管理
   - 他の開発者や将来の自分が見返すためのドキュメント

### ベストプラクティス

- **初回セットアップ時**: `supabase/email_leads.sql` の内容をSQL Editorで実行
- **修正が必要な場合**: 
  1. プロジェクト内のSQLファイルを更新
  2. 修正したSQLをSQL Editorで実行
  3. 動作確認

### SQL Editorのタブ管理

- **タブは削除可能**: 不要なタブは「×」で閉じられます
- **タブは保存される**: 同じプロジェクトにログインすれば、以前のタブが残っています
- **整理方法**: 
  - タブに名前を付ける（例: "email_leads setup"）
  - 不要なタブは削除
  - 重要なSQLはプロジェクト内のファイルに保存

## トラブルシューティング

### エラーが出た場合

1. **「relation "email_leads" does not exist」**
   - テーブルがまだ作成されていません
   - 方法1のSQLを最初から実行してください

2. **「policy "Anyone can insert email leads" already exists」**
   - 既にポリシーが存在します
   - `DROP POLICY IF EXISTS` を使っているので、エラーは無視して大丈夫です
   - または、`DROP POLICY` を先に実行してから `CREATE POLICY` を実行

3. **「permission denied」**
   - 実行ユーザー（Role）を確認
   - 通常は「postgres」または「service_role」で実行してください

## 確認方法

SQL Editorで以下を実行して、正しく設定されているか確認：

```sql
-- テーブルが存在するか確認
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'email_leads';

-- RLSポリシーが存在するか確認
SELECT 
  policyname,
  cmd,
  roles
FROM pg_policies 
WHERE tablename = 'email_leads';
```

これで、テーブルとポリシーが正しく作成されているか確認できます。

