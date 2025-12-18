// ユーザー情報のCRUD操作

import { supabase } from '../supabase.config.js';

/**
 * ユーザー情報を取得
 * @param {string} userId - ユーザーID
 * @returns {Promise<Object|null>} ユーザー情報
 */
export async function getUser(userId) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
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
    console.error('ユーザー情報の取得エラー:', error);
    throw error;
  }
}

/**
 * 現在ログイン中のユーザー情報を取得
 * @returns {Promise<Object|null>} ユーザー情報
 */
export async function getCurrentUser() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    
    return getUser(user.id);
  } catch (error) {
    console.error('現在のユーザー情報の取得エラー:', error);
    return null;
  }
}

/**
 * ユーザー情報を作成
 * @param {string} userId - ユーザーID（Supabase AuthのUID）
 * @param {Object} userData - ユーザーデータ
 * @param {string} userData.email - メールアドレス
 * @param {string} userData.reason - 離婚理由
 * @param {string|null} userData.targetDate - 目標日
 * @param {string} userData.situation - 状況説明
 * @returns {Promise<void>}
 */
export async function createUser(userId, userData) {
  try {
    const { error } = await supabase
      .from('users')
      .insert({
        id: userId,
        email: userData.email,
        reason: userData.reason,
        target_date: userData.targetDate || null,
        situation: userData.situation || '',
      });
    
    if (error) throw error;
  } catch (error) {
    console.error('ユーザー情報の作成エラー:', error);
    throw error;
  }
}

/**
 * ユーザー情報を更新
 * @param {string} userId - ユーザーID
 * @param {Object} updates - 更新データ
 * @returns {Promise<void>}
 */
export async function updateUser(userId, updates) {
  try {
    const updateData = {};
    if (updates.email !== undefined) updateData.email = updates.email;
    if (updates.reason !== undefined) updateData.reason = updates.reason;
    if (updates.targetDate !== undefined) updateData.target_date = updates.targetDate;
    if (updates.situation !== undefined) updateData.situation = updates.situation;
    
    const { error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId);
    
    if (error) throw error;
  } catch (error) {
    console.error('ユーザー情報の更新エラー:', error);
    throw error;
  }
}
