# Supabaseでユーザーを削除する方法

動作確認のために作成したテストユーザーを削除する手順です。

## 方法1: Supabaseダッシュボードから削除（推奨）

### ステップ1: Authenticationページを開く
1. https://supabase.com/dashboard にアクセス
2. ログイン
3. プロジェクト（Riko-Log）を選択
4. 左メニュー → **「Authentication」** をクリック
5. **「Users」** タブをクリック

### ステップ2: ユーザーを検索
1. 検索ボックスに削除したいメールアドレスを入力
2. 該当するユーザーを探す

### ステップ3: ユーザーを削除
1. 削除したいユーザーの行をクリック（または右側の「...」メニューをクリック）
2. **「Delete user」** をクリック
3. 確認ダイアログで **「Delete」** をクリック

### ステップ4: 関連データも削除（オプション）
ユーザーを削除した後、以下のテーブルからも関連データを削除することをお勧めします：

1. **「Table Editor」** を開く
2. 以下のテーブルから該当ユーザーのデータを削除：
   - `users` テーブル（user_idで検索）
   - `premium_subscriptions` テーブル（user_idで検索）
   - `logs` テーブル（user_idで検索）
   - `email_leads` テーブル（emailで検索）

## 方法2: SQL Editorから削除

### ステップ1: SQL Editorを開く
1. Supabaseダッシュボード → **「SQL Editor」** をクリック
2. **「New query」** をクリック

### ステップ2: 削除SQLを実行
以下のSQLを実行（`your-email@example.com` を実際のメールアドレスに置き換える）：

```sql
-- 1. ユーザーIDを取得
SELECT id FROM auth.users WHERE email = 'your-email@example.com';

-- 2. 取得したユーザーIDを使って、関連データを削除
-- （上記で取得したユーザーIDを 'user-id-here' に置き換える）

-- usersテーブルから削除
DELETE FROM users WHERE id = 'user-id-here';

-- premium_subscriptionsテーブルから削除
DELETE FROM premium_subscriptions WHERE user_id = 'user-id-here';

-- logsテーブルから削除
DELETE FROM logs WHERE user_id = 'user-id-here';

-- email_leadsテーブルから削除
DELETE FROM email_leads WHERE email = 'your-email@example.com';

-- 最後に、auth.usersから削除（これが実際のユーザー削除）
DELETE FROM auth.users WHERE email = 'your-email@example.com';
```

### 注意事項
- `auth.users` テーブルから削除すると、そのユーザーは完全に削除されます
- 関連データを先に削除してから、最後に `auth.users` から削除することをお勧めします
- 削除は元に戻せないので、注意してください

## 方法3: 一括削除（複数のテストユーザーを削除する場合）

```sql
-- 特定のドメインのテストユーザーを一括削除する例
-- （例: @example.com で終わるメールアドレスのユーザーを削除）

-- 1. 関連データを削除
DELETE FROM users 
WHERE id IN (
  SELECT id FROM auth.users 
  WHERE email LIKE '%@example.com'
);

DELETE FROM premium_subscriptions 
WHERE user_id IN (
  SELECT id FROM auth.users 
  WHERE email LIKE '%@example.com'
);

DELETE FROM logs 
WHERE user_id IN (
  SELECT id FROM auth.users 
  WHERE email LIKE '%@example.com'
);

DELETE FROM email_leads 
WHERE email LIKE '%@example.com';

-- 2. ユーザーを削除
DELETE FROM auth.users 
WHERE email LIKE '%@example.com';
```

## よくある質問

**Q: ユーザーを削除すると、関連データも自動的に削除されますか？**
A: いいえ。`auth.users` からユーザーを削除しても、他のテーブル（`users`, `logs` など）のデータは残ります。必要に応じて手動で削除してください。

**Q: 削除したユーザーを復元できますか？**
A: いいえ。削除は元に戻せません。必要に応じて、再度登録してください。

**Q: テスト用のユーザーを簡単に削除する方法はありますか？**
A: テスト用のメールアドレスに特定のパターン（例: `test-` で始まる）を使い、SQLで一括削除することをお勧めします。

