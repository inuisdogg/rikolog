# Supabase データベース構造

## テーブル一覧

### 1. `users` テーブル
ユーザー情報を保存

**カラム:**
- `id` (UUID, PRIMARY KEY) - auth.users(id)を参照
- `email` (TEXT, NOT NULL)
- `registered_at` (TIMESTAMPTZ, DEFAULT NOW())
- `reason` (TEXT, NOT NULL)
- `target_date` (TEXT)
- `situation` (TEXT)
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())
- `updated_at` (TIMESTAMPTZ, DEFAULT NOW())

**インデックス:**
- `idx_users_email` on `email`

**RLSポリシー:**
- SELECT: 自分のデータのみ閲覧可能 (`auth.uid() = id`)
- UPDATE: 自分のデータのみ更新可能 (`auth.uid() = id`)
- INSERT: 自分のデータのみ挿入可能 (`auth.uid() = id`)

---

### 2. `logs` テーブル
証拠ログを保存

**カラム:**
- `id` (UUID, PRIMARY KEY)
- `user_id` (UUID, NOT NULL) - users(id)を参照、CASCADE削除
- `date` (TEXT, NOT NULL)
- `time` (TEXT, NOT NULL)
- `category` (TEXT, NOT NULL)
- `location` (TEXT, NOT NULL)
- `content` (TEXT, NOT NULL)
- `attachments` (JSONB, DEFAULT '[]')
- `medical` (JSONB)
- `comments` (JSONB, DEFAULT '[]')
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())
- `updated_at` (TIMESTAMPTZ, DEFAULT NOW())

**インデックス:**
- `idx_logs_user_id` on `user_id`
- `idx_logs_user_id_created_at` on `user_id, created_at DESC`
- `idx_logs_user_id_category` on `user_id, category`
- `idx_logs_user_id_category_created_at` on `user_id, category, created_at DESC`
- `idx_logs_date` on `date`

**RLSポリシー:**
- SELECT: 自分のログのみ閲覧可能 (`auth.uid() = user_id`)
- INSERT: 自分のログのみ挿入可能 (`auth.uid() = user_id`)
- UPDATE: 自分のログのみ更新可能 (`auth.uid() = user_id`)
- DELETE: 自分のログのみ削除可能 (`auth.uid() = user_id`)

---

### 3. `premium_subscriptions` テーブル
プレミアムサブスクリプション情報

**カラム:**
- `id` (UUID, PRIMARY KEY)
- `user_id` (UUID, NOT NULL) - users(id)を参照、CASCADE削除
- `plan_type` (TEXT, NOT NULL) - CHECK: 'free' or 'premium'
- `start_date` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW())
- `end_date` (TIMESTAMPTZ)
- `status` (TEXT, NOT NULL) - CHECK: 'active', 'cancelled', 'expired', DEFAULT 'active'
- `stripe_subscription_id` (TEXT)
- `stripe_customer_id` (TEXT)
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())
- `updated_at` (TIMESTAMPTZ, DEFAULT NOW())

**インデックス:**
- `idx_premium_user_id` on `user_id`
- `idx_premium_user_status` on `user_id, status`
- `idx_premium_user_status_end_date` on `user_id, status, end_date DESC`

**RLSポリシー:**
- SELECT: 自分のサブスクリプションのみ閲覧可能 (`auth.uid() = user_id`)

---

### 4. `board_posts` テーブル
掲示板の投稿

**カラム:**
- `id` (UUID, PRIMARY KEY)
- `user_id` (UUID) - users(id)を参照、SET NULL削除
- `author` (TEXT, NOT NULL, DEFAULT '匿名')
- `title` (TEXT, NOT NULL)
- `content` (TEXT, NOT NULL)
- `category` (TEXT, NOT NULL) - CHECK: 'question', 'consultation', 'information', 'experience', 'other'
- `reactions` (JSONB, DEFAULT '{"like": 0, "thumbsUp": 0}')
- `replies` (JSONB, DEFAULT '[]')
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())
- `updated_at` (TIMESTAMPTZ, DEFAULT NOW())

**インデックス:**
- `idx_board_posts_category` on `category`
- `idx_board_posts_created_at` on `created_at DESC`
- `idx_board_posts_category_created_at` on `category, created_at DESC`

**RLSポリシー:**
- SELECT: 認証済みユーザーは全投稿を閲覧可能 (`authenticated`)
- INSERT: 認証済みユーザーは投稿可能 (`authenticated`)
- UPDATE: 自分の投稿のみ更新可能 (`auth.uid() = user_id`)
- DELETE: 自分の投稿のみ削除可能 (`auth.uid() = user_id`)

---

### 5. `messages` テーブル
メッセージ（通知など）

**カラム:**
- `id` (UUID, PRIMARY KEY)
- `user_id` (TEXT, NOT NULL)
- `from_name` (TEXT, NOT NULL, DEFAULT 'Riko-Log事務局')
- `subject` (TEXT, NOT NULL)
- `body` (TEXT, NOT NULL)
- `read` (BOOLEAN, DEFAULT FALSE)
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())

**インデックス:**
- `idx_messages_user_id` on `user_id`
- `idx_messages_user_id_created_at` on `user_id, created_at DESC`
- `idx_messages_read` on `read`

**RLSポリシー:**
- SELECT: 自分のメッセージまたは全員向けメッセージ(`*`)を閲覧可能
- UPDATE: 自分のメッセージまたは全員向けメッセージ(`*`)を更新可能

---

### 6. `stripe_checkout_sessions` テーブル
Stripeチェックアウトセッションの追跡

**カラム:**
- `id` (UUID, PRIMARY KEY)
- `session_id` (TEXT, NOT NULL, UNIQUE)
- `user_id` (UUID, NOT NULL) - users(id)を参照、CASCADE削除
- `status` (TEXT, NOT NULL) - CHECK: 'pending', 'completed', 'expired', DEFAULT 'pending'
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())
- `updated_at` (TIMESTAMPTZ, DEFAULT NOW())

**インデックス:**
- `idx_stripe_sessions_user_id` on `user_id`
- `idx_stripe_sessions_session_id` on `session_id`

**RLSポリシー:**
- SELECT: 自分のセッションのみ閲覧可能 (`auth.uid() = user_id`)

---

### 7. `email_leads` テーブル（新規追加）
ランディングページからのメールアドレス収集

**カラム:**
- `id` (UUID, PRIMARY KEY)
- `email` (TEXT, NOT NULL, UNIQUE)
- `source` (TEXT, DEFAULT 'landing_page')
- `purpose` (TEXT) - 利用目的（任意）
- `subscribed_at` (TIMESTAMPTZ, DEFAULT NOW())
- `notified` (BOOLEAN, DEFAULT FALSE)
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())
- `updated_at` (TIMESTAMPTZ, DEFAULT NOW())

**インデックス:**
- `idx_email_leads_email` on `email`
- `idx_email_leads_subscribed_at` on `subscribed_at DESC`
- `idx_email_leads_notified` on `notified`

**RLSポリシー:**
- INSERT: 誰でも（anon, authenticated）メールアドレスを登録可能 (`WITH CHECK (true)`)
- SELECT: 認証済みユーザーは自分のメールアドレスのみ確認可能

---

## Edge Functions

### 1. `create-checkout-session`
Stripeチェックアウトセッションを作成

### 2. `send-welcome-email`
ウェルカムメールを送信（Resend API使用）

### 3. `stripe-webhook`
StripeのWebhookを処理

---

## Storage バケット

### 1. `users` バケット
ユーザーのプロフィール画像など

**ポリシー:**
- INSERT: 自分のフォルダにのみアップロード可能
- SELECT: 自分のフォルダのファイルのみ閲覧可能
- DELETE: 自分のフォルダのファイルのみ削除可能

### 2. `logs` バケット
ログの添付ファイル（写真、録音、動画など）

**ポリシー:**
- INSERT: 自分のフォルダにのみアップロード可能
- SELECT: 自分のフォルダのファイルのみ閲覧可能
- DELETE: 自分のフォルダのファイルのみ削除可能

---

## テーブル間の関係

```
auth.users (Supabase Auth)
  └─ users (id参照)
      ├─ logs (user_id参照、CASCADE削除)
      ├─ premium_subscriptions (user_id参照、CASCADE削除)
      ├─ board_posts (user_id参照、SET NULL削除)
      └─ stripe_checkout_sessions (user_id参照、CASCADE削除)

email_leads (独立テーブル、認証不要)
messages (独立テーブル、user_idはTEXT)
```

---

## 注意事項

1. **RLS (Row Level Security)**: すべてのテーブルでRLSが有効
2. **外部キー制約**: 適切に設定されており、CASCADE削除またはSET NULL削除が設定されている
3. **インデックス**: パフォーマンス最適化のため、主要なカラムにインデックスが設定されている
4. **email_leadsテーブル**: 認証不要で誰でもINSERT可能（ランディングページ用）

