import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// ============================================================================
// PWA偽装設定（アイコン/名称の動的切替）
// ============================================================================
// localStorage の選択に応じて、manifest / favicon / apple-touch-icon / title を差し替える
// 注意: インストール済み後のアイコン/名称は変更できないため、削除→再追加が必要

const DISGUISE_STORAGE_KEY = 'riko_disguise';
const DEFAULT_DISGUISE = { id: 'calculator', title: '電卓' };

/**
 * JSON文字列を安全にパースする
 * @param {string} value - パースするJSON文字列
 * @returns {object|null} パース結果、失敗時はnull
 */
function safeParseJSON(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

/**
 * ドキュメントに偽装設定を適用する
 * @param {object} disguise - 偽装設定オブジェクト { id, title }
 */
function applyDisguiseToDocument(disguise) {
  if (!disguise?.id) return;
  
  const id = disguise.id;
  const title = disguise.title || DEFAULT_DISGUISE.title;
  const v = Date.now();

  // Manifestの更新
  const manifestLink = document.getElementById('app-manifest');
  if (manifestLink) {
    manifestLink.setAttribute('href', `/manifests/${id}.webmanifest?v=${v}`);
  }

  // Apple Touch Iconの更新
  const appleTouch = document.getElementById('app-apple-touch-icon');
  if (appleTouch) {
    appleTouch.setAttribute('href', `/disguises/${id}/icon-192.png?v=${v}`);
  }

  // Faviconの更新
  const favicon = document.getElementById('app-favicon');
  if (favicon) {
    favicon.setAttribute('href', `/disguises/${id}/icon-192.png?v=${v}`);
  }

  // Apple Web App Titleの更新
  const appleTitle = document.getElementById('app-apple-title');
  if (appleTitle) {
    appleTitle.setAttribute('content', title);
  }

  // ドキュメントタイトルの更新
  document.title = title;

  // メタディスクリプションの更新
  const desc = document.getElementById('app-description');
  if (desc) {
    desc.setAttribute('content', title);
  }
}

// ============================================================================
// 初期化処理
// ============================================================================

// 初回レンダリング前に偽装設定を適用（ホーム画面追加時の反映率を上げるため）
try {
  const saved = safeParseJSON(localStorage.getItem(DISGUISE_STORAGE_KEY));
  applyDisguiseToDocument(saved || DEFAULT_DISGUISE);
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

// ============================================================================
// React アプリケーションのレンダリング
// ============================================================================

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
