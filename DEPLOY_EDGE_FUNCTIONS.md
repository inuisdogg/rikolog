# Edge Functions デプロイ手順

## 方法1: Supabaseダッシュボードからデプロイ（推奨・簡単）

### ステップ1: Supabaseダッシュボードにアクセス
1. https://app.supabase.com/ にログイン
2. プロジェクト `sqdfjudhaffivdaxulsn` を選択

### ステップ2: Edge Functionsセクションに移動
1. 左サイドバーから「Edge Functions」をクリック
2. 「Create a new function」をクリック

### ステップ3: create-checkout-session関数を作成
1. 関数名: `create-checkout-session`
2. テンプレート: 「Blank」を選択
3. 「Create function」をクリック

### ステップ4: コードを貼り付け
`supabase/functions/create-checkout-session/index.ts` の内容をコピーして、エディタに貼り付け

### ステップ5: 環境変数を設定
1. 関数の「Settings」タブをクリック
2. 「Secrets」セクションで以下を追加：
   - `STRIPE_SECRET_KEY`: `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`
   - `SUPABASE_URL`: `https://sqdfjudhaffivdaxulsn.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY`: Supabaseダッシュボードの「Settings」→「API」→「service_role key」から取得

### ステップ6: デプロイ
1. 「Deploy」ボタンをクリック

### ステップ7: stripe-webhook関数も同様に作成
同じ手順で `stripe-webhook` 関数も作成してください。

---

## 方法2: Supabase CLIでデプロイ（上級者向け）

### 前提条件
- Supabase CLIがインストールされていること
- Supabaseにログインしていること

### 手順

```bash
# 1. プロジェクトディレクトリに移動
cd /Users/inu/Desktop/Riko-Log

# 2. Supabaseにログイン（ブラウザが開きます）
npx supabase login

# 3. プロジェクトをリンク
npx supabase link --project-ref sqdfjudhaffivdaxulsn

# 4. 環境変数を設定（.env.localファイルを作成）
cat > .env.local << EOF
STRIPE_SECRET_KEY=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
SUPABASE_URL=https://sqdfjudhaffivdaxulsn.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
EOF

# 5. Edge Functionsをデプロイ
npx supabase functions deploy create-checkout-session --no-verify-jwt
npx supabase functions deploy stripe-webhook --no-verify-jwt
```

---

## 環境変数の取得方法

### SUPABASE_SERVICE_ROLE_KEY の取得
1. Supabaseダッシュボードにログイン
2. プロジェクトを選択
3. 「Settings」→「API」をクリック
4. 「service_role key」をコピー（⚠️ このキーは秘密にしてください）

---

## デプロイ後の確認

1. Supabaseダッシュボードの「Edge Functions」セクションで、関数が表示されているか確認
2. 関数のURLが表示されているか確認（例: `https://sqdfjudhaffivdaxulsn.supabase.co/functions/v1/create-checkout-session`）
3. アプリでプレミアムプランのボタンを押して、Stripe Checkoutページにリダイレクトされるか確認

---

## トラブルシューティング

### エラー: "Function not found"
→ 関数がデプロイされていません。上記の手順を再度実行してください。

### エラー: "Stripeシークレットキーが設定されていません"
→ 環境変数 `STRIPE_SECRET_KEY` が設定されていません。Supabaseダッシュボードで確認してください。

### エラー: "CORS error"
→ Edge FunctionのCORS設定を確認してください。コード内でCORSヘッダーが設定されていることを確認してください。


