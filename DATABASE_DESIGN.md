# Riko-Log データベース設計書

## 概要

Riko-Logは、離婚を検討・準備しているユーザーが証拠を記録・管理するためのWebアプリケーションです。
現在はlocalStorageを使用していますが、実用に耐えるデータベースとしてSupabase（PostgreSQL）への移行を計画しています。

## データベース: Supabase (PostgreSQL)

### テーブル構造

#### 1. `users` テーブル

ユーザー情報を保存します。

**主キー**: `id` (UUID, Supabase AuthのUIDと連携)

**カラム**:
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  reason TEXT NOT NULL,
  target_date TEXT, -- YYYY/MM/DD形式、NULL可
  situation TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_users_email ON users(email);

-- RLS (Row Level Security)
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
```

---

#### 2. `logs` テーブル

証拠ログを保存します。

**主キー**: `id` (UUID)

**カラム**:
```sql
CREATE TABLE logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date TEXT NOT NULL, -- YYYY/MM/DD形式
  time TEXT NOT NULL, -- HH:MM形式
  category TEXT NOT NULL, -- モラハラ、暴力・DV、不貞・浮気、生活費未払い、育児放棄、通院・診断書、その他
  location TEXT NOT NULL,
  content TEXT NOT NULL,
  attachments JSONB DEFAULT '[]'::jsonb, -- [{type, name, size, storage_path?, url?}]
  medical JSONB, -- {facility, department, visitType, diagnosis, severity, proofs[], memo} または NULL
  comments JSONB DEFAULT '[]'::jsonb, -- [{id, content, created_at}]
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_logs_user_id ON logs(user_id);
CREATE INDEX idx_logs_user_id_created_at ON logs(user_id, created_at DESC);
CREATE INDEX idx_logs_user_id_category ON logs(user_id, category);
CREATE INDEX idx_logs_user_id_category_created_at ON logs(user_id, category, created_at DESC);
CREATE INDEX idx_logs_date ON logs(date);

-- RLS
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
```

---

#### 3. `premium_subscriptions` テーブル

プレミアム会員情報を保存します。

**主キー**: `id` (UUID)

**カラム**:
```sql
CREATE TABLE premium_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_type TEXT NOT NULL CHECK (plan_type IN ('free', 'premium')),
  start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_date TIMESTAMPTZ, -- NULLの場合は無期限
  status TEXT NOT NULL CHECK (status IN ('active', 'cancelled', 'expired')) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_premium_user_id ON premium_subscriptions(user_id);
CREATE INDEX idx_premium_user_status ON premium_subscriptions(user_id, status);
CREATE INDEX idx_premium_user_status_end_date ON premium_subscriptions(user_id, status, end_date DESC);

-- RLS
ALTER TABLE premium_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscriptions"
  ON premium_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- 書き込みはサーバーサイドのみ（サービスロールキーを使用）
```

---

#### 4. `board_posts` テーブル

掲示板の投稿を保存します。

**主キー**: `id` (UUID)

**カラム**:
```sql
CREATE TABLE board_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- 匿名の場合はNULL
  author TEXT NOT NULL DEFAULT '匿名',
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('question', 'consultation', 'information', 'experience', 'other')),
  reactions JSONB DEFAULT '{"like": 0, "thumbsUp": 0}'::jsonb,
  replies JSONB DEFAULT '[]'::jsonb, -- [{id, author, content, created_at}]
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_board_posts_category ON board_posts(category);
CREATE INDEX idx_board_posts_created_at ON board_posts(created_at DESC);
CREATE INDEX idx_board_posts_category_created_at ON board_posts(category, created_at DESC);

-- RLS
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
```

---

#### 5. `messages` テーブル

運営からのメッセージを保存します。

**主キー**: `id` (UUID)

**カラム**:
```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL, -- ユーザーID（UUID）または '*'（全員向け）
  from_name TEXT NOT NULL DEFAULT 'Riko-Log事務局',
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_messages_user_id ON messages(user_id);
CREATE INDEX idx_messages_user_id_created_at ON messages(user_id, created_at DESC);
CREATE INDEX idx_messages_read ON messages(read);

-- RLS
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

---

## ストレージ: Supabase Storage

### バケット構造

```
users/
  └── {userId}/
      └── profile/
          └── avatar.jpg
logs/
  └── {userId}/
      └── {logId}/
          ├── images/
          │   └── {filename}
          ├── audio/
          │   └── {filename}
          └── videos/
              └── {filename}
```

### Storage ポリシー

```sql
-- users バケット
CREATE POLICY "Users can upload own profile images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'users' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can view own profile images"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'users' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- logs バケット
CREATE POLICY "Users can upload own log attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'logs' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can view own log attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'logs' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

---

## 移行計画

### Phase 1: Supabase設定と基本実装
1. Supabaseプロジェクトの作成
2. データベーステーブルの作成（SQL実行）
3. Authenticationの設定
4. Storageバケットの作成とポリシー設定
5. RLS (Row Level Security) の設定

### Phase 2: データアクセス層の実装
1. Supabase JavaScript SDKのインストール
2. データアクセス用のユーティリティ関数の作成
   - `db/users.js` - ユーザー情報のCRUD
   - `db/logs.js` - ログのCRUD
   - `db/premium.js` - プレミアム情報の取得
   - `db/board.js` - 掲示板のCRUD
   - `db/messages.js` - メッセージのCRUD
3. localStorageとの互換性レイヤー（移行期間中）

### Phase 3: アプリケーション統合
1. App.jsxのlocalStorage呼び出しをSupabase呼び出しに置き換え
2. 認証フローの実装
3. リアルタイム更新（オプション）

### Phase 4: データ移行
1. 既存のlocalStorageデータをSupabaseに移行するスクリプト
2. ユーザーへの移行案内

---

## 必要な準備

### 1. Supabaseプロジェクトの作成
- [Supabase Dashboard](https://app.supabase.com/)でプロジェクトを作成
- プロジェクトURLとAPIキーを取得

### 2. 必要な環境変数
`.env`ファイルに以下を追加：
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 3. SQLの実行
Supabase DashboardのSQL Editorで、上記のテーブル作成SQLを実行

---

## 注意事項

1. **プライバシー**: 証拠データは非常に機密性が高いため、RLSを厳格に設定する
2. **データ整合性**: 日付形式の統一（YYYY/MM/DD）を維持
3. **パフォーマンス**: インデックスを適切に設定し、クエリを最適化
4. **リアルタイム**: Supabaseのリアルタイム機能を活用可能（オプション）
5. **バックアップ**: Supabaseは自動バックアップを提供

---

## Supabaseの利点

1. **PostgreSQL**: 強力なリレーショナルデータベース
2. **RLS**: 行レベルセキュリティで細かいアクセス制御
3. **リアルタイム**: WebSocketベースのリアルタイム更新
4. **Storage**: ファイルストレージ機能
5. **無料プラン**: 小規模アプリには十分な無料プラン
