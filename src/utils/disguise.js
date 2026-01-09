/**
 * PWA偽装（カモフラージュ）システムのユーティリティ
 */

export const DISGUISE_STORAGE_KEY = 'riko_disguise';
export const DEFAULT_DISGUISE = { id: 'calculator', title: '電卓' };

export const DISGUISE_PRESETS = [
  // 典型的なカモフラージュ
  { id: 'calculator', title: '電卓', keywords: ['電卓', '計算', 'calculator'] },
  { id: 'weather', title: '天気', keywords: ['天気', 'weather', '予報'] },
  { id: 'calendar', title: 'カレンダー', keywords: ['カレンダー', '予定', 'calendar'] },
  { id: 'clock', title: '時計', keywords: ['時計', 'clock', 'アラーム'] },
  { id: 'time', title: 'タイマー', keywords: ['タイマー', 'timer'] },
  { id: 'notes', title: 'メモ', keywords: ['メモ', 'ノート', 'notes'] },
  { id: 'reminders', title: 'リマインダー', keywords: ['リマインダー', 'reminders', '予定'] },
  { id: 'photos', title: '写真', keywords: ['写真', 'photos', 'アルバム'] },
  { id: 'mail', title: 'メール', keywords: ['メール', 'mail'] },
  { id: 'maps', title: 'マップ', keywords: ['マップ', 'maps', '地図'] },
  { id: 'messages', title: 'メッセージ', keywords: ['メッセージ', 'messages'] },
  { id: 'music', title: 'ミュージック', keywords: ['ミュージック', 'music'] },
  { id: 'podcasts', title: 'Podcast', keywords: ['podcast', 'ポッドキャスト'] },
  { id: 'tv', title: 'TV', keywords: ['tv', 'テレビ'] },
  { id: 'books', title: 'ブック', keywords: ['ブック', 'books', '読書'] },
  { id: 'stocks', title: '株価', keywords: ['株価', 'stocks'] },
  { id: 'appstore', title: 'App Store', keywords: ['app store', 'ストア'] },
  { id: 'facetime', title: 'FaceTime', keywords: ['facetime', '通話'] },
  // 数を増やす（汎用・自然系）
  { id: 'files', title: 'ファイル', keywords: ['ファイル', 'files', 'Finder'] },
  { id: 'documents', title: '書類', keywords: ['書類', 'documents'] },
  { id: 'downloads', title: 'ダウンロード', keywords: ['ダウンロード', 'downloads'] },
  { id: 'desktop', title: 'デスクトップ', keywords: ['デスクトップ', 'desktop'] },
  { id: 'favorites', title: 'お気に入り', keywords: ['お気に入り', 'favorites'] },
  { id: 'airdrop', title: 'AirDrop', keywords: ['airdrop'] },
  { id: 'bookmark', title: 'ブックマーク', keywords: ['ブックマーク', 'bookmark'] },
  { id: 'network', title: 'ネットワーク', keywords: ['ネットワーク', 'network'] },
  { id: 'folder', title: 'フォルダ', keywords: ['フォルダ', 'folder'] },
  { id: 'app', title: 'アプリ', keywords: ['アプリ', 'app'] },
  { id: 'settings', title: '設定', keywords: ['設定', 'settings'] },
  { id: 'accounts', title: 'アカウント', keywords: ['アカウント', 'accounts'] },
  { id: 'alert', title: 'お知らせ', keywords: ['お知らせ', 'alert', '通知'] },
  { id: 'trash', title: 'ゴミ箱', keywords: ['ゴミ箱', 'trash'] },
  { id: 'help', title: 'ヘルプ', keywords: ['ヘルプ', 'help'] },
  { id: 'browser', title: 'ブラウザ', keywords: ['ブラウザ', 'browser', 'URL'] },
  { id: 'security', title: 'セキュリティ', keywords: ['セキュリティ', 'security'] },
];

/**
 * JSON文字列を安全にパースする
 */
export function safeParseJSON(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

/**
 * 破損したJSONから部分的に復旧を試みる
 */
export function tryRecoverJSONFromSubstring(value, expected) {
  const s = typeof value === 'string' ? value : '';
  if (!s) return null;
  const open = expected === 'array' ? '[' : '{';
  const close = expected === 'array' ? ']' : '}';
  const start = s.indexOf(open);
  const end = s.lastIndexOf(close);
  if (start < 0 || end < 0 || end <= start) return null;
  const candidate = s.slice(start, end + 1);
  try {
    return JSON.parse(candidate);
  } catch {
    return null;
  }
}

/**
 * localStorageからJSONを安全に読み込む
 */
export function loadLocalStorageJSON(key, { expected, fallback }) {
  const raw = (() => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  })();
  if (!raw) return { value: fallback, recovered: false, raw: null };

  const direct = safeParseJSON(raw);
  const okDirect =
    expected === 'array' ? Array.isArray(direct) : direct && typeof direct === 'object' && !Array.isArray(direct);
  if (okDirect) return { value: direct, recovered: false, raw };

  const recovered = tryRecoverJSONFromSubstring(raw, expected);
  const okRecovered =
    expected === 'array'
      ? Array.isArray(recovered)
      : recovered && typeof recovered === 'object' && !Array.isArray(recovered);
  if (okRecovered) {
    try {
      localStorage.setItem(key, JSON.stringify(recovered));
    } catch {
      // ignore
    }
    return { value: recovered, recovered: true, raw };
  }

  try {
    localStorage.setItem(`${key}_corrupt_backup`, raw);
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
  return { value: fallback, recovered: false, raw };
}

/**
 * プリセットIDから偽装設定を取得
 */
export function getDisguisePreset(id) {
  return DISGUISE_PRESETS.find(p => p.id === id) || DEFAULT_DISGUISE;
}

/**
 * 保存された偽装設定を読み込む
 */
export function readSavedDisguise() {
  try {
    const saved = safeParseJSON(localStorage.getItem(DISGUISE_STORAGE_KEY));
    if (saved?.id) return getDisguisePreset(saved.id);
  } catch {
    // ignore
  }
  return DEFAULT_DISGUISE;
}

/**
 * 偽装設定を保存
 */
export function saveDisguisePreset(preset) {
  try {
    localStorage.setItem(DISGUISE_STORAGE_KEY, JSON.stringify({ id: preset.id, title: preset.title }));
  } catch {
    // ignore
  }
}

/**
 * ドキュメントに偽装設定を適用
 */
export function applyDisguiseToDocument(preset) {
  if (!preset?.id) return;
  const v = Date.now();
  const manifestLink = document.getElementById('app-manifest');
  if (manifestLink) manifestLink.setAttribute('href', `/manifests/${preset.id}.webmanifest?v=${v}`);

  const appleTouch = document.getElementById('app-apple-touch-icon');
  if (appleTouch) appleTouch.setAttribute('href', `/disguises/${preset.id}/icon-192.png?v=${v}`);

  const favicon = document.getElementById('app-favicon');
  if (favicon) favicon.setAttribute('href', `/disguises/${preset.id}/icon-192.png?v=${v}`);

  const appleTitle = document.getElementById('app-apple-title');
  if (appleTitle) appleTitle.setAttribute('content', preset.title);

  document.title = preset.title;

  const desc = document.getElementById('app-description');
  if (desc) desc.setAttribute('content', preset.title);
}

/**
 * スタンドアロンモードかどうかを判定
 */
export function isStandaloneMode() {
  try {
    return (
      (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
      window.navigator.standalone === true
    );
  } catch {
    return false;
  }
}
