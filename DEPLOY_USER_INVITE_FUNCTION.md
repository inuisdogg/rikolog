# ユーザー招待機能のデプロイ手順

## 概要

メールアドレス登録時に、自動的にユーザーアカウントを作成し、招待メールを送信する機能です。

## デプロイ手順

### 1. Edge Functionをデプロイ

Supabase CLIを使用してデプロイ：

```bash
# Supabase CLIがインストールされていることを確認
supabase --version

# ログイン（初回のみ）
supabase login

# プロジェクトをリンク
supabase link --project-ref YOUR_PROJECT_REF

# Edge Functionをデプロイ
supabase functions deploy create-user-and-send-invite
```

### 2. 環境変数を設定

Supabaseダッシュボードで以下を設定：

1. **Settings** → **Edge Functions** → **Secrets**
2. 以下の環境変数を追加：
   - `RESEND_API_KEY`: Resend APIキー（メール送信用）
   - `SUPABASE_URL`: SupabaseプロジェクトのURL（自動設定される場合あり）
   - `SUPABASE_SERVICE_ROLE_KEY`: Supabase Service Roleキー（自動設定される場合あり）

### 3. Resend APIキーの取得

1. [Resend](https://resend.com) にアカウントを作成
2. APIキーを取得
3. Supabaseの環境変数に設定

### 4. 動作確認

1. ランディングページでメールアドレスを登録
2. 招待メールが届くことを確認
3. メールに記載されているログイン情報でログインできることを確認

## 動作フロー

1. **ユーザーがメールアドレスを登録**
   - ランディングページのフォームから送信

2. **Edge Functionが実行される**
   - `create-user-and-send-invite` が呼び出される
   - Supabase Authでユーザーアカウントを作成（ランダムパスワード）
   - `users`テーブルにユーザー情報を保存
   - `premium_subscriptions`テーブルに無料プランを設定
   - `email_leads`テーブルにメールアドレスを保存

3. **招待メールを送信**
   - メールアドレス
   - パスワード（ランダム生成）
   - 電卓パスコード（7777）
   - ログインURL（メールアドレス付き）

4. **ユーザーがログイン**
   - メールからログインURLをクリック
   - メールアドレスが自動入力される
   - パスワードを入力してログイン
   - 電卓パスコード（7777）でアプリを解除
   - すぐに利用開始

## トラブルシューティング

### メールが届かない

1. Resend APIキーが正しく設定されているか確認
2. Resendのダッシュボードでメール送信履歴を確認
3. スパムフォルダを確認

### ユーザー作成に失敗する

1. Supabase Service Roleキーが正しく設定されているか確認
2. `users`テーブルが存在するか確認
3. RLSポリシーが正しく設定されているか確認

### ログインできない

1. メールに記載されているパスワードが正しいか確認
2. メールアドレスが正しいか確認
3. Supabase Authの設定を確認

