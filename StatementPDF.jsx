import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';

// 日本語フォント登録（日本語表示に必須）
// Viteのpublic配下は / で参照できます（public/fonts → /fonts）
let isFontRegistered = false;
function ensureJapaneseFont() {
  if (isFontRegistered) return;
  Font.register({
    family: 'NotoSansJP',
    src: '/fonts/NotoSansJP-Regular.otf',
  });
  Font.register({
    family: 'NotoSerifJP',
    fonts: [
      { src: '/fonts/NotoSerifJP-Regular.otf', fontWeight: 'normal' },
      { src: '/fonts/NotoSerifJP-Bold.otf', fontWeight: 'bold' },
    ],
  });
  isFontRegistered = true;
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 58,
    paddingBottom: 40,
    paddingHorizontal: 40,
    fontFamily: 'NotoSerifJP',
    fontSize: 11,
    lineHeight: 1.55,
    position: 'relative',
  },
  continuedTitle: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 14,
  },
  titleLines: {
    marginBottom: 22,
  },
  titleLine: {
    borderBottomWidth: 1,
    borderBottomColor: '#111827',
  },
  titleLineGap: {
    height: 3,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  headerLeft: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  headerRight: {
    width: 240,
    textAlign: 'right',
  },
  authorLine: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'baseline',
  },
  authorLabel: {
    marginRight: 6,
  },
  authorValue: {
    minWidth: 120,
    borderBottomWidth: 1,
    borderBottomColor: '#111827',
    marginRight: 6,
  },
  intro: {
    marginBottom: 18,
  },

  table: {
    borderWidth: 1.2,
    borderColor: '#374151',
  },
  tableRow: {
    flexDirection: 'row',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderBottomWidth: 1.2,
    borderBottomColor: '#374151',
  },
  cellBase: {
    borderRightWidth: 1.2,
    borderRightColor: '#374151',
    paddingVertical: 6,
    paddingHorizontal: 6,
  },
  cellLast: {
    borderRightWidth: 0,
  },
  cellText: {
    fontSize: 10,
  },
  headerText: {
    fontSize: 10,
    fontWeight: 'bold',
  },

  colDate: { width: '16%' },
  colLocation: { width: '16%' },
  colCategory: { width: '16%' },
  colDetail: { width: '44%' },
  colEvidence: { width: '8%' },

  divider: {
    marginTop: 22,
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#9CA3AF',
  },
  emotionTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emotionBox: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    padding: 12,
    minHeight: 84,
  },
  emotionHint: {
    color: '#9CA3AF',
    fontSize: 10,
  },

});

function formatEvidence(attachments) {
  if (!attachments || attachments.length === 0) return '';
  return '有';
}

// PDFドキュメント本体
// data 期待値:
// {
//   header: { date: string, court: string, author: string },
//   introduction: string,
//   events: [{ date: string, location: string, category: string, detail: string, evidence: string }]
// }
export const StatementDocument = ({ data }) => {
  ensureJapaneseFont();

  const header = data?.header || {};
  const events = Array.isArray(data?.events) ? data.events : [];

  const chunk = (arr, size) => {
    const out = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out.length ? out : [[]];
  };
  // 1ページあたりの行数（本文の長さで可変にするのは将来の改善点）
  const pages = chunk(events, 14);

  return (
    <Document>
      {pages.map((pageEvents, pageIndex) => {
        const isFirst = pageIndex === 0;
        const isLast = pageIndex === pages.length - 1;

        return (
          <Page key={pageIndex} size="A4" style={styles.page}>
            {!isFirst && <Text style={styles.continuedTitle}>陳 述 書（続き）</Text>}

            {isFirst && (
              <>
                <Text style={styles.title}>陳 述 書</Text>
                <View style={styles.titleLines}>
                  <View style={styles.titleLine} />
                  <View style={styles.titleLineGap} />
                  <View style={styles.titleLine} />
                </View>

                <View style={styles.headerRow}>
                  <View style={styles.headerLeft}>
                    <Text>{header.court || '〇〇家庭裁判所 御中'}</Text>
                  </View>
                  <View>
                    <Text style={styles.headerRight}>作成日： {header.date || ''}</Text>
                    <View style={styles.authorLine}>
                      <Text style={styles.authorLabel}>申立人：</Text>
                      <Text style={styles.authorValue}>{header.author || ''}</Text>
                      <Text>（印）</Text>
                    </View>
                  </View>
                </View>

                {data?.introduction ? <Text style={styles.intro}>{data.introduction}</Text> : null}
              </>
            )}

            <View style={styles.table}>
              {/* ヘッダー行 */}
              <View style={styles.tableHeaderRow}>
                <View style={[styles.cellBase, styles.colDate]}>
                  <Text style={styles.headerText}>日時</Text>
                </View>
                <View style={[styles.cellBase, styles.colLocation]}>
                  <Text style={styles.headerText}>場所</Text>
                </View>
                <View style={[styles.cellBase, styles.colCategory]}>
                  <Text style={styles.headerText}>区分</Text>
                </View>
                <View style={[styles.cellBase, styles.colDetail]}>
                  <Text style={styles.headerText}>内容　言動の詳細</Text>
                </View>
                <View style={[styles.cellBase, styles.cellLast, styles.colEvidence]}>
                  <Text style={styles.headerText}>証拠</Text>
                </View>
              </View>

              {/* データ行 */}
              {pageEvents.map((event, i) => (
                <View
                  key={`${pageIndex}-${i}`}
                  style={[
                    styles.tableRow,
                    { borderBottomWidth: i === pageEvents.length - 1 ? 0 : 1.2, borderBottomColor: '#374151' },
                  ]}
                >
                  <View style={[styles.cellBase, styles.colDate]}>
                    <Text style={styles.cellText}>
                      {event?.date || ''}
                      {event?.time ? `\n${event.time}` : ''}
                    </Text>
                  </View>
                  <View style={[styles.cellBase, styles.colLocation]}>
                    <Text style={styles.cellText}>{event?.location || ''}</Text>
                  </View>
                  <View style={[styles.cellBase, styles.colCategory]}>
                    <Text style={styles.cellText}>{event?.category || ''}</Text>
                  </View>
                  <View style={[styles.cellBase, styles.colDetail]}>
                    <Text style={styles.cellText}>{event?.detail || ''}</Text>
                  </View>
                  <View style={[styles.cellBase, styles.cellLast, styles.colEvidence]}>
                    <Text style={styles.cellText}>
                      {event?.evidence !== undefined ? event.evidence : formatEvidence(event?.attachments)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            {/* 心情欄は最終ページのみ */}
            {isLast && (
              <>
                <View style={styles.divider} />
                <Text style={styles.emotionTitle}>【申立人の心情】</Text>
                <View style={styles.emotionBox}>
                  <Text style={styles.emotionHint}>（※ここには、出力後に、手書き等で心情を追記できます）</Text>
                </View>
              </>
            )}
          </Page>
        );
      })}
    </Document>
  );
};


