import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 目的: 安定してビルド/プレビューできる最小構成
// PWAの見た目（アイコン/名称）は `public/manifests/*` と `public/disguises/*` をHTML/JSで切替します。
export default defineConfig({
  plugins: [react()],
  server: {
    // スマホからアクセスできるように 0.0.0.0 でリッスン
    host: '0.0.0.0',
    port: 5173,
    strictPort: false,
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  },
  publicDir: 'public',
  assetsInclude: ['**/*.TTF', '**/*.ttf'],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Reactコア
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // PDF生成（大きいライブラリ）
          'vendor-pdf': ['@react-pdf/renderer', 'jspdf', 'html2canvas'],
          // Supabase
          'vendor-supabase': ['@supabase/supabase-js'],
          // Stripe
          'vendor-stripe': ['@stripe/stripe-js'],
          // アイコン
          'vendor-icons': ['lucide-react'],
        },
      },
    },
    // チャンクサイズ警告のしきい値を調整
    chunkSizeWarningLimit: 600,
  },
});
