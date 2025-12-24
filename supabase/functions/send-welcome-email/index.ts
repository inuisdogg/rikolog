// Supabase Edge Function: ウェルカムメール送信
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

serve(async (req) => {
  // CORS対応: プリフライトリクエスト（OPTIONS）への対応
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  try {
    // リクエストボディをパース
    let requestData
    try {
      requestData = await req.json()
    } catch (parseError) {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON format' }),
        { 
          status: 400, 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
          } 
        }
      )
    }

    const { email, appUrl } = requestData

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'メールアドレスが必要です' }),
        { 
          status: 400, 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
          } 
        }
      )
    }

    // アプリのURLを取得（リクエストから、またはデフォルト値）
    const finalAppUrl = appUrl || (req.headers.get('origin') ? `${req.headers.get('origin')}/app` : '/app')

    // メール送信（Resend APIを使用）
    if (RESEND_API_KEY) {
      const emailBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #fdf2f8 0%, #fff1f2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: white; padding: 30px; border-radius: 0 0 10px 10px; }
    .button { display: inline-block; background: #ec4899; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
    .code-box { background: #f3f4f6; padding: 15px; border-radius: 8px; font-family: monospace; margin: 15px 0; }
    .step { margin: 20px 0; padding: 15px; background: #f9fafb; border-left: 4px solid #ec4899; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="color: #ec4899; margin: 0;">リコログ</h1>
      <p style="margin: 10px 0 0 0; color: #666;">サービス利用案内</p>
    </div>
    <div class="content">
      <p>この度は、リコログにご登録いただき、ありがとうございます。</p>
      <p><strong>ユーザー登録が完了しました。</strong>既にアプリにログイン済みです。すぐにご利用いただけます。</p>
      
      <h2>🔓 電卓パスコード</h2>
      <p>リコログは「電卓」として偽装されています。以下のパスコードでアプリを解除できます：</p>
      <div class="code-box" style="text-align: center; font-size: 18px; font-weight: bold;">
        7777=
      </div>
      <p style="text-align: center; font-size: 12px; color: #666; margin-top: 5px;">
        ※「7777」と入力してから「=」ボタンを押してください
      </p>
      
      <h2>📱 使い方ガイド</h2>
      
      <div class="step">
        <h3>1. 電卓からアプリを開く（最初に必ず行ってください）</h3>
        <ol>
          <li>電卓画面で「7777」と入力</li>
          <li>「=」ボタンを押す</li>
          <li>アプリが解除されます</li>
        </ol>
      </div>
      
      <div class="step">
        <h3>2. 記録を追加する</h3>
        <ol>
          <li>ホーム画面の「+」ボタンをタップ</li>
          <li>カテゴリを選択（モラハラ、DV、不貞など）</li>
          <li>日時・場所・詳細を入力</li>
          <li>写真を添付（最大3枚まで無料）</li>
          <li>「保存」をタップ</li>
        </ol>
      </div>
      
      <div class="step">
        <h3>3. ホーム画面に追加する（推奨）</h3>
        <p><strong>iPhoneの場合：</strong></p>
        <ol>
          <li>Safariでリコログを開きます</li>
          <li>画面下部の「共有」ボタン（□↑アイコン）をタップ</li>
          <li>「ホーム画面に追加」を選択</li>
          <li>「追加」をタップ</li>
        </ol>
        <p style="margin-top: 10px;"><strong>Androidの場合：</strong></p>
        <ol>
          <li>Chromeでリコログを開きます</li>
          <li>メニュー（⋮）をタップ</li>
          <li>「ホーム画面に追加」を選択</li>
          <li>「追加」をタップ</li>
        </ol>
      </div>
      
      <h2>⚠️ 重要な注意事項</h2>
      <ul>
        <li>電卓のパスコード（7777=）は秘密にしてください</li>
        <li>緊急時は「緊急ロック」ボタンで即座に電卓に戻れます</li>
        <li>記録したデータはクラウドに自動保存されます</li>
        <li>パスワードは安全に管理してください</li>
      </ul>
      
      <p style="margin-top: 30px; text-align: center;">
        <a href="${finalAppUrl}" class="button">アプリを開く</a>
      </p>
      
      <p style="margin-top: 30px; font-size: 12px; color: #666;">
        本メールは自動送信されています。返信はできません。<br>
        ご不明点がある場合は、アプリ内の「お問い合わせ」からご連絡ください。
      </p>
    </div>
  </div>
</body>
</html>
      `

      const resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: 'リコログ <info@rikolog.net>',
          to: email,
          subject: '【リコログ】ユーザー登録が完了しました',
          html: emailBody,
        }),
      })

      if (!resendResponse.ok) {
        const error = await resendResponse.text()
        console.error('Resend API error:', error)
        throw new Error('メール送信に失敗しました')
      }
    } else {
      // Resend APIキーがない場合は、Supabaseのメール機能を使用（設定が必要）
      console.log('Resend APIキーが設定されていません。メール送信をスキップします。')
    }

    // メールアドレスをデータベースに保存（オプション）
    if (SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
      
      // メールアドレスを保存するテーブル（存在する場合）
      // await supabase.from('email_registrations').insert({ email, created_at: new Date().toISOString() })
    }

    return new Response(
      JSON.stringify({ success: true, message: 'メールを送信しました' }),
      { 
        status: 200, 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        } 
      }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'メール送信に失敗しました' }),
      { 
        status: 500, 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        } 
      }
    )
  }
})

