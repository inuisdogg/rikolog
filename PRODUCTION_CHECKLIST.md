# 本番運営チェックリスト

## 📋 必須設定項目

### 1. メール送信機能

#### 1-1. Resend API設定
- [ ] Resendアカウント作成（https://resend.com）
- [ ] APIキー取得（`RESEND_API_KEY`）
- [ ] 送信元メールアドレス設定（例: `noreply@rikolog.app`）
- [ ] ドメイン認証（SPF/DKIM/DMARC設定）
- [ ] Supabase Edge Functionの環境変数に`RESEND_API_KEY`を設定

#### 1-2. お問い合わせメール受信設定
- [ ] 運営用メールアドレス作成（例: `support@rikolog.app`）
- [ ] お問い合わせフォームの送信先設定
- [ ] お問い合わせ送信機能の実装（未実装のため要対応）

**現在の状態**: 
- ウェルカムメール送信機能は実装済み（Edge Function作成済み）
- お問い合わせ送信機能は未実装（フォームのみ存在）

---

### 2. GPS位置情報

**現在の状態**: ✅ 実装済み（外部API不要）

- `navigator.geolocation`を使用（ブラウザ標準機能）
- 外部APIは不要
- **注意**: HTTPS環境が必須（HTTPでは位置情報取得不可）

**必要な設定**:
- [ ] 本番環境でHTTPSを有効化
- [ ] 位置情報の使用許可をユーザーに求めるUI（既に実装済み）

---

### 3. 陳述書生成（AI API）

**現在の状態**: ⚠️ 擬似変換のみ（AI API未実装）

- `statementTransform.js`で擬似LLM変換を実装
- コメントに「将来API/LLMに差し替え可能」と記載
- 実際のAI APIは未使用

**必要な設定**:
- [ ] AI APIの選定（OpenAI GPT-4、Claude、Gemini等）
- [ ] APIキーの取得と設定
- [ ] `statementTransform.js`の`pseudoLLMTransformLog`関数をAI API呼び出しに置き換え
- [ ] プロンプトの最適化（`STATEMENT_SYSTEM_PROMPT`を活用）
- [ ] エラーハンドリングとフォールバック処理

**推奨AI API**:
- OpenAI GPT-4（高精度、コスト高め）
- Anthropic Claude（バランス良好）
- Google Gemini（コスト効率良好）

---

### 4. Supabase設定

#### 4-1. 環境変数
- [ ] `VITE_SUPABASE_URL`（本番環境のURL）
- [ ] `VITE_SUPABASE_ANON_KEY`（本番環境のAnon Key）
- [ ] `SUPABASE_SERVICE_ROLE_KEY`（Edge Functions用、非公開）

#### 4-2. Edge Functions
- [ ] `send-welcome-email`関数のデプロイ
- [ ] Edge Functionsの環境変数設定
  - `RESEND_API_KEY`
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`

#### 4-3. データベース
- [ ] 本番環境のデータベース作成
- [ ] RLS（Row Level Security）ポリシーの確認
- [ ] バックアップ設定
- [ ] マイグレーション実行

#### 4-4. Storage
- [ ] ストレージバケットの作成
- [ ] ストレージポリシーの設定
- [ ] ファイルアップロード制限の設定

---

### 5. ドメイン・SSL設定

- [ ] ドメイン取得（例: `rikolog.app`）
- [ ] DNS設定
- [ ] SSL証明書設定（Let's Encrypt等）
- [ ] HTTPS有効化（必須：GPS位置情報取得のため）

---

### 6. デプロイ設定

#### 6-1. ホスティング
- [ ] ホスティングサービス選定（Vercel、Netlify、Cloudflare Pages等）
- [ ] ビルド設定
- [ ] 環境変数の設定
- [ ] カスタムドメイン設定

#### 6-2. PWA設定
- [ ] Service Workerの設定確認
- [ ] Manifest.jsonの設定確認
- [ ] アイコンの設定確認

---

### 7. セキュリティ設定

- [ ] CORS設定
- [ ] レート制限設定
- [ ] 不正アクセス対策
- [ ] データ暗号化確認
- [ ] パスワードポリシー設定

---

### 8. 監視・ログ

- [ ] エラーログの収集（Sentry等）
- [ ] アクセスログの収集
- [ ] パフォーマンス監視
- [ ] アラート設定

---

### 9. その他

#### 9-1. お問い合わせ機能の実装
**現在の状態**: ⚠️ 未実装

- [ ] お問い合わせフォームの送信機能実装
- [ ] 運営用メールアドレスへの送信機能
- [ ] 送信確認メッセージ表示

#### 9-2. 決済機能（プレミアムプラン）
- [ ] 決済プロバイダー選定（Stripe、PayPal等）
- [ ] 決済APIの実装
- [ ] サブスクリプション管理

#### 9-3. 法的情報
- [ ] 利用規約の最終確認
- [ ] プライバシーポリシーの最終確認
- [ ] 特定商取引法に基づく表記の最終確認
- [ ] 事業者情報の記載（住所、連絡先等）

---

## 📝 実装が必要な機能

### 優先度：高

1. **お問い合わせ送信機能**
   - 現在：フォームのみ存在、送信機能なし
   - 必要：運営用メールアドレスへの送信機能

2. **AI API統合（陳述書生成）**
   - 現在：擬似変換のみ
   - 必要：実際のAI API統合

### 優先度：中

3. **決済機能（プレミアムプラン）**
   - 現在：プレミアム機能は実装済みだが、決済機能は未実装

4. **エラーハンドリング強化**
   - 現在：基本的なエラーハンドリングは実装済み
   - 必要：より詳細なエラーログとユーザーへの通知

### 優先度：低

5. **分析・統計機能**
   - ユーザー行動分析
   - サービス利用状況の可視化

---

## 🔧 環境変数一覧

### フロントエンド（.env）
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Supabase Edge Functions
```
RESEND_API_KEY=re_xxxxxxxxxxxxx
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### AI API（将来実装時）
```
OPENAI_API_KEY=sk-xxxxxxxxxxxxx
# または
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxx
# または
GOOGLE_AI_API_KEY=xxxxxxxxxxxxx
```

---

## 📧 メールアドレス一覧

### 必要なメールアドレス

1. **送信元メールアドレス**
   - 用途：ウェルカムメール送信
   - 例：`noreply@rikolog.app`
   - 設定場所：Resend API

2. **運営用メールアドレス**
   - 用途：お問い合わせ受信
   - 例：`support@rikolog.app` または `info@rikolog.app`
   - 設定場所：お問い合わせ送信機能（未実装）

3. **緊急連絡用メールアドレス**
   - 用途：システムエラー通知等
   - 例：`admin@rikolog.app`

---

## ✅ チェックリストまとめ

### 必須（本番運営に不可欠）
- [ ] Resend API設定とメール送信機能
- [ ] お問い合わせ送信機能の実装
- [ ] HTTPS環境の構築
- [ ] Supabase本番環境設定
- [ ] ドメイン・SSL設定

### 推奨（サービス品質向上）
- [ ] AI API統合（陳述書生成の精度向上）
- [ ] 決済機能実装（プレミアムプラン）
- [ ] エラーログ収集
- [ ] 監視・アラート設定

### 任意（将来的な拡張）
- [ ] 分析・統計機能
- [ ] マーケティング自動化
- [ ] 多言語対応

---

## 📚 参考資料

- [Supabase Edge Functions ドキュメント](https://supabase.com/docs/guides/functions)
- [Resend API ドキュメント](https://resend.com/docs)
- [OpenAI API ドキュメント](https://platform.openai.com/docs)
- [PWA 実装ガイド](https://web.dev/progressive-web-apps/)


