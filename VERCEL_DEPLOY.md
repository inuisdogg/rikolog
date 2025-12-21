# Vercelデプロイ手順

## 1. GitHubリポジトリとの連携

GitHubリポジトリにコードがプッシュされていることを確認してください。

## 2. Vercelでプロジェクトをインポート

1. [Vercel](https://vercel.com)にログイン（GitHubアカウントでサインイン）
2. 「Add New Project」をクリック
3. GitHubリポジトリ `inuisdogg/rikolog` を選択
4. 「Import」をクリック

## 3. プロジェクト設定

Vercelが自動的に以下の設定を検出します：
- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

## 4. 環境変数の設定

Vercelのプロジェクト設定で、以下の環境変数を設定してください：

### Supabase関連
- `VITE_SUPABASE_URL`: SupabaseプロジェクトのURL
- `VITE_SUPABASE_ANON_KEY`: Supabaseの匿名キー

### Stripe関連（プレミアムプラン用・今後リリース予定）
- `VITE_STRIPE_PUBLISHABLE_KEY`: Stripe公開キー（オプション）

### Edge Functions URL（オプション）
- `VITE_SUPABASE_FUNCTIONS_URL`: Supabase Edge FunctionsのURL

### 設定方法
1. Vercelのプロジェクトページで「Settings」→「Environment Variables」を開く
2. 各環境変数を追加
3. 環境（Production、Preview、Development）を選択
4. 「Save」をクリック

## 5. デプロイ

1. 「Deploy」をクリック
2. ビルドが完了するまで待機（通常1-2分）
3. デプロイが完了すると、URLが表示されます

## 6. カスタムドメインの設定（オプション）

1. Vercelのプロジェクトページで「Settings」→「Domains」を開く
2. ドメインを追加
3. DNS設定に従ってドメインを設定

## 7. 自動デプロイ

GitHubリポジトリにプッシュすると、自動的にVercelでデプロイされます。

- `main`ブランチへのプッシュ → Production環境にデプロイ
- その他のブランチへのプッシュ → Preview環境にデプロイ

## トラブルシューティング

### ビルドエラーが発生する場合
- 環境変数が正しく設定されているか確認
- ビルドログを確認してエラー内容を確認

### 環境変数が反映されない場合
- 環境変数を設定した後、再デプロイが必要です
- 「Redeploy」をクリックして再デプロイしてください

## 参考リンク

- [Vercel Documentation](https://vercel.com/docs)
- [Vite on Vercel](https://vercel.com/docs/frameworks/vite)

