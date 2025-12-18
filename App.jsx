import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PDFDownloadLink, BlobProvider } from '@react-pdf/renderer';
import { StatementDocument } from './StatementPDF.jsx';
import { buildStatementDataFromLogs } from './statementTransform.js';
import { 
  ShieldAlert, 
  Plus, 
  FileText, 
  Users, 
  Lock, 
  MapPin, 
  Camera, 
  LogOut,
  Send,
  Mic,
  Video,
  Image as ImageIcon,
  X,
  Mail,       
  Bell,       
  TrendingUp, 
  Calendar,   
  User,
  ScanFace,
  Fingerprint,
  LifeBuoy,   
  Phone,      
  ExternalLink,
  Database,
  Clock,
  CheckCircle,
  Home,
  Sparkles,
  ArrowLeft,
  MessageSquare,
  Heart,
  ThumbsUp,
  Reply,
  Building2,
  Briefcase,
  HeartHandshake,
  CreditCard,
  Crown,
  XCircle,
  CheckCircle2,
  ChevronRight,
  Edit,
  Save,
  MessageCircle,
  Trash2,
  Search,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';

// --- PWA偽装（ホーム画面追加時の名称/アイコン切替） ---
const DISGUISE_STORAGE_KEY = 'riko_disguise';
const DEFAULT_DISGUISE = { id: 'calculator', title: '電卓' };

const DISGUISE_PRESETS = [
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

function safeParseJSON(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function tryRecoverJSONFromSubstring(value, expected) {
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

function loadLocalStorageJSON(key, { expected, fallback }) {
  // expected: 'array' | 'object'
  // 1) 通常パース
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

  // 2) 破損JSONの“部分復旧”（クラッシュ等で末尾にゴミが混ざるケース）
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

  // 3) 復旧不能ならバックアップ退避して初期化（アプリが落ち続けるのを防ぐ）
  try {
    localStorage.setItem(`${key}_corrupt_backup`, raw);
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
  return { value: fallback, recovered: false, raw };
}

function getDisguisePreset(id) {
  return DISGUISE_PRESETS.find(p => p.id === id) || DEFAULT_DISGUISE;
}

function readSavedDisguise() {
  try {
    const saved = safeParseJSON(localStorage.getItem(DISGUISE_STORAGE_KEY));
    if (saved?.id) return getDisguisePreset(saved.id);
  } catch {
    // ignore
  }
  return DEFAULT_DISGUISE;
}

function saveDisguisePreset(preset) {
  try {
    localStorage.setItem(DISGUISE_STORAGE_KEY, JSON.stringify({ id: preset.id, title: preset.title }));
  } catch {
    // ignore
  }
}

function applyDisguiseToDocument(preset) {
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

function isStandaloneMode() {
  try {
    return (
      (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
      window.navigator.standalone === true
    );
  } catch {
    return false;
  }
}

// --- プレミアムプランチェック ---
function checkPremiumStatus() {
  try {
    const premium = localStorage.getItem('riko_premium');
    if (!premium) return false;
    const data = JSON.parse(premium);
    if (!data.expiresAt || data.status !== 'active') return false;
    return new Date(data.expiresAt) > new Date();
  } catch {
    return false;
  }
}

// プラン管理ユーティリティ
const PLAN_TYPES = {
  FREE: 'free',
  PREMIUM: 'premium'
};

function getUserPlan() {
  return checkPremiumStatus() ? PLAN_TYPES.PREMIUM : PLAN_TYPES.FREE;
}

// 無料プランの制限
const FREE_PLAN_LIMITS = {
  // メディア保存：写真のみ（容量制限あり）
  ALLOWED_MEDIA_TYPES: ['image'], // 写真のみ
  MAX_ATTACHMENTS: 3,
  MAX_FILE_SIZE_MB: 10,
  // PDF出力：1ページ目まで無料＋透かし
  PDF_MAX_PAGES_FREE: 1,
  PDF_WATERMARK: 'SAMPLE',
  // メディア保存：ローカル保存のみ（クラウド保存は不可）
  CLOUD_STORAGE_ENABLED: false
};

// --- 1. カモフラージュ用 電卓モード ---
const CalculatorMode = ({ onUnlock }) => {
  const [display, setDisplay] = useState("0");
  const PASSCODE = "7777"; // 解除コード

  const handlePress = (val) => {
    if (val === "C") {
      setDisplay("0");
    } else if (val === "=") {
      if (display === PASSCODE) {
        onUnlock();
      } else {
        try {
          // eslint-disable-next-line no-new-func
          const result = new Function('return ' + display)();
          setDisplay(result.toString());
        } catch {
          setDisplay("Error");
        }
      }
    } else {
      setDisplay(display === "0" ? val : display + val);
    }
  };

  const buttons = [
    "7", "8", "9", "/",
    "4", "5", "6", "*",
    "1", "2", "3", "-",
    "C", "0", "=", "+"
  ];

  return (
    <div className="h-screen w-full flex flex-col bg-black text-white p-4 font-sans lg:max-w-md lg:h-auto lg:min-h-[600px] lg:mx-auto lg:shadow-2xl lg:rounded-xl lg:my-8">
      <div className="flex-1 flex items-end justify-end p-6 text-6xl font-light font-mono break-all lg:min-h-[200px]">
        {display}
      </div>
      <div className="grid grid-cols-4 gap-4 h-3/5 pb-8 lg:h-auto lg:min-h-[400px]">
        {buttons.map((btn, i) => (
          <button 
            key={i}
            onClick={() => handlePress(btn)}
            className={`text-2xl rounded-full flex items-center justify-center shadow-lg
              ${btn === "=" || ["/","*","-","+"].includes(btn) ? "bg-orange-500 text-white" : "bg-gray-800 text-white"}
              ${btn === "0" ? "col-span-2 aspect-[2/1]" : "aspect-square"}
              active:opacity-70 transition-opacity
            `}
          >
            {btn}
          </button>
        ))}
      </div>
    </div>
  );
};

// --- 2. 認証 & プロフィール登録画面 ---
const AuthScreen = ({ onLogin }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [isBiometricLoading, setIsBiometricLoading] = useState(false); 
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    reason: "性格の不一致",
    targetDate: "",
    situation: ""
  });

  const handleSubmit = () => {
    try {
      if (!formData.email || !formData.password) {
        alert("メールアドレスとパスワードを入力してください（デモ用のため任意の値で構いません）");
        return;
      }
    
      const userProfile = {
        ...formData,
        id: "user_" + Math.random().toString(36).substr(2, 9),
        registeredAt: new Date().toISOString()
      };
      
      console.log("ユーザープロフィールを保存中:", userProfile);
      localStorage.setItem("riko_user", JSON.stringify(userProfile));
      console.log("localStorageに保存完了");
      console.log("onLoginを呼び出し中...");
      onLogin(userProfile);
      console.log("onLogin呼び出し完了");
    } catch (error) {
      console.error("ログイン処理でエラーが発生しました:", error);
      alert("ログイン処理中にエラーが発生しました。もう一度お試しください。");
    }
  };

  const handleBiometricLogin = () => {
    setIsBiometricLoading(true);
    setTimeout(() => {
      setIsBiometricLoading(false);
        const savedUser = localStorage.getItem("riko_user");
        if (savedUser) {
        onLogin(JSON.parse(savedUser));
        } else {
        alert("アカウントが見つかりません。まずはフォームからログイン（新規登録）してください。");
      }
    }, 1500);
  };

  return (
    <div className="h-screen bg-slate-50 p-4 sm:p-6 flex flex-col justify-center overflow-y-auto" style={{ width: '100%', maxWidth: '100%' }}>
      <div className="text-center mb-6 sm:mb-8">
        <div className="inline-block p-3 sm:p-4 bg-slate-900 rounded-full mb-3 sm:mb-4 shadow-xl">
          <ShieldAlert size={40} className="text-pink-500 sm:w-12 sm:h-12" />
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-wider">Riko-Log</h1>
        <p className="text-[10px] sm:text-xs text-gray-500 mt-1 sm:mt-2">事実を記録し、あなたを守る。</p>
      </div>

      <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg space-y-3 sm:space-y-4 max-w-md lg:max-w-lg mx-auto w-full">
        <h2 className="text-base sm:text-lg font-bold text-center mb-3 sm:mb-4 text-slate-800">{isRegister ? "アカウント作成" : "ログイン"}</h2>
        
          {!isRegister && (
          <div className="bg-slate-50 p-2 sm:p-3 rounded text-[10px] sm:text-xs text-slate-600 mb-3 sm:mb-4 border border-slate-200">
              <strong>デモ用アカウント:</strong><br/>
              ID: demo@example.com / Pass: 1234
            </div>
          )}

          {!isRegister && (
          <div className="mb-4 sm:mb-6 pb-4 sm:pb-6 border-b border-gray-100">
              <button 
                onClick={handleBiometricLogin}
                disabled={isBiometricLoading}
              className="w-full bg-slate-100 text-slate-700 font-bold py-2 sm:py-3 rounded-lg border border-slate-200 flex items-center justify-center gap-2 hover:bg-slate-200 transition relative overflow-hidden text-xs sm:text-sm"
              >
                {isBiometricLoading ? (
                  <>
                  <span className="animate-pulse">Face ID 認証中...</span>
                  </>
                ) : (
                  <>
                  <ScanFace size={18} className="sm:w-5 sm:h-5" /> Face ID でログイン
                  </>
                )}
              </button>
            </div>
          )}

          <input 
            type="email" 
            placeholder="メールアドレス" 
          className="w-full bg-gray-50 border border-gray-200 p-2 sm:p-3 rounded text-xs sm:text-sm"
            value={formData.email}
            onChange={e => setFormData({...formData, email: e.target.value})}
          />
          <input 
            type="password" 
            placeholder="パスワード" 
          className="w-full bg-gray-50 border border-gray-200 p-2 sm:p-3 rounded text-xs sm:text-sm"
            value={formData.password}
            onChange={e => setFormData({...formData, password: e.target.value})}
          />

          {isRegister && (
          <div className="space-y-3 sm:space-y-4 pt-2 border-t border-gray-100 animate-fade-in">
            <div>
                <label className="block text-[10px] sm:text-xs font-bold text-gray-500 mb-1">記録の主な目的（任意）</label>
                <select 
                className="w-full bg-gray-50 border border-gray-200 p-2 sm:p-3 rounded text-xs sm:text-sm"
                  value={formData.reason}
                  onChange={e => setFormData({...formData, reason: e.target.value})}
                >
                  <option>現状の記録・整理</option>
                  <option>性格の不一致の記録</option>
                  <option>不貞・浮気の調査</option>
                  <option>精神的苦痛（モラハラ）の記録</option>
                  <option>金銭トラブルの記録</option>
                  <option>その他</option>
                </select>
              </div>

            <div>
                <label className="block text-[10px] sm:text-xs font-bold text-gray-500 mb-1">解決目標時期（任意）</label>
                <input 
                  type="date" 
                className="w-full bg-gray-50 border border-gray-200 p-2 sm:p-3 rounded text-xs sm:text-sm"
                  value={formData.targetDate}
                  onChange={e => setFormData({...formData, targetDate: e.target.value})}
                />
              </div>
            </div>
          )}

          <button 
            onClick={handleSubmit}
          className="w-full bg-pink-600 text-white font-bold py-2 sm:py-3 rounded shadow-lg hover:bg-pink-700 transition mt-3 sm:mt-4 text-xs sm:text-sm"
          >
            {isRegister ? "利用を開始する" : "ログイン"}
          </button>

          <button 
            onClick={() => setIsRegister(!isRegister)}
          className="w-full text-xs text-gray-500 py-2 hover:text-slate-900"
          >
            {isRegister ? "ログイン画面へ戻る" : "新規登録はこちら"}
          </button>
      </div>
    </div>
  );
};

// --- 3. セーフティ/ヘルプ画面 ---
const SafetyView = () => {
  const [resetting, setResetting] = useState(false);

  const resetCacheAndReload = async () => {
    setResetting(true);
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }
      if (window.caches?.keys) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } catch {
      // ignore
    } finally {
      setResetting(false);
      window.location.reload();
    }
  };

  return (
    <div className="p-4 pb-24 animate-fade-in">
      <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded mb-6">
        <h2 className="text-lg font-bold text-red-700 flex items-center gap-2 mb-2">
          <LifeBuoy size={24} /> 緊急時の安全基地
        </h2>
        <p className="text-xs text-red-800">
          身の危険を感じたり、どうすればいいか分からなくなった時は、迷わずここを使ってください。
        </p>
      </div>

      <div className="space-y-4">
        {/* トラブルシューティング */}
        <section>
          <h3 className="text-sm font-bold text-gray-500 mb-2">トラブルシューティング</h3>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <div className="text-xs text-gray-600 leading-relaxed">
              画面が更新されない/機能が消えたように見える場合、PWAのキャッシュが原因のことがあります。
            </div>
            <button
              onClick={resetCacheAndReload}
              disabled={resetting}
              className={`mt-3 w-full font-bold py-2.5 rounded-lg text-xs ${
                resetting ? 'bg-gray-200 text-gray-500' : 'bg-slate-900 hover:bg-slate-800 text-white'
              }`}
            >
              {resetting ? 'リセット中…' : 'キャッシュをリセットして再読み込み'}
            </button>
          </div>
        </section>

        {/* 緊急連絡先 */}
        <section>
          <h3 className="text-sm font-bold text-gray-500 mb-2 flex items-center gap-1"><Phone size={16}/> 緊急連絡先</h3>
          <div className="grid grid-cols-1 gap-3">
            <button className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex justify-between items-center active:bg-gray-50">
              <div className="text-left">
                <div className="font-bold text-slate-900">警察（事件・事故）</div>
                <div className="text-xs text-gray-500">緊急時は迷わず通報を</div>
              </div>
              <div className="text-xl font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded">110</div>
            </button>
            <button className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex justify-between items-center active:bg-gray-50">
              <div className="text-left">
                <div className="font-bold text-slate-900">DV相談ナビ</div>
                <div className="text-xs text-gray-500">最寄りの相談機関へ接続</div>
              </div>
              <div className="text-xl font-bold text-pink-600 bg-pink-50 px-3 py-1 rounded">#8008</div>
            </button>
            <button className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex justify-between items-center active:bg-gray-50">
              <div className="text-left">
                <div className="font-bold text-slate-900">警察相談専用電話</div>
                <div className="text-xs text-gray-500">緊急ではないが相談したい時</div>
              </div>
              <div className="text-xl font-bold text-gray-600 bg-gray-100 px-3 py-1 rounded">#9110</div>
            </button>
          </div>
        </section>

        {/* 役立つリンク */}
        <section>
          <h3 className="text-sm font-bold text-gray-500 mb-2 flex items-center gap-1"><ExternalLink size={16}/> 支援機関・情報</h3>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-3 border-b flex justify-between items-center hover:bg-gray-50 cursor-pointer">
              <span className="text-sm font-bold">法テラス（法的トラブル解決）</span>
              <ExternalLink size={14} className="text-gray-400" />
            </div>
            <div className="p-3 border-b flex justify-between items-center hover:bg-gray-50 cursor-pointer">
              <span className="text-sm font-bold">内閣府：DV相談プラス</span>
              <ExternalLink size={14} className="text-gray-400" />
            </div>
            <div className="p-3 flex justify-between items-center hover:bg-gray-50 cursor-pointer">
              <span className="text-sm font-bold">全国の女性センター一覧</span>
              <ExternalLink size={14} className="text-gray-400" />
            </div>
          </div>
        </section>

        {/* 緊急時の知恵袋 */}
        <section>
          <h3 className="text-sm font-bold text-gray-500 mb-2 flex items-center gap-1"><ShieldAlert size={16}/> 緊急避難のヒント</h3>
          <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 text-sm text-orange-900 space-y-2">
            <p><strong>🏃‍♀️ 逃げる時の持ち物:</strong><br/>現金、通帳、印鑑、健康保険証、身分証、スマホ、充電器、常備薬、子供の母子手帳。</p>
            <p><strong>🌐 履歴の消去:</strong><br/>このアプリや検索履歴は見られないように、こまめにシークレットモードを使うか、ログアウトしてください。</p>
            <p><strong>📱 位置情報:</strong><br/>iPhoneの「探す」機能や、Googleマップの共有設定が夫に知られていないか確認してください。</p>
          </div>
        </section>
      </div>
    </div>
  );
};

// --- AI慰謝料診断（単一フロー: 同意→質問→解析→結果） ---
const CompensationDiagnosisView = ({ logs, onClose }) => {
  const [step, setStep] = useState(0); // 0: Intro, 1..Q: Questions, Q+1: Loading, Q+2: PaymentGate, Q+3: Result
  const [consent, setConsent] = useState(false);
  const [answers, setAnswers] = useState({
    impact: "",
    situation: "",
    duration: "",
    marriage: "",
    status: "",
    children: "",
    income: "",
    medical: "",
  });
  const [result, setResult] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState(null); // 'lawyer' or 'report'

  const logCount = logs?.length || 0;
  const attachmentCount = (logs || []).reduce(
    (sum, l) => sum + (Array.isArray(l?.attachments) ? l.attachments.length : 0),
    0
  );

  const questions = useMemo(
    () => [
      {
        key: "impact",
        title: "生活への影響は、どれが一番大きいですか？",
        subtitle: "「何がどれだけ壊れたか」が増額要素になりやすいです。",
        options: ["通院・診断書がある", "不眠/強いストレスが続く", "仕事/家事が回らない", "子どもに大きな影響", "まだ分からない/軽微"],
      },
      {
        key: "situation",
        title: "起きている問題は、どれが中心ですか？",
        subtitle: "中心の出来事により、相場レンジが変わります。",
        options: ["暴言・威圧（強い支配）", "暴力（DV）", "不貞（浮気）", "生活費/経済（未払い等）", "育児の放棄/妨害", "その他"],
      },
      {
        key: "duration",
        title: "いつ頃から続いていますか？",
        subtitle: "継続期間と頻度は、慰謝料・勝率の両方に影響します。",
        options: ["1ヶ月未満", "1〜3ヶ月", "3〜6ヶ月", "半年〜1年", "1年以上", "3年以上"],
      },
      {
        key: "marriage",
        title: "婚姻期間（目安）はどのくらいですか？",
        subtitle: "長いほど上振れしやすい傾向があります。",
        options: ["未婚/事実婚", "3年未満", "3〜5年", "5〜10年", "10年以上", "20年以上"],
      },
      {
        key: "status",
        title: "現在の状況は？",
        subtitle: "別居・調停・裁判の段階で必要な証拠の種類が変わります。",
        options: ["未別居", "別居中", "調停中", "裁判中", "離婚済"],
      },
      {
        key: "children",
        title: "未成年のお子様はいますか？",
        subtitle: "監護状況・養育費と絡むため、見立てが変わります。",
        options: ["いない", "1人", "2人以上", "妊娠中", "非公開/分からない"],
      },
      {
        key: "income",
        title: "相手方の年収（推定）は？",
        subtitle: "裁量で上振れするケースがあります（※必ずしも比例しません）。",
        options: ["300万円未満", "300〜500万円", "500〜800万円", "800万円以上", "不明"],
      },
      {
        key: "medical",
        title: "医療的な裏付けはありますか？",
        subtitle: "診断書・通院歴は増額/勝率に影響しやすいです。",
        options: ["診断書がある", "通院中（診断書は未）", "受診予定", "なし/不明"],
      },
    ],
    []
  );

  const analyze = () => {
    const reasons = [];

    // 証拠・記録量スコア
    // 添付証拠に加え、医療記録（診断書・通院等）も“証拠力”として加点
    const medicalEvidenceScore = (logs || []).reduce((sum, log) => {
      const med = log?.medical;
      if (!med) return sum;
      const proofs = Array.isArray(med.proofs) ? med.proofs : [];
      let s = 0;
      if (proofs.includes("診断書")) s += 10;
      if (proofs.includes("通院履歴/明細")) s += 6;
      if (proofs.includes("領収書")) s += 4;
      if (proofs.includes("処方箋/薬袋")) s += 4;
      if (proofs.includes("休職/就労制限の資料")) s += 8;
      if (med.visitType === "入院") s += 8;
      return sum + s;
    }, 0);
    const evidenceScore = Math.min(attachmentCount * 6, 35) + Math.min(medicalEvidenceScore, 20);
    const logScore = Math.min(logCount * 2, 20);
    if (logCount >= 10) reasons.push("記録が一定量あり、事実の積み上げに有利です。");
    if (attachmentCount >= 3) reasons.push("音声/画像等の客観証拠があり、立証に有利です。");
    if (medicalEvidenceScore > 0) reasons.push("診断書・通院履歴等の医療資料は証拠力が強く、立証に有利です。");

    // 中心事案別レンジ（万円）
    let baseMin = 30;
    let baseMax = 120;
    switch (answers.situation) {
      case "暴力（DV）":
        baseMin = 80; baseMax = 250; reasons.push("DVは違法性が強く、慰謝料が上振れしやすい類型です。"); break;
      case "不貞（浮気）":
        baseMin = 50; baseMax = 200; reasons.push("不貞は典型類型で、証拠次第でレンジが動きます。"); break;
      case "暴言・威圧（強い支配）":
        baseMin = 30; baseMax = 150; reasons.push("モラハラは継続性と具体性（反復・支配）が鍵です。"); break;
      case "生活費/経済（未払い等）":
        baseMin = 20; baseMax = 120; reasons.push("生活費未払いは婚費/財産分与と絡むため、整理が重要です。"); break;
      case "育児の放棄/妨害":
        baseMin = 20; baseMax = 140; reasons.push("育児妨害は監護状況や子の負担が評価されやすいです。"); break;
      default:
        baseMin = 20; baseMax = 120; break;
    }

    // 影響（増額・勝率）
    let impactBonus = 0;
    if (answers.impact === "通院・診断書がある") { impactBonus += 60; reasons.push("診断書がある場合、精神的損害の評価が上がりやすいです。"); }
    else if (answers.impact === "不眠/強いストレスが続く") impactBonus += 25;
    else if (answers.impact === "仕事/家事が回らない") impactBonus += 20;
    else if (answers.impact === "子どもに大きな影響") impactBonus += 30;

    // 医療（裏付け）
    let medicalBonus = 0;
    if (answers.medical === "診断書がある") medicalBonus += 30;
    else if (answers.medical === "通院中（診断書は未）") medicalBonus += 15;
    else if (answers.medical === "受診予定") medicalBonus += 8;

    // 継続期間
    let durationBonus = 0;
    if (answers.duration === "3年以上") durationBonus += 50;
    else if (answers.duration === "1年以上") durationBonus += 35;
    else if (answers.duration === "半年〜1年") durationBonus += 20;
    else if (answers.duration === "3〜6ヶ月") durationBonus += 10;
    else if (answers.duration === "1〜3ヶ月") durationBonus += 5;

    // 婚姻期間
    let marriageBonus = 0;
    if (answers.marriage === "20年以上") marriageBonus += 40;
    else if (answers.marriage === "10年以上") marriageBonus += 30;
    else if (answers.marriage === "5〜10年") marriageBonus += 20;
    else if (answers.marriage === "3〜5年") marriageBonus += 10;

    // 子ども
    let childBonus = 0;
    if (answers.children === "2人以上") childBonus += 20;
    else if (answers.children === "1人") childBonus += 10;
    else if (answers.children === "妊娠中") childBonus += 15;

    // 相手年収（上振れ要素として弱く）
    let incomeBonus = 0;
    if (answers.income === "800万円以上") incomeBonus += 20;
    else if (answers.income === "500〜800万円") incomeBonus += 10;

    // 状況（手続段階）
    let stagePenalty = 0;
    if (answers.status === "離婚済") stagePenalty += 5;

    const estMin = Math.max(0, Math.round(baseMin + impactBonus * 0.4 + durationBonus * 0.4 + marriageBonus * 0.2 + childBonus * 0.2 + incomeBonus * 0.2));
    const estMax = Math.max(estMin, Math.round(baseMax + impactBonus + medicalBonus + durationBonus + marriageBonus + childBonus + incomeBonus - stagePenalty));

    // 勝率（ざっくり）
    let win = 25;
    win += evidenceScore + logScore;
    if (answers.medical === "診断書がある") win += 10;
    if (answers.duration === "1年以上" || answers.duration === "3年以上") win += 10;
    if (answers.situation === "暴力（DV）" || answers.situation === "不貞（浮気）") win += 10;
    win = Math.max(5, Math.min(95, Math.round(win)));
    if (win < 40) reasons.push("まずは「日時・場所・具体的言動・証拠」を揃えると見立てが安定します。");

    return { winRate: win, estMin, estMax, reasons: Array.from(new Set(reasons)).slice(0, 6) };
  };

  const start = () => {
    if (!consent) return;
    setStep(1);
  };

  const choose = (key, value) => {
    setAnswers(prev => ({ ...prev, [key]: value }));
    setStep(s => s + 1);
  };

  useEffect(() => {
    if (step === questions.length + 1) {
      const t = setTimeout(() => {
        setResult(analyze());
        setStep(questions.length + 2); // PaymentGate
      }, 900);
      return () => clearTimeout(t);
    }
  }, [step, questions.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const qIndex = step - 1;
  const isIntro = step === 0;
  const isLoading = step === questions.length + 1;
  const isPaymentGate = step === questions.length + 2;
  const isResult = step === questions.length + 3;

  const handleBack = () => {
    if (step === 0) {
      // イントロ画面の場合は元の画面に戻る
      onClose();
    } else if (step > 0 && step <= questions.length) {
      // 質問中の場合は一つ前の質問に戻る
      setStep(step - 1);
    } else if (isPaymentGate) {
      // 支払いゲート画面の場合はローディング画面に戻る（実際には質問の最後に戻る）
      setStep(questions.length + 1);
    } else if (isResult) {
      // 結果画面の場合は支払いゲート画面に戻る
      setStep(questions.length + 2);
    }
  };

  return (
    <div className="p-4 pb-24">
      <div className="flex items-center justify-between mb-3">
        <div className="font-bold text-slate-900 flex items-center gap-2">
          <Sparkles size={18} className="text-pink-500" /> AI慰謝料診断
        </div>
          <button
          onClick={handleBack}
          className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold px-3 py-2 rounded-lg text-xs flex items-center gap-1"
          >
          <ArrowLeft size={14} /> 戻る
          </button>
      </div>

      {isIntro && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
          <div className="text-sm font-bold text-slate-900 mb-2">診断を始める前に</div>
          <p className="text-xs text-gray-600 leading-relaxed mb-3">
            これは<strong>統計的な概算</strong>です。事案の細部（証拠の中身・反論可能性・経緯）で大きく変わります。
          </p>
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-[10px] text-slate-700 leading-relaxed mb-3">
            現在の記録: <strong>{logCount}件</strong> / 証拠ファイル: <strong>{attachmentCount}件</strong>
          </div>
          <label className="flex items-start gap-2 text-xs text-gray-700">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5" />
            <span>上記に同意して診断を開始します。</span>
          </label>
          <button
            onClick={start}
            disabled={!consent}
            className={`mt-4 w-full font-bold py-3 rounded-lg shadow ${
              consent ? 'bg-pink-600 hover:bg-pink-700 text-white' : 'bg-gray-200 text-gray-500'
            }`}
          >
            診断を開始する
          </button>
        </div>
      )}

      {!isIntro && !isLoading && !isPaymentGate && !isResult && step > 0 && step <= questions.length && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
          <div className="text-[10px] text-gray-400 mb-1">質問 {step}/{questions.length}</div>
          <div className="text-sm font-bold text-slate-900 mb-1">{questions[qIndex].title}</div>
          <div className="text-[10px] text-gray-500 mb-3">{questions[qIndex].subtitle}</div>
          <div className="space-y-2">
            {questions[qIndex].options.map((opt) => (
              <button
                key={opt}
                onClick={() => choose(questions[qIndex].key, opt)}
                className="w-full text-left bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg p-3 text-xs font-bold text-slate-800"
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}

      {isLoading && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 text-center">
          <div className="text-sm font-bold text-slate-900 mb-2">解析中…</div>
          <div className="text-xs text-gray-500">回答内容と記録量から概算を作成しています。</div>
        </div>
      )}

      {isPaymentGate && result && (
        <div className="space-y-3">
          <div className="bg-gradient-to-r from-pink-600 to-purple-600 text-white p-4 rounded-xl shadow-sm">
            <div className="text-sm font-bold mb-2 flex items-center gap-2">
              <Sparkles size={18} /> 診断結果のご案内
            </div>
            <div className="text-xs text-pink-50/90 leading-relaxed">
              診断結果をご覧いただくには、以下のいずれかをお選びください。
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 space-y-3">
            <button
              onClick={() => {
                setPaymentMethod('lawyer');
                // 弁護士紹介への登録（無料）を記録
                try {
                  const registrations = JSON.parse(localStorage.getItem('riko_lawyer_registrations') || '[]');
                  registrations.push({ date: new Date().toISOString(), diagnosis: true });
                  localStorage.setItem('riko_lawyer_registrations', JSON.stringify(registrations));
                } catch {}
                setStep(questions.length + 3); // Result
              }}
              className="w-full p-4 rounded-xl border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-blue-100 hover:shadow-md transition text-left"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-bold text-blue-900 flex items-center gap-2 mb-1">
                    <Users size={16} /> 弁護士紹介（無料）に登録する
                  </div>
                  <div className="text-xs text-blue-800 leading-relaxed">
                    診断結果を見るために、無料の弁護士紹介サービスに登録します。あなたに合った弁護士を紹介いたします。
                  </div>
                </div>
                <ExternalLink size={16} className="text-blue-400 shrink-0" />
              </div>
            </button>

            <div className="text-center text-xs text-gray-400">または</div>

            <button
              onClick={() => {
                setPaymentMethod('report');
                // 詳細レポート購入（500円）を記録
                try {
                  const purchases = JSON.parse(localStorage.getItem('riko_report_purchases') || '[]');
                  purchases.push({ date: new Date().toISOString(), amount: 500, diagnosis: true });
                  localStorage.setItem('riko_report_purchases', JSON.stringify(purchases));
                } catch {}
                setStep(questions.length + 3); // Result
              }}
              className="w-full p-4 rounded-xl border-2 border-pink-200 bg-gradient-to-r from-pink-50 to-pink-100 hover:shadow-md transition text-left"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-bold text-pink-900 flex items-center gap-2 mb-1">
                    <FileText size={16} /> 詳細レポートを購入する（500円）
                  </div>
                  <div className="text-xs text-pink-800 leading-relaxed">
                    診断結果の詳細レポート（PDF）を500円で購入します。弁護士紹介への登録は不要です。
                  </div>
                </div>
                <div className="text-lg font-bold text-pink-600 shrink-0">¥500</div>
              </div>
            </button>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
            <div className="text-[10px] text-yellow-800 leading-relaxed">
              <strong>注意:</strong> 診断結果は統計的な概算です。最終判断は弁護士等の専門家にご相談ください。
            </div>
          </div>
        </div>
      )}

      {isResult && result && paymentMethod && (
        <div className="space-y-3">
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
            <div className="text-xs text-gray-500 mb-1">見込み（概算）</div>
            <div className="text-2xl font-bold text-slate-900">
              {result.estMin}〜{result.estMax}万円
              </div>
            <div className="mt-3">
              <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                <span>勝率イメージ</span>
                <span>{result.winRate}%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-pink-500" style={{ width: `${result.winRate}%` }} />
            </div>
              </div>
            </div>

          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
            <div className="text-xs font-bold text-gray-500 mb-2">診断のポイント</div>
              <ul className="space-y-2">
              {result.reasons.map((r, idx) => (
                  <li key={idx} className="text-xs text-gray-600 flex items-start gap-2">
                    <span className="text-pink-500 mt-0.5">•</span>
                  <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
            <div className="text-[10px] text-yellow-800 leading-relaxed">
              <strong>注意:</strong> 本結果は統計的な概算です。最終判断は弁護士等の専門家にご相談ください。
            </div>
            </div>

              <button
            onClick={() => { setAnswers({ impact:"",situation:"",duration:"",marriage:"",status:"",children:"",income:"",medical:"" }); setResult(null); setConsent(false); setStep(0); }}
            className="w-full bg-white text-slate-900 font-bold py-3 rounded-lg border border-gray-200 hover:bg-gray-50"
              >
                もう一度診断する
              </button>
        </div>
      )}
    </div>
  );
};

// --- 4. ダッシュボード（データ管理・自衛） ---
const DashboardView = ({ logs, userProfile, onShowDiagnosis, onShowLifeSupport, onShowPremium }) => {
  // 目標件数の管理
  const [targetCount, setTargetCount] = useState(() => {
    try {
      const saved = localStorage.getItem('riko_target_count');
      return saved ? parseInt(saved, 10) : null; // 未設定の場合はnull
    } catch {
      return null;
    }
  });
  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const [tempTargetCount, setTempTargetCount] = useState(targetCount || 10);
  const [showTargetModal, setShowTargetModal] = useState(false);
  const [isEditingModal, setIsEditingModal] = useState(false); // 目標変更用モーダル

  // 目標未設定の場合、初回表示時にポップアップを表示
  useEffect(() => {
    if (targetCount === null && logs.length > 0) {
      // 記録がある場合のみポップアップを表示
      setShowTargetModal(true);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const saveTargetCount = (count) => {
    const num = parseInt(count, 10);
    if (isNaN(num) || num < 1) return;
    setTargetCount(num);
    try {
      localStorage.setItem('riko_target_count', num.toString());
    } catch {}
    setIsEditingTarget(false);
    setShowTargetModal(false);
  };

  // 直近の記録日
  const lastLogDate = logs.length > 0 ? logs[0].date : "-";

  // 過去7日の記録件数
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const logsLast7Days = logs.filter(log => {
    if (!log.date) return false;
    const logDate = new Date(log.date.replace(/\//g, '-'));
    return logDate >= sevenDaysAgo;
  }).length;

  // カテゴリ別集計
  const categoryStats = logs.reduce((acc, log) => {
    acc[log.category] = (acc[log.category] || 0) + 1;
    return acc;
  }, {});

  // メディア別集計（証拠データ用）
  const mediaStats = useMemo(() => {
    const stats = { image: 0, audio: 0, video: 0 };
    logs.forEach(log => {
      if(log.attachments) {
        log.attachments.forEach(att => {
          if(stats[att.type] !== undefined) stats[att.type]++;
        });
      }
    });
    return stats;
  }, [logs]);

  // 進捗率の計算
  const progress = targetCount && targetCount > 0 ? Math.min(100, Math.round((logs.length / targetCount) * 100)) : 0;
  
  // 応援メッセージの生成（毎回表示されるようにuseStateで管理）
  const [encouragementMessage, setEncouragementMessage] = useState('');
  
  useEffect(() => {
    try {
      const generateMessage = () => {
        const now = new Date();
        const month = now.getMonth() + 1; // 1-12
        const hour = now.getHours();
        
        // 季節判定
        let season = '';
        let seasonEmoji = '';
        if (month >= 3 && month <= 5) {
          season = '春';
          seasonEmoji = '🌸';
        } else if (month >= 6 && month <= 8) {
          season = '夏';
          seasonEmoji = '☀️';
        } else if (month >= 9 && month <= 11) {
          season = '秋';
          seasonEmoji = '🍂';
        } else {
          season = '冬';
          seasonEmoji = '❄️';
        }
        
        // 時間帯判定
        let timeGreeting = '';
        if (hour >= 5 && hour < 12) {
          timeGreeting = 'おはようございます';
        } else if (hour >= 12 && hour < 18) {
          timeGreeting = 'こんにちは';
        } else {
          timeGreeting = 'こんばんは';
        }
        
        // 記録の状況を分析
        const hasRecentLogs = logsLast7Days > 0;
        const hasManyLogs = logs.length >= 10;
        const hasEvidence = mediaStats.image + mediaStats.audio + mediaStats.video > 0;
        const mainCategory = Object.keys(categoryStats).length > 0 
          ? Object.entries(categoryStats).sort((a, b) => b[1] - a[1])[0][0]
          : null;
        const isProgressing = targetCount && progress > 0 && progress < 100;
        const isAchieved = targetCount && progress >= 100;
        
        // 最新の記録の日付から経過日数を計算
        let daysSinceLastLog = null;
        if (logs.length > 0 && logs[0]?.date) {
          try {
            const lastLogDate = new Date(logs[0].date.replace(/\//g, '-'));
            const diffTime = now - lastLogDate;
            daysSinceLastLog = Math.floor(diffTime / (1000 * 60 * 60 * 24));
          } catch {}
        }
        
        // メッセージの選択
        const messages = [];
        
        // 季節・時間帯の挨拶
        messages.push(`${timeGreeting}。${seasonEmoji} ${season}の季節ですね。`);
        
        // 記録状況に基づくメッセージ
        if (logs.length === 0) {
          messages.push('今日から記録を始めましょう。あなたの一歩が、未来を変えます。');
        } else if (daysSinceLastLog !== null && daysSinceLastLog === 0) {
          messages.push('今日も記録を残せましたね。その積み重ねがあなたを守ります。');
        } else if (daysSinceLastLog !== null && daysSinceLastLog <= 3) {
          messages.push(`${daysSinceLastLog}日前に記録を残されていますね。継続は力です。`);
        } else if (hasRecentLogs) {
          messages.push(`最近${logsLast7Days}件の記録を残されていますね。素晴らしい継続力です。`);
        } else if (hasManyLogs) {
          messages.push(`${logs.length}件の記録が蓄積されています。あなたの努力は必ず報われます。`);
        } else {
          messages.push(`${logs.length}件の記録があります。一つ一つが大切な証拠になります。`);
        }
        
        // カテゴリに基づくメッセージ
        if (mainCategory) {
          if (mainCategory.includes('暴力') || mainCategory.includes('DV')) {
            messages.push('あなたは一人ではありません。記録を残すことで、あなた自身を守ることができます。');
          } else if (mainCategory.includes('不貞')) {
            messages.push('事実を記録することは、あなたの権利を守る第一歩です。');
          } else if (mainCategory.includes('モラハラ')) {
            messages.push('些細なことでも記録に残すことで、全体像が見えてきます。');
          } else if (mainCategory.includes('生活費')) {
            messages.push('経済的な記録も、離婚時の重要な証拠になります。');
          } else if (mainCategory.includes('育児')) {
            messages.push('お子様のためにも、記録を続けましょう。');
          }
        }
        
        // 証拠の有無
        if (hasEvidence) {
          const evidenceCount = mediaStats.image + mediaStats.audio + mediaStats.video;
          messages.push(`写真や音声などの証拠が${evidenceCount}件あります。客観的な証拠は非常に有効です。`);
        } else if (logs.length > 0) {
          messages.push('可能であれば、写真や音声などの証拠も添付すると、より説得力が増します。');
        }
        
        // 目標達成状況
        if (isAchieved) {
          messages.push('🎉 目標達成おめでとうございます！さらに上を目指しましょう。');
        } else if (isProgressing) {
          const remaining = targetCount - logs.length;
          messages.push(`目標まであと${remaining}件です。頑張っていますね！`);
        } else if (targetCount && progress === 0) {
          messages.push('目標を設定すると、進捗を可視化できます。');
        }
        
        // 励ましのメッセージ（ランダムに1つ選択）
        const encouragement = [
          'あなたの勇気ある行動が、新しい未来を切り開きます。',
          '一人で抱え込まないでください。あなたには味方がいます。',
          '記録を続けることで、あなたの声が届きます。',
          '今日も一歩前進できました。その積み重ねが大切です。',
          'あなたの記録は、あなた自身を守る盾になります。',
          '困難な状況でも、あなたは一人ではありません。',
          '同じような経験をしている人はたくさんいます。あなたは一人じゃありません。',
          '記録を残すことは、自分を大切にすることです。',
          'あなたの行動は、未来のあなたを守ります。',
          '小さな一歩でも、続けることで大きな力になります。',
        ];
        messages.push(encouragement[Math.floor(Math.random() * encouragement.length)]);
        
        return messages.join(' ');
      };
      
      setEncouragementMessage(generateMessage());
    } catch (error) {
      // エラーが発生した場合はデフォルトメッセージを表示
      setEncouragementMessage('記録を続けることで、あなたの声が届きます。');
    }
  }, [logs.length, logsLast7Days, mediaStats.image, mediaStats.audio, mediaStats.video, JSON.stringify(categoryStats), targetCount, progress]);

  // --- プレミアムプランチェック ---
  const isPremium = useMemo(() => checkPremiumStatus(), []);

  // --- ホーム画面追加（PWA）偽装選択 ---
  const [isDisguiseModalOpen, setIsDisguiseModalOpen] = useState(false);
  const [disguiseQuery, setDisguiseQuery] = useState('');
  const [selectedDisguiseId, setSelectedDisguiseId] = useState(() => readSavedDisguise().id);
  const [installMessage, setInstallMessage] = useState('');
  const [installAvailable, setInstallAvailable] = useState(false);
  const deferredPromptRef = useRef(null);

  const isInstalled = isStandaloneMode();
  const isIOS = useMemo(() => {
    const ua = navigator.userAgent || '';
    return /iPad|iPhone|iPod/.test(ua);
  }, []);

  const filteredDisguises = useMemo(() => {
    const q = disguiseQuery.trim().toLowerCase();
    if (!q) return DISGUISE_PRESETS;
    return DISGUISE_PRESETS.filter(p => {
      const hay = `${p.title} ${(p.keywords || []).join(' ')}`.toLowerCase();
      return hay.includes(q);
    });
  }, [disguiseQuery]);

  useEffect(() => {
    const onBeforeInstallPrompt = (e) => {
      e.preventDefault();
      deferredPromptRef.current = e;
      setInstallAvailable(true);
    };
    const onAppInstalled = () => {
      deferredPromptRef.current = null;
      setInstallAvailable(false);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  const openDisguiseModal = () => {
    const saved = readSavedDisguise();
    setSelectedDisguiseId(saved.id);
    setInstallMessage('');
    setDisguiseQuery('');
    setIsDisguiseModalOpen(true);
  };

  const applyAndInstall = async () => {
    const preset = getDisguisePreset(selectedDisguiseId);
    
    // デフォルトの電卓アイコン以外はプレミアム会員のみ
    if (preset.id !== 'calculator' && !isPremium) {
      alert('電卓以外のアイコン変更はプレミアムプランの特典です。プレミアムプランに登録してください。');
      setIsDisguiseModalOpen(false);
      onShowPremium();
      return;
    }
    
    saveDisguisePreset(preset);
    applyDisguiseToDocument(preset);

    // 反映率を上げるため、manifestを事前に読み込む（失敗してもOK）
    try {
      await fetch(`/manifests/${preset.id}.webmanifest?v=${Date.now()}`, { cache: 'reload' });
    } catch {
      // ignore
    }

    if (isInstalled) {
      setInstallMessage('この端末では既に追加済みです。アイコン/名称を変えるには、いったん削除してから追加し直してください。');
      return;
    }

    const dp = deferredPromptRef.current;
    if (dp?.prompt) {
      try {
        await dp.prompt();
        await dp.userChoice; // accepted/dismissed
        deferredPromptRef.current = null;
        setInstallAvailable(false);
        setIsDisguiseModalOpen(false);
      } catch {
        setInstallMessage('インストールの表示に失敗しました。ブラウザのメニューから「ホーム画面に追加 / インストール」を選んでください。');
      }
      return;
    }

    if (isIOS) {
      setInstallMessage('iPhone/iPadは自動表示できません。Safariの共有ボタン →「ホーム画面に追加」を選んでください。');
    } else {
      setInstallMessage('このブラウザでは自動表示できません。ブラウザのメニューから「ホーム画面に追加 / インストール」を選んでください。');
    }
  };

  return (
    <div className="p-4 space-y-4 pb-24">
      {/* 応援メッセージ */}
      <div className="bg-gradient-to-r from-pink-100 to-purple-100 border border-pink-200 rounded-xl shadow-sm p-4">
        <div className="flex items-start gap-3">
          <div className="shrink-0 bg-pink-500 rounded-full p-2">
            <Heart size={18} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-pink-900 mb-1">応援メッセージ</div>
            <div className="text-xs text-slate-700 leading-relaxed">
              {encouragementMessage || '記録を続けることで、あなたの声が届きます。'}
            </div>
          </div>
        </div>
      </div>

      {/* ホーム画面に追加（偽装選択） */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Home size={16} /> ホーム画面に追加
        </div>
            <div className="text-[10px] text-gray-500 mt-1 leading-relaxed">
              アイコン/名称を選んで追加できます（追加済みの変更は<strong>削除→再追加</strong>が必要です）。
      </div>
            <div className="text-[10px] text-gray-400 mt-1">
              現在の偽装: <span className="font-bold text-slate-700">{readSavedDisguise().title}</span>
              {installAvailable ? <span className="ml-2 text-green-600 font-bold">（この端末はインストール対応）</span> : null}
            </div>
            {!isPremium && readSavedDisguise().id !== 'calculator' && (
              <div className="text-[10px] text-yellow-600 mt-1">
                <Crown size={10} className="inline mr-1" />
                電卓以外のアイコン変更はプレミアムプランが必要です
              </div>
            )}
          </div>
          <button
            onClick={openDisguiseModal}
            className="shrink-0 bg-white hover:bg-gray-50 text-slate-900 border border-gray-200 font-bold px-3 py-2 rounded-lg text-xs shadow-sm"
          >
            追加する
          </button>
      </div>
    </div>

      {/* 偽装選択モーダル */}
      {isDisguiseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setIsDisguiseModalOpen(false)} />
          <div className="relative w-full sm:max-w-lg lg:max-w-2xl bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-slate-900">偽装アイコン/名称を選択</div>
                <div className="text-[10px] text-gray-500 mt-1">選んだ見た目でホーム画面に追加します。</div>
              </div>
              <button
                onClick={() => setIsDisguiseModalOpen(false)}
                className="p-2 rounded-full hover:bg-gray-100 text-gray-600"
                title="閉じる"
              >
                <X size={18} />
          </button>
      </div>

            <div className="p-4 space-y-3">
              <input
                value={disguiseQuery}
                onChange={(e) => setDisguiseQuery(e.target.value)}
                placeholder="検索（例: 天気 / メモ / フォルダ）"
                className="w-full bg-gray-50 border border-gray-200 p-2.5 rounded text-sm"
              />

              <div className="grid grid-cols-4 gap-2 max-h-[42vh] overflow-y-auto pr-1">
                {filteredDisguises.map((p) => {
                  const selected = p.id === selectedDisguiseId;
                  const isCalculator = p.id === 'calculator';
                  const requiresPremium = !isCalculator && !isPremium;
                  return (
          <button
                      key={p.id}
                      onClick={() => { 
                        if (requiresPremium) {
                          setInstallMessage('電卓以外のアイコン変更はプレミアムプランが必要です。');
                          return;
                        }
                        setSelectedDisguiseId(p.id); 
                        setInstallMessage(''); 
                      }}
                      className={`p-2 rounded-xl border text-left hover:bg-gray-50 transition relative ${
                        selected ? 'border-pink-500 ring-2 ring-pink-200 bg-pink-50' : 'border-gray-200'
                      } ${requiresPremium ? 'opacity-60' : ''}`}
                      title={p.title}
                    >
                      {requiresPremium && (
                        <div className="absolute top-1 right-1 bg-yellow-500 rounded-full p-0.5">
                          <Crown size={10} className="text-white" />
                        </div>
                      )}
                      <img
                        src={`/disguises/${p.id}/icon-192.png`}
                        alt={p.title}
                        className="w-12 h-12 rounded-xl border border-gray-200 bg-white object-cover mx-auto"
                        loading="lazy"
                      />
                      <div className="mt-1 text-[10px] font-bold text-slate-800 truncate text-center">{p.title}</div>
                      {isCalculator && (
                        <div className="text-[8px] text-green-600 text-center mt-0.5">無料</div>
                      )}
          </button>
                  );
                })}
          </div>

              {installMessage && (
                <div className="text-[10px] text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-2 leading-relaxed">
                  {installMessage}
        </div>
      )}
            </div>

            <div className="p-4 border-t bg-white flex items-center justify-between gap-2">
              <button
                onClick={() => setIsDisguiseModalOpen(false)}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold px-3 py-2 rounded-lg text-xs"
              >
                キャンセル
              </button>
              <button
                onClick={applyAndInstall}
                className="bg-pink-600 hover:bg-pink-700 text-white font-bold px-4 py-2 rounded-lg text-xs shadow"
              >
                この見た目で追加する
              </button>
            </div>
          </div>
        </div>
      )}

      {/* メインステータスカード: 安心感のあるピンク×スレート基調 */}
      <div className="bg-slate-800 text-white p-5 rounded-xl shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-5">
          <Database size={100} />
        </div>
        
        {/* 記録状況サマリー */}
        <div className="flex justify-between items-end mb-6">
          <div>
            <h2 className="text-xs font-medium text-pink-200 mb-1 flex items-center gap-1">
              <FileText size={12} /> 記録件数
            </h2>
            <div className="text-3xl font-mono font-bold">{logs.length}<span className="text-base font-normal opacity-70 ml-1">件</span></div>
            <p className="text-[10px] text-gray-400 mt-1">
                ※継続的な記録は事実の証明に役立ちます
            </p>
          </div>
          <div className="text-right">
            <h2 className="text-xs font-medium text-pink-200 mb-1">最終更新日</h2>
            <div className="text-lg font-mono">{lastLogDate}</div>
          </div>
        </div>
        
        {/* 進捗バー */}
        <div className="space-y-2 border-t border-slate-700 pt-4">
          {targetCount === null ? (
            <div className="text-center">
              <button
                onClick={() => setShowTargetModal(true)}
                className="bg-pink-600 hover:bg-pink-700 text-white font-bold py-2 px-4 rounded-lg text-xs"
              >
                目標件数を設定する
              </button>
              <p className="text-[10px] text-gray-400 mt-2">
                目標を設定すると、進捗を可視化できます
              </p>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center text-xs font-medium">
                <div className="flex items-center gap-2">
                  <span>目標達成率</span>
                  {isEditingTarget ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={tempTargetCount}
                        onChange={(e) => setTempTargetCount(e.target.value)}
                        onBlur={() => saveTargetCount(tempTargetCount)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveTargetCount(tempTargetCount);
                          if (e.key === 'Escape') {
                            setTempTargetCount(targetCount);
                            setIsEditingTarget(false);
                          }
                        }}
                        className="w-12 bg-slate-700 border border-slate-600 rounded px-1 text-xs text-white text-center"
                        min="1"
                        autoFocus
                      />
                      <span className="text-pink-200">件</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setTempTargetCount(targetCount);
                        setIsEditingModal(true);
                      }}
                      className="text-pink-200 hover:text-pink-100 underline text-[10px]"
                      title="目標件数を変更"
                    >
                      目標: {targetCount}件
                    </button>
                  )}
                </div>
                <span>{progress}%</span>
          </div>
          <div className="h-2 bg-slate-600 rounded-full overflow-hidden">
            <div 
              className="h-full bg-pink-500 transition-all duration-1000" 
                  style={{ width: `${progress}%` }}
            ></div>
          </div>
              <p className="text-[10px] text-gray-300 mt-1">
                {logs.length}件 / {targetCount}件
              </p>
            </>
          )}
        </div>
      </div>

      {/* 統計データカード */}
      <div className="grid grid-cols-2 gap-3">
        {/* 証拠データ */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <div className="text-xs font-bold text-gray-500 mb-3 flex items-center gap-1">
            <TrendingUp size={14} className="text-slate-700" /> 証拠データ
          </div>
          <div className="flex items-center justify-around gap-2">
            <div className="flex flex-col items-center">
              <ImageIcon size={14} className="text-blue-600 mb-1" />
              <span className="text-sm font-bold text-slate-800">{mediaStats.image}</span>
            </div>
            <div className="flex flex-col items-center">
              <Mic size={14} className="text-green-600 mb-1" />
              <span className="text-sm font-bold text-slate-800">{mediaStats.audio}</span>
            </div>
            <div className="flex flex-col items-center">
              <Video size={14} className="text-pink-600 mb-1" />
              <span className="text-sm font-bold text-slate-800">{mediaStats.video}</span>
            </div>
        </div>
      </div>
      
        {/* カテゴリ内訳 */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <div className="text-xs font-bold text-gray-500 mb-2 flex items-center gap-1">
            <FileText size={14} className="text-slate-700" /> カテゴリ内訳
          </div>
          <div className="mb-2">
            <div className="text-[10px] text-gray-400">過去7日: {logsLast7Days}件</div>
          </div>
          <div className="space-y-1 overflow-y-auto max-h-[60px] hide-scrollbar">
          {Object.keys(categoryStats).length === 0 ? (
              <div className="text-[10px] text-gray-400">データなし</div>
          ) : (
              Object.entries(categoryStats).map(([cat, count]) => (
                <div key={cat} className="text-[10px] text-gray-600">
                  {cat} {count}件
                  </div>
              ))
          )}
        </div>
        </div>
      </div>

      {/* 目標設定ポップアップ（初回設定用） */}
      {showTargetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowTargetModal(false)} />
          <div className="relative w-full max-w-sm lg:max-w-xl bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
            <div className="p-5 border-b bg-gradient-to-r from-pink-50 to-purple-50">
        <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <TrendingUp size={20} className="text-pink-600" /> 目標件数を設定しましょう
          </h3>
                <button
                  onClick={() => setShowTargetModal(false)}
                  className="p-1 rounded-full hover:bg-white/50 text-gray-600"
                >
                  <X size={18} />
                </button>
        </div>
              <p className="text-xs text-gray-700 leading-relaxed">
                記録件数が増えると、以下のメリットがあります
              </p>
            </div>

            <div className="p-5 space-y-3">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="text-xs font-bold text-blue-900 mb-1 flex items-center gap-2">
                  <FileText size={14} /> 証拠力の向上
                </div>
                <div className="text-[11px] text-blue-800 leading-relaxed">
                  記録が多ければ多いほど、事実の積み上げができ、裁判や調停で有利になります。
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="text-xs font-bold text-green-900 mb-1 flex items-center gap-2">
                  <CheckCircle2 size={14} /> 勝率の向上
                </div>
                <div className="text-[11px] text-green-800 leading-relaxed">
                  詳細な記録があると、AI慰謝料診断での勝率評価も上がりやすくなります。
                </div>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                <div className="text-xs font-bold text-purple-900 mb-1 flex items-center gap-2">
                  <Sparkles size={14} /> 慰謝料の増額
                </div>
                <div className="text-[11px] text-purple-800 leading-relaxed">
                  継続的な記録は、精神的苦痛の継続性を証明し、慰謝料の増額につながります。
                </div>
              </div>

              <div className="pt-3 border-t">
                <label className="block text-xs font-bold text-gray-700 mb-2">
                  目標件数を設定してください
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={tempTargetCount}
                    onChange={(e) => setTempTargetCount(e.target.value)}
                    className="flex-1 bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-sm font-bold text-slate-900"
                    min="1"
                    placeholder="例: 20"
                    autoFocus
                  />
                  <span className="text-xs text-gray-600">件</span>
                </div>
              </div>
            </div>

            <div className="p-4 border-t bg-gray-50 flex items-center justify-between gap-2">
              <button
                onClick={() => setShowTargetModal(false)}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold px-4 py-2 rounded-lg text-xs"
              >
                後で設定
              </button>
              <button
                onClick={() => saveTargetCount(tempTargetCount)}
                className="bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white font-bold px-6 py-2 rounded-lg text-xs shadow-md"
              >
                目標を設定する
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 目標変更ポップアップ */}
      {isEditingModal && targetCount !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setIsEditingModal(false)} />
          <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
            <div className="p-5 border-b bg-gradient-to-r from-pink-50 to-purple-50">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <TrendingUp size={20} className="text-pink-600" /> 目標件数を変更
                </h3>
                <button
                  onClick={() => {
                    setIsEditingModal(false);
                    setTempTargetCount(targetCount);
                  }}
                  className="p-1 rounded-full hover:bg-white/50 text-gray-600"
                >
                  <X size={18} />
                </button>
              </div>
              <p className="text-xs text-gray-700 leading-relaxed">
                現在の進捗を確認して、新しい目標を設定しましょう
              </p>
            </div>

            <div className="p-5 space-y-4">
              {/* 現在の進捗表示 */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <div className="text-xs font-bold text-gray-700 mb-2">現在の進捗</div>
                <div className="flex items-end gap-2 mb-2">
                  <div className="text-2xl font-bold text-slate-900">{logs.length}</div>
                  <div className="text-sm text-gray-500 mb-1">件 / {targetCount}件</div>
                </div>
                <div className="h-2 bg-slate-200 rounded-full overflow-hidden mb-1">
                  <div 
                    className="h-full bg-pink-500 transition-all duration-1000" 
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <div className="text-xs text-gray-600">
                  達成率: <span className="font-bold text-pink-600">{progress}%</span>
                  {progress >= 100 && (
                    <span className="ml-2 text-green-600 font-bold">🎉 目標達成！</span>
                  )}
                </div>
              </div>

              {/* より高い目標を設定するメリット */}
              {parseInt(tempTargetCount) > targetCount && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <div className="text-xs font-bold text-yellow-900 mb-1 flex items-center gap-2">
                    <Sparkles size={14} /> 目標を上げると...
                  </div>
                  <div className="text-[11px] text-yellow-800 leading-relaxed">
                    より多くの記録を残すことで、証拠力がさらに向上し、AI慰謝料診断での評価も上がります。
                  </div>
                </div>
              )}

              {parseInt(tempTargetCount) < targetCount && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="text-xs font-bold text-blue-900 mb-1 flex items-center gap-2">
                    <CheckCircle2 size={14} /> 目標を調整すると...
                  </div>
                  <div className="text-[11px] text-blue-800 leading-relaxed">
                    現在の進捗に合わせて目標を調整することで、より達成しやすい目標にできます。
                  </div>
                </div>
              )}

              {/* 目標設定 */}
              <div className="pt-2 border-t">
                <label className="block text-xs font-bold text-gray-700 mb-2">
                  新しい目標件数を設定してください
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={tempTargetCount}
                    onChange={(e) => setTempTargetCount(e.target.value)}
                    className="flex-1 bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-sm font-bold text-slate-900"
                    min="1"
                    placeholder="例: 20"
                    autoFocus
                  />
                  <span className="text-xs text-gray-600">件</span>
                </div>
                {parseInt(tempTargetCount) > targetCount && (
                  <p className="text-[10px] text-pink-600 mt-1">
                    ✨ 現在より {parseInt(tempTargetCount) - targetCount}件多い目標です
                  </p>
                )}
                {parseInt(tempTargetCount) < targetCount && (
                  <p className="text-[10px] text-blue-600 mt-1">
                    📉 現在より {targetCount - parseInt(tempTargetCount)}件少ない目標です
                  </p>
                )}
              </div>
            </div>

            <div className="p-4 border-t bg-gray-50 flex items-center justify-between gap-2">
              <button
                onClick={() => {
                  setIsEditingModal(false);
                  setTempTargetCount(targetCount);
                }}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold px-4 py-2 rounded-lg text-xs"
              >
                キャンセル
              </button>
              <button
                onClick={() => saveTargetCount(tempTargetCount)}
                className="bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white font-bold px-6 py-2 rounded-lg text-xs shadow-md"
              >
                目標を変更する
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI慰謝料診断 */}
      <button
        onClick={onShowDiagnosis}
        className="w-full bg-pink-50 border border-pink-200 rounded-xl shadow-sm p-4 hover:shadow-md transition text-left relative"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-1">
              <Sparkles size={16} className="text-pink-600" /> AI慰謝料診断
            </div>
            <div className="text-xs text-gray-600 leading-relaxed mb-3">
              蓄積されたログをAIが分析し、「現時点での想定慰謝料：150万円」「勝率：60%」のように概算を出します。
            </div>
            <div className="bg-gradient-to-r from-pink-600 to-purple-600 text-white font-bold py-2.5 px-4 rounded-lg text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all">
              <Sparkles size={16} /> 無料で診断を受ける
            </div>
          </div>
        </div>
      </button>

      {/* 弁護士に相談する - プレミアム会員は非表示 */}
      {!isPremium && (
          <a
            href="https://www.bengo4.com/"
            target="_blank"
            rel="noopener noreferrer"
        className="block bg-blue-50 border border-blue-200 rounded-xl shadow-sm p-4 hover:shadow-md transition relative"
          >
            <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-1">
              <Users size={16} className="text-blue-600" /> 弁護士に相談する
                </div>
            <div className="text-xs text-gray-600 leading-relaxed mb-2">
              記録をもとに、専門家に早めに相談して方針を整理する。多くの事務所で初回相談無料。
                </div>
            <div className="text-xs text-blue-600 font-bold flex items-center gap-1">
              詳細を見る <ExternalLink size={12} />
              </div>
          </div>
          <ChevronRight size={20} className="text-blue-400 shrink-0 mt-1" />
            </div>
          </a>
      )}

      {/* 浮気調査を依頼する - プレミアム会員は非表示 */}
      {!isPremium && (
          <a
            href="https://www.private-eye.jp/"
            target="_blank"
            rel="noopener noreferrer"
        className="block bg-purple-50 border border-purple-200 rounded-xl shadow-sm p-4 hover:shadow-md transition relative"
          >
            <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-1">
              <User size={16} className="text-purple-600" /> 浮気調査を依頼する
                </div>
            <div className="text-xs text-gray-600 leading-relaxed mb-2">
              不貞の立証が必要なケース向けに、専門家に依頼できます。GPS調査、行動調査など、様々な調査方法があります。
                </div>
            <div className="text-xs text-purple-600 font-bold flex items-center gap-1">
              詳細を見る <ExternalLink size={12} />
              </div>
          </div>
          <ChevronRight size={20} className="text-purple-400 shrink-0 mt-1" />
            </div>
          </a>
      )}

      {/* 離婚後の生活支援 */}
            <button
        onClick={onShowLifeSupport}
        className="w-full bg-green-50 border border-green-200 rounded-xl shadow-sm p-4 hover:shadow-md transition text-left relative"
            >
              <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-1">
              <HeartHandshake size={16} className="text-green-600" /> 離婚後の生活支援
                  </div>
            <div className="text-xs text-gray-600 leading-relaxed mb-2">
              住まい探し（賃貸・シェアハウス）、仕事探し（転職・パート）、シングルマザー向け保険など、新しい生活を始めるためのサポートサービスをご紹介します。
                  </div>
            <div className="text-xs text-green-600 font-bold flex items-center gap-1">
              詳細を見る <ExternalLink size={12} />
                </div>
          </div>
          <ChevronRight size={20} className="text-green-400 shrink-0 mt-1" />
              </div>
            </button>

      {/* プレミアムプラン */}
      <button
        onClick={onShowPremium}
        className="w-full bg-yellow-50 border border-yellow-200 rounded-xl shadow-sm p-4 hover:shadow-md transition text-left relative"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-1">
              <Crown size={16} className="text-yellow-600" /> プレミアムプラン
        </div>
            <div className="text-xs text-gray-600 leading-relaxed mb-2">
              月額450円で容量無制限・広告非表示・カモフラージュアイコン変更が可能です。
      </div>
            <div className="text-xs text-yellow-600 font-bold flex items-center gap-1">
              詳細を見る <ExternalLink size={12} />
            </div>
          </div>
          <ChevronRight size={20} className="text-yellow-400 shrink-0 mt-1" />
        </div>
      </button>
    </div>
  );
};

// --- 5. 提出用PDFプレビュー画面 ---
const ExportView = ({ logs, userProfile, onShowPremium }) => {
  const isPremium = checkPremiumStatus();
  const userPlan = getUserPlan();
  const isFreePlan = userPlan === PLAN_TYPES.FREE;

  const sampleLogs = [
    {
      date: "2025/01/10",
      time: "19:30",
      category: "モラハラ",
      location: "自宅",
      content: "（サンプル）夕食時に暴言を吐かれた。",
      attachments: [{ type: "audio", name: "rec001.mp3" }],
    },
  ];

  const effectiveLogs = logs && logs.length > 0 ? logs : sampleLogs;
    const statementData = useMemo(
    () => {
      const baseData = buildStatementDataFromLogs({ logs: effectiveLogs, userProfile });
      return {
        ...baseData,
        isFreePlan,
        watermark: isFreePlan ? FREE_PLAN_LIMITS.PDF_WATERMARK : undefined,
      };
    },
    [effectiveLogs, userProfile, isFreePlan]
    );

  // 無料プランでは1ページ目のみのため、ファイル名に「サンプル」を追加
  const fileName = isFreePlan 
    ? `陳述書_サンプル_${new Date().toLocaleDateString('ja-JP').replaceAll('/', '-')}.pdf`
    : `陳述書_${new Date().toLocaleDateString('ja-JP').replaceAll('/', '-')}.pdf`;

    return (
    <div className="p-4 pb-24">
            <h2 className="font-bold text-lg mb-2 text-slate-900 flex items-center gap-2">
        <FileText size={20} /> 提出用PDF（陳述書）
            </h2>
            <p className="text-xs text-gray-500 mb-4 leading-relaxed">
        記録されたデータを、裁判所提出用の<strong>陳述書フォーマット</strong>として出力します。
        <br />
        <span className="text-pink-600">※表示中のプレビューと実際のPDFは同一のフォーマットです。</span>
      </p>

      {/* 無料プラン時の制限通知 */}
      {isFreePlan && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg mb-4">
          <div className="flex items-start gap-2">
            <Crown size={16} className="text-yellow-600 mt-0.5" />
            <div className="flex-1">
              <div className="text-sm font-bold text-yellow-900 mb-1">無料プランの制限</div>
              <div className="text-xs text-yellow-800 leading-relaxed">
                無料プランでは、<strong>1ページ目のみ</strong>出力可能です。また、PDFには「<strong>SAMPLE</strong>」という透かしが入ります。
                <br />
                全ページ出力・透かしなしの正式版をご希望の場合は、プレミアムプランへのアップグレードが必要です。
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PDFプレビュー（大きく表示） */}
      <div className="bg-white border border-gray-300 shadow-md overflow-hidden rounded-xl" style={{ height: 'calc(100vh - 200px)' }}>
        <BlobProvider document={<StatementDocument data={statementData} />}>
          {({ url, loading, error }) => {
            if (loading) {
              return <div className="p-6 text-xs text-gray-500 h-full flex items-center justify-center">プレビューを生成中...</div>;
            }
            if (error || !url) {
              return <div className="p-6 text-xs text-red-600 h-full flex items-center justify-center">プレビューの生成に失敗しました。</div>;
            }
            return (
              <iframe
                title="陳述書プレビュー"
                src={url}
                className="w-full h-full border-0"
              />
            );
          }}
        </BlobProvider>
      </div>

      <div className="mt-4">
        <PDFDownloadLink
          document={<StatementDocument data={statementData} />}
          fileName={fileName}
          className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded shadow-lg flex items-center justify-center gap-2"
        >
          {({ loading }) => (
            <>
              <FileText size={18} /> {loading ? "PDF生成中…" : isFreePlan ? "PDFファイルを出力する（1ページ目・透かし付き）" : "PDFファイルを出力する"}
        </>
      )}
        </PDFDownloadLink>
        <p className="text-[10px] text-center text-gray-500 mt-2">
          {isFreePlan 
            ? "※無料プランでは1ページ目のみ、透かし付きで出力されます。"
            : "※端末にPDFとして保存されます。コンビニ等で印刷可能です。"
          }
        </p>
        {isFreePlan && (
          <div className="mt-3">
            <button
              onClick={onShowPremium}
              className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-bold py-2 px-4 rounded-lg text-xs flex items-center justify-center gap-2"
            >
              <Crown size={14} /> プレミアムプランで全ページ出力・透かしなし版を利用する
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// --- メッセージ機能 ---
const MessagesView = () => {
  const [messages, setMessages] = useState([
    { id: 1, from: "Riko-Log事務局", subject: "【重要】データのバックアップについて", body: "万が一の紛失に備え、定期的にPDF出力を行い、外部の安全な場所に保管することを推奨します。", date: "2025/01/10", read: true },
  ]);

    return (
    <div className="p-4 pb-24">
      <h2 className="font-bold text-lg mb-4 text-slate-900 flex items-center gap-2">
        <Mail size={20} /> 受信トレイ
      </h2>
      <div className="space-y-3">
        {messages.map(msg => (
          <div key={msg.id} className={`bg-white p-4 rounded-lg shadow-sm border ${msg.read ? 'border-gray-100' : 'border-pink-200 bg-pink-50'}`}>
            <div className="flex justify-between items-start mb-1">
              <span className="text-xs font-bold text-slate-700">{msg.from}</span>
              <span className="text-[10px] text-gray-400">{msg.date}</span>
            </div>
            <div className="text-sm font-bold text-slate-900 mb-1">{msg.subject}</div>
            <div className="text-xs text-gray-600 leading-relaxed">{msg.body}</div>
            {!msg.read && (
              <div className="mt-2 text-right">
                <span className="inline-block bg-pink-500 text-white text-[10px] px-2 py-0.5 rounded-full">未読</span>
              </div>
            )}
          </div>
        ))}
        <div className="mt-8 border-t pt-4">
          <h3 className="text-sm font-bold text-gray-500 mb-2">運営へのお問い合わせ</h3>
          <p className="text-[10px] text-gray-400 mb-2">※法的な相談はここでは受け付けておりません。システムの不具合や機能要望のみお送りください。</p>
          <textarea 
            className="w-full bg-gray-50 border border-gray-200 rounded p-3 text-sm h-24 mb-2"
            placeholder="お問い合わせ内容"
          ></textarea>
          <button className="bg-slate-800 text-white text-xs font-bold px-4 py-2 rounded">送信する</button>
        </div>
      </div>
    </div>
  );
};

// --- 掲示板（シンプル版） ---
const BoardView = () => {
  // カテゴリの定義
  const categories = [
    { id: 'question', label: '質問', color: 'bg-blue-100 text-blue-700' },
    { id: 'consultation', label: '相談', color: 'bg-purple-100 text-purple-700' },
    { id: 'information', label: '情報共有', color: 'bg-green-100 text-green-700' },
    { id: 'experience', label: '体験談', color: 'bg-orange-100 text-orange-700' },
    { id: 'other', label: 'その他', color: 'bg-gray-100 text-gray-700' },
  ];

  const [posts, setPosts] = useState(() => {
    try {
      const raw = localStorage.getItem('riko_board_posts');
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed)
        ? parsed.map((p) => ({
            ...p,
            category: p.category || 'other', // 既存の投稿にはデフォルトカテゴリを設定
            reactions: p.reactions || { like: 0, thumbsUp: 0 },
            replies: Array.isArray(p.replies) ? p.replies : [],
          }))
        : [];
    } catch {
      return [];
    }
  });
  const [showForm, setShowForm] = useState(false);
  const [newPost, setNewPost] = useState({ title: '', content: '', author: '匿名', category: 'other' });
  const [selectedPostId, setSelectedPostId] = useState(null);
  const [replyContent, setReplyContent] = useState('');
  const [replyAuthor, setReplyAuthor] = useState('匿名');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const persist = (next) => {
    setPosts(next);
    try {
      localStorage.setItem('riko_board_posts', JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const handleSubmitPost = () => {
    if (!newPost.title.trim() || !newPost.content.trim()) return alert('タイトルと内容を入力してください。');
    const post = {
      id: 'post_' + Date.now(),
      title: newPost.title.trim(),
      content: newPost.content.trim(),
      author: (newPost.author || '匿名').trim() || '匿名',
      category: newPost.category || 'other',
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timestamp: new Date().toISOString(),
      reactions: { like: 0, thumbsUp: 0 },
      replies: [],
    };
    persist([post, ...posts]);
    setNewPost({ title: '', content: '', author: '匿名', category: 'other' });
    setShowForm(false);
  };

  // フィルタリングされた投稿を取得
  const filteredPosts = useMemo(() => {
    let filtered = posts;

    // カテゴリでフィルタリング
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((post) => post.category === selectedCategory);
    }

    // 検索クエリでフィルタリング
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (post) =>
          post.title.toLowerCase().includes(query) ||
          post.content.toLowerCase().includes(query) ||
          post.author.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [posts, selectedCategory, searchQuery]);

  const handleReaction = (postId, key) => {
    const next = posts.map((p) =>
      p.id === postId
        ? { ...p, reactions: { ...(p.reactions || {}), [key]: (p.reactions?.[key] || 0) + 1 } }
        : p
    );
    persist(next);
  };

  const handleSubmitReply = (postId) => {
    if (!replyContent.trim()) return alert('返信内容を入力してください。');
    const reply = {
      id: 'reply_' + Date.now(),
      content: replyContent.trim(),
      author: replyAuthor.trim() || '匿名',
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timestamp: new Date().toISOString(),
    };
    const next = posts.map((p) => (p.id === postId ? { ...p, replies: [...(p.replies || []), reply] } : p));
    persist(next);
    setSelectedPostId(null);
    setReplyContent('');
    setReplyAuthor('匿名');
  };

  return (
    <div className="p-4 pb-24">
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-bold text-lg text-slate-900 flex items-center gap-2">
          <MessageSquare size={20} /> 掲示板
        </h2>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="bg-pink-600 text-white text-xs font-bold px-4 py-2 rounded"
        >
          {showForm ? 'キャンセル' : '新規投稿'}
        </button>
      </div>

      {/* 検索バー */}
      <div className="mb-4">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="タイトル、内容、投稿者名で検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-gray-200 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* カテゴリフィルター */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <Filter size={16} className="text-gray-500" />
          <span className="text-xs font-bold text-gray-600">カテゴリ</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition ${
              selectedCategory === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            すべて
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition ${
                selectedCategory === cat.id
                  ? cat.color + ' ring-2 ring-offset-2 ring-gray-300'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {showForm && (
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-4 space-y-2">
          <input
            type="text"
            placeholder="タイトル"
            value={newPost.title}
            onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
            className="w-full bg-gray-50 border border-gray-200 rounded p-2 text-sm"
          />
          <textarea
            placeholder="内容を入力してください"
            value={newPost.content}
            onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
            className="w-full bg-gray-50 border border-gray-200 rounded p-2 text-sm h-24"
          />
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">カテゴリ</label>
            <select
              value={newPost.category}
              onChange={(e) => setNewPost({ ...newPost, category: e.target.value })}
              className="w-full bg-gray-50 border border-gray-200 rounded p-2 text-sm"
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>
          <input
            type="text"
            placeholder="投稿者名（任意・匿名可）"
            value={newPost.author}
            onChange={(e) => setNewPost({ ...newPost, author: e.target.value })}
            className="w-full bg-gray-50 border border-gray-200 rounded p-2 text-sm"
          />
          <button onClick={handleSubmitPost} className="w-full bg-slate-900 text-white font-bold py-2 rounded">
            投稿する
          </button>
        </div>
      )}

      <div className="space-y-3">
        {filteredPosts.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <MessageSquare size={48} className="mx-auto mb-2 opacity-20" />
            <p>
              {posts.length === 0
                ? 'まだ投稿がありません。'
                : searchQuery || selectedCategory !== 'all'
                ? '該当する投稿が見つかりませんでした。'
                : 'まだ投稿がありません。'}
            </p>
          </div>
        ) : (
          filteredPosts.map((post) => {
            const categoryInfo = categories.find((cat) => cat.id === post.category) || categories[categories.length - 1];
            return (
              <div key={post.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${categoryInfo.color}`}>
                        {categoryInfo.label}
                      </span>
                      <h3 className="font-bold text-slate-900">{post.title}</h3>
                    </div>
                  </div>
                  <span className="text-[10px] text-gray-400 ml-2">{post.date} {post.time}</span>
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap mb-3">{post.content}</p>
                <div className="text-xs text-gray-500 mb-3">投稿者: {post.author}</div>

              <div className="flex items-center gap-4 mb-3 pb-3 border-b border-gray-100">
                <button onClick={() => handleReaction(post.id, 'like')} className="flex items-center gap-1 text-gray-600 hover:text-pink-600 transition">
                  <Heart size={16} /> <span className="text-xs">{post.reactions?.like || 0}</span>
                </button>
                <button onClick={() => handleReaction(post.id, 'thumbsUp')} className="flex items-center gap-1 text-gray-600 hover:text-blue-600 transition">
                  <ThumbsUp size={16} /> <span className="text-xs">{post.reactions?.thumbsUp || 0}</span>
                </button>
                <button
                  onClick={() => setSelectedPostId(selectedPostId === post.id ? null : post.id)}
                  className="flex items-center gap-1 text-gray-600 hover:text-slate-900 transition"
                >
                  <Reply size={16} /> <span className="text-xs">返信</span>
                  {post.replies?.length ? <span className="text-xs text-gray-400">({post.replies.length})</span> : null}
                </button>
              </div>

              {selectedPostId === post.id && (
                <div className="bg-gray-50 p-3 rounded-lg mb-3">
                  <textarea
                    placeholder="返信内容を入力してください"
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded p-2 text-sm h-20 mb-2"
                  />
                  <input
                    type="text"
                    placeholder="投稿者名（任意・匿名可）"
                    value={replyAuthor}
                    onChange={(e) => setReplyAuthor(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded p-2 text-sm mb-2"
                  />
                  <div className="flex gap-2">
                    <button onClick={() => handleSubmitReply(post.id)} className="flex-1 bg-slate-900 text-white text-xs font-bold py-2 rounded">
                      返信する
                    </button>
                    <button
                      onClick={() => {
                        setSelectedPostId(null);
                        setReplyContent('');
                        setReplyAuthor('匿名');
                      }}
                      className="px-4 bg-gray-200 text-gray-700 text-xs font-bold py-2 rounded"
                    >
                      キャンセル
                    </button>
                  </div>
                </div>
              )}

              {post.replies?.length ? (
                <div className="space-y-2 mt-3 pl-3 border-l-2 border-gray-200">
                  {post.replies.map((r) => (
                    <div key={r.id} className="bg-gray-50 p-2 rounded text-xs">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-bold text-gray-700">{r.author}</span>
                        <span className="text-gray-400">{r.date} {r.time}</span>
                      </div>
                      <p className="text-gray-600 whitespace-pre-wrap">{r.content}</p>
                    </div>
                  ))}
                </div>
              ) : null}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

// --- ナビゲーションボタン ---
const NavBtn = ({ icon: Icon, label, active, onClick, isMain }) => (
  <button 
    onClick={onClick} 
    className={`flex flex-col items-center justify-center w-full relative z-10
      ${active ? "text-pink-600" : "text-gray-400"}
    `}
  >
    <div className={`${isMain ? "bg-slate-900 text-white p-3 rounded-full -mt-8 shadow-xl border-4 border-slate-50" : ""}`}>
      <Icon size={isMain ? 28 : 24} />
    </div>
    {!isMain && <span className="text-[10px] mt-1 font-medium">{label}</span>}
  </button>
);

const LogDetailView = ({ log, onClose, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(log.content || '');
  const [editedCategory, setEditedCategory] = useState(log.category || 'モラハラ');
  const [editedLocation, setEditedLocation] = useState(log.location || '');
  const [editedAttachments, setEditedAttachments] = useState(log.attachments || []);
  const [newComment, setNewComment] = useState('');
  const comments = log.comments || [];
  const isPremium = checkPremiumStatus();
  const userPlan = getUserPlan();

  const categories = ["モラハラ", "暴力・DV", "不貞・浮気", "生活費未払い", "育児放棄", "通院・診断書", "その他"];

  const handleFileSelect = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // 無料プラン：写真のみ許可
    if (userPlan === PLAN_TYPES.FREE) {
      if (type !== 'image') {
        alert('無料プランでは写真のみ添付できます。録音・動画はプレミアムプランでご利用いただけます。');
        e.target.value = '';
        return;
      }
      
      if (editedAttachments.length >= FREE_PLAN_LIMITS.MAX_ATTACHMENTS) {
        alert(`無料版では最大${FREE_PLAN_LIMITS.MAX_ATTACHMENTS}個まで添付できます。プレミアムプランで無制限になります。`);
        e.target.value = '';
        return;
      }
      
      const fileSizeMB = file.size / (1024 * 1024);
      if (fileSizeMB > FREE_PLAN_LIMITS.MAX_FILE_SIZE_MB) {
        alert(`無料版では1ファイルあたり最大${FREE_PLAN_LIMITS.MAX_FILE_SIZE_MB}MBまでです。プレミアムプランで無制限になります。`);
        e.target.value = '';
        return;
      }
    }
    
    setEditedAttachments([...editedAttachments, { type, name: file.name, size: file.size }]);
    e.target.value = '';
  };

  const removeAttachment = (index) => {
    const newAtt = [...editedAttachments];
    newAtt.splice(index, 1);
    setEditedAttachments(newAtt);
  };

  const handleSave = () => {
    const updatedLog = {
      ...log,
      content: editedContent,
      category: editedCategory,
      location: editedLocation,
      attachments: editedAttachments,
    };
    onUpdate(updatedLog);
    setIsEditing(false);
  };

  const handleEditStart = () => {
    setEditedAttachments(log.attachments || []);
    setIsEditing(true);
  };

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    const now = new Date();
    const comment = {
      text: newComment.trim(),
      date: now.toLocaleDateString(),
      time: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    const updatedLog = {
      ...log,
      comments: [...comments, comment],
    };
    onUpdate(updatedLog);
    setNewComment('');
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      style={{ 
        touchAction: 'none'
      }}
    >
      <div 
        className="w-full sm:w-auto sm:min-w-[500px] sm:max-w-2xl bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col h-[85vh] sm:h-auto sm:max-h-[85vh]"
        style={{ 
          touchAction: 'pan-y',
          WebkitOverflowScrolling: 'touch',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-3 sm:p-4 border-b flex items-center justify-between shrink-0 flex-shrink-0">
          <h2 className="text-base sm:text-lg font-bold text-slate-900">ログ詳細</h2>
          <div className="flex items-center gap-1 sm:gap-2">
            {!isEditing ? (
              <button
                onClick={handleEditStart}
                className="p-1.5 sm:p-2 rounded-full active:bg-gray-100 text-gray-600 touch-manipulation"
                title="編集"
              >
                <Edit size={16} className="sm:w-[18px] sm:h-[18px]" />
              </button>
            ) : (
              <button
                onClick={handleSave}
                className="p-1.5 sm:p-2 rounded-full active:bg-green-100 text-green-600 touch-manipulation"
                title="保存"
              >
                <Save size={16} className="sm:w-[18px] sm:h-[18px]" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 rounded-full active:bg-gray-100 text-gray-600 touch-manipulation"
              title="閉じる"
            >
              <X size={16} className="sm:w-[18px] sm:h-[18px]" />
            </button>
          </div>
        </div>

        <div 
          className="flex-1 overflow-y-auto overscroll-contain p-3 sm:p-4 space-y-3 sm:space-y-4" 
          style={{ 
            WebkitOverflowScrolling: 'touch',
            overflowY: 'auto',
            overflowX: 'hidden',
            minHeight: 0,
            flex: '1 1 auto',
            maxHeight: '100%',
            position: 'relative'
          }}
        >
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
            <span className="text-[10px] sm:text-xs font-mono text-gray-500 bg-gray-100 px-2 py-1 rounded inline-block">
              {log.date} {log.time}
            </span>
            {isEditing ? (
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {categories.map(c => (
                  <button
                    key={c}
                    onClick={() => setEditedCategory(c)}
                    className={`px-2 py-1 rounded text-[10px] sm:text-xs font-bold border transition touch-manipulation active:scale-95 ${
                      editedCategory === c
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-white text-gray-600 border-gray-200"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            ) : (
              <span
                className={`text-[10px] sm:text-xs font-bold px-2 py-1 rounded text-white inline-block
                  ${log.category === '暴力・DV' ? 'bg-red-600' :
                    log.category === '不貞・浮気' ? 'bg-purple-600' :
                    log.category === 'モラハラ' ? 'bg-orange-500' :
                    log.category === '通院・診断書' ? 'bg-rose-600' :
                    'bg-gray-500'
                  }`}
              >
                {log.category}
              </span>
            )}
          </div>

          {isEditing ? (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">場所</label>
                <input
                  value={editedLocation}
                  onChange={(e) => setEditedLocation(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded p-2.5 text-sm"
                  style={{ fontSize: '16px' }}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">内容</label>
                <textarea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded p-3 text-sm resize-none"
                  rows={8}
                  style={{ fontSize: '16px', minHeight: '120px' }}
                />
              </div>

              {/* 証拠画像の管理 */}
              <div className="border-t pt-3">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-gray-500">証拠画像・ファイル</label>
                  {!isPremium && (
                    <span className="text-[9px] text-gray-400">
                      {editedAttachments.length}/{FREE_PLAN_LIMITS.MAX_ATTACHMENTS}個
                    </span>
                  )}
                </div>

                {/* 既存の添付ファイル一覧 */}
                {editedAttachments.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {editedAttachments.map((att, index) => (
                      <div
                        key={index}
                        className={`flex items-center justify-between p-2 rounded-lg border
                          ${att.type === 'image' ? 'bg-blue-50 border-blue-200' :
                            att.type === 'audio' ? 'bg-green-50 border-green-200' :
                            'bg-pink-50 border-pink-200'
                          }`}
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {att.type === 'image' && <ImageIcon size={16} className="text-blue-600 shrink-0" />}
                          {att.type === 'audio' && <Mic size={16} className="text-green-600 shrink-0" />}
                          {att.type === 'video' && <Video size={16} className="text-pink-600 shrink-0" />}
                          <span className="text-xs text-gray-700 truncate">{att.name}</span>
                          {att.size && (
                            <span className="text-[10px] text-gray-500 shrink-0">
                              ({(att.size / (1024 * 1024)).toFixed(2)}MB)
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => removeAttachment(index)}
                          className="p-1 rounded-full hover:bg-red-100 text-red-600 touch-manipulation shrink-0"
                          title="削除"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* ファイル追加ボタン */}
                <div className="flex flex-wrap gap-2">
                  <label className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-xs font-bold text-blue-700 cursor-pointer hover:bg-blue-100 touch-manipulation">
                    <Camera size={14} />
                    写真を追加
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFileSelect(e, 'image')}
                    />
                  </label>
                  {isPremium && (
                    <>
                      <label className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-xs font-bold text-green-700 cursor-pointer hover:bg-green-100 touch-manipulation">
                        <Mic size={14} />
                        録音を追加
                        <input
                          type="file"
                          accept="audio/*"
                          className="hidden"
                          onChange={(e) => handleFileSelect(e, 'audio')}
                        />
                      </label>
                      <label className="flex items-center gap-2 px-3 py-2 bg-pink-50 border border-pink-200 rounded-lg text-xs font-bold text-pink-700 cursor-pointer hover:bg-pink-100 touch-manipulation">
                        <Video size={14} />
                        動画を追加
                        <input
                          type="file"
                          accept="video/*"
                          className="hidden"
                          onChange={(e) => handleFileSelect(e, 'video')}
                        />
                      </label>
                    </>
                  )}
                </div>

                {!isPremium && (
                  <p className="text-[9px] text-gray-500 mt-2">
                    無料プラン: 写真のみ添付可能（最大{FREE_PLAN_LIMITS.MAX_ATTACHMENTS}個、1ファイルあたり{FREE_PLAN_LIMITS.MAX_FILE_SIZE_MB}MBまで）。録音・動画はプレミアムプランでご利用いただけます。
                  </p>
                )}
              </div>
            </div>
          ) : (
            <>
              {log.location && (
                <div className="text-xs sm:text-sm text-gray-600 flex items-center gap-1">
                  <MapPin size={12} className="sm:w-[14px] sm:h-[14px]" />
                  {log.location}
                </div>
              )}
              <p className="text-sm sm:text-base text-gray-700 whitespace-pre-wrap leading-relaxed">{log.content}</p>
            </>
          )}

          {log.medical && (
            <div className="mt-3 bg-rose-50 border border-rose-200 rounded-lg p-2.5 sm:p-3">
              <div className="text-[9px] sm:text-[10px] font-bold text-rose-800 mb-1">
                医療記録（通院・診断書）
              </div>
              <div className="text-[11px] sm:text-xs text-rose-900 space-y-1">
                {(log.medical.visitType || log.medical.facility || log.medical.department) && (
                  <div className="text-[10px] sm:text-[11px] break-words">
                    {log.medical.visitType ? `種別: ${log.medical.visitType}` : ''}
                    {log.medical.facility ? ` / 医療機関: ${log.medical.facility}` : ''}
                    {log.medical.department ? ` / 診療科: ${log.medical.department}` : ''}
                  </div>
                )}
                {log.medical.diagnosis && <div className="text-[10px] sm:text-[11px] break-words">診断名/所見: {log.medical.diagnosis}</div>}
                {Array.isArray(log.medical.proofs) && log.medical.proofs.length > 0 && (
                  <div className="text-[10px] sm:text-[11px] break-words">資料: {log.medical.proofs.join('、')}</div>
                )}
                {log.medical.memo && <div className="text-[10px] sm:text-[11px] mt-2 break-words">メモ: {log.medical.memo}</div>}
              </div>
            </div>
          )}

          {log.attachments && log.attachments.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5 sm:gap-2">
              {log.attachments.map((att, i) => (
                <span
                  key={i}
                  className={`text-[9px] sm:text-[10px] px-2 py-1 rounded flex items-center gap-1 border shrink-0
                    ${att.type === 'image' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                      att.type === 'audio' ? 'bg-green-50 text-green-700 border-green-100' :
                      'bg-pink-50 text-pink-700 border-pink-100'
                    }`}
                >
                  {att.type === 'image' && <ImageIcon size={10} className="sm:w-3 sm:h-3" />}
                  {att.type === 'audio' && <Mic size={10} className="sm:w-3 sm:h-3" />}
                  {att.type === 'video' && <Video size={10} className="sm:w-3 sm:h-3" />}
                  <span className="truncate max-w-[120px] sm:max-w-none">{att.name}</span>
                </span>
              ))}
            </div>
          )}

          <div className="border-t pt-3 sm:pt-4 mt-3 sm:mt-4">
            <div className="flex items-center gap-2 mb-2 sm:mb-3">
              <MessageCircle size={14} className="sm:w-4 sm:h-4 text-gray-600" />
              <h3 className="text-xs sm:text-sm font-bold text-gray-700">コメント</h3>
              {comments.length > 0 && (
                <span className="text-[10px] sm:text-xs text-gray-500">({comments.length})</span>
              )}
            </div>

            {comments.length > 0 && (
              <div className="space-y-2 mb-3 sm:mb-4 max-h-[200px] overflow-y-auto">
                {comments.map((comment, idx) => (
                  <div key={idx} className="bg-gray-50 rounded-lg p-2.5 sm:p-3 border border-gray-200">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-[9px] sm:text-[10px] text-gray-500">
                        {comment.date} {comment.time}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{comment.text}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="コメントを追加..."
                className="flex-1 bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm resize-none"
                rows={2}
                style={{ fontSize: '16px' }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    handleAddComment();
                  }
                }}
              />
              <button
                onClick={handleAddComment}
                disabled={!newComment.trim()}
                className={`px-3 sm:px-4 py-2 rounded-lg font-bold text-xs sm:text-sm flex items-center gap-1 touch-manipulation active:scale-95 shrink-0 ${
                  newComment.trim()
                    ? 'bg-pink-600 active:bg-pink-700 text-white'
                    : 'bg-gray-200 text-gray-400'
                }`}
              >
                <Send size={14} className="sm:w-4 sm:h-4" />
              </button>
            </div>
            <p className="text-[9px] sm:text-[10px] text-gray-400 mt-1">Cmd/Ctrl + Enter で送信</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const TimelineView = ({ logs, onLogClick, userProfile, onShowPremium }) => {
  const [activeTab, setActiveTab] = useState('list'); // 'list' or 'pdf'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortOrder, setSortOrder] = useState('newest'); // 'newest', 'oldest', 'dateAsc', 'dateDesc'
  const [showFilters, setShowFilters] = useState(false);

  const isPremium = checkPremiumStatus();
  const userPlan = getUserPlan();
  const isFreePlan = userPlan === PLAN_TYPES.FREE;

  const sampleLogs = [
    {
      date: "2025/01/10",
      time: "19:30",
      category: "モラハラ",
      location: "自宅",
      content: "（サンプル）夕食時に暴言を吐かれた。",
      attachments: [{ type: "audio", name: "rec001.mp3" }],
    },
  ];

  const effectiveLogs = logs && logs.length > 0 ? logs : sampleLogs;

  // カテゴリ一覧を取得
  const categories = useMemo(() => {
    const cats = new Set();
    effectiveLogs.forEach(log => {
      if (log.category) cats.add(log.category);
    });
    return Array.from(cats).sort();
  }, [effectiveLogs]);

  // 日付をDateオブジェクトに変換するヘルパー
  // YYYY/MM/DD または YYYY-MM-DD 形式に対応
  const parseDate = (dateStr) => {
    if (!dateStr) return null;
    // YYYY-MM-DD形式（HTML5 date input）を処理
    if (dateStr.includes('-')) {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      }
    }
    // YYYY/MM/DD形式（ログの保存形式）を処理
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    }
    return null;
  };

  // フィルタリングとソート
  const filteredAndSortedLogs = useMemo(() => {
    let filtered = [...effectiveLogs];

    // フリーワード検索
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(log => {
        const content = (log.content || '').toLowerCase();
        const location = (log.location || '').toLowerCase();
        const category = (log.category || '').toLowerCase();
        const date = (log.date || '').toLowerCase();
        const time = (log.time || '').toLowerCase();
        return content.includes(query) || 
               location.includes(query) || 
               category.includes(query) ||
               date.includes(query) ||
               time.includes(query);
      });
    }

    // カテゴリフィルター
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(log => log.category === selectedCategory);
    }

    // 日付範囲フィルター
    if (dateFrom) {
      const fromDate = parseDate(dateFrom);
      if (fromDate) {
        // 日付のみで比較（時刻を無視）
        fromDate.setHours(0, 0, 0, 0);
        filtered = filtered.filter(log => {
          const logDate = parseDate(log.date);
          if (!logDate) return false;
          logDate.setHours(0, 0, 0, 0);
          return logDate >= fromDate;
        });
      }
    }
    if (dateTo) {
      const toDate = parseDate(dateTo);
      if (toDate) {
        // 日付のみで比較（時刻を無視）
        toDate.setHours(23, 59, 59, 999);
        filtered = filtered.filter(log => {
          const logDate = parseDate(log.date);
          if (!logDate) return false;
          logDate.setHours(0, 0, 0, 0);
          return logDate <= toDate;
        });
      }
    }

    // ソート
    filtered.sort((a, b) => {
      const dateA = parseDate(a.date) || new Date(0);
      const dateB = parseDate(b.date) || new Date(0);
      const timeA = a.time || '';
      const timeB = b.time || '';
      const timestampA = a.timestamp || a.createdAt || 0;
      const timestampB = b.timestamp || b.createdAt || 0;

      switch (sortOrder) {
        case 'newest':
          // タイムスタンプで新しい順（デフォルト）
          return timestampB - timestampA;
        case 'oldest':
          // タイムスタンプで古い順
          return timestampA - timestampB;
        case 'dateDesc':
          // 日付+時刻で新しい順
          if (dateB.getTime() !== dateA.getTime()) {
            return dateB.getTime() - dateA.getTime();
          }
          return timeB.localeCompare(timeA);
        case 'dateAsc':
          // 日付+時刻で古い順
          if (dateA.getTime() !== dateB.getTime()) {
            return dateA.getTime() - dateB.getTime();
          }
          return timeA.localeCompare(timeB);
        default:
          return timestampB - timestampA;
      }
    });

    return filtered;
  }, [effectiveLogs, searchQuery, selectedCategory, dateFrom, dateTo, sortOrder]);

  const statementData = useMemo(
    () => {
      const baseData = buildStatementDataFromLogs({ logs: effectiveLogs, userProfile });
      return {
        ...baseData,
        isFreePlan,
        watermark: isFreePlan ? FREE_PLAN_LIMITS.PDF_WATERMARK : undefined,
      };
    },
    [effectiveLogs, userProfile, isFreePlan]
  );

  // 無料プランでは1ページ目のみのため、ファイル名に「サンプル」を追加
  const fileName = isFreePlan 
    ? `陳述書_サンプル_${new Date().toLocaleDateString('ja-JP').replaceAll('/', '-')}.pdf`
    : `陳述書_${new Date().toLocaleDateString('ja-JP').replaceAll('/', '-')}.pdf`;

  // ログのインデックスを取得（フィルタリング後のインデックスから元のインデックスに変換）
  const getOriginalIndex = (filteredIndex) => {
    const filteredLog = filteredAndSortedLogs[filteredIndex];
    return effectiveLogs.findIndex(log => log === filteredLog);
  };

  return (
    <div className="pb-24">
      {/* タブ切り替え */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 mb-4">
        <div className="flex">
          <button
            onClick={() => setActiveTab('list')}
            className={`flex-1 py-3 text-center font-bold text-sm border-b-2 transition-colors ${
              activeTab === 'list'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <FileText size={16} className="inline-block mr-1" />
            ログ一覧 ({filteredAndSortedLogs.length})
          </button>
          <button
            onClick={() => setActiveTab('pdf')}
            className={`flex-1 py-3 text-center font-bold text-sm border-b-2 transition-colors ${
              activeTab === 'pdf'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <FileText size={16} className="inline-block mr-1" />
            PDF出力
          </button>
        </div>
      </div>

      {activeTab === 'list' ? (
        <div className="p-4 space-y-4">
          {/* 検索バー */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3">
            <div className="flex items-center gap-2 mb-2">
              <Search size={16} className="text-gray-400" />
              <input
                type="text"
                placeholder="フリーワード検索（内容、場所、カテゴリなど）"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-500"
              />
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`p-2 rounded-lg border transition-colors ${
                  showFilters
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100'
                }`}
                title="フィルター"
              >
                <Filter size={16} />
              </button>
            </div>

            {/* フィルターオプション */}
            {showFilters && (
              <div className="mt-3 pt-3 border-t border-gray-200 space-y-3">
                {/* カテゴリフィルター */}
                <div>
                  <label className="text-xs font-bold text-gray-700 mb-1 block">カテゴリ</label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-500"
                  >
                    <option value="all">すべて</option>
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                {/* 日付範囲 */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-bold text-gray-700 mb-1 block">開始日</label>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-700 mb-1 block">終了日</label>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-500"
                    />
                  </div>
                </div>

                {/* ソート */}
                <div>
                  <label className="text-xs font-bold text-gray-700 mb-1 block flex items-center gap-1">
                    <ArrowUpDown size={12} />
                    並び替え
                  </label>
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-500"
                  >
                    <option value="newest">新しい順（記録順）</option>
                    <option value="oldest">古い順（記録順）</option>
                    <option value="dateDesc">日付：新しい順</option>
                    <option value="dateAsc">日付：古い順</option>
                  </select>
                </div>

                {/* フィルターリセット */}
                {(searchQuery || selectedCategory !== 'all' || dateFrom || dateTo) && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategory('all');
                      setDateFrom('');
                      setDateTo('');
                    }}
                    className="w-full text-xs text-gray-600 hover:text-gray-800 underline"
                  >
                    フィルターをリセット
                  </button>
                )}
              </div>
            )}
          </div>

          {/* ログ一覧 */}
          {filteredAndSortedLogs.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <FileText size={48} className="mx-auto mb-2 opacity-20" />
              <p>該当するログがありません。</p>
              {(searchQuery || selectedCategory !== 'all' || dateFrom || dateTo) && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('all');
                    setDateFrom('');
                    setDateTo('');
                  }}
                  className="mt-4 text-sm text-pink-600 hover:text-pink-700 underline"
                >
                  フィルターをリセット
                </button>
              )}
            </div>
          ) : (
            filteredAndSortedLogs.map((log, idx) => {
              const originalIdx = getOriginalIndex(idx);
              return (
                <div
                  key={idx}
                  onClick={() => onLogClick(log, originalIdx >= 0 ? originalIdx : idx)}
                  className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-slate-900 relative cursor-pointer hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      {log.date} {log.time}
                    </span>
                    <span
                      className={`text-xs font-bold px-2 py-1 rounded text-white
                        ${log.category === '暴力・DV' ? 'bg-red-600' :
                          log.category === '不貞・浮気' ? 'bg-purple-600' :
                          log.category === 'モラハラ' ? 'bg-orange-500' :
                          log.category === '通院・診断書' ? 'bg-rose-600' :
                          'bg-gray-500'
                        }`}
                    >
                      {log.category}
                    </span>
                  </div>

                  <p className="text-sm text-gray-700 whitespace-pre-wrap line-clamp-3">{log.content}</p>

                  {log.comments && log.comments.length > 0 && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-gray-500">
                      <MessageCircle size={12} />
                      <span>{log.comments.length}件のコメント</span>
                    </div>
                  )}

                  {log.medical && (
                    <div className="mt-3 bg-rose-50 border border-rose-200 rounded-lg p-3">
                      <div className="text-[10px] font-bold text-rose-800 mb-1">
                        医療記録（通院・診断書）
                      </div>
                      <div className="text-xs text-rose-900 space-y-1">
                        {(log.medical.visitType || log.medical.facility || log.medical.department) && (
                          <div className="text-[11px]">
                            {log.medical.visitType ? `種別: ${log.medical.visitType}` : ''}
                            {log.medical.facility ? ` / 医療機関: ${log.medical.facility}` : ''}
                            {log.medical.department ? ` / 診療科: ${log.medical.department}` : ''}
                          </div>
                        )}
                        {log.medical.diagnosis && <div className="text-[11px]">診断名/所見: {log.medical.diagnosis}</div>}
                        {Array.isArray(log.medical.proofs) && log.medical.proofs.length > 0 && (
                          <div className="text-[11px]">資料: {log.medical.proofs.join('、')}</div>
                        )}
                      </div>
                    </div>
                  )}

                  {log.attachments && log.attachments.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {log.attachments.map((att, i) => (
                        <span
                          key={i}
                          className={`text-[10px] px-2 py-1 rounded flex items-center gap-1 border
                            ${att.type === 'image' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                              att.type === 'audio' ? 'bg-green-50 text-green-700 border-green-100' :
                              'bg-pink-50 text-pink-700 border-pink-100'
                            }`}
                        >
                          {att.type === 'image' && <ImageIcon size={12} />}
                          {att.type === 'audio' && <Mic size={12} />}
                          {att.type === 'video' && <Video size={12} />}
                          {att.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* PDF出力セクション */
        <div className="p-4">
          {effectiveLogs.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <FileText size={48} className="mx-auto mb-2 opacity-20" />
              <p>PDF出力するには、まずログを記録してください。</p>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
              <h2 className="font-bold text-lg mb-2 text-slate-900 flex items-center gap-2">
                <FileText size={20} /> 提出用PDF（陳述書）
              </h2>
              <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                記録されたデータを、裁判所提出用の<strong>陳述書フォーマット</strong>として出力します。
                <br />
                <span className="text-pink-600">※表示中のプレビューと実際のPDFは同一のフォーマットです。</span>
              </p>

              {/* 無料プラン時の制限通知 */}
              {isFreePlan && (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg mb-4">
                  <div className="flex items-start gap-2">
                    <Crown size={16} className="text-yellow-600 mt-0.5" />
                    <div className="flex-1">
                      <div className="text-sm font-bold text-yellow-900 mb-1">無料プランの制限</div>
                      <div className="text-xs text-yellow-800 leading-relaxed">
                        無料プランでは、<strong>1ページ目のみ</strong>出力可能です。また、PDFには「<strong>SAMPLE</strong>」という透かしが入ります。
                        <br />
                        全ページ出力・透かしなしの正式版をご希望の場合は、プレミアムプランへのアップグレードが必要です。
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* PDFプレビュー */}
              <div className="bg-white border border-gray-300 shadow-md overflow-hidden rounded-xl mb-4" style={{ height: '400px' }}>
                <BlobProvider document={<StatementDocument data={statementData} />}>
                  {({ url, loading, error }) => {
                    if (loading) {
                      return <div className="p-6 text-xs text-gray-500 h-full flex items-center justify-center">プレビューを生成中...</div>;
                    }
                    if (error || !url) {
                      return <div className="p-6 text-xs text-red-600 h-full flex items-center justify-center">プレビューの生成に失敗しました。</div>;
                    }
                    return (
                      <iframe
                        title="陳述書プレビュー"
                        src={url}
                        className="w-full h-full border-0"
                      />
                    );
                  }}
                </BlobProvider>
              </div>

              {/* PDFダウンロードボタン */}
              <div className="mt-4">
                <PDFDownloadLink
                  document={<StatementDocument data={statementData} />}
                  fileName={fileName}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded shadow-lg flex items-center justify-center gap-2"
                >
                  {({ loading }) => (
                    <>
                      <FileText size={18} /> {loading ? "PDF生成中…" : isFreePlan ? "PDFファイルを出力する（1ページ目・透かし付き）" : "PDFファイルを出力する"}
                    </>
                  )}
                </PDFDownloadLink>
                <p className="text-[10px] text-center text-gray-500 mt-2">
                  {isFreePlan 
                    ? "※無料プランでは1ページ目のみ、透かし付きで出力されます。"
                    : "※端末にPDFとして保存されます。コンビニ等で印刷可能です。"
                  }
                </p>
                {isFreePlan && onShowPremium && (
                  <div className="mt-3">
                    <button
                      onClick={onShowPremium}
                      className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-bold py-2 px-4 rounded-lg text-xs flex items-center justify-center gap-2"
                    >
                      <Crown size={14} /> プレミアムプランで全ページ出力・透かしなし版を利用する
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const AddLogView = ({ onSave, onCancel, onShowPremium }) => {
  const [category, setCategory] = useState("モラハラ");
  const [content, setContent] = useState("");
  const [location, setLocation] = useState("");
  const [attachments, setAttachments] = useState([]);
  const isPremium = checkPremiumStatus();
  
  // 容量制限（無料版：合計10MB、プレミアム：無制限）
  const MAX_ATTACHMENTS_FREE = 3;
  const MAX_TOTAL_SIZE_MB_FREE = 10;

  // 医療的裏付け（通院・診断書等）
  const [medicalEnabled, setMedicalEnabled] = useState(false);
  const [medicalFacility, setMedicalFacility] = useState("");
  const [medicalDepartment, setMedicalDepartment] = useState("");
  const [medicalVisitType, setMedicalVisitType] = useState("通院");
  const [medicalDiagnosis, setMedicalDiagnosis] = useState("");
  const [medicalSeverity, setMedicalSeverity] = useState("不明");
  const [medicalProofs, setMedicalProofs] = useState([]);
  const [medicalMemo, setMedicalMemo] = useState("");

  const isMedicalCategory = category === "通院・診断書";

  // カテゴリ切替: 医療カテゴリ以外では医療メニューはデフォルト閉（開きっぱなし防止）
  const prevCategoryRef = useRef(category);
  useEffect(() => {
    if (prevCategoryRef.current !== category) {
      setMedicalEnabled(category === "通院・診断書");
      prevCategoryRef.current = category;
    }
  }, [category]);

  const toggleMedicalProof = (label) => {
    setMedicalProofs((prev) => (prev.includes(label) ? prev.filter((x) => x !== label) : [...prev, label]));
  };

  const medicalHasData = () =>
    Boolean(
      medicalFacility.trim() ||
        medicalDepartment.trim() ||
        medicalDiagnosis.trim() ||
        medicalMemo.trim() ||
        (Array.isArray(medicalProofs) && medicalProofs.length > 0) ||
        (medicalVisitType && medicalVisitType !== "通院") ||
        (medicalSeverity && medicalSeverity !== "不明")
    );

  const buildMedicalAutoText = () => {
    const parts = [];
    if (medicalVisitType) parts.push(`種別: ${medicalVisitType}`);
    if (medicalFacility) parts.push(`医療機関: ${medicalFacility}`);
    if (medicalDepartment) parts.push(`診療科: ${medicalDepartment}`);
    if (medicalDiagnosis) parts.push(`診断名/所見: ${medicalDiagnosis}`);
    if (medicalSeverity && medicalSeverity !== "不明") parts.push(`程度: ${medicalSeverity}`);
    if (medicalProofs.length) parts.push(`証明資料: ${medicalProofs.join("、")}`);
    if (medicalMemo) parts.push(`メモ: ${medicalMemo}`);
    return parts.length ? `【医療記録】${parts.join(" / ")}` : "";
  };

  const handleLocation = () => setLocation("東京都港区（GPS取得済）");
  const handleFileSelect = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const userPlan = getUserPlan();
    
    // 無料プラン：写真のみ許可
    if (userPlan === PLAN_TYPES.FREE) {
      if (type !== 'image') {
        alert('無料プランでは写真のみ添付できます。録音・動画はプレミアムプランでご利用いただけます。');
        e.target.value = ''; // ファイル選択をリセット
        return;
      }
      
      if (attachments.length >= FREE_PLAN_LIMITS.MAX_ATTACHMENTS) {
        alert(`無料版では最大${FREE_PLAN_LIMITS.MAX_ATTACHMENTS}個まで添付できます。プレミアムプランで無制限になります。`);
        e.target.value = '';
        return;
      }
      
      const fileSizeMB = file.size / (1024 * 1024);
      if (fileSizeMB > FREE_PLAN_LIMITS.MAX_FILE_SIZE_MB) {
        alert(`無料版では1ファイルあたり最大${FREE_PLAN_LIMITS.MAX_FILE_SIZE_MB}MBまでです。プレミアムプランで無制限になります。`);
        e.target.value = '';
        return;
      }
    }
    
    setAttachments([...attachments, { type, name: file.name, size: file.size }]);
  };
  const removeAttachment = (index) => {
    const newAtt = [...attachments];
    newAtt.splice(index, 1);
    setAttachments(newAtt);
  };

  const handleSubmit = () => {
    const now = new Date();
    const trimmed = String(content || "").trim();
    const medicalAuto = (medicalEnabled || isMedicalCategory) && medicalHasData() ? buildMedicalAutoText() : "";
    const finalContent = trimmed || medicalAuto;
    if (!finalContent) return alert("内容を入力してください（または医療記録の項目を入力してください）");

    const medical =
      (medicalEnabled || isMedicalCategory) && medicalHasData()
        ? {
            facility: medicalFacility.trim(),
            department: medicalDepartment.trim(),
            visitType: medicalVisitType,
            diagnosis: medicalDiagnosis.trim(),
            severity: medicalSeverity,
            proofs: medicalProofs,
            memo: medicalMemo.trim(),
          }
        : null;

    onSave({
      date: now.toLocaleDateString(),
      time: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      category,
      location: location || "場所不明",
      content: finalContent,
      attachments,
      medical,
    });
  };

  const categories = ["モラハラ", "暴力・DV", "不貞・浮気", "生活費未払い", "育児放棄", "通院・診断書", "その他"];

    return (
        <div className="p-4 bg-white min-h-full pb-24">
            <h2 className="font-bold text-lg mb-4 text-slate-900">新規ログ記録</h2>
            <div className="space-y-4">
                <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">カテゴリ</label>
                    <div className="flex flex-wrap gap-2">
                        {categories.map(c => (
                            <button key={c} onClick={() => setCategory(c)} className={`px-3 py-2 rounded text-xs font-bold border transition ${category === c ? "bg-slate-900 text-white border-slate-900" : "bg-white text-gray-600 border-gray-200"}`}>{c}</button>
                        ))}
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">場所</label>
                    <div className="flex gap-2">
                        <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="自動取得ボタン" className="flex-1 bg-gray-50 border border-gray-200 rounded p-3 text-sm" />
                        <button onClick={handleLocation} className="bg-gray-200 p-3 rounded text-gray-600"><MapPin size={20} /></button>
                    </div>
                            </div>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full h-32 bg-gray-50 border border-gray-200 rounded p-3 text-sm focus:outline-none focus:border-slate-900"
                  placeholder={
                    isMedicalCategory
                      ? "受診理由・症状・相手方の行為との関係など（空でも医療項目だけで保存できます）"
                      : "詳細を入力（必要なら下で“医療情報”も追加できます）"
                  }
                />

                {/* 医療的裏付け（通院・診断書等） */}
                {isMedicalCategory ? (
                  <div className="bg-rose-50 border border-rose-200 rounded-xl p-4">
                    <div className="text-xs font-bold text-rose-800 mb-2">医療記録（通院・診断書）</div>
                    <p className="text-[10px] text-rose-700 leading-relaxed mb-3">
                      診断書・通院履歴・領収書・処方箋などは<strong>証拠力が強く</strong>、増額や立証（勝率）の面で有利になりやすいです。可能なら写真で添付してください。
                    </p>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <label className="space-y-1">
                          <div className="text-xs font-bold text-rose-900">医療機関名</div>
                          <input
                            value={medicalFacility}
                            onChange={(e) => setMedicalFacility(e.target.value)}
                            placeholder="例）〇〇クリニック"
                            className="w-full bg-white border border-rose-200 rounded-lg px-3 py-2 text-xs"
                          />
                        </label>
                        <label className="space-y-1">
                          <div className="text-xs font-bold text-rose-900">診療科</div>
                          <select
                            value={medicalDepartment}
                            onChange={(e) => setMedicalDepartment(e.target.value)}
                            className="w-full bg-white border border-rose-200 rounded-lg px-3 py-2 text-xs"
                          >
                            <option value="">未選択</option>
                            <option value="心療内科">心療内科</option>
                            <option value="精神科">精神科</option>
                            <option value="内科">内科</option>
                            <option value="整形外科">整形外科</option>
                            <option value="産婦人科">産婦人科</option>
                            <option value="その他">その他</option>
                          </select>
                        </label>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <label className="space-y-1">
                          <div className="text-xs font-bold text-rose-900">種別</div>
                          <select
                            value={medicalVisitType}
                            onChange={(e) => setMedicalVisitType(e.target.value)}
                            className="w-full bg-white border border-rose-200 rounded-lg px-3 py-2 text-xs"
                          >
                            <option value="通院">通院</option>
                            <option value="診断書取得">診断書取得</option>
                            <option value="カウンセリング">カウンセリング</option>
                            <option value="入院">入院</option>
                            <option value="薬/処方">薬/処方</option>
                          </select>
                        </label>
                        <label className="space-y-1">
                          <div className="text-xs font-bold text-rose-900">程度</div>
                          <select
                            value={medicalSeverity}
                            onChange={(e) => setMedicalSeverity(e.target.value)}
                            className="w-full bg-white border border-rose-200 rounded-lg px-3 py-2 text-xs"
                          >
                            <option value="不明">不明</option>
                            <option value="軽度">軽度</option>
                            <option value="中等度">中等度</option>
                            <option value="重度">重度</option>
                          </select>
                        </label>
                      </div>

                      <label className="space-y-1">
                        <div className="text-xs font-bold text-rose-900">診断名/所見（任意）</div>
                        <input
                          value={medicalDiagnosis}
                          onChange={(e) => setMedicalDiagnosis(e.target.value)}
                          placeholder="例）適応障害、PTSDの疑い、打撲 など"
                          className="w-full bg-white border border-rose-200 rounded-lg px-3 py-2 text-xs"
                        />
                      </label>

                      <div className="space-y-2">
                        <div className="text-xs font-bold text-rose-900">証明できる資料（チェック）</div>
                        <div className="flex flex-wrap gap-2">
                          {[
                            "診断書",
                            "通院履歴/明細",
                            "領収書",
                            "処方箋/薬袋",
                            "休職/就労制限の資料",
                            "その他資料",
                          ].map((label) => (
                            <button
                              key={label}
                              type="button"
                              onClick={() => toggleMedicalProof(label)}
                              className={`text-[11px] font-bold px-3 py-1.5 rounded-full border transition ${
                                medicalProofs.includes(label)
                                  ? "bg-white border-rose-300 text-rose-800"
                                  : "bg-rose-100 border-rose-200 text-rose-700 hover:bg-rose-200"
                              }`}
                            >
                              {medicalProofs.includes(label) ? "✓ " : ""}
                              {label}
                            </button>
                          ))}
                        </div>
                        <p className="text-[10px] text-rose-700">※資料は「写真」添付でOK（診断書・領収書・処方箋など）。</p>
                      </div>

                      <label className="space-y-1">
                        <div className="text-xs font-bold text-rose-900">メモ（任意）</div>
                        <textarea
                          value={medicalMemo}
                          onChange={(e) => setMedicalMemo(e.target.value)}
                          placeholder="例）受診日/症状/医師の説明、通院頻度、休職の有無など"
                          className="w-full h-20 bg-white border border-rose-200 rounded-lg px-3 py-2 text-xs"
                        />
                      </label>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white border border-rose-200 rounded-xl p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-xs font-bold text-slate-900">医療情報（任意）</div>
                      <button
                        type="button"
                        onClick={() => setMedicalEnabled((v) => !v)}
                        className={`text-xs font-bold px-3 py-1.5 rounded-full border transition ${
                          medicalEnabled
                            ? "bg-rose-50 border-rose-200 text-rose-700"
                            : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                        }`}
                        title="医療情報を追加する（任意）"
                      >
                        {medicalEnabled ? "追加中" : "追加する"}
                      </button>
                    </div>
                    <p className="text-[10px] text-gray-500 leading-relaxed mt-2">
                      診断書・通院履歴・領収書・処方箋などは<strong>証拠力が強く</strong>、増額や立証（勝率）の面で有利になりやすいです。<br />
                      DV等のログに「医療的裏付け」を紐づけたい場合は、ここから同一ログ内に残せます。
                    </p>
                    {medicalEnabled && (
                      <div className="mt-3 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <label className="space-y-1">
                            <div className="text-xs font-bold text-rose-900">医療機関名</div>
                            <input
                              value={medicalFacility}
                              onChange={(e) => setMedicalFacility(e.target.value)}
                              placeholder="例）〇〇クリニック"
                              className="w-full bg-white border border-rose-200 rounded-lg px-3 py-2 text-xs"
                            />
                          </label>
                          <label className="space-y-1">
                            <div className="text-xs font-bold text-rose-900">診療科</div>
                            <select
                              value={medicalDepartment}
                              onChange={(e) => setMedicalDepartment(e.target.value)}
                              className="w-full bg-white border border-rose-200 rounded-lg px-3 py-2 text-xs"
                            >
                              <option value="">未選択</option>
                              <option value="心療内科">心療内科</option>
                              <option value="精神科">精神科</option>
                              <option value="内科">内科</option>
                              <option value="整形外科">整形外科</option>
                              <option value="産婦人科">産婦人科</option>
                              <option value="その他">その他</option>
                            </select>
                          </label>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <label className="space-y-1">
                            <div className="text-xs font-bold text-rose-900">種別</div>
                            <select
                              value={medicalVisitType}
                              onChange={(e) => setMedicalVisitType(e.target.value)}
                              className="w-full bg-white border border-rose-200 rounded-lg px-3 py-2 text-xs"
                            >
                              <option value="通院">通院</option>
                              <option value="診断書取得">診断書取得</option>
                              <option value="カウンセリング">カウンセリング</option>
                              <option value="入院">入院</option>
                              <option value="薬/処方">薬/処方</option>
                            </select>
                          </label>
                          <label className="space-y-1">
                            <div className="text-xs font-bold text-rose-900">程度</div>
                            <select
                              value={medicalSeverity}
                              onChange={(e) => setMedicalSeverity(e.target.value)}
                              className="w-full bg-white border border-rose-200 rounded-lg px-3 py-2 text-xs"
                            >
                              <option value="不明">不明</option>
                              <option value="軽度">軽度</option>
                              <option value="中等度">中等度</option>
                              <option value="重度">重度</option>
                            </select>
                          </label>
                        </div>

                        <label className="space-y-1">
                          <div className="text-xs font-bold text-rose-900">診断名/所見（任意）</div>
                          <input
                            value={medicalDiagnosis}
                            onChange={(e) => setMedicalDiagnosis(e.target.value)}
                            placeholder="例）適応障害、PTSDの疑い、打撲 など"
                            className="w-full bg-white border border-rose-200 rounded-lg px-3 py-2 text-xs"
                          />
                        </label>

                        <div className="space-y-2">
                          <div className="text-xs font-bold text-rose-900">証明できる資料（チェック）</div>
                          <div className="flex flex-wrap gap-2">
                            {[
                              "診断書",
                              "通院履歴/明細",
                              "領収書",
                              "処方箋/薬袋",
                              "休職/就労制限の資料",
                              "その他資料",
                            ].map((label) => (
                              <button
                                key={label}
                                type="button"
                                onClick={() => toggleMedicalProof(label)}
                                className={`text-[11px] font-bold px-3 py-1.5 rounded-full border transition ${
                                  medicalProofs.includes(label)
                                    ? "bg-rose-50 border-rose-300 text-rose-800"
                                    : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                                }`}
                              >
                                {medicalProofs.includes(label) ? "✓ " : ""}
                                {label}
                              </button>
                            ))}
                          </div>
                          <p className="text-[10px] text-gray-500">※資料は「写真」添付でOK（診断書・領収書・処方箋など）。</p>
                        </div>

                        <label className="space-y-1">
                          <div className="text-xs font-bold text-rose-900">メモ（任意）</div>
                          <textarea
                            value={medicalMemo}
                            onChange={(e) => setMedicalMemo(e.target.value)}
                            placeholder="例）受診日/症状/医師の説明、通院頻度、休職の有無など"
                            className="w-full h-20 bg-white border border-rose-200 rounded-lg px-3 py-2 text-xs"
                          />
                        </label>
                      </div>
                    )}
                  </div>
                )}
                
                <div className="flex gap-4 mb-2">
                    <label className="flex flex-col items-center justify-center w-16 h-16 bg-gray-50 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-100">
                      <ImageIcon size={20} className="text-gray-400 mb-1"/>
                      <span className="text-[10px] text-gray-500">写真</span>
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileSelect(e, 'image')} />
                    </label>
                    <label 
                      className={`flex flex-col items-center justify-center w-16 h-16 border rounded-lg relative ${isPremium ? 'bg-gray-50 border-gray-200 cursor-pointer hover:bg-gray-100' : 'bg-gray-50 border-yellow-300 cursor-pointer hover:bg-yellow-50'}`}
                      onClick={!isPremium ? (e) => {
                        e.preventDefault();
                        if (onShowPremium) {
                          onShowPremium();
                        } else {
                          alert('録音機能はプレミアムプランでご利用いただけます。');
                        }
                      } : undefined}
                    >
                      <div className="relative">
                        <Mic size={20} className="text-gray-400 mb-1"/>
                        {!isPremium && (
                          <Crown size={10} className="absolute -top-1 -right-1 text-yellow-500 fill-yellow-500" />
                        )}
                      </div>
                      <span className="text-[10px] text-gray-500">録音</span>
                      {isPremium && (
                        <input type="file" accept="audio/*" className="hidden" onChange={(e) => handleFileSelect(e, 'audio')} />
                      )}
                    </label>
                    <label 
                      className={`flex flex-col items-center justify-center w-16 h-16 border rounded-lg relative ${isPremium ? 'bg-gray-50 border-gray-200 cursor-pointer hover:bg-gray-100' : 'bg-gray-50 border-yellow-300 cursor-pointer hover:bg-yellow-50'}`}
                      onClick={!isPremium ? (e) => {
                        e.preventDefault();
                        if (onShowPremium) {
                          onShowPremium();
                        } else {
                          alert('動画機能はプレミアムプランでご利用いただけます。');
                        }
                      } : undefined}
                    >
                      <div className="relative">
                        <Video size={20} className="text-gray-400 mb-1"/>
                        {!isPremium && (
                          <Crown size={10} className="absolute -top-1 -right-1 text-yellow-500 fill-yellow-500" />
                        )}
                      </div>
                      <span className="text-[10px] text-gray-500">動画</span>
                      {isPremium && (
                        <input type="file" accept="video/*" className="hidden" onChange={(e) => handleFileSelect(e, 'video')} />
                      )}
                    </label>
                </div>
                {!isPremium && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 text-[10px] text-blue-800 mb-2">
                    <span className="font-bold">無料プラン:</span> 写真のみ添付可能（最大{FREE_PLAN_LIMITS.MAX_ATTACHMENTS}個、1ファイルあたり{FREE_PLAN_LIMITS.MAX_FILE_SIZE_MB}MBまで）。録音・動画はプレミアムプランでご利用いただけます。
                  </div>
                )}
                {!isPremium && attachments.length > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2 text-[10px] text-yellow-800">
                    <Crown size={10} className="inline mr-1" />
                    無料版: {attachments.length}/{FREE_PLAN_LIMITS.MAX_ATTACHMENTS}個まで。プレミアムプランで無制限になります。
                  </div>
                )}
                {attachments.length > 0 && (
                    <div className="flex flex-col gap-2 bg-gray-50 p-3 rounded">
                        {attachments.map((att, index) => (
                            <div key={index} className="flex justify-between items-center bg-white border border-gray-200 p-2 rounded text-xs">
                                <span className="truncate max-w-[200px]">{att.name}</span>
                                <button onClick={() => removeAttachment(index)}><X size={14} /></button>
                            </div>
                        ))}
                    </div>
                )}

                <div className="flex gap-3 pt-4">
                    <button onClick={onCancel} className="flex-1 py-3 text-gray-500 font-bold text-sm">キャンセル</button>
                    <button onClick={handleSubmit} className="flex-1 bg-slate-900 text-white font-bold py-3 rounded shadow-lg">保存</button>
                </div>
            </div>
        </div>
    );
};

// --- 離婚後の生活支援タブ ---
const LifeSupportView = () => {
  return (
    <div className="p-4 pb-24 space-y-4">
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-4 rounded-xl shadow-sm">
        <h2 className="text-lg font-bold flex items-center gap-2 mb-2">
          <HeartHandshake size={20} /> 離婚後の生活支援
        </h2>
        <p className="text-xs text-purple-50/90 leading-relaxed">
          離婚後の新しい生活をサポートする各種サービスをご紹介します。
        </p>
      </div>

      {/* 住まい探し */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
        <div className="flex items-center gap-2 mb-3">
          <Building2 size={18} className="text-blue-600" />
          <h3 className="text-sm font-bold text-slate-900">住まい探し</h3>
        </div>
        <p className="text-xs text-gray-600 leading-relaxed mb-3">
          離婚後の新しい住まいを探す際のサポートサービスです。賃貸・シェアハウスなど、あなたの状況に合った物件をご紹介します。
        </p>
        <div className="space-y-2">
          <a
            href="https://www.suumo.jp/"
            target="_blank"
            rel="noopener noreferrer"
            className="block p-3 rounded-lg border border-blue-200 bg-gradient-to-r from-blue-50 to-blue-100 hover:shadow-md transition"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-900">SUUMO（賃貸・売買）</span>
              <ExternalLink size={14} className="text-blue-400" />
            </div>
          </a>
          <a
            href="https://www.athome.co.jp/"
            target="_blank"
            rel="noopener noreferrer"
            className="block p-3 rounded-lg border border-blue-200 bg-gradient-to-r from-blue-50 to-blue-100 hover:shadow-md transition"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-900">at home（賃貸・売買）</span>
              <ExternalLink size={14} className="text-blue-400" />
            </div>
          </a>
          <a
            href="https://www.oheya-sumai.jp/"
            target="_blank"
            rel="noopener noreferrer"
            className="block p-3 rounded-lg border border-purple-200 bg-gradient-to-r from-purple-50 to-purple-100 hover:shadow-md transition"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-900">お部屋探し（シェアハウス特化）</span>
              <ExternalLink size={14} className="text-purple-400" />
            </div>
          </a>
        </div>
      </div>

      {/* 仕事探し */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
        <div className="flex items-center gap-2 mb-3">
          <Briefcase size={18} className="text-green-600" />
          <h3 className="text-sm font-bold text-slate-900">仕事探し</h3>
        </div>
        <p className="text-xs text-gray-600 leading-relaxed mb-3">
          離婚後の経済的自立をサポートする転職・パート情報サービスです。シングルマザー向けの求人も多数掲載されています。
        </p>
        <div className="space-y-2">
          <a
            href="https://www.rikunabi.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="block p-3 rounded-lg border border-green-200 bg-gradient-to-r from-green-50 to-green-100 hover:shadow-md transition"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-green-900">リクナビ（転職）</span>
              <ExternalLink size={14} className="text-green-400" />
            </div>
          </a>
          <a
            href="https://www.mynavi.jp/"
            target="_blank"
            rel="noopener noreferrer"
            className="block p-3 rounded-lg border border-green-200 bg-gradient-to-r from-green-50 to-green-100 hover:shadow-md transition"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-green-900">マイナビ（転職）</span>
              <ExternalLink size={14} className="text-green-400" />
            </div>
          </a>
          <a
            href="https://www.baito.mynavi.jp/"
            target="_blank"
            rel="noopener noreferrer"
            className="block p-3 rounded-lg border border-emerald-200 bg-gradient-to-r from-emerald-50 to-emerald-100 hover:shadow-md transition"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-900">マイナビバイト（パート・アルバイト）</span>
              <ExternalLink size={14} className="text-emerald-400" />
            </div>
          </a>
        </div>
      </div>

      {/* シングルマザー向け保険 */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
        <div className="flex items-center gap-2 mb-3">
          <HeartHandshake size={18} className="text-pink-600" />
          <h3 className="text-sm font-bold text-slate-900">シングルマザー向け保険</h3>
        </div>
        <p className="text-xs text-gray-600 leading-relaxed mb-3">
          一人親家庭向けの保険商品をご紹介します。医療保険・生命保険など、あなたとお子様の将来を守る保険選びをサポートします。
        </p>
        <div className="space-y-2">
          <a
            href="https://www.sonysonpo.co.jp/"
            target="_blank"
            rel="noopener noreferrer"
            className="block p-3 rounded-lg border border-pink-200 bg-gradient-to-r from-pink-50 to-pink-100 hover:shadow-md transition"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-pink-900">損保ジャパン（保険比較）</span>
              <ExternalLink size={14} className="text-pink-400" />
            </div>
          </a>
          <a
            href="https://www.ins-saison.co.jp/"
            target="_blank"
            rel="noopener noreferrer"
            className="block p-3 rounded-lg border border-pink-200 bg-gradient-to-r from-pink-50 to-pink-100 hover:shadow-md transition"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-pink-900">セゾン自動車火災保険（保険比較）</span>
              <ExternalLink size={14} className="text-pink-400" />
            </div>
          </a>
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
        <div className="text-[10px] text-yellow-800 leading-relaxed">
          <strong>ご注意:</strong> 上記リンクは外部サイトへ移動します。アフィリエイトリンクを含む場合があります。
        </div>
      </div>
    </div>
  );
};

// --- プレミアムプラン管理 ---
const PremiumPlanView = ({ user, onClose }) => {
  const [isPremium, setIsPremium] = useState(() => {
    try {
      const premium = localStorage.getItem('riko_premium');
      if (!premium) return false;
      const data = JSON.parse(premium);
      if (!data.expiresAt) return false;
      return new Date(data.expiresAt) > new Date();
    } catch {
      return false;
    }
  });

  const [premiumData, setPremiumData] = useState(() => {
    try {
      const premium = localStorage.getItem('riko_premium');
      return premium ? JSON.parse(premium) : null;
    } catch {
      return null;
    }
  });

  const handleSubscribe = (planPrice) => {
    // デモ用：実際の決済処理は実装が必要
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1); // 1ヶ月後
    
    const newPremiumData = {
      subscribedAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString(),
      planPrice,
      status: 'active'
    };
    
    localStorage.setItem('riko_premium', JSON.stringify(newPremiumData));
    setPremiumData(newPremiumData);
    setIsPremium(true);
    alert(`プレミアムプラン（月額${planPrice}円）に登録しました。\n※これはデモです。実際の決済処理は実装が必要です。`);
  };

  const handleCancel = () => {
    if (confirm('プレミアムプランを解約しますか？')) {
      if (premiumData) {
        const updated = { ...premiumData, status: 'cancelled', cancelledAt: new Date().toISOString() };
        localStorage.setItem('riko_premium', JSON.stringify(updated));
      }
      setIsPremium(false);
      alert('プレミアムプランを解約しました。');
    }
  };

  const getDaysRemaining = () => {
    if (!premiumData?.expiresAt) return 0;
    const expires = new Date(premiumData.expiresAt);
    const now = new Date();
    const diff = expires - now;
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  return (
    <div className="p-4 pb-24">
      <div className="flex items-center justify-between mb-4">
        <div className="font-bold text-slate-900 flex items-center gap-2">
          <Crown size={20} className="text-yellow-500" /> プレミアムプラン
        </div>
        <button
          onClick={onClose}
          className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold px-3 py-2 rounded-lg text-xs flex items-center gap-1"
        >
          <ArrowLeft size={14} /> 戻る
        </button>
      </div>

      {isPremium && premiumData ? (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white p-4 rounded-xl shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Crown size={20} />
              <div className="text-sm font-bold">プレミアム会員</div>
            </div>
            <div className="text-xs text-yellow-50/90">
              有効期限まであと <strong>{getDaysRemaining()}日</strong>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
            <div className="text-xs font-bold text-gray-500 mb-3">利用中の特典</div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs">
                <CheckCircle2 size={16} className="text-green-500" />
                <span className="text-gray-700">動画・音声の容量無制限</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <CheckCircle2 size={16} className="text-green-500" />
                <span className="text-gray-700">広告非表示</span>
              </div>
                <div className="flex items-center gap-2 text-xs">
                <CheckCircle2 size={16} className="text-green-500" />
                <span className="text-gray-700">カモフラージュアイコン変更（天気予報、ニュースなど）</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <CheckCircle2 size={16} className="text-green-500" />
                <span className="text-gray-700">PDF全ページ出力・透かしなし（陳述書の正式版）</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleCancel}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg"
          >
            解約する
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
            <div className="text-sm font-bold text-slate-900 mb-2">プレミアムプランの特典</div>
            <div className="space-y-2 text-xs text-gray-600 mb-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-green-500" />
                <span>動画・音声の容量無制限</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-green-500" />
                <span>広告非表示</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-green-500" />
                <span>カモフラージュアイコン変更（天気予報、ニュースなど）</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-green-500" />
                <span>PDF全ページ出力・透かしなし（陳述書の正式版）</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => handleSubscribe(450)}
            className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 text-white p-6 rounded-xl shadow-md hover:shadow-lg transition border-2 border-yellow-400"
          >
            <div className="text-2xl font-bold mb-1">¥450</div>
            <div className="text-sm text-yellow-50/90">月額</div>
          </button>

          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
            <div className="text-[10px] text-yellow-800 leading-relaxed">
              <strong>ご注意:</strong> これはデモです。実際の決済処理は実装が必要です。
            </div>
          </div>
        </div>
      )}
        </div>
    );
};

// --- MainApp ---
const MainApp = ({ onLock, user, onLogout }) => {
  const [view, setView] = useState("dashboard"); // dashboard, timeline, add, messages, board, export, safety, lifeSupport, premium
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState(null);
  const [selectedLog, setSelectedLog] = useState(null);
  const [selectedLogIndex, setSelectedLogIndex] = useState(null);

  useEffect(() => {
    try {
    const loaded = loadLocalStorageJSON("riko_logs", { expected: 'array', fallback: [] });
    setLogs(loaded.value);
    } catch (err) {
      console.error("ログの読み込みエラー:", err);
      setError("ログの読み込みに失敗しました");
      setLogs([]);
    }
  }, []);

  const addLog = (newLog) => {
    const updatedLogs = [newLog, ...logs];
    setLogs(updatedLogs);
      localStorage.setItem("riko_logs", JSON.stringify(updatedLogs));
      setView("timeline");
  };

  const updateLog = (updatedLog) => {
    if (selectedLogIndex === null) return;
    const updatedLogs = [...logs];
    updatedLogs[selectedLogIndex] = updatedLog;
    setLogs(updatedLogs);
    localStorage.setItem("riko_logs", JSON.stringify(updatedLogs));
    setSelectedLog(updatedLog);
  };

  const handleLogClick = (log, index) => {
    setSelectedLog(log);
    setSelectedLogIndex(index);
  };

  const handleCloseLogDetail = () => {
    setSelectedLog(null);
    setSelectedLogIndex(null);
  };

  if (error) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50 p-4">
        <div className="bg-white p-6 rounded-xl shadow-lg max-w-md lg:max-w-lg w-full text-center">
          <ShieldAlert size={48} className="text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-slate-900 mb-2">エラーが発生しました</h2>
          <p className="text-sm text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => {
              setError(null);
              setLogs([]);
            }}
            className="bg-pink-600 text-white font-bold py-2 px-4 rounded shadow-lg hover:bg-pink-700 transition"
          >
            再試行
          </button>
        </div>
      </div>
    );
  }

    return (
      <div className="h-full w-full flex flex-col bg-slate-50 relative overflow-hidden font-sans text-slate-900 lg:max-w-6xl lg:mx-auto lg:shadow-xl lg:px-4" style={{ minHeight: '100dvh' }}>
      <header className="bg-slate-900 text-white p-4 flex justify-between items-center shadow-md z-10 shrink-0">
        <button onClick={() => setView('dashboard')} className="font-bold text-lg tracking-wider flex items-center gap-2 hover:opacity-80 transition-opacity">
          <ShieldAlert size={20} className="text-pink-500" />
          Riko-Log
        </button>
        <div className="flex items-center gap-2">
          {/* 安全基地(Help)ボタン */}
          <button onClick={() => setView('safety')} className="bg-slate-800 hover:bg-slate-700 p-2 rounded-full text-xs font-bold flex items-center gap-1 px-3 text-blue-200 border border-slate-700">
            <LifeBuoy size={14} /> Help
          </button>
          <button 
            onClick={onLogout} 
            className="bg-slate-700 hover:bg-slate-600 p-2 rounded-full text-xs font-bold flex items-center gap-1 px-3 text-white border border-slate-600"
            title="ログアウト"
          >
            <LogOut size={14} /> ログアウト
          </button>
          <button onClick={onLock} className="bg-red-600 hover:bg-red-700 p-2 rounded-full text-xs font-bold flex items-center gap-1 px-3 text-white">
            <Lock size={14} /> 緊急ロック
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto overscroll-none min-h-0" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 92px)' }}>
        {view === "dashboard" && <DashboardView logs={logs} userProfile={user} onShowDiagnosis={() => setView("diagnosis")} onShowLifeSupport={() => setView("lifeSupport")} onShowPremium={() => setView("premium")} />}
        {view === "timeline" && <TimelineView logs={logs} onLogClick={handleLogClick} userProfile={user} onShowPremium={() => setView("premium")} />}
        {view === "add" && <AddLogView onSave={addLog} onCancel={() => setView("dashboard")} onShowPremium={() => setView("premium")} />}
        {view === "messages" && <MessagesView />}
        {view === "board" && <BoardView />}
        {view === "safety" && <SafetyView />}
        {view === "export" && <ExportView logs={logs} userProfile={user} onShowPremium={() => setView("premium")} />}
        {view === "diagnosis" && <CompensationDiagnosisView logs={logs} onClose={() => setView("dashboard")} />}
        {view === "lifeSupport" && <LifeSupportView />}
        {view === "premium" && <PremiumPlanView user={user} onClose={() => setView("dashboard")} />}
      </div>

      {selectedLog && (
        <LogDetailView
          log={selectedLog}
          onClose={handleCloseLogDetail}
          onUpdate={updateLog}
        />
      )}

      <nav className="fixed bottom-0 left-0 right-0 w-full bg-white border-t border-gray-200 flex justify-around py-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-20" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 8px)' }}>
        <NavBtn icon={Database} label="ホーム" active={view === "dashboard"} onClick={() => setView("dashboard")} />
        <NavBtn icon={FileText} label="ログ" active={view === "timeline"} onClick={() => setView("timeline")} />
        <NavBtn icon={Plus} label="記録" active={view === "add"} onClick={() => setView("add")} isMain />
        <NavBtn icon={Mail} label="受信箱" active={view === "messages"} onClick={() => setView("messages")} />
        <NavBtn icon={MessageSquare} label="掲示板" active={view === "board"} onClick={() => setView("board")} />
      </nav>
    </div>
  );
};

// --- App Root ---
export default function App() {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    try {
      const loaded = loadLocalStorageJSON("riko_user", { expected: 'object', fallback: null });
      if (loaded.value) setCurrentUser(loaded.value);
    } catch (err) {
      console.error("ユーザー情報の読み込みエラー:", err);
      setError("ユーザー情報の読み込みに失敗しました");
    }
  }, []);

  const handleLogin = (user) => {
    try {
      if (!user) {
        console.error("ユーザー情報が正しく渡されていません");
        return;
      }
      console.log("ログイン処理開始:", user);
      setCurrentUser(user);
      setError(null);
      console.log("ログイン処理完了");
    } catch (error) {
      console.error("ログイン処理でエラーが発生しました:", error);
      setError("ログイン処理中にエラーが発生しました");
      alert("ログイン処理中にエラーが発生しました。もう一度お試しください。");
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem("riko_user");
  };

  // エラー表示
  if (error) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50 p-4">
        <div className="bg-white p-6 rounded-xl shadow-lg max-w-md lg:max-w-lg w-full text-center">
          <ShieldAlert size={48} className="text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-slate-900 mb-2">エラーが発生しました</h2>
          <p className="text-sm text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => {
              setError(null);
              setCurrentUser(null);
              setIsUnlocked(false);
              localStorage.removeItem("riko_user");
            }}
            className="bg-pink-600 text-white font-bold py-2 px-4 rounded shadow-lg hover:bg-pink-700 transition"
          >
            リセット
          </button>
        </div>
      </div>
    );
  }

  try {
    if (!isUnlocked) {
      return <CalculatorMode onUnlock={() => setIsUnlocked(true)} />;
    }

    if (!currentUser) {
      return <AuthScreen onLogin={handleLogin} />;
    }

    return <MainApp onLock={() => setIsUnlocked(false)} user={currentUser} onLogout={handleLogout} />;
  } catch (error) {
    console.error("アプリのレンダリングエラー:", error);
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50 p-4">
        <div className="bg-white p-6 rounded-xl shadow-lg max-w-md lg:max-w-lg w-full text-center">
          <ShieldAlert size={48} className="text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-slate-900 mb-2">エラーが発生しました</h2>
          <p className="text-sm text-gray-600 mb-4">アプリの読み込み中にエラーが発生しました: {error.message}</p>
          <button
            onClick={() => {
              window.location.reload();
            }}
            className="bg-pink-600 text-white font-bold py-2 px-4 rounded shadow-lg hover:bg-pink-700 transition"
          >
            ページを再読み込み
          </button>
        </div>
      </div>
    );
  }
}