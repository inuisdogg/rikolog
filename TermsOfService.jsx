import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export default function TermsOfService() {
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
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mb-6">利用規約</h1>
          
          <div className="prose prose-sm max-w-none text-slate-700 space-y-6">
            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3">第1条（適用）</h2>
              <p className="text-sm leading-relaxed">
                本規約は、リコログ（以下「当サービス」といいます）の利用条件を定めるものです。登録ユーザーの皆さま（以下「ユーザー」といいます）には、本規約に従って、当サービスをご利用いただきます。
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3">第2条（利用登録）</h2>
              <p className="text-sm leading-relaxed mb-2">
                当サービスの利用を希望する方は、本規約に同意の上、当サービスの定める方法によって利用登録を申請し、当サービスがこれを承認することによって、利用登録が完了するものとします。
              </p>
              <p className="text-sm leading-relaxed">
                当サービスは、利用登録の申請者に以下の事由があると判断した場合、利用登録の申請を承認しないことがあり、その理由については一切の開示義務を負わないものとします。
              </p>
              <ul className="list-disc list-inside text-sm leading-relaxed ml-4 mt-2 space-y-1">
                <li>利用登録の申請に際して虚偽の事項を届け出た場合</li>
                <li>本規約に違反したことがある者からの申請である場合</li>
                <li>その他、当サービスが利用登録を相当でないと判断した場合</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3">第3条（ユーザーIDおよびパスワードの管理）</h2>
              <p className="text-sm leading-relaxed mb-2">
                ユーザーは、自己の責任において、当サービスのユーザーIDおよびパスワードを適切に管理するものとします。
              </p>
              <p className="text-sm leading-relaxed">
                ユーザーIDまたはパスワードが第三者に使用されたことによって生じた損害は、当サービスに故意または重大な過失がある場合を除き、当サービスは一切の責任を負わないものとします。
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3">第4条（利用料金および支払方法）</h2>
              <p className="text-sm leading-relaxed mb-2">
                当サービスは、無料プランとプレミアムプランを提供しています。
              </p>
              <p className="text-sm leading-relaxed">
                プレミアムプランの利用料金、支払方法、支払時期については、別途当サービスが定め、当サービスウェブサイトに表示するものとします。
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3">第5条（禁止事項）</h2>
              <p className="text-sm leading-relaxed mb-2">
                ユーザーは、当サービスの利用にあたり、以下の行為をしてはなりません。
              </p>
              <ul className="list-disc list-inside text-sm leading-relaxed ml-4 mt-2 space-y-1">
                <li>法令または公序良俗に違反する行為</li>
                <li>犯罪行為に関連する行為</li>
                <li>当サービスの内容等、当サービスに含まれる著作権、商標権ほか知的財産権を侵害する行為</li>
                <li>当サービス、ほかのユーザー、またはその他第三者のサーバーまたはネットワークの機能を破壊したり、妨害したりする行為</li>
                <li>当サービスによって得られた情報を商業的に利用する行為</li>
                <li>当サービスの運営を妨害するおそれのある行為</li>
                <li>不正アクセス、不正なリクエストを送信する行為</li>
                <li>その他、当サービスが不適切と判断する行為</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3">第6条（当サービスの提供の停止等）</h2>
              <p className="text-sm leading-relaxed">
                当サービスは、以下のいずれかの事由があると判断した場合、ユーザーに事前に通知することなく当サービスの全部または一部の提供を停止または中断することができるものとします。
              </p>
              <ul className="list-disc list-inside text-sm leading-relaxed ml-4 mt-2 space-y-1">
                <li>当サービスにかかるコンピュータシステムの保守点検または更新を行う場合</li>
                <li>地震、落雷、火災、停電または天災などの不可抗力により、当サービスの提供が困難となった場合</li>
                <li>コンピュータまたは通信回線等が事故により停止した場合</li>
                <li>その他、当サービスが当サービスの提供が困難と判断した場合</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3">第7条（保証の否認および免責）</h2>
              <p className="text-sm leading-relaxed mb-2">
                当サービスは、当サービスに事実上または法律上の瑕疵（安全性、信頼性、正確性、完全性、有効性、特定の目的への適合性、セキュリティなどに関する欠陥、エラーやバグ、権利侵害などを含みます。）がないことを明示的にも黙示的にも保証しておりません。
              </p>
              <p className="text-sm leading-relaxed">
                当サービスに起因してユーザーに生じたあらゆる損害について、当サービスの故意または重過失による場合を除き、一切の責任を負いません。
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3">第8条（サービス内容の変更等）</h2>
              <p className="text-sm leading-relaxed">
                当サービスは、ユーザーへの事前の告知をもって、本サービスの内容を変更、追加または廃止することがあるものとします。
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3">第9条（利用規約の変更）</h2>
              <p className="text-sm leading-relaxed mb-2">
                当サービスは以下の場合には、ユーザーの個別の同意を待たず、本規約を変更することができるものとします。
              </p>
              <ul className="list-disc list-inside text-sm leading-relaxed ml-4 mt-2 space-y-1">
                <li>本規約の変更がユーザーの一般の利益に適合するとき</li>
                <li>本規約の変更が当サービスの利用契約に係る義務の履行に実質的な影響を与えないとき</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3">第10条（個人情報の取扱い）</h2>
              <p className="text-sm leading-relaxed">
                当サービスは、ユーザーの個人情報については、当サービスのプライバシーポリシーに従い、適切に取り扱うものとします。
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3">第11条（通知または連絡）</h2>
              <p className="text-sm leading-relaxed">
                ユーザーと当サービスとの間の通知または連絡は、当サービスの定める方法によって行うものとします。
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3">第12条（権利義務の譲渡の禁止）</h2>
              <p className="text-sm leading-relaxed">
                ユーザーは、当サービスの書面による事前の承諾なく、利用契約上の地位または本規約に基づく権利もしくは義務を第三者に譲渡し、または担保に供することはできません。
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3">第13条（準拠法・裁判管轄）</h2>
              <p className="text-sm leading-relaxed mb-2">
                本規約の解釈にあたっては、日本法を準拠法とします。
              </p>
              <p className="text-sm leading-relaxed">
                当サービスに関して紛争が生じた場合には、当サービスの本店所在地を管轄する裁判所を専属的合意管轄とします。
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

