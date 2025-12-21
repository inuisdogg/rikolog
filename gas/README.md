# Google Apps Script (GAS) セットアップガイド

メールアドレスをGoogleスプレッドシートに記録するためのGASのセットアップ手順です。

## セットアップ手順

### 1. Googleスプレッドシートを作成

1. [Googleスプレッドシート](https://sheets.google.com)にアクセス
2. 新しいスプレッドシートを作成
3. スプレッドシートのURLからIDをコピー
   - URL例: `https://docs.google.com/spreadsheets/d/【ここがID】/edit`
   - このIDを後で使用します

### 2. Google Apps Scriptプロジェクトを作成

1. [Google Apps Script](https://script.google.com)にアクセス
2. 「新しいプロジェクト」をクリック
3. プロジェクト名を設定（例: 「リコログ メールアドレス記録」）

### 3. コードをコピー

1. `gas/save-email-to-spreadsheet.gs` の内容をコピー
2. GASエディタにペースト
3. `SPREADSHEET_ID` を実際のスプレッドシートIDに変更
   ```javascript
   const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID_HERE';
   ```
   を
   ```javascript
   const SPREADSHEET_ID = '実際のスプレッドシートID';
   ```
   に変更

### 4. デプロイ（Webアプリとして公開）

1. 右上の「デプロイ」→「新しいデプロイ」をクリック
2. 「種類を選択」で「ウェブアプリ」を選択
3. 以下の設定を行う:
   - **説明**: 「メールアドレス記録API」（任意）
   - **次のユーザーとして実行**: 「自分」
   - **アクセスできるユーザー**: 「全員」
4. 「デプロイ」をクリック
5. **WebアプリのURL**をコピー（後で使用します）
6. 初回デプロイ時は承認が必要です:
   - 「承認が必要です」をクリック
   - Googleアカウントを選択
   - 「詳細」→「（プロジェクト名）に移動」をクリック
   - 「許可」をクリック

### 5. Supabase Edge Functionから呼び出す（オプション）

既存の `send-welcome-email` Edge Functionを修正して、GASも呼び出すようにします。

または、フロントエンドから直接GASを呼び出すことも可能です。

### 6. 環境変数を設定（フロントエンドから呼び出す場合）

`.env` ファイルまたは環境変数に以下を追加:

```env
VITE_GAS_WEB_APP_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
VITE_USE_GAS=true
```

**注意**: 
- `VITE_USE_GAS=true` に設定すると、GASへの保存が有効になります
- `VITE_USE_GAS` が設定されていない、または `false` の場合は、GASへの保存はスキップされます（Supabaseへの保存は継続）

## 使用方法

### リクエスト形式

```javascript
POST https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec

Content-Type: application/json

{
  "email": "user@example.com",
  "source": "landing_page"  // オプション
}
```

### レスポンス形式

**成功時:**
```json
{
  "success": true,
  "message": "Email saved successfully",
  "timestamp": "2025-01-XX XX:XX:XX"
}
```

**重複時:**
```json
{
  "success": true,
  "message": "Email already exists",
  "timestamp": "2025-01-XX XX:XX:XX",
  "duplicate": true
}
```

**エラー時:**
```json
{
  "success": false,
  "error": "Error message"
}
```

## テスト

GASエディタで `testSaveEmail()` 関数を実行して、動作を確認できます。

## トラブルシューティング

### スプレッドシートに書き込まれない

1. スプレッドシートIDが正しいか確認
2. GASの実行ユーザーがスプレッドシートへのアクセス権限を持っているか確認
3. デプロイが最新版になっているか確認（コードを変更した場合は再デプロイが必要）

### CORSエラーが発生する

- GASの `doPost` 関数でCORSヘッダーを設定していますが、問題が続く場合は:
  - デプロイを再実行
  - ブラウザのキャッシュをクリア

### 権限エラー

- 初回実行時に権限の承認が必要です
- 「承認が必要です」のリンクから承認を行ってください

