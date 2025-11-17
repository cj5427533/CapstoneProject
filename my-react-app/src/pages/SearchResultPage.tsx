import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Rating } from '../components/shop/Rating';
import { AdvancedAIAnalysis } from '../components/analysis/AdvancedAIAnalysis';
import { ReviewForm } from '../components/shop/ReviewForm';
import { ReviewsList } from '../components/shop/ReviewsList';
import { searchOrCreateShop, getShopReports, getShopRatings, Report, Rating as RatingData, Shop } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';

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
  const [loading, setLoading] = useState(true);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [isMockShop, setIsMockShop] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [reviewRefreshKey, setReviewRefreshKey] = useState(0);

  useEffect(() => {
    const searchUrl = searchParams.get('url');
    const mockParam = searchParams.get('mock');
    
    // 페이지 최상단으로 스크롤
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    if (searchUrl) {
      setUrl(searchUrl);
      setIsMockShop(mockParam === 'true');
      loadShopData(searchUrl, mockParam === 'true');
    } else {
      // URL 파라미터가 없으면 로딩 상태 해제
      setLoading(false);
    }
  }, [searchParams]);

  useEffect(() => {
    setImgError(false);
  }, [url]);

  // 타임아웃 래퍼 함수
  const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number = 10000): Promise<T> => {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => 
        setTimeout(() => reject(new Error('요청 시간 초과')), timeoutMs)
      )
    ]);
  };

  const loadShopData = async (shopUrl: string, isMock: boolean = false) => {
    try {
      setLoading(true);

      if (isMock) {
        // 목업 쇼핑몰인 경우 목업 데이터 사용
        await withTimeout(loadMockShopData(shopUrl), 15000);
      } else {
        // 실제 쇼핑몰인 경우 API 호출
        const { shop: shopData } = await withTimeout(searchOrCreateShop(shopUrl), 10000);
        setShop(shopData);

        // 유효한 쇼핑몰 ID가 있을 때만 신고 목록과 평점 데이터를 로드
        if (shopData.id > 0) {
          try {
            const [reportsData, ratingsData] = await Promise.all([
              withTimeout(getShopReports(shopData.id), 10000),
              withTimeout(getShopRatings(shopData.id), 10000)
            ]);

            setReports(reportsData);
            setShopRating(ratingsData);
          } catch (dataErr) {
            console.error('신고/평점 데이터 로드 에러:', dataErr);
            // 부분 실패 시에도 기본값 설정
            setReports([]);
            setShopRating({
              averageRating: 0,
              totalRatings: 0,
              ratingDistribution: {}
            });
          }
        } else {
          // 임시 쇼핑몰인 경우 빈 데이터로 설정
          setReports([]);
          setShopRating({
            averageRating: 0,
            totalRatings: 0,
            ratingDistribution: {}
          });
        }
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

  const loadMockShopData = async (shopUrl: string) => {
    // 목업 데이터에서 해당 URL의 쇼핑몰 찾기
    const mockShops = [
      { url: 'fake-shop-example.com', name: '가짜 쇼핑몰 예시 [목업쇼핑몰]', riskLevel: 'HIGH' as const, riskScore: 85 },
      { url: 'suspicious-store.com', name: '의심스러운 스토어 [목업쇼핑몰]', riskLevel: 'HIGH' as const, riskScore: 90 },
      { url: 'scam-mall.net', name: '사기쇼핑몰 [목업쇼핑몰]', riskLevel: 'HIGH' as const, riskScore: 95 },
      { url: 'trusted-mall.co.kr', name: '신뢰쇼핑몰 [목업쇼핑몰]', riskLevel: 'LOW' as const, riskScore: 15 },
      { url: 'reliable-store.com', name: '안전한스토어 [목업쇼핑몰]', riskLevel: 'LOW' as const, riskScore: 20 },
      { url: 'caution-mall.com', name: '주의쇼핑몰 [목업쇼핑몰]', riskLevel: 'MEDIUM' as const, riskScore: 55 },
      { url: 'mixed-reviews.co.kr', name: '혼재리뷰몰 [목업쇼핑몰]', riskLevel: 'MEDIUM' as const, riskScore: 60 }
    ];

    const mockShop = mockShops.find(s => s.url === shopUrl);
    
    if (mockShop) {
      // 실제 데이터베이스에서 shop을 찾거나 생성
      try {
        const { shop: actualShop } = await withTimeout(searchOrCreateShop(shopUrl), 10000);
        
        setShop({
          id: actualShop.id,
          url: mockShop.url,
          name: mockShop.name || actualShop.name,
          created_at: actualShop.created_at
        });

        // 실제 데이터베이스에서 신고와 평점 데이터 가져오기
        if (actualShop.id > 0) {
          try {
            // 실제 신고 데이터 가져오기 (타임아웃 적용)
            const reportsData = await withTimeout(getShopReports(actualShop.id), 10000);
            setReports(reportsData);
            
            // 실제 평점 데이터 가져오기 (타임아웃 적용)
            const ratingData = await withTimeout(getShopRatings(actualShop.id), 10000);
            setShopRating(ratingData);
          } catch (error) {
            console.error('데이터 로드 오류:', error);
            // 에러 시에도 목업 데이터 설정
            const mockReports: Report[] = [
              {
                id: 1,
                shop_id: actualShop.id,
                categories: JSON.stringify(['사기/피싱', '배송 문제']),
                description: '목업 신고입니다. 실제 피해 사례가 아닙니다.',
                reporter_name: '목업 사용자',
                created_at: new Date().toISOString()
              }
            ];
            setReports(mockReports);

            const mockRating: RatingData = {
              averageRating: mockShop.riskLevel === 'LOW' ? 4.5 : mockShop.riskLevel === 'MEDIUM' ? 3.2 : 2.1,
              totalRatings: mockShop.riskLevel === 'LOW' ? 25 : mockShop.riskLevel === 'MEDIUM' ? 12 : 8,
              ratingDistribution: {
                5: mockShop.riskLevel === 'LOW' ? 15 : mockShop.riskLevel === 'MEDIUM' ? 3 : 1,
                4: mockShop.riskLevel === 'LOW' ? 8 : mockShop.riskLevel === 'MEDIUM' ? 4 : 2,
                3: mockShop.riskLevel === 'LOW' ? 2 : mockShop.riskLevel === 'MEDIUM' ? 3 : 2,
                2: mockShop.riskLevel === 'LOW' ? 0 : mockShop.riskLevel === 'MEDIUM' ? 1 : 2,
                1: mockShop.riskLevel === 'LOW' ? 0 : mockShop.riskLevel === 'MEDIUM' ? 1 : 1
              }
            };
            setShopRating(mockRating);
          }
        } else {
          // ID가 0인 경우에도 목업 데이터 설정
          setReports([]);
          setShopRating({
            averageRating: mockShop.riskLevel === 'LOW' ? 4.5 : mockShop.riskLevel === 'MEDIUM' ? 3.2 : 2.1,
            totalRatings: mockShop.riskLevel === 'LOW' ? 25 : mockShop.riskLevel === 'MEDIUM' ? 12 : 8,
            ratingDistribution: {
              5: mockShop.riskLevel === 'LOW' ? 15 : mockShop.riskLevel === 'MEDIUM' ? 3 : 1,
              4: mockShop.riskLevel === 'LOW' ? 8 : mockShop.riskLevel === 'MEDIUM' ? 4 : 2,
              3: mockShop.riskLevel === 'LOW' ? 2 : mockShop.riskLevel === 'MEDIUM' ? 3 : 2,
              2: mockShop.riskLevel === 'LOW' ? 0 : mockShop.riskLevel === 'MEDIUM' ? 1 : 2,
              1: mockShop.riskLevel === 'LOW' ? 0 : mockShop.riskLevel === 'MEDIUM' ? 1 : 1
            }
          });
        }
      } catch (error) {
        console.error('목업 쇼핑몰 데이터 로드 오류:', error);
        // 에러 시 기본 shop만 설정
        setShop({
          id: 0,
          url: mockShop.url,
          name: mockShop.name,
          created_at: new Date().toISOString()
        });
        setReports([]);
        setShopRating({
          averageRating: mockShop.riskLevel === 'LOW' ? 4.5 : mockShop.riskLevel === 'MEDIUM' ? 3.2 : 2.1,
          totalRatings: mockShop.riskLevel === 'LOW' ? 25 : mockShop.riskLevel === 'MEDIUM' ? 12 : 8,
          ratingDistribution: {
            5: mockShop.riskLevel === 'LOW' ? 15 : mockShop.riskLevel === 'MEDIUM' ? 3 : 1,
            4: mockShop.riskLevel === 'LOW' ? 8 : mockShop.riskLevel === 'MEDIUM' ? 4 : 2,
            3: mockShop.riskLevel === 'LOW' ? 2 : mockShop.riskLevel === 'MEDIUM' ? 3 : 2,
            2: mockShop.riskLevel === 'LOW' ? 0 : mockShop.riskLevel === 'MEDIUM' ? 1 : 2,
            1: mockShop.riskLevel === 'LOW' ? 0 : mockShop.riskLevel === 'MEDIUM' ? 1 : 1
          }
        });
      }
    } else {
      // 목업 쇼핑몰을 찾을 수 없는 경우 기본 데이터 설정
      setShop({
        id: 0,
        url: shopUrl,
        name: '목업 쇼핑몰',
        created_at: new Date().toISOString()
      });
      setReports([]);
      setShopRating({
        averageRating: 0,
        totalRatings: 0,
        ratingDistribution: {}
      });
    }
  };

  const handleNewReport = () => {
    // 로그인 체크
    if (!isAuthenticated) {
      if (confirm('피해 사례 제보를 위해서는 로그인이 필요합니다.\n로그인 페이지로 이동하시겠습니까?')) {
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

  const handleReviewSubmitted = () => {
    console.log('handleReviewSubmitted 호출됨, 리뷰 목록 새로고침 시작');
    // 리뷰 목록 새로고침을 위한 키 변경
    setReviewRefreshKey(prev => {
      const newKey = prev + 1;
      console.log(`refreshKey 변경: ${prev} -> ${newKey}`);
      return newKey;
    });
    // 평점 데이터도 새로고침
    if (shop?.id) {
      console.log('평점 데이터 새로고침 시작, shopId:', shop.id);
      loadShopData(url, isMockShop);
    }
  };

  if (loading) {
    return (
      <div className="container-custom max-w-[1100px] mx-auto pt-10 pb-16 space-y-6 px-4 sm:px-6 lg:px-8" style={{ background: 'radial-gradient(circle at 20% 0%, rgba(211, 236, 254, 0.95) 0%, rgba(248, 251, 255, 0.95) 60%, rgba(255, 255, 255, 0.98) 100%)', minHeight: '100vh' }}>
        <Skeleton className="h-24 w-full" />
        <div className="space-y-3">
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-10 w-1/2" />
          <Skeleton className="h-10 w-1/3" />
        </div>
        <p className="text-sm text-muted-foreground">피해 사례 제보 및 평점 정보를 불러오고 있습니다...</p>
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

  const domain = (() => { try { return new URL(url).hostname; } catch { return url; } })();
  const faviconUrl = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`;

  return (
    <div className="container-custom max-w-[1100px] mx-auto pt-10 pb-16 space-y-6 px-4 sm:px-6 lg:px-8" style={{ background: 'radial-gradient(circle at 20% 0%, rgba(211, 236, 254, 0.95) 0%, rgba(248, 251, 255, 0.95) 60%, rgba(255, 255, 255, 0.98) 100%)', minHeight: '100vh' }}>
      <div className="space-y-4">
        {/* 쇼핑몰 기본 정보 카드 */}
        <div className="rounded-lg border bg-white shadow" style={{ color: '#1e293b' }}>
          <div className="flex items-center gap-4 border-b px-4 py-5">
            <div className="relative h-12 w-12 overflow-hidden rounded-md border bg-white">
              {!imgError ? (
                <img
                  src={faviconUrl}
                  alt={`${domain} 파비콘`}
                  className="h-full w-full object-cover"
                  onError={() => setImgError(true)}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center" style={{ color: '#64748b' }}>
                  <span className="text-lg" aria-hidden>
                    🌐
                  </span>
                </div>
              )}
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-2xl font-semibold leading-tight" style={{ color: '#1e293b' }} aria-label="분석 대상 도메인">
                {domain}
              </h2>
            </div>
          </div>
          <div className="divide-y">
            <div className="px-4 py-4 text-base leading-relaxed">
              <div className="flex items-center justify-between text-base font-medium" style={{ color: '#1e293b' }}>
                <span>쇼핑몰 기본 정보</span>
                <span className="text-sm" style={{ color: '#64748b' }}>Globe</span>
              </div>
              <div className="mt-3 grid gap-2">
                <div style={{ color: '#64748b' }}>검색한 쇼핑몰</div>
                <div className="font-medium break-all" style={{ color: '#1e293b' }}>{url}</div>
                {shop && shop.name && (
                  <div className="mt-2">
                    <div style={{ color: '#64748b' }}>쇼핑몰 이름</div>
                    <div className="font-medium" style={{ color: '#1e293b' }}>{shop.name}</div>
                  </div>
                )}
              </div>
              <div className="mt-4">
                <form onSubmit={handleNewSearch} className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <input
                    type="text"
                    value={newSearchUrl}
                    onChange={(e) => setNewSearchUrl(e.target.value)}
                    placeholder="검색할 쇼핑몰 URL을 입력하세요"
                    className="flex-1 rounded-md border px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    style={{ background: '#ffffff', color: '#1e293b', borderColor: '#e2e8f0' }}
                  />
                  <button 
                    type="submit" 
                    className="inline-flex items-center justify-center rounded-md border px-3 py-2 text-sm shadow-sm"
                    style={{ background: '#2563eb', color: '#ffffff', borderColor: '#2563eb' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#1d4ed8'}
                    onMouseLeave={(e) => e.currentTarget.style.background = '#2563eb'}
                  >
                    검색
                  </button>
                </form>
              </div>
            </div>
            <div className="px-4 py-4 text-base leading-relaxed">
              <div className="flex items-center justify-between text-sm font-medium" style={{ color: '#1e293b' }}>
                <span>사업자 등록</span>
                <span style={{ color: '#64748b' }}>Building</span>
              </div>
              <p className="mt-3 text-sm" style={{ color: '#64748b' }}>데이터가 없습니다</p>
            </div>
            <div className="px-4 py-4 text-base leading-relaxed">
              <div className="flex items-center justify-between text-sm font-medium" style={{ color: '#1e293b' }}>
                <span>결제/보안</span>
                <span style={{ color: '#64748b' }}>CreditCard</span>
              </div>
              <p className="mt-3 text-sm" style={{ color: '#64748b' }}>데이터가 없습니다</p>
            </div>
          </div>
        </div>

        {/* Accordion: 리뷰 신뢰도 */}
        <details className="rounded-lg border bg-white shadow" style={{ color: '#1e293b' }} open>
          <summary className="flex cursor-pointer items-center justify-between p-4">
            <span className="text-base font-medium" style={{ color: '#1e293b' }}>리뷰 신뢰도</span>
            <span style={{ color: '#64748b' }}>Message</span>
          </summary>
          <div className="px-4 pb-4 pt-0 text-base leading-relaxed">
            <div className="flex items-center gap-3">
              <Rating initialRating={Math.round(shopRating.averageRating)} readonly size="small" />
              <span className="text-sm" style={{ color: '#64748b' }}>{shopRating.averageRating.toFixed(1)} / 5 · {shopRating.totalRatings}명</span>
            </div>
            <div className="mt-4">
              {shopRating.totalRatings > 0 ? (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium" style={{ color: '#1e293b' }}>평점 분포</h4>
                  {[5, 4, 3, 2, 1].map((star) => (
                    <div key={star} className="flex items-center gap-2">
                      <span className="w-10 text-sm" style={{ color: '#64748b' }}>{star}점</span>
                      <div className="relative h-2 flex-1 overflow-hidden rounded-full" style={{ background: '#f1f5f9' }}>
                        <div 
                          className="absolute left-0 top-0 h-2 rounded-full"
                          style={{ 
                            width: `${(shopRating.ratingDistribution[star] || 0) / (shopRating.totalRatings || 1) * 100}%`,
                            background: '#6366f1'
                          }}
                        />
                      </div>
                      <span className="w-8 text-right text-sm" style={{ color: '#1e293b' }}>{shopRating.ratingDistribution[star] || 0}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm" style={{ color: '#64748b' }}>아직 평점이 없습니다. 첫 번째 평점을 남겨주세요!</p>
              )}
            </div>
          </div>
        </details>
      </div>



      <div className="reports-section">
        <div className="section-header">
          <h2>피해 사례 제보 목록</h2>
          <button onClick={handleNewReport} className="report-button">
            피해 사례 제보
          </button>
        </div>

        {reports.length === 0 ? (
          <div className="no-reports">
            <div className="no-reports-content">
              <h3>아직 피해 사례 제보된 내용이 없습니다</h3>
              <p>이 쇼핑몰에 대한 첫 번째 피해 사례 제보를 작성해보세요!</p>
              <div className="no-reports-actions">
                <button onClick={handleNewReport} className="report-button primary">
                  첫 번째 피해 사례 제보
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

      {/* 리뷰 섹션 */}
      {shop && shop.id > 0 && (
        <div className="reviews-section">
          <div className="section-header">
            <h2>사용자 리뷰</h2>
            {isAuthenticated && (
              <button 
                className="write-review-button"
                onClick={() => setShowReviewForm(!showReviewForm)}
              >
                {showReviewForm ? '리뷰 작성 취소' : '리뷰 작성하기'}
              </button>
            )}
          </div>

          {showReviewForm && (
            <ReviewForm 
              shopId={shop.id}
              shopUrl={url}
              onReviewSubmitted={handleReviewSubmitted}
            />
          )}

          <ReviewsList 
            shopId={shop.id}
            onReviewAdded={handleReviewSubmitted}
            refreshKey={reviewRefreshKey}
          />
        </div>
      )}

      {/* AI 리뷰 분석은 이제 고급 AI 분석 시스템에 통합됨 */}

    </div>
  );
}
