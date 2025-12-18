// メッセージのCRUD操作

import { supabase } from '../supabase.config.js';

/**
 * ユーザーのメッセージ一覧を取得
 * @param {string} userId - ユーザーID
 * @returns {Promise<Array>} メッセージ配列
 */
export async function getUserMessages(userId) {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`user_id.eq.${userId},user_id.eq.*`)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('メッセージ一覧の取得エラー:', error);
    throw error;
  }
}

/**
 * 未読メッセージ数を取得
 * @param {string} userId - ユーザーID
 * @returns {Promise<number>} 未読メッセージ数
 */
export async function getUnreadMessageCount(userId) {
  try {
    const messages = await getUserMessages(userId);
    return messages.filter(msg => !msg.read).length;
  } catch (error) {
    console.error('未読メッセージ数の取得エラー:', error);
    return 0;
  }
}

/**
 * メッセージを既読にする
 * @param {string} messageId - メッセージID
 * @returns {Promise<void>}
 */
export async function markMessageAsRead(messageId) {
  try {
    const { error } = await supabase
      .from('messages')
      .update({ read: true })
      .eq('id', messageId);
    
    if (error) throw error;
  } catch (error) {
    console.error('メッセージ既読処理のエラー:', error);
    throw error;
  }
}

/**
 * 全メッセージを既読にする
 * @param {string} userId - ユーザーID
 * @returns {Promise<void>}
 */
export async function markAllMessagesAsRead(userId) {
  try {
    const { error } = await supabase
      .from('messages')
      .update({ read: true })
      .or(`user_id.eq.${userId},user_id.eq.*`);
    
    if (error) throw error;
  } catch (error) {
    console.error('全メッセージ既読処理のエラー:', error);
    throw error;
  }
}
