// 掲示板のCRUD操作

import { supabase } from '../supabase.config.js';

/**
 * 掲示板の投稿一覧を取得
 * @param {Object} options - オプション
 * @param {number} options.limitCount - 取得件数制限
 * @param {string} options.category - カテゴリでフィルタ
 * @returns {Promise<Array>} 投稿配列
 */
export async function getBoardPosts(options = {}) {
  try {
    const { limitCount = 50, category } = options;
    let query = supabase
      .from('board_posts')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (category && category !== 'all') {
      query = query.eq('category', category);
    }
    
    if (limitCount) {
      query = query.limit(limitCount);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('掲示板投稿の取得エラー:', error);
    throw error;
  }
}

/**
 * 投稿を取得
 * @param {string} postId - 投稿ID
 * @returns {Promise<Object|null>} 投稿データ
 */
export async function getBoardPost(postId) {
  try {
    const { data, error } = await supabase
      .from('board_posts')
      .select('*')
      .eq('id', postId)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('投稿の取得エラー:', error);
    throw error;
  }
}

/**
 * 投稿を作成
 * @param {string} userId - ユーザーID（匿名の場合はnull）
 * @param {Object} postData - 投稿データ
 * @param {string} postData.author - 表示名
 * @param {string} postData.title - タイトル
 * @param {string} postData.content - 内容
 * @param {string} postData.category - カテゴリ
 * @returns {Promise<string>} 作成された投稿ID
 */
export async function createBoardPost(userId, postData) {
  try {
    const insertData = {
      user_id: userId || null,
      author: postData.author || '匿名',
      title: postData.title,
      content: postData.content,
      category: postData.category || 'other',
      reactions: { like: 0, thumbsUp: 0 },
      replies: [],
    };
    
    const { data, error } = await supabase
      .from('board_posts')
      .insert(insertData)
      .select('id')
      .single();
    
    if (error) throw error;
    return data.id;
  } catch (error) {
    console.error('投稿の作成エラー:', error);
    throw error;
  }
}

/**
 * 投稿を更新
 * @param {string} postId - 投稿ID
 * @param {Object} updates - 更新データ
 * @returns {Promise<void>}
 */
export async function updateBoardPost(postId, updates) {
  try {
    const { error } = await supabase
      .from('board_posts')
      .update(updates)
      .eq('id', postId);
    
    if (error) throw error;
  } catch (error) {
    console.error('投稿の更新エラー:', error);
    throw error;
  }
}

/**
 * リアクションを追加
 * @param {string} postId - 投稿ID
 * @param {string} reactionType - リアクションタイプ（'like' または 'thumbsUp'）
 * @returns {Promise<void>}
 */
export async function addReaction(postId, reactionType) {
  try {
    const post = await getBoardPost(postId);
    if (!post) throw new Error('投稿が見つかりません');
    
    const currentReactions = post.reactions || { like: 0, thumbsUp: 0 };
    const updatedReactions = {
      ...currentReactions,
      [reactionType]: (currentReactions[reactionType] || 0) + 1,
    };
    
    await updateBoardPost(postId, { reactions: updatedReactions });
  } catch (error) {
    console.error('リアクションの追加エラー:', error);
    throw error;
  }
}

/**
 * 返信を追加
 * @param {string} postId - 投稿ID
 * @param {Object} replyData - 返信データ
 * @param {string} replyData.author - 表示名
 * @param {string} replyData.content - 内容
 * @returns {Promise<void>}
 */
export async function addReply(postId, replyData) {
  try {
    const post = await getBoardPost(postId);
    if (!post) throw new Error('投稿が見つかりません');
    
    const replies = post.replies || [];
    const newReply = {
      id: `reply_${Date.now()}`,
      author: replyData.author || '匿名',
      content: replyData.content,
      created_at: new Date().toISOString(),
    };
    
    await updateBoardPost(postId, {
      replies: [...replies, newReply],
    });
  } catch (error) {
    console.error('返信の追加エラー:', error);
    throw error;
  }
}

/**
 * 投稿を削除
 * @param {string} postId - 投稿ID
 * @returns {Promise<void>}
 */
export async function deleteBoardPost(postId) {
  try {
    const { error } = await supabase
      .from('board_posts')
      .delete()
      .eq('id', postId);
    
    if (error) throw error;
  } catch (error) {
    console.error('投稿の削除エラー:', error);
    throw error;
  }
}
