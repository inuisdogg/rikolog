import React, { useEffect, useState } from 'react';
import { ShieldAlert, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../../supabase.config.js';
import { getUser, createUser } from '../../db/users.js';

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
    passwordConfirm: "", // パスワード確認用
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
      console.log('WebAuthnチェック: windowまたはnavigatorが未定義');
      return false;
    }

    // PublicKeyCredentialの存在チェック
    if (!('PublicKeyCredential' in window)) {
      console.log('WebAuthnチェック: PublicKeyCredentialが存在しません');
      return false;
    }

    // navigator.credentialsの存在チェック
    if (!('credentials' in navigator)) {
      console.log('WebAuthnチェック: navigator.credentialsが存在しません');
      return false;
    }

    // create/getメソッドの存在チェック
    if (!('create' in navigator.credentials) || !('get' in navigator.credentials)) {
      console.log('WebAuthnチェック: credentials.createまたはgetが存在しません');
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
        console.log('WebAuthnチェック: iOSではHTTPS環境が必要です', {
          protocol: window.location.protocol,
          hostname: window.location.hostname
        });
        return false;
      }
    }

    console.log('WebAuthnチェック: 利用可能です', {
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
      console.error("WebAuthn登録エラー:", error);
      throw error;
    }
  };

  const handleSubmit = async () => {
    // バリデーション
    const trimmedEmail = formData.email ? formData.email.trim() : '';
    const trimmedPassword = formData.password ? formData.password.trim() : '';
    const trimmedPasswordConfirm = formData.passwordConfirm ? formData.passwordConfirm.trim() : '';

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

    // 新規登録時はパスワード確認をチェック
    if (isRegister) {
      if (!trimmedPasswordConfirm) {
        setError("パスワード（確認）を入力してください");
        return;
      }
      if (trimmedPassword !== trimmedPasswordConfirm) {
        setError("パスワードが一致しません");
        return;
      }
    }

    // ローディング開始
    setIsLoading(true);
    setError(null);

    try {
      if (isRegister) {

        // 新規登録: Supabase標準機能を使用（自動ログイン）
        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email: trimmedEmail,
          password: trimmedPassword,
          options: {
            emailRedirectTo: `${window.location.origin}/app`
          }
        });

        if (signUpError) {
          console.error('ユーザー登録エラー:', signUpError);
          
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
          console.log('セッションがないため、ログインを試みます...');
          const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
            email: trimmedEmail,
            password: trimmedPassword,
          });
          
          if (loginError) {
            console.error('自動ログインエラー:', loginError);
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
          console.error('usersテーブルへの保存エラー:', createError);
          console.error('エラー詳細:', {
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
            console.warn('premium_subscriptionsテーブルへの保存エラー:', premiumError);
            // エラーでも続行
          }
        } catch (premiumError) {
          console.warn('premium_subscriptionsテーブルへの保存エラー:', premiumError);
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
          console.warn('登録完了メール送信エラー:', emailError);
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
            console.warn('remember_me保存エラー:', err);
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
            console.error('ユーザー情報作成エラー:', createError);
            console.error('エラー詳細:', {
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
              console.warn('WebAuthn登録エラー:', err);
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
          console.error('ログインエラー:', authError);
          
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
            console.warn('remember_me保存エラー:', err);
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
            console.warn('ユーザー情報作成エラー:', createError);
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
              console.warn('WebAuthn登録エラー（無視）:', err);
            });
          }
        }

        // ログイン成功
        onLogin({ ...userProfile, id: authData.user.id });
        return;
      }
    } catch (error) {
      console.error('認証エラー:', error);

      // エラーメッセージの処理
      let errorMessage = error.message || '認証処理中にエラーが発生しました。';

      // Failed to fetch エラー（ネットワークエラー）の処理
      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('fetch')) {
        errorMessage = 'サーバーに接続できませんでした。\n\n以下をご確認ください：\n・インターネット接続\n・Supabaseの設定（URLとAPIキー）';
      }
      // 他のよくあるエラーの日本語化
      else if (errorMessage.includes('Invalid login credentials')) {
        errorMessage = 'メールアドレスまたはパスワードが正しくありません。';
      }
      else if (errorMessage.includes('Email not confirmed')) {
        errorMessage = 'メールアドレスが確認されていません。確認メールをご確認ください。';
      }
      else if (errorMessage.includes('User already registered')) {
        errorMessage = 'このメールアドレスは既に登録されています。ログインしてください。';
      }

      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // X (Twitter) ログイン
  const handleTwitterLogin = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: authError } = await supabase.auth.signInWithOAuth({
        provider: 'twitter',
        options: {
          redirectTo: `${window.location.origin}/app`,
        }
      });

      if (authError) {
        console.error('Twitterログインエラー:', authError);
        throw new Error('Xログインに失敗しました。もう一度お試しください。');
      }

      // OAuthはリダイレクトするので、ここには到達しない
    } catch (error) {
      console.error('Twitterログインエラー:', error);
      setError(error.message || 'Xログインに失敗しました。');
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
      console.error("WebAuthn認証エラー:", error);
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
        console.error("パスワードリセットエラー:", resetError);
        throw resetError;
      }

      setResetEmailSent(true);
    } catch (error) {
      console.error("パスワードリセットエラー:", error);
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
        console.error("パスワード更新エラー:", updateError);
        throw updateError;
      }

      // パスワード更新成功後、ログイン画面に戻る
      setShowResetPassword(false);
      setFormData({ ...formData, newPassword: "", confirmPassword: "" });
      setError(null);
      alert("パスワードが正常に更新されました。新しいパスワードでログインしてください。");
    } catch (error) {
      console.error("パスワード更新エラー:", error);
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

          <div>
            <label className="block text-[10px] sm:text-xs font-bold text-gray-500 mb-1">
              メールアドレス <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              placeholder="example@email.com"
              className="w-full bg-gray-50 border border-gray-200 p-2 sm:p-3 rounded text-xs sm:text-sm"
              value={formData.email}
              onChange={e => setFormData({...formData, email: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-[10px] sm:text-xs font-bold text-gray-500 mb-1">
              パスワード <span className="text-red-500">*</span>
              <span className="font-normal text-gray-400 ml-1">（6文字以上）</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="6文字以上で入力"
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
          </div>

          {/* パスワード確認（新規登録時のみ） */}
          {isRegister && (
            <div>
              <label className="block text-[10px] sm:text-xs font-bold text-gray-500 mb-1">
                パスワード（確認） <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="もう一度入力"
                  className={`w-full bg-gray-50 border p-2 sm:p-3 pr-10 rounded text-xs sm:text-sm ${
                    formData.passwordConfirm && formData.password !== formData.passwordConfirm
                      ? 'border-red-300 bg-red-50'
                      : 'border-gray-200'
                  }`}
                  value={formData.passwordConfirm}
                  onChange={e => setFormData({...formData, passwordConfirm: e.target.value})}
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
              {formData.passwordConfirm && formData.password !== formData.passwordConfirm && (
                <p className="text-red-500 text-[10px] mt-1">パスワードが一致しません</p>
              )}
            </div>
          )}

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

          {/* X (Twitter) ログイン/登録ボタン */}
          <div className="flex items-center my-3">
            <div className="flex-1 border-t border-gray-200"></div>
            <span className="px-3 text-xs text-gray-400">または</span>
            <div className="flex-1 border-t border-gray-200"></div>
          </div>
          <button
            onClick={handleTwitterLogin}
            disabled={isLoading}
            className="w-full bg-black text-white font-bold py-2 sm:py-3 rounded shadow-lg hover:bg-gray-800 transition text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
            {isLoading ? "処理中..." : (isRegister ? "Xで登録" : "Xでログイン")}
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

export default AuthScreen;
