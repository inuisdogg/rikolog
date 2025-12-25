-- 電卓パスコード設定の確認・追加用SQL
-- Supabase SQL Editorで実行してください

-- ステップ1: calculator_passcodeカラムが存在しない場合は追加
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'users' 
      AND column_name = 'calculator_passcode'
  ) THEN
    -- カラムを追加
    ALTER TABLE users 
    ADD COLUMN calculator_passcode TEXT DEFAULT '7777';
    
    -- 既存のユーザーにもデフォルト値を設定
    UPDATE users 
    SET calculator_passcode = '7777' 
    WHERE calculator_passcode IS NULL;
    
    -- コメントを追加
    COMMENT ON COLUMN users.calculator_passcode IS '電卓パスコード（ユーザーが変更可能）';
    
    RAISE NOTICE 'calculator_passcodeカラムを追加しました';
  ELSE
    RAISE NOTICE 'calculator_passcodeカラムは既に存在します';
  END IF;
END $$;

-- ステップ2: calculator_passcodeカラムの存在確認
SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'users' 
  AND column_name = 'calculator_passcode';

-- ステップ3: RLSポリシーの確認
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'users' 
  AND policyname LIKE '%update%';

-- ステップ4: 現在のユーザーのパスコード確認（ログイン中のユーザーのみ）
SELECT 
  id,
  email,
  calculator_passcode,
  created_at
FROM users
WHERE id = auth.uid();

