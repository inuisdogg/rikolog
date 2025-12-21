// Supabase Edge Function: ユーザー作成と招待メール送信
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

// ランダムなパスワードを生成
function generateRandomPassword(length: number = 16): string {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
  let password = ''
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length))
  }
  return password
}

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

    const { email, purpose, appUrl } = requestData

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

    if (!SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(
        JSON.stringify({ error: 'Supabase設定が不完全です' }),
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

    // Service RoleキーでSupabaseクライアントを作成（管理者権限）
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // 新規ユーザーを作成（既存ユーザーの場合はエラーを処理）
    const password = generateRandomPassword()
    let userId: string
    let isNewUser = false
    
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // メール確認をスキップ（招待メールで確認済みとして扱う）
    })

    if (createError) {
      // 既存ユーザーの場合、メールアドレスで検索してパスワードをリセット
      if (createError.message?.includes('already') || createError.message?.includes('exists') || createError.message?.includes('registered')) {
        try {
          // listUsersで既存ユーザーを検索
          const { data: usersList, error: listError } = await supabaseAdmin.auth.admin.listUsers()
          
          if (listError) {
            console.error('ユーザーリスト取得エラー:', listError)
            throw new Error('既存ユーザーの検索に失敗しました')
          }
          
          const existingUser = usersList?.users?.find((u: any) => u.email === email)
          
          if (existingUser) {
            userId = existingUser.id
            // パスワードを更新
            const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
              userId,
              { password: password }
            )
            
            if (updateError) {
              console.error('パスワード更新エラー:', updateError)
              throw new Error('パスワードの更新に失敗しました: ' + updateError.message)
            }
          } else {
            throw new Error('既存ユーザーが見つかりませんでした')
          }
        } catch (searchError) {
          console.error('既存ユーザー検索エラー:', searchError)
          throw new Error('既存ユーザーの処理に失敗しました: ' + (searchError instanceof Error ? searchError.message : String(searchError)))
        }
      } else {
        console.error('ユーザー作成エラー:', createError)
        throw new Error(createError.message || 'ユーザーの作成に失敗しました')
      }
    } else if (newUser?.user) {
      // 新規ユーザーが作成された
      userId = newUser.user.id
      isNewUser = true
    } else {
      throw new Error('ユーザーの作成に失敗しました')
    }

    // 新規ユーザーの場合のみ、usersテーブルとpremium_subscriptionsテーブルに保存
    if (isNewUser) {

      // usersテーブルにユーザー情報を保存
      const { error: userInsertError } = await supabaseAdmin
        .from('users')
        .insert({
          id: userId,
          email: email,
          reason: purpose || 'その他',
          registered_at: new Date().toISOString(),
        })

      if (userInsertError) {
        console.error('usersテーブルへの保存エラー:', userInsertError)
        // エラーをログに記録するが、処理は続行
      }

      // premium_subscriptionsテーブルに無料プランを設定
      const { error: premiumError } = await supabaseAdmin
        .from('premium_subscriptions')
        .insert({
          user_id: userId,
          plan_type: 'free',
          status: 'active',
        })

      if (premiumError) {
        console.error('premium_subscriptionsテーブルへの保存エラー:', premiumError)
        // エラーをログに記録するが、処理は続行
      }
    }

    // email_leadsテーブルにも保存（オプション）
    const { error: emailLeadsError } = await supabaseAdmin
      .from('email_leads')
      .upsert({
        email: email,
        source: 'landing_page',
        purpose: purpose || null,
        notified: true,
      }, {
        onConflict: 'email'
      })

    if (emailLeadsError) {
      console.error('email_leadsテーブルへの保存エラー:', emailLeadsError)
      // エラーをログに記録するが、処理は続行
    }

    // アプリのURLを取得
    const finalAppUrl = appUrl || (req.headers.get('origin') ? `${req.headers.get('origin')}/app` : '/app')
    const loginUrl = `${finalAppUrl}?email=${encodeURIComponent(email)}`

    // 電卓パスコード（固定）
    const calculatorPassword = '7777'

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
    .code-box { background: #f3f4f6; padding: 15px; border-radius: 8px; font-family: monospace; margin: 15px 0; text-align: center; font-size: 18px; font-weight: bold; }
    .step { margin: 20px 0; padding: 15px; background: #f9fafb; border-left: 4px solid #ec4899; }
    .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 15px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="color: #ec4899; margin: 0;">リコログ</h1>
      <p style="margin: 10px 0 0 0; color: #666;">サービス利用開始のご案内</p>
    </div>
    <div class="content">
      <p>この度は、リコログにご登録いただき、ありがとうございます。</p>
      <p>すぐにサービスをご利用いただけます。以下の情報でログインしてください。</p>
      
      <h2>🔐 ログイン情報</h2>
      <div class="code-box">
        <strong>メールアドレス：</strong><br>
        ${email}<br><br>
        <strong>パスワード：</strong><br>
        ${password}
      </div>
      
      <div class="warning">
        <strong>⚠️ 重要：</strong>このパスワードは安全に管理してください。メールを削除する前に、必ずパスワードを控えておいてください。
      </div>
      
      <h2>🔓 電卓パスコード</h2>
      <p>リコログは「電卓」として偽装されています。以下のパスコードでアプリを解除できます：</p>
      <div class="code-box">
        ${calculatorPassword}
      </div>
      
      <h2>📱 ログイン方法</h2>
      <div class="step">
        <h3>手順1：アプリを開く</h3>
        <p>以下のボタンからログイン画面にアクセスしてください。</p>
        <p style="text-align: center; margin: 20px 0;">
          <a href="${loginUrl}" class="button">今すぐログインする</a>
        </p>
      </div>
      
      <div class="step">
        <h3>手順2：ログイン</h3>
        <ol>
          <li>メールアドレスとパスワードを入力</li>
          <li>「ログイン」ボタンをクリック</li>
        </ol>
      </div>
      
      <div class="step">
        <h3>手順3：電卓パスコードを入力</h3>
        <ol>
          <li>電卓画面で「${calculatorPassword}」と入力</li>
          <li>「=」ボタンを押す</li>
          <li>アプリが解除されます</li>
        </ol>
      </div>
      
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
      
      <h2>⚠️ 重要な注意事項</h2>
      <ul>
        <li>パスワードは安全に管理してください</li>
        <li>電卓のパスコード（${calculatorPassword}）は秘密にしてください</li>
        <li>緊急時は「緊急ロック」ボタンで即座に電卓に戻れます</li>
        <li>記録したデータはクラウドに自動保存されます</li>
      </ul>
      
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
          subject: '【リコログ】サービス利用開始のご案内',
          html: emailBody,
        }),
      })

      if (!resendResponse.ok) {
        const errorText = await resendResponse.text()
        let errorMessage = 'メール送信に失敗しました'
        
        try {
          const errorJson = JSON.parse(errorText)
          errorMessage = errorJson.message || errorJson.error || errorMessage
          console.error('Resend API error:', errorJson)
        } catch {
          console.error('Resend API error (text):', errorText)
          errorMessage = `メール送信に失敗しました: ${errorText.substring(0, 100)}`
        }
        
        // メール送信エラーでもユーザー作成は成功しているので、警告として記録
        console.warn('メール送信エラー（ユーザーは作成済み）:', errorMessage)
        // エラーをスローしない（ユーザー作成は成功しているため）
        // throw new Error(errorMessage)
      } else {
        const responseData = await resendResponse.json()
        console.log('メール送信成功:', responseData)
      }
    } else {
      console.log('Resend APIキーが設定されていません。メール送信をスキップします。')
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'ユーザーを作成し、招待メールを送信しました',
        userId: userId
      }),
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
    console.error('Error details:', JSON.stringify(error, null, 2))
    
    // エラーの詳細を取得
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage || 'ユーザー作成に失敗しました',
        details: errorStack ? errorStack.split('\n').slice(0, 3).join('\n') : undefined
      }),
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

