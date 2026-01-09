import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PDFDownloadLink, BlobProvider } from '@react-pdf/renderer';
import { StatementDocument } from './StatementPDF.jsx';
import { buildStatementDataFromLogs } from './statementTransform.js';
import { supabase } from './supabase.config.js';
import { getUser, createUser, getCurrentUser, updateUser } from './db/users.js';
import { getUserLogs, createLog, updateLog as updateLogInDB } from './db/logs.js';
import { isPremiumUser, getPremiumSubscription } from './db/premium.js';
import { stripePromise, PREMIUM_PRICE_ID, SUPABASE_FUNCTIONS_URL } from './stripe.config.js';
import {
  DISGUISE_STORAGE_KEY,
  DEFAULT_DISGUISE,
  DISGUISE_PRESETS,
  safeParseJSON,
  tryRecoverJSONFromSubstring,
  loadLocalStorageJSON,
  getDisguisePreset,
  readSavedDisguise,
  saveDisguisePreset,
  applyDisguiseToDocument,
  isStandaloneMode
} from './src/utils/disguise.js';
import logger from './src/utils/logger.js';
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
  ArrowDown,
  MoreVertical,
  Eye,
  EyeOff,
  Map,
  Info,
  AlertTriangle,
  Folder,
  Shield,
  Building2 as BuildingIcon,
  Users as UsersIcon,
  Scale,
  Wallet,
  FileText as FileIcon,
  Lock as LockIcon,
  ArrowRight,
  Target,
  Package,
  UserCheck,
  Gavel,
  Square,
  CheckSquare,
  Star,
  HelpCircle,
  ListChecks
} from 'lucide-react';

// --- アフィリエイト表示設定（将来的に表示する場合は true に変更） ---
const SHOW_AFFILIATE_SECTIONS = false; // 弁護士相談、探偵相談、離婚後の生活支援の表示/非表示を制御

// --- プレミアムプランチェック ---
// プレミアム状態をチェック（非同期版）
async function checkPremiumStatusAsync(userId) {
  if (!userId) return false;
  try {
    return await isPremiumUser(userId);
  } catch {
    return false;
  }
}

// プレミアム状態をチェック（同期版 - 既存コードとの互換性のため）
// 注意: この関数は後方互換性のため残していますが、実際のチェックは非同期で行う必要があります
function checkPremiumStatus() {
  // localStorageのプレミアム情報をチェック（テスト用）
  try {
    const premium = localStorage.getItem('riko_premium');
    if (!premium) return false;
    const data = JSON.parse(premium);
    if (!data.expiresAt) return false;
    // 有効期限をチェック
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
  // localStorageのプレミアム情報をチェック（テスト用）
  const isPremium = checkPremiumStatus();
  return isPremium ? PLAN_TYPES.PREMIUM : PLAN_TYPES.FREE;
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
const CalculatorMode = ({ onUnlock, user }) => {
  const [display, setDisplay] = useState("0");
  // ユーザー設定のパスコードを使用（デフォルトは7777）
  // useMemoでuserが変更されたときに再計算
  const PASSCODE = useMemo(() => {
    return user?.calculator_passcode || "7777";
  }, [user?.calculator_passcode]);
  
  // Cボタンの長押し検出用
  const cButtonPressTimer = useRef(null);
  const cButtonPressStartTime = useRef(null);
  const [isResetting, setIsResetting] = useState(false);

  // Cボタンを押し始めた時
  const handleCDown = async () => {
    if (!user?.id) return;
    
    cButtonPressStartTime.current = Date.now();
    setIsResetting(true);
    
    // 7秒後にリセット
    cButtonPressTimer.current = setTimeout(async () => {
      try {
        // パスコードを7777にリセット
        await updateUser(user.id, { calculatorPasscode: '7777' });
        
        // 成功メッセージを表示
        alert('電卓パスコードを7777にリセットしました。\n画面をリロードします。');
        
        // 画面をリロードして新しいパスコードを反映
        window.location.reload();
      } catch (error) {
        logger.error('パスコードリセットエラー:', error);
        alert('パスコードのリセットに失敗しました。もう一度お試しください。');
        setIsResetting(false);
      }
    }, 7000);
  };

  // Cボタンを離した時
  const handleCUp = () => {
    if (cButtonPressTimer.current) {
      clearTimeout(cButtonPressTimer.current);
      cButtonPressTimer.current = null;
    }
    cButtonPressStartTime.current = null;
    setIsResetting(false);
  };

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (cButtonPressTimer.current) {
        clearTimeout(cButtonPressTimer.current);
      }
    };
  }, []);

  // 安全な数式評価関数（eval/new Functionを使わない）
  const safeEvaluate = (expression) => {
    // 許可する文字のみをチェック（数字、演算子、小数点のみ）
    if (!/^[\d+\-*/.\s()]+$/.test(expression)) {
      throw new Error('Invalid expression');
    }

    // トークン化
    const tokens = [];
    let numBuffer = '';

    for (const char of expression) {
      if (/\d|\./.test(char)) {
        numBuffer += char;
      } else if (['+', '-', '*', '/'].includes(char)) {
        if (numBuffer) {
          tokens.push(parseFloat(numBuffer));
          numBuffer = '';
        }
        tokens.push(char);
      }
    }
    if (numBuffer) {
      tokens.push(parseFloat(numBuffer));
    }

    // 乗算・除算を先に処理
    let i = 0;
    while (i < tokens.length) {
      if (tokens[i] === '*' || tokens[i] === '/') {
        const left = tokens[i - 1];
        const right = tokens[i + 1];
        const result = tokens[i] === '*' ? left * right : left / right;
        tokens.splice(i - 1, 3, result);
      } else {
        i++;
      }
    }

    // 加算・減算を処理
    let result = tokens[0];
    for (let j = 1; j < tokens.length; j += 2) {
      const op = tokens[j];
      const num = tokens[j + 1];
      if (op === '+') result += num;
      else if (op === '-') result -= num;
    }

    return result;
  };

  const handlePress = (val) => {
    if (val === "C") {
      setDisplay("0");
    } else if (val === "=") {
      if (display === PASSCODE) {
        onUnlock();
      } else {
        try {
          const result = safeEvaluate(display);
          if (isNaN(result) || !isFinite(result)) {
            setDisplay("Error");
          } else {
            setDisplay(result.toString());
          }
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
    <div 
      className="h-full w-full flex flex-col bg-black text-white font-sans lg:max-w-md lg:h-auto lg:min-h-[600px] lg:mx-auto lg:shadow-2xl lg:rounded-xl lg:my-8 lg:p-4" 
      style={{ 
        minHeight: '100dvh',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none'
      }}
    >
      <div 
        className="flex-1 flex items-end justify-end p-6 text-6xl font-light font-mono break-all lg:min-h-[200px] min-h-0 overflow-hidden"
        style={{
          userSelect: 'none',
          WebkitUserSelect: 'none',
          WebkitTouchCallout: 'none'
        }}
      >
        {display}
      </div>
      <div 
        className="grid grid-cols-4 gap-4 flex-shrink-0 px-4 pb-4 lg:pb-8" 
        style={{ 
          paddingBottom: 'max(80px, calc(1rem + env(safe-area-inset-bottom) + 3rem))',
          minHeight: 'fit-content',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          WebkitTouchCallout: 'none'
        }}
      >
        {buttons.map((btn, i) => (
          <button 
            key={i}
            onClick={() => handlePress(btn)}
            onMouseDown={btn === "C" ? handleCDown : undefined}
            onMouseUp={btn === "C" ? handleCUp : undefined}
            onMouseLeave={btn === "C" ? handleCUp : undefined}
            onTouchStart={btn === "C" ? handleCDown : undefined}
            onTouchEnd={btn === "C" ? handleCUp : undefined}
            className={`text-2xl rounded-full flex items-center justify-center shadow-lg
              ${btn === "=" || ["/","*","-","+"].includes(btn) ? "bg-orange-500 text-white" : "bg-gray-800 text-white"}
              ${btn === "0" ? "col-span-2 aspect-[2/1]" : "aspect-square"}
              ${btn === "C" && isResetting ? "bg-red-600 animate-pulse" : ""}
              active:opacity-70 transition-opacity
            `}
            style={{
              userSelect: 'none',
              WebkitUserSelect: 'none',
              WebkitTouchCallout: 'none'
            }}
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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [rememberMe, setRememberMe] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    newPassword: "",
    confirmPassword: "",
    reason: "性格の不一致",
    targetDate: "",
    situation: ""
  });

  // URLパラメータからメールアドレスを取得して自動入力
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const emailParam = urlParams.get('email');
    const registerParam = urlParams.get('register');
    
    if (emailParam) {
      setFormData(prev => ({
        ...prev,
        email: emailParam
      }));
    }
    
    // registerパラメータがある場合は新規登録画面を表示
    if (registerParam === 'true') {
      setIsRegister(true);
    }
    
    // URLパラメータをクリーンアップ（emailまたはregisterパラメータがある場合）
    if (emailParam || registerParam) {
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, []);

  // WebAuthn APIが利用可能かチェック
  const isWebAuthnAvailable = () => {
    // 基本的なチェック
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      logger.log('WebAuthnチェック: windowまたはnavigatorが未定義');
      return false;
    }

    // PublicKeyCredentialの存在チェック
    if (!('PublicKeyCredential' in window)) {
      logger.log('WebAuthnチェック: PublicKeyCredentialが存在しません');
      return false;
    }

    // navigator.credentialsの存在チェック
    if (!('credentials' in navigator)) {
      logger.log('WebAuthnチェック: navigator.credentialsが存在しません');
      return false;
    }

    // create/getメソッドの存在チェック
    if (!('create' in navigator.credentials) || !('get' in navigator.credentials)) {
      logger.log('WebAuthnチェック: credentials.createまたはgetが存在しません');
      return false;
    }

    // iOS Safariの特別なチェック
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    
    if (isIOS) {
      // iOS 14以降でWebAuthnがサポートされている
      // ただし、HTTPS環境が必要（localhostは例外）
      const isSecureContext = window.isSecureContext || 
                               window.location.protocol === 'https:' ||
                               window.location.hostname === 'localhost' ||
                               window.location.hostname === '127.0.0.1';
      
      if (!isSecureContext) {
        logger.log('WebAuthnチェック: iOSではHTTPS環境が必要です', {
          protocol: window.location.protocol,
          hostname: window.location.hostname
        });
        return false;
      }
    }

    logger.log('WebAuthnチェック: 利用可能です', {
      isIOS,
      isSecureContext: window.isSecureContext,
      protocol: window.location.protocol,
      hostname: window.location.hostname
    });

    return true;
  };

  // WebAuthn認証情報を登録
  const registerWebAuthn = async (userId, email) => {
    if (!isWebAuthnAvailable()) {
      throw new Error("このデバイスは生体認証に対応していません");
    }

    try {
      // ランダムなチャレンジを生成
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      // WebAuthn認証情報を作成
      const publicKeyCredentialCreationOptions = {
        challenge: challenge,
        rp: {
          name: "リコログ",
          id: window.location.hostname,
        },
        user: {
          id: new TextEncoder().encode(userId),
          name: email,
          displayName: email,
        },
        pubKeyCredParams: [
          { alg: -7, type: "public-key" }, // ES256
          { alg: -257, type: "public-key" }, // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform", // プラットフォーム認証器（FaceID/TouchID）
          userVerification: "required",
        },
        timeout: 60000,
        attestation: "direct"
      };

      const credential = await navigator.credentials.create({
        publicKey: publicKeyCredentialCreationOptions
      });

      // 認証情報をlocalStorageに保存
      const credentialData = {
        id: credential.id,
        rawId: Array.from(new Uint8Array(credential.rawId)),
        response: {
          attestationObject: Array.from(new Uint8Array(credential.response.attestationObject)),
          clientDataJSON: Array.from(new Uint8Array(credential.response.clientDataJSON)),
        },
        userId: userId,
        email: email,
        registeredAt: new Date().toISOString(),
      };

      localStorage.setItem(`webauthn_credential_${userId}`, JSON.stringify(credentialData));
      return credentialData;
    } catch (error) {
      logger.error("WebAuthn登録エラー:", error);
      throw error;
    }
  };

  const handleSubmit = async () => {
    // バリデーション
    const trimmedEmail = formData.email ? formData.email.trim() : '';
    const trimmedPassword = formData.password ? formData.password.trim() : '';

    if (!trimmedEmail || !trimmedPassword) {
      setError("メールアドレスとパスワードを入力してください");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError("正しいメールアドレス形式で入力してください");
      return;
    }

    if (trimmedPassword.length < 6) {
      setError("パスワードは6文字以上で入力してください");
      return;
    }

    // ローディング開始
    setIsLoading(true);
    setError(null);

    try {
      if (isRegister) {
        // パスワードのバリデーション
        if (!trimmedPassword || trimmedPassword.length < 6) {
          throw new Error('パスワードは6文字以上で入力してください。');
        }

        // 新規登録: Supabase標準機能を使用（自動ログイン）
        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email: trimmedEmail,
          password: trimmedPassword,
          options: {
            emailRedirectTo: `${window.location.origin}/app`
          }
        });

        if (signUpError) {
          logger.error('ユーザー登録エラー:', signUpError);
          
          // エラーメッセージを日本語に変換
          const errorMsg = signUpError.message || '';
          if (errorMsg.includes('already registered') || errorMsg.includes('already exists') || errorMsg.includes('User already registered')) {
            throw new Error('このメールアドレスは既に登録されています。ログイン画面からログインしてください。');
          } else {
            throw new Error(errorMsg || '登録に失敗しました。もう一度お試しください。');
          }
        }

        if (!authData?.user) {
          throw new Error('ユーザーの登録に失敗しました。もう一度お試しください。');
        }

        // セッションが取得できているか確認
        let session = authData.session;
        
        // セッションがない場合（メール確認が必要な場合）、ログインを試みる
        if (!session) {
          logger.log('セッションがないため、ログインを試みます...');
          const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
            email: trimmedEmail,
            password: trimmedPassword,
          });
          
          if (loginError) {
            logger.error('自動ログインエラー:', loginError);
            throw new Error('登録は完了しましたが、ログインに失敗しました。ログイン画面から再度ログインしてください。');
          }
          
          session = loginData?.session;
          if (!session) {
            throw new Error('セッションの取得に失敗しました。ログイン画面から再度ログインしてください。');
          }
        }

        // ユーザー情報をusersテーブルに保存
        try {
          await createUser(authData.user.id, {
            email: trimmedEmail,
            reason: formData.reason || 'その他',
            targetDate: formData.targetDate || null,
            situation: '',
            calculatorPasscode: '7777', // デフォルトパスコード
          });
        } catch (createError) {
          logger.error('usersテーブルへの保存エラー:', createError);
          logger.error('エラー詳細:', {
            message: createError?.message,
            code: createError?.code,
            details: createError?.details,
            hint: createError?.hint
          });
          // エラーでも続行（後で再試行する）
        }

        // premium_subscriptionsテーブルに無料プランを設定
        try {
          const { error: premiumError } = await supabase
            .from('premium_subscriptions')
            .insert({
              user_id: authData.user.id,
              plan_type: 'free',
              status: 'active',
            });

          if (premiumError) {
            logger.warn('premium_subscriptionsテーブルへの保存エラー:', premiumError);
            // エラーでも続行
          }
        } catch (premiumError) {
          logger.warn('premium_subscriptionsテーブルへの保存エラー:', premiumError);
          // エラーでも続行
        }

        // 登録完了メールを送信（非同期、エラーでも続行）
        // 本番URLを明示的に指定（ローカル開発環境でも本番URLを使用）
        const productionAppUrl = 'https://rikolog.net/app';
        supabase.functions.invoke('send-welcome-email', {
          body: { 
            email: trimmedEmail,
            appUrl: productionAppUrl
          }
        }).catch((emailError) => {
          logger.warn('登録完了メール送信エラー:', emailError);
          // メール送信エラーは無視して続行
        });

        // 30日間保存
        if (rememberMe) {
          try {
            localStorage.setItem('riko_remember_me', JSON.stringify({
              userId: authData.user.id,
              email: trimmedEmail,
              expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            }));
          } catch (err) {
            logger.warn('remember_me保存エラー:', err);
          }
        } else {
          localStorage.removeItem('riko_remember_me');
        }

        // ユーザー情報を取得（なければ作成）
        let userProfile = await getUser(authData.user.id);
        
        if (!userProfile) {
          try {
            await createUser(authData.user.id, {
              email: trimmedEmail,
              reason: formData.reason || 'その他',
              targetDate: formData.targetDate || null,
              situation: '',
              calculatorPasscode: '7777', // デフォルトパスコード
            });
            // 少し待ってから再取得
            await new Promise(resolve => setTimeout(resolve, 300));
            userProfile = await getUser(authData.user.id);
          } catch (createError) {
            logger.error('ユーザー情報作成エラー:', createError);
            logger.error('エラー詳細:', {
              message: createError?.message,
              code: createError?.code,
              details: createError?.details,
              hint: createError?.hint
            });
            // 最小限のユーザー情報で続行
            userProfile = {
              id: authData.user.id,
              email: trimmedEmail,
              reason: formData.reason || 'その他',
              target_date: formData.targetDate || null,
              situation: '',
              calculator_passcode: '7777', // デフォルトパスコード
            };
          }
        }

        // WebAuthn登録（バックグラウンド、エラーは無視）
        if (isWebAuthnAvailable()) {
          const existingCredential = localStorage.getItem(`webauthn_credential_${authData.user.id}`);
          if (!existingCredential) {
            registerWebAuthn(authData.user.id, trimmedEmail).catch((err) => {
              logger.warn('WebAuthn登録エラー:', err);
            });
          }
        }

        // 登録成功、自動的にログインしてアプリに遷移
        onLogin(userProfile);
        return;
      } else {
        // ログイン処理: Supabase標準機能を使用
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password: trimmedPassword,
        });

        if (authError) {
          logger.error('ログインエラー:', authError);
          
          // エラーメッセージを日本語に変換
          const errorMsg = authError.message || '';
          const errorCode = authError.status || '';
          
          if (errorCode === 400 || errorMsg.includes('Invalid login credentials') || errorMsg.includes('invalid_credentials')) {
            throw new Error('メールアドレスまたはパスワードが正しくありません。');
          } else if (errorMsg.includes('Email not confirmed') || errorMsg.includes('email_not_confirmed')) {
            throw new Error('メールアドレスの確認が必要です。\n\n登録時に送信されたメールを確認して、メール内のリンクをクリックしてください。');
          } else {
            throw new Error(errorMsg || 'ログインに失敗しました。');
          }
        }

        if (!authData?.user) {
          throw new Error('ログインに失敗しました。');
        }

        // 30日間保存
        if (rememberMe) {
          try {
            localStorage.setItem('riko_remember_me', JSON.stringify({
              userId: authData.user.id,
              email: trimmedEmail,
              expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            }));
          } catch (err) {
            logger.warn('remember_me保存エラー:', err);
          }
        } else {
          localStorage.removeItem('riko_remember_me');
        }

        // ユーザー情報を取得（なければ作成）
        let userProfile = await getUser(authData.user.id);
        
        if (!userProfile) {
          try {
            await createUser(authData.user.id, {
              email: trimmedEmail,
              reason: "性格の不一致",
              targetDate: null,
              situation: "",
            });
            // 少し待ってから再取得
            await new Promise(resolve => setTimeout(resolve, 300));
            userProfile = await getUser(authData.user.id);
          } catch (createError) {
            logger.warn('ユーザー情報作成エラー:', createError);
            // 最小限のユーザー情報で続行
            userProfile = {
              id: authData.user.id,
              email: trimmedEmail,
              reason: "性格の不一致",
              target_date: null,
              situation: "",
            };
          }
        }

        // WebAuthn登録（バックグラウンド、エラーは無視）
        if (isWebAuthnAvailable()) {
          const existingCredential = localStorage.getItem(`webauthn_credential_${authData.user.id}`);
          if (!existingCredential) {
            registerWebAuthn(authData.user.id, trimmedEmail).catch((err) => {
              logger.warn('WebAuthn登録エラー（無視）:', err);
            });
          }
        }

        // ログイン成功
        onLogin({ ...userProfile, id: authData.user.id });
        return;
      }
    } catch (error) {
      logger.error('認証エラー:', error);
      setError(error.message || '認証処理中にエラーが発生しました。もう一度お試しください。');
    } finally {
      setIsLoading(false);
    }
  };

  // WebAuthn認証情報で認証
  const authenticateWebAuthn = async (userId) => {
    if (!isWebAuthnAvailable()) {
      throw new Error("このデバイスは生体認証に対応していません");
    }

    try {
      // 保存された認証情報を取得
      const savedCredential = localStorage.getItem(`webauthn_credential_${userId}`);
      if (!savedCredential) {
        throw new Error("登録された生体認証情報が見つかりません");
      }

      const credentialData = JSON.parse(savedCredential);

      // ランダムなチャレンジを生成
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      // WebAuthn認証を実行
      const publicKeyCredentialRequestOptions = {
        challenge: challenge,
        allowCredentials: [{
          id: new Uint8Array(credentialData.rawId),
          type: 'public-key',
          transports: ['internal'], // プラットフォーム認証器のみ
        }],
        timeout: 60000,
        userVerification: "required",
      };

      const assertion = await navigator.credentials.get({
        publicKey: publicKeyCredentialRequestOptions
      });

      if (!assertion) {
        throw new Error("認証がキャンセルされました");
      }

      return true;
    } catch (error) {
      logger.error("WebAuthn認証エラー:", error);
      throw error;
    }
  };

  // パスワードリセットリクエスト（メール送信）
  const handleForgotPassword = async () => {
    try {
      const trimmedEmail = formData.email ? formData.email.trim() : '';
      
      if (!trimmedEmail) {
        setError("メールアドレスを入力してください");
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedEmail)) {
        setError("正しいメールアドレス形式で入力してください");
        return;
      }

      setIsLoading(true);
      setError(null);

      // リダイレクトURLを設定（現在のURLを使用）
      const redirectUrl = `${window.location.origin}${window.location.pathname}?type=recovery`;
      
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo: redirectUrl,
      });

      if (resetError) {
        logger.error("パスワードリセットエラー:", resetError);
        throw resetError;
      }

      setResetEmailSent(true);
    } catch (error) {
      logger.error("パスワードリセットエラー:", error);
      let errorMessage = "パスワードリセットメールの送信に失敗しました。";
      
      if (error.message) {
        const message = error.message.toLowerCase();
        if (message.includes("user not found")) {
          errorMessage = "このメールアドレスは登録されていません。";
        } else {
          errorMessage = error.message;
        }
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // パスワードリセット完了（新しいパスワードを設定）
  const handleResetPassword = async () => {
    try {
      if (!formData.newPassword || !formData.confirmPassword) {
        setError("新しいパスワードと確認用パスワードを入力してください");
        return;
      }

      if (formData.newPassword.length < 6) {
        setError("パスワードは6文字以上で入力してください");
        return;
      }

      if (formData.newPassword !== formData.confirmPassword) {
        setError("パスワードが一致しません");
        return;
      }

      setIsLoading(true);
      setError(null);

      const { error: updateError } = await supabase.auth.updateUser({
        password: formData.newPassword
      });

      if (updateError) {
        logger.error("パスワード更新エラー:", updateError);
        throw updateError;
      }

      // パスワード更新成功後、ログイン画面に戻る
      setShowResetPassword(false);
      setFormData({ ...formData, newPassword: "", confirmPassword: "" });
      setError(null);
      alert("パスワードが正常に更新されました。新しいパスワードでログインしてください。");
    } catch (error) {
      logger.error("パスワード更新エラー:", error);
      let errorMessage = "パスワードの更新に失敗しました。";
      
      if (error.message) {
        const message = error.message.toLowerCase();
        if (message.includes("token") || message.includes("expired")) {
          errorMessage = "リセットリンクの有効期限が切れています。再度パスワードリセットをリクエストしてください。";
        } else {
          errorMessage = error.message;
        }
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // URLパラメータからリセットトークンを確認
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const type = urlParams.get('type');
    
    if (type === 'recovery') {
      // リセットトークンが含まれている場合、パスワードリセット画面を表示
      setShowResetPassword(true);
      // URLをクリーンアップ
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  return (
    <div className="h-screen bg-slate-50 p-4 sm:p-6 flex flex-col justify-center overflow-y-auto" style={{ width: '100%', maxWidth: '100%' }}>
      <div className="text-center mb-6 sm:mb-8">
        <div className="inline-block p-3 sm:p-4 bg-slate-900 rounded-full mb-3 sm:mb-4 shadow-xl">
          <ShieldAlert size={40} className="text-pink-500 sm:w-12 sm:h-12" />
        </div>
        <h1 className="text-xl sm:text-2xl font-rikolog text-slate-900">リコログ</h1>
        <p className="text-[10px] sm:text-xs text-gray-500 mt-1 sm:mt-2">事実を記録し、あなたを守る。</p>
      </div>

      <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg space-y-3 sm:space-y-4 max-w-md lg:max-w-lg mx-auto w-full">
        {showResetPassword ? (
          // パスワードリセット画面
          <>
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h2 className="text-base sm:text-lg font-bold text-slate-800">パスワードをリセット</h2>
              <button 
                onClick={() => {
                  setShowResetPassword(false);
                  setFormData({ ...formData, newPassword: "", confirmPassword: "" });
                  setError(null);
                }}
                className="text-xs text-gray-500 hover:text-slate-900 underline"
              >
                ログイン画面に戻る
              </button>
            </div>
            
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-xs">
                {error}
              </div>
            )}

            {isLoading && (
              <div className="bg-blue-50 border border-blue-200 text-blue-700 p-3 rounded-lg text-xs text-center">
                処理中...
              </div>
            )}

            <div className="space-y-3">
              <div className="relative">
                <input 
                  type={showNewPassword ? "text" : "password"}
                  placeholder="新しいパスワード（6文字以上）" 
                  className="w-full bg-gray-50 border border-gray-200 p-2 sm:p-3 pr-10 rounded text-xs sm:text-sm"
                  value={formData.newPassword}
                  onChange={e => setFormData({...formData, newPassword: e.target.value})}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 transition-colors"
                  aria-label={showNewPassword ? "パスワードを隠す" : "パスワードを表示"}
                >
                  {showNewPassword ? (
                    <EyeOff size={16} />
                  ) : (
                    <Eye size={16} />
                  )}
                </button>
              </div>
              <div className="relative">
                <input 
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="新しいパスワード（確認用）" 
                  className="w-full bg-gray-50 border border-gray-200 p-2 sm:p-3 pr-10 rounded text-xs sm:text-sm"
                  value={formData.confirmPassword}
                  onChange={e => setFormData({...formData, confirmPassword: e.target.value})}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 transition-colors"
                  aria-label={showConfirmPassword ? "パスワードを隠す" : "パスワードを表示"}
                >
                  {showConfirmPassword ? (
                    <EyeOff size={16} />
                  ) : (
                    <Eye size={16} />
                  )}
                </button>
              </div>
              
              <button 
                onClick={handleResetPassword}
                disabled={isLoading}
                className="w-full bg-pink-600 text-white font-bold py-2 sm:py-3 rounded shadow-lg hover:bg-pink-700 transition mt-3 sm:mt-4 text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "処理中..." : "パスワードを更新"}
              </button>

              <button 
                onClick={() => {
                  setShowResetPassword(false);
                  setFormData({ ...formData, newPassword: "", confirmPassword: "" });
                  setError(null);
                }}
                className="w-full text-xs text-gray-500 py-2 hover:text-slate-900"
              >
                ログイン画面に戻る
              </button>
            </div>
          </>
        ) : showForgotPassword ? (
          // パスワードリセットリクエスト画面
          <>
            <h2 className="text-base sm:text-lg font-bold text-center mb-3 sm:mb-4 text-slate-800">パスワードをリセット</h2>
            
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-xs">
                {error}
              </div>
            )}

            {resetEmailSent ? (
              <>
                <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded-lg text-xs mb-3">
                  パスワードリセット用のメールを送信しました。\n\nメール内のリンクをクリックして、新しいパスワードを設定してください。
                </div>
                <button 
                  onClick={() => {
                    setShowForgotPassword(false);
                    setResetEmailSent(false);
                    setError(null);
                  }}
                  className="w-full text-xs text-gray-500 py-2 hover:text-slate-900"
                >
                  ログイン画面に戻る
                </button>
              </>
            ) : (
              <>
                <p className="text-xs text-gray-600 mb-3">
                  登録されているメールアドレスを入力してください。パスワードリセット用のリンクを送信します。
                </p>
                
                {isLoading && (
                  <div className="bg-blue-50 border border-blue-200 text-blue-700 p-3 rounded-lg text-xs text-center mb-3">
                    処理中...
                  </div>
                )}

                <input 
                  type="email" 
                  placeholder="メールアドレス" 
                  className="w-full bg-gray-50 border border-gray-200 p-2 sm:p-3 rounded text-xs sm:text-sm"
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                />
                
                <button 
                  onClick={handleForgotPassword}
                  disabled={isLoading}
                  className="w-full bg-pink-600 text-white font-bold py-2 sm:py-3 rounded shadow-lg hover:bg-pink-700 transition mt-3 sm:mt-4 text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? "送信中..." : "リセットメールを送信"}
                </button>

                <button 
                  onClick={() => {
                    setShowForgotPassword(false);
                    setResetEmailSent(false);
                    setError(null);
                  }}
                  className="w-full text-xs text-gray-500 py-2 hover:text-slate-900"
                >
                  ログイン画面に戻る
                </button>
              </>
            )}
          </>
        ) : (
          // 通常のログイン/登録画面
          <>
            <h2 className="text-base sm:text-lg font-bold text-center mb-3 sm:mb-4 text-slate-800">{isRegister ? "アカウント作成" : "ログイン"}</h2>
            
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-xs">
                {error}
              </div>
            )}

            {isLoading && (
              <div className="bg-blue-50 border border-blue-200 text-blue-700 p-3 rounded-lg text-xs text-center">
                処理中...
              </div>
            )}

          <input 
            type="email" 
            placeholder="メールアドレス" 
          className="w-full bg-gray-50 border border-gray-200 p-2 sm:p-3 rounded text-xs sm:text-sm"
            value={formData.email}
            onChange={e => setFormData({...formData, email: e.target.value})}
          />
          <div className="relative">
            <input 
              type={showPassword ? "text" : "password"}
              placeholder="パスワード" 
              className="w-full bg-gray-50 border border-gray-200 p-2 sm:p-3 pr-10 rounded text-xs sm:text-sm"
              value={formData.password}
              onChange={e => setFormData({...formData, password: e.target.value})}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 transition-colors"
              aria-label={showPassword ? "パスワードを隠す" : "パスワードを表示"}
            >
              {showPassword ? (
                <EyeOff size={16} />
              ) : (
                <Eye size={16} />
              )}
            </button>
          </div>

          {!isRegister && (
            <>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="rememberMe"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 text-pink-600 bg-gray-100 border-gray-300 rounded focus:ring-pink-500 focus:ring-2"
                />
                <label htmlFor="rememberMe" className="text-xs sm:text-sm text-gray-700 cursor-pointer">
                  30日間ログイン情報を保存する
                </label>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-xs text-pink-600 hover:text-pink-700 text-right w-full"
              >
                パスワードを忘れた場合
              </button>
            </>
          )}

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
            disabled={isLoading}
          className="w-full bg-pink-600 text-white font-bold py-2 sm:py-3 rounded shadow-lg hover:bg-pink-700 transition mt-3 sm:mt-4 text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "処理中..." : (isRegister ? "利用を開始する" : "ログイン")}
          </button>

          <button 
            onClick={() => setIsRegister(!isRegister)}
          className="w-full text-xs text-gray-500 py-2 hover:text-slate-900"
          >
            {isRegister ? "ログイン画面へ戻る" : "新規登録はこちら"}
          </button>
          </>
        )}
      </div>
    </div>
  );
};

// --- 3. セーフティ/ヘルプ画面 ---
const SafetyView = ({ user: propUser, onUserUpdate }) => {
  const [resetting, setResetting] = useState(false);
  const [user, setUser] = useState(propUser);
  const [passcode, setPasscode] = useState('');
  const [isChangingPasscode, setIsChangingPasscode] = useState(false);
  const [passcodeError, setPasscodeError] = useState('');

  // ユーザー情報とパスコードを読み込む
  useEffect(() => {
    if (propUser) {
      setUser(propUser);
      setPasscode(propUser.calculator_passcode || '7777');
    } else {
      const loadUser = async () => {
        const currentUser = await getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
          setPasscode(currentUser.calculator_passcode || '7777');
        }
      };
      loadUser();
    }
  }, [propUser]);

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
        {/* 電卓パスコード設定 */}
        <section>
          <h3 className="text-sm font-bold text-gray-500 mb-2 flex items-center gap-1">
            <Lock size={16} /> 電卓パスコード設定
          </h3>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <div className="text-xs text-gray-600 leading-relaxed mb-3">
              電卓画面でアプリを解除するためのパスコードを変更できます。
              <br />
              現在のパスコード: <span className="font-bold text-slate-900">{user?.calculator_passcode || '7777'}</span>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  新しいパスコード（数字のみ、4文字以上）
                </label>
                <input
                  type="text"
                  value={passcode}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9]/g, '');
                    setPasscode(value);
                    setPasscodeError('');
                  }}
                  placeholder="7777"
                  maxLength={10}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-sm"
                  disabled={isChangingPasscode}
                />
              </div>
              {passcodeError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-2">
                  <p className="text-xs text-red-600">{passcodeError}</p>
                </div>
              )}
              <button
                onClick={async () => {
                  if (!passcode || passcode.length < 4) {
                    setPasscodeError('パスコードは4文字以上で入力してください');
                    return;
                  }
                  
                  if (!user?.id) {
                    setPasscodeError('ユーザー情報が取得できませんでした');
                    return;
                  }

                  setIsChangingPasscode(true);
                  setPasscodeError('');

                  try {
                    await updateUser(user.id, { calculatorPasscode: passcode });
                    // ユーザー情報を再取得
                    const updatedUser = await getCurrentUser();
                    if (updatedUser) {
                      setUser(updatedUser);
                      // MainAppのcurrentUserも更新
                      if (onUserUpdate) {
                        onUserUpdate(updatedUser);
                      }
                    }
                    setPasscode(''); // 入力欄をクリア
                    alert('✅ 電卓パスコードを変更しました。\n次回の電卓画面から新しいパスコードが有効になります。');
                  } catch (error) {
                    logger.error('パスコード変更エラー:', error);
                    // エラーの詳細を取得
                    let errorMessage = 'パスコードの変更に失敗しました';
                    if (error?.message) {
                      errorMessage += `: ${error.message}`;
                    } else if (error?.error?.message) {
                      errorMessage += `: ${error.error.message}`;
                    } else if (typeof error === 'string') {
                      errorMessage += `: ${error}`;
                    }
                    setPasscodeError(errorMessage);
                  } finally {
                    setIsChangingPasscode(false);
                  }
                }}
                disabled={isChangingPasscode || !passcode || passcode.length < 4}
                className={`w-full font-bold py-2.5 rounded-lg text-xs ${
                  isChangingPasscode || !passcode || passcode.length < 4
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    : 'bg-pink-600 hover:bg-pink-700 text-white'
                }`}
              >
                {isChangingPasscode ? '変更中...' : 'パスコードを変更'}
              </button>
            </div>
          </div>
        </section>

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
const CompensationDiagnosisView = ({ logs, onClose, onShowPremium }) => {
  const [step, setStep] = useState(0); // 0: Intro, 1..Q: Questions, Q+1: Loading, Q+2: Result
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
  const [showCTAPopup, setShowCTAPopup] = useState(false);

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

    // 証拠・記録量スコア（証拠が少ない場合は大幅に減点）
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
    
    // 証拠スコア（証拠が少ない場合は低く評価）
    const evidenceScore = Math.min(attachmentCount * 4, 30) + Math.min(medicalEvidenceScore, 15);
    const logScore = Math.min(logCount * 1.5, 15);
    const totalEvidenceScore = evidenceScore + logScore;
    
    if (logCount >= 10) reasons.push("記録が一定量あり、事実の積み上げに有利です。");
    if (attachmentCount >= 3) reasons.push("音声/画像等の客観証拠があり、立証に有利です。");
    if (medicalEvidenceScore > 0) reasons.push("診断書・通院履歴等の医療資料は証拠力が強く、立証に有利です。");

    // 中心事案別ベースレンジ（万円）- 証拠が少ない場合は低めに設定
    let baseMin = 0;
    let baseMax = 50;
    switch (answers.situation) {
      case "暴力（DV）":
        baseMin = 50; baseMax = 200; reasons.push("DVは違法性が強く、慰謝料が上振れしやすい類型です。"); break;
      case "不貞（浮気）":
        baseMin = 30; baseMax = 150; reasons.push("不貞は典型類型で、証拠次第でレンジが動きます。"); break;
      case "暴言・威圧（強い支配）":
        baseMin = 10; baseMax = 100; reasons.push("モラハラは継続性と具体性（反復・支配）が鍵です。"); break;
      case "生活費/経済（未払い等）":
        baseMin = 0; baseMax = 80; reasons.push("生活費未払いは婚費/財産分与と絡むため、整理が重要です。"); break;
      case "育児の放棄/妨害":
        baseMin = 10; baseMax = 100; reasons.push("育児妨害は監護状況や子の負担が評価されやすいです。"); break;
      default:
        baseMin = 0; baseMax = 60; break;
    }

    // 証拠が少ない場合はベースを下げる
    if (totalEvidenceScore < 10) {
      baseMin = Math.max(0, baseMin * 0.3);
      baseMax = Math.max(baseMin, baseMax * 0.5);
      reasons.push("証拠が少ない場合、慰謝料の認定は難しくなります。証拠収集が重要です。");
    } else if (totalEvidenceScore < 20) {
      baseMin = Math.max(0, baseMin * 0.6);
      baseMax = Math.max(baseMin, baseMax * 0.75);
    }

    // 影響（増額）- 証拠がある場合のみ大きく評価
    let impactBonus = 0;
    if (answers.impact === "通院・診断書がある") {
      impactBonus += totalEvidenceScore > 15 ? 40 : 20;
      if (totalEvidenceScore > 15) reasons.push("診断書がある場合、精神的損害の評価が上がりやすいです。");
    }
    else if (answers.impact === "不眠/強いストレスが続く") impactBonus += totalEvidenceScore > 15 ? 15 : 5;
    else if (answers.impact === "仕事/家事が回らない") impactBonus += totalEvidenceScore > 15 ? 12 : 3;
    else if (answers.impact === "子どもに大きな影響") impactBonus += totalEvidenceScore > 15 ? 20 : 8;
    else if (answers.impact === "まだ分からない/軽微") {
      impactBonus -= 10;
      baseMin = Math.max(0, baseMin * 0.7);
      baseMax = Math.max(baseMin, baseMax * 0.8);
    }

    // 医療（裏付け）- 証拠がある場合のみ大きく評価
    let medicalBonus = 0;
    if (answers.medical === "診断書がある") {
      medicalBonus += totalEvidenceScore > 15 ? 25 : 10;
    }
    else if (answers.medical === "通院中（診断書は未）") medicalBonus += totalEvidenceScore > 15 ? 12 : 5;
    else if (answers.medical === "受診予定") medicalBonus += 3;
    else if (answers.medical === "なし/不明") {
      medicalBonus -= 5;
    }

    // 継続期間（証拠がある場合のみ大きく評価）
    let durationBonus = 0;
    if (answers.duration === "3年以上") durationBonus += totalEvidenceScore > 15 ? 30 : 10;
    else if (answers.duration === "1年以上") durationBonus += totalEvidenceScore > 15 ? 20 : 8;
    else if (answers.duration === "半年〜1年") durationBonus += totalEvidenceScore > 15 ? 12 : 5;
    else if (answers.duration === "3〜6ヶ月") durationBonus += totalEvidenceScore > 15 ? 6 : 2;
    else if (answers.duration === "1〜3ヶ月") durationBonus += totalEvidenceScore > 15 ? 3 : 1;
    else if (answers.duration === "1ヶ月未満") {
      durationBonus -= 5;
      baseMin = Math.max(0, baseMin * 0.8);
      baseMax = Math.max(baseMin, baseMax * 0.85);
    }

    // 婚姻期間（証拠がある場合のみ大きく評価）
    let marriageBonus = 0;
    if (answers.marriage === "20年以上") marriageBonus += totalEvidenceScore > 15 ? 25 : 8;
    else if (answers.marriage === "10年以上") marriageBonus += totalEvidenceScore > 15 ? 18 : 6;
    else if (answers.marriage === "5〜10年") marriageBonus += totalEvidenceScore > 15 ? 12 : 4;
    else if (answers.marriage === "3〜5年") marriageBonus += totalEvidenceScore > 15 ? 6 : 2;
    else if (answers.marriage === "未婚/事実婚") {
      marriageBonus -= 5;
      baseMin = Math.max(0, baseMin * 0.7);
      baseMax = Math.max(baseMin, baseMax * 0.8);
    }

    // 子ども
    let childBonus = 0;
    if (answers.children === "2人以上") childBonus += 8;
    else if (answers.children === "1人") childBonus += 5;
    else if (answers.children === "妊娠中") childBonus += 6;

    // 相手年収（上振れ要素として弱く）
    let incomeBonus = 0;
    if (answers.income === "800万円以上") incomeBonus += 10;
    else if (answers.income === "500〜800万円") incomeBonus += 5;

    // 状況（手続段階）
    let stagePenalty = 0;
    if (answers.status === "離婚済") stagePenalty += 10;
    else if (answers.status === "未別居") {
      stagePenalty += 5;
      reasons.push("別居していない場合、慰謝料の認定は難しくなることがあります。");
    }

    // 最終計算（証拠スコアを大きく反映）
    const evidenceMultiplier = Math.max(0.3, Math.min(1.5, 0.3 + (totalEvidenceScore / 30)));
    const estMin = Math.max(0, Math.round((baseMin + impactBonus * 0.3 + durationBonus * 0.2 + marriageBonus * 0.15 + childBonus * 0.1 + incomeBonus * 0.1) * evidenceMultiplier));
    const estMax = Math.max(estMin, Math.round((baseMax + impactBonus * 0.6 + medicalBonus * 0.5 + durationBonus * 0.4 + marriageBonus * 0.3 + childBonus * 0.2 + incomeBonus * 0.15) * evidenceMultiplier - stagePenalty));

    // 勝率（証拠が少ない場合は大幅に下げる）
    let win = 10; // ベースを下げる
    win += Math.min(totalEvidenceScore * 2, 40); // 証拠スコアを大きく反映
    if (answers.medical === "診断書がある" && totalEvidenceScore > 15) win += 15;
    else if (answers.medical === "診断書がある") win += 5;
    if (answers.duration === "1年以上" || answers.duration === "3年以上") {
      win += totalEvidenceScore > 15 ? 10 : 3;
    }
    if (answers.situation === "暴力（DV）" || answers.situation === "不貞（浮気）") {
      win += totalEvidenceScore > 15 ? 12 : 3;
    }
    
    // 証拠が極端に少ない場合は大幅に減点
    if (totalEvidenceScore < 5) win -= 15;
    if (logCount === 0) win -= 10;
    if (attachmentCount === 0 && medicalEvidenceScore === 0) win -= 10;
    
    win = Math.max(5, Math.min(90, Math.round(win)));
    
    if (win < 30) reasons.push("証拠が不足しています。まずは「日時・場所・具体的言動・証拠」を揃えると見立てが安定します。");
    if (win < 50 && totalEvidenceScore < 15) reasons.push("証拠収集を進めることで、勝率と慰謝料額の両方が改善する可能性があります。");

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
        const analysisResult = analyze();
        setResult(analysisResult);
        setStep(questions.length + 2); // Result
        // 結果表示後、少し遅れてCTAポップアップを表示
        setTimeout(() => {
          setShowCTAPopup(true);
        }, 1500);
      }, 900);
      return () => clearTimeout(t);
    }
  }, [step, questions.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const qIndex = step - 1;
  const isIntro = step === 0;
  const isLoading = step === questions.length + 1;
  const isResult = step === questions.length + 2;

  const handleBack = () => {
    if (step === 0) {
      // イントロ画面の場合は元の画面に戻る
      onClose();
    } else if (step > 0 && step <= questions.length) {
      // 質問中の場合は一つ前の質問に戻る
      setStep(step - 1);
    } else if (isResult) {
      // 結果画面の場合はローディング画面に戻る（実際には質問の最後に戻る）
      setStep(questions.length + 1);
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

      {!isIntro && !isLoading && !isResult && step > 0 && step <= questions.length && (
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

      {isResult && result && (
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

          {/* CTAボタン - ホーム画面と同じデザイン */}
          <div className="space-y-3">
            {/* 探偵に相談する */}
            <a
              href="https://www.private-eye.jp/"
              target="_blank"
              rel="noopener noreferrer"
              className="block bg-purple-50 border border-purple-200 rounded-xl shadow-sm p-4 hover:shadow-md transition relative"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-1">
                    <User size={16} className="text-purple-600" /> 探偵に相談する（証拠を集めるため）
                  </div>
                  <div className="text-xs text-gray-600 leading-relaxed mb-2">
                    不貞の立証や証拠収集が必要なケース向けに、専門家に依頼できます。GPS調査、行動調査など、様々な調査方法があります。
                  </div>
                  <div className="text-xs text-purple-600 font-bold flex items-center gap-1">
                    詳細を見る <ExternalLink size={12} />
                  </div>
                </div>
                <ChevronRight size={20} className="text-purple-400 shrink-0 mt-1" />
              </div>
            </a>

            {/* 弁護士に相談する */}
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

            {/* プレミアムプラン */}
            {onShowPremium && (
              <button
                onClick={onShowPremium}
                className="w-full bg-yellow-50 border border-yellow-200 rounded-xl shadow-sm p-4 hover:shadow-md transition text-left relative"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-1">
                      <Crown size={16} className="text-yellow-600" /> より詳細な分析をする（プレミアムプラン・今後リリース予定）
                    </div>
                    <div className="text-xs text-gray-600 leading-relaxed mb-2">
                      プレミアムプランでは、詳細な分析レポート、証拠評価の内訳、勝率の詳細分析、証拠収集のアドバイスなど、より充実した診断結果をご利用いただけるようになる予定です。
                    </div>
                    <div className="text-xs text-yellow-600 font-bold flex items-center gap-1">
                      詳細を見る <ExternalLink size={12} />
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-yellow-400 shrink-0 mt-1" />
                </div>
              </button>
            )}
          </div>

          {/* CTAポップアップ */}
          {showCTAPopup && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowCTAPopup(false)}>
              <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => setShowCTAPopup(false)}
                  className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                >
                  <X size={20} />
                </button>
                <div className="text-center mb-4">
                  <Sparkles size={32} className="text-pink-500 mx-auto mb-2" />
                  <div className="text-lg font-bold text-slate-900 mb-2">次のステップを選びましょう</div>
                  <div className="text-xs text-gray-600">
                    診断結果を活かすために、専門家のサポートを受けませんか？
                  </div>
                </div>
                <div className="space-y-2 mt-4">
                  <a
                    href="https://www.private-eye.jp/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full p-4 rounded-xl bg-purple-50 border border-purple-200 hover:shadow-md transition text-left"
                    onClick={() => setShowCTAPopup(false)}
                  >
                    <div className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-1">
                      <User size={16} className="text-purple-600" /> 探偵に相談（証拠収集）
                    </div>
                    <div className="text-xs text-gray-600">
                      不貞の立証や証拠収集が必要なケース向け
                    </div>
                  </a>
                  <a
                    href="https://www.bengo4.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full p-4 rounded-xl bg-blue-50 border border-blue-200 hover:shadow-md transition text-left"
                    onClick={() => setShowCTAPopup(false)}
                  >
                    <div className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-1">
                      <Users size={16} className="text-blue-600" /> 弁護士に相談（無料相談あり）
                    </div>
                    <div className="text-xs text-gray-600">
                      記録をもとに、専門家に早めに相談して方針を整理する
                    </div>
                  </a>
                  {onShowPremium && (
                    <button
                      onClick={() => {
                        setShowCTAPopup(false);
                        onShowPremium();
                      }}
                      className="w-full p-4 rounded-xl bg-yellow-50 border border-yellow-200 hover:shadow-md transition text-left"
                    >
                      <div className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-1">
                        <Crown size={16} className="text-yellow-600" /> プレミアムプランで詳細分析（今後リリース予定）
                      </div>
                      <div className="text-xs text-gray-600">
                        詳細な分析レポート、証拠評価の内訳、勝率の詳細分析などは、プレミアムプランリリース時に利用可能になります
                      </div>
                    </button>
                  )}
                </div>
                <button
                  onClick={() => setShowCTAPopup(false)}
                  className="w-full mt-3 text-xs text-gray-500 hover:text-gray-700"
                >
                  後で見る
                </button>
              </div>
            </div>
          )}

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
const DashboardView = ({ logs, userProfile, onShowDiagnosis, onShowLifeSupport, onShowPremium, isPremium: dashboardIsPremium }) => {
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
  // メインコンポーネントから渡されたisPremiumを使用（なければlocalStorageをチェック）
  const isPremium = dashboardIsPremium !== undefined ? dashboardIsPremium : useMemo(() => checkPremiumStatus(), []);

  // --- ロードマップモーダル ---
  const [isRoadmapModalOpen, setIsRoadmapModalOpen] = useState(false);

  // --- 離婚準備チェックリスト ---
  const [isChecklistModalOpen, setIsChecklistModalOpen] = useState(false);
  const [selectedHelpItem, setSelectedHelpItem] = useState(null);
  
  // チェックリストのデータ構造
  const checklistData = [
    {
      phase: 1,
      title: "証拠・情報の確保（同居中にこっそりやること）",
      color: "blue",
      items: [
        { id: "diary", text: "日記をつける", required: true, help: "日々のモラハラ、無視、帰宅時間、不審な行動を記録（このアプリで！）" },
        { id: "phone_evidence", text: "相手のスマホの証拠確保", required: true, help: "LINE、メール、着信履歴の画面撮影（自分のスマホで撮るのが安全）" },
        { id: "payslip", text: "給与明細のコピー（直近3ヶ月〜1年分）", required: true, help: "婚姻費用（別居中の生活費）と養育費の算定に必須。" },
        { id: "tax_doc", text: "源泉徴収票・確定申告書のコピー", required: true, help: "収入証明として重要です。" },
        { id: "bankbook", text: "相手の預貯金通帳のコピー（全ページ）", required: true, help: "隠し口座がないかチェック。表紙だけでなく中身も全て。" },
        { id: "insurance", text: "生命保険・学資保険の証券コピー", required: false, help: "解約返戻金も財産分与の対象になるため。" },
        { id: "real_estate", text: "不動産の権利証・契約書のコピー", required: true, help: "不動産の財産分与に必要です。" },
        { id: "pension", text: "年金手帳・ねんきん定期便のコピー", required: false, help: "「年金分割」のために必要。" },
        { id: "debt", text: "借金・ローンの明細書の確保", required: false, help: "マイナスの財産も把握しておく必要がある。" },
      ]
    },
    {
      phase: 2,
      title: "子供・親権の準備",
      color: "purple",
      items: [
        { id: "custody", text: "親権をどちらが持つか決める", required: true, help: "実績作りとして、育児日記をつけておくことが重要。" },
        { id: "child_support", text: "養育費の相場を確認する", required: true, help: "「算定表」を使ってシミュレーションしておく。" },
        { id: "visitation", text: "面会交流の希望条件を整理する", required: false, help: "頻度、場所、連絡方法など。" },
        { id: "child_docs", text: "子供のパスポート・母子手帳の確保", required: true, help: "持ち出し忘れると後で揉める筆頭アイテム。" },
      ]
    },
    {
      phase: 3,
      title: "別居・新生活の準備（Xデーに向けて）",
      color: "indigo",
      items: [
        { id: "own_account", text: "自分名義の銀行口座を作る", required: true, help: "へそくり（離婚資金）を移動させておく。" },
        { id: "living_expenses", text: "当面の生活費（最低3ヶ月分）の確保", required: true, help: "別居後の生活を支えるために必要です。" },
        { id: "housing", text: "別居先の物件探し", required: true, help: "実家か、賃貸か、公営住宅か。" },
        { id: "job", text: "仕事の確保・就職活動", required: false, help: "正社員、パート、副業など。" },
        { id: "takeout_list", text: "持ち出しリストの作成", required: true, help: "実印、印鑑カード、身分証、貴金属、思い出の品。" },
        { id: "credit_card", text: "クレジットカードの作成", required: false, help: "夫の扶養に入っているうちに（姓が変わる前に）自分名義を作っておくと審査に通りやすい。" },
      ]
    },
    {
      phase: 4,
      title: "行政・手続き（離婚届提出前後）",
      color: "pink",
      items: [
        { id: "witness", text: "離婚届の証人（2名）の確保", required: true, help: "離婚届提出時に必要です。" },
        { id: "residence", text: "住民票の異動（転出・転入届）", required: true, help: "別居先への転出届を提出します。" },
        { id: "child_allowance", text: "児童扶養手当（母子手当）の申請", required: false, help: "所得制限や条件を役所で確認。" },
        { id: "health_insurance", text: "健康保険の切り替え", required: true, help: "夫の扶養から抜けて、国保または自分の職場の保険へ。" },
        { id: "name_change", text: "氏名変更の手続き", required: false, help: "運転免許証、銀行口座、パスポート、クレカなど。" },
      ]
    }
  ];

  // チェックリストの進捗をlocalStorageから読み込む
  const [checklistProgress, setChecklistProgress] = useState(() => {
    try {
      const saved = localStorage.getItem('riko_checklist_progress');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // チェックリスト項目のトグル
  const toggleChecklistItem = (itemId) => {
    setChecklistProgress(prev => {
      const newProgress = { ...prev, [itemId]: !prev[itemId] };
      try {
        localStorage.setItem('riko_checklist_progress', JSON.stringify(newProgress));
      } catch {}
      return newProgress;
    });
  };

  // チェックリスト進捗率の計算（useMemoで最適化）
  const checklistProgressData = useMemo(() => {
    const allItems = checklistData.flatMap(phase => phase.items);
    const checkedItems = allItems.filter(item => checklistProgress[item.id]);
    const requiredItems = allItems.filter(item => item.required);
    const checkedRequired = requiredItems.filter(item => checklistProgress[item.id]);
    
    return {
      overall: allItems.length > 0 ? Math.round((checkedItems.length / allItems.length) * 100) : 0,
      required: requiredItems.length > 0 ? Math.round((checkedRequired.length / requiredItems.length) * 100) : 0,
      total: allItems.length,
      checked: checkedItems.length,
      requiredTotal: requiredItems.length,
      requiredChecked: checkedRequired.length
    };
  }, [checklistProgress]);

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
      alert('電卓以外のアイコン変更は今後リリース予定のプレミアムプランの特典です。');
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
    <div className="px-4 pt-2 pb-24 space-y-4">
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

      {/* 離婚へのロードマップ */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl shadow-sm p-4">
        <div className="flex items-start gap-3">
          <div className="shrink-0 bg-blue-500 rounded-full p-2">
            <Map size={18} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-blue-900 mb-1">離婚へのロードマップ</div>
            <div className="text-xs text-slate-700 leading-relaxed mb-2">
              準備から解決まで、5つのステップで進める離婚手続きの全体像を確認できます。
            </div>
            <button
              onClick={() => setIsRoadmapModalOpen(true)}
              className="text-xs font-bold text-blue-700 hover:text-blue-800 underline"
            >
              詳細を見る →
            </button>
          </div>
        </div>
      </div>

      {/* 離婚準備チェックリスト */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl shadow-sm p-4">
        <div className="flex items-start gap-3">
          <div className="shrink-0 bg-green-500 rounded-full p-2">
            <ListChecks size={18} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <div className="text-xs font-bold text-green-900">離婚準備チェックリスト</div>
              <div className="text-xs font-bold text-green-700">{checklistProgressData.overall}%</div>
            </div>
            <div className="w-full bg-green-200 rounded-full h-2 mb-2">
              <div 
                className="bg-green-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${checklistProgressData.overall}%` }}
              />
            </div>
            <div className="text-xs text-slate-700 leading-relaxed mb-2">
              4つのフェーズで進める離婚準備のチェックリスト。進捗を管理して準備を進めましょう。
            </div>
            <button
              onClick={() => setIsChecklistModalOpen(true)}
              className="text-xs font-bold text-green-700 hover:text-green-800 underline"
            >
              チェックリストを開く →
            </button>
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
                電卓以外のアイコン変更は今後リリース予定のプレミアムプランで利用可能になります
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
                          setInstallMessage('電卓以外のアイコン変更は今後リリース予定のプレミアムプランで利用可能になります。');
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

      {/* ロードマップモーダル */}
      {isRoadmapModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setIsRoadmapModalOpen(false)} />
          <div className="relative w-full sm:max-w-2xl lg:max-w-4xl bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl border border-gray-200 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-4 border-b flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50">
              <div>
                <div className="text-base font-bold text-blue-900 flex items-center gap-2">
                  <Map size={20} /> 離婚へのロードマップ：準備から解決まで
                </div>
                <div className="text-xs text-blue-700 mt-1">戦略的に進める離婚手続きの全体像</div>
              </div>
              <button
                onClick={() => setIsRoadmapModalOpen(false)}
                className="p-2 rounded-full hover:bg-white/50 text-gray-600"
                title="閉じる"
              >
                <X size={20} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-4 sm:p-6 space-y-6 text-sm">
              {/* イントロダクション */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
                <div className="flex items-start gap-3">
                  <Info size={20} className="text-blue-600 shrink-0 mt-0.5" />
                  <p className="text-sm text-slate-700 leading-relaxed">
                    離婚は単なる「別れ」ではなく、生活の基盤を再構築する法的な手続きです。
                    感情的にならず、長期的な視点で戦略的に進めることが、あなたと子供の未来を守る鍵となります。
                  </p>
                </div>
              </div>

              {/* 全体の流れ */}
              <div>
                <h3 className="text-base font-bold text-slate-900 mb-2 flex items-center gap-2">
                  <Calendar size={20} className="text-blue-600" /> 全体の流れ（5つのステップ）
                </h3>
                <p className="text-xs text-slate-600 mb-4 pl-7">
                  現在の状況がどのフェーズにあるかを確認し、次にやるべきことを把握しましょう。
                </p>

                {/* STEP 1 */}
                <div className="mb-4 p-4 bg-blue-50 border-l-4 border-blue-500 rounded-r-lg shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="bg-blue-500 text-white rounded-full w-7 h-7 flex items-center justify-center font-bold text-sm shrink-0">1</div>
                    <div className="font-bold text-blue-900 flex items-center gap-2">
                      <Folder size={18} /> 証拠収集・準備フェーズ（現在地）
                    </div>
                  </div>
                  <p className="text-xs text-slate-700 mb-3 ml-9">
                    相手に気づかれずに「武器（証拠）」を集め、逃げるための資金と場所を確保する段階です。
                  </p>
                  <div className="text-xs font-semibold text-blue-800 mb-3 ml-9 flex items-center gap-2">
                    <Target size={14} /> <span>目的: 有利な条件で離婚するための材料を揃える。</span>
                  </div>
                  <div className="text-xs text-slate-700 space-y-2.5 ml-9">
                    <div className="flex items-start gap-2.5">
                      <CheckCircle2 size={16} className="text-blue-500 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-semibold text-slate-900 flex items-center gap-1.5 mb-0.5">
                          <FileIcon size={14} className="text-blue-600" /> 証拠の保全
                        </div>
                        <div className="text-slate-600">日記、録音、写真、LINEスクショなどを安全な場所（<span className="font-rikolog">リコログ</span>等）に保存する。</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <CheckCircle2 size={16} className="text-blue-500 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-semibold text-slate-900 flex items-center gap-1.5 mb-0.5">
                          <CreditCard size={14} className="text-blue-600" /> 財産把握
                        </div>
                        <div className="text-slate-600">相手の通帳、給与明細、源泉徴収票、不動産権利証などのコピーをとる。</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <CheckCircle2 size={16} className="text-blue-500 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-semibold text-slate-900 flex items-center gap-1.5 mb-0.5">
                          <Wallet size={14} className="text-blue-600" /> 別居資金の確保
                        </div>
                        <div className="text-slate-600">自分名義の口座に現金を移す（へそくり）。</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <CheckCircle2 size={16} className="text-blue-500 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-semibold text-slate-900 flex items-center gap-1.5 mb-0.5">
                          <Phone size={14} className="text-blue-600" /> 相談
                        </div>
                        <div className="text-slate-600">弁護士や自治体の相談窓口に行き、見通しを立てる。</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* STEP 2 */}
                <div className="mb-4 p-4 bg-indigo-50 border-l-4 border-indigo-500 rounded-r-lg shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="bg-indigo-500 text-white rounded-full w-7 h-7 flex items-center justify-center font-bold text-sm shrink-0">2</div>
                    <div className="font-bold text-indigo-900 flex items-center gap-2">
                      <LogOut size={18} /> 別居開始
                    </div>
                  </div>
                  <p className="text-xs text-slate-700 mb-3 ml-9">
                    物理的な距離を取り、安全を確保します。法的には「婚姻関係の破綻」を客観的に示す重要なアクションです。
                  </p>
                  <div className="text-xs font-semibold text-indigo-800 mb-3 ml-9 flex items-center gap-2">
                    <Target size={14} /> <span>目的: 身の安全確保と、離婚意思の固さを示す。</span>
                  </div>
                  <div className="text-xs text-slate-700 space-y-2.5 ml-9">
                    <div className="flex items-start gap-2.5">
                      <CheckCircle2 size={16} className="text-indigo-500 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-semibold text-slate-900 flex items-center gap-1.5 mb-0.5">
                          <Package size={14} className="text-indigo-600" /> 持ち出し
                        </div>
                        <div className="text-slate-600">貴重品、証拠データ、当面の生活用品を持って家を出る。</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <CheckCircle2 size={16} className="text-indigo-500 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-semibold text-slate-900 flex items-center gap-1.5 mb-0.5">
                          <LockIcon size={14} className="text-indigo-600" /> 住民票の移動
                        </div>
                        <div className="text-slate-600">必要に応じて閲覧制限の手続きを行う（DVの場合）。</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <CheckCircle2 size={16} className="text-indigo-500 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-semibold text-slate-900 flex items-center gap-1.5 mb-0.5">
                          <CreditCard size={14} className="text-indigo-600" /> 婚姻費用分担請求
                        </div>
                        <div className="text-slate-600">別居中の生活費を相手に請求する手続き（調停）をすぐに行う。</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* STEP 3 */}
                <div className="mb-4 p-4 bg-purple-50 border-l-4 border-purple-500 rounded-r-lg shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="bg-purple-500 text-white rounded-full w-7 h-7 flex items-center justify-center font-bold text-sm shrink-0">3</div>
                    <div className="font-bold text-purple-900 flex items-center gap-2">
                      <MessageSquare size={18} /> 協議離婚（話し合い）
                    </div>
                  </div>
                  <p className="text-xs text-slate-700 mb-3 ml-9">
                    夫婦間の話し合いで条件を決め、離婚届を提出します。日本で最も多いパターン（約90%）です。
                  </p>
                  <div className="text-xs font-semibold text-purple-800 mb-3 ml-9 flex items-center gap-2">
                    <Target size={14} /> <span>目的: 時間と費用をかけずに解決する。</span>
                  </div>
                  <div className="text-xs text-slate-700 space-y-2.5 ml-9">
                    <div className="flex items-start gap-2.5">
                      <CheckCircle2 size={16} className="text-purple-500 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-semibold text-slate-900 flex items-center gap-1.5 mb-0.5">
                          <UsersIcon size={14} className="text-purple-600" /> 条件交渉
                        </div>
                        <div className="text-slate-600">親権、養育費、財産分与、慰謝料について話し合う。</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <CheckCircle2 size={16} className="text-purple-500 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-semibold text-slate-900 flex items-center gap-1.5 mb-0.5">
                          <FileIcon size={14} className="text-purple-600" /> 離婚協議書の作成
                        </div>
                        <div className="text-slate-600">合意内容を書面に残す。</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <CheckCircle2 size={16} className="text-purple-500 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-semibold text-slate-900 flex items-center gap-1.5 mb-0.5">
                          <Shield size={14} className="text-purple-600" /> 公正証書化
                          <span className="text-red-600 text-xs bg-red-50 px-1.5 py-0.5 rounded">超重要</span>
                        </div>
                        <div className="text-slate-600">養育費などが不払いになった際に、裁判なしで差し押さえできるようにする。</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* STEP 4 */}
                <div className="mb-4 p-4 bg-pink-50 border-l-4 border-pink-500 rounded-r-lg shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="bg-pink-500 text-white rounded-full w-7 h-7 flex items-center justify-center font-bold text-sm shrink-0">4</div>
                    <div className="font-bold text-pink-900 flex items-center gap-2">
                      <BuildingIcon size={18} /> 離婚調停
                    </div>
                  </div>
                  <p className="text-xs text-slate-700 mb-3 ml-9">
                    話し合いがまとまらない場合、家庭裁判所で調停委員を介して間接的に話し合います。
                  </p>
                  <div className="text-xs font-semibold text-pink-800 mb-3 ml-9 flex items-center gap-2">
                    <Target size={14} /> <span>目的: 第三者を入れて冷静に合意を目指す。</span>
                  </div>
                  <div className="text-xs text-slate-700 space-y-2.5 ml-9">
                    <div className="flex items-start gap-2.5">
                      <CheckCircle2 size={16} className="text-pink-500 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-semibold text-slate-900 flex items-center gap-1.5 mb-0.5">
                          <FileIcon size={14} className="text-pink-600" /> 申立て
                        </div>
                        <div className="text-slate-600">家庭裁判所に調停を申し立てる。</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <CheckCircle2 size={16} className="text-pink-500 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-semibold text-slate-900 flex items-center gap-1.5 mb-0.5">
                          <Database size={14} className="text-pink-600" /> 陳述書の提出
                        </div>
                        <div className="text-slate-600">これまでの経緯や証拠（<span className="font-rikolog">リコログ</span>の記録）を提出し、主張の正当性を訴える。</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <CheckCircle2 size={16} className="text-pink-500 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-semibold text-slate-900 flex items-center gap-1.5 mb-0.5">
                          <Calendar size={14} className="text-pink-600" /> 期日への出頭
                        </div>
                        <div className="text-slate-600">月1回程度、裁判所へ行く（相手と顔を合わせないよう配慮される）。</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* STEP 5 */}
                <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="bg-red-500 text-white rounded-full w-7 h-7 flex items-center justify-center font-bold text-sm shrink-0">5</div>
                    <div className="font-bold text-red-900 flex items-center gap-2">
                      <Gavel size={18} /> 裁判（訴訟）
                    </div>
                  </div>
                  <p className="text-xs text-slate-700 mb-3 ml-9">
                    調停でも決裂した場合の最終手段です。裁判官が判決を下します。
                  </p>
                  <div className="text-xs font-semibold text-red-800 mb-3 ml-9 flex items-center gap-2">
                    <Target size={14} /> <span>目的: 法的な強制力のある「判決」をもらう。</span>
                  </div>
                  <div className="text-xs text-slate-700 space-y-2.5 ml-9">
                    <div className="flex items-start gap-2.5">
                      <CheckCircle2 size={16} className="text-red-500 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-semibold text-slate-900 flex items-center gap-1.5 mb-0.5">
                          <Briefcase size={14} className="text-red-600" /> 弁護士への依頼
                        </div>
                        <div className="text-slate-600">本人訴訟も可能だが、専門知識が必要なため弁護士が必須に近い。</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <CheckCircle2 size={16} className="text-red-500 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-semibold text-slate-900 flex items-center gap-1.5 mb-0.5">
                          <UserCheck size={14} className="text-red-600" /> 尋問
                        </div>
                        <div className="text-slate-600">法廷で質問に答える。</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <CheckCircle2 size={16} className="text-red-500 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-semibold text-slate-900 flex items-center gap-1.5 mb-0.5">
                          <Scale size={14} className="text-red-600" /> 判決または和解
                        </div>
                        <div className="text-slate-600">裁判官の判断により離婚の可否や条件が決定される。</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3大リスクと対策 */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <AlertTriangle size={20} className="text-orange-500" /> 3大リスクと対策
                </h3>
                <p className="text-xs text-slate-600 mb-4 pl-7">
                  離婚にはエネルギーが必要です。「こんなはずじゃなかった」とならないよう、あらかじめリスクを知り、備えておきましょう。
                </p>

                <div className="space-y-4">
                  <div className="p-4 bg-orange-50 border-l-4 border-orange-500 rounded-r-lg shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <CreditCard size={18} className="text-orange-600" />
                      <div className="font-bold text-orange-900">1. 金銭的リスク</div>
                    </div>
                    <div className="ml-7 space-y-3">
                      <div>
                        <div className="flex items-start gap-2 mb-1">
                          <AlertTriangle size={14} className="text-orange-600 shrink-0 mt-0.5" />
                          <span className="text-xs font-semibold text-slate-900">リスク</span>
                        </div>
                        <p className="text-xs text-slate-700 ml-6">
                          別居後の生活費、引っ越し費用、弁護士費用（着手金・報酬金）が発生し、一時的に困窮する可能性があります。
                        </p>
                      </div>
                      <div>
                        <div className="flex items-start gap-2 mb-1">
                          <Shield size={14} className="text-green-600 shrink-0 mt-0.5" />
                          <span className="text-xs font-semibold text-slate-900">対策</span>
                        </div>
                        <ul className="text-xs text-slate-700 ml-6 space-y-1.5">
                          <li className="flex items-start gap-2">
                            <CheckCircle2 size={14} className="text-green-600 shrink-0 mt-0.5" />
                            <span>別居前に共有財産（預貯金）を確実に把握し、持ち出せるものは持ち出す。</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle2 size={14} className="text-green-600 shrink-0 mt-0.5" />
                            <span>別居開始と同時に「婚姻費用（コンピ）」を請求し、相手の収入から生活費をもらう権利を行使する。</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <Heart size={18} className="text-red-600" />
                      <div className="font-bold text-red-900">2. 精神的ストレス</div>
                    </div>
                    <div className="ml-7 space-y-3">
                      <div>
                        <div className="flex items-start gap-2 mb-1">
                          <AlertTriangle size={14} className="text-red-600 shrink-0 mt-0.5" />
                          <span className="text-xs font-semibold text-slate-900">リスク</span>
                        </div>
                        <p className="text-xs text-slate-700 ml-6">
                          相手からの執拗な連絡、親権争い、将来への不安でメンタルが削られます。PTSDやうつ状態になることも珍しくありません。
                        </p>
                      </div>
                      <div>
                        <div className="flex items-start gap-2 mb-1">
                          <Shield size={14} className="text-green-600 shrink-0 mt-0.5" />
                          <span className="text-xs font-semibold text-slate-900">対策</span>
                        </div>
                        <ul className="text-xs text-slate-700 ml-6 space-y-1.5">
                          <li className="flex items-start gap-2">
                            <CheckCircle2 size={14} className="text-green-600 shrink-0 mt-0.5" />
                            <span>一人で抱え込まない。友人、親族、カウンセラー、弁護士などの「味方」を作る。</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle2 size={14} className="text-green-600 shrink-0 mt-0.5" />
                            <span>このアプリ（<span className="font-rikolog">リコログ</span>）のような「安全基地」を持ち、感情を吐き出す場所を作る。</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded-r-lg shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <Clock size={18} className="text-yellow-600" />
                      <div className="font-bold text-yellow-900">3. 長期化のリスク</div>
                    </div>
                    <div className="ml-7 space-y-3">
                      <div>
                        <div className="flex items-start gap-2 mb-1">
                          <AlertTriangle size={14} className="text-yellow-600 shrink-0 mt-0.5" />
                          <span className="text-xs font-semibold text-slate-900">リスク</span>
                        </div>
                        <p className="text-xs text-slate-700 ml-6">
                          相手が離婚を拒否したり、親権で揉めると、解決まで1年〜数年かかる泥沼化の恐れがあります。
                        </p>
                      </div>
                      <div>
                        <div className="flex items-start gap-2 mb-1">
                          <Shield size={14} className="text-green-600 shrink-0 mt-0.5" />
                          <span className="text-xs font-semibold text-slate-900">対策</span>
                        </div>
                        <ul className="text-xs text-slate-700 ml-6 space-y-1.5">
                          <li className="flex items-start gap-2">
                            <CheckCircle2 size={14} className="text-green-600 shrink-0 mt-0.5" />
                            <span>早期解決の最短ルートは、相手が言い逃れできない「決定的な証拠」を最初に突きつけることです。</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle2 size={14} className="text-green-600 shrink-0 mt-0.5" />
                            <span>証拠さえあれば、裁判になっても勝てる見込みが高まり、相手も諦めて条件を飲みやすくなります。</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 心構え */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="bg-gradient-to-r from-pink-50 to-purple-50 border-l-4 border-pink-500 rounded-r-lg p-5 shadow-sm">
                  <h3 className="text-base font-bold text-pink-900 mb-3 flex items-center gap-2">
                    <Shield size={20} className="text-pink-600" /> 心構え：<span className="font-rikolog">リコログ</span>の役割
                  </h3>
                  <div className="mb-3">
                    <p className="text-sm text-slate-700 leading-relaxed">
                      このアプリは、あなたが不利な条件で離婚しないための<strong className="text-pink-900">「保険」であり「盾」</strong>です。
                    </p>
                  </div>
                  <div className="space-y-2.5">
                    <div className="flex items-start gap-3">
                      <MessageSquare size={18} className="text-pink-600 shrink-0 mt-0.5" />
                      <p className="text-xs text-slate-700 leading-relaxed">
                        <strong>感情的なメールを送る前に、</strong>まずはここに書き殴ってください。
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                      <Calendar size={18} className="text-pink-600 shrink-0 mt-0.5" />
                      <p className="text-xs text-slate-700 leading-relaxed">
                        <strong>辛いことがあったら、</strong>日時と場所を記録してください。
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                      <Database size={18} className="text-pink-600 shrink-0 mt-0.5" />
                      <p className="text-xs text-slate-700 leading-relaxed">
                        <strong>淡々と積み上げたその記録が、</strong>いざという時にあなたと子供を守る最強の武器になります。
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t bg-white">
              <button
                onClick={() => setIsRoadmapModalOpen(false)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-3 rounded-lg text-sm shadow"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 離婚準備チェックリストモーダル */}
      {isChecklistModalOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={() => setIsChecklistModalOpen(false)} />
            <div className="relative w-full sm:max-w-2xl lg:max-w-4xl bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl border border-gray-200 overflow-hidden max-h-[90vh] flex flex-col">
              <div className="p-4 border-b flex items-center justify-between bg-gradient-to-r from-green-50 to-emerald-50">
                <div className="flex-1">
                  <div className="text-base font-bold text-green-900 flex items-center gap-2">
                    <ListChecks size={20} /> 離婚準備チェックリスト
                  </div>
                  <div className="text-xs text-green-700 mt-1">あなたの離婚準備レベル: {checklistProgressData.overall}%</div>
                </div>
                <button
                  onClick={() => setIsChecklistModalOpen(false)}
                  className="p-2 rounded-full hover:bg-white/50 text-gray-600"
                  title="閉じる"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="overflow-y-auto flex-1 p-4 sm:p-6">
                {/* 進捗サマリー */}
                <div className="mb-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-bold text-green-900">全体進捗</div>
                    <div className="text-lg font-bold text-green-700">{checklistProgressData.overall}%</div>
                  </div>
                  <div className="w-full bg-green-200 rounded-full h-3 mb-2">
                    <div 
                      className="bg-green-600 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${checklistProgressData.overall}%` }}
                    />
                  </div>
                  <div className="text-xs text-slate-600">
                    {checklistProgressData.checked} / {checklistProgressData.total} 項目完了
                    {checklistProgressData.requiredTotal > 0 && (
                      <span className="ml-2">
                        （必須項目: {checklistProgressData.requiredChecked} / {checklistProgressData.requiredTotal}）
                      </span>
                    )}
                  </div>
                </div>

                {/* チェックリスト */}
                <div className="space-y-6">
                  {checklistData.map((phase) => {
                    const phaseColor = {
                      blue: { bg: 'bg-blue-50', border: 'border-blue-500', text: 'text-blue-900', icon: 'text-blue-600' },
                      purple: { bg: 'bg-purple-50', border: 'border-purple-500', text: 'text-purple-900', icon: 'text-purple-600' },
                      indigo: { bg: 'bg-indigo-50', border: 'border-indigo-500', text: 'text-indigo-900', icon: 'text-indigo-600' },
                      pink: { bg: 'bg-pink-50', border: 'border-pink-500', text: 'text-pink-900', icon: 'text-pink-600' },
                    }[phase.color] || phaseColor.blue;

                    return (
                      <div key={phase.phase} className={`${phaseColor.bg} border-l-4 ${phaseColor.border} rounded-r-lg p-4 shadow-sm`}>
                        <div className="flex items-center gap-2 mb-3">
                          <div className={`${phaseColor.border.replace('border-', 'bg-')} text-white rounded-full w-7 h-7 flex items-center justify-center font-bold text-sm shrink-0`}>
                            {phase.phase}
                          </div>
                          <div className={`font-bold ${phaseColor.text} flex-1`}>{phase.title}</div>
                        </div>
                        <div className="space-y-2 ml-9">
                          {phase.items.map((item) => {
                            const isChecked = checklistProgress[item.id] || false;
                            return (
                              <div key={item.id} className="flex items-start gap-2.5">
                                <button
                                  onClick={() => toggleChecklistItem(item.id)}
                                  className="shrink-0 mt-0.5"
                                >
                                  {isChecked ? (
                                    <CheckSquare size={18} className="text-green-600" />
                                  ) : (
                                    <Square size={18} className="text-gray-400" />
                                  )}
                                </button>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className={`text-xs ${isChecked ? 'line-through text-gray-500' : 'text-slate-900'}`}>
                                      {item.text}
                                    </span>
                                    {item.required && (
                                      <span className="text-red-600 text-xs font-bold">★必須</span>
                                    )}
                                    {item.help && (
                                      <button
                                        onClick={() => setSelectedHelpItem(selectedHelpItem === item.id ? null : item.id)}
                                        className="shrink-0"
                                      >
                                        <HelpCircle size={14} className="text-blue-500 hover:text-blue-700" />
                                      </button>
                                    )}
                                  </div>
                                  {selectedHelpItem === item.id && item.help && (
                                    <div className="mt-1 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-slate-700">
                                      {item.help}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="p-4 border-t bg-white">
                <button
                  onClick={() => setIsChecklistModalOpen(false)}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-bold px-4 py-3 rounded-lg text-sm shadow"
                >
                  閉じる
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

      {/* アフィリエイトセクション（弁護士相談、探偵相談、離婚後の生活支援） */}
      {SHOW_AFFILIATE_SECTIONS && (
        <>
          {/* 弁護士に相談する */}
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

          {/* 浮気調査を依頼する */}
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
        </>
      )}

      {/* プレミアムプラン */}
      <button
        onClick={onShowPremium}
        className="w-full bg-yellow-50 border border-yellow-200 rounded-xl shadow-sm p-4 hover:shadow-md transition text-left relative"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-1">
              <Crown size={16} className="text-yellow-600" /> プレミアムプラン（今後リリース予定）
        </div>
            <div className="text-xs text-gray-600 leading-relaxed mb-2">
              プレミアムプランは今後リリース予定です。容量無制限・広告非表示・カモフラージュアイコン変更などの機能を予定しています。
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
const ExportView = ({ logs, userProfile, onShowPremium, isPremium: exportIsPremium }) => {
  const [authorName, setAuthorName] = useState(''); // PDF出力時の申立人名
  // メインコンポーネントから渡されたisPremiumを使用（なければlocalStorageをチェック）
  const isPremium = exportIsPremium !== undefined ? exportIsPremium : checkPremiumStatus();
  const userPlan = getUserPlan();
  const isFreePlan = userPlan === PLAN_TYPES.FREE;

  const sampleLogs = [
    {
      date: "2030/01/01",
      time: "12:00",
      category: "モラハラ",
      location: "（サンプル）自宅",
      content: "【サンプルデータ】これは表示例です。実際のログを記録すると、ここに表示されます。",
      attachments: [{ type: "audio", name: "（サンプル）rec001.mp3" }],
    },
  ];

  const effectiveLogs = logs && logs.length > 0 ? logs : sampleLogs;
    const statementData = useMemo(
    () => {
      const baseData = buildStatementDataFromLogs({ logs: effectiveLogs, userProfile, authorName });
      return {
        ...baseData,
        isFreePlan,
        watermark: isFreePlan ? FREE_PLAN_LIMITS.PDF_WATERMARK : undefined,
      };
    },
    [effectiveLogs, userProfile, isFreePlan, authorName]
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
        {isFreePlan && (
          <>
            <br />
            <span className="text-yellow-700">※現在は、プレビュー（サンプル）のみご覧いただけます。PDF出力は今後リリース予定のプレミアムプランで利用可能になります。</span>
          </>
        )}
      </p>

      {/* 申立人名入力 */}
      <div className="mb-4">
        <label className="block text-xs font-bold text-gray-700 mb-2">
          申立人名（実名）<span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={authorName}
          onChange={(e) => setAuthorName(e.target.value)}
          placeholder={userProfile?.name || userProfile?.email || "申立人のお名前を入力してください"}
          className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
        />
        <p className="text-[10px] text-gray-500 mt-1">
          ※PDFに記載される申立人名です。実名を入力してください。
        </p>
      </div>

      {/* 無料プラン時の制限通知 */}
      {isFreePlan && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg mb-4">
          <div className="flex items-start gap-2">
            <Crown size={16} className="text-yellow-600 mt-0.5" />
            <div className="flex-1">
              <div className="text-sm font-bold text-yellow-900 mb-1">PDF出力はプレミアムプラン限定です</div>
              <div className="text-xs text-yellow-800 leading-relaxed">
                無料プランでは、陳述書の<strong>プレビュー（サンプル）のみ</strong>ご覧いただけます。プレビューには「<strong>SAMPLE</strong>」という透かしが入ります。
                <br />
                PDF出力機能をご利用いただくには、プレミアムプランへのアップグレードが必要です。
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
        {isFreePlan ? (
          /* 無料プラン：PDF出力ボタンを非表示、プレミアムプランへの誘導を表示 */
          <>
            <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <Crown size={24} className="mx-auto mb-2 text-yellow-600" />
              <p className="text-sm font-bold text-gray-700 mb-2">PDF出力は今後リリース予定のプレミアムプランで利用可能になります</p>
              <p className="text-xs text-gray-600 mb-4">
                現在は、プレビュー（サンプル）のみご覧いただけます。
                <br />
                PDF出力機能は、プレミアムプランリリース時にご利用いただけるようになります。
              </p>
              {onShowPremium && (
                <button
                  onClick={onShowPremium}
                  className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-bold py-3 px-4 rounded-lg text-sm flex items-center justify-center gap-2 shadow-lg hover:from-yellow-600 hover:to-orange-600 transition-colors"
                >
                  <Crown size={16} /> プレミアムプランについて（今後リリース予定）
                </button>
              )}
            </div>
          </>
        ) : (
          /* プレミアムプラン：PDF出力ボタンを表示 */
          <>
            <PDFDownloadLink
              document={<StatementDocument data={statementData} />}
              fileName={fileName}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded shadow-lg flex items-center justify-center gap-2"
            >
              {({ loading }) => (
                <>
                  <FileText size={18} /> {loading ? "PDF生成中…" : "PDFファイルを出力する"}
                </>
              )}
            </PDFDownloadLink>
            <p className="text-[10px] text-center text-gray-500 mt-2">
              ※端末にPDFとして保存されます。コンビニ等で印刷可能です。
            </p>
          </>
        )}
      </div>
    </div>
  );
};

// --- メッセージ機能 ---
const MessagesView = ({ user }) => {
  const [messages, setMessages] = useState([
    { id: 1, from: "リコログ事務局", subject: "【重要】データのバックアップについて", body: "万が一の紛失に備え、定期的にPDF出力を行い、外部の安全な場所に保管することを推奨します。", date: "2025/01/10", read: true },
  ]);
  const [inquiryMessage, setInquiryMessage] = useState('');
  const [inquirySubject, setInquirySubject] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendStatus, setSendStatus] = useState(null); // 'success' | 'error' | null

  const handleSendInquiry = async () => {
    if (!inquiryMessage.trim()) {
      alert('お問い合わせ内容を入力してください');
      return;
    }

    setIsSending(true);
    setSendStatus(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userEmail = sessionData?.session?.user?.email || user?.email || '';
      const userId = sessionData?.session?.user?.id || user?.id || null;

      const { data, error } = await supabase.functions.invoke('send-inquiry', {
        body: {
          message: inquiryMessage.trim(),
          subject: inquirySubject.trim() || 'お問い合わせ',
          userEmail: userEmail,
          userId: userId,
        }
      });

      if (error) {
        throw error;
      }

      if (data?.success) {
        setSendStatus('success');
        setInquiryMessage('');
        setInquirySubject('');
        setTimeout(() => {
          setSendStatus(null);
        }, 5000);
      } else {
        throw new Error(data?.message || '送信に失敗しました');
      }
    } catch (error) {
      logger.error('お問い合わせ送信エラー:', error);
      setSendStatus('error');
      alert(error.message || 'お問い合わせの送信に失敗しました。もう一度お試しください。');
    } finally {
      setIsSending(false);
    }
  };

    return (
    <div className="p-4 pb-24">
      <h2 className="font-bold text-lg mb-4 text-slate-900 flex items-center gap-2">
        <Mail size={20} /> 受信トレイ
      </h2>
      <div className="space-y-3">
        {messages.map(msg => (
          <div key={msg.id} className={`bg-white p-4 rounded-lg shadow-sm border ${msg.read ? 'border-gray-100' : 'border-pink-200 bg-pink-50'}`}>
            <div className="flex justify-between items-start mb-1">
              <span className="text-xs font-bold text-slate-700 font-rikolog">{msg.from}</span>
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
          
          {sendStatus === 'success' && (
            <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded-lg text-xs mb-3">
              ✓ お問い合わせを送信しました。確認メールをお送りしました。
            </div>
          )}
          
          {sendStatus === 'error' && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-xs mb-3">
              ✗ 送信に失敗しました。もう一度お試しください。
            </div>
          )}
          
          <input
            type="text"
            className="w-full bg-gray-50 border border-gray-200 rounded p-2 text-xs mb-2"
            placeholder="件名（任意）"
            value={inquirySubject}
            onChange={(e) => setInquirySubject(e.target.value)}
            disabled={isSending}
          />
          <textarea 
            className="w-full bg-gray-50 border border-gray-200 rounded p-3 text-sm h-24 mb-2"
            placeholder="お問い合わせ内容"
            value={inquiryMessage}
            onChange={(e) => setInquiryMessage(e.target.value)}
            disabled={isSending}
          ></textarea>
          <button 
            className="bg-slate-800 text-white text-xs font-bold px-4 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            onClick={handleSendInquiry}
            disabled={isSending || !inquiryMessage.trim()}
          >
            {isSending ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                送信中...
              </>
            ) : (
              <>
                <Send size={14} />
                送信する
              </>
            )}
          </button>
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
            category: p.category || 'other',
            replies: Array.isArray(p.replies) ? p.replies : [],
          }))
        : [];
    } catch {
      return [];
    }
  });
  const [showForm, setShowForm] = useState(false);
  const [newPost, setNewPost] = useState({ title: '', content: '', author: '', category: 'other' });
  const [selectedPostId, setSelectedPostId] = useState(null);
  const [replyContent, setReplyContent] = useState('');
  const [replyAuthor, setReplyAuthor] = useState('');
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
      author: (newPost.author || '').trim() || '匿名',
      category: newPost.category || 'other',
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timestamp: new Date().toISOString(),
      replies: [],
    };
    persist([post, ...posts]);
    setNewPost({ title: '', content: '', author: '', category: 'other' });
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

  const handleSubmitReply = (postId) => {
    if (!replyContent.trim()) return alert('返信内容を入力してください。');
    const reply = {
      id: 'reply_' + Date.now(),
      content: replyContent.trim(),
      author: (replyAuthor || '').trim() || '匿名',
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timestamp: new Date().toISOString(),
    };
    const next = posts.map((p) => (p.id === postId ? { ...p, replies: [...(p.replies || []), reply] } : p));
    persist(next);
    setSelectedPostId(null);
    setReplyContent('');
    setReplyAuthor('');
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
        <div className="bg-white p-5 rounded-2xl shadow-md border border-gray-200 mb-4 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              タイトル
            </label>
            <input
              type="text"
              placeholder="投稿のタイトルを入力"
              value={newPost.title}
              onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
              className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              内容
            </label>
            <textarea
              placeholder="投稿内容を入力してください"
              value={newPost.content}
              onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
              className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 text-sm h-32 resize-none focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <User size={16} className="text-gray-500" />
              ハンドルネーム
              <span className="text-xs font-normal text-gray-400">（任意・未入力で匿名）</span>
            </label>
            <input
              type="text"
              placeholder="匿名"
              value={newPost.author}
              onChange={(e) => setNewPost({ ...newPost, author: e.target.value })}
              className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
            />
          </div>
          <button 
            onClick={handleSubmitPost} 
            className="w-full bg-gradient-to-r from-pink-600 to-pink-500 text-white font-bold py-3 rounded-lg shadow-md hover:shadow-lg hover:from-pink-700 hover:to-pink-600 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
          >
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
            const allReplies = [
              {
                ...post,
                isFirst: true,
                replyNumber: 1,
              },
              ...(post.replies || []).map((r, idx) => ({
                ...r,
                isFirst: false,
                replyNumber: idx + 2,
              }))
            ];
            
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
                          setReplyAuthor('');
                        }}
                        className="px-4 bg-gray-200 text-gray-700 text-xs font-bold py-2 rounded"
                      >
                        キャンセル
                      </button>
                    </div>
                  </div>
                )}

                {post.replies?.length ? (
                  <div className="space-y-2 mt-3">
                    {allReplies.map((reply) => (
                      <div 
                        key={reply.id} 
                        id={`res-${reply.replyNumber}`}
                        className="bg-gray-50 border border-gray-200 rounded-lg p-3 hover:border-gray-300 transition"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0">
                            <div className="bg-slate-100 text-slate-700 text-xs font-bold px-2 py-1 rounded min-w-[2.5rem] text-center">
                              {reply.replyNumber}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-semibold text-gray-700">
                                {reply.author || '匿名'}
                              </span>
                              {reply.isFirst && (
                                <span className="text-[10px] px-1.5 py-0.5 bg-pink-100 text-pink-700 rounded font-bold">
                                  スレ主
                                </span>
                              )}
                              <span className="text-[10px] text-gray-400">
                                {reply.date} {reply.time}
                              </span>
                            </div>
                            <p className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed">
                              {reply.content}
                            </p>
                          </div>
                        </div>
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

const LogDetailView = ({ log, onClose, onUpdate, isPremium: detailIsPremium }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(log.content || '');
  const [editedCategory, setEditedCategory] = useState(log.category || 'モラハラ');
  const [editedLocation, setEditedLocation] = useState(log.location || '');
  const [editedAttachments, setEditedAttachments] = useState(log.attachments || []);
  const [newComment, setNewComment] = useState('');
  const comments = log.comments || [];
  // メインコンポーネントから渡されたisPremiumを使用（なければlocalStorageをチェック）
  const isPremium = detailIsPremium !== undefined ? detailIsPremium : checkPremiumStatus();
  const userPlan = getUserPlan();

  const categories = ["モラハラ", "暴力・DV", "不貞・浮気", "生活費未払い", "育児放棄", "通院・診断書", "その他"];

  const handleFileSelect = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // 無料プラン：写真のみ許可
    if (userPlan === PLAN_TYPES.FREE) {
      if (type !== 'image') {
        alert('現在は写真のみ添付できます。録音・動画は今後リリース予定のプレミアムプランでご利用いただけるようになります。');
        e.target.value = '';
        return;
      }
      
      if (editedAttachments.length >= FREE_PLAN_LIMITS.MAX_ATTACHMENTS) {
        alert(`現在は最大${FREE_PLAN_LIMITS.MAX_ATTACHMENTS}個まで添付できます。今後リリース予定のプレミアムプランで無制限になります。`);
        e.target.value = '';
        return;
      }
      
      const fileSizeMB = file.size / (1024 * 1024);
      if (fileSizeMB > FREE_PLAN_LIMITS.MAX_FILE_SIZE_MB) {
        alert(`現在は1ファイルあたり最大${FREE_PLAN_LIMITS.MAX_FILE_SIZE_MB}MBまでです。今後リリース予定のプレミアムプランで無制限になります。`);
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

  // Xへ共有する関数
  const handleShareToX = () => {
    // プライバシー保護: 具体的な内容ではなく記録したことだけを共有
    const text = `【記録完了】${log.date} ${log.category}のログを記録しました。

離婚に向けた証拠を継続的に記録中です。
#リコログ #離婚準備 #証拠記録`;

    // Twitter Web Intent URLを作成
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;

    // 新しいウィンドウで開く
    window.open(twitterUrl, '_blank', 'width=550,height=420');
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
            {/* X共有ボタン */}
            <button
              onClick={handleShareToX}
              className="p-1.5 sm:p-2 rounded-full active:bg-gray-100 text-gray-600 hover:text-black touch-manipulation"
              title="Xで共有"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 sm:w-[18px] sm:h-[18px] fill-current">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            </button>
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
                    現在: 写真のみ添付可能（最大{FREE_PLAN_LIMITS.MAX_ATTACHMENTS}個、1ファイルあたり{FREE_PLAN_LIMITS.MAX_FILE_SIZE_MB}MBまで）。録音・動画は今後リリース予定のプレミアムプランでご利用いただけるようになります。
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

const TimelineView = ({ logs, onLogClick, userProfile, onShowPremium, isPremium: timelineIsPremium }) => {
  const [activeTab, setActiveTab] = useState('list'); // 'list' or 'pdf'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortOrder, setSortOrder] = useState('newest'); // 'newest', 'oldest', 'dateAsc', 'dateDesc'
  const [showFilters, setShowFilters] = useState(false);
  const [authorName, setAuthorName] = useState(''); // PDF出力時の申立人名

  // メインコンポーネントから渡されたisPremiumを使用（なければlocalStorageをチェック）
  const isPremium = timelineIsPremium !== undefined ? timelineIsPremium : checkPremiumStatus();
  const userPlan = getUserPlan();
  const isFreePlan = userPlan === PLAN_TYPES.FREE;

  const sampleLogs = [
    {
      date: "2030/01/01",
      time: "12:00",
      category: "モラハラ",
      location: "（サンプル）自宅",
      content: "【サンプルデータ】これは表示例です。実際のログを記録すると、ここに表示されます。",
      attachments: [{ type: "audio", name: "（サンプル）rec001.mp3" }],
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
      const baseData = buildStatementDataFromLogs({ logs: effectiveLogs, userProfile, authorName });
      return {
        ...baseData,
        isFreePlan,
        watermark: isFreePlan ? FREE_PLAN_LIMITS.PDF_WATERMARK : undefined,
      };
    },
    [effectiveLogs, userProfile, isFreePlan, authorName]
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

  // サンプルログかどうかを判定
  const isSampleLog = (log) => {
    // logsが空の場合はeffectiveLogsがsampleLogsになっている
    if (!logs || logs.length === 0) return true;
    // サンプルログの特徴で判定
    return log.date === "2030/01/01" && log.content && log.content.includes("【サンプルデータ】");
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
            {!isPremium && (
              <span className="ml-1 text-[10px] bg-yellow-500 text-white px-1.5 py-0.5 rounded-full">
                <Crown size={10} className="inline-block mr-0.5" />
                プレミアム
              </span>
            )}
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
              const isSample = isSampleLog(log);
              return (
                <div
                  key={idx}
                  onClick={() => onLogClick(log, originalIdx >= 0 ? originalIdx : idx)}
                  className={`p-4 rounded-xl shadow-sm border-l-4 relative cursor-pointer transition-all ${
                    isSample 
                      ? 'bg-gray-100 border-gray-300 opacity-60' 
                      : 'bg-white border-slate-900 hover:shadow-md'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className={`text-xs font-mono px-2 py-1 rounded ${
                      isSample 
                        ? 'text-gray-400 bg-gray-200' 
                        : 'text-gray-500 bg-gray-100'
                    }`}>
                      {log.date} {log.time}
                    </span>
                    <span
                      className={`text-xs font-bold px-2 py-1 rounded ${
                        isSample 
                          ? 'bg-gray-400 text-gray-300' 
                          : `text-white ${
                              log.category === '暴力・DV' ? 'bg-red-600' :
                              log.category === '不貞・浮気' ? 'bg-purple-600' :
                              log.category === 'モラハラ' ? 'bg-orange-500' :
                              log.category === '通院・診断書' ? 'bg-rose-600' :
                              'bg-gray-500'
                            }`
                      }`}
                    >
                      {log.category}
                    </span>
                  </div>

                  <p className={`text-sm whitespace-pre-wrap line-clamp-3 ${
                    isSample ? 'text-gray-400' : 'text-gray-700'
                  }`}>{log.content}</p>

                  {log.comments && log.comments.length > 0 && (
                    <div className={`mt-2 flex items-center gap-1 text-xs ${
                      isSample ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      <MessageCircle size={12} />
                      <span>{log.comments.length}件のコメント</span>
                    </div>
                  )}

                  {log.medical && (
                    <div className={`mt-3 rounded-lg p-3 ${
                      isSample 
                        ? 'bg-gray-200 border border-gray-300' 
                        : 'bg-rose-50 border border-rose-200'
                    }`}>
                      <div className={`text-[10px] font-bold mb-1 ${
                        isSample ? 'text-gray-400' : 'text-rose-800'
                      }`}>
                        医療記録（通院・診断書）
                      </div>
                      <div className={`text-xs space-y-1 ${
                        isSample ? 'text-gray-400' : 'text-rose-900'
                      }`}>
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
                          className={`text-[10px] px-2 py-1 rounded flex items-center gap-1 border ${
                            isSample
                              ? 'bg-gray-200 text-gray-400 border-gray-300'
                              : att.type === 'image' ? 'bg-blue-50 text-blue-700 border-blue-100' :
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
                {isFreePlan && (
                  <>
                    <br />
                    <span className="text-yellow-700">※現在は、プレビュー（サンプル）のみご覧いただけます。PDF出力は今後リリース予定のプレミアムプランで利用可能になります。</span>
                  </>
                )}
              </p>

              {/* 申立人名入力 */}
              <div className="mb-4">
                <label className="block text-xs font-bold text-gray-700 mb-2">
                  申立人名（実名）<span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  placeholder={userProfile?.name || userProfile?.email || "申立人のお名前を入力してください"}
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                />
                <p className="text-[10px] text-gray-500 mt-1">
                  ※PDFに記載される申立人名です。実名を入力してください。
                </p>
              </div>

              {/* 無料プラン時の制限通知 */}
              {isFreePlan && (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg mb-4">
                  <div className="flex items-start gap-2">
                    <Crown size={16} className="text-yellow-600 mt-0.5" />
                    <div className="flex-1">
                      <div className="text-sm font-bold text-yellow-900 mb-1">PDF出力はプレミアムプラン限定です</div>
                      <div className="text-xs text-yellow-800 leading-relaxed">
                        無料プランでは、陳述書の<strong>プレビュー（サンプル）のみ</strong>ご覧いただけます。プレビューには「<strong>SAMPLE</strong>」という透かしが入ります。
                        <br />
                        PDF出力機能をご利用いただくには、プレミアムプランへのアップグレードが必要です。
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
                {isFreePlan ? (
                  /* 無料プラン：PDF出力ボタンを非表示、プレミアムプランへの誘導を表示 */
                  <>
                    <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                      <Crown size={24} className="mx-auto mb-2 text-yellow-600" />
                      <p className="text-sm font-bold text-gray-700 mb-2">PDF出力はプレミアムプラン限定です</p>
                      <p className="text-xs text-gray-600 mb-4">
                        無料プランでは、プレビュー（サンプル）のみご覧いただけます。
                        <br />
                        PDF出力機能をご利用いただくには、プレミアムプランへのアップグレードが必要です。
                      </p>
                      {onShowPremium && (
                        <button
                          onClick={onShowPremium}
                          className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-bold py-3 px-4 rounded-lg text-sm flex items-center justify-center gap-2 shadow-lg hover:from-yellow-600 hover:to-orange-600 transition-colors"
                        >
                          <Crown size={16} /> プレミアムプランでPDF出力を利用する
                        </button>
                      )}
                    </div>
                  </>
                ) : (
                  /* プレミアムプラン：PDF出力ボタンを表示 */
                  <>
                    <PDFDownloadLink
                      document={<StatementDocument data={statementData} />}
                      fileName={fileName}
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded shadow-lg flex items-center justify-center gap-2"
                    >
                      {({ loading }) => (
                        <>
                          <FileText size={18} /> {loading ? "PDF生成中…" : "PDFファイルを出力する"}
                        </>
                      )}
                    </PDFDownloadLink>
                    <p className="text-[10px] text-center text-gray-500 mt-2">
                      ※端末にPDFとして保存されます。コンビニ等で印刷可能です。
                    </p>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const AddLogView = ({ onSave, onCancel, onShowPremium, showGuide, onGuideClose, isPremium: addIsPremium }) => {
  const [category, setCategory] = useState("モラハラ");
  const [content, setContent] = useState("");
  const [location, setLocation] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [shareToX, setShareToX] = useState(false); // X共有オプション
  // メインコンポーネントから渡されたisPremiumを使用（なければlocalStorageをチェック）
  const isPremium = addIsPremium !== undefined ? addIsPremium : checkPremiumStatus();
  
  // 容量制限（無料版：合計10MB、プレミアム：無制限）
  const MAX_ATTACHMENTS_FREE = 3;
  const MAX_TOTAL_SIZE_MB_FREE = 10;

  // 医療的裏付け（通院・診断書等）
  const [medicalFacility, setMedicalFacility] = useState("");
  const [medicalDepartment, setMedicalDepartment] = useState("");
  const [medicalVisitType, setMedicalVisitType] = useState("通院");
  const [medicalDiagnosis, setMedicalDiagnosis] = useState("");
  const [medicalSeverity, setMedicalSeverity] = useState("不明");
  const [medicalProofs, setMedicalProofs] = useState([]);
  const [medicalMemo, setMedicalMemo] = useState("");

  const isMedicalCategory = category === "通院・診断書";

  // カテゴリ切替: 医療カテゴリ以外では医療情報をリセット
  const prevCategoryRef = useRef(category);
  useEffect(() => {
    if (prevCategoryRef.current !== category) {
      // 「通院・診断書」以外のカテゴリに変更した場合は医療情報をリセット
      if (category !== "通院・診断書") {
        setMedicalFacility("");
        setMedicalDepartment("");
        setMedicalVisitType("通院");
        setMedicalDiagnosis("");
        setMedicalSeverity("不明");
        setMedicalProofs([]);
        setMedicalMemo("");
      }
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

  const [isGettingLocation, setIsGettingLocation] = useState(false);
  
  const handleLocation = async () => {
    // プレミアムプラン限定機能
    if (!isPremium) {
      if (onShowPremium) {
        const confirmed = confirm('GPS位置情報の自動取得は今後リリース予定のプレミアムプランで利用可能になります。\n\n詳細を確認しますか？');
        if (confirmed) {
          onShowPremium();
        }
      } else {
        alert('GPS位置情報の自動取得は今後リリース予定のプレミアムプランで利用可能になります。\n\n現在は手動入力でご利用いただけます。');
      }
      return;
    }

    if (!navigator.geolocation) {
      alert('お使いのデバイスは位置情報取得に対応していません。');
      return;
    }

    setIsGettingLocation(true);
    
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          }
        );
      });

      const { latitude, longitude, accuracy } = position.coords;
      
      // 逆ジオコーディング（Nominatim APIを使用）
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1&accept-language=ja`,
          {
            headers: {
              'User-Agent': 'Riko-Log/1.0' // Nominatim APIの利用規約に従う
            }
          }
        );
        
        if (!response.ok) {
          throw new Error('逆ジオコーディングAPI エラー');
        }
        
        const data = await response.json();
        
        let address = '';
        if (data.address) {
          // 日本の住所フォーマット: 都道府県 + 市区町村 + その他
          const parts = [];
          if (data.address.state || data.address.prefecture) {
            parts.push(data.address.state || data.address.prefecture);
          }
          if (data.address.city || data.address.town || data.address.village) {
            parts.push(data.address.city || data.address.town || data.address.village);
          }
          if (data.address.suburb || data.address.neighbourhood) {
            parts.push(data.address.suburb || data.address.neighbourhood);
          }
          address = parts.join('');
        }
        
        // 住所が取得できなかった場合は緯度経度を表示
        const locationText = address || `緯度${latitude.toFixed(6)}, 経度${longitude.toFixed(6)}`;
        const accuracyText = accuracy ? `（GPS取得済・精度: ±${Math.round(accuracy)}m）` : '（GPS取得済）';
        setLocation(`${locationText}${accuracyText}`);
      } catch (geocodeError) {
        logger.error('逆ジオコーディングエラー:', geocodeError);
        // 逆ジオコーディングに失敗した場合は緯度経度を表示
        const accuracyText = accuracy ? `（GPS取得済・精度: ±${Math.round(accuracy)}m）` : '（GPS取得済）';
        setLocation(`緯度${latitude.toFixed(6)}, 経度${longitude.toFixed(6)}${accuracyText}`);
      }
    } catch (error) {
      logger.error('位置情報取得エラー:', error);
      const PERMISSION_DENIED = 1;
      const POSITION_UNAVAILABLE = 2;
      const TIMEOUT = 3;
      
      if (error.code === PERMISSION_DENIED) {
        // より詳細な説明を表示
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        const isChrome = /Chrome/.test(navigator.userAgent);
        const isSafari = /Safari/.test(navigator.userAgent) && !isChrome;
        const isFirefox = /Firefox/.test(navigator.userAgent);
        
        let instructions = '位置情報の使用が許可されていません。\n\n';
        
        if (isIOS && isSafari) {
          instructions += '【iPhone/iPadの場合】\n';
          instructions += '1. 設定アプリを開く\n';
          instructions += '2. Safari → プライバシーとセキュリティ\n';
          instructions += '3. 「位置情報サービス」をオンにする\n';
          instructions += '4. Safariでこのページを再読み込み\n';
          instructions += '5. 位置情報ボタンを押した時に表示される許可ダイアログで「許可」を選択\n\n';
        } else if (isChrome) {
          instructions += '【Chromeの場合】\n';
          instructions += '1. アドレスバーの左側にある「🔒」または「ⓘ」アイコンをクリック\n';
          instructions += '2. 「位置情報」を「許可」に変更\n';
          instructions += '3. ページを再読み込み\n';
          instructions += 'または、設定 → プライバシーとセキュリティ → サイトの設定 → 位置情報 から設定\n\n';
        } else if (isFirefox) {
          instructions += '【Firefoxの場合】\n';
          instructions += '1. アドレスバーの左側にある「🔒」アイコンをクリック\n';
          instructions += '2. 「位置情報」の横の「×」をクリックして「許可」に変更\n';
          instructions += '3. ページを再読み込み\n\n';
        } else {
          instructions += '【一般的な手順】\n';
          instructions += '1. ブラウザのアドレスバー左側のアイコン（🔒やⓘ）をクリック\n';
          instructions += '2. 位置情報の設定を「許可」に変更\n';
          instructions += '3. ページを再読み込みしてから再度お試しください\n\n';
        }
        
        instructions += '※HTTPS環境（本番環境）では動作します。\n';
        instructions += '※localhost（127.0.0.1）でも動作しますが、ブラウザによっては設定が必要な場合があります。';
        
        alert(instructions);
      } else if (error.code === POSITION_UNAVAILABLE) {
        alert('位置情報を取得できませんでした。GPS機能がオンになっているか確認してください。');
      } else if (error.code === TIMEOUT) {
        alert('位置情報の取得がタイムアウトしました。もう一度お試しください。');
      } else {
        alert('位置情報の取得に失敗しました。もう一度お試しください。');
      }
    } finally {
      setIsGettingLocation(false);
    }
  };
  const handleFileSelect = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const userPlan = getUserPlan();
    
    // 無料プラン：写真のみ許可
    if (userPlan === PLAN_TYPES.FREE) {
      if (type !== 'image') {
        alert('現在は写真のみ添付できます。録音・動画は今後リリース予定のプレミアムプランでご利用いただけるようになります。');
        e.target.value = ''; // ファイル選択をリセット
        return;
      }
      
      if (attachments.length >= FREE_PLAN_LIMITS.MAX_ATTACHMENTS) {
        alert(`現在は最大${FREE_PLAN_LIMITS.MAX_ATTACHMENTS}個まで添付できます。今後リリース予定のプレミアムプランで無制限になります。`);
        e.target.value = '';
        return;
      }
      
      const fileSizeMB = file.size / (1024 * 1024);
      if (fileSizeMB > FREE_PLAN_LIMITS.MAX_FILE_SIZE_MB) {
        alert(`現在は1ファイルあたり最大${FREE_PLAN_LIMITS.MAX_FILE_SIZE_MB}MBまでです。今後リリース予定のプレミアムプランで無制限になります。`);
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

  // Xへ共有する関数
  const shareToTwitter = (logData) => {
    // プライバシー保護: 具体的な内容ではなく記録したことだけを共有
    const dateStr = logData.date;
    const categoryStr = logData.category;

    // 共有テキスト（個人情報は含めない）
    const text = `【記録完了】${dateStr} ${categoryStr}のログを記録しました。

離婚に向けた証拠を継続的に記録中です。
#リコログ #離婚準備 #証拠記録`;

    // Twitter Web Intent URLを作成
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;

    // 新しいウィンドウで開く
    window.open(twitterUrl, '_blank', 'width=550,height=420');
  };

  const handleSubmit = () => {
    const now = new Date();
    const trimmed = String(content || "").trim();
    const medicalAuto = isMedicalCategory && medicalHasData() ? buildMedicalAutoText() : "";
    const finalContent = trimmed || medicalAuto;
    if (!finalContent) return alert("内容を入力してください（または医療記録の項目を入力してください）");

    const medical =
      isMedicalCategory && medicalHasData()
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

    const logData = {
      date: now.toLocaleDateString(),
      time: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      category,
      location: location || "場所不明",
      content: finalContent,
      attachments,
      medical,
    };

    // ログを保存
    onSave(logData);

    // X共有オプションがオンの場合、共有画面を開く
    if (shareToX) {
      shareToTwitter(logData);
    }
  };

  const categories = ["モラハラ", "暴力・DV", "不貞・浮気", "生活費未払い", "育児放棄", "通院・診断書", "その他"];

    return (
        <div className="p-4 bg-white min-h-full pb-24">
            <h2 className="font-bold text-lg mb-4 text-slate-900">新規ログ記録</h2>
            
            {/* 証拠力向上のメッセージ */}
            <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-3 mb-4">
              <div className="flex items-start gap-2">
                <span className="text-blue-600 text-lg">💡</span>
                <div className="flex-1">
                  <div className="text-xs font-bold text-blue-900 mb-1">記録を増やすほど証拠力が向上します</div>
                  <div className="text-[10px] text-blue-800 leading-relaxed">
                    日時・場所・具体的な内容を詳しく記録すればするほど、裁判で有利になります。できるだけ詳細に記録しましょう。
                  </div>
                </div>
              </div>
            </div>
            
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
                        <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder={isPremium ? "自動取得ボタン" : "手動入力（GPSはプレミアム限定）"} className="flex-1 bg-gray-50 border border-gray-200 rounded p-3 text-sm" disabled={isGettingLocation} />
                        <button 
                          onClick={handleLocation} 
                          disabled={isGettingLocation || !isPremium}
                          className={`p-3 rounded transition-colors relative border ${
                            isGettingLocation 
                              ? 'bg-gray-300 text-gray-400 cursor-not-allowed border-gray-300' 
                              : !isPremium
                              ? 'bg-gray-50 border-yellow-300 text-gray-400 cursor-pointer hover:bg-yellow-50'
                              : 'bg-gray-200 text-gray-600 hover:bg-gray-300 border-gray-200'
                          }`}
                          title={isGettingLocation ? '位置情報取得中...' : !isPremium ? 'GPS位置情報は今後リリース予定のプレミアムプランで利用可能になります' : 'GPSで位置情報を自動取得'}
                        >
                          {isGettingLocation ? (
                            <span className="animate-spin">⏳</span>
                          ) : (
                            <div className="relative">
                              <MapPin size={20} />
                              {!isPremium && (
                                <Crown size={10} className="absolute -top-1 -right-1 text-yellow-500 fill-yellow-500" />
                              )}
                            </div>
                          )}
                        </button>
                    </div>
                    {!isPremium && (
                      <p className="text-[10px] text-gray-500 mt-1">
                        💡 GPS位置情報の自動取得は今後リリース予定のプレミアムプランで利用可能になります。現在は手動入力でご利用いただけます。
                      </p>
                    )}
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
                {isMedicalCategory && (
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
                          alert('録音機能は今後リリース予定のプレミアムプランでご利用いただけるようになります。');
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
                          alert('動画機能は今後リリース予定のプレミアムプランでご利用いただけるようになります。');
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
                    現在: {attachments.length}/{FREE_PLAN_LIMITS.MAX_ATTACHMENTS}個まで。今後リリース予定のプレミアムプランで無制限になります。
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

                {/* X共有オプション */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={shareToX}
                      onChange={(e) => setShareToX(e.target.checked)}
                      className="w-5 h-5 rounded border-gray-300 text-black focus:ring-black"
                    />
                    <div className="flex items-center gap-2">
                      <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current text-black">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                      </svg>
                      <span className="text-sm font-bold text-gray-700">保存後にXで共有する</span>
                    </div>
                  </label>
                  <p className="text-[10px] text-gray-500 mt-2 ml-8">
                    ※個人情報は共有されません（日付とカテゴリのみ）
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                    <button onClick={onCancel} className="flex-1 py-3 text-gray-500 font-bold text-sm">キャンセル</button>
                    <button onClick={handleSubmit} className="flex-1 bg-slate-900 text-white font-bold py-3 rounded shadow-lg flex items-center justify-center gap-2">
                      保存
                      {shareToX && (
                        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                        </svg>
                      )}
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- 離婚後の生活支援タブ ---
const LifeSupportView = ({ onClose }) => {
  return (
    <div className="p-4 pb-24 space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div className="font-bold text-slate-900 flex items-center gap-2">
          <HeartHandshake size={20} className="text-green-600" /> 離婚後の生活支援
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold px-3 py-2 rounded-lg text-xs flex items-center gap-1"
          >
            <ArrowLeft size={14} /> 戻る
          </button>
        )}
      </div>

      <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-4 rounded-xl shadow-sm">
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

  const [isLoading, setIsLoading] = useState(false);

  // URLパラメータからセッションIDを確認（Stripeリダイレクト後）
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');
    const canceled = urlParams.get('canceled');

    if (sessionId) {
      // チェックアウト成功 - Stripeセッションを検証してプレミアム有効化
      verifyCheckoutSession(sessionId);
      // URLからパラメータを削除
      window.history.replaceState({}, '', window.location.pathname);
    } else if (canceled) {
      // チェックアウトキャンセル
      alert('決済がキャンセルされました。');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Stripeチェックアウトセッションを検証してプレミアムを有効化
  const verifyCheckoutSession = async (sessionId) => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      // verify-checkout-session Edge Functionを呼び出す
      const response = await fetch(`${SUPABASE_FUNCTIONS_URL}/verify-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'セッション検証に失敗しました');
      }

      if (result.success) {
        // プレミアム有効化成功
        const newPremiumData = {
          subscribedAt: result.subscription.startDate,
          expiresAt: result.subscription.endDate,
          planPrice: 450,
          status: 'active'
        };
        localStorage.setItem('riko_premium', JSON.stringify(newPremiumData));
        setPremiumData(newPremiumData);
        setIsPremium(true);
        alert('プレミアムプランへの登録が完了しました！\n全ての機能がご利用いただけます。');
      } else {
        // 支払いが完了していない場合
        logger.warn('支払い未完了:', result);
        alert(result.error || '決済が完了していません。もう一度お試しください。');
      }
    } catch (error) {
      logger.error('セッション検証エラー:', error);
      // Edge Functionが利用できない場合はフォールバック
      await checkSubscriptionStatus();
    } finally {
      setIsLoading(false);
    }
  };

  // データベースからサブスクリプション状態を確認（フォールバック用）
  const checkSubscriptionStatus = async () => {
    if (!user?.id) return;

    try {
      const subscription = await getPremiumSubscription(user.id);
      if (subscription && subscription.status === 'active') {
        const expiresAt = subscription.end_date || null;
        const newPremiumData = {
          subscribedAt: subscription.start_date,
          expiresAt: expiresAt,
          planPrice: 450,
          status: 'active'
        };
        localStorage.setItem('riko_premium', JSON.stringify(newPremiumData));
        setPremiumData(newPremiumData);
        setIsPremium(true);
        alert('プレミアムプランへの登録が完了しました！');
      }
    } catch (error) {
      logger.error('サブスクリプション確認エラー:', error);
    }
  };

  const handleSubscribe = async (planPrice) => {
    if (!user?.id) {
      alert('ログインが必要です。');
      return;
    }

    // デバッグログ
    logger.log('Stripe設定確認:', {
      stripePromise: !!stripePromise,
      PREMIUM_PRICE_ID,
      SUPABASE_FUNCTIONS_URL,
      stripePublishableKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ? '設定済み' : '未設定',
    });

    // Stripe公開キーが設定されていない場合はデモモード
    if (!stripePromise) {
      logger.warn('Stripe公開キーが設定されていません。デモモードで動作します。');
    const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 1);
    
    const newPremiumData = {
      subscribedAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString(),
      planPrice,
      status: 'active'
    };
    
    localStorage.setItem('riko_premium', JSON.stringify(newPremiumData));
    setPremiumData(newPremiumData);
    setIsPremium(true);
      alert(`プレミアムプラン（月額${planPrice}円）に登録しました。\n\n注意: Stripe公開キーが設定されていないため、デモモードで動作しています。\n実際の決済を行うには、.envファイルにVITE_STRIPE_PUBLISHABLE_KEYを設定してください。`);
      return;
    }

    // Edge FunctionのURLが設定されていない場合はデモモード
    if (!SUPABASE_FUNCTIONS_URL) {
      logger.warn('Supabase Edge FunctionのURLが設定されていません。デモモードで動作します。');
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 1);
      
      const newPremiumData = {
        subscribedAt: new Date().toISOString(),
        expiresAt: expiresAt.toISOString(),
        planPrice,
        status: 'active'
      };
      
      localStorage.setItem('riko_premium', JSON.stringify(newPremiumData));
      setPremiumData(newPremiumData);
      setIsPremium(true);
      alert(`プレミアムプラン（月額${planPrice}円）に登録しました。\n\n注意: Supabase Edge Functionが設定されていないため、デモモードで動作しています。\n実際の決済を行うには、Edge Functionをデプロイしてください。\n詳細は QUICK_FIX_STRIPE.md を参照してください。`);
      return;
    }

    setIsLoading(true);

    try {
      // Supabase Edge Functionを呼び出してチェックアウトセッションを作成
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        throw new Error('認証が必要です。ログインし直してください。');
      }

      const successUrl = `${window.location.origin}/app?session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = `${window.location.origin}/app?canceled=true`;

      logger.log('チェックアウトセッション作成リクエスト:', {
        url: `${SUPABASE_FUNCTIONS_URL}/create-checkout-session`,
        userId: user.id,
        priceId: PREMIUM_PRICE_ID,
        hasPriceId: !!PREMIUM_PRICE_ID,
      });

      let response;
      try {
        response = await fetch(`${SUPABASE_FUNCTIONS_URL}/create-checkout-session`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || '',
          },
          body: JSON.stringify({
            userId: user.id,
            priceId: PREMIUM_PRICE_ID || undefined,
            amount: PREMIUM_PRICE_ID ? undefined : 450, // 価格IDがない場合は金額を送信
            currency: 'jpy',
            successUrl,
            cancelUrl,
          }),
        });
      } catch (fetchError) {
        logger.error('ネットワークエラー:', fetchError);
        // Edge Functionがデプロイされていない可能性 - デモモードにフォールバック
        if (fetchError.message.includes('Failed to fetch') || fetchError.message.includes('NetworkError')) {
          logger.warn('Edge Functionに接続できません。デモモードで動作します。');
          const expiresAt = new Date();
          expiresAt.setMonth(expiresAt.getMonth() + 1);
          
          const newPremiumData = {
            subscribedAt: new Date().toISOString(),
            expiresAt: expiresAt.toISOString(),
            planPrice,
            status: 'active'
          };
          
          localStorage.setItem('riko_premium', JSON.stringify(newPremiumData));
          setPremiumData(newPremiumData);
          setIsPremium(true);
          setIsLoading(false);
          alert(
            `プレミアムプラン（月額${planPrice}円）に登録しました。\n\n` +
            `注意: Supabase Edge Functionに接続できなかったため、デモモードで動作しています。\n\n` +
            `実際の決済を行うには、Edge Functionをデプロイしてください：\n` +
            `1. npm install -g supabase\n` +
            `2. supabase login\n` +
            `3. supabase link --project-ref sqdfjudhaffivdaxulsn\n` +
            `4. supabase functions deploy create-checkout-session\n\n` +
            `詳細は QUICK_FIX_STRIPE.md を参照してください。`
          );
          return;
        }
        throw fetchError;
      }

      logger.log('レスポンスステータス:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        let error;
        try {
          error = JSON.parse(errorText);
        } catch {
          error = { error: errorText || 'チェックアウトセッションの作成に失敗しました' };
        }
        logger.error('エラーレスポンス:', error);
        
        // 404エラーの場合、Edge Functionがデプロイされていない可能性 - デモモードにフォールバック
        if (response.status === 404) {
          logger.warn('Edge Functionが見つかりません。デモモードで動作します。');
          const expiresAt = new Date();
          expiresAt.setMonth(expiresAt.getMonth() + 1);
          
          const newPremiumData = {
            subscribedAt: new Date().toISOString(),
            expiresAt: expiresAt.toISOString(),
            planPrice,
            status: 'active'
          };
          
          localStorage.setItem('riko_premium', JSON.stringify(newPremiumData));
          setPremiumData(newPremiumData);
          setIsPremium(true);
          setIsLoading(false);
          alert(
            `プレミアムプラン（月額${planPrice}円）に登録しました。\n\n` +
            `注意: Supabase Edge Functionが見つからなかったため、デモモードで動作しています。\n\n` +
            `実際の決済を行うには、Edge Functionをデプロイしてください：\n` +
            `supabase functions deploy create-checkout-session\n\n` +
            `詳細は QUICK_FIX_STRIPE.md を参照してください。`
          );
          return;
        }
        
        throw new Error(error.error || error.message || 'チェックアウトセッションの作成に失敗しました');
      }

      const result = await response.json();
      logger.log('チェックアウトセッション作成成功:', result);

      const { sessionId, url } = result;

      if (!sessionId) {
        throw new Error('セッションIDが取得できませんでした');
      }

      if (stripePromise) {
        // Stripe Checkoutにリダイレクト
        const stripe = await stripePromise;
        if (!stripe) {
          throw new Error('Stripeの初期化に失敗しました');
        }
        const { error: redirectError } = await stripe.redirectToCheckout({ sessionId });
        if (redirectError) {
          throw new Error(redirectError.message || 'Stripe Checkoutへのリダイレクトに失敗しました');
        }
      } else if (url) {
        // URLが直接返された場合はリダイレクト
        window.location.href = url;
      } else {
        throw new Error('チェックアウトURLの取得に失敗しました');
      }
    } catch (error) {
      logger.error('決済エラー詳細:', error);
      const errorMessage = error.message || '決済処理中にエラーが発生しました';
      alert(`決済処理中にエラーが発生しました:\n\n${errorMessage}\n\n詳細はブラウザのコンソールを確認してください。`);
      setIsLoading(false);
    }
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
                <span className="text-gray-700">データをクラウド保管（容量無制限・削除されません）</span>
              </div>
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
            <div className="text-sm font-bold text-slate-900 mb-2">プレミアムプランの特典（今後リリース予定）</div>
            <div className="space-y-2 text-xs text-gray-600 mb-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-green-500" />
                <span>データをクラウド保管します（容量無制限・削除されません）</span>
              </div>
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

          <div className="bg-blue-50 border border-blue-200 rounded-xl shadow-sm p-4">
            <div className="text-xs font-bold text-slate-900 mb-2">無料プランについて</div>
            <div className="space-y-1.5 text-[10px] text-gray-700">
              <div>• データはクラウド（Supabase）に保存されます</div>
              <div>• 容量上限は50MBです。超過すると古いデータから自動削除されます</div>
              <div>• 動画・音声は今後リリース予定のプレミアムプランでアップロード可能になります（現在はテキストと写真のみ）</div>
              <div className="mt-2 pt-2 border-t border-blue-200 text-blue-800">
                💡 プレミアムプランは今後リリース予定です。リリース時にご案内いたします
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
            <div className="text-lg font-bold text-yellow-900 mb-2">プレミアムプランは今後リリース予定です</div>
            <div className="text-sm text-yellow-800 leading-relaxed">
              プレミアムプランの詳細や料金については、リリース時にご案内いたします。
              <br />
              現在は無料プランでご利用いただけます。
            </div>
          </div>
        </div>
      )}

      {/* 開発者モード（テスト用）- 開発環境でのみ表示 */}
      {import.meta.env.DEV && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="bg-gray-50 border border-gray-300 rounded-xl p-4">
            <div className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-2">
              <Database size={14} />
              開発者モード（テスト用）
            </div>
            <p className="text-[10px] text-gray-600 mb-3">
              スマホのPWAからテストする際に使用します。プレミアムプランの状態を簡単に切り替えられます。
              <br />
              <span className="text-red-600 font-bold">※本番環境では表示されません</span>
            </p>
            <div className="space-y-2">
              <button
                onClick={() => {
                  const expiresAt = new Date();
                  expiresAt.setMonth(expiresAt.getMonth() + 1);
                  const newPremiumData = {
                    subscribedAt: new Date().toISOString(),
                    expiresAt: expiresAt.toISOString(),
                    planPrice: 450,
                    status: 'active'
                  };
                  localStorage.setItem('riko_premium', JSON.stringify(newPremiumData));
                  setPremiumData(newPremiumData);
                  setIsPremium(true);
                  alert('✅ プレミアムプランに設定しました！\nページをリロードしてください。');
                }}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg text-xs flex items-center justify-center gap-2"
              >
                <CheckCircle size={14} /> プレミアムプランを有効化（1ヶ月）
              </button>
              <button
                onClick={() => {
                  const newPremiumData = {
                    subscribedAt: new Date().toISOString(),
                    expiresAt: null, // 無期限
                    planPrice: 450,
                    status: 'active'
                  };
                  localStorage.setItem('riko_premium', JSON.stringify(newPremiumData));
                  setPremiumData(newPremiumData);
                  setIsPremium(true);
                  alert('✅ プレミアムプラン（無期限）に設定しました！\nページをリロードしてください。');
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg text-xs flex items-center justify-center gap-2"
              >
                <Crown size={14} /> プレミアムプランを有効化（無期限）
              </button>
              <button
                onClick={() => {
                  if (confirm('プレミアムプランを解除して無料プランに戻しますか？')) {
                    localStorage.removeItem('riko_premium');
                    setPremiumData(null);
                    setIsPremium(false);
                    alert('✅ プレミアムプランを解除しました（無料プランに戻りました）\nページをリロードしてください。');
                  }
                }}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg text-xs flex items-center justify-center gap-2"
              >
                <XCircle size={14} /> プレミアムプランを解除（無料プランに戻す）
              </button>
              <div className="mt-2 text-center">
                <button
                  onClick={() => {
                    window.location.reload();
                  }}
                  className="text-xs text-gray-600 underline"
                >
                  ページをリロード
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
        </div>
    );
};

// --- MainApp ---
const MainApp = ({ onLock, user, onLogout, isPremium: mainIsPremium, onUserUpdate }) => {
  const [view, setView] = useState("dashboard"); // dashboard, timeline, add, messages, board, export, safety, lifeSupport, premium
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState(null);
  const [selectedLogIndex, setSelectedLogIndex] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [showAddLogGuide, setShowAddLogGuide] = useState(false);
  // ホーム画面追加案内の表示状態
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  // ログデータの読み込み
  useEffect(() => {
    const loadLogs = async () => {
      if (!user?.id) return;
      
      try {
        setIsLoading(true);
        const userLogs = await getUserLogs(user.id);
        // データ構造を変換（SupabaseからlocalStorage形式に）
        const convertedLogs = userLogs.map(log => ({
          id: log.id,
          date: log.date,
          time: log.time,
          category: log.category,
          location: log.location,
          content: log.content,
          attachments: log.attachments || [],
          medical: log.medical || null,
          comments: log.comments || [],
        }));
        setLogs(convertedLogs);
        setError(null);
      } catch (err) {
        logger.error("ログの読み込みエラー:", err);
        setError("ログの読み込みに失敗しました");
        setLogs([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadLogs();
  }, [user?.id]);

  // ホーム画面追加案内の表示（携帯端末で、まだ追加していない場合のみ）
  useEffect(() => {
    if (!user?.id) return;
    
    // 既にホーム画面に追加済みの場合は表示しない
    if (isStandaloneMode()) return;
    
    // デスクトップの場合は表示しない
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (!isMobile) return;
    
    // セッションごとに1回だけ表示（sessionStorageを使用）
    const sessionKey = 'riko_install_prompt_shown_session';
    const installPromptShownThisSession = sessionStorage.getItem(sessionKey);
    
    // このセッションで既に表示した場合は表示しない
    if (installPromptShownThisSession) return;
    
    // 新規登録かどうかを確認（ユーザー登録日時が最近（24時間以内）の場合）
    const userCreatedAt = user.created_at || user.registered_at;
    const isNewUser = userCreatedAt && (Date.now() - new Date(userCreatedAt).getTime()) < 24 * 60 * 60 * 1000;
    
    // ログイン後、少し待ってから案内を表示（ログイン後の最初の1回のみ）
    const timer = setTimeout(() => {
      setShowInstallPrompt(true);
      sessionStorage.setItem(sessionKey, 'true'); // セッションストレージに保存
    }, isNewUser ? 3000 : 2000); // 新規登録の場合は少し長めに待つ
    
    return () => clearTimeout(timer);
  }, [user]);

  const addLog = async (newLog) => {
    if (!user?.id) return;
    
    try {
      // Supabaseに保存
      const logId = await createLog(user.id, {
        date: newLog.date,
        time: newLog.time,
        category: newLog.category,
        location: newLog.location,
        content: newLog.content,
        attachments: newLog.attachments || [],
        medical: newLog.medical || null,
        comments: [],
      });

      // ローカル状態を更新
      const updatedLogs = [{ ...newLog, id: logId }, ...logs];
      setLogs(updatedLogs);
      setView("timeline");
    } catch (err) {
      logger.error("ログの保存エラー:", err);
      alert("ログの保存に失敗しました。もう一度お試しください。");
    }
  };

  const updateLog = async (updatedLog) => {
    if (selectedLogIndex === null || !updatedLog.id) return;
    
    try {
      // Supabaseを更新
      await updateLogInDB(updatedLog.id, {
        date: updatedLog.date,
        time: updatedLog.time,
        category: updatedLog.category,
        location: updatedLog.location,
        content: updatedLog.content,
        attachments: updatedLog.attachments || [],
        medical: updatedLog.medical || null,
        comments: updatedLog.comments || [],
      });

      // ローカル状態を更新
      const updatedLogs = [...logs];
      updatedLogs[selectedLogIndex] = updatedLog;
      setLogs(updatedLogs);
      setSelectedLog(updatedLog);
    } catch (err) {
      logger.error("ログの更新エラー:", err);
      alert("ログの更新に失敗しました。もう一度お試しください。");
    }
  };

  const handleLogClick = (log, index) => {
    setSelectedLog(log);
    setSelectedLogIndex(index);
  };

  const handleCloseLogDetail = () => {
    setSelectedLog(null);
    setSelectedLogIndex(null);
  };

  if (isLoading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50">
        <div className="text-center">
          <ShieldAlert size={48} className="text-pink-500 mx-auto mb-4 animate-pulse" />
          <p className="text-sm text-gray-600">データを読み込み中...</p>
        </div>
      </div>
    );
  }

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
              window.location.reload();
            }}
            className="bg-pink-600 text-white font-bold py-2 px-4 rounded shadow-lg hover:bg-pink-700 transition"
          >
            再読み込み
          </button>
        </div>
      </div>
    );
  }

    return (
      <div className="w-full bg-slate-50 font-sans text-slate-900 lg:max-w-6xl lg:mx-auto lg:shadow-xl lg:px-4" style={{ paddingLeft: 'env(safe-area-inset-left)', paddingRight: 'env(safe-area-inset-right)' }}>
      <header className="fixed top-0 left-0 right-0 bg-slate-900 text-white px-3 py-2.5 flex justify-between items-center shadow-md z-50" style={{ paddingTop: 'calc(0.625rem + env(safe-area-inset-top))', paddingBottom: '0.625rem', paddingLeft: 'max(0.75rem, env(safe-area-inset-left))', paddingRight: 'max(0.75rem, env(safe-area-inset-right))' }}>
        <div className="flex items-center gap-2">
          <button onClick={() => setView('dashboard')} className="font-rikolog text-base sm:text-lg flex items-center gap-1.5 hover:opacity-80 transition-opacity">
            <ShieldAlert size={18} className="text-pink-500 sm:w-5 sm:h-5" />
            <span>リコログ</span>
          </button>
        </div>
        <div className="flex items-center gap-2 relative">
          {/* メニューボタン */}
          <div className="relative">
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)} 
              className="p-2 rounded-lg hover:bg-slate-800 transition-colors text-white"
              title="メニュー"
            >
              <MoreVertical size={18} />
            </button>
            {/* ドロップダウンメニュー */}
            {isMenuOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setIsMenuOpen(false)}
                />
                <div className="absolute right-0 top-full mt-2 bg-slate-800 rounded-lg shadow-xl border border-slate-700 min-w-[160px] z-50 overflow-hidden">
                  <button
                    onClick={() => {
                      setView('safety');
                      setIsMenuOpen(false);
                    }}
                    className="w-full px-4 py-2.5 text-left hover:bg-slate-700 transition-colors flex items-center gap-2 text-blue-200 text-sm"
                  >
                    <LifeBuoy size={16} />
                    <span>ヘルプ</span>
                  </button>
                  <button
                    onClick={() => {
                      onLogout();
                      setIsMenuOpen(false);
                    }}
                    className="w-full px-4 py-2.5 text-left hover:bg-slate-700 transition-colors flex items-center gap-2 text-white text-sm"
                  >
                    <LogOut size={16} />
                    <span>ログアウト</span>
                  </button>
                </div>
              </>
            )}
          </div>
          {/* 緊急ロックボタン（文字入り） */}
          <button 
            onClick={onLock} 
            className="px-3 py-1.5 rounded-lg hover:bg-red-700 transition-colors text-red-300 flex items-center gap-1.5 text-sm font-medium"
          >
            <Lock size={16} />
            <span>緊急ロック</span>
          </button>
        </div>
      </header>

      <div className="min-h-screen" style={{ paddingTop: 'calc(3.5rem + env(safe-area-inset-top))', paddingBottom: '8rem' }}>
        {view === "dashboard" && <DashboardView logs={logs} userProfile={user} onShowDiagnosis={() => setView("diagnosis")} onShowLifeSupport={() => setView("lifeSupport")} onShowPremium={() => setView("premium")} isPremium={mainIsPremium} />}
        {view === "timeline" && <TimelineView logs={logs} onLogClick={handleLogClick} userProfile={user} onShowPremium={() => setView("premium")} isPremium={mainIsPremium} />}
        {view === "add" && <AddLogView onSave={addLog} onCancel={() => setView("dashboard")} onShowPremium={() => setView("premium")} isPremium={mainIsPremium} />}
        {view === "messages" && <MessagesView user={user} />}
        {view === "board" && <BoardView />}
        {view === "safety" && <SafetyView user={user} onUserUpdate={onUserUpdate} />}
        {view === "export" && <ExportView logs={logs} userProfile={user} onShowPremium={() => setView("premium")} isPremium={mainIsPremium} />}
        {view === "diagnosis" && <CompensationDiagnosisView logs={logs} onClose={() => setView("dashboard")} onShowPremium={() => setView("premium")} />}
        {view === "lifeSupport" && <LifeSupportView onClose={() => setView("dashboard")} />}
        {view === "premium" && <PremiumPlanView user={user} onClose={() => setView("dashboard")} />}
      </div>

      {selectedLog && (
        <LogDetailView
          log={selectedLog}
          onClose={handleCloseLogDetail}
          onUpdate={updateLog}
        />
      )}

      <nav className="fixed bottom-0 left-0 right-0 w-full bg-white border-t border-gray-200 flex justify-around py-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-50" style={{ 
        paddingBottom: 'env(safe-area-inset-bottom)', 
        paddingLeft: 'env(safe-area-inset-left)', 
        paddingRight: 'env(safe-area-inset-right)'
      }}>
        <NavBtn icon={Database} label="ホーム" active={view === "dashboard"} onClick={() => setView("dashboard")} />
        <NavBtn icon={FileText} label="ログ" active={view === "timeline"} onClick={() => setView("timeline")} />
        <NavBtn icon={Plus} label="記録" active={view === "add"} onClick={() => setView("add")} isMain />
        <NavBtn icon={Mail} label="受信箱" active={view === "messages"} onClick={() => setView("messages")} />
        <NavBtn icon={MessageSquare} label="掲示板" active={view === "board"} onClick={() => setView("board")} />
      </nav>

      {/* ホーム画面追加案内（携帯端末のみ） */}
      {showInstallPrompt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Home size={24} className="text-pink-600" />
                ホーム画面に追加
              </h2>
              <button
                onClick={() => setShowInstallPrompt(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>
            
            <p className="text-sm text-gray-600 mb-6">
              リコログをホーム画面に追加すると、電卓アイコンからすぐにアクセスできます。
              <br />
              より便利にご利用いただけます。
            </p>

            <div className="space-y-3">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm font-bold text-blue-900 mb-2">📱 iPhoneの場合：</p>
                <ol className="text-xs text-blue-800 space-y-1 list-decimal list-inside">
                  <li>画面下部の「共有」ボタン（□↑アイコン）をタップ</li>
                  <li>「ホーム画面に追加」を選択</li>
                  <li>「追加」をタップ</li>
                </ol>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm font-bold text-green-900 mb-2">🤖 Androidの場合：</p>
                <ol className="text-xs text-green-800 space-y-1 list-decimal list-inside">
                  <li>メニュー（⋮）をタップ</li>
                  <li>「ホーム画面に追加」を選択</li>
                  <li>「追加」をタップ</li>
                </ol>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={() => setShowInstallPrompt(false)}
                className="flex-1 bg-pink-600 hover:bg-pink-700 text-white font-bold py-3 px-4 rounded-lg transition"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- App Root ---
export default function RikoLogApp() {
  const navigate = useNavigate();
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false); // デフォルトでfalseにして、最初から電卓画面を表示

  // /appページではmanifestを確実に設定（ホーム画面追加時に/appから起動するように）
  useEffect(() => {
    // 既存のmanifestリンクを確認
    let manifestLink = document.getElementById('app-manifest');
    
    // manifestリンクが存在しない場合は作成
    if (!manifestLink) {
      manifestLink = document.createElement('link');
      manifestLink.id = 'app-manifest';
      manifestLink.rel = 'manifest';
      document.head.appendChild(manifestLink);
    }
    
    // calculator.webmanifestを確実に設定
    const v = Date.now();
    manifestLink.setAttribute('href', `/manifests/calculator.webmanifest?v=${v}`);
    
    // iOS用のmetaタグも確実に設定
    let appleMeta = document.querySelector('meta[name="apple-mobile-web-app-capable"]');
    if (!appleMeta) {
      appleMeta = document.createElement('meta');
      appleMeta.name = 'apple-mobile-web-app-capable';
      document.head.appendChild(appleMeta);
    }
    appleMeta.content = 'yes';
    
    // apple-mobile-web-app-titleも設定
    let appleTitle = document.getElementById('app-apple-title');
    if (!appleTitle) {
      appleTitle = document.createElement('meta');
      appleTitle.id = 'app-apple-title';
      appleTitle.name = 'apple-mobile-web-app-title';
      document.head.appendChild(appleTitle);
    }
    appleTitle.setAttribute('content', '電卓');
  }, []);

  // 認証状態の監視
  useEffect(() => {
    let timeoutId;
    let isMounted = true;

    // セッションを確認
    const checkSession = async () => {
      try {
        logger.log("セッション確認を開始...");
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        logger.log("Supabase URL:", supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : '未設定');
        logger.log("Supabase Key:", import.meta.env.VITE_SUPABASE_ANON_KEY ? '設定済み' : '未設定');
        
        // まず直接fetchでSupabaseへの接続をテスト（5秒タイムアウト）
        if (supabaseUrl) {
          try {
            logger.log("Supabaseへの直接接続をテスト...");
            const controller = new AbortController();
            const fetchTimeout = setTimeout(() => controller.abort(), 5000);
            const testResponse = await fetch(`${supabaseUrl}/rest/v1/`, {
              method: 'GET',
              headers: {
                'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || '',
              },
              signal: controller.signal
            });
            clearTimeout(fetchTimeout);
            logger.log("接続テスト結果:", testResponse.status, testResponse.ok ? 'OK' : 'エラー');
          } catch (fetchError) {
            logger.error("接続テスト失敗:", fetchError.name, fetchError.message);
            if (fetchError.name === 'AbortError') {
              logger.error("→ 接続テストもタイムアウトしました。ネットワークまたはSupabaseへの接続に問題があります。");
            }
          }
        }
        
        // タイムアウトを設定（15秒に延長）
        const timeoutPromise = new Promise((_, reject) => {
          timeoutId = setTimeout(() => {
            reject(new Error('セッション確認がタイムアウトしました。Supabaseへの接続を確認してください。'));
          }, 15000);
        });

        // セッション取得を実行
        logger.log("getSession()を実行...");
        
        // まずlocalStorageから直接セッション情報を確認（タイムアウトを避けるため）
        let sessionFromStorage = null;
        try {
          const storageKey = 'sb-sqdfjudhaffivdaxulsn-auth-token';
          const stored = localStorage.getItem(storageKey);
          if (stored) {
            try {
              const parsed = JSON.parse(stored);
              if (parsed && parsed.access_token && parsed.expires_at) {
                const expiresAt = parsed.expires_at * 1000; // expires_atは秒単位
                if (Date.now() < expiresAt) {
                  logger.log("localStorageから有効なセッションを発見");
                  sessionFromStorage = parsed;
                } else {
                  logger.log("localStorageのセッションは期限切れ");
                }
              }
            } catch (e) {
              logger.log("localStorageのセッション情報のパースに失敗:", e);
            }
          }
        } catch (e) {
          logger.log("localStorageへのアクセスエラー:", e);
        }

        // Supabaseクライアントでセッションを取得（タイムアウト付き）
        let result;
        try {
          const sessionPromise = supabase.auth.getSession();
          result = await Promise.race([
            sessionPromise.then(r => {
              clearTimeout(timeoutId);
              return r;
            }),
            timeoutPromise
          ]);
        } catch (raceError) {
          clearTimeout(timeoutId);
          logger.error("Promise.raceエラー:", raceError);
          // タイムアウトした場合でも、localStorageにセッションがあればそれを使う
          if (raceError.message && raceError.message.includes('タイムアウト')) {
            logger.error("タイムアウトが発生しました。localStorageのセッションを使用します。");
            if (sessionFromStorage) {
              result = { 
                data: { session: { 
                  access_token: sessionFromStorage.access_token,
                  refresh_token: sessionFromStorage.refresh_token,
                  expires_at: sessionFromStorage.expires_at,
                  expires_in: sessionFromStorage.expires_in,
                  token_type: sessionFromStorage.token_type,
                  user: sessionFromStorage.user
                }}, 
                error: null 
              };
            } else {
              result = { data: { session: null }, error: null };
            }
          } else {
            throw raceError;
          }
        }

        if (!isMounted) return;

        const { data: { session }, error: sessionError } = result || { data: { session: null }, error: null };

        if (sessionError) {
          logger.error("セッション取得エラー:", sessionError);
          logger.error("エラー詳細:", {
            message: sessionError.message,
            status: sessionError.status,
            code: sessionError.code,
          });
          setIsLoading(false);
          return;
        }
        if (session?.user) {
          logger.log("セッションが見つかりました。ユーザープロフィールを取得中...");
          try {
            const userProfile = await getCurrentUser();
            if (!isMounted) return;
            if (userProfile) {
              setCurrentUser({ ...userProfile, id: session.user.id });
              logger.log("ユーザープロフィールを設定しました");
            } else {
              logger.log("ユーザープロフィールが見つかりませんでした");
            }
          } catch (profileError) {
            logger.error("ユーザープロフィール取得エラー:", profileError);
          }
        } else {
          logger.log("セッションが見つかりませんでした");
        }
      } catch (err) {
        clearTimeout(timeoutId);
        if (!isMounted) return;
        logger.error("セッション確認エラー:", err);
        logger.error("エラー詳細:", {
          message: err.message,
          name: err.name,
          stack: err.stack,
        });
        
        // ネットワークエラーの場合の詳細情報
        if (err.message && (err.message.includes('fetch') || err.message.includes('network') || err.message.includes('タイムアウト'))) {
          logger.error("ネットワークエラーの可能性があります。以下を確認してください:");
          logger.error("1. インターネット接続が正常か");
          logger.error("2. Supabaseプロジェクトがアクティブか");
          logger.error("3. ブラウザのコンソールでCORSエラーが出ていないか");
        }
        // エラーが発生しても電卓画面を表示し続けるため、エラーを設定しない
        // setError(err.message); // コメントアウト：エラーを表示しない
      } finally {
        if (isMounted) {
          logger.log("セッション確認完了。ローディングを終了します");
          setIsLoading(false);
        }
      }
    };

    checkSession();

    // 認証状態の変更を監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;
      if (event === 'SIGNED_IN' && session?.user) {
        const userProfile = await getCurrentUser();
        if (userProfile && isMounted) {
          setCurrentUser({ ...userProfile, id: session.user.id });
        }
      } else if (event === 'SIGNED_OUT' && isMounted) {
        setCurrentUser(null);
      }
    });

    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
      if (subscription) subscription.unsubscribe();
    };
  }, []);

  const handleLogin = async (user) => {
    try {
      logger.log("handleLogin呼び出し:", user ? "ユーザー情報あり" : "ユーザー情報なし");
      if (!user) {
        logger.error("ユーザー情報が正しく渡されていません");
        return;
      }
      logger.log("setCurrentUserを呼び出します...", user.id);
      // 状態を確実に更新するため、関数形式で更新
      setCurrentUser(prev => {
        logger.log("setCurrentUserコールバック実行:", user.id);
        return user;
      });
      setError(null);
      logger.log("setCurrentUser呼び出し完了");
      
      // プレミアム状態をデータベースから取得して更新
      try {
        const isPremiumUser = await checkPremiumStatusAsync(user.id);
        // メインコンポーネントのisPremium状態を更新（後で実装）
        // ここではlocalStorageも更新
        if (isPremiumUser) {
          const subscription = await getPremiumSubscription(user.id);
          if (subscription) {
            const premiumData = {
              subscribedAt: subscription.start_date,
              expiresAt: subscription.end_date,
              planPrice: 450,
              status: 'active'
            };
            localStorage.setItem('riko_premium', JSON.stringify(premiumData));
          }
        } else {
          localStorage.removeItem('riko_premium');
        }
      } catch (premiumError) {
        logger.warn('プレミアム状態の取得エラー:', premiumError);
      }
      
      // 状態更新を確実にするため、少し待ってから確認
      setTimeout(() => {
        logger.log("handleLogin完了後の確認");
      }, 100);
    } catch (error) {
      logger.error("ログイン処理でエラーが発生しました:", error);
      setError("ログイン処理中にエラーが発生しました");
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setCurrentUser(null);
    } catch (error) {
      logger.error("ログアウトエラー:", error);
    }
  };

  // プレミアム状態の管理
  const [isPremium, setIsPremium] = useState(false);
  
  // currentUserが変更された時にプレミアム状態を更新
  useEffect(() => {
    const updatePremiumStatus = async () => {
      if (!currentUser?.id) {
        setIsPremium(false);
        return;
      }
      
      try {
        const premiumStatus = await checkPremiumStatusAsync(currentUser.id);
        setIsPremium(premiumStatus);
        
        // localStorageも更新
        if (premiumStatus) {
          const subscription = await getPremiumSubscription(currentUser.id);
          if (subscription) {
            const premiumData = {
              subscribedAt: subscription.start_date,
              expiresAt: subscription.end_date,
              planPrice: 450,
              status: 'active'
            };
            localStorage.setItem('riko_premium', JSON.stringify(premiumData));
          }
        } else {
          localStorage.removeItem('riko_premium');
        }
      } catch (error) {
        logger.warn('プレミアム状態の取得エラー:', error);
        setIsPremium(false);
      }
    };
    
    updatePremiumStatus();
  }, [currentUser?.id]);

  // デフォルトで電卓画面を表示（セッション確認はバックグラウンドで実行）
  // ローディング中でも電卓画面を表示（セッション確認が完了するまで）
  try {
    // ローディング中は電卓画面を表示（セッション確認中でも電卓画面を表示）
    if (!isUnlocked) {
      return <CalculatorMode onUnlock={() => setIsUnlocked(true)} user={currentUser} />;
    }

    // エラー表示（ロック解除後、エラーがある場合のみ）
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
              }}
              className="bg-pink-600 text-white font-bold py-2 px-4 rounded shadow-lg hover:bg-pink-700 transition"
            >
              リセット
            </button>
          </div>
        </div>
      );
    }

    // ローディング中（セッション確認中）でも、ロック解除済みの場合はログイン画面またはメインアプリを表示
    if (isLoading) {
      // セッション確認中は、既にログイン済みの場合はメインアプリを表示、未ログインの場合はログイン画面を表示
      if (currentUser) {
        return <MainApp 
          onLock={() => setIsUnlocked(false)} 
          user={currentUser} 
          onLogout={handleLogout} 
          isPremium={isPremium}
          onUserUpdate={(updatedUser) => setCurrentUser(updatedUser)}
        />;
      }
      return <AuthScreen onLogin={handleLogin} />;
    }

    if (!currentUser) {
      return <AuthScreen onLogin={handleLogin} />;
    }

    return <MainApp 
      onLock={() => setIsUnlocked(false)} 
      user={currentUser} 
      onLogout={handleLogout} 
      isPremium={isPremium}
      onUserUpdate={(updatedUser) => setCurrentUser(updatedUser)}
    />;
  } catch (error) {
    logger.error("アプリのレンダリングエラー:", error);
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