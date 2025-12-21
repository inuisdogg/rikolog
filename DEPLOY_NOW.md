# 🚀 Edge Functionsを今すぐデプロイする方法

## 最も簡単な方法: Supabaseダッシュボードから（推奨）

### ステップ1: Supabaseダッシュボードにアクセス
https://app.supabase.com/project/sqdfjudhaffivdaxulsn/functions

### ステップ2: create-checkout-session関数を作成

1. 「Create a new function」をクリック
2. 関数名: `create-checkout-session`
3. テンプレート: 「Blank」を選択
4. 「Create function」をクリック

### ステップ3: コードを貼り付け

以下のファイルの内容をコピーして、エディタに貼り付け：
```
supabase/functions/create-checkout-session/index.ts
```

### ステップ4: 環境変数を設定

1. 関数の「Settings」タブをクリック
2. 「Secrets」セクションで以下を追加：

| キー | 値 |
|------|-----|
| `STRIPE_SECRET_KEY` | `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` |
| `SUPABASE_URL` | `https://sqdfjudhaffivdaxulsn.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabaseダッシュボードの「Settings」→「API」→「service_role key」から取得 |

### ステップ5: デプロイ

「Deploy」ボタンをクリック

### ステップ6: stripe-webhook関数も同様に作成

同じ手順で `stripe-webhook` 関数も作成してください。
コードは `supabase/functions/stripe-webhook/index.ts` から取得してください。

---

## コマンドラインからデプロイする方法

### 方法A: スクリプトを使用（簡単）

```bash
cd /Users/inu/Desktop/Riko-Log
./deploy-functions.sh
```

### 方法B: 手動でコマンドを実行

```bash
cd /Users/inu/Desktop/Riko-Log

# 1. Supabaseにログイン（ブラウザが開きます）
npx supabase login

# 2. プロジェクトをリンク
npx supabase link --project-ref sqdfjudhaffivdaxulsn

# 3. Edge Functionsをデプロイ
npx supabase functions deploy create-checkout-session --no-verify-jwt
npx supabase functions deploy stripe-webhook --no-verify-jwt
```

---

## 環境変数の取得方法

### SUPABASE_SERVICE_ROLE_KEY の取得

1. https://app.supabase.com/project/sqdfjudhaffivdaxulsn/settings/api にアクセス
2. 「service_role key」をコピー（⚠️ このキーは秘密にしてください）

---

## デプロイ後の確認

1. ✅ Supabaseダッシュボードの「Edge Functions」セクションで、関数が表示されているか確認
2. ✅ 関数のURLが表示されているか確認
   - `create-checkout-session`: `https://sqdfjudhaffivdaxulsn.supabase.co/functions/v1/create-checkout-session`
   - `stripe-webhook`: `https://sqdfjudhaffivdaxulsn.supabase.co/functions/v1/stripe-webhook`
3. ✅ アプリでプレミアムプランのボタンを押して、Stripe Checkoutページにリダイレクトされるか確認

---

## トラブルシューティング

### エラー: "Function not found"
→ 関数がデプロイされていません。上記の手順を再度実行してください。

### エラー: "Stripeシークレットキーが設定されていません"
→ 環境変数 `STRIPE_SECRET_KEY` が設定されていません。Supabaseダッシュボードで確認してください。

### エラー: "Cannot use automatic login flow"
→ ターミナルで `npx supabase login` を実行して、ブラウザでログインしてください。

---

## 次のステップ

デプロイが完了したら、アプリでプレミアムプランのボタンを押して、Stripe Checkoutページにリダイレクトされるか確認してください。


