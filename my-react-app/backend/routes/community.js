const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

// Supabase 클라이언트
const supabaseUrl = process.env.SUPABASE_URL || 'https://tqdvolgachfszomwhlfe.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// 입력 검증 함수
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  return input
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .trim();
};

// ==================== 게시글 API ====================

// 게시글 목록 조회
router.get('/posts', async (req, res) => {
  try {
    const { data: posts, error } = await supabase
      .from('community_posts')
      .select(`
        id,
        title,
        content,
        views,
        likes,
        created_at,
        updated_at,
        users!community_posts_user_id_fkey (username)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // 댓글 수 가져오기
    const postsWithCommentCount = await Promise.all(
      posts.map(async (post) => {
        const { count, error: countError } = await supabase
          .from('community_comments')
          .select('*', { count: 'exact', head: true })
          .eq('post_id', post.id);

        if (countError) throw countError;

        return {
          id: post.id,
          title: post.title,
          content: post.content,
          author: post.users.username,
          created_at: post.created_at,
          views: post.views,
          likes: post.likes,
          comments_count: count || 0
        };
      })
    );

    res.json({
      success: true,
      posts: postsWithCommentCount
    });
  } catch (error) {
    console.error('게시글 목록 조회 오류:', error);
    res.status(500).json({ 
      success: false, 
      error: '게시글 목록을 불러오는데 실패했습니다.' 
    });
  }
});

// 게시글 상세 조회 (조회수 증가)
router.get('/posts/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // 조회수 증가
    await supabase.rpc('increment_post_views', { post_id: parseInt(id) });

    const { data: post, error } = await supabase
      .from('community_posts')
      .select(`
        id,
        title,
        content,
        views,
        likes,
        created_at,
        updated_at,
        users!community_posts_user_id_fkey (username)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;

    if (!post) {
      return res.status(404).json({
        success: false,
        error: '게시글을 찾을 수 없습니다.'
      });
    }

    // 댓글 수 가져오기
    const { count: commentsCount } = await supabase
      .from('community_comments')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', id);

    res.json({
      success: true,
      post: {
        id: post.id,
        title: post.title,
        content: post.content,
        author: post.users.username,
        created_at: post.created_at,
        views: post.views,
        likes: post.likes,
        comments_count: commentsCount || 0
      }
    });
  } catch (error) {
    console.error('게시글 조회 오류:', error);
    res.status(500).json({ 
      success: false, 
      error: '게시글을 불러오는데 실패했습니다.' 
    });
  }
});

// 게시글 작성
router.post('/posts', async (req, res) => {
  try {
    const { userId, title, content } = req.body;

    if (!userId || !title || !content) {
      return res.status(400).json({
        success: false,
        error: '필수 필드가 누락되었습니다.'
      });
    }

    // 입력 검증
    const cleanTitle = sanitizeInput(title);
    const cleanContent = sanitizeInput(content);

    if (cleanTitle.length < 2 || cleanTitle.length > 100) {
      return res.status(400).json({
        success: false,
        error: '제목은 2-100자 사이여야 합니다.'
      });
    }

    if (cleanContent.length < 10 || cleanContent.length > 1000) {
      return res.status(400).json({
        success: false,
        error: '내용은 10-1000자 사이여야 합니다.'
      });
    }

    const { data: newPost, error } = await supabase
      .from('community_posts')
      .insert({
        user_id: userId,
        title: cleanTitle,
        content: cleanContent
      })
      .select(`
        id,
        title,
        content,
        views,
        likes,
        created_at,
        users!community_posts_user_id_fkey (username)
      `)
      .single();

    if (error) throw error;

    res.status(201).json({
      success: true,
      post: {
        id: newPost.id,
        title: newPost.title,
        content: newPost.content,
        author: newPost.users.username,
        created_at: newPost.created_at,
        views: newPost.views,
        likes: newPost.likes,
        comments_count: 0
      }
    });
  } catch (error) {
    console.error('게시글 작성 오류:', error);
    res.status(500).json({ 
      success: false, 
      error: '게시글 작성에 실패했습니다.' 
    });
  }
});

// 게시글 수정
router.put('/posts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, title, content } = req.body;

    if (!userId || !title || !content) {
      return res.status(400).json({
        success: false,
        error: '필수 필드가 누락되었습니다.'
      });
    }

    // 게시글 소유자 확인
    const { data: post, error: checkError } = await supabase
      .from('community_posts')
      .select('user_id')
      .eq('id', id)
      .single();

    if (checkError) throw checkError;

    if (!post) {
      return res.status(404).json({
        success: false,
        error: '게시글을 찾을 수 없습니다.'
      });
    }

    if (post.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: '본인의 게시글만 수정할 수 있습니다.'
      });
    }

    // 입력 검증
    const cleanTitle = sanitizeInput(title);
    const cleanContent = sanitizeInput(content);

    const { data: updatedPost, error } = await supabase
      .from('community_posts')
      .update({
        title: cleanTitle,
        content: cleanContent,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        id,
        title,
        content,
        views,
        likes,
        created_at,
        updated_at,
        users!community_posts_user_id_fkey (username)
      `)
      .single();

    if (error) throw error;

    res.json({
      success: true,
      post: {
        id: updatedPost.id,
        title: updatedPost.title,
        content: updatedPost.content,
        author: updatedPost.users.username,
        created_at: updatedPost.created_at,
        views: updatedPost.views,
        likes: updatedPost.likes
      }
    });
  } catch (error) {
    console.error('게시글 수정 오류:', error);
    res.status(500).json({ 
      success: false, 
      error: '게시글 수정에 실패했습니다.' 
    });
  }
});

// 게시글 삭제
router.delete('/posts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: '사용자 ID가 필요합니다.'
      });
    }

    // 게시글 소유자 확인
    const { data: post, error: checkError } = await supabase
      .from('community_posts')
      .select('user_id')
      .eq('id', id)
      .single();

    if (checkError) throw checkError;

    if (!post) {
      return res.status(404).json({
        success: false,
        error: '게시글을 찾을 수 없습니다.'
      });
    }

    if (post.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: '본인의 게시글만 삭제할 수 있습니다.'
      });
    }

    const { error } = await supabase
      .from('community_posts')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({
      success: true,
      message: '게시글이 삭제되었습니다.'
    });
  } catch (error) {
    console.error('게시글 삭제 오류:', error);
    res.status(500).json({ 
      success: false, 
      error: '게시글 삭제에 실패했습니다.' 
    });
  }
});

// 게시글 좋아요
router.post('/posts/:id/like', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: '사용자 ID가 필요합니다.'
      });
    }

    // 이미 좋아요를 눌렀는지 확인
    const { data: existingLike, error: checkError } = await supabase
      .from('community_post_likes')
      .select('id')
      .eq('post_id', id)
      .eq('user_id', userId)
      .single();

    if (existingLike) {
      return res.status(400).json({
        success: false,
        error: '이미 좋아요를 눌렀습니다.'
      });
    }

    // 좋아요 추가
    const { error: insertError } = await supabase
      .from('community_post_likes')
      .insert({
        post_id: id,
        user_id: userId
      });

    if (insertError) throw insertError;

    // 게시글의 likes 카운트 증가
    const { data: updatedPost, error: updateError } = await supabase
      .from('community_posts')
      .select('likes')
      .eq('id', id)
      .single();

    if (updateError) throw updateError;

    const { error: incrementError } = await supabase
      .from('community_posts')
      .update({ likes: (updatedPost.likes || 0) + 1 })
      .eq('id', id);

    if (incrementError) throw incrementError;

    res.json({
      success: true,
      message: '좋아요를 눌렀습니다.',
      likes: (updatedPost.likes || 0) + 1
    });
  } catch (error) {
    console.error('좋아요 오류:', error);
    res.status(500).json({ 
      success: false, 
      error: '좋아요 처리에 실패했습니다.' 
    });
  }
});

// ==================== 댓글 API ====================

// 댓글 목록 조회
router.get('/posts/:id/comments', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: comments, error } = await supabase
      .from('community_comments')
      .select(`
        id,
        content,
        created_at,
        users!community_comments_user_id_fkey (username)
      `)
      .eq('post_id', id)
      .order('created_at', { ascending: true });

    if (error) throw error;

    const formattedComments = comments.map(comment => ({
      id: comment.id,
      post_id: parseInt(id),
      content: comment.content,
      author: comment.users.username,
      created_at: comment.created_at
    }));

    res.json({
      success: true,
      comments: formattedComments
    });
  } catch (error) {
    console.error('댓글 목록 조회 오류:', error);
    res.status(500).json({ 
      success: false, 
      error: '댓글을 불러오는데 실패했습니다.' 
    });
  }
});

// 댓글 작성
router.post('/posts/:id/comments', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, content } = req.body;

    if (!userId || !content) {
      return res.status(400).json({
        success: false,
        error: '필수 필드가 누락되었습니다.'
      });
    }

    // 입력 검증
    const cleanContent = sanitizeInput(content);

    if (cleanContent.length < 1 || cleanContent.length > 500) {
      return res.status(400).json({
        success: false,
        error: '댓글은 1-500자 사이여야 합니다.'
      });
    }

    const { data: newComment, error } = await supabase
      .from('community_comments')
      .insert({
        post_id: id,
        user_id: userId,
        content: cleanContent
      })
      .select(`
        id,
        content,
        created_at,
        users!community_comments_user_id_fkey (username)
      `)
      .single();

    if (error) throw error;

    res.status(201).json({
      success: true,
      comment: {
        id: newComment.id,
        post_id: parseInt(id),
        content: newComment.content,
        author: newComment.users.username,
        created_at: newComment.created_at
      }
    });
  } catch (error) {
    console.error('댓글 작성 오류:', error);
    res.status(500).json({ 
      success: false, 
      error: '댓글 작성에 실패했습니다.' 
    });
  }
});

// 댓글 삭제
router.delete('/comments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: '사용자 ID가 필요합니다.'
      });
    }

    // 댓글 소유자 확인
    const { data: comment, error: checkError } = await supabase
      .from('community_comments')
      .select('user_id')
      .eq('id', id)
      .single();

    if (checkError) throw checkError;

    if (!comment) {
      return res.status(404).json({
        success: false,
        error: '댓글을 찾을 수 없습니다.'
      });
    }

    if (comment.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: '본인의 댓글만 삭제할 수 있습니다.'
      });
    }

    const { error } = await supabase
      .from('community_comments')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({
      success: true,
      message: '댓글이 삭제되었습니다.'
    });
  } catch (error) {
    console.error('댓글 삭제 오류:', error);
    res.status(500).json({ 
      success: false, 
      error: '댓글 삭제에 실패했습니다.' 
    });
  }
});

// ==================== 관리자 API ====================

// 관리자: 모든 게시글 조회 (댓글 수 포함)
router.get('/admin/posts', async (req, res) => {
  try {
    const { data: posts, error } = await supabase
      .from('community_posts')
      .select(`
        id,
        title,
        content,
        views,
        likes,
        created_at,
        updated_at,
        user_id,
        users!community_posts_user_id_fkey (username, email)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // 댓글 수 가져오기
    const postsWithCommentCount = await Promise.all(
      posts.map(async (post) => {
        const { count, error: countError } = await supabase
          .from('community_comments')
          .select('*', { count: 'exact', head: true })
          .eq('post_id', post.id);

        if (countError) throw countError;

        return {
          id: post.id,
          title: post.title,
          content: post.content,
          author: post.users.username,
          author_email: post.users.email,
          user_id: post.user_id,
          created_at: post.created_at,
          updated_at: post.updated_at,
          views: post.views,
          likes: post.likes,
          comments_count: count || 0
        };
      })
    );

    res.json({
      success: true,
      posts: postsWithCommentCount
    });
  } catch (error) {
    console.error('관리자 게시글 목록 조회 오류:', error);
    res.status(500).json({ 
      success: false, 
      error: '게시글 목록을 불러오는데 실패했습니다.' 
    });
  }
});

// 관리자: 게시글 삭제 (권한 체크 없이)
router.delete('/admin/posts/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // 먼저 댓글도 삭제 (cascade 방식)
    await supabase
      .from('community_comments')
      .delete()
      .eq('post_id', id);

    // 좋아요도 삭제
    await supabase
      .from('community_post_likes')
      .delete()
      .eq('post_id', id);

    // 게시글 삭제
    const { error } = await supabase
      .from('community_posts')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({
      success: true,
      message: '게시글이 삭제되었습니다.'
    });
  } catch (error) {
    console.error('관리자 게시글 삭제 오류:', error);
    res.status(500).json({ 
      success: false, 
      error: '게시글 삭제에 실패했습니다.' 
    });
  }
});

// 관리자: 모든 댓글 조회
router.get('/admin/comments', async (req, res) => {
  try {
    const { data: comments, error } = await supabase
      .from('community_comments')
      .select(`
        id,
        content,
        created_at,
        post_id,
        user_id,
        users!community_comments_user_id_fkey (username, email),
        community_posts!community_comments_post_id_fkey (title)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const formattedComments = comments.map(comment => ({
      id: comment.id,
      content: comment.content,
      author: comment.users.username,
      author_email: comment.users.email,
      user_id: comment.user_id,
      post_id: comment.post_id,
      post_title: comment.community_posts.title,
      created_at: comment.created_at
    }));

    res.json({
      success: true,
      comments: formattedComments
    });
  } catch (error) {
    console.error('관리자 댓글 목록 조회 오류:', error);
    res.status(500).json({ 
      success: false, 
      error: '댓글 목록을 불러오는데 실패했습니다.' 
    });
  }
});

// 관리자: 댓글 삭제 (권한 체크 없이)
router.delete('/admin/comments/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('community_comments')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({
      success: true,
      message: '댓글이 삭제되었습니다.'
    });
  } catch (error) {
    console.error('관리자 댓글 삭제 오류:', error);
    res.status(500).json({ 
      success: false, 
      error: '댓글 삭제에 실패했습니다.' 
    });
  }
});

module.exports = router;

