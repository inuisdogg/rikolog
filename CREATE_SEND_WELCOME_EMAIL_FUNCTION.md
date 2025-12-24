# send-welcome-email Edge Functionの作成手順

## 📋 概要

`send-welcome-email`という新しいEdge FunctionをSupabaseダッシュボードから作成します。

## 🚀 作成手順

### ステップ1: Supabaseダッシュボードを開く
1. https://supabase.com/dashboard にアクセス
2. ログイン
3. プロジェクト（Riko-Log）を選択

### ステップ2: Edge Functionsページを開く
1. 左メニュー → **「Edge Functions」** をクリック
2. 関数一覧が表示されます

### ステップ3: 新しい関数を作成
1. 画面右上の **「Create a new function」** または **「+ New Function」** ボタンをクリック
2. 関数名を入力：
   - **関数名**: `send-welcome-email`
   - （注意：ハイフン（-）を使う。アンダースコア（_）ではない）
3. **「Create function」** または **「作成」** ボタンをクリック

### ステップ4: コードを貼り付け
1. コードエディタが開きます（初期状態ではサンプルコードが表示されている）
2. エディタ内のコードを**全部選択**（`Cmd+A` / `Ctrl+A`）
3. **全部削除**（`Delete`キー）
4. ローカルのファイルを開く：
   ```
   /Users/inu/Desktop/Riko-Log/supabase/functions/send-welcome-email/index.ts
   ```
5. ファイルの内容を**全部選択**（`Cmd+A` / `Ctrl+A`）
6. **全部コピー**（`Cmd+C` / `Ctrl+C`）
7. Supabaseのエディタに**貼り付け**（`Cmd+V` / `Ctrl+V`）

### ステップ5: 環境変数を設定
1. 関数の設定画面で **「Settings」** または **「環境変数」** タブを開く
2. 以下の環境変数を追加：

   | 変数名 | 値 |
   |--------|-----|
   | `RESEND_API_KEY` | （ResendのAPIキー） |
   | `SUPABASE_URL` | `https://sqdfjudhaffivdaxulsn.supabase.co` |
   | `SUPABASE_SERVICE_ROLE_KEY` | （Supabaseダッシュボードの「Settings」→「API」から取得） |

   **環境変数の取得方法：**
   - `RESEND_API_KEY`: Resendのダッシュボードから取得
   - `SUPABASE_URL`: プロジェクトのURL（通常は `https://[プロジェクトID].supabase.co`）
   - `SUPABASE_SERVICE_ROLE_KEY`: Supabaseダッシュボード → Settings → API → `service_role` key（**秘密にしてください**）

3. 各環境変数を追加したら **「Save」** をクリック

### ステップ6: デプロイ
1. コードエディタ画面に戻る
2. 画面下部の緑色の **「Deploy function」** ボタンをクリック
3. デプロイが完了するまで待つ（数秒〜数十秒）
4. **「Deployed」** と表示されれば成功 ✅

## ✅ 動作確認

### テスト方法
1. 新規登録を実行
2. 登録完了メールが届くか確認
3. メールの内容が正しいか確認

### 確認ポイント
- ✅ メールが届く
- ✅ 件名が「【リコログ】ユーザー登録が完了しました」
- ✅ 電卓パスコードが「7777=」と記載されている
- ✅ 使い方ガイドが記載されている

## 📝 注意事項

- 関数名は正確に `send-welcome-email` と入力してください（大文字小文字も正確に）
- 環境変数は必ず設定してください（特に`RESEND_API_KEY`）
- デプロイ後、数秒待ってから動作確認してください

## 🔧 トラブルシューティング

**Q: 関数が作成できない**
- Supabaseのプロジェクトに適切な権限があるか確認してください
- 関数名に使用できない文字（スペース、特殊文字など）が含まれていないか確認してください

**Q: デプロイに失敗する**
- コードに構文エラーがないか確認してください
- 環境変数が正しく設定されているか確認してください

**Q: メールが届かない**
- `RESEND_API_KEY`が正しく設定されているか確認してください
- Supabaseダッシュボードの「Edge Functions」→「Logs」でエラーログを確認してください

## 📁 ファイルパス

- ローカルファイル: `/Users/inu/Desktop/Riko-Log/supabase/functions/send-welcome-email/index.ts`
- Supabaseエディタ: Edge Functions → `send-welcome-email` → コードエディタ

