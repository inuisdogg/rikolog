import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export default function CommercialTransaction() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="fixed w-full bg-white/95 backdrop-blur-md z-50 border-b border-gray-100 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <ArrowLeft size={20} className="text-slate-700" />
          </button>
          <div className="flex items-center gap-2 font-rikolog text-xl tracking-tighter text-slate-900">
            <ShieldAlert className="text-pink-600" /> リコログ
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="pt-20 pb-16 px-4">
        <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg p-6 sm:p-8">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mb-6">特定商取引法に基づく表記</h1>
          
          <div className="prose prose-sm max-w-none text-slate-700 space-y-6">
            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3">事業者名</h2>
              <p className="text-sm leading-relaxed">
                リコログ運営事務局
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3">代表者名</h2>
              <p className="text-sm leading-relaxed">
                準備中
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3">所在地</h2>
              <p className="text-sm leading-relaxed">
                準備中
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3">連絡先</h2>
              <p className="text-sm leading-relaxed">
                当サービスウェブサイト内のお問い合わせフォームよりご連絡ください。
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3">販売価格</h2>
              <p className="text-sm leading-relaxed mb-2">
                当サービスは、現在無料プランのみを提供しています。
              </p>
              <ul className="list-disc list-inside text-sm leading-relaxed ml-4 mt-2 space-y-1">
                <li>無料プラン：無料</li>
                <li>プレミアムプラン：今後リリース予定</li>
              </ul>
              <p className="text-sm leading-relaxed mt-2">
                プレミアムプランの価格や詳細については、リリース時に当サービスウェブサイトにてご案内いたします。
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3">支払方法</h2>
              <p className="text-sm leading-relaxed">
                プレミアムプランの支払方法については、リリース時にご案内いたします。
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3">支払時期</h2>
              <p className="text-sm leading-relaxed">
                プレミアムプランの支払時期については、リリース時にご案内いたします。
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3">サービス提供時期</h2>
              <p className="text-sm leading-relaxed">
                ご利用登録完了後、即座にサービスをご利用いただけます。
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3">キャンセル・返金について</h2>
              <p className="text-sm leading-relaxed mb-2">
                プレミアムプランのキャンセル・返金に関する詳細については、リリース時にご案内いたします。
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3">動作環境</h2>
              <p className="text-sm leading-relaxed mb-2">
                当サービスは、以下の環境で動作することを想定しています。
              </p>
              <ul className="list-disc list-inside text-sm leading-relaxed ml-4 mt-2 space-y-1">
                <li>対応ブラウザ：Google Chrome（最新版）、Safari（最新版）、Microsoft Edge（最新版）、Firefox（最新版）</li>
                <li>対応OS：iOS、Android、Windows、macOS</li>
                <li>インターネット接続環境が必要です</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3">その他</h2>
              <p className="text-sm leading-relaxed">
                当サービスに関するご不明点やご質問は、当サービスウェブサイト内のお問い合わせフォームよりご連絡ください。
              </p>
            </section>

            <div className="pt-6 border-t border-gray-200 mt-8">
              <p className="text-xs text-gray-500">
                制定日：2025年1月1日<br />
                最終改定日：2025年1月1日
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


