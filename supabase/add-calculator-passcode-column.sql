-- usersテーブルに電卓パスコードカラムを追加
-- Supabase SQL Editorで実行してください

-- calculator_passcodeカラムを追加（デフォルト値は'7777'）
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS calculator_passcode TEXT DEFAULT '7777';

-- 既存のユーザーにもデフォルト値を設定
UPDATE users 
SET calculator_passcode = '7777' 
WHERE calculator_passcode IS NULL;

-- コメントを追加
COMMENT ON COLUMN users.calculator_passcode IS '電卓パスコード（ユーザーが変更可能）';

