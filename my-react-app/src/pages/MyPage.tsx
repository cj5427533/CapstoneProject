import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';
import { 
  getUserReports, 
  deleteUserReport,
  getCommunityPosts,
  deleteCommunityPost,
  updateCommunityPost,
  type Report,
  type CommunityPost 
} from '../utils/api';

type TabType = 'reports' | 'community';

export function MyPage() {
  const navigate = useNavigate();
  const { isAuthenticated, user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('reports');
  const [reports, setReports] = useState<Report[]>([]);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingPost, setEditingPost] = useState<CommunityPost | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');

  // 로그인 체크 (loading이 완료된 후에만 체크)
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      toast.error('로그인이 필요한 페이지입니다.');
      navigate('/login');
    }
  }, [loading, isAuthenticated, navigate]);

  // 신고 목록 로드
  const loadReports = async () => {
    if (!user?.username) return;
    
    setIsLoading(true);
    try {
      const userReports = await getUserReports(user.username);
      setReports(userReports);
    } catch (error) {
      console.error('신고 목록 로드 에러:', error);
      toast.error('신고 목록을 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 커뮤니티 게시글 로드 (내가 작성한 글만)
  const loadPosts = async () => {
    if (!user?.username) return;
    
    setIsLoading(true);
    try {
      const allPosts = await getCommunityPosts();
      // 내가 작성한 글만 필터링
      const myPosts = allPosts.filter(post => post.author === user.username);
      setPosts(myPosts);
    } catch (error) {
      console.error('게시글 목록 로드 에러:', error);
      toast.error('게시글 목록을 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 데이터 로드 (탭에 따라)
  useEffect(() => {
    if (!loading && isAuthenticated) {
      if (activeTab === 'reports') {
        loadReports();
      } else {
        loadPosts();
      }
    } else if (!loading) {
      setIsLoading(false);
    }
  }, [loading, isAuthenticated, activeTab, user?.username]);

  // 신고 수정
  const handleEdit = (report: Report) => {
    const shopUrl = report.shops?.url || '';
    navigate(`/report?url=${encodeURIComponent(shopUrl)}`);
  };

  // 신고 삭제
  const handleDeleteReport = async (reportId: number, shopName: string) => {
    if (!confirm(`'${shopName}' 쇼핑몰에 대한 신고를 삭제하시겠습니까?`)) {
      return;
    }

    try {
      await deleteUserReport(reportId, user?.username || '');
      toast.success('신고가 삭제되었습니다.');
      loadReports();
    } catch (error) {
      console.error('신고 삭제 에러:', error);
      toast.error(error instanceof Error ? error.message : '신고 삭제에 실패했습니다.');
    }
  };

  // 게시글 수정 모드 시작
  const handleStartEdit = (post: CommunityPost) => {
    setEditingPost(post);
    setEditTitle(post.title);
    setEditContent(post.content);
  };

  // 게시글 수정 취소
  const handleCancelEdit = () => {
    setEditingPost(null);
    setEditTitle('');
    setEditContent('');
  };

  // 게시글 수정 저장
  const handleSaveEdit = async () => {
    if (!editingPost || !user) return;

    if (!editTitle.trim() || !editContent.trim()) {
      toast.error('제목과 내용을 입력해주세요.');
      return;
    }

    try {
      await updateCommunityPost(editingPost.id, user.id, editTitle, editContent);
      toast.success('게시글이 수정되었습니다.');
      setEditingPost(null);
      setEditTitle('');
      setEditContent('');
      loadPosts();
    } catch (error: any) {
      console.error('게시글 수정 에러:', error);
      toast.error(error.message || '게시글 수정에 실패했습니다.');
    }
  };

  // 게시글 삭제
  const handleDeletePost = async (postId: number, title: string) => {
    if (!confirm(`'${title}' 게시글을 삭제하시겠습니까?`)) {
      return;
    }

    if (!user) return;

    try {
      await deleteCommunityPost(postId, user.id);
      toast.success('게시글이 삭제되었습니다.');
      loadPosts();
    } catch (error: any) {
      console.error('게시글 삭제 에러:', error);
      toast.error(error.message || '게시글 삭제에 실패했습니다.');
    }
  };

  // 게시글 상세 보기
  const handleViewPost = () => {
    navigate('/community');
  };

  // 쇼핑몰 페이지로 이동
  const handleViewShop = (shopUrl: string) => {
    navigate(`/search?url=${encodeURIComponent(shopUrl)}`);
  };

  // 로딩 중이거나 인증되지 않은 경우
  if (loading) {
    return (
      <div className="mypage-container">
        <div className="loading-message">
          <p>로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  // 날짜 포맷 함수
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="mypage-container">
      <div className="mypage-header">
        <h1>마이페이지</h1>
        <div className="user-info-box">
          <p><strong>사용자 :</strong>{user?.username}</p>
          <p><strong>이메일 :</strong>{user?.email}</p>
          <p><strong>연락처 :</strong>{user?.phoneNumber || '정보 없음'}</p>
        </div>
      </div>

      {/* 탭 메뉴 */}
      <div className="tab-menu">
        <button
          className={`tab-button ${activeTab === 'reports' ? 'active' : ''}`}
          onClick={() => setActiveTab('reports')}
        >
          신고 내역
        </button>
        <button
          className={`tab-button ${activeTab === 'community' ? 'active' : ''}`}
          onClick={() => setActiveTab('community')}
        >
          커뮤니티 글
        </button>
      </div>

      {/* 신고 내역 탭 */}
      {activeTab === 'reports' && (
        <div className="mypage-section">
          <h2>내가 신고한 쇼핑몰 ({reports.length}개)</h2>
        
        {isLoading ? (
          <div className="loading-message">
            <p>신고 목록을 불러오는 중...</p>
          </div>
        ) : reports.length === 0 ? (
          <div className="empty-message">
            <p>아직 신고한 쇼핑몰이 없습니다.</p>
            <p>의심스러운 쇼핑몰이 있다면 신고해주세요!</p>
          </div>
        ) : (
          <div className="reports-list">
            {reports.map((report) => {
              const categories = JSON.parse(report.categories);
              const shopName = report.shops?.name || report.shops?.url || '알 수 없는 쇼핑몰';
              const shopUrl = report.shops?.url || '';
              
              return (
                <div key={report.id} className="report-card">
                  <div className="report-card-header">
                    <h3 
                      className="shop-name-link"
                      onClick={() => handleViewShop(shopUrl)}
                      style={{ cursor: 'pointer' }}
                    >
                      {shopName}
                    </h3>
                    <span className="report-date">
                      {formatDate(report.created_at)}
                    </span>
                  </div>
                  
                  <div className="report-card-body">
                    <div className="report-categories">
                      <strong>신고 카테고리:</strong>
                      <div className="category-tags">
                        {categories.map((category: string, index: number) => (
                          <span key={index} className="category-tag">
                            {category}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    <div className="report-description">
                      <strong>상세 설명:</strong>
                      <p>{report.description}</p>
                    </div>

                    <div className="report-shop-url">
                      <strong>쇼핑몰 URL:</strong>
                      <a 
                        href={`/search?url=${encodeURIComponent(shopUrl)}`}
                        onClick={(e) => {
                          e.preventDefault();
                          handleViewShop(shopUrl);
                        }}
                      >
                        {shopUrl}
                      </a>
                    </div>
                  </div>
                  
                  <div className="report-card-actions">
                    <button 
                      className="action-btn edit-btn"
                      onClick={() => handleEdit(report)}
                    >
                      수정
                    </button>
                    <button 
                      className="action-btn delete-btn"
                      onClick={() => handleDeleteReport(report.id, shopName)}
                    >
                      삭제
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        </div>
      )}

      {/* 커뮤니티 글 탭 */}
      {activeTab === 'community' && (
        <div className="mypage-section">
          <h2>내가 작성한 게시글 ({posts.length}개)</h2>
          
          {isLoading ? (
            <div className="loading-message">
              <p>게시글을 불러오는 중...</p>
            </div>
          ) : posts.length === 0 ? (
            <div className="empty-message">
              <p>아직 작성한 게시글이 없습니다.</p>
              <p>커뮤니티에서 첫 게시글을 작성해보세요!</p>
              <button 
                onClick={() => navigate('/community')}
                className="action-btn edit-btn"
                style={{ marginTop: '1rem' }}
              >
                커뮤니티 가기
              </button>
            </div>
          ) : (
            <div className="posts-list">
              {posts.map((post) => (
                <div key={post.id} className="post-card">
                  {editingPost?.id === post.id ? (
                    // 수정 모드
                    <div className="edit-form">
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="edit-input"
                        placeholder="제목"
                        maxLength={100}
                      />
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="edit-textarea"
                        placeholder="내용"
                        rows={6}
                        maxLength={1000}
                      />
                      <div className="edit-actions">
                        <button onClick={handleSaveEdit} className="action-btn edit-btn">
                          저장
                        </button>
                        <button onClick={handleCancelEdit} className="action-btn cancel-btn">
                          취소
                        </button>
                      </div>
                    </div>
                  ) : (
                    // 보기 모드
                    <>
                      <div className="post-card-header">
                        <h3 
                          className="post-title-link"
                          onClick={handleViewPost}
                          style={{ cursor: 'pointer' }}
                        >
                          {post.title}
                        </h3>
                        <span className="post-date">
                          {formatDate(post.created_at)}
                        </span>
                      </div>
                      
                      <div className="post-card-body">
                        <p className="post-content">
                          {post.content.length > 150
                            ? post.content.substring(0, 150) + '...'
                            : post.content}
                        </p>
                      </div>

                      <div className="post-stats">
                        <span>조회수: {post.views}</span>
                        <span>좋아요: {post.likes}</span>
                        <span>댓글: {post.comments_count}</span>
                      </div>
                      
                      <div className="post-card-actions">
                        <button 
                          className="action-btn edit-btn"
                          onClick={() => handleStartEdit(post)}
                        >
                          수정
                        </button>
                        <button 
                          className="action-btn delete-btn"
                          onClick={() => handleDeletePost(post.id, post.title)}
                        >
                          삭제
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <style>{`
        .mypage-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem;
        }

        .mypage-header {
          margin-bottom: 2rem;
        }

        .mypage-header h1 {
          font-size: 2rem;
          margin-bottom: 1rem;
          color: #333;
        }

        .user-info-box {
          background: #f8f9fa;
          padding: 1.5rem;
          border-radius: 8px;
          border-left: 4px solid #007bff;
        }

        .tab-menu {
          display: flex;
          gap: 1rem;
          margin-bottom: 2rem;
          border-bottom: 2px solid #e0e0e0;
        }

        .tab-button {
          padding: 1rem 2rem;
          background: none;
          border: none;
          border-bottom: 3px solid transparent;
          font-size: 1.1rem;
          font-weight: 500;
          color: #666;
          cursor: pointer;
          transition: all 0.3s;
        }

        .tab-button:hover {
          color: #007bff;
        }

        .tab-button.active {
          color: #007bff;
          border-bottom-color: #007bff;
        }

        .user-info-box p {
          margin: 0.5rem 0;
          color: #555;
        }

        .user-info-box strong {
          color: #333;
          margin-right: 0.5rem;
        }

        .mypage-section {
          background: white;
          padding: 2rem;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .mypage-section h2 {
          font-size: 1.5rem;
          margin-bottom: 1.5rem;
          color: #333;
          border-bottom: 2px solid #007bff;
          padding-bottom: 0.5rem;
        }

        .loading-message,
        .empty-message {
          text-align: center;
          padding: 3rem;
          color: #666;
        }

        .empty-message p:first-child {
          font-size: 1.1rem;
          font-weight: 500;
          margin-bottom: 0.5rem;
        }

        .reports-list {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .report-card {
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          padding: 1.5rem;
          transition: box-shadow 0.3s;
        }

        .report-card:hover {
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }

        .report-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
          padding-bottom: 0.75rem;
          border-bottom: 1px solid #e0e0e0;
        }

        .shop-name-link {
          font-size: 1.25rem;
          color: #007bff;
          margin: 0;
          text-decoration: underline;
        }

        .shop-name-link:hover {
          color: #0056b3;
        }

        .report-date {
          color: #999;
          font-size: 0.9rem;
        }

        .report-card-body {
          margin-bottom: 1rem;
        }

        .report-categories,
        .report-description,
        .report-shop-url {
          margin-bottom: 1rem;
        }

        .report-categories strong,
        .report-description strong,
        .report-shop-url strong {
          display: block;
          margin-bottom: 0.5rem;
          color: #333;
        }

        .category-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .category-tag {
          background: #e3f2fd;
          color: #1976d2;
          padding: 0.25rem 0.75rem;
          border-radius: 16px;
          font-size: 0.85rem;
        }

        .report-description p {
          color: #555;
          line-height: 1.6;
          margin: 0;
        }

        .report-shop-url a {
          color: #007bff;
          text-decoration: none;
          word-break: break-all;
        }

        .report-shop-url a:hover {
          text-decoration: underline;
        }

        .report-card-actions {
          display: flex;
          gap: 0.5rem;
          justify-content: flex-end;
          padding-top: 1rem;
          border-top: 1px solid #e0e0e0;
        }

        .action-btn {
          padding: 0.5rem 1.5rem;
          border: none;
          border-radius: 4px;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.3s;
        }

        .edit-btn {
          background: #007bff;
          color: white;
        }

        .edit-btn:hover {
          background: #0056b3;
        }

        .delete-btn {
          background: #dc3545;
          color: white;
        }

        .delete-btn:hover {
          background: #c82333;
        }

        .cancel-btn {
          background: #6c757d;
          color: white;
        }

        .cancel-btn:hover {
          background: #5a6268;
        }

        /* 커뮤니티 게시글 스타일 */
        .posts-list {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .post-card {
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          padding: 1.5rem;
          background: white;
          transition: box-shadow 0.3s;
        }

        .post-card:hover {
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }

        .post-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
          padding-bottom: 0.75rem;
          border-bottom: 1px solid #e0e0e0;
        }

        .post-title-link {
          font-size: 1.25rem;
          color: #007bff;
          margin: 0;
          text-decoration: underline;
        }

        .post-title-link:hover {
          color: #0056b3;
        }

        .post-date {
          color: #999;
          font-size: 0.9rem;
        }

        .post-card-body {
          margin-bottom: 1rem;
        }

        .post-content {
          color: #555;
          line-height: 1.6;
          margin: 0;
          white-space: pre-wrap;
        }

        .post-stats {
          display: flex;
          gap: 1.5rem;
          margin-bottom: 1rem;
          padding: 0.75rem;
          background: #f8f9fa;
          border-radius: 4px;
          font-size: 0.9rem;
          color: #666;
        }

        .post-card-actions {
          display: flex;
          gap: 0.5rem;
          justify-content: flex-end;
          padding-top: 1rem;
          border-top: 1px solid #e0e0e0;
        }

        /* 수정 폼 스타일 */
        .edit-form {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .edit-input,
        .edit-textarea {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 1rem;
          font-family: inherit;
        }

        .edit-input:focus,
        .edit-textarea:focus {
          outline: none;
          border-color: #007bff;
          box-shadow: 0 0 0 3px rgba(0,123,255,0.1);
        }

        .edit-textarea {
          resize: vertical;
          min-height: 150px;
        }

        .edit-actions {
          display: flex;
          gap: 0.5rem;
          justify-content: flex-end;
        }

        @media (max-width: 768px) {
          .mypage-container {
            padding: 1rem;
          }

          .tab-menu {
            gap: 0.5rem;
          }

          .tab-button {
            padding: 0.75rem 1rem;
            font-size: 1rem;
          }

          .report-card-header,
          .post-card-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.5rem;
          }

          .report-card-actions,
          .post-card-actions,
          .edit-actions {
            flex-direction: column;
          }

          .action-btn {
            width: 100%;
          }

          .post-stats {
            flex-direction: column;
            gap: 0.5rem;
          }
        }
      `}</style>
    </div>
  );
}

