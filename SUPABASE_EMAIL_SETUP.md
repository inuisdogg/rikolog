# Supabase メール確認設定

## 問題

- 新規登録時にメールが届かない
- FaceIDログインが使えない（セッションが見つからない）

## 原因

Supabaseのメール確認機能が有効になっているため、新規登録時にメール確認が必要になり、セッションが確立されません。

## 解決方法：メール確認を無効化（開発中）

### 手順

1. [Supabase Dashboard](https://app.supabase.com/) にアクセス
2. プロジェクトを選択
3. 左サイドバーの **Authentication** を開く
4. **Providers** タブを選択
5. **Email** プロバイダーを開く
6. **"Confirm email"** のトグルスイッチを **OFF** にする
7. **Save** をクリック

### 設定後の動作

- 新規登録時にメール確認が不要になります
- `signUp()`直後にセッションが確立されます
- FaceIDログインが使用可能になります

## 本番環境での設定

本番環境では、セキュリティのためメール確認を有効化することを推奨します。

### メール確認を有効化する場合

1. 上記の手順で **"Confirm email"** を **ON** にする
2. ユーザーは登録後にメール内のリンクをクリックして確認する必要があります
3. 確認後、ログインできるようになります

### メールの送信者名を変更する（「リコログ」に設定）

Supabaseから送信されるメールの送信者名を「リコログ」に変更する方法は2つあります。

#### 方法1: メールテンプレートで送信者名を変更（簡単・推奨）

1. [Supabase Dashboard](https://app.supabase.com/) にアクセス
2. プロジェクトを選択
3. 左サイドバーの **Authentication** → **Emails** を開く
4. **Email Templates** タブを選択
5. 変更したいテンプレート（例：**Password Reset**、**Confirm signup**）を選択
6. テンプレート内の送信者名を変更：
   - デフォルト: `{{ .SiteName }}` または `Supabase`
   - 変更後: `リコログ`
7. **Save** をクリック

**注意：**
- この方法では、メールアドレスはSupabaseのデフォルト（`noreply@mail.app.supabase.io`など）のままです
- 送信者名のみが「リコログ」に変更されます

#### 方法2: カスタムSMTPを設定（本番環境推奨）

独自ドメインを使用して、よりプロフェッショナルなメールを送信する方法です。

**Resendを使用する場合（推奨）:**

1. **Resendアカウントの作成**
   - [Resend](https://resend.com/) にアカウントを作成
   - 無料プランで月10,000通まで送信可能

2. **ドメインの設定（オプション）**
   - Resendのダッシュボードで「Domains」セクションに移動
   - 独自ドメインを追加（例：`rikolog.com`）
   - DNSレコードを設定してドメインの所有権を確認
   - **注意：** ドメインがなくても、Resendのデフォルトドメイン（`onboarding.resend.dev`）を使用できます

3. **APIキーの作成**
   - Resendのダッシュボードで「API Keys」セクションに移動
   - 新しいAPIキーを作成（「Sending access」を選択）

4. **SupabaseでカスタムSMTPを設定**
   - Supabase Dashboard → **Authentication** → **Emails** → **SMTP Settings** を開く
   - **Enable Custom SMTP** をオンにする
   - 以下の情報を入力：
     - **Sender email**: `[email protected]` または `[email protected]`（Resendのデフォルトドメインを使用する場合）
     - **Sender name**: `リコログ`
     - **Host**: `smtp.resend.com`
     - **Port number**: `465` または `587`
     - **Username**: `resend`
     - **Password**: Resendで作成したAPIキー
   - **Save** をクリック

**その他のSMTPプロバイダー:**
- **SendGrid**: Host: `smtp.sendgrid.net`, Port: `587`
- **Mailgun**: Host: `smtp.mailgun.org`, Port: `587`
- **AWS SES**: リージョンに応じたSMTPエンドポイントを使用

### SMTP設定（本番環境推奨）

Supabaseのデフォルトメールサービスにはレート制限があります。本番環境では、カスタムSMTPを設定することを推奨します。

1. **Authentication** → **Emails** → **SMTP Settings** を開く
2. SMTPプロバイダー（Resend、SendGrid、Mailgun、AWS SESなど）の設定を入力
3. **Save** をクリック

## トラブルシューティング

### メールが届かない場合

1. **スパムフォルダを確認**
2. **メールアドレスが正しいか確認**
3. **Supabase Dashboard** → **Authentication** → **Users** でユーザーが作成されているか確認
4. **メール確認が有効になっているか確認**（開発中は無効化推奨）

### FaceIDログインが使えない場合

1. **メール確認を無効化**（上記手順参照）
2. **一度フォームからログイン**してセッションを確立
3. **その後、FaceIDログインが使用可能**になります

### "Invalid login credentials" エラーが表示される場合

メール確認を無効化した後でも、既存のユーザーが確認済み状態になっていない場合があります。

#### 解決方法1: 既存ユーザーを確認済みにする（推奨）

1. [Supabase Dashboard](https://app.supabase.com/) にアクセス
2. プロジェクトを選択
3. 左サイドバーの **Authentication** → **Users** を開く
4. 該当するユーザーを探す（メールアドレスで検索可能）
5. ユーザーをクリックして詳細を開く
6. **"Email Confirmed"** のチェックボックスを **ON** にする
7. **Save** をクリック
8. 再度ログインを試す

#### 解決方法2: 新規ユーザーで登録し直す

1. 別のメールアドレスで新規登録する
2. または、既存のユーザーを削除してから同じメールアドレスで再登録する

#### 解決方法3: パスワードをリセットする（アプリから）

アプリにパスワードリセット機能が実装されています。

1. ログイン画面で **"パスワードを忘れた場合"** をクリック
2. 登録されているメールアドレスを入力
3. **"リセットメールを送信"** をクリック
4. メールアドレスに送信されたリンクをクリック
5. 新しいパスワードを設定
6. 新しいパスワードでログイン

**重要：Supabase DashboardでのリダイレクトURL設定**

パスワードリセット機能を使用するには、Supabase DashboardでリダイレクトURLを設定する必要があります。

1. [Supabase Dashboard](https://app.supabase.com/) にアクセス
2. プロジェクトを選択
3. 左サイドバーの **Authentication** → **URL Configuration** を開く
4. **"Redirect URLs"** セクションに以下を追加：
   - 開発環境: `http://localhost:5173/*` または `http://127.0.0.1:5173/*`
   - 本番環境: `https://your-domain.com/*`（デプロイ後に設定）
5. **Save** をクリック

**注意：**
- ワイルドカード（`*`）を使用することで、すべてのパスを許可できます
- 開発環境と本番環境で異なるURLを設定できます
- 専用ドメインがなくても、localhostで動作します

#### 解決方法4: Supabase Dashboardから手動でパスワードリセット

1. Supabase Dashboard → **Authentication** → **Users** でユーザーを開く
2. **"Send password reset email"** をクリック
3. メールアドレスに送信されたリンクからパスワードをリセット
4. 新しいパスワードでログイン

