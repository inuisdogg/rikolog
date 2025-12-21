# Vercel環境変数設定ガイド

## 必須の環境変数（必ず設定してください）

### 1. VITE_SUPABASE_URL
- **説明**: SupabaseプロジェクトのURL
- **取得方法**: 
  1. Supabaseダッシュボードにログイン
  2. プロジェクトを選択
  3. 「Settings」→「API」を開く
  4. 「Project URL」をコピー
- **例**: `https://xxxxxxxxxxxxx.supabase.co`

### 2. VITE_SUPABASE_ANON_KEY
- **説明**: Supabaseの匿名キー（公開キー）
- **取得方法**:
  1. Supabaseダッシュボードにログイン
  2. プロジェクトを選択
  3. 「Settings」→「API」を開く
  4. 「Project API keys」の「anon public」キーをコピー
- **例**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

## オプションの環境変数（プレミアムプラン用・今後リリース予定）

### 3. VITE_STRIPE_PUBLISHABLE_KEY（オプション）
- **説明**: Stripe公開キー（プレミアムプラン決済用）
- **取得方法**:
  1. Stripeダッシュボードにログイン
  2. 「Developers」→「API keys」を開く
  3. 「Publishable key」をコピー
- **例**: `pk_live_51Sg5QbALsqTgstlIP8EJM2p50qaPw1lOGimmi7mZgMQ4gV50ysJP2UwBuTHHVQp7sG2oyXQhuWmXB6axJhWKlWXg00zGrbWMVJ`
- **注意**: プレミアムプランは今後リリース予定のため、現在は設定不要です

### 4. VITE_STRIPE_PRICE_ID（オプション）
- **説明**: Stripeの価格ID（プレミアムプラン用）
- **取得方法**:
  1. Stripeダッシュボードで価格を作成
  2. 価格IDをコピー
- **例**: `price_xxxxxxxxxxxxx`
- **注意**: プレミアムプランは今後リリース予定のため、現在は設定不要です

## Vercelでの設定手順

1. Vercelのプロジェクトページで「Settings」→「Environment Variables」を開く
2. 以下の環境変数を追加：

```
Key: VITE_SUPABASE_URL
Value: [SupabaseプロジェクトのURL]

Key: VITE_SUPABASE_ANON_KEY
Value: [Supabaseの匿名キー]
```

3. 各環境変数の右側で環境を選択：
   - ✅ Production（本番環境）
   - ✅ Preview（プレビュー環境）
   - ✅ Development（開発環境）

4. 「Save」をクリック

5. 環境変数を追加した後、**必ず再デプロイ**してください：
   - 「Deployments」タブを開く
   - 最新のデプロイメントの「...」メニューから「Redeploy」を選択

## 環境変数の確認方法

デプロイ後、ブラウザのコンソール（F12）で以下を確認できます：
```javascript
console.log(import.meta.env.VITE_SUPABASE_URL)
console.log(import.meta.env.VITE_SUPABASE_ANON_KEY)
```

## トラブルシューティング

### 環境変数が反映されない場合
- 環境変数を追加した後、必ず再デプロイしてください
- 環境変数の名前が `VITE_` で始まっているか確認してください
- 値に余分なスペースや改行が含まれていないか確認してください

### Supabase接続エラーが発生する場合
- `VITE_SUPABASE_URL` と `VITE_SUPABASE_ANON_KEY` が正しく設定されているか確認
- Supabaseダッシュボードでプロジェクトがアクティブか確認
- RLS（Row Level Security）の設定を確認

