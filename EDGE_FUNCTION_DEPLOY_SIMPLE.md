# Edge Function デプロイ手順（簡単版）

## 問題
CORSエラーが発生しています。Edge FunctionにCORSヘッダーを追加する必要があります。

## 解決方法

### ステップ1: Supabaseダッシュボードを開く
1. https://supabase.com/dashboard にアクセス
2. プロジェクトを選択

### ステップ2: Edge Functionsセクションを開く
1. 左メニューの「Edge Functions」をクリック
2. もし「Edge Functions」が見つからない場合は、「Functions」という名前かもしれません

### ステップ3: 関数を作成または編集
**既に `create-user-and-send-invite` 関数が存在する場合：**
1. 関数名をクリック
2. コードエディタが開く
3. `supabase/functions/create-user-and-send-invite/index.ts` の内容を**全部コピー**
4. エディタに**全部貼り付け**（既存のコードを上書き）
5. 「Deploy」または「Save」ボタンをクリック

**関数が存在しない場合：**
1. 「Create a new function」または「新しい関数を作成」をクリック
2. 関数名: `create-user-and-send-invite` と入力
3. 「Create function」をクリック
4. コードエディタが開く
5. `supabase/functions/create-user-and-send-invite/index.ts` の内容を**全部コピー**
6. エディタに**全部貼り付け**
7. 「Deploy」または「Save」ボタンをクリック

### ステップ4: 環境変数を設定
1. 関数の「Settings」タブをクリック
2. 「Secrets」または「環境変数」セクションで以下を追加：
   - `RESEND_API_KEY`: Resend APIキー（メール送信用）
   - `SUPABASE_URL`: 自動設定されている場合があります
   - `SUPABASE_SERVICE_ROLE_KEY`: 自動設定されている場合があります

**環境変数の取得方法：**
- `RESEND_API_KEY`: https://resend.com でアカウント作成→APIキーを取得
- `SUPABASE_SERVICE_ROLE_KEY`: Supabaseダッシュボードの「Settings」→「API」→「service_role key」をコピー

### ステップ5: 確認
1. 関数が「Deployed」または「デプロイ済み」と表示されているか確認
2. ブラウザをリロード（`Cmd+Shift+R` / `Ctrl+Shift+R`）
3. 再度登録を試す

## もしEdge Functionsセクションが見つからない場合

Supabaseの無料プランではEdge Functionsが利用できない場合があります。その場合は：
1. プロジェクトのプランを確認
2. 必要に応じてプランをアップグレード

または、別の方法として：
- フロントエンドから直接Supabase Auth APIを呼び出す方法に変更することも可能です


