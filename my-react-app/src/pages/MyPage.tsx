import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getUserReports, deleteUserReport } from '../utils/api';
import type { Report } from '../utils/api';

export function MyPage() {
  const navigate = useNavigate();
  const { isAuthenticated, user, loading } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 로그인 체크 (loading이 완료된 후에만 체크)
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      alert('로그인이 필요한 페이지입니다.');
      navigate('/login');
    }
  }, [loading, isAuthenticated, navigate]);

  // 신고 목록 로드 (loading이 완료되고 인증된 후에만 실행)
  useEffect(() => {
    const loadReports = async () => {
      if (user?.username) {
        console.log('신고 목록 로드 시작, 사용자명:', user.username);
        setIsLoading(true);
        try {
          const userReports = await getUserReports(user.username);
          console.log('신고 목록 응답:', userReports);
          console.log('신고 개수:', userReports.length);
          setReports(userReports);
        } catch (error) {
          console.error('신고 목록 로드 에러:', error);
          alert('신고 목록을 불러오는데 실패했습니다.');
        } finally {
          setIsLoading(false);
        }
      } else {
        console.log('사용자명 없음:', user);
      }
    };

    console.log('useEffect 실행 - loading:', loading, 'isAuthenticated:', isAuthenticated, 'user:', user);
    
    if (!loading && isAuthenticated) {
      loadReports();
    } else if (!loading) {
      setIsLoading(false);
    }
  }, [loading, user?.username, isAuthenticated]);

  // 신고 수정
  const handleEdit = (report: Report) => {
    const shopUrl = report.shops?.url || '';
    navigate(`/report?url=${encodeURIComponent(shopUrl)}`);
  };

  // 신고 삭제
  const handleDelete = async (reportId: number, shopName: string) => {
    if (!confirm(`'${shopName}' 쇼핑몰에 대한 신고를 삭제하시겠습니까?`)) {
      return;
    }

    try {
      await deleteUserReport(reportId, user?.username || '');
      alert('신고가 삭제되었습니다.');
      // 목록 새로고침
      const updatedReports = await getUserReports(user?.username || '');
      setReports(updatedReports);
    } catch (error) {
      console.error('신고 삭제 에러:', error);
      alert(error instanceof Error ? error.message : '신고 삭제에 실패했습니다.');
    }
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

  return (
    <div className="mypage-container">
      <div className="mypage-header">
        <h1>마이페이지</h1>
        <div className="user-info-box">
          <p><strong>사용자명:</strong> {user?.username}</p>
          <p><strong>이메일:</strong> {user?.email}</p>
          <p><strong>전화번호:</strong> {user?.phone_number}</p>
        </div>
      </div>

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
                      {new Date(report.created_at).toLocaleDateString('ko-KR')}
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
                      onClick={() => handleDelete(report.id, shopName)}
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

        @media (max-width: 768px) {
          .mypage-container {
            padding: 1rem;
          }

          .report-card-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.5rem;
          }

          .report-card-actions {
            flex-direction: column;
          }

          .action-btn {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}

