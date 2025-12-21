-- Riko-Log データベーススキーマ（初回実行用）
-- 新規プロジェクトで初めて実行する場合はこちらを使用してください
-- Supabase SQL Editorで実行してください

-- 1. users テーブル
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  reason TEXT NOT NULL,
  target_date TEXT,
  situation TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- RLS ポリシー（初回実行時はDROPなし）
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
CREATE TABLE IF NOT EXISTS logs (
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

CREATE INDEX IF NOT EXISTS idx_logs_user_id ON logs(user_id);
CREATE INDEX IF NOT EXISTS idx_logs_user_id_created_at ON logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_logs_user_id_category ON logs(user_id, category);
CREATE INDEX IF NOT EXISTS idx_logs_user_id_category_created_at ON logs(user_id, category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_logs_date ON logs(date);

ALTER TABLE logs ENABLE ROW LEVEL SECURITY;

-- RLS ポリシー（初回実行時はDROPなし）
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
CREATE TABLE IF NOT EXISTS premium_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_type TEXT NOT NULL CHECK (plan_type IN ('free', 'premium')),
  start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_date TIMESTAMPTZ,
  status TEXT NOT NULL CHECK (status IN ('active', 'cancelled', 'expired')) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_premium_user_id ON premium_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_premium_user_status ON premium_subscriptions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_premium_user_status_end_date ON premium_subscriptions(user_id, status, end_date DESC);

ALTER TABLE premium_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS ポリシー（初回実行時はDROPなし）
CREATE POLICY "Users can view own subscriptions"
  ON premium_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- 4. board_posts テーブル
CREATE TABLE IF NOT EXISTS board_posts (
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

CREATE INDEX IF NOT EXISTS idx_board_posts_category ON board_posts(category);
CREATE INDEX IF NOT EXISTS idx_board_posts_created_at ON board_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_board_posts_category_created_at ON board_posts(category, created_at DESC);

ALTER TABLE board_posts ENABLE ROW LEVEL SECURITY;

-- RLS ポリシー（初回実行時はDROPなし）
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
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  from_name TEXT NOT NULL DEFAULT 'Riko-Log事務局',
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_user_id_created_at ON messages(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_read ON messages(read);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- RLS ポリシー（初回実行時はDROPなし）
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



