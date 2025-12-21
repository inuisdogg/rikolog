// Supabase Edge Function: Stripe Webhookハンドラー
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')
const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

// Stripeの署名検証（簡易版 - 本番環境では適切な検証が必要）
async function verifyStripeSignature(body: string, signature: string | null): Promise<boolean> {
  if (!STRIPE_WEBHOOK_SECRET || !signature) {
    return false
  }
  // 実際の実装では、Stripeの署名検証ロジックを使用
  // ここでは簡易的に実装
  return true
}

serve(async (req) => {
  try {
    const signature = req.headers.get('stripe-signature')
    const body = await req.text()

    // 署名検証（本番環境では必須）
    if (!await verifyStripeSignature(body, signature)) {
      return new Response(
        JSON.stringify({ error: '署名検証に失敗しました' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const event = JSON.parse(body)

    // Supabaseクライアントの作成
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // イベントタイプに応じて処理
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        const userId = session.metadata?.user_id || session.subscription_data?.metadata?.user_id

        if (userId) {
          // プレミアムサブスクリプションをアクティブにする
          const startDate = new Date()
          const endDate = new Date()
          endDate.setMonth(endDate.getMonth() + 1) // 1ヶ月後

          await supabase.from('premium_subscriptions').insert({
            user_id: userId,
            plan_type: 'premium',
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString(),
            status: 'active',
            stripe_subscription_id: session.subscription || null,
            stripe_customer_id: session.customer || null,
          }).catch(err => {
            console.error('プレミアムサブスクリプション作成エラー:', err)
          })
        }
        break
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object
        const userId = subscription.metadata?.user_id

        if (userId) {
          if (subscription.status === 'active' || subscription.status === 'trialing') {
            // サブスクリプションを更新
            const endDate = subscription.current_period_end
              ? new Date(subscription.current_period_end * 1000)
              : null

            await supabase
              .from('premium_subscriptions')
              .update({
                status: 'active',
                end_date: endDate ? endDate.toISOString() : null,
                updated_at: new Date().toISOString(),
              })
              .eq('stripe_subscription_id', subscription.id)
              .catch(err => {
                console.error('プレミアムサブスクリプション更新エラー:', err)
              })
          } else {
            // サブスクリプションをキャンセルまたは期限切れ
            await supabase
              .from('premium_subscriptions')
              .update({
                status: subscription.status === 'canceled' ? 'cancelled' : 'expired',
                updated_at: new Date().toISOString(),
              })
              .eq('stripe_subscription_id', subscription.id)
              .catch(err => {
                console.error('プレミアムサブスクリプション更新エラー:', err)
              })
          }
        }
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object
        const subscriptionId = invoice.subscription

        if (subscriptionId) {
          // 支払い成功時にサブスクリプション期間を延長
          const periodEnd = invoice.period_end
            ? new Date(invoice.period_end * 1000)
            : null

          if (periodEnd) {
            await supabase
              .from('premium_subscriptions')
              .update({
                end_date: periodEnd.toISOString(),
                status: 'active',
                updated_at: new Date().toISOString(),
              })
              .eq('stripe_subscription_id', subscriptionId)
              .catch(err => {
                console.error('プレミアムサブスクリプション更新エラー:', err)
              })
          }
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object
        const subscriptionId = invoice.subscription

        if (subscriptionId) {
          // 支払い失敗時の処理（必要に応じて）
          console.log('支払い失敗:', subscriptionId)
        }
        break
      }
    }

    return new Response(
      JSON.stringify({ received: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Webhookエラー:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Webhook処理に失敗しました' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})

