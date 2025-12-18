import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 目的: 安定してビルド/プレビューできる最小構成
// PWAの見た目（アイコン/名称）は `public/manifests/*` と `public/disguises/*` をHTML/JSで切替します。
export default defineConfig({
  plugins: [react()],
  server: {
    // localhost が ::1（IPv6）に解決される環境で EPERM になるケースがあるため IPv4 に固定
    host: '127.0.0.1',
    port: 5173,
    strictPort: false,
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  },
  publicDir: 'public',
  assetsInclude: ['**/*.TTF', '**/*.ttf'],
});
