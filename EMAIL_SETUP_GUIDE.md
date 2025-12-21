# 📧 メール送信設定ガイド

## 現在の状況

1. **新規登録メール**: Resend APIを使用（Edge Function経由）
   - 送信元: `noreply@rikolog.app`（カスタムドメイン）
   
2. **パスワードリセットメール**: Supabaseのデフォルトメール機能を使用
   - 送信元: Supabaseのデフォルト（`noreply@mail.app.supabase.io`など）

## 問題：パスワードリセットメールが届かない

### 原因1: Supabaseのメール設定が不完全

Supabaseのデフォルトメールサービスには制限があります：
- レート制限がある
- スパムフォルダに入りやすい
- 送信元アドレスがSupabaseのデフォルト

### 解決方法：カスタムSMTPを設定（推奨）

#### ステップ1: Resendアカウントの準備

1. [Resend](https://resend.com/) にアクセス
2. アカウントを作成（無料プランで月10,000通まで）
3. APIキーを作成：
   - 「API Keys」セクションに移動
   - 「Create API Key」をクリック
   - 「Sending access」を選択
   - APIキーをコピー（後で使います）

#### ステップ2: ドメインの設定（オプション）

**オプションA: カスタムドメインを使用（本番環境推奨）**

1. Resendダッシュボードで「Domains」を開く
2. 「Add Domain」をクリック
3. ドメインを入力（例：`rikolog.app`）
4. DNSレコードを設定：
   - ドメイン管理画面（お名前.com、Route53など）で以下を設定：
     ```
     Type: TXT
     Name: @
     Value: （Resendが提供する値）
     ```
5. 検証完了を待つ（数分〜数時間）

**オプションB: Resendのデフォルトドメインを使用（簡単・すぐ使える）**

- ドメイン設定不要
- 送信元: `onboarding@resend.dev` または `noreply@resend.dev`
- すぐに使えますが、送信元が`resend.dev`になります

#### ステップ3: SupabaseでSMTP設定

1. [Supabase Dashboard](https://supabase.com/dashboard) にアクセス
2. プロジェクトを選択
3. 左メニューから **Authentication** → **Emails** を開く
4. **SMTP Settings** タブをクリック
5. **Enable Custom SMTP** をオンにする
6. 以下の情報を入力：

   **Resendを使用する場合：**
   - **Sender email**: 
     - カスタムドメイン使用: `noreply@rikolog.app`
     - デフォルトドメイン使用: `onboarding@resend.dev`
   - **Sender name**: `リコログ`
   - **Host**: `smtp.resend.com`
   - **Port**: `465`（SSL）または `587`（TLS）
   - **Username**: `resend`
   - **Password**: Resendで作成したAPIキー

7. **Save** をクリック

#### ステップ4: メールテンプレートのカスタマイズ（オプション）

1. **Authentication** → **Emails** → **Email Templates** を開く
2. **Password Reset** テンプレートを選択
3. 送信者名やメール本文をカスタマイズ
4. **Save** をクリック

## 代替案：パスワードリセットもResend APIを使用

Edge Functionでパスワードリセットメールも送信するように変更することも可能です。

### メリット
- すべてのメールが同じ送信元から送信される
- メールデザインを統一できる
- Resendの管理画面で送信状況を確認できる

### デメリット
- コードの変更が必要
- Edge Functionの追加実装が必要

## 確認方法

### 1. Supabaseのメール設定を確認

1. Supabase Dashboard → **Authentication** → **Emails** → **SMTP Settings**
2. **Enable Custom SMTP** がオンになっているか確認
3. 設定が正しいか確認

### 2. テスト送信

1. ログイン画面で「パスワードを忘れた場合」をクリック
2. メールアドレスを入力
3. メールが届くか確認
4. スパムフォルダも確認

### 3. Resendのダッシュボードで確認

1. [Resend Dashboard](https://resend.com/emails) にアクセス
2. 「Emails」セクションで送信履歴を確認
3. エラーがないか確認

## トラブルシューティング

### メールが届かない場合

1. **スパムフォルダを確認**
2. **Resendのダッシュボードで送信履歴を確認**
   - エラーがある場合は詳細を確認
3. **SupabaseのSMTP設定を確認**
   - APIキーが正しいか
   - ホスト名とポートが正しいか
4. **ドメインのDNS設定を確認**（カスタムドメイン使用時）
   - DNSレコードが正しく設定されているか
   - 検証が完了しているか

### 「Sender email is not verified」エラーが出る場合

- Resendでドメインの検証が完了していない可能性があります
- または、デフォルトドメイン（`resend.dev`）を使用してください

### レート制限に達した場合

- Resendの無料プランは月10,000通まで
- 使用量を確認: Resend Dashboard → 「Usage」
- 必要に応じてプランをアップグレード

## 推奨設定（本番環境）

1. ✅ **カスタムドメインを設定**（`rikolog.app`など）
2. ✅ **Resend APIキーを取得**
3. ✅ **SupabaseでSMTP設定**
4. ✅ **メールテンプレートをカスタマイズ**
5. ✅ **送信テストを実施**

これで、すべてのメールが「リコログ <noreply@rikolog.app>」から送信されるようになります。

