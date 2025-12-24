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

    const { email, purpose, appUrl, password: providedPassword } = requestData

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

    // パスワードが提供されている場合のみユーザーを作成（ログイン画面からの新規登録）
    // パスワードが提供されていない場合はメールのみ送信（LPからの登録）
    const shouldCreateUser = !!providedPassword
    let userId: string | null = null
    let isNewUser = false
    const password = providedPassword || ''

    if (shouldCreateUser) {
      // ログイン画面からの新規登録：ユーザーを作成
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true, // メール確認をスキップ（招待メールで確認済みとして扱う）
      })

      if (createError) {
        // 既存ユーザーの場合
        const isExistingUser = createError.message?.includes('already') || 
                               createError.message?.includes('exists') || 
                               createError.message?.includes('registered') ||
                               createError.message?.includes('User already registered') ||
                               createError.message?.toLowerCase().includes('user already')
        
        if (isExistingUser) {
          try {
            // listUsersで既存ユーザーを検索（getUserByEmailが使えない場合のフォールバック）
            const { data: usersList, error: listError } = await supabaseAdmin.auth.admin.listUsers()
            
            if (listError) {
              console.error('ユーザーリスト取得エラー:', listError)
              throw new Error('既存ユーザーの検索に失敗しました')
            }
            
            const existingUser = usersList?.users?.find((u: any) => u.email?.toLowerCase() === email.toLowerCase())
            
            if (!existingUser) {
              // 既存ユーザーが見つからない場合、エラーメッセージを返す
              return new Response(
                JSON.stringify({ 
                  success: false,
                  error: 'このメールアドレスは既に登録されていますが、ユーザー情報の取得に失敗しました。',
                  message: 'このメールアドレスは既に登録されています。ログイン画面からパスワードリセットを行ってください。'
                }),
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
            
            console.log('既存ユーザーのパスワードをリセットしました')
          } catch (searchError) {
            console.error('既存ユーザー処理エラー:', searchError)
            const errorMsg = searchError instanceof Error ? searchError.message : String(searchError)
            return new Response(
              JSON.stringify({ 
                success: false,
                error: '既存ユーザーの処理に失敗しました',
                message: 'このメールアドレスは既に登録されています。ログイン画面からパスワードリセットを行ってください。',
                details: errorMsg
              }),
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
        } else {
          // その他のエラー
          console.error('ユーザー作成エラー:', createError)
          return new Response(
            JSON.stringify({ 
              success: false,
              error: createError.message || 'ユーザーの作成に失敗しました',
              message: createError.message || 'ユーザーの作成に失敗しました。もう一度お試しください。'
            }),
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
      } else if (newUser?.user) {
        // 新規ユーザーが作成された
        userId = newUser.user.id
        isNewUser = true
      } else {
        return new Response(
          JSON.stringify({ 
            success: false,
            error: 'ユーザーの作成に失敗しました',
            message: 'ユーザーの作成に失敗しました。もう一度お試しください。'
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

      // 新規ユーザーの場合のみ、usersテーブルとpremium_subscriptionsテーブルに保存
      if (isNewUser && userId) {
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

    // アプリのURLを取得（本番環境のURLを使用）
    const finalAppUrl = appUrl || 'https://rikolog.net/app'
    // LPからの登録の場合は新規登録画面を表示、ログイン画面からの登録の場合はログイン画面を表示
    const registerParam = shouldCreateUser ? '' : '&register=true'
    const loginUrl = `${finalAppUrl}?email=${encodeURIComponent(email)}${registerParam}`

    // 電卓パスコード（固定）
    const calculatorPassword = '7777'

    // メール送信（Resend APIを使用）
    if (RESEND_API_KEY) {
      // LPからの登録とログイン画面からの新規登録でメール内容を分岐
      const emailBody = shouldCreateUser 
        ? `
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
        登録時に設定したパスワード
      </div>
      
      <div class="warning">
        <strong>⚠️ 重要：</strong>登録時に設定したパスワードでログインしてください。
      </div>
      
      <h2>🔓 電卓パスコード（最初に確認してください）</h2>
      <p>リコログは「電卓」として偽装されています。以下のパスコードでアプリを解除できます：</p>
      <div class="code-box" style="text-align: center; font-size: 18px; font-weight: bold;">
        ${calculatorPassword}=
      </div>
      <p style="text-align: center; font-size: 12px; color: #666; margin-top: 5px;">
        ※「${calculatorPassword}」と入力してから「=」ボタンを押してください
      </p>
      
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
        <h3>手順3：電卓パスコードでアプリを開く</h3>
        <ol>
          <li>ログイン後、電卓画面が表示されます</li>
          <li>電卓画面で「${calculatorPassword}」と入力</li>
          <li>「=」ボタンを押す</li>
          <li>アプリが解除されます</li>
        </ol>
      </div>
`
        : `
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
    .info { background: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; margin: 15px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="color: #ec4899; margin: 0;">リコログ</h1>
      <p style="margin: 10px 0 0 0; color: #666;">サービス利用開始のご案内</p>
    </div>
    <div class="content">
      <p>この度は、リコログにご興味をお持ちいただき、ありがとうございます。</p>
      <p>サービスをご利用いただくには、まずアカウントを作成していただく必要があります。</p>
      
      <div class="info">
        <strong>📝 次のステップ：</strong><br>
        以下のリンクからサービスページにアクセスし、新規登録を行ってください。
      </div>
      
      <h2>🔓 電卓パスコード（最初に確認してください）</h2>
      <p>リコログは「電卓」として偽装されています。以下のパスコードでアプリを解除できます：</p>
      <div class="code-box" style="text-align: center; font-size: 18px; font-weight: bold;">
        ${calculatorPassword}=
      </div>
      <p style="text-align: center; font-size: 12px; color: #666; margin-top: 5px;">
        ※「${calculatorPassword}」と入力してから「=」ボタンを押してください
      </p>
      
      <h2>📱 登録方法</h2>
      <div class="step">
        <h3>手順1：新規登録画面にアクセス</h3>
        <p>以下のボタンから新規登録画面にアクセスしてください。</p>
        <p style="text-align: center; margin: 20px 0;">
          <a href="${loginUrl}" class="button">新規登録を開始する</a>
        </p>
        <p style="font-size: 12px; color: #666; margin-top: 10px;">
          ※メールアドレス（${email}）は自動入力されます
        </p>
      </div>
      
      <div class="step">
        <h3>手順2：パスワードを設定して登録</h3>
        <ol>
          <li>メールアドレス（${email}）が自動入力されていることを確認</li>
          <li>パスワードを設定（6文字以上）</li>
          <li>「利用を開始する」ボタンをクリック</li>
        </ol>
      </div>
      
      <div class="step">
        <h3>手順3：電卓パスコードでアプリを開く</h3>
        <ol>
          <li>ログイン後、電卓画面が表示されます</li>
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
        <li>${shouldCreateUser ? 'パスワードは安全に管理してください' : 'パスワードは自分で設定できます。安全なパスワードを設定してください'}</li>
        <li>電卓のパスコード（${calculatorPassword}=）は秘密にしてください</li>
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
          from: 'リコログ <info@rikolog.net>',
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
        
        console.warn('メール送信エラー:', errorMessage)
        
        // メール送信失敗時の処理
        if (shouldCreateUser) {
          // ログイン画面からの新規登録の場合
          return new Response(
            JSON.stringify({ 
              success: true, 
              message: 'ユーザーは作成されましたが、メール送信に失敗しました。',
              userId: userId,
              isNewUser: isNewUser,
              emailSent: false,
              emailError: errorMessage,
              password: password
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
        } else {
          // LPからの登録の場合
          return new Response(
            JSON.stringify({ 
              success: false, 
              message: 'メール送信に失敗しました。もう一度お試しください。',
              emailSent: false,
              emailError: errorMessage
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
        }
      } else {
        const responseData = await resendResponse.json()
        console.log('メール送信成功:', responseData)
      }
    } else {
      console.log('Resend APIキーが設定されていません。メール送信をスキップします。')
      
      // Resend APIキーが設定されていない場合
      if (shouldCreateUser) {
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'ユーザーは作成されましたが、メール送信機能が設定されていません。',
            userId: userId,
            isNewUser: isNewUser,
            emailSent: false,
            emailError: 'Resend APIキーが設定されていません',
            password: password
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
      } else {
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'メール送信機能が設定されていません。管理者にお問い合わせください。',
            emailSent: false,
            emailError: 'Resend APIキーが設定されていません'
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
      }
    }

    // 成功時のメッセージを決定
    let successMessage: string
    if (shouldCreateUser) {
      // ログイン画面からの新規登録
      successMessage = isNewUser 
        ? 'ユーザーを作成し、招待メールを送信しました'
        : 'パスワードをリセットし、ログイン情報をメールで送信しました'
    } else {
      // LPからの登録
      successMessage = 'サービスページへの招待メールを送信しました'
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: successMessage,
        userId: userId || null,
        isNewUser: isNewUser,
        emailSent: true
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
    
    // エラーメッセージをより分かりやすく
    let userFriendlyMessage = 'ユーザー作成に失敗しました。もう一度お試しください。'
    
    if (errorMessage.includes('既存ユーザー') || errorMessage.includes('already')) {
      userFriendlyMessage = 'このメールアドレスは既に登録されています。ログイン画面からパスワードリセットを行ってください。'
    } else if (errorMessage.includes('パスワード')) {
      userFriendlyMessage = 'パスワードの設定に失敗しました。もう一度お試しください。'
    } else if (errorMessage.includes('メール')) {
      userFriendlyMessage = 'メールアドレスの処理に失敗しました。正しいメールアドレスを入力してください。'
    }
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: errorMessage || 'ユーザー作成に失敗しました',
        message: userFriendlyMessage,
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

