// Supabase Edge Function: Stripeチェックアウトセッション検証
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (!STRIPE_SECRET_KEY) {
      return new Response(
        JSON.stringify({ error: 'Stripeシークレットキーが設定されていません' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { sessionId } = await req.json()

    if (!sessionId) {
      return new Response(
        JSON.stringify({ error: 'sessionIdが必要です' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Stripe APIでセッションを検証
    const stripeResponse = await fetch(
      `https://api.stripe.com/v1/checkout/sessions/${sessionId}`,
      {
        headers: {
          'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
        },
      }
    )

    if (!stripeResponse.ok) {
      const error = await stripeResponse.json()
      return new Response(
        JSON.stringify({ error: error.message || 'セッションの検証に失敗しました' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const session = await stripeResponse.json()

    // 支払いが完了しているか確認
    if (session.payment_status !== 'paid') {
      return new Response(
        JSON.stringify({
          success: false,
          error: '支払いが完了していません',
          status: session.payment_status
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userId = session.metadata?.user_id
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'ユーザーIDが見つかりません' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Supabaseでプレミアムサブスクリプションを作成/更新
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const startDate = new Date()
    const endDate = new Date()
    endDate.setMonth(endDate.getMonth() + 1)

    // 既存のサブスクリプションを確認
    const { data: existingSub } = await supabase
      .from('premium_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single()

    if (existingSub) {
      // 既存のサブスクリプションを更新（期間延長）
      const newEndDate = new Date(existingSub.end_date)
      newEndDate.setMonth(newEndDate.getMonth() + 1)

      await supabase
        .from('premium_subscriptions')
        .update({
          end_date: newEndDate.toISOString(),
          stripe_subscription_id: session.subscription || existingSub.stripe_subscription_id,
          stripe_customer_id: session.customer || existingSub.stripe_customer_id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingSub.id)
    } else {
      // 新規サブスクリプションを作成
      await supabase.from('premium_subscriptions').insert({
        user_id: userId,
        plan_type: 'premium',
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        status: 'active',
        stripe_subscription_id: session.subscription || null,
        stripe_customer_id: session.customer || null,
      })
    }

    // checkout_sessionsテーブルを更新
    await supabase
      .from('stripe_checkout_sessions')
      .update({ status: 'completed', updated_at: new Date().toISOString() })
      .eq('session_id', sessionId)
      .catch(() => {}) // エラーは無視

    return new Response(
      JSON.stringify({
        success: true,
        userId,
        subscription: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          status: 'active',
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'サーバーエラーが発生しました' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
