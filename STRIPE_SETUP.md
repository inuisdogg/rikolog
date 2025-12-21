# Stripe統合セットアップガイド

## 概要

Riko-Logのプレミアムプラン登録機能にStripeを統合しました。このドキュメントでは、Stripeの設定方法を説明します。

## 必要な準備

### 1. Stripeアカウントの設定

1. [Stripeダッシュボード](https://dashboard.stripe.com/)にログイン
2. プロダクト > 価格設定から、月額450円のサブスクリプション価格を作成
3. 作成した価格のID（`price_xxxxx`形式）をメモしておく

### 2. 環境変数の設定

プロジェクトルートに`.env`ファイルを作成し、以下の環境変数を設定してください：

```env
# Supabase設定
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

# Stripe設定
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_51Sg5QbALsqTgstlIP8EJM2p50qaPw1lOGimmi7mZgMQ4gV50ysJP2UwBuTHHVQp7sG2oyXQhuWmXB6axJhWKlWXg00zGrbWMVJ
STRIPE_SECRET_KEY=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

# Stripe価格ID（Stripeダッシュボードで作成した価格ID）
VITE_STRIPE_PRICE_ID=price_xxxxx
```

### 3. Supabase Edge Functionsの設定

#### 3.1 環境変数の設定

Supabaseダッシュボードで、各Edge Functionに以下の環境変数を設定してください：

**create-checkout-session関数:**
- `STRIPE_SECRET_KEY`: Stripeシークレットキー
- `SUPABASE_URL`: SupabaseプロジェクトURL
- `SUPABASE_SERVICE_ROLE_KEY`: Supabaseサービスロールキー

**stripe-webhook関数:**
- `STRIPE_SECRET_KEY`: Stripeシークレットキー
- `STRIPE_WEBHOOK_SECRET`: Stripe Webhookシークレット（後述）
- `SUPABASE_URL`: SupabaseプロジェクトURL
- `SUPABASE_SERVICE_ROLE_KEY`: Supabaseサービスロールキー

#### 3.2 Edge Functionsのデプロイ

Supabase CLIを使用してEdge Functionsをデプロイします：

```bash
# Supabase CLIのインストール（未インストールの場合）
npm install -g supabase

# Supabaseにログイン
supabase login

# プロジェクトをリンク
supabase link --project-ref your-project-ref

# Edge Functionsをデプロイ
supabase functions deploy create-checkout-session
supabase functions deploy stripe-webhook
```

### 4. データベーススキーマの更新

`supabase/schema.sql`を実行して、Stripe関連のカラムを追加してください：

```sql
-- premium_subscriptionsテーブルにStripe関連カラムを追加（既に追加済み）
ALTER TABLE premium_subscriptions 
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- stripe_checkout_sessionsテーブルを作成（既に作成済み）
-- schema.sqlを実行してください
```

### 5. Stripe Webhookの設定

1. Stripeダッシュボードで、Webhooksセクションに移動
2. 「エンドポイントを追加」をクリック
3. エンドポイントURLを設定：
   ```
   https://your-project-ref.supabase.co/functions/v1/stripe-webhook
   ```
4. 以下のイベントを選択：
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Webhookシークレットをコピーし、Supabase Edge Functionの環境変数`STRIPE_WEBHOOK_SECRET`に設定

### 6. stripe.config.jsの更新

`stripe.config.js`ファイルの`PREMIUM_PRICE_ID`を、Stripeダッシュボードで作成した価格IDに更新してください：

```javascript
export const PREMIUM_PRICE_ID = 'price_xxxxx'; // 実際の価格IDに置き換え
```

または、環境変数`VITE_STRIPE_PRICE_ID`を設定してください。

## 動作確認

### 1. チェックアウトフローの確認

1. アプリにログイン
2. プレミアムプラン画面に移動
3. 「¥450 月額」ボタンをクリック
4. Stripe Checkoutページにリダイレクトされることを確認
5. テストカードで決済を完了
6. アプリに戻り、プレミアムステータスが更新されることを確認

### 2. Webhookの確認

1. StripeダッシュボードのWebhooksセクションで、イベントが正常に受信されているか確認
2. Supabaseのログで、Webhook関数が正常に実行されているか確認

### 3. サブスクリプション管理の確認

1. Stripeダッシュボードで、サブスクリプションが正常に作成されているか確認
2. Supabaseの`premium_subscriptions`テーブルで、レコードが正常に作成されているか確認

## トラブルシューティング

### チェックアウトセッションが作成されない

- Supabase Edge Functionの環境変数が正しく設定されているか確認
- Edge Functionのログを確認
- ブラウザのコンソールでエラーメッセージを確認

### Webhookが動作しない

- Stripe WebhookのエンドポイントURLが正しいか確認
- Webhookシークレットが正しく設定されているか確認
- Supabase Edge Functionのログを確認

### プレミアムステータスが更新されない

- Supabaseの`premium_subscriptions`テーブルを確認
- Webhookが正常に受信されているか確認
- データベースのRLSポリシーを確認

## セキュリティに関する注意事項

1. **シークレットキーの管理**: Stripeシークレットキーは絶対に公開リポジトリにコミットしないでください
2. **Webhook署名検証**: 本番環境では、Webhookの署名検証を適切に実装してください（現在は簡易版）
3. **RLSポリシー**: データベースのRLSポリシーが正しく設定されているか確認してください

## テストカード

Stripeのテストモードでは、以下のカード番号を使用できます：

- 成功: `4242 4242 4242 4242`
- 3Dセキュア認証: `4000 0025 0000 3155`
- 失敗: `4000 0000 0000 0002`

有効期限は未来の日付、CVCは任意の3桁の数字を入力してください。

