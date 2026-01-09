// Supabase設定ファイル
// 環境変数から設定を読み込む

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  const errorMsg = 'Missing Supabase environment variables. Please check your .env file.';
  console.error(errorMsg, {
    VITE_SUPABASE_URL: supabaseUrl,
    VITE_SUPABASE_ANON_KEY: supabaseAnonKey ? '設定済み' : '未設定',
  });
  throw new Error(errorMsg);
}

// Supabaseクライアントの作成
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    storageKey: 'sb-sqdfjudhaffivdaxulsn-auth-token',
    flowType: 'pkce',
  },
  global: {
    headers: {
      'x-client-info': 'riko-log-web',
    },
  },
});

export default supabase;

