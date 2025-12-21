# Edge Function デプロイ手順（超詳細版）

## 問題
CORSエラーが発生しています。Edge FunctionにCORSヘッダーを追加する必要があります。

## 解決方法

### ステップ1: Supabaseダッシュボードを開く
1. ブラウザで https://supabase.com/dashboard を開く
2. ログインする
3. プロジェクトを選択（例: Riko-Log）

### ステップ2: Edge Functionsセクションを探す
1. 左側のメニューを確認
2. 「Edge Functions」という項目を探す
   - もし見つからない場合は、「Functions」という名前かもしれません
   - または、メニューの「Database」の下にあるかもしれません

### ステップ3: 関数を作成または編集

**パターンA: 既に `create-user-and-send-invite` 関数が存在する場合**

1. 関数一覧から「create-user-and-send-invite」をクリック
2. コードエディタが開きます
3. エディタ内のコードを**全部選択**（`Cmd+A` / `Ctrl+A`）
4. **全部削除**（`Delete`キー）
5. `supabase/functions/create-user-and-send-invite/index.ts` ファイルを開く
6. そのファイルの内容を**全部コピー**（`Cmd+A` → `Cmd+C` / `Ctrl+A` → `Ctrl+C`）
7. Supabaseのエディタに**全部貼り付け**（`Cmd+V` / `Ctrl+V`）
8. 「Deploy」または「Save」ボタンをクリック
9. 「Deployed」または「デプロイ済み」と表示されれば成功

**パターンB: 関数が存在しない場合**

1. 「Create a new function」または「新しい関数を作成」ボタンをクリック
2. 関数名を入力: `create-user-and-send-invite`
3. 「Create function」または「作成」ボタンをクリック
4. コードエディタが開きます
5. `supabase/functions/create-user-and-send-invite/index.ts` ファイルを開く
6. そのファイルの内容を**全部コピー**
7. Supabaseのエディタに**全部貼り付け**
8. 「Deploy」または「Save」ボタンをクリック

### ステップ4: 環境変数を設定（重要）

1. 関数のページで「Settings」タブをクリック
2. 「Secrets」または「環境変数」セクションを探す
3. 以下の環境変数を追加：

   **RESEND_API_KEY:**
   - 名前: `RESEND_API_KEY`
   - 値: Resend APIキー（https://resend.com で取得）
   - 「Add」または「追加」をクリック

   **SUPABASE_SERVICE_ROLE_KEY（必要に応じて）:**
   - 名前: `SUPABASE_SERVICE_ROLE_KEY`
   - 値: Supabaseダッシュボードの「Settings」→「API」→「service_role key」をコピー
   - 「Add」または「追加」をクリック

### ステップ5: 確認とテスト

1. 関数が「Deployed」と表示されているか確認
2. ブラウザを完全にリロード（`Cmd+Shift+R` / `Ctrl+Shift+R`）
3. ランディングページで再度登録を試す

## もしEdge Functionsセクションが見つからない場合

1. Supabaseのプランを確認
   - 無料プランでもEdge Functionsは利用可能ですが、制限がある場合があります
2. プロジェクトの設定を確認
   - 「Settings」→「General」でプロジェクトの状態を確認

## トラブルシューティング

### 「Edge Functions」が見つからない
→ プロジェクトのプランや設定を確認してください。必要に応じてサポートに問い合わせてください。

### デプロイボタンが見つからない
→ 「Save」ボタンを探してください。自動保存される場合もあります。

### エラーが出る
→ コードをコピーする際に、全部コピーできているか確認してください。特に最初と最後の部分が欠けていないか確認してください。

