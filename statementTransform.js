// 擬似LLM変換（将来API/LLMに差し替え可能な境界）
// - 入力: ログ配列（App.jsxのlocalStorage保存形式）
// - 出力: StatementDocument が期待する data 形式

function safeStr(v) {
  return typeof v === 'string' ? v : v == null ? '' : String(v);
}

// 将来API化する時に、そのまま「system prompt」として使える文面（擬似）
export const STATEMENT_SYSTEM_PROMPT =
  'あなたは離婚訴訟専門の弁護士です。入力されたテキストから感情的な言葉を排除し、客観的な事実のみを抽出して、「いつ・どこで・誰が・何をした」という形式の文章に書き換えてください。';

function stripGpsSuffix(location) {
  const s = safeStr(location).trim();
  if (!s) return '';
  // 例: "渋谷（GPS取得済・精度: ±10m）" → "渋谷"
  const idx1 = s.indexOf('（');
  const idx2 = s.indexOf('(');
  const idx = idx1 >= 0 && idx2 >= 0 ? Math.min(idx1, idx2) : Math.max(idx1, idx2);
  if (idx > 0) return s.slice(0, idx).trim();
  return s;
}

function formatEvidenceCell(attachments) {
  return attachments && attachments.length > 0 ? '有' : '';
}

function hasMedicalEvidence(medical) {
  if (!medical) return false;
  const proofs = Array.isArray(medical.proofs) ? medical.proofs : [];
  if (proofs.length > 0) return true;
  if (medical.visitType && medical.visitType !== '通院') return true;
  if (medical.diagnosis) return true;
  return false;
}

function formatEvidenceCell2(attachments, medical) {
  return (attachments && attachments.length > 0) || hasMedicalEvidence(medical) ? '有' : '';
}

function formatMedicalAppendix(medical) {
  if (!medical) return '';
  const parts = [];
  if (medical.visitType) parts.push(`種別: ${safeStr(medical.visitType)}`);
  if (medical.facility) parts.push(`医療機関: ${safeStr(medical.facility)}`);
  if (medical.department) parts.push(`診療科: ${safeStr(medical.department)}`);
  if (medical.diagnosis) parts.push(`診断名/所見: ${safeStr(medical.diagnosis)}`);
  if (medical.severity && safeStr(medical.severity) !== '不明') parts.push(`程度: ${safeStr(medical.severity)}`);
  const proofs = Array.isArray(medical.proofs) ? medical.proofs : [];
  if (proofs.length) parts.push(`資料: ${proofs.map(safeStr).join('、')}`);
  if (medical.memo) parts.push(`補足: ${safeStr(medical.memo)}`);
  if (!parts.length) return '';
  return normalizeStatementSentence(`なお、当該時期に医療機関を受診した（${parts.join(' / ')}）`);
}

function extractGpsNote(location) {
  const s = safeStr(location);
  if (!s) return '';
  if (s.includes('GPS取得済')) return '位置情報はGPS取得済。';
  return '';
}

function formatWeatherNote(weather) {
  if (!weather) return '';
  const parts = [];
  if (weather.temperature !== undefined) parts.push(`気温${weather.temperature}℃`);
  if (weather.windSpeed !== undefined) parts.push(`風速${weather.windSpeed}km/h`);
  return parts.length ? `天候: ${parts.join(' / ')}。` : '';
}

function formatJapaneseDate(dateStr) {
  const s = safeStr(dateStr).trim();
  if (!s) return '';
  // 2025/1/10 or 2025-01-10 などを想定
  const m = s.match(/^(\d{4})[\/\-年](\d{1,2})[\/\-月](\d{1,2})/);
  if (m) return `${Number(m[1])}年${Number(m[2])}月${Number(m[3])}日`;
  return s; // フォールバック
}

function formatJapaneseTime(timeStr) {
  const s = safeStr(timeStr).trim();
  if (!s) return '';
  const m = s.match(/^(\d{1,2}):(\d{2})/);
  if (m) return `${Number(m[1])}時${Number(m[2])}分頃`;
  return `${s}頃`;
}

function detectActor(content) {
  const c = safeStr(content);
  // 法的文書としては「相手方」が無難。文中に明示がある時だけ採用。
  if (/(夫|旦那|夫側)/.test(c)) return '夫';
  if (/(妻|嫁|妻側)/.test(c)) return '妻';
  return '相手方';
}

function normalizeStatementSentence(s) {
  let out = safeStr(s).trim();
  // 改行→空白、連続空白の除去
  out = out.replace(/\s+/g, ' ').trim();
  // 句点が無ければ付与
  if (out && !/[。！？]$/.test(out)) out += '。';
  // 末尾の重複句点整理
  out = out.replace(/。{2,}$/g, '。');
  return out;
}

function sanitizeEmotional(content) {
  let s = safeStr(content);
  // よくある感情語/強調語/罵倒をざっくり削除（完全ではないが“擬似”として）
  const drop = [
    'マジで',
    'ガチで',
    'ほんと',
    '本当に',
    'うざい',
    'ムカつく',
    '最悪',
    'キモい',
    '死ねばいいのに',
    '消えろ',
    '殺す',
    'しね',
    '死ね',
    'ふざけるな',
    'ありえない',
    '信じられない',
  ];
  drop.forEach((w) => {
    s = s.replaceAll(w, '');
  });
  // 連続スペースや句読点の崩れを軽く整える
  s = s.replace(/[ 　]+/g, ' ').trim();
  s = s.replace(/^[、。]+/, '').replace(/[、。]+$/, '');
  return s;
}

function extractFacts(content) {
  const c = safeStr(content);
  const facts = [];

  // 身体的暴力
  if (/(皿|食器|コップ|物).*(投げ|投げられ)/.test(c) || /(皿投げ|食器投げ)/.test(c)) {
    facts.push('食器を投げる行為');
  }
  if (/(殴|殴られ|叩|叩かれ)/.test(c)) facts.push('殴打等の暴力');
  if (/(蹴|蹴られ)/.test(c)) facts.push('蹴る等の暴力');
  if (/(突き飛|押|押され)/.test(c)) facts.push('押す・突き飛ばす等の暴力');

  // 言語的攻撃（ただし「言われた」等がない単語だけは主観の可能性があるので控えめに）
  if (/(暴言|罵倒|侮辱)/.test(c)) facts.push('暴言・罵倒');
  if (/(と(言|い)われた|と言われ)/.test(c) && /死ね/.test(c)) facts.push('「死ね」等の侮辱的発言');

  // 具体行為が拾えない場合のフォールバック：残った文字列を“客観”寄せにして採用
  if (facts.length === 0) {
    const s = sanitizeEmotional(c);
    if (s) facts.push(s);
  }

  // 重複排除
  return Array.from(new Set(facts));
}

function factsToSentence(facts) {
  const f = facts.filter(Boolean);
  if (f.length === 0) return '不適切な言動があった。';
  if (f.length === 1) return `${f[0]}を行った。`;
  // 例の「等の」を踏襲
  return `${f[0]}等の行為を行った。`;
}

// “LLMを介すイメージ”に近い、客観事実への書き換え（擬似）
export function pseudoLLMTransformLog(log) {
  const raw = safeStr(log?.content).replace(/^\(サンプル\)\s*/g, '').trim();
  const content = sanitizeEmotional(raw);

  // 要件: 「誰が」は常に相手方で固定（将来APIでも安定させる）
  const actor = '相手方';
  const facts = extractFacts(content || raw);

  const dateJP = formatJapaneseDate(log?.date);
  const timeJP = formatJapaneseTime(log?.time);
  const loc = stripGpsSuffix(log?.location);

  const parts = [];
  if (dateJP) parts.push(dateJP);
  if (timeJP) parts.push(timeJP);
  const head = parts.length ? `${parts.join('、')}、` : '';
  const where = loc ? `${loc}にて、` : '';

  // 補足（GPS/天候）は“客観情報”なので末尾に軽く付与
  const notes = [];
  const gps = extractGpsNote(log?.location);
  if (gps) notes.push(gps.replace(/。$/, ''));
  const weather = formatWeatherNote(log?.weather);
  if (weather) notes.push(weather.replace(/。$/, ''));
  const noteText = notes.length ? `（${notes.join(' / ')}）` : '';

  return normalizeStatementSentence(`${head}${where}${actor}が${factsToSentence(facts)}${noteText}`.trim());
}

function toSortableDate(log) {
  // occurredAt（発生日時）優先、なければ date+time、最後に記録日時(timestamp/createdAt)
  if (log?.occurredAt) {
    const d = new Date(log.occurredAt);
    if (!Number.isNaN(d.getTime())) return d;
  }
  const dt = `${safeStr(log?.date)} ${safeStr(log?.time)}`.trim();
  const d = new Date(dt);
  if (!Number.isNaN(d.getTime())) return d;
  if (log?.timestamp || log?.createdAt) {
    const t = new Date(log.timestamp || log.createdAt);
    if (!Number.isNaN(t.getTime())) return t;
  }
  return new Date(0);
}

export function buildStatementDataFromLogs({ logs, userProfile }) {
  const sorted = [...(logs || [])].sort((a, b) => toSortableDate(a) - toSortableDate(b));

  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const period =
    sorted.length > 0
      ? `（記録期間: ${safeStr(first?.date)}〜${safeStr(last?.date)} / 全${sorted.length}件）`
      : '';

  return {
    header: {
      date: new Date().toLocaleDateString('ja-JP'),
      court: '〇〇家庭裁判所 御中',
      author: safeStr(userProfile?.name || userProfile?.email),
    },
    introduction:
      `婚姻関係破綻に至る経緯、および相手方の不法行為について、以下の通り日々の記録（アプリ「Riko-Log」による日時・位置情報等の自動記録を含む）に基づき陳述いたします。${period}`.trim(),
    events: sorted.map((log) => {
      const attachments = Array.isArray(log?.attachments) ? log.attachments : [];
      const med = log?.medical || null;
      const baseDetail = pseudoLLMTransformLog(log);
      const medDetail = formatMedicalAppendix(med);
      return {
        date: safeStr(log?.date),
        time: safeStr(log?.time),
        location: stripGpsSuffix(log?.location),
        category: safeStr(log?.category),
        detail: medDetail ? `${baseDetail} ${medDetail}` : baseDetail,
        evidence: formatEvidenceCell2(attachments, med),
        attachments,
      };
    }),
  };
}


