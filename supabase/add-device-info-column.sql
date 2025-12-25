-- usersテーブルにデバイス情報カラムを追加
-- Supabase SQL Editorで実行してください

-- device_typeカラムを追加（iPhone, Android, Desktop, Tabletなど）
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS device_type TEXT;

-- device_infoカラムを追加（User Agentやその他のデバイス情報をJSON形式で保存）
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS device_info JSONB DEFAULT '{}'::jsonb;

-- 既存のユーザーにはnullのまま（後で更新可能）

-- コメントを追加
COMMENT ON COLUMN users.device_type IS 'デバイスタイプ（iPhone, Android, Desktop, Tabletなど）';
COMMENT ON COLUMN users.device_info IS 'デバイス情報（User Agent、OS、ブラウザなど）';

-- インデックスを追加（デバイスタイプで検索する場合）
CREATE INDEX IF NOT EXISTS idx_users_device_type ON users(device_type);

