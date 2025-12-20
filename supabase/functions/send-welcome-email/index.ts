// Supabase Edge Function: ウェルカムメール送信
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

serve(async (req) => {
  try {
    const { email, appUrl } = await req.json()

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'メールアドレスが必要です' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
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
      
      <h2>📱 ホーム画面に追加する方法</h2>
      
      <div class="step">
        <h3>iPhoneの場合：</h3>
        <ol>
          <li>Safariでリコログを開きます</li>
          <li>画面下部の「共有」ボタン（□↑アイコン）をタップ</li>
          <li>「ホーム画面に追加」を選択</li>
          <li>「追加」をタップ</li>
        </ol>
      </div>
      
      <div class="step">
        <h3>Androidの場合：</h3>
        <ol>
          <li>Chromeでリコログを開きます</li>
          <li>メニュー（⋮）をタップ</li>
          <li>「ホーム画面に追加」を選択</li>
          <li>「追加」をタップ</li>
        </ol>
      </div>
      
      <h2>🔐 ログイン情報</h2>
      <p>以下のメールアドレスでアプリにアクセスできます：</p>
      <div class="code-box">
        <strong>メールアドレス：</strong> ${email}<br>
        パスワードは、アプリ内で初回ログイン時に設定してください。
      </div>
      
      <h2>🔓 アプリの解除方法</h2>
      <p>リコログは「電卓」として偽装されています。以下の手順でアプリを解除できます：</p>
      <div class="code-box">
        1. 電卓画面で「7777」と入力<br>
        2. 「=」ボタンを押す<br>
        3. ログイン画面が表示されます
      </div>
      
      <h2>⚠️ 重要な注意事項</h2>
      <ul>
        <li>パスワードは安全に管理してください</li>
        <li>電卓のパスコード（7777）は秘密にしてください</li>
        <li>緊急時は「緊急ロック」ボタンで即座に電卓に戻れます</li>
        <li>記録したデータはクラウドに自動保存されます</li>
      </ul>
      
      <p style="margin-top: 30px;">
        <a href="${finalAppUrl}" class="button">今すぐ始める</a>
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
          from: 'リコログ <noreply@rikolog.app>',
          to: email,
          subject: '【リコログ】サービス利用案内',
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
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'メール送信に失敗しました' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})

