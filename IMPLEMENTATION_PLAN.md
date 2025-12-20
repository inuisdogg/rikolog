# Supabase統合実装計画

## 現在の状況

- ✅ Supabaseテーブル作成済み
- ✅ 環境変数設定済み
- ✅ データアクセス層（db/*.js）実装済み
- ⏳ App.jsxのlocalStorage呼び出しをSupabaseに置き換え（25箇所）

## 必要な実装

### 1. 認証フロー（最優先）

**現在**: localStorageにユーザー情報を保存
**変更後**: Supabase Authenticationを使用

**必要な変更**:
- `AuthScreen`コンポーネント
  - 新規登録: `supabase.auth.signUp()` → `createUser()`
  - ログイン: `supabase.auth.signInWithPassword()` → `getUser()`
  - Face IDログイン: セッション復元 → `getCurrentUser()`
- `App`コンポーネント
  - 認証状態の監視: `supabase.auth.onAuthStateChange()`
  - セッション復元: `supabase.auth.getSession()`

**必要な情報**:
- メールアドレス
- パスワード（6文字以上推奨）
- 離婚理由（reason）
- 目標日（targetDate、オプション）
- 状況説明（situation、オプション）

### 2. ログデータのCRUD

**現在**: localStorageに配列として保存
**変更後**: Supabaseの`logs`テーブルに保存

**必要な変更**:
- `MainApp`コンポーネント
  - ログ読み込み: `getUserLogs(userId)`
  - ログ追加: `createLog(userId, logData)`
  - ログ更新: `updateLog(logId, updates)`
  - ログ削除: `deleteLog(logId)`（必要に応じて）

**データ構造の変換**:
- localStorage: `{ id, date, time, category, location, content, attachments, medical }`
- Supabase: 同じ構造だが、`id`はUUID、`user_id`を追加

### 3. ユーザー情報の管理

**現在**: localStorageに保存
**変更後**: Supabaseの`users`テーブルに保存

**必要な変更**:
- ユーザー情報の取得: `getUser(userId)` / `getCurrentUser()`
- ユーザー情報の更新: `updateUser(userId, updates)`

### 4. プレミアム情報の取得

**現在**: localStorageに保存
**変更後**: Supabaseの`premium_subscriptions`テーブルから取得

**必要な変更**:
- `checkPremiumStatus()`: `isPremiumUser(userId)`
- `getUserPlan()`: `getPremiumSubscription(userId)`

### 5. 掲示板機能

**現在**: localStorageに保存
**変更後**: Supabaseの`board_posts`テーブルに保存

**必要な変更**:
- `BoardView`コンポーネント
  - 投稿一覧: `getBoardPosts(options)`
  - 投稿作成: `createBoardPost(userId, postData)`
  - 投稿更新: `updateBoardPost(postId, updates)`
  - リアクション: `addReaction(postId, reactionType)`
  - 返信: `addReply(postId, replyData)`

### 6. メッセージ機能

**現在**: ハードコードされたデータ
**変更後**: Supabaseの`messages`テーブルから取得

**必要な変更**:
- `MessagesView`コンポーネント
  - メッセージ一覧: `getUserMessages(userId)`
  - 既読処理: `markMessageAsRead(messageId)`

### 7. エラーハンドリング

**必要な実装**:
- ネットワークエラー
- 認証エラー
- データベースエラー
- ユーザーフレンドリーなエラーメッセージ

### 8. ローディング状態

**必要な実装**:
- 認証中のローディング
- データ読み込み中のローディング
- データ保存中のローディング

### 9. 認証状態の監視

**必要な実装**:
- `supabase.auth.onAuthStateChange()`で認証状態を監視
- セッション切れの処理
- 自動ログアウトの処理

## 実装順序

1. **認証フロー**（最優先）
   - Supabase Authの統合
   - セッション管理
   - 認証状態の監視

2. **ログデータのCRUD**
   - データ読み込み
   - データ保存
   - データ更新

3. **ユーザー情報の管理**
   - プロフィール情報の取得・更新

4. **その他の機能**
   - プレミアム情報
   - 掲示板
   - メッセージ

## 必要な追加情報

### 確認が必要な項目

1. **パスワード要件**
   - 最小文字数: 6文字以上（Supabaseデフォルト）
   - 複雑さ要件: なし（Supabaseデフォルト）

2. **メール確認**
   - 開発中: メール確認をOFFにするか？
   - 本番環境: メール確認をONにするか？

3. **セッション管理**
   - セッション有効期限: デフォルト（7日間）
   - 自動リフレッシュ: 有効

4. **エラーメッセージ**
   - 日本語化が必要か？
   - ユーザーフレンドリーなメッセージ

5. **データ移行**
   - 既存のlocalStorageデータを移行するか？
   - 移行スクリプトが必要か？

## 実装時の注意点

1. **段階的移行**
   - localStorageとSupabaseの両方をサポート（移行期間）
   - フラグで切り替え可能にする

2. **オフライン対応**
   - 将来的に実装可能（Supabaseはオフライン対応あり）

3. **パフォーマンス**
   - データのキャッシュ
   - 不要な再取得を避ける

4. **セキュリティ**
   - RLSポリシーが正しく機能しているか確認
   - 認証トークンの管理


