# クイックデプロイ手順

## ⚠️ 重要：変更を反映するには以下が必要です

### 1. Edge Functionのデプロイ（必須）

**方法A: Supabaseダッシュボード経由（推奨・簡単）**

1. https://supabase.com/dashboard にアクセス
2. プロジェクトを選択
3. 左メニューから「Edge Functions」をクリック
4. `create-user-and-send-invite` 関数をクリック
5. コードエディタで `supabase/functions/create-user-and-send-invite/index.ts` の内容を**全部コピー**
6. エディタに**全部貼り付け**（既存コードを上書き）
7. 「Deploy」または「Save」ボタンをクリック
8. デプロイ完了を待つ（数秒〜1分）

**方法B: Supabase CLI経由**

```bash
# Supabase CLIがインストールされている場合
cd /Users/inu/Desktop/Riko-Log
supabase functions deploy create-user-and-send-invite
```

### 2. フロントエンドの変更を反映

**開発サーバーを再起動：**

```bash
# 現在のサーバーを停止（Ctrl+C）
# その後、再起動
cd /Users/inu/Desktop/Riko-Log
npm run dev
```

**ブラウザのキャッシュをクリア：**

- Chrome/Edge: `Cmd+Shift+R` (Mac) または `Ctrl+Shift+R` (Windows)
- Safari: `Cmd+Option+R`
- または、開発者ツールを開いて「Disable cache」にチェック

### 3. 確認

1. ブラウザのコンソールを開く（F12）
2. エラーがないか確認
3. ログイン画面で動作を確認

## トラブルシューティング

**「関数が見つからない」エラーが出る場合：**
- Edge Functionがデプロイされていない可能性があります
- 上記の手順1を実行してください

**「400エラー」「422エラー」が出る場合：**
- Edge Functionのデプロイが完了していない可能性があります
- Supabaseダッシュボードで関数のステータスを確認してください

**変更が反映されない場合：**
- ブラウザのキャッシュを完全にクリアしてください
- 開発サーバーを再起動してください
- ハードリロード（`Cmd+Shift+R`）を実行してください

