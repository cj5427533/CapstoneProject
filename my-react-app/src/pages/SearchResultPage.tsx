import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Rating } from '../components/Rating';
import { FakeReviewAnalysis } from '../components/FakeReviewAnalysis';
import { AdvancedAIAnalysis } from '../components/AdvancedAIAnalysis';
import { searchOrCreateShop, getShopReports, getShopRatings, createRating, Report, Rating as RatingData, Shop } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';

export function SearchResultPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [url, setUrl] = useState('');
  const [newSearchUrl, setNewSearchUrl] = useState('');
  const [shop, setShop] = useState<Shop | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [shopRating, setShopRating] = useState<RatingData>({
    averageRating: 0,
    totalRatings: 0,
    ratingDistribution: {}
  });
  const [userRating, setUserRating] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const searchUrl = searchParams.get('url');
    if (searchUrl) {
      setUrl(searchUrl);
      loadShopData(searchUrl);
    } else {
      // URL 파라미터가 없으면 로딩 상태 해제
      setLoading(false);
    }
  }, [searchParams]);

  const loadShopData = async (shopUrl: string) => {
    try {
      setLoading(true);

      // 쇼핑몰 검색 또는 생성
      const { shop: shopData } = await searchOrCreateShop(shopUrl);
      setShop(shopData);

      // 유효한 쇼핑몰 ID가 있을 때만 신고 목록과 평점 데이터를 로드
      if (shopData.id > 0) {
        const [reportsData, ratingsData] = await Promise.all([
          getShopReports(shopData.id),
          getShopRatings(shopData.id)
        ]);

        setReports(reportsData);
        setShopRating(ratingsData);
      } else {
        // 임시 쇼핑몰인 경우 빈 데이터로 설정
        setReports([]);
        setShopRating({
          averageRating: 0,
          totalRatings: 0,
          ratingDistribution: {}
        });
      }
    } catch (err) {
      console.error('데이터 로드 에러:', err);
      // 에러 발생 시에도 빈 상태로 처리하여 사용자가 신고할 수 있도록 함
      setReports([]);
      setShopRating({
        averageRating: 0,
        totalRatings: 0,
        ratingDistribution: {}
      });
      
      // 임시 쇼핑몰 데이터 생성 (URL만으로)
      setShop({
        id: 0, // 임시 ID
        url: shopUrl,
        name: undefined,
        created_at: new Date().toISOString()
      });
    } finally {
      setLoading(false);
    }
  };

  const handleNewReport = () => {
    // 로그인 체크
    if (!isAuthenticated) {
      if (confirm('신고하기 위해서는 로그인이 필요합니다.\n로그인 페이지로 이동하시겠습니까?')) {
        navigate('/login');
      }
      return;
    }
    
    // 신고 페이지로 이동 (현재 검색한 URL과 함께)
    navigate(`/report?url=${encodeURIComponent(url)}`);
  };

  const handleNewSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newSearchUrl.trim()) {
      const trimmedUrl = newSearchUrl.trim();
      navigate(`/search?url=${encodeURIComponent(trimmedUrl)}`);
    }
  };

  const handleRatingSubmit = async () => {
    // 비회원이 평점 제출하려고 시도하는 경우
    if (!isAuthenticated) {
      toast.error('평점을 남기기 위해서는 로그인이 필요합니다!');
      navigate('/login');
      return;
    }

    if (userRating > 0) {
      try {
        await createRating({
          shopUrl: url,
          rating: userRating
        });
        
        toast.success(`${userRating}점으로 평가했습니다. 홈페이지 고평점 페이지에 반영됩니다.`);
        setUserRating(0);
        
        // 평점 데이터 새로고침 (shop.id가 있는 경우에만)
        if (shop && shop.id > 0) {
          const ratingsData = await getShopRatings(shop.id);
          setShopRating(ratingsData);
        } else {
          // 임시 상태인 경우 로컬 상태 업데이트
          setShopRating({
            averageRating: userRating,
            totalRatings: 1,
            ratingDistribution: { [userRating]: 1 }
          });
        }
        
        // 현재 페이지 새로고침하여 최신 데이터 반영
        loadShopData(url);
      } catch (err) {
        console.error('평점 제출 에러:', err);
        toast.error('평점 제출에 실패했습니다.');
      }
    }
  };

  if (loading) {
    return (
      <div className="search-result-page">
        <div className="loading">
          <div className="result-header">
            <h1>검색 결과</h1>
            <div className="searched-url">
              <strong>검색한 쇼핑몰:</strong> 
              <div className="shop-info">
                <div className="shop-url">
                  {url}
                </div>
                <div className="loading-title">
                  쇼핑몰 이름을 가져오는 중...
                </div>
              </div>
            </div>
            
            {/* 검색창 영역 */}
            <div className="new-search-section">
              <h3>다른 쇼핑몰 검색하기</h3>
              <form onSubmit={handleNewSearch} className="search-form">
                <div className="search-input-container">
                  <input
                    type="text"
                    value={newSearchUrl}
                    onChange={(e) => setNewSearchUrl(e.target.value)}
                    placeholder="검색할 쇼핑몰 URL을 입력하세요"
                    className="search-input"
                  />
                  <button type="submit" className="search-button">
                    검색
                  </button>
                </div>
              </form>
            </div>
          </div>
          <p>신고 및 평점 정보를 불러오고 있습니다...</p>
        </div>
      </div>
    );
  }

  // URL 파라미터가 없는 경우 처리
  if (!url) {
    return (
      <div className="search-result-page">
        <div className="result-header">
          <h1>검색 결과</h1>
          <div className="no-search-message">
            <p>검색할 쇼핑몰 URL을 입력해주세요.</p>
          </div>
        </div>
        
        {/* 검색창 영역 */}
        <div className="new-search-section">
          <h3>쇼핑몰 검색하기</h3>
          <form onSubmit={handleNewSearch} className="search-form">
            <div className="search-input-container">
              <input
                type="text"
                value={newSearchUrl}
                onChange={(e) => setNewSearchUrl(e.target.value)}
                placeholder="검색할 쇼핑몰 URL을 입력하세요"
                className="search-input"
              />
              <button type="submit" className="search-button">
                검색
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="search-result-page">
      <div className="result-header">
        <h1>검색 결과</h1>
        <div className="searched-url">
          <strong>검색한 쇼핑몰:</strong> 
          <div className="shop-info">
            <div className="shop-url">
              {url}
            </div>
            {shop && shop.name && (
              <div className="shop-title">
                <strong>쇼핑몰 이름:</strong> {shop.name}
              </div>
            )}
          </div>
        </div>
        
        {/* 검색창 영역 */}
        <div className="new-search-section">
          <h3>다른 쇼핑몰 검색하기</h3>
          <form onSubmit={handleNewSearch} className="search-form">
            <div className="search-input-container">
              <input
                type="text"
                value={newSearchUrl}
                onChange={(e) => setNewSearchUrl(e.target.value)}
                placeholder="검색할 쇼핑몰 URL을 입력하세요"
                className="search-input"
              />
              <button type="submit" className="search-button">
                검색
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="result-summary">
        <div className="summary-card">
          <h3>총 신고 건수</h3>
          <span className="count">{reports.length}건</span>
        </div>
        <div className="summary-card">
          <h3>평균 평점</h3>
          <div className="rating-summary">
            <Rating initialRating={Math.round(shopRating.averageRating)} readonly size="small" />
            <span className="rating-average">{shopRating.averageRating.toFixed(1)}</span>
            <span className="rating-count">({shopRating.totalRatings}명)</span>
          </div>
        </div>
        <div className="summary-card">
          <h3>최근 신고</h3>
          <span className="date">
            {reports.length > 0 ? new Date(reports[0].created_at).toLocaleDateString('ko-KR') : '없음'}
          </span>
        </div>
      </div>

      {/* 비회원에게는 평점 섹션 숨김 */}
      {isAuthenticated && (
        <div className="rating-section">
          <h2>이 쇼핑몰에 평점을 주세요</h2>
          <div className="user-rating">
            <Rating 
              initialRating={userRating} 
              onRatingChange={setUserRating}
              size="large"
            />
            {userRating > 0 && (
              <button onClick={handleRatingSubmit} className="rating-submit-button">
                평점 제출
              </button>
            )}
          </div>
          
          {shopRating.totalRatings > 0 ? (
            <div className="rating-distribution">
              <h4>평점 분포</h4>
              {[5, 4, 3, 2, 1].map((star) => (
                <div key={star} className="rating-bar">
                  <span className="star-label">{star}점</span>
                  <div className="bar-container">
                    <div 
                      className="bar-fill" 
                      style={{ 
                        width: `${(shopRating.ratingDistribution[star] || 0) / shopRating.totalRatings * 100}%` 
                      }}
                    ></div>
                  </div>
                  <span className="bar-count">{shopRating.ratingDistribution[star] || 0}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-ratings">
              <p>아직 평점이 없습니다. 첫 번째 평점을 남겨주세요!</p>
            </div>
          )}
        </div>
      )}

      {/* 비회원에게는 평점 기능 로그인 안내 */}
      {!isAuthenticated && (
        <div className="rating-section-disabled">
          <div className="disabled-rating-message">
            <h2>이 쇼핑몰에 평점을 주세요</h2>
            <div className="login-promo">
              <p>평점을 남기고 확인하려면 로그인이 필요합니다.</p>
              <button 
                onClick={() => navigate('/login')} 
                className="login-button-promo"
              >
                로그인하고 평점 남기기
              </button>
            </div>
            
            {shopRating.totalRatings > 0 && (
              <div className="rating-distribution">
                <h4>평점 분포</h4>
                {[5, 4, 3, 2, 1].map((star) => (
                  <div key={star} className="rating-bar">
                    <span className="star-label">{star}점</span>
                    <div className="bar-container">
                      <div 
                        className="bar-fill" 
                        style={{ 
                          width: `${(shopRating.ratingDistribution[star] || 0) / shopRating.totalRatings * 100}%` 
                        }}
                      ></div>
                    </div>
                    <span className="bar-count">{shopRating.ratingDistribution[star] || 0}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="reports-section">
        <div className="section-header">
          <h2>신고 목록</h2>
          <button onClick={handleNewReport} className="report-button">
            신고하기
          </button>
        </div>

        {reports.length === 0 ? (
          <div className="no-reports">
            <div className="no-reports-content">
              <h3>아직 신고된 내용이 없습니다</h3>
              <p>이 쇼핑몰에 대한 첫 번째 신고를 작성해보세요!</p>
              <div className="no-reports-actions">
                <button onClick={handleNewReport} className="report-button primary">
                  첫 번째 신고하기
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="reports-list">
            {reports.map((report) => {
              const categories = JSON.parse(report.categories);
              return (
                <div key={report.id} className="report-card">
                  <div className="report-header">
                    <div className="categories">
                      {categories.map((category: string, index: number) => (
                        <span key={index} className="category">{category}</span>
                      ))}
                    </div>
                  </div>
                  <p className="report-description">{report.description}</p>
                  <div className="report-footer">
                    <span className="date">{new Date(report.created_at).toLocaleDateString('ko-KR')}</span>
                    <span className="reporter">{report.reporter_name || '익명'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 고급 AI 분석 섹션 */}
      {shop && (
        <div className="advanced-ai-analysis-section">
          <AdvancedAIAnalysis 
            shop={shop}
            reports={reports}
            ratings={[]} // 실제 리뷰 데이터는 백엔드에서 가져옴
            shopUrl={url}
          />
        </div>
      )}

      {/* 기존 AI 리뷰 분석 섹션 (호환성 유지) */}
      {shop && shopRating.totalRatings > 0 && (
        <div className="ai-analysis-section">
          <FakeReviewAnalysis 
            reviews={[]} // 실제 리뷰 데이터는 백엔드에서 가져옴
            shopType={{ type: 'real' }} // 실제 쇼핑몰로 설정
            shopUrl={url}
          />
        </div>
      )}

    </div>
  );
}
