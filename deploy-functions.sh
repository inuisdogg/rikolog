#!/bin/bash
# Edge Functions デプロイスクリプト

echo "=========================================="
echo "Supabase Edge Functions デプロイスクリプト"
echo "=========================================="
echo ""

# プロジェクトディレクトリに移動
cd "$(dirname "$0")"

# Supabase CLIの確認
if ! command -v supabase &> /dev/null; then
    echo "⚠️  Supabase CLIが見つかりません。"
    echo ""
    echo "以下のコマンドでインストールしてください："
    echo "  npm install -g supabase"
    echo ""
    echo "または、npxを使用："
    echo "  npx supabase --version"
    echo ""
    read -p "npxを使用しますか？ (y/n): " use_npx
    if [ "$use_npx" = "y" ]; then
        SUPABASE_CMD="npx supabase"
    else
        echo "Supabase CLIをインストールしてから再度実行してください。"
        exit 1
    fi
else
    SUPABASE_CMD="supabase"
fi

echo "✅ Supabase CLIが見つかりました"
echo ""

# ログイン確認
echo "📝 Supabaseにログインします..."
echo "   （ブラウザが開きます）"
$SUPABASE_CMD login

if [ $? -ne 0 ]; then
    echo "❌ ログインに失敗しました"
    exit 1
fi

echo ""
echo "✅ ログイン成功"
echo ""

# プロジェクトリンク
echo "🔗 プロジェクトをリンクします..."
echo "   プロジェクト参照ID: sqdfjudhaffivdaxulsn"
$SUPABASE_CMD link --project-ref sqdfjudhaffivdaxulsn

if [ $? -ne 0 ]; then
    echo "❌ プロジェクトのリンクに失敗しました"
    exit 1
fi

echo ""
echo "✅ プロジェクトリンク成功"
echo ""

# 環境変数の確認
echo "⚙️  環境変数の設定を確認してください："
echo ""
echo "Supabaseダッシュボードで、各Edge Functionに以下の環境変数を設定してください："
echo ""
echo "  STRIPE_SECRET_KEY=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"
echo "  SUPABASE_URL=https://sqdfjudhaffivdaxulsn.supabase.co"
echo "  SUPABASE_SERVICE_ROLE_KEY=（Supabaseダッシュボードの「Settings」→「API」から取得）"
echo ""
read -p "環境変数を設定しましたか？ (y/n): " env_set
if [ "$env_set" != "y" ]; then
    echo "⚠️  環境変数を設定してから再度実行してください。"
    echo "   詳細は DEPLOY_EDGE_FUNCTIONS.md を参照してください。"
    exit 1
fi

echo ""
echo "🚀 Edge Functionsをデプロイします..."
echo ""

# create-checkout-session関数をデプロイ
echo "📦 create-checkout-session をデプロイ中..."
$SUPABASE_CMD functions deploy create-checkout-session --no-verify-jwt

if [ $? -ne 0 ]; then
    echo "❌ create-checkout-session のデプロイに失敗しました"
    exit 1
fi

echo ""
echo "✅ create-checkout-session デプロイ成功"
echo ""

# stripe-webhook関数をデプロイ
echo "📦 stripe-webhook をデプロイ中..."
$SUPABASE_CMD functions deploy stripe-webhook --no-verify-jwt

if [ $? -ne 0 ]; then
    echo "❌ stripe-webhook のデプロイに失敗しました"
    exit 1
fi

echo ""
echo "✅ stripe-webhook デプロイ成功"
echo ""

echo "=========================================="
echo "✅ すべてのEdge Functionsのデプロイが完了しました！"
echo "=========================================="
echo ""
echo "次のステップ："
echo "1. Supabaseダッシュボードで、関数が正常にデプロイされているか確認"
echo "2. アプリでプレミアムプランのボタンを押して、Stripe Checkoutページにリダイレクトされるか確認"
echo ""


