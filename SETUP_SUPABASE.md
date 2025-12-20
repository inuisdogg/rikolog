# Supabase セットアップ手順

## 1. Supabaseプロジェクトの作成

1. [Supabase Dashboard](https://app.supabase.com/) にアクセス
2. 「New Project」をクリック
3. 組織を選択（初回は組織を作成）
4. プロジェクト情報を入力：
   - **Name**: プロジェクト名（例: `riko-log`）
   - **Database Password**: 強力なパスワードを設定（忘れないように保存）
   - **Region**: 最寄りのリージョンを選択（例: `Northeast Asia (Tokyo)`）
5. 「Create new project」をクリック
6. プロジェクトの作成完了を待つ（1-2分）

## 2. プロジェクト設定の確認

1. プロジェクトが作成されたら、プロジェクトを開く
2. 左サイドバーの「Settings」→「API」を開く
3. 以下の情報をコピー：
   - **Project URL**（例: `https://xxxxx.supabase.co`）
   - **anon public** キー（`service_role`キーは使用しない）

## 3. 環境変数の設定

プロジェクトルートに `.env` ファイルを作成し、以下の形式で設定値を記入してください：

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**重要**: `.env` ファイルは `.gitignore` に追加してください（機密情報を含むため）

## 4. データベーステーブルの作成

1. Supabase Dashboardで「SQL Editor」を開く
2. 以下のSQLをコピー＆ペーストして実行：

```sql
-- 1. users テーブル
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  reason TEXT NOT NULL,
  target_date TEXT,
  situation TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own data"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own data"
  ON users FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own data"
  ON users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 2. logs テーブル
CREATE TABLE logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  category TEXT NOT NULL,
  location TEXT NOT NULL,
  content TEXT NOT NULL,
  attachments JSONB DEFAULT '[]'::jsonb,
  medical JSONB,
  comments JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_logs_user_id ON logs(user_id);
CREATE INDEX idx_logs_user_id_created_at ON logs(user_id, created_at DESC);
CREATE INDEX idx_logs_user_id_category ON logs(user_id, category);
CREATE INDEX idx_logs_user_id_category_created_at ON logs(user_id, category, created_at DESC);
CREATE INDEX idx_logs_date ON logs(date);

ALTER TABLE logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own logs"
  ON logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own logs"
  ON logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own logs"
  ON logs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own logs"
  ON logs FOR DELETE
  USING (auth.uid() = user_id);

-- 3. premium_subscriptions テーブル
CREATE TABLE premium_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_type TEXT NOT NULL CHECK (plan_type IN ('free', 'premium')),
  start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_date TIMESTAMPTZ,
  status TEXT NOT NULL CHECK (status IN ('active', 'cancelled', 'expired')) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_premium_user_id ON premium_subscriptions(user_id);
CREATE INDEX idx_premium_user_status ON premium_subscriptions(user_id, status);
CREATE INDEX idx_premium_user_status_end_date ON premium_subscriptions(user_id, status, end_date DESC);

ALTER TABLE premium_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscriptions"
  ON premium_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- 4. board_posts テーブル
CREATE TABLE board_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  author TEXT NOT NULL DEFAULT '匿名',
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('question', 'consultation', 'information', 'experience', 'other')),
  reactions JSONB DEFAULT '{"like": 0, "thumbsUp": 0}'::jsonb,
  replies JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_board_posts_category ON board_posts(category);
CREATE INDEX idx_board_posts_created_at ON board_posts(created_at DESC);
CREATE INDEX idx_board_posts_category_created_at ON board_posts(category, created_at DESC);

ALTER TABLE board_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view posts"
  ON board_posts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create posts"
  ON board_posts FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update own posts"
  ON board_posts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own posts"
  ON board_posts FOR DELETE
  USING (auth.uid() = user_id);

-- 5. messages テーブル
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  from_name TEXT NOT NULL DEFAULT 'Riko-Log事務局',
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_user_id ON messages(user_id);
CREATE INDEX idx_messages_user_id_created_at ON messages(user_id, created_at DESC);
CREATE INDEX idx_messages_read ON messages(read);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own messages"
  ON messages FOR SELECT
  USING (
    auth.uid()::text = user_id OR 
    user_id = '*'
  );

CREATE POLICY "Users can update own messages"
  ON messages FOR UPDATE
  USING (
    auth.uid()::text = user_id OR 
    user_id = '*'
  );
```

3. 「Run」ボタンをクリックして実行
4. 成功メッセージが表示されることを確認

## 5. Authenticationの設定

1. 左サイドバーの「Authentication」を開く
2. 「Providers」タブで「Email」を有効化：
   - 「Enable Email provider」をONにする
   - 「Confirm email」は開発中はOFFでもOK（本番環境ではON推奨）
3. 「Save」をクリック

## 6. Storageバケットの作成（オプション、後でメディアアップロード用）

1. 左サイドバーの「Storage」を開く
2. 「Create a new bucket」をクリック
3. バケット名を入力：
   - `users` - プロフィール画像用
   - `logs` - ログの添付ファイル用
4. 「Public bucket」はOFF（プライベート）を選択
5. 「Create bucket」をクリック

### Storage ポリシーの設定

各バケットの「Policies」タブで以下を設定：

**users バケット**:
```sql
-- アップロードポリシー
CREATE POLICY "Users can upload own profile images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'users' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- 閲覧ポリシー
CREATE POLICY "Users can view own profile images"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'users' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

**logs バケット**:
```sql
-- アップロードポリシー
CREATE POLICY "Users can upload own log attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'logs' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- 閲覧ポリシー
CREATE POLICY "Users can view own log attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'logs' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

## 7. パッケージのインストール

プロジェクトルートで以下のコマンドを実行：

```bash
npm install
```

これにより、`package.json`に追加した`@supabase/supabase-js`パッケージがインストールされます。

## 8. 動作確認

1. 開発サーバーを起動：
   ```bash
   npm run dev
   ```

2. ブラウザでアプリを開く

3. コンソールでエラーがないか確認

4. 新規登録を試して、Supabaseにデータが保存されるか確認

## トラブルシューティング

### エラー: "Missing Supabase environment variables"
- `.env`ファイルが正しく作成されているか確認
- 環境変数名が`VITE_`で始まっているか確認（Viteの要件）
- 開発サーバーを再起動

### エラー: "new row violates row-level security policy"
- RLS (Row Level Security) ポリシーが正しく設定されているか確認
- ユーザーが認証されているか確認
- SQL Editorでポリシーを再実行

### エラー: "relation does not exist"
- テーブルが正しく作成されているか確認
- SQL Editorでテーブル一覧を確認: `SELECT * FROM information_schema.tables WHERE table_schema = 'public';`

### エラー: "duplicate key value violates unique constraint"
- 既にデータが存在する場合、テーブルを削除して再作成するか、既存データを確認

## 次のステップ

セットアップが完了したら、`DATABASE_DESIGN.md`を参照して、アプリケーションコードの統合を進めてください。


