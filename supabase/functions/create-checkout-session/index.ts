// Supabase Edge Function: Stripeチェックアウトセッション作成
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

serve(async (req) => {
  try {
    // CORSヘッダー
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
    }

    // OPTIONSリクエストの処理
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders })
    }

    if (!STRIPE_SECRET_KEY) {
      return new Response(
        JSON.stringify({ error: 'Stripeシークレットキーが設定されていません' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // リクエストボディの取得
    const { userId, priceId, successUrl, cancelUrl, amount, currency = 'jpy' } = await req.json()

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'userIdが必要です' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 価格IDが提供されていない場合、金額から動的に価格を作成
    let finalPriceId = priceId
    if (!finalPriceId && amount) {
      try {
        // まず、プロダクトを作成または取得
        const productResponse = await fetch('https://api.stripe.com/v1/products', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            'name': 'Riko-Log プレミアムプラン',
            'description': '月額サブスクリプション',
          }),
        })

        if (!productResponse.ok) {
          const error = await productResponse.json()
          throw new Error(error.message || 'プロダクトの作成に失敗しました')
        }

        const product = await productResponse.json()

        // 価格を作成
        const createPriceResponse = await fetch('https://api.stripe.com/v1/prices', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            'product': product.id,
            'unit_amount': String(amount),
            'currency': currency,
            'recurring[interval]': 'month',
          }),
        })

        if (!createPriceResponse.ok) {
          const error = await createPriceResponse.json()
          throw new Error(error.message || '価格の作成に失敗しました')
        }

        const price = await createPriceResponse.json()
        finalPriceId = price.id
      } catch (error) {
        console.error('価格作成エラー:', error)
        return new Response(
          JSON.stringify({ error: `価格の作成に失敗しました: ${error.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    if (!finalPriceId) {
      return new Response(
        JSON.stringify({ error: 'priceIdまたはamountが必要です' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Stripe APIを呼び出してチェックアウトセッションを作成
    const stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'mode': 'subscription',
        'payment_method_types[]': 'card',
        'line_items[0][price]': finalPriceId,
        'line_items[0][quantity]': '1',
        'customer_email': '', // 必要に応じて設定
        'success_url': successUrl || `${req.headers.get('origin') || ''}/app?session_id={CHECKOUT_SESSION_ID}`,
        'cancel_url': cancelUrl || `${req.headers.get('origin') || ''}/app?canceled=true`,
        'metadata[user_id]': userId,
        'subscription_data[metadata][user_id]': userId,
      }),
    })

    if (!stripeResponse.ok) {
      const error = await stripeResponse.json()
      console.error('Stripe API error:', error)
      return new Response(
        JSON.stringify({ error: error.message || 'チェックアウトセッションの作成に失敗しました' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const session = await stripeResponse.json()

    // Supabaseにセッション情報を保存（オプション）
    if (SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
      await supabase.from('stripe_checkout_sessions').insert({
        session_id: session.id,
        user_id: userId,
        status: 'pending',
        created_at: new Date().toISOString(),
      }).catch(err => {
        console.error('Supabase保存エラー:', err)
        // エラーでも続行
      })
    }

    return new Response(
      JSON.stringify({ sessionId: session.id, url: session.url }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'サーバーエラーが発生しました' }),
      { status: 500, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' } }
    )
  }
})
