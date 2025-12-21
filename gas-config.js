// Google Apps Script (GAS) の設定
// 環境変数または直接設定してください

// GASのWebアプリURL（デプロイ後に取得したURL）
// 例: https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
export const GAS_WEB_APP_URL = import.meta.env.VITE_GAS_WEB_APP_URL || '';

// GASを使用するかどうか（環境変数で制御可能）
export const USE_GAS = import.meta.env.VITE_USE_GAS === 'true' || false;

console.log('GAS設定:', {
  url: GAS_WEB_APP_URL ? '設定済み' : '未設定',
  enabled: USE_GAS
});

