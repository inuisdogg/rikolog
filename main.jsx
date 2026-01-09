import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import {
  DISGUISE_STORAGE_KEY,
  DEFAULT_DISGUISE,
  safeParseJSON,
  applyDisguiseToDocument
} from './src/utils/disguise.js';

// ============================================================================
// 初期化処理
// ============================================================================

// 初回レンダリング前に偽装設定を適用（ホーム画面追加時の反映率を上げるため）
// ただし、LPページ（/）ではmanifestを設定しない（LPからはPWAとして追加させない）
try {
  const currentPath = window.location.pathname;
  // /appページまたは/app/*の場合のみmanifestを設定
  if (currentPath.startsWith('/app')) {
    const saved = safeParseJSON(localStorage.getItem(DISGUISE_STORAGE_KEY));
    applyDisguiseToDocument(saved || DEFAULT_DISGUISE);
  } else {
    // LPページではmanifestを削除
    const manifestLink = document.getElementById('app-manifest');
    if (manifestLink) {
      manifestLink.remove();
    }
    // 既存のmanifestリンクを全て削除
    const allManifests = document.querySelectorAll('link[rel="manifest"]');
    allManifests.forEach(link => link.remove());
  }
} catch {
  // プライベートモード等でlocalStorageが使えない場合は無視
}

// ============================================================================
// Service Worker設定（PWA用）
// ============================================================================
// 開発中にSWが残っていると「真っ白」「直らない」「データが消えたように見える」原因になりやすい
// そのため、DEVでは登録解除＋キャッシュ削除、本番のみ登録する

if ('serviceWorker' in navigator) {
  if (import.meta.env.DEV) {
    // 開発環境: Service Workerを登録解除してキャッシュをクリア
    navigator.serviceWorker.getRegistrations?.().then((regs) => {
      regs.forEach((r) => r.unregister());
    });
    
    if (typeof caches !== 'undefined') {
      caches.keys().then((keys) => {
        Promise.all(keys.map((k) => caches.delete(k)));
      });
    }
  } else if (import.meta.env.PROD) {
    // 本番環境: Service Workerを登録
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // 登録失敗は無視
      });
    });
  }
}

// フォントを明示的に読み込む
if (document.fonts) {
  const fontFace = new FontFace('AKACHANalphabet', 'url(/fonts/AKACHANa.TTF)');
  fontFace.load()
    .then((loadedFont) => {
      document.fonts.add(loadedFont);
    })
    .catch(() => {
      // フォント読み込み失敗時はフォールバックフォントを使用
    });
}

// ============================================================================
// React アプリケーションのレンダリング
// ============================================================================

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
