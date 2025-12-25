-- ユーザープロフィールテーブル（将来的なユーザーページ用）
-- Supabase SQL Editorで実行してください

-- user_profiles テーブルを作成
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  
  -- 基本情報
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  birth_date DATE,
  gender TEXT CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
  
  -- 連絡先情報（任意）
  phone TEXT,
  address TEXT,
  
  -- 設定
  is_profile_public BOOLEAN DEFAULT false,
  allow_messages BOOLEAN DEFAULT true,
  
  -- メタデータ
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_public ON user_profiles(is_profile_public) WHERE is_profile_public = true;

-- RLSを有効化
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- RLSポリシー
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view public profiles" ON user_profiles;
CREATE POLICY "Users can view public profiles"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (is_profile_public = true);

DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- コメント
COMMENT ON TABLE user_profiles IS 'ユーザープロフィール情報（将来的なユーザーページ用）';
COMMENT ON COLUMN user_profiles.user_id IS 'usersテーブルへの外部キー（1対1の関係）';
COMMENT ON COLUMN user_profiles.is_profile_public IS 'プロフィールを公開するかどうか';

