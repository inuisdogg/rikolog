# 🚀 修正版Edge Functionのデプロイ手順

## ⚠️ 重要：500エラーを修正しました

以下の手順でデプロイしてください。

## デプロイ手順

### 1. Supabaseダッシュボードを開く
https://supabase.com/dashboard

### 2. Edge Functionsセクションに移動
- 左メニューから「Edge Functions」をクリック
- 「SQL Editor」ではありません！

### 3. 関数を開く
- `create-user-and-send-invite` 関数をクリック

### 4. コードを貼り付け
1. エディタ内の既存コードを**全部選択して削除**
2. 以下のファイルの内容を**全部コピー**：
   ```
   /Users/inu/Desktop/Riko-Log/supabase/functions/create-user-and-send-invite/index.ts
   ```
3. エディタに**全部貼り付け**
4. 「Deploy」または「Save」ボタンをクリック

### 5. デプロイ完了を確認
- 「Deployed」と表示されるまで待つ（数秒〜1分）

## 修正内容

1. ✅ `getUserByEmail`の代わりに`listUsers`を使用（より確実）
2. ✅ 既存ユーザーのエラーハンドリングを改善
3. ✅ エラーメッセージを分かりやすく改善
4. ✅ 500エラーの原因を修正

## テスト方法

1. ブラウザをリロード（`Cmd+Shift+R`）
2. ランディングページでメールアドレスを入力
3. 「登録する」ボタンをクリック
4. エラーが出ないことを確認

## トラブルシューティング

**まだ500エラーが出る場合：**
- Supabaseダッシュボードの「Edge Functions」→「Logs」でエラー詳細を確認
- 環境変数（`RESEND_API_KEY`、`SUPABASE_SERVICE_ROLE_KEY`）が設定されているか確認

**「既に登録されています」と表示される場合：**
- これは正常です。ログイン画面から「パスワードを忘れた場合」をクリックしてパスワードをリセットしてください。

