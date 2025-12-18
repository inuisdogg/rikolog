// ログのCRUD操作

import { supabase } from '../supabase.config.js';

/**
 * ユーザーのログ一覧を取得（時系列順）
 * @param {string} userId - ユーザーID
 * @param {Object} options - オプション
 * @param {number} options.limitCount - 取得件数制限
 * @returns {Promise<Array>} ログ配列
 */
export async function getUserLogs(userId, options = {}) {
  try {
    const { limitCount } = options;
    let query = supabase
      .from('logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (limitCount) {
      query = query.limit(limitCount);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('ログ一覧の取得エラー:', error);
    throw error;
  }
}

/**
 * カテゴリ別にログを取得
 * @param {string} userId - ユーザーID
 * @param {string} category - カテゴリ
 * @returns {Promise<Array>} ログ配列
 */
export async function getLogsByCategory(userId, category) {
  try {
    const { data, error } = await supabase
      .from('logs')
      .select('*')
      .eq('user_id', userId)
      .eq('category', category)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('カテゴリ別ログの取得エラー:', error);
    throw error;
  }
}

/**
 * 日付範囲でログを取得
 * @param {string} userId - ユーザーID
 * @param {Date} dateFrom - 開始日
 * @param {Date} dateTo - 終了日
 * @returns {Promise<Array>} ログ配列
 */
export async function getLogsByDateRange(userId, dateFrom, dateTo) {
  try {
    // 日付をYYYY/MM/DD形式に変換
    const formatDate = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}/${month}/${day}`;
    };
    
    const fromStr = formatDate(dateFrom);
    const toStr = formatDate(dateTo);
    
    const { data, error } = await supabase
      .from('logs')
      .select('*')
      .eq('user_id', userId)
      .gte('date', fromStr)
      .lte('date', toStr)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('日付範囲ログの取得エラー:', error);
    throw error;
  }
}

/**
 * ログを取得
 * @param {string} logId - ログID
 * @returns {Promise<Object|null>} ログデータ
 */
export async function getLog(logId) {
  try {
    const { data, error } = await supabase
      .from('logs')
      .select('*')
      .eq('id', logId)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('ログの取得エラー:', error);
    throw error;
  }
}

/**
 * ログを作成
 * @param {string} userId - ユーザーID
 * @param {Object} logData - ログデータ
 * @returns {Promise<string>} 作成されたログID
 */
export async function createLog(userId, logData) {
  try {
    const insertData = {
      user_id: userId,
      date: logData.date,
      time: logData.time,
      category: logData.category,
      location: logData.location,
      content: logData.content,
      attachments: logData.attachments || [],
      medical: logData.medical || null,
      comments: logData.comments || [],
    };
    
    const { data, error } = await supabase
      .from('logs')
      .insert(insertData)
      .select('id')
      .single();
    
    if (error) throw error;
    return data.id;
  } catch (error) {
    console.error('ログの作成エラー:', error);
    throw error;
  }
}

/**
 * ログを更新
 * @param {string} logId - ログID
 * @param {Object} updates - 更新データ
 * @returns {Promise<void>}
 */
export async function updateLog(logId, updates) {
  try {
    const updateData = {};
    if (updates.date !== undefined) updateData.date = updates.date;
    if (updates.time !== undefined) updateData.time = updates.time;
    if (updates.category !== undefined) updateData.category = updates.category;
    if (updates.location !== undefined) updateData.location = updates.location;
    if (updates.content !== undefined) updateData.content = updates.content;
    if (updates.attachments !== undefined) updateData.attachments = updates.attachments;
    if (updates.medical !== undefined) updateData.medical = updates.medical;
    if (updates.comments !== undefined) updateData.comments = updates.comments;
    
    const { error } = await supabase
      .from('logs')
      .update(updateData)
      .eq('id', logId);
    
    if (error) throw error;
  } catch (error) {
    console.error('ログの更新エラー:', error);
    throw error;
  }
}

/**
 * ログを削除
 * @param {string} logId - ログID
 * @returns {Promise<void>}
 */
export async function deleteLog(logId) {
  try {
    const { error } = await supabase
      .from('logs')
      .delete()
      .eq('id', logId);
    
    if (error) throw error;
  } catch (error) {
    console.error('ログの削除エラー:', error);
    throw error;
  }
}
