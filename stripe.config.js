// Stripe設定ファイル
// 環境変数から設定を読み込む

import { loadStripe } from '@stripe/stripe-js';

const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

if (!stripePublishableKey) {
  console.warn('Stripe公開キーが設定されていません。プレミアムプランの決済機能は使用できません。');
}

// Stripeインスタンスの作成
export const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null;

// プレミアムプランの価格ID（Stripeダッシュボードで作成した価格IDを設定）
// 月額450円のサブスクリプション価格ID
// 環境変数VITE_STRIPE_PRICE_IDが設定されていない場合は、Stripeダッシュボードで価格を作成してから設定してください
export const PREMIUM_PRICE_ID = import.meta.env.VITE_STRIPE_PRICE_ID || '';

// Supabase Edge FunctionのURL
export const SUPABASE_FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_URL 
  ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`
  : '';

export default stripePromise;

