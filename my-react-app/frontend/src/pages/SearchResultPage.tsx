import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Rating } from '../components/shop/Rating';
import { AdvancedAIAnalysis } from '../components/analysis/AdvancedAIAnalysis';
import { ReviewForm } from '../components/shop/ReviewForm';
import { ReviewsList } from '../components/shop/ReviewsList';
import { searchOrCreateShop, getShopReports, getShopRatings, getBusinessRegistration, Report, Rating as RatingData, Shop } from '../utils/api';
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

  // 첫 페이지의 5개 피해사례가 각각 다른 카테고리를 가지도록 정렬
  const sortedReports = useMemo(() => {
    if (!Array.isArray(reports) || reports.length === 0) {
      return [];
    }

    // 카테고리 파싱 헬퍼 함수
    const parseCategories = (categoriesString: string): string[] => {
      try {
        if (!categoriesString) return [];
        const parsed = JSON.parse(categoriesString);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    };

    // 각 피해사례의 첫 번째 카테고리 추출
    const reportsWithCategory = reports.map(report => ({
      report,
      firstCategory: parseCategories(report.categories)[0] || '기타'
    }));

    // 카테고리별로 그룹화
    const categoryGroups = new Map<string, typeof reportsWithCategory>();
    for (const item of reportsWithCategory) {
      const category = item.firstCategory;
      if (!categoryGroups.has(category)) {
        categoryGroups.set(category, []);
      }
      categoryGroups.get(category)!.push(item);
    }

    // 첫 5개 선택: 각 카테고리에서 하나씩 선택
    const firstFive: Report[] = [];
    const usedCategories = new Set<string>();
    const usedReports = new Set<number>();

    // 각 카테고리에서 하나씩 선택 (최대 5개)
    for (const [category, items] of categoryGroups.entries()) {
      if (firstFive.length >= 5) break;
      if (items.length > 0) {
        const selected = items[0].report;
        firstFive.push(selected);
        usedCategories.add(category);
        usedReports.add(selected.id);
      }
    }

    // 첫 5개가 아직 채워지지 않았다면, 사용하지 않은 카테고리에서 추가
    if (firstFive.length < 5) {
      for (const [category, items] of categoryGroups.entries()) {
        if (firstFive.length >= 5) break;
        if (!usedCategories.has(category)) {
          const selected = items[0].report;
          firstFive.push(selected);
          usedCategories.add(category);
          usedReports.add(selected.id);
        }
      }
    }

    // 첫 5개가 여전히 부족하면, 이미 사용한 카테고리에서 추가
    if (firstFive.length < 5) {
      for (const [category, items] of categoryGroups.entries()) {
        if (firstFive.length >= 5) break;
        for (const item of items) {
          if (firstFive.length >= 5) break;
          if (!usedReports.has(item.report.id)) {
            firstFive.push(item.report);
            usedReports.add(item.report.id);
          }
        }
      }
    }

    // 나머지 피해사례는 원래 순서대로 (최신순 유지)
    const remainingReports = reports.filter(report => !usedReports.has(report.id));

    // 첫 5개 + 나머지 합치기
    return [...firstFive, ...remainingReports];
  }, [reports]);

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
            const [reportsData, ratingsData, businessData] = await Promise.all([
              withTimeout(getShopReports(shopData.id), 10000),
              withTimeout(getShopRatings(shopData.id), 10000),
              withTimeout(getBusinessRegistration(shopData.id), 10000).catch(() => null)
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
            
            // 사업자 등록 정보 설정
            setBusinessRegistration(businessData);
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
            const [reportsData, ratingData, businessData] = await Promise.all([
              withTimeout(getShopReports(actualShop.id), 10000),
              withTimeout(getShopRatings(actualShop.id), 10000),
              withTimeout(getBusinessRegistration(actualShop.id), 10000).catch(() => null)
            ]);
            setReports(reportsData);
            setShopRating(ratingData);
            setBusinessRegistration(businessData);
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
    // URL 기반 커스텀 파비콘 (도메인 매칭)
    try {
      const normalizedUrl = shopUrl.startsWith('http') ? shopUrl : `https://${shopUrl}`;
      const urlObj = new URL(normalizedUrl);
      const hostname = urlObj.hostname.toLowerCase();
      
      // wooahwan.co.kr 도메인에 대한 커스텀 파비콘
      if (hostname.includes('wooahwan.co.kr')) {
        return '/wooahwan-favicon.png';
      }
    } catch (e) {
      // URL 파싱 실패 시 계속 진행
    }

    // 특정 쇼핑몰 이름에 대한 커스텀 파비콘
    const customFavicons: { [key: string]: string } = {
      '우아한': '/wooahwan-favicon.png',
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
          </div>
        </div>

        {/* Accordion: 쇼핑몰 별점 */}
        <details className="rounded-lg border bg-white shadow" style={{ color: '#1e293b' }} open>
          <summary className="flex cursor-pointer items-center justify-between p-3 hover:bg-gray-50 transition-colors">
            <span className="text-base font-medium" style={{ color: '#1e293b' }}>쇼핑몰 별점</span>
            <span className="text-xs" style={{ color: '#64748b' }}>Message</span>
          </summary>
          <div className="px-3 pb-3 pt-2 text-sm leading-relaxed">
            {/* 별점 요약 섹션 */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 pb-3 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div style={{ display: 'flex', alignItems: 'center', overflow: 'visible' }}>
                  <Rating initialRating={shopRating.averageRating ?? 0} readonly size="medium" />
                </div>
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xl font-bold" style={{ 
                      color: shopRating.averageRating >= 4 ? '#10b981' : 
                             shopRating.averageRating >= 3 ? '#f59e0b' : 
                             shopRating.averageRating >= 2 ? '#f97316' : '#ef4444'
                    }}>
                      {(shopRating.averageRating ?? 0).toFixed(1)}
                    </span>
                    <span className="text-sm font-medium" style={{ color: '#64748b' }}>/ 5</span>
                  </div>
                  <span className="text-xs font-medium" style={{ color: '#64748b' }}>
                    {shopRating.totalRatings ?? 0}명 평가
                  </span>
                </div>
              </div>
            </div>

            {/* 평점 분포 섹션 */}
            <div className="mt-3">
              {shopRating.totalRatings > 0 ? (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold mb-2" style={{ color: '#1e293b' }}>평점 분포</h4>
                  {[5, 4, 3, 2, 1].map((star) => {
                    const count = shopRating.ratingDistribution[star] || 0;
                    const percentage = (count / (shopRating.totalRatings || 1)) * 100;
                    const getBarColor = (star: number) => {
                      switch (star) {
                        case 5: return '#10b981'; // 녹색
                        case 4: return '#84cc16'; // 연두색
                        case 3: return '#fbbf24'; // 노란색
                        case 2: return '#f97316'; // 주황색
                        case 1: return '#ef4444'; // 빨간색
                        default: return '#6366f1';
                      }
                    };
                    return (
                      <div key={star} className="flex items-center gap-2 group">
                        <div className="flex items-center gap-0.5 w-10">
                          <span className="text-xs font-medium" style={{ color: '#64748b' }}>{star}</span>
                          <span className="text-xs" style={{ color: '#94a3b8' }}>점</span>
                        </div>
                        <div className="relative h-4 flex-1 overflow-hidden rounded-full bg-gray-100 shadow-inner">
                          <div 
                            className="absolute left-0 top-0 h-full rounded-full transition-all duration-500 ease-out group-hover:opacity-90"
                            style={{ 
                              width: `${percentage}%`,
                              background: getBarColor(star),
                              minWidth: count > 0 ? '3px' : '0px',
                              boxShadow: count > 0 ? '0 1px 2px rgba(0,0,0,0.1)' : 'none'
                            }}
                          />
                        </div>
                        <div className="flex items-center gap-1.5 w-14 justify-end">
                          <span className="text-xs font-semibold min-w-[20px] text-right" style={{ color: '#1e293b' }}>
                            {count}
                          </span>
                          <span className="text-xs" style={{ color: '#94a3b8' }}>
                            ({percentage.toFixed(0)}%)
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-4">
                  <div className="text-2xl mb-2">⭐</div>
                  <p className="text-sm font-medium mb-1" style={{ color: '#1e293b' }}>
                    아직 평점이 없습니다
                  </p>
                  <p className="text-xs" style={{ color: '#64748b' }}>
                    첫 번째 평점을 남겨주세요!
                  </p>
                </div>
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
              {sortedReports.slice((currentReportPage - 1) * 5, currentReportPage * 5).map((report) => {
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
            {sortedReports.length > 5 && (
              <div className="pagination-container">
                <button
                  onClick={() => setCurrentReportPage(prev => Math.max(1, prev - 1))}
                  disabled={currentReportPage === 1}
                  className="pagination-button"
                >
                  이전
                </button>
                <div className="pagination-info">
                  {currentReportPage} / {Math.ceil(sortedReports.length / 5)}
                </div>
                <button
                  onClick={() => setCurrentReportPage(prev => Math.min(Math.ceil(sortedReports.length / 5), prev + 1))}
                  disabled={currentReportPage >= Math.ceil(sortedReports.length / 5)}
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
          />
          <div className="disclaimer-notice" style={{ marginTop: '1rem', padding: '1rem', background: '#e3f2fd', border: '1px solid #2196f3', borderRadius: '8px', fontSize: '0.875rem', color: '#1565c0' }}>
            <strong>⚠️ 안내사항:</strong> 본 페이지에 표시된 신뢰도 점수, 분석 결과, 평점 등 모든 정보는 참고용이며, 법적 효력은 없습니다. 최종 판단은 사용자 본인의 몫이며, 실제 거래 시 신중한 검토가 필요합니다.
          </div>
        </div>
      )}

      {/* 리뷰 섹션 */}
      {shop && (
        <div className="reviews-section rounded-lg border bg-white shadow p-4">
          <div className="section-header">
            <h2 className="text-xl font-bold text-gray-900">사용자 리뷰</h2>
            {isAuthenticated && (
              <button 
                className="write-review-button"
                onClick={handleToggleReviewForm}
              >
                {showReviewForm ? '취소' : '리뷰 작성'}
              </button>
            )}
          </div>

          {showReviewForm && shop.id > 0 && (
            <div className="review-form-wrapper">
              <ReviewForm 
                shopId={shop.id}
                shopUrl={url}
                onReviewSubmitted={handleReviewSubmitted}
              />
            </div>
          )}

          {shop.id > 0 ? (
            <ReviewsList 
              shopId={shop.id}
              onReviewAdded={handleReviewSubmitted}
              refreshKey={reviewRefreshKey}
            />
          ) : (
            <div className="text-center py-6 text-gray-600">
              <p className="text-sm">리뷰를 보려면 쇼핑몰 정보를 먼저 등록해주세요.</p>
            </div>
          )}
        </div>
      )}

      {/* AI 리뷰 분석은 이제 고급 AI 분석 시스템에 통합됨 */}

    </div>
  );
}
