# Vercelデプロイ後の動作確認チェックリスト

## 1. 基本動作確認

### ✅ サイトが表示されるか
- [ ] VercelのデプロイURLにアクセスできる
- [ ] ランディングページが正しく表示される
- [ ] エラーページが表示されない

### ✅ 環境変数の確認
ブラウザの開発者ツール（F12）のコンソールで以下を確認：

```javascript
// コンソールで実行
console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('Supabase Key:', import.meta.env.VITE_SUPABASE_ANON_KEY ? '設定済み' : '未設定');
```

- [ ] `VITE_SUPABASE_URL` が正しく表示される
- [ ] `VITE_SUPABASE_ANON_KEY` が「設定済み」と表示される
- [ ] エラーメッセージが表示されない

## 2. 機能確認

### ✅ ランディングページ
- [ ] ページが正しく表示される
- [ ] 「登録する」ボタンが動作する
- [ ] メールアドレス入力フォームが表示される

### ✅ ユーザー登録
- [ ] メールアドレスを入力して登録できる
- [ ] エラーメッセージが適切に表示される（既存ユーザーの場合など）
- [ ] 登録成功メッセージが表示される

### ✅ ログイン
- [ ] 登録したメールアドレスでログインできる
- [ ] パスワード入力が動作する
- [ ] ログイン後、アプリ画面に遷移する

### ✅ アプリ内機能
- [ ] ダッシュボードが表示される
- [ ] ログの追加ができる
- [ ] ログの一覧が表示される
- [ ] 慰謝料診断が動作する
- [ ] カモフラージュ機能（電卓モード）が動作する

## 3. Supabase接続確認

### ✅ コンソールログの確認
ブラウザのコンソールで以下が表示されることを確認：
- [ ] "Supabase設定確認: { url: '設定済み', key: '設定済み' }"
- [ ] "Supabaseクライアント初期化完了"
- [ ] エラーメッセージが表示されない

### ✅ データベース接続
- [ ] ログを追加して保存できる
- [ ] 保存したログが一覧に表示される
- [ ] データがSupabaseに保存されている（Supabaseダッシュボードで確認）

## 4. エラー確認

### ✅ コンソールエラーの確認
ブラウザの開発者ツール（F12）で：
- [ ] コンソールにエラーが表示されていない
- [ ] ネットワークタブでリクエストが成功している（200番台）
- [ ] Supabaseへの接続が成功している

### ✅ よくあるエラーと対処法

#### エラー: "Missing Supabase environment variables"
**原因**: 環境変数が設定されていない
**対処法**: 
1. Vercelの「Settings」→「Environment Variables」で環境変数を確認
2. 再デプロイを実行

#### エラー: "Failed to fetch" または CORSエラー
**原因**: SupabaseのCORS設定の問題
**対処法**: 
1. SupabaseダッシュボードでCORS設定を確認
2. VercelのURLを許可リストに追加

#### エラー: "Invalid API key"
**原因**: Supabaseのキーが間違っている
**対処法**: 
1. Supabaseダッシュボードで正しいキーを確認
2. Vercelの環境変数を更新
3. 再デプロイ

## 5. パフォーマンス確認

- [ ] ページの読み込み速度が適切（3秒以内）
- [ ] 画像やフォントが正しく読み込まれる
- [ ] PWA機能が動作する（モバイルで確認）

## 6. モバイル確認

- [ ] スマートフォンでアクセスできる
- [ ] レスポンシブデザインが正しく表示される
- [ ] タッチ操作が正常に動作する

## クイック確認コマンド

ブラウザのコンソールで以下を実行して、主要な設定を確認：

```javascript
// 環境変数の確認
console.log('=== 環境変数確認 ===');
console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('Supabase Key:', import.meta.env.VITE_SUPABASE_ANON_KEY ? '設定済み' : '未設定');
console.log('Stripe Key:', import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ? '設定済み' : '未設定');

// Supabase接続確認
import { supabase } from './supabase.config.js';
supabase.from('logs').select('count').then(result => {
  console.log('Supabase接続:', result.error ? 'エラー' : '成功');
  if (result.error) console.error('エラー詳細:', result.error);
});
```

## 問題が発生した場合

1. **Vercelのデプロイログを確認**
   - Vercelの「Deployments」タブでビルドログを確認
   - エラーメッセージを確認

2. **ブラウザのコンソールを確認**
   - F12で開発者ツールを開く
   - コンソールタブでエラーを確認
   - ネットワークタブでリクエストの状態を確認

3. **Supabaseダッシュボードを確認**
   - プロジェクトがアクティブか確認
   - APIキーが正しいか確認
   - データベースのテーブルが存在するか確認

4. **環境変数を再確認**
   - Vercelの環境変数が正しく設定されているか
   - 値に余分なスペースや改行が含まれていないか
   - 環境（Production/Preview/Development）が正しく選択されているか

