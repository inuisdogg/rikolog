// ユーザー情報のCRUD操作

import { supabase } from '../supabase.config.js';
import { getDeviceType, getDeviceInfo } from './device.js';

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
    // デバイス情報を取得
    const deviceType = getDeviceType();
    const deviceInfo = getDeviceInfo();
    
    const { error } = await supabase
      .from('users')
      .insert({
        id: userId,
        email: userData.email,
        reason: userData.reason,
        target_date: userData.targetDate || null,
        situation: userData.situation || '',
        calculator_passcode: userData.calculatorPasscode || '7777', // デフォルト値
        device_type: deviceType, // デバイスタイプ
        device_info: deviceInfo, // デバイス情報（JSON形式）
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
    if (updates.calculatorPasscode !== undefined) updateData.calculator_passcode = updates.calculatorPasscode;
    if (updates.deviceType !== undefined) updateData.device_type = updates.deviceType;
    if (updates.deviceInfo !== undefined) updateData.device_info = updates.deviceInfo;
    
    // 更新データが空の場合はエラー
    if (Object.keys(updateData).length === 0) {
      throw new Error('更新するデータが指定されていません');
    }
    
    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select();
    
    if (error) {
      console.error('Supabase更新エラー:', error);
      // エラーメッセージをより分かりやすく
      let errorMessage = error.message || 'データベースの更新に失敗しました';
      
      // よくあるエラーの詳細化
      if (error.code === '42501') {
        errorMessage = '権限がありません。ログインし直してください。';
      } else if (error.code === 'PGRST116') {
        errorMessage = 'ユーザー情報が見つかりませんでした。';
      } else if (error.code === '23505') {
        errorMessage = 'この値は既に使用されています。';
      }
      
      const enhancedError = new Error(errorMessage);
      enhancedError.originalError = error;
      throw enhancedError;
    }
    
    // 更新されたデータを返す
    return data?.[0] || null;
  } catch (error) {
    console.error('ユーザー情報の更新エラー:', error);
    throw error;
  }
}
