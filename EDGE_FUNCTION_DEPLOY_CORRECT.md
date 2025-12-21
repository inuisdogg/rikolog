# Edge Functionの正しいデプロイ方法

## ⚠️ 重要：SQLエディタでは実行できません！

Edge Functionは**SQLクエリではなく、JavaScript/TypeScriptの関数**です。
SQLエディタで実行するとエラーになります。

## 正しい手順

### ステップ1: Edge Functionsセクションに移動

1. Supabaseダッシュボードを開く
2. **左メニューから「Edge Functions」をクリック**
   - 「SQL Editor」ではありません！
   - 「Edge Functions」という項目を探してください
   - もし見つからない場合は、「Functions」という名前かもしれません

### ステップ2: 関数を開くまたは作成

**既に `create-user-and-send-invite` 関数が存在する場合：**

1. 関数一覧から `create-user-and-send-invite` をクリック
2. コードエディタが開きます
3. 既存のコードを**全部選択して削除**
4. `supabase/functions/create-user-and-send-invite/index.ts` の内容を**全部コピー**
5. エディタに**全部貼り付け**
6. 「Deploy」または「Save」ボタンをクリック

**関数が存在しない場合：**

1. 「Create a new function」または「新しい関数を作成」ボタンをクリック
2. 関数名: `create-user-and-send-invite` と入力
3. 「Create function」をクリック
4. コードエディタが開きます
5. `supabase/functions/create-user-and-send-invite/index.ts` の内容を**全部コピー**
6. エディタに**全部貼り付け**
7. 「Deploy」または「Save」ボタンをクリック

### ステップ3: デプロイ完了を確認

- 「Deployed」または「デプロイ済み」と表示されるまで待つ
- 通常、数秒〜1分で完了します

## 違いの説明

- **SQLエディタ**: SQLクエリを実行する場所（データベース操作用）
- **Edge Functions**: JavaScript/TypeScriptの関数をデプロイする場所（APIエンドポイント用）

Edge Functionは、フロントエンドから呼び出すAPIエンドポイントとして動作します。

## トラブルシューティング

**「Edge Functions」が見つからない場合：**
- Supabaseの無料プランでは利用できない場合があります
- プロジェクトのプランを確認してください

**デプロイボタンが見つからない場合：**
- コードエディタの右上または下部を確認してください
- 「Save」や「Update」というボタン名の場合もあります

