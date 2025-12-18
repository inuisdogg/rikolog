// プレミアム会員情報の取得

import { supabase } from '../supabase.config.js';

/**
 * ユーザーのアクティブなプレミアムサブスクリプションを取得
 * @param {string} userId - ユーザーID
 * @returns {Promise<Object|null>} プレミアム情報
 */
export async function getPremiumSubscription(userId) {
  try {
    const { data, error } = await supabase
      .from('premium_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('end_date', { ascending: false, nullsFirst: false })
      .limit(1)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        // レコードが見つからない場合
        return null;
      }
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('プレミアム情報の取得エラー:', error);
    // エラー時はnullを返す（無料プランとして扱う）
    return null;
  }
}

/**
 * プレミアム会員かどうかを判定
 * @param {string} userId - ユーザーID
 * @returns {Promise<boolean>}
 */
export async function isPremiumUser(userId) {
  const subscription = await getPremiumSubscription(userId);
  if (!subscription) return false;
  
  // 終了日が設定されている場合は確認
  if (subscription.end_date) {
    const endDate = new Date(subscription.end_date);
    return endDate > new Date();
  }
  
  // 終了日がnullの場合は無期限
  return true;
}
