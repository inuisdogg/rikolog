import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export default function PrivacyPolicy() {
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
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mb-6">プライバシーポリシー</h1>
          
          <div className="prose prose-sm max-w-none text-slate-700 space-y-6">
            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3">1. はじめに</h2>
              <p className="text-sm leading-relaxed">
                リコログ（以下「当サービス」といいます）は、ユーザーの個人情報の保護について、以下のとおりプライバシーポリシーを定め、個人情報保護法その他の関連法令を遵守し、適切に取り扱うものとします。
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3">2. 収集する個人情報</h2>
              <p className="text-sm leading-relaxed mb-2">
                当サービスは、以下の個人情報を収集する場合があります。
              </p>
              <ul className="list-disc list-inside text-sm leading-relaxed ml-4 mt-2 space-y-1">
                <li>メールアドレス</li>
                <li>パスワード（暗号化して保存）</li>
                <li>記録したログデータ（日時、場所、内容、添付ファイル等）</li>
                <li>端末情報（ブラウザの種類、OS等）</li>
                <li>アクセスログ（IPアドレス、アクセス日時等）</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3">3. 個人情報の利用目的</h2>
              <p className="text-sm leading-relaxed mb-2">
                当サービスは、収集した個人情報を以下の目的で利用します。
              </p>
              <ul className="list-disc list-inside text-sm leading-relaxed ml-4 mt-2 space-y-1">
                <li>当サービスの提供、運営、維持、改善</li>
                <li>ユーザー認証、アカウント管理</li>
                <li>ユーザーからのお問い合わせへの対応</li>
                <li>利用規約違反の調査、防止</li>
                <li>不正利用の防止、セキュリティ対策</li>
                <li>統計データの作成（個人を特定できない形式）</li>
                <li>その他、当サービスの提供に必要な業務</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3">4. 個人情報の管理</h2>
              <p className="text-sm leading-relaxed mb-2">
                当サービスは、ユーザーの個人情報を適切に管理し、以下の措置を講じます。
              </p>
              <ul className="list-disc list-inside text-sm leading-relaxed ml-4 mt-2 space-y-1">
                <li>個人情報への不正アクセス、紛失、破壊、改ざん、漏洩等を防止するためのセキュリティ対策</li>
                <li>個人情報を取り扱う従業員への教育・監督</li>
                <li>個人情報保護に関する規程の整備</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3">5. 個人情報の第三者提供</h2>
              <p className="text-sm leading-relaxed mb-2">
                当サービスは、以下の場合を除き、ユーザーの個人情報を第三者に提供することはありません。
              </p>
              <ul className="list-disc list-inside text-sm leading-relaxed ml-4 mt-2 space-y-1">
                <li>ユーザーの同意がある場合</li>
                <li>法令に基づく場合</li>
                <li>人の生命、身体または財産の保護のために必要がある場合</li>
                <li>公衆衛生の向上または児童の健全な育成の推進のために特に必要がある場合</li>
                <li>国の機関もしくは地方公共団体またはその委託を受けた者が法令の定める事務を遂行することに対して協力する必要がある場合</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3">6. 個人情報の開示・訂正・削除</h2>
              <p className="text-sm leading-relaxed mb-2">
                ユーザーは、当サービスが保有する自己の個人情報について、開示、訂正、削除を求めることができます。
              </p>
              <p className="text-sm leading-relaxed">
                これらの請求については、当サービスが定める方法により、当サービスにご連絡ください。当サービスは、ご本人確認を行った上で、合理的な期間内に対応いたします。
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3">7. Cookie（クッキー）の使用</h2>
              <p className="text-sm leading-relaxed">
                当サービスは、ユーザーの利便性向上のため、Cookieを使用する場合があります。Cookieは、ユーザーのブラウザに保存される小さなテキストファイルです。ユーザーは、ブラウザの設定により、Cookieの受け入れを拒否することができます。
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3">8. アクセス解析ツール</h2>
              <p className="text-sm leading-relaxed">
                当サービスは、サービスの改善のため、アクセス解析ツールを使用する場合があります。これらのツールは、個人を特定できない形式で情報を収集します。
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3">9. プライバシーポリシーの変更</h2>
              <p className="text-sm leading-relaxed">
                当サービスは、必要に応じて、本プライバシーポリシーを変更することがあります。変更後のプライバシーポリシーは、当サービスウェブサイトに掲載した時点から効力を生じるものとします。
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3">10. お問い合わせ</h2>
              <p className="text-sm leading-relaxed">
                本プライバシーポリシーに関するお問い合わせは、当サービスウェブサイト内のお問い合わせフォームよりご連絡ください。
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


