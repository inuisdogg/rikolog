import React, { useMemo, useState } from 'react';
import { X, Crown, ArrowRight, ArrowLeft, Sparkles, CheckCircle, Scale, AlertTriangle } from 'lucide-react';

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

export default CompensationDiagnosisView;
