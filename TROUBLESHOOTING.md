# 登録エラーのトラブルシューティング

## エラーが発生した場合の確認手順

### 1. ブラウザのコンソールを確認

1. ブラウザの開発者ツールを開く（F12 または 右クリック → 検証）
2. 「Console」タブを開く
3. エラーメッセージを確認

### 2. よくある原因と対処法

#### 原因1: テーブルが存在しない

**エラーメッセージ例:**
- `relation "email_leads" does not exist`
- `42P01`

**対処法:**
SupabaseのSQL Editorで以下を実行：

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

-- RLSポリシーを設定
DROP POLICY IF EXISTS "Anyone can insert email leads" ON email_leads;
CREATE POLICY "Anyone can insert email leads"
  ON email_leads FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
```

#### 原因2: purposeカラムが存在しない

**エラーメッセージ例:**
- `column "purpose" does not exist`
- `column email_leads.purpose does not exist`

**対処法:**
SupabaseのSQL Editorで以下を実行：

```sql
ALTER TABLE email_leads ADD COLUMN IF NOT EXISTS purpose TEXT;
```

#### 原因3: RLSポリシーの問題

**エラーメッセージ例:**
- `permission denied`
- `42501`
- `new row violates row-level security policy`

**対処法:**
SupabaseのSQL Editorで以下を実行：

```sql
-- 既存のポリシーを削除
DROP POLICY IF EXISTS "Anyone can insert email leads" ON email_leads;

-- 新しいポリシーを作成
CREATE POLICY "Anyone can insert email leads"
  ON email_leads FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
```

#### 原因4: 環境変数が設定されていない

**エラーメッセージ例:**
- `Missing Supabase environment variables`
- `VITE_SUPABASE_URL` または `VITE_SUPABASE_ANON_KEY` が未設定

**対処法:**
`.env` ファイルに以下を設定：

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

#### 原因5: ネットワークエラー

**エラーメッセージ例:**
- `Failed to fetch`
- `Network error`

**対処法:**
- インターネット接続を確認
- Supabaseのダッシュボードでプロジェクトが有効か確認
- ブラウザのキャッシュをクリア

## データベースの状態確認

SupabaseのSQL Editorで以下を実行して、テーブルとカラムを確認：

```sql
-- テーブルの存在確認
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'email_leads';

-- カラムの確認
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'email_leads';

-- RLSポリシーの確認
SELECT * FROM pg_policies WHERE tablename = 'email_leads';
```

## テスト用のSQL

登録が正しく動作するかテスト：

```sql
-- テストデータを直接挿入（RLSポリシーが正しく設定されているか確認）
INSERT INTO email_leads (email, source, purpose)
VALUES ('test@example.com', 'landing_page', 'moral_harassment')
ON CONFLICT (email) DO NOTHING;
```

もしこのSQLでエラーが出る場合は、RLSポリシーまたはテーブルの設定に問題があります。


