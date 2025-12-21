# Stripe決済機能のクイック修正ガイド

## 問題: プレミアムプランのボタンを押しても決済画面が表示されない

## 解決方法

### 方法1: Edge Functionをデプロイする（推奨）

1. **Supabase CLIのインストール**
```bash
npm install -g supabase
```

2. **Supabaseにログイン**
```bash
supabase login
```

3. **プロジェクトをリンク**
```bash
cd /Users/inu/Desktop/Riko-Log
supabase link --project-ref sqdfjudhaffivdaxulsn
```

4. **環境変数を設定**
Supabaseダッシュボードで、Edge Functionの環境変数を設定：
- `STRIPE_SECRET_KEY`: `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`
- `SUPABASE_URL`: `https://sqdfjudhaffivdaxulsn.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY`: Supabaseダッシュボードの「Settings」→「API」から取得

5. **Edge Functionをデプロイ**
```bash
supabase functions deploy create-checkout-session
supabase functions deploy stripe-webhook
```

### 方法2: 一時的にデモモードで動作させる

Edge Functionがデプロイされていない場合、デモモードで動作します。
ボタンを押すと、ローカルストレージにプレミアムステータスが保存されます。

### 方法3: Stripe価格IDを設定する（オプション）

Stripeダッシュボードで価格を作成し、`.env`ファイルに追加：

```env
VITE_STRIPE_PRICE_ID=price_xxxxx
```

価格IDが設定されていない場合でも、Edge Functionが自動的に価格を作成します。

## 現在の設定状況

- ✅ Stripe公開キー: 設定済み
- ✅ Supabase URL: 設定済み
- ⚠️ Stripe価格ID: 未設定（自動作成されます）
- ⚠️ Edge Function: デプロイが必要

## トラブルシューティング

### エラー: "Supabase Edge Functionに接続できません"

→ Edge Functionがデプロイされていません。上記の「方法1」を実行してください。

### エラー: "Stripeシークレットキーが設定されていません"

→ Supabaseダッシュボードで、Edge Functionの環境変数に`STRIPE_SECRET_KEY`を設定してください。

### エラー: "価格の作成に失敗しました"

→ Stripeアカウントの設定を確認してください。テストモードの場合は、テスト用のシークレットキーを使用してください。

## 次のステップ

1. Edge Functionをデプロイ
2. ブラウザのコンソールでエラーメッセージを確認
3. 必要に応じて、Stripeダッシュボードで価格を作成

