import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  getCommunityPosts,
  getCommunityComments,
  createCommunityPost,
  createCommunityComment,
  likeCommunityPost,
  CommunityPost,
  CommunityComment
} from '../utils/api';

export function CommunityPage() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [selectedPost, setSelectedPost] = useState<CommunityPost | null>(null);
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [newComment, setNewComment] = useState('');
  const [showNewPostForm, setShowNewPostForm] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPosts();
  }, []);

  useEffect(() => {
    if (selectedPost) {
      loadComments(selectedPost.id);
    }
  }, [selectedPost]);

  const loadPosts = async () => {
    try {
      setLoading(true);
      const postsData = await getCommunityPosts();
      setPosts(postsData);
    } catch (error) {
      console.error('게시글 로드 오류:', error);
      toast.error('게시글을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const loadComments = async (postId: number) => {
    try {
      const commentsData = await getCommunityComments(postId);
      setComments(commentsData);
    } catch (error) {
      console.error('댓글 로드 오류:', error);
      toast.error('댓글을 불러오는데 실패했습니다.');
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isAuthenticated || !user) {
      toast.error('로그인이 필요합니다.');
      navigate('/login');
      return;
    }

    if (!newPostTitle.trim() || !newPostContent.trim()) {
      toast.error('제목과 내용을 입력해주세요.');
      return;
    }

    try {
      const newPost = await createCommunityPost(user.id, newPostTitle, newPostContent);
      setPosts([newPost, ...posts]);
      setNewPostTitle('');
      setNewPostContent('');
      setShowNewPostForm(false);
      toast.success('게시글이 작성되었습니다!');
    } catch (error: any) {
      console.error('게시글 작성 오류:', error);
      toast.error(error.message || '게시글 작성에 실패했습니다.');
    }
  };

  const handleCreateComment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isAuthenticated || !user) {
      toast.error('로그인이 필요합니다.');
      navigate('/login');
      return;
    }

    if (!newComment.trim()) {
      toast.error('댓글 내용을 입력해주세요.');
      return;
    }

    if (!selectedPost) return;

    try {
      const comment = await createCommunityComment(selectedPost.id, user.id, newComment);
      setComments([...comments, comment]);
      setNewComment('');
      toast.success('댓글이 작성되었습니다!');
      
      // 댓글 수 업데이트
      const updatedPosts = posts.map(post => 
        post.id === selectedPost.id 
          ? { ...post, comments_count: post.comments_count + 1 }
          : post
      );
      setPosts(updatedPosts);
      
      if (selectedPost) {
        setSelectedPost({ ...selectedPost, comments_count: selectedPost.comments_count + 1 });
      }
    } catch (error: any) {
      console.error('댓글 작성 오류:', error);
      toast.error(error.message || '댓글 작성에 실패했습니다.');
    }
  };

  const handlePostClick = (post: CommunityPost) => {
    setSelectedPost(post);
  };

  const handleLike = async (postId: number) => {
    if (!isAuthenticated || !user) {
      toast.error('로그인이 필요합니다.');
      return;
    }

    try {
      const newLikes = await likeCommunityPost(postId, user.id);
      
      const updatedPosts = posts.map(post => 
        post.id === postId ? { ...post, likes: newLikes } : post
      );
      setPosts(updatedPosts);
      
      if (selectedPost && selectedPost.id === postId) {
        setSelectedPost({ ...selectedPost, likes: newLikes });
      }
      
      toast.success('좋아요를 눌렀습니다!');
    } catch (error: any) {
      console.error('좋아요 오류:', error);
      toast.error(error.message || '좋아요 처리에 실패했습니다.');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `${minutes}분 전`;
    if (hours < 24) return `${hours}시간 전`;
    if (days < 7) return `${days}일 전`;
    return date.toLocaleDateString('ko-KR');
  };

  return (
    <div className="community-page">
      <div className="community-container">
        <div className="community-header">
          <h1>커뮤니티</h1>
          <p>쇼핑몰 정보를 공유하고 소통하는 공간입니다</p>
        </div>

        {/* 게시글 작성 버튼 */}
        <div className="post-actions">
          <button 
            onClick={() => {
              if (!isAuthenticated) {
                toast.error('로그인이 필요합니다.');
                navigate('/login');
                return;
              }
              setShowNewPostForm(!showNewPostForm);
            }}
            className="btn btn-primary"
          >
            {showNewPostForm ? '취소' : '글쓰기'}
          </button>
        </div>

        {/* 새 게시글 작성 폼 */}
        {showNewPostForm && (
          <div className="new-post-form">
            <h3>새 게시글 작성</h3>
            <form onSubmit={handleCreatePost}>
              <input
                type="text"
                placeholder="제목을 입력하세요"
                value={newPostTitle}
                onChange={(e) => setNewPostTitle(e.target.value)}
                className="form-input"
                maxLength={100}
              />
              <textarea
                placeholder="내용을 입력하세요"
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                className="form-textarea"
                rows={6}
                maxLength={1000}
              />
              <div className="form-actions">
                <button type="submit" className="btn btn-primary">
                  작성하기
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowNewPostForm(false)}
                  className="btn btn-secondary"
                >
                  취소
                </button>
              </div>
            </form>
          </div>
        )}

        {/* 게시글 목록 */}
        <div className="posts-section">
          {selectedPost ? (
            // 게시글 상세 보기
            <div className="post-detail">
              <button 
                onClick={() => setSelectedPost(null)}
                className="btn btn-back"
              >
                ← 목록으로
              </button>
              
              <div className="post-detail-header">
                <h2>{selectedPost.title}</h2>
                <div className="post-meta">
                  <span className="author">작성자: {selectedPost.author}</span>
                  <span className="date">{formatDate(selectedPost.created_at)}</span>
                  <span className="views">조회 {selectedPost.views}</span>
                  <span className="likes">👍 {selectedPost.likes}</span>
                </div>
              </div>

              <div className="post-detail-content">
                {selectedPost.content}
              </div>

              <div className="post-actions-bar">
                <button 
                  onClick={() => handleLike(selectedPost.id)}
                  className="btn btn-like"
                >
                  👍 좋아요 ({selectedPost.likes})
                </button>
              </div>

              {/* 댓글 섹션 */}
              <div className="comments-section">
                <h3>댓글 ({comments.length})</h3>
                
                {/* 댓글 작성 폼 */}
                {isAuthenticated ? (
                  <form onSubmit={handleCreateComment} className="comment-form">
                    <textarea
                      placeholder="댓글을 입력하세요"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      className="form-textarea"
                      rows={3}
                      maxLength={500}
                    />
                    <button type="submit" className="btn btn-primary">
                      댓글 작성
                    </button>
                  </form>
                ) : (
                  <div className="login-required">
                    <p>댓글을 작성하려면 로그인이 필요합니다.</p>
                    <button onClick={() => navigate('/login')} className="btn btn-primary">
                      로그인하기
                    </button>
                  </div>
                )}

                {/* 댓글 목록 */}
                <div className="comments-list">
                  {comments.map(comment => (
                    <div key={comment.id} className="comment-item">
                      <div className="comment-header">
                        <span className="comment-author">{comment.author}</span>
                        <span className="comment-date">{formatDate(comment.created_at)}</span>
                      </div>
                      <div className="comment-content">{comment.content}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            // 게시글 목록
            <div className="posts-list">
              {loading ? (
                <div className="loading">게시글을 불러오는 중...</div>
              ) : posts.length === 0 ? (
                <div className="no-posts">
                  <p>아직 작성된 게시글이 없습니다.</p>
                  <p>첫 번째 글을 작성해보세요!</p>
                </div>
              ) : (
                posts.map(post => (
                  <div 
                    key={post.id} 
                    className="post-item"
                    onClick={() => handlePostClick(post)}
                  >
                    <div className="post-item-header">
                      <h3>{post.title}</h3>
                      <div className="post-stats">
                        <span className="views">👁️ {post.views}</span>
                        <span className="likes">👍 {post.likes}</span>
                        <span className="comments">💬 {post.comments_count}</span>
                      </div>
                    </div>
                    <div className="post-item-content">
                      {post.content.substring(0, 100)}
                      {post.content.length > 100 && '...'}
                    </div>
                    <div className="post-item-footer">
                      <span className="author">{post.author}</span>
                      <span className="date">{formatDate(post.created_at)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      <style>{`
        .community-page {
          max-width: 1200px;
          margin: 0 auto;
          padding: 40px 20px;
        }

        .community-header {
          text-align: center;
          margin-bottom: 40px;
        }

        .community-header h1 {
          font-size: 2.5rem;
          color: #2c3e50;
          margin-bottom: 10px;
        }

        .community-header p {
          color: #7f8c8d;
          font-size: 1.1rem;
        }

        .post-actions {
          margin-bottom: 20px;
          text-align: right;
        }

        .new-post-form {
          background: white;
          padding: 30px;
          border-radius: 12px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          margin-bottom: 30px;
        }

        .new-post-form h3 {
          margin-bottom: 20px;
          color: #2c3e50;
        }

        .form-input, .form-textarea {
          width: 100%;
          padding: 12px;
          border: 1px solid #ddd;
          border-radius: 8px;
          margin-bottom: 15px;
          font-size: 1rem;
          font-family: inherit;
        }

        .form-textarea {
          resize: vertical;
        }

        .form-actions {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
        }

        .posts-list {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .post-item {
          background: white;
          padding: 25px;
          border-radius: 12px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .post-item:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        }

        .post-item-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
        }

        .post-item-header h3 {
          font-size: 1.3rem;
          color: #2c3e50;
          margin: 0;
        }

        .post-stats {
          display: flex;
          gap: 15px;
          font-size: 0.9rem;
          color: #7f8c8d;
        }

        .post-item-content {
          color: #555;
          line-height: 1.6;
          margin-bottom: 15px;
        }

        .post-item-footer {
          display: flex;
          justify-content: space-between;
          font-size: 0.9rem;
          color: #7f8c8d;
        }

        .post-detail {
          background: white;
          padding: 30px;
          border-radius: 12px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }

        .post-detail-header {
          border-bottom: 2px solid #eee;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }

        .post-detail-header h2 {
          font-size: 2rem;
          color: #2c3e50;
          margin-bottom: 15px;
        }

        .post-meta {
          display: flex;
          gap: 20px;
          font-size: 0.9rem;
          color: #7f8c8d;
        }

        .post-detail-content {
          font-size: 1.1rem;
          line-height: 1.8;
          color: #333;
          margin-bottom: 30px;
          white-space: pre-wrap;
        }

        .post-actions-bar {
          border-top: 2px solid #eee;
          padding-top: 20px;
          margin-bottom: 30px;
        }

        .comments-section {
          border-top: 2px solid #eee;
          padding-top: 30px;
        }

        .comments-section h3 {
          margin-bottom: 20px;
          color: #2c3e50;
        }

        .comment-form {
          margin-bottom: 30px;
        }

        .comments-list {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        .comment-item {
          background: #f8f9fa;
          padding: 15px;
          border-radius: 8px;
        }

        .comment-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 10px;
        }

        .comment-author {
          font-weight: bold;
          color: #2c3e50;
        }

        .comment-date {
          font-size: 0.85rem;
          color: #7f8c8d;
        }

        .comment-content {
          color: #555;
          line-height: 1.6;
        }

        .login-required {
          background: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
          text-align: center;
          margin-bottom: 30px;
        }

        .login-required p {
          margin-bottom: 15px;
          color: #7f8c8d;
        }

        .loading, .no-posts {
          text-align: center;
          padding: 60px 20px;
          color: #7f8c8d;
        }

        .btn {
          padding: 10px 20px;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 1rem;
          font-weight: 500;
          transition: all 0.2s;
        }

        .btn-primary {
          background: #3498db;
          color: white;
        }

        .btn-primary:hover {
          background: #2980b9;
        }

        .btn-secondary {
          background: #95a5a6;
          color: white;
        }

        .btn-secondary:hover {
          background: #7f8c8d;
        }

        .btn-back {
          background: #ecf0f1;
          color: #2c3e50;
          margin-bottom: 20px;
        }

        .btn-back:hover {
          background: #bdc3c7;
        }

        .btn-like {
          background: #e74c3c;
          color: white;
        }

        .btn-like:hover {
          background: #c0392b;
        }

        @media (max-width: 768px) {
          .community-header h1 {
            font-size: 2rem;
          }

          .post-item-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 10px;
          }

          .post-stats {
            width: 100%;
          }

          .post-detail-header h2 {
            font-size: 1.5rem;
          }

          .post-meta {
            flex-wrap: wrap;
            gap: 10px;
          }
        }
      `}</style>
    </div>
  );
}

