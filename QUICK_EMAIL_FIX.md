# 🚨 パスワードリセットメールが届かない - すぐに解決する方法

## 問題

パスワードリセットメールが届かない原因は、**Supabaseのデフォルトメール設定**にあります。

## すぐに解決する方法（5分で完了）

### ステップ1: Resend APIキーを取得（既にある場合はスキップ）

1. [Resend](https://resend.com/) にアクセス
2. ログイン（アカウントがない場合は作成）
3. 「API Keys」をクリック
4. 「Create API Key」をクリック
5. APIキーをコピー（後で使います）

### ステップ2: SupabaseでSMTP設定

1. [Supabase Dashboard](https://supabase.com/dashboard) を開く
2. プロジェクトを選択
3. 左メニューから **Authentication** → **Emails** を開く
4. **SMTP Settings** タブをクリック
5. **Enable Custom SMTP** をオンにする
6. 以下の情報を入力：

   ```
   Sender email: onboarding@resend.dev
   Sender name: リコログ
   Host: smtp.resend.com
   Port: 465
   Username: resend
   Password: （Resendで取得したAPIキー）
   ```

7. **Save** をクリック

### ステップ3: テスト

1. ログイン画面で「パスワードを忘れた場合」をクリック
2. メールアドレスを入力
3. メールが届くか確認（スパムフォルダも確認）

## 送信元アドレスをカスタマイズする方法

### オプション1: Resendのデフォルトドメインを使用（すぐ使える）

上記の設定で、送信元は `onboarding@resend.dev` になります。
- ✅ すぐに使える
- ✅ ドメイン設定不要
- ❌ 送信元が`resend.dev`になる

### オプション2: カスタムドメインを設定（本番環境推奨）

**独自ドメイン（例：`rikolog.app`）を持っている場合：**

1. Resendダッシュボードで「Domains」を開く
2. 「Add Domain」をクリック
3. ドメインを入力（例：`rikolog.app`）
4. DNSレコードを設定：
   - ドメイン管理画面で、Resendが指定するTXTレコードを追加
5. 検証完了を待つ（数分〜数時間）
6. SupabaseのSMTP設定で送信元を変更：
   ```
   Sender email: noreply@rikolog.app
   ```

これで、送信元が `noreply@rikolog.app` になります。

## 現在の設定状況

- **新規登録メール**: Resend API経由（Edge Function）
  - 送信元: `noreply@rikolog.app`（カスタムドメイン）
  
- **パスワードリセットメール**: Supabaseのデフォルト
  - 送信元: `noreply@mail.app.supabase.io`（デフォルト）
  - ⚠️ これが届かない原因

## 解決後の動作

SupabaseのSMTP設定後：
- ✅ パスワードリセットメールが届くようになる
- ✅ 送信元が統一される（Resend経由）
- ✅ メールの到達率が向上

## トラブルシューティング

### 「Sender email is not verified」エラー

- Resendでドメインの検証が必要です
- または、`onboarding@resend.dev`を使用してください

### メールがまだ届かない

1. Resendダッシュボードで送信履歴を確認
2. エラーがないか確認
3. スパムフォルダを確認
4. SupabaseのSMTP設定が正しいか確認

詳細は `EMAIL_SETUP_GUIDE.md` を参照してください。

