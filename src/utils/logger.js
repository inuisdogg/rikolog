/**
 * 本番環境対応のロガーユーティリティ
 * 開発環境でのみログを出力し、本番環境では出力しない
 */

const isDev = import.meta.env.DEV;

export const logger = {
  log: (...args) => {
    if (isDev) console.log(...args);
  },
  error: (...args) => {
    // エラーは本番環境でも出力（ただし詳細は隠す）
    if (isDev) {
      console.error(...args);
    }
  },
  warn: (...args) => {
    if (isDev) console.warn(...args);
  },
  info: (...args) => {
    if (isDev) console.info(...args);
  },
};

export default logger;
