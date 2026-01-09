import React, { useEffect, useState } from 'react';
import { LifeBuoy, Lock, Phone, ExternalLink, ShieldAlert } from 'lucide-react';
import { getCurrentUser, updateUser } from '../../db/users.js';

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
                    console.error('パスコード変更エラー:', error);
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

export default SafetyView;
