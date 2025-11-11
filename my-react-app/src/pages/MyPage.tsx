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
import './MyPage.css';

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

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      toast.error('로그인이 필요한 페이지입니다.');
      navigate('/login');
    }
  }, [loading, isAuthenticated, navigate]);

  const loadReports = async () => {
    if (!user?.username) return;

    setIsLoading(true);
    try {
      const userReports = await getUserReports(user.username);
      setReports(userReports);
    } catch (error) {
      console.error('피해 사례 제보 목록 로드 에러:', error);
      toast.error('피해 사례 제보 목록을 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadPosts = async () => {
    if (!user?.username) return;

    setIsLoading(true);
    try {
      const allPosts = await getCommunityPosts();
      const myPosts = allPosts.filter(post => post.author === user.username);
      setPosts(myPosts);
    } catch (error) {
      console.error('게시글 목록 로드 에러:', error);
      toast.error('게시글 목록을 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

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

  const handleEdit = (report: Report) => {
    const shopUrl = report.shops?.url || '';
    navigate(`/report?url=${encodeURIComponent(shopUrl)}`);
  };

  const handleDeleteReport = async (reportId: number, shopName: string) => {
    if (!confirm(`'${shopName}' 쇼핑몰에 대한 피해 사례 제보를 삭제하시겠습니까?`)) {
      return;
    }

    try {
      await deleteUserReport(reportId, user?.username || '');
      toast.success('피해 사례 제보가 삭제되었습니다.');
      loadReports();
    } catch (error) {
      console.error('피해 사례 제보 삭제 에러:', error);
      toast.error(error instanceof Error ? error.message : '피해 사례 제보 삭제에 실패했습니다.');
    }
  };

  const handleStartEdit = (post: CommunityPost) => {
    setEditingPost(post);
    setEditTitle(post.title);
    setEditContent(post.content);
  };

  const handleCancelEdit = () => {
    setEditingPost(null);
    setEditTitle('');
    setEditContent('');
  };

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

  const handleViewPost = () => {
    navigate('/community');
  };

  const handleViewShop = (shopUrl: string) => {
    navigate(`/search?url=${encodeURIComponent(shopUrl)}`);
  };

  if (loading) {
    return (
      <div className="mypage-page">
        <div className="mypage-container">
          <div className="mypage-loading-card">
            <p>로딩 중...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="mypage-page">
      <div className="mypage-container">
        <header className="mypage-header">
          <div>
            <p className="mypage-eyebrow">나의 활동 요약</p>
            <h1>마이페이지</h1>
          </div>
          <div className="user-info-box">
            <div className="user-info-row">
              <span className="label">사용자</span>
              <span className="value">{user?.username}</span>
            </div>
            <div className="user-info-row">
              <span className="label">이메일</span>
              <span className="value">{user?.email}</span>
            </div>
            <div className="user-info-row">
              <span className="label">연락처</span>
              <span className="value">{user?.phoneNumber || '정보 없음'}</span>
            </div>
          </div>
        </header>

        <nav className="tab-menu" aria-label="마이페이지 상세 보기">
          <button
            className={`tab-button ${activeTab === 'reports' ? 'active' : ''}`}
            onClick={() => setActiveTab('reports')}
            type="button"
          >
            피해 사례 제보 내역
          </button>
          <button
            className={`tab-button ${activeTab === 'community' ? 'active' : ''}`}
            onClick={() => setActiveTab('community')}
            type="button"
          >
            커뮤니티 글
          </button>
        </nav>

        {activeTab === 'reports' && (
          <section className="mypage-section" aria-labelledby="reports-heading">
            <div className="section-heading">
              <h2 id="reports-heading">내가 제보한 피해 사례 쇼핑몰</h2>
              <span className="count-chip">{reports.length}개</span>
            </div>

            {isLoading ? (
              <div className="mypage-loading-card">
                <p>피해 사례 제보 목록을 불러오는 중...</p>
              </div>
            ) : reports.length === 0 ? (
              <div className="empty-message">
                <h3>제보한 쇼핑몰이 아직 없습니다.</h3>
                <p>의심스러운 쇼핑몰이 있다면 피해 사례 제보로 다른 사용자와 정보를 공유해주세요.</p>
                <button className="cta-button" onClick={() => navigate('/report/new')}>
                  피해 사례 제보하러 가기
                </button>
              </div>
            ) : (
              <div className="card-list">
                {reports.map((report) => {
                  const categories: string[] = JSON.parse(report.categories);
                  const shopName = report.shops?.name || report.shops?.url || '알 수 없는 쇼핑몰';
                  const shopUrl = report.shops?.url || '';

                  return (
                    <article key={report.id} className="data-card">
                      <header className="data-card-header">
                        <div>
                          <button
                            type="button"
                            className="link-button"
                            onClick={() => handleViewShop(shopUrl)}
                          >
                            {shopName}
                          </button>
                          <p className="data-card-subtitle">제보일 {formatDate(report.created_at)}</p>
                        </div>
                        <span className="badge">제보</span>
                      </header>

                      <div className="data-card-body">
                        <div className="chip-group" role="list" aria-label="피해 사례 카테고리">
                          {categories.map((category, index) => (
                            <span key={index} className="chip" role="listitem">
                              {category}
                            </span>
                          ))}
                        </div>

                        <div className="description-block">
                          <p>{report.description}</p>
                        </div>

                        <div className="url-block">
                          <span className="label">쇼핑몰 URL</span>
                          <button
                            type="button"
                            className="url-button"
                            onClick={() => handleViewShop(shopUrl)}
                          >
                            {shopUrl || 'URL 정보 없음'}
                          </button>
                        </div>
                      </div>

                      <footer className="card-actions">
                        <button
                          type="button"
                          className="action-btn primary"
                          onClick={() => handleEdit(report)}
                        >
                          수정
                        </button>
                        <button
                          type="button"
                          className="action-btn danger"
                          onClick={() => handleDeleteReport(report.id, shopName)}
                        >
                          삭제
                        </button>
                      </footer>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {activeTab === 'community' && (
          <section className="mypage-section" aria-labelledby="posts-heading">
            <div className="section-heading">
              <h2 id="posts-heading">내가 작성한 게시글</h2>
              <span className="count-chip">{posts.length}개</span>
            </div>

            {isLoading ? (
              <div className="mypage-loading-card">
                <p>게시글을 불러오는 중...</p>
              </div>
            ) : posts.length === 0 ? (
              <div className="empty-message">
                <h3>작성한 게시글이 아직 없습니다.</h3>
                <p>커뮤니티에서 첫 게시글을 작성해보세요!</p>
                <button className="cta-button" onClick={() => navigate('/community')}>
                  커뮤니티 바로가기
                </button>
              </div>
            ) : (
              <div className="card-list">
                {posts.map((post) => (
                  <article key={post.id} className="data-card">
                    {editingPost?.id === post.id ? (
                      <div className="edit-form">
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="input-field"
                          placeholder="제목을 입력하세요"
                          maxLength={100}
                        />
                        <textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className="textarea-field"
                          placeholder="내용을 입력하세요"
                          rows={6}
                          maxLength={1000}
                        />
                        <div className="card-actions">
                          <button type="button" className="action-btn primary" onClick={handleSaveEdit}>
                            저장
                          </button>
                          <button type="button" className="action-btn secondary" onClick={handleCancelEdit}>
                            취소
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <header className="data-card-header">
                          <div>
                            <button
                              type="button"
                              className="link-button"
                              onClick={handleViewPost}
                            >
                              {post.title}
                            </button>
                            <p className="data-card-subtitle">작성일 {formatDate(post.created_at)}</p>
                          </div>
                          <span className="badge neutral">게시글</span>
                        </header>

                        <div className="data-card-body">
                          <p className="post-preview">
                            {post.content.length > 150 ? `${post.content.substring(0, 150)}...` : post.content}
                          </p>

                          <div className="post-stats">
                            <span>조회수 {post.views}</span>
                            <span>좋아요 {post.likes}</span>
                            <span>댓글 {post.comments_count}</span>
                          </div>
                        </div>

                        <footer className="card-actions">
                          <button
                            type="button"
                            className="action-btn primary"
                            onClick={() => handleStartEdit(post)}
                          >
                            수정
                          </button>
                          <button
                            type="button"
                            className="action-btn danger"
                            onClick={() => handleDeletePost(post.id, post.title)}
                          >
                            삭제
                          </button>
                        </footer>
                      </>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

