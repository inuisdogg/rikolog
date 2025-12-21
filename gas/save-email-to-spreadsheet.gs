/**
 * メールアドレスをGoogleスプレッドシートに記録するGAS
 * 
 * セットアップ手順:
 * 1. Google Apps Script エディタで新規プロジェクトを作成
 * 2. このコードをコピー＆ペースト
 * 3. スプレッドシートIDを設定（下記のSPREADSHEET_IDを変更）
 * 4. 「デプロイ」→「新しいデプロイ」→「種類を選択」→「ウェブアプリ」を選択
 * 5. 実行ユーザーを「自分」、アクセスできるユーザーを「全員」に設定
 * 6. デプロイしてURLを取得
 * 7. そのURLをSupabase Edge Functionまたはフロントエンドから呼び出す
 */

// スプレッドシートIDを設定（スプレッドシートのURLから取得）
// 例: https://docs.google.com/spreadsheets/d/【ここがID】/edit
const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID_HERE';

// シート名（存在しない場合は自動で作成されます）
const SHEET_NAME = 'メールアドレス登録';

/**
 * POSTリクエストを受け取ってスプレッドシートに記録
 * @param {Object} e - リクエストオブジェクト
 * @return {Object} レスポンス
 */
function doPost(e) {
  try {
    // CORS対応のヘッダー
    const headers = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    };

    // OPTIONSリクエスト（プリフライト）への対応
    if (e.parameter && e.parameter.method === 'OPTIONS') {
      return ContentService.createTextOutput('')
        .setMimeType(ContentService.MimeType.JSON)
        .setHeaders(headers);
    }

    // リクエストボディをパース
    let requestData;
    try {
      requestData = JSON.parse(e.postData.contents);
    } catch (parseError) {
      return createResponse(headers, {
        success: false,
        error: 'Invalid JSON format'
      }, 400);
    }

    // メールアドレスのバリデーション
    const email = requestData.email;
    if (!email || typeof email !== 'string') {
      return createResponse(headers, {
        success: false,
        error: 'Email is required'
      }, 400);
    }

    // メールアドレスの形式チェック
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return createResponse(headers, {
        success: false,
        error: 'Invalid email format'
      }, 400);
    }

    // スプレッドシートに書き込み
    const result = writeToSpreadsheet(email, requestData.source || 'landing_page');

    if (result.success) {
      return createResponse(headers, {
        success: true,
        message: 'Email saved successfully',
        timestamp: result.timestamp
      }, 200);
    } else {
      return createResponse(headers, {
        success: false,
        error: result.error || 'Failed to save email'
      }, 500);
    }

  } catch (error) {
    // エラーログを記録
    console.error('Error in doPost:', error);
    return createResponse({
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }, {
      success: false,
      error: 'Internal server error: ' + error.toString()
    }, 500);
  }
}

/**
 * GETリクエスト（テスト用）
 */
function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    message: 'Email registration endpoint',
    method: 'POST',
    format: {
      email: 'string (required)',
      source: 'string (optional, default: "landing_page")'
    }
  }))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeaders({
      'Access-Control-Allow-Origin': '*'
    });
}

/**
 * スプレッドシートにメールアドレスを書き込む
 * @param {string} email - メールアドレス
 * @param {string} source - 登録元（デフォルト: 'landing_page'）
 * @return {Object} 結果オブジェクト
 */
function writeToSpreadsheet(email, source) {
  try {
    // スプレッドシートを開く
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    
    // シートを取得（存在しない場合は作成）
    let sheet = spreadsheet.getSheetByName(SHEET_NAME);
    if (!sheet) {
      sheet = spreadsheet.insertSheet(SHEET_NAME);
      // ヘッダー行を追加
      sheet.getRange(1, 1, 1, 4).setValues([['登録日時', 'メールアドレス', '登録元', '通知済み']]);
      sheet.getRange(1, 1, 1, 4).setFontWeight('bold');
      sheet.setFrozenRows(1);
    }

    // 現在の日時を取得
    const now = new Date();
    const timestamp = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');

    // 重複チェック（同じメールアドレスが既に存在するか）
    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();
    let emailColumn = -1;
    
    // ヘッダー行からメールアドレスの列を探す
    if (values.length > 0) {
      for (let i = 0; i < values[0].length; i++) {
        if (values[0][i] === 'メールアドレス') {
          emailColumn = i;
          break;
        }
      }
    }

    // 重複チェック
    if (emailColumn >= 0) {
      for (let i = 1; i < values.length; i++) {
        if (values[i][emailColumn] === email) {
          return {
            success: true,
            message: 'Email already exists',
            timestamp: timestamp,
            duplicate: true
          };
        }
      }
    }

    // 新しい行にデータを追加
    const newRow = [
      timestamp,
      email,
      source,
      '未通知'
    ];
    
    sheet.appendRow(newRow);

    // 最終行を取得してフォーマット（オプション）
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      // 日時列のフォーマット
      sheet.getRange(lastRow, 1).setNumberFormat('yyyy-MM-dd HH:mm:ss');
    }

    return {
      success: true,
      timestamp: timestamp,
      duplicate: false
    };

  } catch (error) {
    console.error('Error writing to spreadsheet:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * レスポンスを作成
 * @param {Object} headers - ヘッダーオブジェクト
 * @param {Object} data - レスポンスデータ
 * @param {number} statusCode - HTTPステータスコード
 * @return {TextOutput} レスポンスオブジェクト
 */
function createResponse(headers, data, statusCode) {
  const output = ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
  
  // ヘッダーを設定
  for (const key in headers) {
    output.setHeader(key, headers[key]);
  }
  
  return output;
}

/**
 * テスト用関数（GASエディタで直接実行可能）
 */
function testSaveEmail() {
  const testData = {
    email: 'test@example.com',
    source: 'test'
  };
  
  const mockEvent = {
    postData: {
      contents: JSON.stringify(testData)
    }
  };
  
  const result = doPost(mockEvent);
  Logger.log(result.getContent());
}


