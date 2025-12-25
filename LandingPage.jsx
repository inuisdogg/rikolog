import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ShieldAlert,
  Lock, 
  Coins, 
  HeartCrack, 
  Clock, 
  CheckCircle, 
  Calculator, 
  Database, 
  Home, 
  Users, 
  Gavel,
  MapPin,
  Camera,
  Mic,
  Video,
  FileText,
  Fingerprint,
  Zap,
  BarChart3,
  Target,
  Phone,
  Crown,
  Eye,
  EyeOff,
  Mail,
  X,
  Send
} from 'lucide-react';
import { supabase } from './supabase.config.js';
import { getDeviceType, getDeviceInfo } from './db/device.js';

export default function LandingPage() {
  const navigate = useNavigate();
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [email, setEmail] = useState('');
  const [purpose, setPurpose] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [tempPassword, setTempPassword] = useState('');

  // LPのページタイトルを「リコログ」に設定
  useEffect(() => {
    document.title = 'リコログ';
    // manifestを/appのものに変更（ホーム画面追加時に/appから起動するように）
    const manifestLink = document.getElementById('app-manifest');
    if (manifestLink) {
      manifestLink.setAttribute('href', '/manifests/calculator.webmanifest');
    }
  }, []);

  // 利用目的の選択肢
  const purposeOptions = [
    { value: 'moral_harassment', label: 'モラハラの記録' },
    { value: 'dv', label: 'DVの記録' },
    { value: 'infidelity', label: '不貞の証拠収集' },
    { value: 'divorce_preparation', label: '離婚準備の証拠収集' },
    { value: 'alimony', label: '生活費未払いの記録' },
    { value: 'child_custody', label: '親権・養育費の記録' },
    { value: 'other', label: 'その他' }
  ];

  const handleStartClick = () => {
    setShowEmailModal(true);
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // メールアドレスのバリデーション
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('有効なメールアドレスを入力してください');
      setIsLoading(false);
      return;
    }

    try {
      // Edge Functionでユーザーを作成し、招待メールを送信
      // 本番URLを明示的に指定（ローカル開発環境でも本番URLを使用）
      const productionAppUrl = 'https://rikolog.net/app';
      // デバイス情報を取得
      const deviceType = getDeviceType();
      const deviceInfo = getDeviceInfo();
      const { data: functionData, error: functionError } = await supabase.functions.invoke('create-user-and-send-invite', {
        body: { 
          email: email,
          purpose: purpose || null,
          appUrl: productionAppUrl,
          deviceType: deviceType,
          deviceInfo: deviceInfo
        }
      });

      if (functionError) {
        console.error('ユーザー作成エラー:', functionError);
        
        // エラーメッセージを詳細に表示
        let errorMessage = '登録に失敗しました。';
        
        // functionErrorからメッセージを取得
        const errorMsg = functionError.message || functionError.error || '';
        
        if (errorMsg) {
          // 既存ユーザーの場合
          if (errorMsg.includes('already registered') || 
              errorMsg.includes('already exists') ||
              errorMsg.includes('既に登録されています') ||
              errorMsg.includes('既存ユーザー')) {
            errorMessage = 'このメールアドレスは既に登録されています。\n\nログイン画面から「パスワードを忘れた場合」をクリックしてパスワードをリセットしてください。';
          } else {
            errorMessage = errorMsg;
          }
        }
        
        setError(errorMessage);
        setIsLoading(false);
        return;
      }

      // レスポンスデータがない場合
      if (!functionData) {
        setError('サーバーからの応答がありません。もう一度お試しください。');
        setIsLoading(false);
        return;
      }

      // 成功レスポンスの処理
      if (functionData?.success === true) {
        // メール送信が失敗した場合
        if (functionData.emailSent === false) {
          let errorMessage = 'メール送信に失敗しました。';
          if (functionData.emailError) {
            errorMessage += ` (${functionData.emailError})`;
          }
          errorMessage += ' もう一度お試しください。';
          setError(errorMessage);
          setIsLoading(false);
          return;
        }
      } else {
        // successがfalseの場合
        const errorMsg = functionData?.message || functionData?.error || 'メール送信に失敗しました。';
        setError(errorMsg);
        setIsLoading(false);
        return;
      }

      // 成功：メール送信完了
      setIsSuccess(true);
      // 自動的に閉じない（ユーザーが手動で閉じる）
    } catch (err) {
      console.error('メールアドレス保存エラー:', err);
      console.error('エラー詳細:', JSON.stringify(err, null, 2));
      
      // エラーメッセージを詳細に表示
      let errorMessage = '登録に失敗しました。';
      
      // Supabaseエラーの場合
      if (err.code) {
        console.error('Supabaseエラーコード:', err.code);
        if (err.code === '42P01') {
          errorMessage = 'データベースのテーブルが存在しません。管理者にお問い合わせください。';
        } else if (err.code === '42501') {
          errorMessage = 'データベースの権限設定に問題があります。管理者にお問い合わせください。';
        } else if (err.code === '23505') {
          errorMessage = 'このメールアドレスは既に登録されています。';
        } else {
          errorMessage += ` (エラーコード: ${err.code})`;
        }
      } else if (err.message) {
        errorMessage += ` (${err.message})`;
      } else if (err.error?.message) {
        errorMessage += ` (${err.error.message})`;
      }
      
      // 404エラーの場合（テーブルが存在しない）
      if (err.message?.includes('404') || err.message?.includes('not found') || err.code === '42P01') {
        errorMessage = 'データベースのテーブルが存在しません。Supabaseでemail_leadsテーブルを作成してください。';
      }
      
      // ネットワークエラーの場合
      if (err.message?.includes('fetch') || err.message?.includes('network') || err.message?.includes('Failed to fetch')) {
        errorMessage = 'ネットワークエラーが発生しました。インターネット接続を確認してください。';
      }
      
      if (!errorMessage.includes('エラーコード') && !errorMessage.includes('テーブル') && !errorMessage.includes('権限')) {
        errorMessage += ' しばらくしてから再度お試しください。';
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseModal = () => {
    if (!isLoading) {
      setShowEmailModal(false);
      setEmail('');
      setPurpose('');
      setError('');
      setIsSuccess(false);
      setShowPassword(false);
      setTempPassword('');
    }
  };

  return (
    <div className="text-slate-800 bg-slate-50 font-sans">
      {/* Header */}
      <header className="fixed w-full bg-white/95 backdrop-blur-md z-50 border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2 font-rikolog text-xl tracking-tighter text-slate-900">
            <ShieldAlert className="text-pink-600" /> リコログ
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => navigate('/app')}
              className="bg-slate-100 text-slate-700 text-xs md:text-sm font-bold px-4 py-2 rounded-xl hover:bg-slate-200 transition shadow"
            >
              サービスを見る
            </button>
            <button 
              onClick={handleStartClick}
              className="bg-slate-900 text-white text-xs md:text-sm font-bold px-4 py-2 rounded-xl hover:bg-slate-700 transition shadow-lg"
            >
              登録する
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-28 pb-16 md:pt-40 md:pb-24 px-4 bg-gradient-to-b from-pink-50 to-white">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-12">
          <div className="md:w-1/2 space-y-6 text-center md:text-left">
            <div className="flex flex-wrap gap-2 justify-center md:justify-start mb-2">
              <div className="inline-block bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1 rounded-full">
                <Database size={12} className="inline mr-1" />
                法的証拠保管サービス
              </div>
              <div className="inline-block bg-pink-100 text-pink-700 text-xs font-bold px-3 py-1 rounded-full">
                バレずに証拠収集・慰謝料診断
              </div>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-6xl font-black leading-tight text-slate-900">
              その「怒り」を、<br className="block sm:hidden" />
              <span className="text-pink-600">慰謝料</span>に変える。
            </h1>
            <p className="text-slate-600 text-sm md:text-base leading-relaxed font-medium px-2 sm:px-0">
              夫のモラハラ、浮気、DV...。泣き寝入りしないでください。<br className="hidden sm:block" />
              離婚を今考えていなくても、<span className="text-pink-600 font-bold">将来の保険として</span>今から記録を始めましょう。<br className="hidden sm:block" />
              裁判で勝つための「法的に有効な記録」を、<br className="hidden sm:block" />
              誰にもバレずにスマホ一つで。<br className="hidden sm:block" />
              <span className="text-pink-600 font-bold">登録後、すぐにご利用いただけます。</span>
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start pt-4">
              <button 
                onClick={handleStartClick}
                className="bg-pink-600 text-white font-bold py-4 px-8 rounded-xl shadow-lg hover:bg-pink-700 transform hover:-translate-y-1 transition flex items-center justify-center gap-2"
              >
                <Mail size={20} /> 今すぐ登録する
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">※登録後、すぐにご利用いただけます</p>
          </div>
          
          <div className="md:w-1/2 relative">
            {/* App Mockup - 実際の電卓画面を再現 */}
            <div className="relative w-64 sm:w-72 mx-auto md:w-80">
              <div className="absolute -inset-1 bg-gradient-to-r from-pink-600 to-purple-600 rounded-[2.5rem] blur opacity-30"></div>
              <div className="relative bg-slate-900 rounded-[2.5rem] border-8 border-slate-900 shadow-2xl overflow-hidden aspect-[9/19]">
                {/* Screen Content - 実際のCalculatorModeの実装に基づく */}
                <div className="h-full bg-black flex flex-col text-white font-sans">
                  {/* ディスプレイ部分 */}
                  <div className="flex-1 flex items-end justify-end p-4 sm:p-6 text-4xl sm:text-5xl font-light font-mono break-all min-h-0 overflow-hidden">
                    0
                  </div>
                  {/* ボタン部分 - 実際のレイアウトに合わせる */}
                  <div className="grid grid-cols-4 gap-3 sm:gap-4 flex-shrink-0 px-4 pb-6 sm:pb-8">
                    {["7", "8", "9", "/", "4", "5", "6", "*", "1", "2", "3", "-", "C", "0", "=", "+"].map((btn, i) => (
                      <div
                        key={i}
                        className={`rounded-full flex items-center justify-center shadow-lg text-xl sm:text-2xl font-medium
                          ${btn === "=" || ["/","*","-","+"].includes(btn) 
                            ? "bg-orange-500 text-white" 
                            : "bg-gray-800 text-white"}
                          ${btn === "0" ? "col-span-2 aspect-[2/1]" : "aspect-square"}
                        `}
                      >
                        {btn}
                      </div>
                    ))}
                  </div>
                  {/* Mock Alert */}
                  <div className="absolute top-1/4 left-2 right-2 sm:left-4 sm:right-4 bg-white/95 backdrop-blur rounded-xl p-3 sm:p-4 shadow-xl border border-pink-100 transform rotate-2">
                    <div className="flex items-start gap-2 sm:gap-3">
                      <div className="bg-pink-100 p-1.5 sm:p-2 rounded-full text-pink-600 shrink-0">
                        <Lock size={16} className="sm:w-5 sm:h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] sm:text-xs font-bold text-gray-500">カモフラージュ機能</p>
                        <p className="text-xs sm:text-sm font-bold text-slate-900">普段は「電卓」として動作。<br />秘密のパスコードで記録へ。</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Features - 主要機能を強調（無料プラン） */}
      <section className="py-16 md:py-20 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <span className="text-pink-600 font-bold tracking-widest text-xs uppercase">Free Plan Features</span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 mt-2 px-2">
              無料で使える<br className="block sm:hidden" />「基本機能」
            </h2>
            <p className="text-gray-600 text-sm sm:text-base mt-4 px-2">
              感情的な日記では勝てません。<br className="hidden sm:block" />
              リコログは「法的に有効な証拠」を記録します。<br className="hidden sm:block" />
              <span className="text-pink-600 font-bold">以下の機能は無料で利用できます。</span>
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {/* Feature 1: 写真添付 */}
            <div className="bg-slate-50 p-6 rounded-xl shadow-lg border border-slate-200 hover:shadow-xl transition">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <Camera className="text-green-600" size={28} />
              </div>
              <h3 className="font-bold text-lg mb-2 text-slate-900">写真の添付</h3>
              <p className="text-sm text-gray-600 leading-relaxed mb-4">
                傷の写真、不貞の証拠...。写真を添付して証拠力を高めます。無料プランでは写真3枚まで添付可能です。
              </p>
              <div className="flex items-center gap-2 text-xs text-green-600 font-bold mb-2">
                <Camera size={12} /> 写真3枚まで無料
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span className="text-xs">※録音・動画は今後リリース予定のプレミアムプランで利用可能になります</span>
              </div>
            </div>

            {/* Feature 2: 慰謝料診断 */}
            <div className="bg-slate-50 p-6 rounded-xl shadow-lg border border-slate-200 hover:shadow-xl transition">
              <div className="w-14 h-14 bg-pink-100 rounded-full flex items-center justify-center mb-4">
                <Calculator className="text-pink-600" size={28} />
              </div>
              <h3 className="font-bold text-lg mb-2 text-slate-900">AI慰謝料診断</h3>
              <p className="text-sm text-gray-600 leading-relaxed mb-4">
                過去の判例データに基づき、あなたの慰謝料相場を自動算出。5つの質問で即座に診断できます。
              </p>
              <div className="flex items-center gap-2 text-xs text-pink-600 font-bold">
                <CheckCircle size={14} /> 無料で診断可能
              </div>
            </div>

            {/* Feature 3: 証拠レベル表示 */}
            <div className="bg-slate-50 p-6 rounded-xl shadow-lg border border-slate-200 hover:shadow-xl transition">
              <div className="w-14 h-14 bg-orange-100 rounded-full flex items-center justify-center mb-4">
                <BarChart3 className="text-orange-600" size={28} />
              </div>
              <h3 className="font-bold text-lg mb-2 text-slate-900">証拠レベル可視化</h3>
              <p className="text-sm text-gray-600 leading-relaxed mb-4">
                記録の充実度を「証拠レベル（％）」で表示。統計データで、あなたの準備状況が一目で分かります。
              </p>
              <div className="flex items-center gap-2 text-xs text-orange-600 font-bold">
                <CheckCircle size={14} /> 進捗を可視化
              </div>
            </div>

            {/* Feature 4: 生体認証 */}
            <div className="bg-slate-50 p-6 rounded-xl shadow-lg border border-slate-200 hover:shadow-xl transition">
              <div className="w-14 h-14 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
                <Fingerprint className="text-indigo-600" size={28} />
              </div>
              <h3 className="font-bold text-lg mb-2 text-slate-900">生体認証ログイン</h3>
              <p className="text-sm text-gray-600 leading-relaxed mb-4">
                Face ID・Touch ID対応。パスワード入力不要で、素早く安全にアクセスできます。
              </p>
              <div className="flex items-center gap-2 text-xs text-indigo-600 font-bold">
                <CheckCircle size={14} /> Face ID・Touch ID対応
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Camouflage Feature - 最も差別化される点 */}
      <section className="py-16 md:py-20 px-4 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row items-center gap-8 sm:gap-10">
            <div className="md:w-1/2 order-2 md:order-1">
              <div className="bg-slate-900 rounded-2xl p-6 sm:p-8 text-center text-white relative overflow-hidden shadow-xl">
                <div className="absolute top-0 right-0 p-10 opacity-10">
                  <Calculator size={120} />
                </div>
                <div className="relative z-10">
                  <div className="text-5xl sm:text-6xl font-thin font-mono mb-6 sm:mb-8">7777</div>
                  <div className="grid grid-cols-4 gap-3 sm:gap-4 opacity-50 mb-6">
                    <div className="bg-gray-700 h-10 w-10 sm:h-12 sm:w-12 rounded-full mx-auto"></div>
                    <div className="bg-gray-700 h-10 w-10 sm:h-12 sm:w-12 rounded-full mx-auto"></div>
                    <div className="bg-gray-700 h-10 w-10 sm:h-12 sm:w-12 rounded-full mx-auto"></div>
                    <div className="bg-orange-500 h-10 w-10 sm:h-12 sm:w-12 rounded-full mx-auto"></div>
                  </div>
                  <p className="text-xs sm:text-sm font-bold text-pink-400">↑ このパスコードでロック解除</p>
                </div>
              </div>
            </div>
            <div className="md:w-1/2 order-1 md:order-2">
              <div className="inline-block bg-pink-100 text-pink-700 text-xs font-bold px-3 py-1 rounded-full mb-4">Camouflage</div>
              <h2 className="text-2xl sm:text-3xl font-bold mb-4 text-slate-900">徹底的なカモフラージュ。<br className="block sm:hidden" />誰にもバレない。</h2>
              <p className="text-gray-600 text-sm sm:text-base leading-relaxed mb-6">
                アプリアイコンも起動画面も「電卓」です。実際に計算もできます。
                夫にスマホを見られても、ただの電卓アプリにしか見えません。<br className="hidden sm:block" />
                秘密の計算式（パスコード）を入力した時だけ、裏の記録画面が開きます。
              </p>
              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                    <Calculator className="text-slate-600" size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">電卓アイコン</p>
                    <p className="text-xs text-gray-500">無料プランで利用可能</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                    <Zap className="text-red-600" size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">緊急ロックボタン</p>
                    <p className="text-xs text-gray-500">一瞬で電卓画面に戻る（無料）</p>
                  </div>
                </div>
              </div>
              <ul className="space-y-2 text-sm font-bold text-slate-700">
                <li className="flex items-center gap-2"><CheckCircle size={16} className="text-green-500" /> 電卓アイコン（無料）</li>
                <li className="flex items-center gap-2"><CheckCircle size={16} className="text-green-500" /> 緊急ロックボタン搭載（無料）</li>
                <li className="flex items-center gap-2"><CheckCircle size={16} className="text-green-500" /> 実際に計算もできる（無料）</li>
                <li className="flex items-center gap-2"><Crown size={16} className="text-yellow-500" /> 天気・カレンダーなど35種類（今後リリース予定）</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Evidence Recording Flow */}
      <section className="py-16 md:py-20 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <span className="text-pink-600 font-bold tracking-widest text-xs uppercase">Evidence Recording</span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 mt-2 px-2">
              証拠記録の流れ
            </h2>
            <p className="text-gray-600 text-sm sm:text-base mt-4 px-2">
              スマホ一つで、法的に有効な証拠を完璧に記録します。
            </p>
          </div>

          <div className="space-y-6">
            {/* Step 1 */}
            <div className="bg-slate-50 p-6 rounded-xl shadow-lg border border-slate-200">
              <div className="flex flex-col sm:flex-row items-start gap-4">
                <div className="w-12 h-12 bg-pink-600 text-white rounded-full flex items-center justify-center font-bold shrink-0">
                  1
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg mb-2 text-slate-900">カテゴリを選択</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    モラハラ、DV、不貞、生活費未払い、育児放棄など、該当するカテゴリを選択します。
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="bg-white px-3 py-1 rounded-full text-xs font-bold text-slate-700 border border-slate-200">モラハラ</span>
                    <span className="bg-white px-3 py-1 rounded-full text-xs font-bold text-slate-700 border border-slate-200">DV</span>
                    <span className="bg-white px-3 py-1 rounded-full text-xs font-bold text-slate-700 border border-slate-200">不貞</span>
                    <span className="bg-white px-3 py-1 rounded-full text-xs font-bold text-slate-700 border border-slate-200">生活費</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="bg-slate-50 p-6 rounded-xl shadow-lg border border-slate-200">
              <div className="flex flex-col sm:flex-row items-start gap-4">
                <div className="w-12 h-12 bg-pink-600 text-white rounded-full flex items-center justify-center font-bold shrink-0">
                  2
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg mb-2 text-slate-900">位置情報を記録</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    「いつ・どこで」を記録。現在は手動入力のみ対応しています。GPSでの自動取得は今後リリース予定です。
                  </p>
                  <div className="flex items-center gap-2 text-xs text-blue-600 font-bold mb-1">
                    <MapPin size={14} /> 手動入力（無料）
                  </div>
                  <div className="flex items-center gap-2 text-xs text-yellow-600 font-bold">
                    <Crown size={12} /> GPS自動取得（今後リリース予定）
                  </div>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-slate-50 p-6 rounded-xl shadow-lg border border-slate-200">
              <div className="flex flex-col sm:flex-row items-start gap-4">
                <div className="w-12 h-12 bg-pink-600 text-white rounded-full flex items-center justify-center font-bold shrink-0">
                  3
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg mb-2 text-slate-900">詳細を記録・証拠を添付</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    何をされたか、何を言われたかを具体的に記録。現在は写真3枚まで添付可能です。録音・動画の添付は今後リリース予定です。
                  </p>
                  <div className="flex items-center gap-2 text-xs text-green-600 font-bold mb-1">
                    <Camera size={14} /> 写真（無料・3枚まで）
                  </div>
                  <div className="flex items-center gap-2 text-xs text-yellow-600 font-bold">
                    <Crown size={12} /> 録音・動画（今後リリース予定）
                  </div>
                </div>
              </div>
            </div>

            {/* Step 4 */}
            <div className="bg-slate-50 p-6 rounded-xl shadow-lg border border-slate-200">
              <div className="flex flex-col sm:flex-row items-start gap-4">
                <div className="w-12 h-12 bg-pink-600 text-white rounded-full flex items-center justify-center font-bold shrink-0">
                  4
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg mb-2 text-slate-900">クラウドに安全保存</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    記録はクラウドに自動保存されます。スマホを壊されても、データは消えません。
                  </p>
                  <div className="flex items-center gap-2 text-xs text-green-600 font-bold">
                    <CheckCircle size={14} /> クラウド保存・安全（無料）
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AI Diagnosis Teaser */}
      <section className="py-16 md:py-20 px-4 bg-gradient-to-b from-pink-50 to-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 mb-4 sm:mb-6 px-2">
            まずは、あなたの「勝てる金額」を<br className="block sm:hidden" />知りたくありませんか？
          </h2>
          <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg inline-block max-w-lg w-full mb-6 sm:mb-8 border border-slate-200">
            <div className="flex justify-center mb-4">
              <div className="bg-pink-100 p-3 rounded-full">
                <Calculator className="w-10 h-10 sm:w-12 sm:h-12 text-pink-600" />
              </div>
            </div>
            <h3 className="text-lg sm:text-xl font-bold mb-2 text-slate-900">AI慰謝料無料診断</h3>
            <p className="text-sm text-gray-600 mb-4 sm:mb-6">
              5つの質問に答えるだけで、過去の判例データに基づいた<br className="hidden sm:block" />
              あなたの慰謝料相場（レンジ）を算出します。
            </p>
            <div className="bg-slate-50 p-4 rounded-lg mb-4">
              <div className="text-3xl sm:text-4xl font-mono font-bold text-slate-900 mb-2">
                <span className="text-pink-600">??</span>〜<span className="text-pink-600">??</span><span className="text-base sm:text-lg">万円</span>
              </div>
              <p className="text-xs text-gray-500">※記録数や証拠の有無で変動します</p>
            </div>
            <div className="space-y-2 text-left text-xs text-gray-600 mb-4">
              <div className="flex items-center gap-2">
                <CheckCircle size={12} className="text-green-500" /> 過去の判例データベースから算出
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle size={12} className="text-green-500" /> 記録数・証拠の有無を考慮
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle size={12} className="text-green-500" /> 完全無料・即座に診断
              </div>
            </div>
            <button 
              onClick={handleStartClick}
              className="w-full bg-pink-600 text-white font-bold py-3 px-8 rounded-xl hover:bg-pink-700 transition shadow-lg"
            >
              今すぐ登録する
            </button>
            <p className="text-xs text-gray-400 mt-3">※登録後、すぐにご利用いただけます</p>
          </div>
        </div>
      </section>

      {/* Premium Features */}
      <section className="py-16 md:py-20 px-4 bg-slate-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <div className="inline-flex items-center gap-2 bg-yellow-100 text-yellow-700 text-xs font-bold px-3 py-1 rounded-full mb-4">
              <Crown size={14} /> Coming Soon
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 mt-2 px-2">
              プレミアムプラン<br className="block sm:hidden" />（今後リリース予定）
            </h2>
            <p className="text-gray-600 text-sm sm:text-base mt-4 px-2">
              より多くのカモフラージュアイコンと、<br className="hidden sm:block" />
              追加機能で証拠収集を完璧に。<br className="hidden sm:block" />
              <span className="text-pink-600 font-bold">プレミアムプランは今後リリース予定です。</span>
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-6 sm:gap-8">
            <div className="bg-white p-6 rounded-xl shadow-lg border-2 border-yellow-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                  <Calculator className="text-yellow-600" size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-900">35種類のアイコン</h3>
                  <p className="text-xs text-gray-500">電卓以外も選択可能（予定）</p>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                天気、カレンダー、時計、メモ、写真など、35種類以上のアイコンから選択できるようになる予定です。より自然なカモフラージュが可能になります。
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="bg-slate-100 px-2 py-1 rounded text-xs font-bold text-slate-700">天気</span>
                <span className="bg-slate-100 px-2 py-1 rounded text-xs font-bold text-slate-700">カレンダー</span>
                <span className="bg-slate-100 px-2 py-1 rounded text-xs font-bold text-slate-700">時計</span>
                <span className="bg-slate-100 px-2 py-1 rounded text-xs font-bold text-slate-700">メモ</span>
                <span className="bg-slate-100 px-2 py-1 rounded text-xs font-bold text-slate-700">+30種類</span>
              </div>
              <div className="mt-3 pt-3 border-t border-yellow-200">
                <p className="text-xs text-gray-500">※現在は電卓アイコンのみ利用可能です</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-lg border-2 border-yellow-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                  <Target className="text-yellow-600" size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-900">プレミアム限定機能（予定）</h3>
                  <p className="text-xs text-gray-500">証拠収集を完璧に</p>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                プレミアムプランでは、以下の機能が利用できるようになる予定です。
              </p>
              <ul className="space-y-2 text-sm text-slate-700 mb-4">
                <li className="flex items-center gap-2">
                  <CheckCircle size={14} className="text-yellow-600" /> GPS位置情報の自動取得（予定）
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle size={14} className="text-yellow-600" /> 録音・動画の添付（予定）
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle size={14} className="text-yellow-600" /> 陳述書PDF出力（予定）
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle size={14} className="text-yellow-600" /> 35種類のカモフラージュアイコン（予定）
                </li>
              </ul>
              <div className="mt-4 pt-4 border-t border-yellow-200">
                <p className="text-xs text-gray-500">
                  ※離婚準備チェックリストやガイドは無料ユーザーでも利用可能です
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Safety Features */}
      <section className="py-16 md:py-20 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <span className="text-pink-600 font-bold tracking-widest text-xs uppercase">Safety</span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 mt-2 px-2">
              あなたを守る「安全基地」
            </h2>
            <p className="text-gray-600 text-sm sm:text-base mt-4 px-2">
              緊急時にも、すぐに助けを求められます。
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-6">
            <div className="bg-red-50 p-6 rounded-xl shadow-lg border border-red-200 text-center">
              <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Phone className="text-red-600" size={28} />
              </div>
              <h3 className="font-bold text-lg mb-2 text-slate-900">緊急連絡先</h3>
              <p className="text-sm text-gray-600 mb-4">
                110番、#8008（DV相談）、#9110へのワンタップ発信機能
              </p>
            </div>

            <div className="bg-blue-50 p-6 rounded-xl shadow-lg border border-blue-200 text-center">
              <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShieldAlert className="text-blue-600" size={28} />
              </div>
              <h3 className="font-bold text-lg mb-2 text-slate-900">相談機関リンク</h3>
              <p className="text-sm text-gray-600 mb-4">
                法テラス、内閣府DV相談など、すぐにアクセスできるリンク集
              </p>
            </div>

            <div className="bg-green-50 p-6 rounded-xl shadow-lg border border-green-200 text-center">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Home className="text-green-600" size={28} />
              </div>
              <h3 className="font-bold text-lg mb-2 text-slate-900">避難のヒント</h3>
              <p className="text-sm text-gray-600 mb-4">
                逃げる時の持ち物リストなど、実用的な情報を提供
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-20 px-4 bg-slate-900 text-white text-center">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black mb-4 sm:mb-6 px-2">
            記憶は消えるが、<br className="block sm:hidden" />記録は残る。
          </h2>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-8 sm:mb-10 px-2">
            リコログは、あなたが不利な条件で離婚しないための「保険」であり「盾」です。<br className="hidden sm:block" />
            離婚を今考えていなくても、<span className="text-pink-400 font-bold">将来の保険として</span>今から記録を始めましょう。<br className="hidden sm:block" />
            感情的なメールを夫に送る前に、まずはここに書き殴ってください。<br className="hidden sm:block" />
            その記録が、いざという時にあなたと子供の未来を守ります。<br className="hidden sm:block" />
            <span className="text-pink-400 font-bold">登録後、すぐにご利用いただけます。</span>
          </p>
          
          <button 
            onClick={handleStartClick}
            className="inline-flex items-center justify-center gap-3 bg-pink-600 text-white font-bold py-4 sm:py-5 px-8 sm:px-10 rounded-xl shadow-2xl hover:bg-pink-700 transform hover:scale-105 transition w-full sm:w-auto"
          >
            <Mail size={20} />
            <span>今すぐ登録する</span>
          </button>
          <p className="text-xs text-slate-400 mt-4">
            ※登録後、すぐにご利用いただけます
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white py-10 border-t border-gray-200">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <div className="flex justify-center items-center gap-2 font-rikolog text-xl text-slate-900 mb-4">
            <ShieldAlert className="text-pink-600" /> リコログ
          </div>
          <div className="flex flex-wrap justify-center gap-4 sm:gap-6 text-xs text-gray-500 mb-6 sm:mb-8 px-4">
            <Link to="/terms" className="hover:text-slate-900 whitespace-nowrap">利用規約</Link>
            <Link to="/privacy" className="hover:text-slate-900 whitespace-nowrap">プライバシーポリシー</Link>
            <Link to="/commercial" className="hover:text-slate-900 whitespace-nowrap">特定商取引法に基づく表記</Link>
          </div>
          <p className="text-[10px] text-gray-400">
            &copy; 2025 Riko-Log Project. All rights reserved.<br />
            ※本サービスは法的助言を提供するものではありません。具体的な判断は弁護士にご相談ください。
          </p>
        </div>
      </footer>

      {/* Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 sm:p-8 relative">
            <button
              onClick={handleCloseModal}
              disabled={isLoading}
              className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-lg transition disabled:opacity-50"
            >
              <X size={20} className="text-gray-500" />
            </button>

            {!isSuccess ? (
              <>
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Mail className="text-pink-600" size={32} />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">今すぐ登録</h2>
                  <p className="text-sm text-gray-600">
                    メールアドレスを登録してください。<br />
                    登録後、すぐにご利用いただけます。
                  </p>
                </div>

                <form onSubmit={handleEmailSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="email" className="block text-sm font-bold text-slate-700 mb-2">
                      メールアドレス
                    </label>
                    <input
                      type="email"
                      id="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="example@email.com"
                      required
                      disabled={isLoading}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent disabled:opacity-50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-3">
                      利用目的 <span className="text-gray-400 font-normal text-xs">(任意)</span>
                    </label>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {purposeOptions.map((option) => (
                        <label
                          key={option.value}
                          className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 cursor-pointer transition"
                        >
                          <input
                            type="radio"
                            name="purpose"
                            value={option.value}
                            checked={purpose === option.value}
                            onChange={(e) => setPurpose(e.target.value)}
                            disabled={isLoading}
                            className="w-4 h-4 text-pink-600 border-gray-300 focus:ring-pink-500 focus:ring-2 disabled:opacity-50"
                          />
                          <span className="text-sm text-slate-700">{option.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm">
                      {error}
                      {showPassword && tempPassword && (
                        <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <p className="text-xs font-bold mb-1">ログインパスワード:</p>
                          <div className="bg-white p-2 rounded border border-yellow-300 font-mono text-sm break-all">
                            {tempPassword}
                          </div>
                          <p className="text-xs text-yellow-700 mt-2">
                            ⚠️ このパスワードは安全に管理してください。
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading || !email}
                    className="w-full bg-pink-600 text-white font-bold py-3 px-6 rounded-xl hover:bg-pink-700 transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        登録中...
                      </>
                    ) : (
                      <>
                        <Send size={18} />
                        登録する
                      </>
                    )}
                  </button>
                </form>

                <p className="text-xs text-gray-500 mt-4 text-center">
                  登録後、招待メールをお送りします
                </p>
              </>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="text-green-600" size={32} />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">メール送信完了</h2>
                <p className="text-sm text-gray-600 mb-6">
                  サービスページへの招待メールをお送りしました。<br />
                  メールボックスをご確認ください。
                </p>
                <p className="text-xs text-gray-500">
                  メールに記載されているリンクからサービスページにアクセスし、<br />
                  新規登録を行ってください。
                </p>
                <button
                  onClick={handleCloseModal}
                  className="mt-4 w-full bg-pink-600 text-white font-bold py-3 px-6 rounded-xl hover:bg-pink-700 transition shadow-lg"
                >
                  閉じる
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
