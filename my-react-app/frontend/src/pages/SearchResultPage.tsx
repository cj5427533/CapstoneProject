import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Rating } from '../components/shop/Rating';
import { AdvancedAIAnalysis } from '../components/analysis/AdvancedAIAnalysis';
import { ReviewForm } from '../components/shop/ReviewForm';
import { ReviewsList } from '../components/shop/ReviewsList';
import { searchOrCreateShop, getShopReports, getShopRatings, getBusinessRegistration, getTrustScore, Report, Rating as RatingData, Shop } from '../utils/api';
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
  const [businessRegistration, setBusinessRegistration] = useState<any | null>(null);
  const [trustScore, setTrustScore] = useState<{ final_trust: number; trust_grade: string } | null>(null);
  const [currentReportPage, setCurrentReportPage] = useState(1);

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

  // reports가 변경될 때 페이지를 1로 리셋
  useEffect(() => {
    setCurrentReportPage(1);
  }, [reports.length]);

  // 타임아웃 래퍼 함수
  const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number = 10000): Promise<T> => {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => 
        setTimeout(() => reject(new Error('요청 시간 초과')), timeoutMs)
      )
    ]);
  };

  // trustScore를 다시 불러오는 함수
  const refreshTrustScore = async () => {
    if (shop && shop.id > 0) {
      try {
        // parent_shop_id가 있으면 부모 ID 사용, 없으면 shop.id 사용
        const targetShopId = shop.parent_shop_id || shop.id;
        console.log(`[trustScore 새로고침] shop.id=${shop.id}, parent_shop_id=${shop.parent_shop_id}, targetShopId=${targetShopId}`);
        
        // 백엔드에서 저장하는 데 시간이 걸릴 수 있으므로 약간의 지연 후 조회
        await new Promise(resolve => setTimeout(resolve, 1500));
        const trustData = await withTimeout(getTrustScore(targetShopId), 10000).catch(() => null);
        console.log(`[trustScore 새로고침] 조회 결과:`, trustData);
        setTrustScore(trustData);
      } catch (error) {
        console.error('신뢰도 점수 새로고침 에러:', error);
      }
    } else {
      console.warn('[trustScore 새로고침] shop이 없거나 shop.id가 유효하지 않음:', shop);
    }
  };

  const loadShopData = async (shopUrl: string, isMock: boolean = false) => {
    try {
      setLoading(true);

      if (isMock) {
        // 목업 쇼핑몰인 경우 목업 데이터 사용
        await withTimeout(loadMockShopData(shopUrl), 15000);
      } else {
        // 실제 쇼핑몰인 경우 API 호출
        const result = await withTimeout(searchOrCreateShop(shopUrl), 10000);
        const shopData = result?.shop;
        
        if (!shopData) {
          console.error('쇼핑몰 데이터를 찾을 수 없습니다:', result);
          setShop(null);
          setLoading(false);
          return;
        }
        
        setShop(shopData);

        // 유효한 쇼핑몰 ID가 있을 때만 신고 목록과 평점 데이터를 로드
        if (shopData.id > 0) {
          try {
            const [reportsData, ratingsData, businessData, trustData] = await Promise.all([
              withTimeout(getShopReports(shopData.id), 10000),
              withTimeout(getShopRatings(shopData.id), 10000),
              withTimeout(getBusinessRegistration(shopData.id), 10000).catch(() => null),
              withTimeout(getTrustScore(shopData.id), 10000).catch(() => null)
            ]);

            setReports(reportsData || []);
            // ratingsData가 유효한지 확인
            if (ratingsData && typeof ratingsData === 'object') {
              setShopRating({
                averageRating: ratingsData.averageRating ?? 0,
                totalRatings: ratingsData.totalRatings ?? 0,
                ratingDistribution: ratingsData.ratingDistribution || {}
              });
            } else {
              setShopRating({
                averageRating: 0,
                totalRatings: 0,
                ratingDistribution: {}
              });
            }
            
            // 사업자 등록 정보 및 신뢰도 점수 설정
            setBusinessRegistration(businessData);
            setTrustScore(trustData);
          } catch (dataErr) {
            console.error('신고/평점 데이터 로드 에러:', dataErr);
            // 부분 실패 시에도 기본값 설정
            setReports([]);
            setShopRating({
              averageRating: 0,
              totalRatings: 0,
              ratingDistribution: {}
            });
            setBusinessRegistration(null);
            setTrustScore(null);
          }
        } else {
          // 임시 쇼핑몰인 경우 빈 데이터로 설정
          setReports([]);
          setShopRating({
            averageRating: 0,
            totalRatings: 0,
            ratingDistribution: {}
          });
          setBusinessRegistration(null);
          setTrustScore(null);
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
      setBusinessRegistration(null);
      setTrustScore(null);
      
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
    // 목업 데이터 제거됨 - 더 이상 목업 쇼핑몰을 지원하지 않음
    // 실제 데이터베이스에서만 데이터를 가져옴
    const mockShops: Array<{ url: string; name: string; riskLevel: 'HIGH' | 'MEDIUM' | 'LOW'; riskScore: number }> = [];

    const mockShop = mockShops.find(s => s.url === shopUrl);
    
    if (mockShop) {
      // 실제 데이터베이스에서 shop을 찾거나 생성
      try {
        const result = await withTimeout(searchOrCreateShop(shopUrl), 10000);
        const actualShop = result?.shop;
        
        if (!actualShop) {
          console.error('쇼핑몰 데이터를 찾을 수 없습니다:', result);
          return;
        }
        
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
            const [reportsData, ratingData, businessData, trustData] = await Promise.all([
              withTimeout(getShopReports(actualShop.id), 10000),
              withTimeout(getShopRatings(actualShop.id), 10000),
              withTimeout(getBusinessRegistration(actualShop.id), 10000).catch(() => null),
              withTimeout(getTrustScore(actualShop.id), 10000).catch(() => null)
            ]);
            setReports(reportsData);
            setShopRating(ratingData);
            setBusinessRegistration(businessData);
            setTrustScore(trustData);
          } catch (error) {
            console.error('데이터 로드 오류:', error);
            // 에러 시 기본값 설정
            setReports([]);
            setShopRating({
              averageRating: 0,
              totalRatings: 0,
              ratingDistribution: {}
            });
            setBusinessRegistration(null);
            setTrustScore(null);
          }
        } else {
          // ID가 0인 경우 기본값 설정
          setReports([]);
          setShopRating({
            averageRating: 0,
            totalRatings: 0,
            ratingDistribution: {}
          });
          setBusinessRegistration(null);
          setTrustScore(null);
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
      setBusinessRegistration(null);
      setTrustScore(null);
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

  const handleToggleReviewForm = () => {
    // 로그인 체크
    if (!isAuthenticated) {
      if (confirm('리뷰를 작성하려면 로그인이 필요합니다.\n로그인 페이지로 이동하시겠습니까?')) {
        navigate('/login');
      }
      return;
    }
    
    setShowReviewForm(!showReviewForm);
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
        
        {/* 커뮤니티 게시물 검색 영역 */}
        <div className="new-search-section">
          <h3>커뮤니티 게시물 검색</h3>
          <form onSubmit={(e) => {
            e.preventDefault();
            if (shop?.name) {
              // 쇼핑몰 이름을 키워드로 커뮤니티 페이지로 이동
              navigate(`/community?search=${encodeURIComponent(shop.name)}`);
            }
          }} className="search-form">
            <div className="search-input-container">
              <input
                type="text"
                value={shop?.name || ''}
                readOnly
                placeholder="쇼핑몰 이름"
                className="search-input"
                style={{ cursor: 'pointer' }}
              />
              <button type="submit" className="search-button">
                커뮤니티에서 검색
              </button>
            </div>
            <p className="text-sm text-gray-600 mt-2" style={{ color: '#64748b' }}>
              "{shop?.name || '이 쇼핑몰'}" 관련 커뮤니티 게시물을 검색합니다
            </p>
          </form>
        </div>
      </div>
    );
  }

  // 파비콘 URL 가져오기 함수
  const getFaviconUrl = (shopName: string | null | undefined, shopUrl: string): string => {
    // 특정 쇼핑몰에 대한 커스텀 파비콘
    const customFavicons: { [key: string]: string } = {
      '우아한': 'https://api.dicebear.com/7.x/shapes/svg?seed=wooahwan&backgroundColor=b6e3f4',
      '매우 의심가는 쇼핑몰 [테스트]': 'https://api.dicebear.com/7.x/shapes/svg?seed=very-suspicious&backgroundColor=ff6b6b',
      '의심가는 쇼핑몰 [테스트]': 'https://api.dicebear.com/7.x/shapes/svg?seed=suspicious&backgroundColor=ffd5dc',
      '아리까리한 쇼핑몰 [테스트]': 'https://api.dicebear.com/7.x/shapes/svg?seed=confusing&backgroundColor=ffeaa7'
    };

    if (shopName && customFavicons[shopName]) {
      return customFavicons[shopName];
    }

    // 기본 파비콘 (Google 파비콘 서비스 사용)
    try {
      const domain = new URL(shopUrl.startsWith('http') ? shopUrl : `https://${shopUrl}`).hostname;
      return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`;
    } catch {
      return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(shopUrl)}&sz=64`;
    }
  };

  const domain = (() => { try { return new URL(url).hostname; } catch { return url; } })();
  const faviconUrl = getFaviconUrl(shop?.name, url);

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
              {shop && shop.name && (
                <div className="mt-4">
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    navigate(`/community?search=${encodeURIComponent(shop.name!)}`);
                  }} className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <input
                      type="text"
                      value={shop.name}
                      readOnly
                      placeholder="쇼핑몰 이름"
                      className="flex-1 rounded-md border px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      style={{ background: '#f8fafc', color: '#1e293b', borderColor: '#e2e8f0', cursor: 'pointer' }}
                    />
                    <button 
                      type="submit" 
                      className="inline-flex items-center justify-center rounded-md border px-3 py-2 text-sm shadow-sm"
                      style={{ background: '#2563eb', color: '#ffffff', borderColor: '#2563eb' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#1d4ed8'}
                      onMouseLeave={(e) => e.currentTarget.style.background = '#2563eb'}
                    >
                      커뮤니티에서 검색
                    </button>
                  </form>
                  <p className="text-xs mt-2" style={{ color: '#64748b' }}>
                    "{shop.name}" 관련 커뮤니티 게시물을 검색합니다
                  </p>
                </div>
              )}
            </div>
            <div className="px-4 py-4 text-base leading-relaxed">
              <div className="flex items-center justify-between text-sm font-medium" style={{ color: '#1e293b' }}>
                <span>사업자 등록</span>
                <span style={{ color: '#64748b' }}>Building</span>
              </div>
              {businessRegistration ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {businessRegistration.business_number ? (
                    <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium" style={{ background: '#dbeafe', color: '#1e40af' }}>
                      ✅ 사업자등록번호 확인됨
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium" style={{ background: '#fee2e2', color: '#991b1b' }}>
                      ⚠️ 사업자등록번호 없음
                    </span>
                  )}
                  {businessRegistration.business_status === 'ACTIVE' && (
                    <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium" style={{ background: '#dcfce7', color: '#166534' }}>
                      🏢 정식 등록
                    </span>
                  )}
                  {businessRegistration.business_status === 'SUSPENDED' && (
                    <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium" style={{ background: '#fee2e2', color: '#991b1b' }}>
                      ⚠️ 휴업 상태
                    </span>
                  )}
                  {businessRegistration.business_status === 'CLOSED' && (
                    <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium" style={{ background: '#fee2e2', color: '#991b1b' }}>
                      ❌ 폐업 상태
                    </span>
                  )}
                  {businessRegistration.business_status === 'UNKNOWN' && (
                    <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium" style={{ background: '#fef3c7', color: '#92400e' }}>
                      ❓ 등록 상태 불명
                    </span>
                  )}
                  {businessRegistration.business_type && (
                    <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium" style={{ background: '#fef3c7', color: '#92400e' }}>
                      📋 {businessRegistration.business_type}
                    </span>
                  )}
                </div>
              ) : (
                <div className="mt-3">
                  <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium" style={{ background: '#fee2e2', color: '#991b1b' }}>
                    ⚠️ 사업자 등록 정보 없음
                  </span>
                  <p className="mt-2 text-xs" style={{ color: '#64748b' }}>
                    이 쇼핑몰의 사업자 등록 정보가 등록되지 않았습니다.
                  </p>
                </div>
              )}
            </div>
            <div className="px-4 py-4 text-base leading-relaxed">
              <div className="flex items-center justify-between text-sm font-medium" style={{ color: '#1e293b' }}>
                <span>이전 사용자의 신뢰도 분석결과</span>
                <span style={{ color: '#64748b' }}>BarChart</span>
              </div>
              {trustScore && trustScore.final_trust !== undefined && trustScore.final_trust !== null ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {(() => {
                    const score = Number(trustScore.final_trust);
                    const level = score >= 90 ? '매우안전' : 
                                 score >= 70 ? '안전' : 
                                 score >= 40 ? '주의' : '의심';
                    const bgColor = score >= 90 ? '#dbeafe' :  // 파란색 배경
                                   score >= 70 ? '#dcfce7' :  // 초록색 배경
                                   score >= 40 ? '#fef3c7' :  // 노란색 배경
                                   '#fee2e2';                  // 빨간색 배경
                    const textColor = score >= 90 ? '#1e40af' :  // 파란색 텍스트
                                     score >= 70 ? '#166534' :  // 초록색 텍스트
                                     score >= 40 ? '#92400e' :  // 노란색 텍스트
                                     '#991b1b';                  // 빨간색 텍스트
                    return (
                      <>
                        <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium" style={{ background: bgColor, color: textColor }}>
                          📊 {score.toFixed(1)}점
                        </span>
                        <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium" style={{ background: bgColor, color: textColor }}>
                          {level === '매우안전' ? '✅' : level === '안전' ? '✅' : level === '주의' ? '⚠️' : '🚨'} {level}
                        </span>
                      </>
                    );
                  })()}
                </div>
              ) : (
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium" style={{ background: '#f3f4f6', color: '#64748b' }}>
                    📊 분석 결과 없음
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Accordion: 쇼핑몰 별점 */}
        <details className="rounded-lg border bg-white shadow" style={{ color: '#1e293b' }} open>
          <summary className="flex cursor-pointer items-center justify-between p-4">
            <span className="text-base font-medium" style={{ color: '#1e293b' }}>쇼핑몰 별점</span>
            <span style={{ color: '#64748b' }}>Message</span>
          </summary>
          <div className="px-4 pb-4 pt-0 text-base leading-relaxed">
            <div className="flex items-center gap-3">
              <Rating initialRating={Math.round(shopRating.averageRating ?? 0)} readonly size="small" />
              <span className="text-sm" style={{ color: '#64748b' }}>{(shopRating.averageRating ?? 0).toFixed(1)} / 5 · {shopRating.totalRatings ?? 0}명</span>
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

      {/* 피해 사례 제보 섹션 */}
      <div className="reports-section rounded-lg border bg-white shadow p-6">
        <div className="section-header">
          <h2 className="text-2xl font-bold text-gray-900">피해 사례 제보 목록</h2>
          <button onClick={handleNewReport} className="report-button">
            피해 사례 제보
          </button>
        </div>

        {reports.length === 0 ? (
          <div className="no-reports">
            <div className="no-reports-content">
              <h3>아직 피해 사례 제보된 내용이 없습니다.</h3>
              <p>이 쇼핑몰에 대한 첫 번째 피해 사례 제보를 작성해보세요!</p>
              <div className="no-reports-actions">
                <button onClick={handleNewReport} className="report-button primary">
                  첫 번째 피해 사례 제보
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="reports-list-compact">
              {(Array.isArray(reports) ? reports : []).slice((currentReportPage - 1) * 5, currentReportPage * 5).map((report) => {
                const categories = JSON.parse(report.categories);
                return (
                  <div key={report.id} className="report-card-compact">
                    <div className="report-header-compact">
                      <div className="categories-compact">
                        {categories.map((category: string, index: number) => (
                          <span key={index} className="category-compact">{category}</span>
                        ))}
                      </div>
                    </div>
                    <p className="report-description-compact">{report.description}</p>
                    <div className="report-footer-compact">
                      <span className="date-compact">{new Date(report.created_at).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })}</span>
                      <span className="reporter-compact">{report.reporter_name || '익명'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* 페이지네이션 */}
            {reports.length > 5 && (
              <div className="pagination-container">
                <button
                  onClick={() => setCurrentReportPage(prev => Math.max(1, prev - 1))}
                  disabled={currentReportPage === 1}
                  className="pagination-button"
                >
                  이전
                </button>
                <div className="pagination-info">
                  {currentReportPage} / {Math.ceil(reports.length / 5)}
                </div>
                <button
                  onClick={() => setCurrentReportPage(prev => Math.min(Math.ceil(reports.length / 5), prev + 1))}
                  disabled={currentReportPage >= Math.ceil(reports.length / 5)}
                  className="pagination-button"
                >
                  다음
                </button>
              </div>
            )}
          </>
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
            onTrustScoreUpdate={refreshTrustScore}
          />
        </div>
      )}

      {/* 리뷰 섹션 */}
      {shop && (
        <div className="reviews-section rounded-lg border bg-white shadow p-6">
          <div className="section-header">
            <h2 className="text-2xl font-bold text-gray-900">사용자 리뷰</h2>
            {isAuthenticated && (
              <button 
                className="write-review-button"
                onClick={handleToggleReviewForm}
              >
                {showReviewForm ? '리뷰 작성 취소' : '리뷰 작성하기'}
              </button>
            )}
          </div>

          {showReviewForm && shop.id > 0 && (
            <ReviewForm 
              shopId={shop.id}
              shopUrl={url}
              onReviewSubmitted={handleReviewSubmitted}
            />
          )}

          {shop.id > 0 ? (
            <ReviewsList 
              shopId={shop.id}
              onReviewAdded={handleReviewSubmitted}
              refreshKey={reviewRefreshKey}
            />
          ) : (
            <div className="text-center py-8 text-gray-600">
              <p>리뷰를 보려면 쇼핑몰 정보를 먼저 등록해주세요.</p>
            </div>
          )}
        </div>
      )}

      {/* AI 리뷰 분석은 이제 고급 AI 분석 시스템에 통합됨 */}

    </div>
  );
}
