# データベース実装 - クイックスタートガイド（Supabase版）

## あなたが準備するもの

実用に耐えるデータベースを実装するために、以下の準備が必要です：

### 1. Supabaseアカウント（無料）

- GitHubアカウントまたはメールアドレスで[Supabase](https://app.supabase.com/)にサインアップできます
- 無料プランで十分です（500MBデータベース、1GBストレージ）

### 2. 約30分の時間

- Supabaseプロジェクトの作成と設定に必要な時間です

### 3. 設定情報の記録

- Supabase Dashboardから取得した設定値を`.env`ファイルに記入します

---

## ステップバイステップ

### Step 1: Supabaseプロジェクトを作成（10分）

1. [Supabase Dashboard](https://app.supabase.com/)にアクセス
2. 「New Project」をクリック
3. 組織を選択（初回は組織を作成）
4. プロジェクト情報を入力：
   - **Name**: `riko-log`
   - **Database Password**: 強力なパスワードを設定（忘れないように保存）
   - **Region**: `Northeast Asia (Tokyo)` を選択
5. 「Create new project」をクリック
6. プロジェクトの作成完了を待つ（1-2分）

### Step 2: 設定情報を取得（5分）

1. プロジェクトが作成されたら、プロジェクトを開く
2. 左サイドバーの「Settings」→「API」を開く
3. 以下の情報をコピー：
   - **Project URL**（例: `https://xxxxx.supabase.co`）
   - **anon public** キー

### Step 3: 環境変数を設定（5分）

プロジェクトルートに `.env` ファイルを作成：

```bash
# プロジェクトルートで実行
touch .env
```

`.env`ファイルに以下を記入（Step 2でコピーした値を使用）：

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### Step 4: データベーステーブルを作成（10分）

1. Supabase Dashboardで「SQL Editor」を開く
2. `DATABASE_DESIGN.md`のSQLをコピー＆ペースト
3. 「Run」ボタンをクリック
4. 成功メッセージを確認

### Step 5: Authenticationを有効化（2分）

1. 左サイドバーの「Authentication」を開く
2. 「Providers」タブで「Email」を有効化
3. 「Save」をクリック

### Step 6: パッケージをインストール（2分）

```bash
npm install
```

### Step 7: 動作確認（3分）

1. `npm run dev`でアプリを起動
2. ブラウザのコンソールでエラーがないか確認

---

## 完了後の確認

1. `.env`ファイルが正しく設定されているか確認
2. `npm run dev`でアプリが起動するか確認
3. ブラウザのコンソールでエラーがないか確認
4. Supabase Dashboardの「Table Editor」でテーブルが作成されているか確認

---

## 詳細な手順

より詳細な手順やトラブルシューティングは、`SETUP_SUPABASE.md`を参照してください。

## データベース設計

データ構造の詳細は、`DATABASE_DESIGN.md`を参照してください。

---

## よくある質問

### Q: 無料プランで使えますか？
A: はい。Supabaseの無料プランで十分です。小規模なアプリケーションなら無料で運用できます。

### Q: 既存のlocalStorageデータはどうなりますか？
A: 移行期間中は、localStorageとSupabaseの両方をサポートする予定です。既存データの移行スクリプトも作成予定です。

### Q: セキュリティは大丈夫ですか？
A: はい。SupabaseのRow Level Security (RLS)で、ユーザーは自分のデータのみアクセス可能に設定します。詳細は`DATABASE_DESIGN.md`を参照してください。

### Q: PostgreSQLの知識が必要ですか？
A: いいえ。SQLは提供済みです。コピー＆ペーストで実行できます。

### Q: オフライン対応はありますか？
A: 将来的に実装予定です。Supabaseはリアルタイム機能も提供しています。

---

## Supabaseの利点

1. **PostgreSQL**: 強力なリレーショナルデータベース
2. **RLS**: 行レベルセキュリティで細かいアクセス制御
3. **リアルタイム**: WebSocketベースのリアルタイム更新
4. **Storage**: ファイルストレージ機能
5. **無料プラン**: 小規模アプリには十分な無料プラン
6. **オープンソース**: 必要に応じてセルフホスト可能
