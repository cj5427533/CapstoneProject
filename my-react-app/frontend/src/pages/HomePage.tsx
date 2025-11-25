import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchOrCreateShop, getShopReports, getShopRatings, getDangerousPages, getTopRatedPages } from '../utils/api';
import type { DangerousShop, TopRatedShop } from '../utils/api';
import { URLSearchBar } from '@/components/shop/URLSearchBar';
import { normalizeUrl as normalizeUrlUtil, validateUrl } from '../utils/url';
import logoMark from '@/ygmk_logo.png';

// 디바운싱 유틸리티 함수
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function HomePage() {
  const [url, setUrl] = useState('');
  const [urlError, setUrlError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [shopData, setShopData] = useState<{
    reportsCount: number;
    averageRating: number;
    totalRatings: number;
  } | null>(null);
  const [dangerousPages, setDangerousPages] = useState<DangerousShop[]>([]);
  const [topRatedPages, setTopRatedPages] = useState<TopRatedShop[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const navigate = useNavigate();

  // 목업 쇼핑몰인지 확인하는 함수
  const isMockShop = (shop: DangerousShop | TopRatedShop): boolean => {
    return shop.id >= 1000; // 목업 쇼핑몰은 1000 이상의 ID를 가짐
  };

  // 파비콘 URL 가져오기 함수
  const getFaviconUrl = (shop: DangerousShop | TopRatedShop): string => {
    // 특정 쇼핑몰에 대한 커스텀 파비콘
    const customFavicons: { [key: string]: string } = {
      '우아한': 'https://api.dicebear.com/7.x/shapes/svg?seed=wooahwan&backgroundColor=b6e3f4',
      '매우 의심가는 쇼핑몰 [테스트]': 'https://api.dicebear.com/7.x/shapes/svg?seed=very-suspicious&backgroundColor=ff6b6b',
      '의심가는 쇼핑몰 [테스트]': 'https://api.dicebear.com/7.x/shapes/svg?seed=suspicious&backgroundColor=ffd5dc',
      '아리까리한 쇼핑몰 [테스트]': 'https://api.dicebear.com/7.x/shapes/svg?seed=confusing&backgroundColor=ffeaa7'
    };

    if (shop.name && customFavicons[shop.name]) {
      return customFavicons[shop.name];
    }

    // 기본 파비콘 (Google 파비콘 서비스 사용)
    try {
      const domain = new URL(shop.url.startsWith('http') ? shop.url : `https://${shop.url}`).hostname;
      return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`;
    } catch {
      return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(shop.url)}&sz=64`;
    }
  };

  // 디바운싱된 미리보기 검색 함수를 useRef로 관리
  const debouncedPreviewSearchRef = useRef<((searchUrl: string) => void) | null>(null);

  // 디바운싱 함수 초기화 및 cleanup
  useEffect(() => {
    debouncedPreviewSearchRef.current = debounce(async (searchUrl: string) => {
      if (!searchUrl.trim()) {
        setShopData(null);
        return;
      }

      setIsPreviewLoading(true);
      try {
        const result = await searchOrCreateShop(searchUrl.trim());
        const shop = result?.shop;
        
        if (!shop) {
          console.warn('쇼핑몰 데이터가 없습니다:', result);
          setShopData(null);
          return;
        }
        
        let reports = [];
        let ratings = null;
        
        if (shop.id > 0) {
          [reports] = await Promise.all([
            getShopReports(shop.id),
            getShopRatings(shop.id)
          ]);
          ratings = await getShopRatings(shop.id);
        }
        
        setShopData({
          reportsCount: reports.length,
          averageRating: ratings?.averageRating || 0,
          totalRatings: ratings?.totalRatings || 0
        });
      } catch (error) {
        console.error('미리보기 검색 에러:', error);
        setShopData(null);
      } finally {
        setIsPreviewLoading(false);
      }
    }, 800); // 800ms 후에 실행

    // 컴포넌트 언마운트 시 타이머 정리
    return () => {
      if (debouncedPreviewSearchRef.current) {
        // debounce 함수 내부의 타이머를 정리하기 위해 즉시 실행
        debouncedPreviewSearchRef.current('');
      }
    };
  }, []);

  // URL 변경 시 디바운싱된 미리보기 검색 실행
  useEffect(() => {
    if (debouncedPreviewSearchRef.current && url.trim()) {
      // URL 유효성 검증 먼저 수행
      if (!validateUrl(url)) {
        return;
      }
      
      try {
        const normalizedUrl = normalizeUrlUtil(url);
        if (normalizedUrl && normalizedUrl.trim()) {
          debouncedPreviewSearchRef.current(normalizedUrl);
        }
      } catch (error) {
        console.error('URL 정규화 실패:', error);
        // 정규화 실패 시 미리보기 검색하지 않음
      }
    }
  }, [url]);

  // 실시간 정보 로드
  useEffect(() => {
    const loadRealtimeData = async () => {
      try {
        const [dangerous, topRated] = await Promise.all([
          getDangerousPages(),
          getTopRatedPages()
        ]);
        setDangerousPages(dangerous);
        setTopRatedPages(topRated);
        setLastUpdate(new Date());
      } catch (error) {
        console.error('실시간 정보 로드 에러:', error);
      }
    };

    // 초기 로드
    loadRealtimeData();

    // 30초마다 자동 새로고침
    const interval = setInterval(() => {
      loadRealtimeData();
      console.log('주의가 필요한/고평점 페이지 자동 새로고침');
    }, 30000);

    // 페이지가 다시 보이게 될 때 새로고침
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadRealtimeData();
        console.log('페이지 포커스 - 주의가 필요한/고평점 페이지 새로고침');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // cleanup
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // URL 정규화 함수는 utils/url.ts에서 import
  const normalizeUrl = normalizeUrlUtil;

  // URL 변경 시 실시간 검증
  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let inputUrl = e.target.value;
    
    // 사용자가 직접 프로토콜을 입력하는 중이면 그대로 유지
    // 하지만 프로토콜 없이 도메인만 입력하면 자동으로 https:// 추가하지 않음 (입력 필드에는 원본 유지)
    setUrl(inputUrl);
    
    // 에러 메시지 초기화
    setUrlError('');
    
    // 빈 문자열이면 에러 없음
    if (!inputUrl.trim()) {
      return;
    }
    
    // 유효성 검증 먼저 수행 (프로토콜 없어도 검증 가능하도록)
    if (!validateUrl(inputUrl)) {
      setUrlError('올바른 URL 형식을 입력해주세요. (예: example.com 또는 https://example.com)');
      return;
    }
    
    // 정규화는 디바운싱된 미리보기 검색에서 처리
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedUrl = url.trim();
    
    if (!trimmedUrl) {
      setUrlError('URL을 입력해주세요.');
      return;
    }
    
    // 유효성 검증 먼저 수행
    if (!validateUrl(trimmedUrl)) {
      setUrlError('올바른 URL 형식을 입력해주세요. (예: example.com 또는 https://example.com)');
      return;
    }
    
    try {
      const normalizedUrl = normalizeUrl(trimmedUrl);
      
      if (!normalizedUrl || !normalizedUrl.trim()) {
        setUrlError('URL을 정규화할 수 없습니다. 올바른 URL 형식을 입력해주세요.');
        return;
      }
      
      setIsLoading(true);
      setUrlError(''); // 검색 시작 시 에러 메시지 제거
      // 검색 결과 페이지로 즉시 이동 (미리보기는 이미 디바운싱으로 처리됨)
      setTimeout(() => {
        navigate(`/search?url=${encodeURIComponent(normalizedUrl)}`);
        setIsLoading(false);
      }, 500); // 미리보기가 보여진 후 잠시 대기
    } catch (error) {
      console.error('URL 정규화 실패:', error);
      setUrlError('URL 처리 중 오류가 발생했습니다. 다시 시도해주세요.');
      setIsLoading(false);
    }
  };

  return (
    <div className="home-page">
      <div className="w-full bg-gradient-to-b from-sky-100 via-sky-100 to-sky-50">
        <section className="container-custom py-8 sm:py-12 md:py-16">
          <div className="mx-auto max-w-[960px] lg:max-w-[1120px] text-center">
            <h1 className="flex items-center justify-center gap-2 sm:gap-4 text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-slate-900">
              여기몰까
              <img src={logoMark} alt="여기몰까 로고" className="h-10 w-10 sm:h-12 sm:w-12 md:h-14 md:w-14 object-contain" />
            </h1>
            <p className="mt-3 text-sm sm:text-base md:text-lg text-slate-700">믿을 수 있는 쇼핑몰인지 확인해보세요.</p>
            <div className="mt-8">
              <URLSearchBar
                value={url}
                onChange={handleUrlChange}
                onSubmit={handleSearch}
                isLoading={isLoading}
                errorText={urlError}
              />
            </div>

            {(shopData || isPreviewLoading) && (
              <div className="mt-4 sm:mt-6 text-left">
                <h3 className="mb-2 text-xs sm:text-sm font-medium text-gray-600">쇼핑몰 미리보기</h3>
                {isPreviewLoading ? (
                  <div className="rounded-md border border-gray-200 p-3 sm:p-4 text-xs sm:text-sm text-gray-600">쇼핑몰 정보를 확인하는 중...</div>
                ) : shopData ? (
                  <div className="grid gap-2 rounded-md border border-gray-200 p-3 sm:p-4 text-xs sm:text-sm bg-white">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">피해 사례 제보 건수</span>
                      <span className="font-medium text-gray-900">{shopData.reportsCount}건</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">평균 평점</span>
                      <span className="font-medium text-gray-900">{shopData.averageRating.toFixed(1)}점</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">평점 개수</span>
                      <span className="font-medium text-gray-900">{shopData.totalRatings}개</span>
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </section>

        {/* 어떤 서비스를 제공하나요? 섹션 */}
        <div className="container-custom py-8 sm:py-12 md:py-16">
          <div className="mx-auto max-w-6xl">
            <div className="text-center mb-8 sm:mb-12">
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2 sm:mb-3">어떤 서비스를 제공하나요?</h2>
              <p className="text-sm sm:text-base text-slate-700 px-4">AI와 사용자 데이터를 결합한 종합적인 쇼핑몰 신뢰도 분석.</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {/* AI 기반 신뢰도 분석 */}
              <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 rounded-lg mb-3 sm:mb-4">
                  <svg className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-2">AI 기반 신뢰도 분석</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  고급 AI 알고리즘이 도메인, SSL 인증서, 리뷰 패턴을 종합 분석하여 쇼핑몰의 신뢰도를 실시간으로 평가합니다.
                </p>
              </div>

              {/* 사용자 신고 데이터 반영 */}
              <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 rounded-lg mb-3 sm:mb-4">
                  <svg className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-2">사용자 신고 데이터 반영</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  실제 피해를 경험한 사용자들의 제보를 수집하고 검증하여, 실시간으로 업데이트되는 신뢰도 점수에 반영합니다.
                </p>
              </div>

              {/* 관리자 검증으로 신뢰도 강화 */}
              <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow sm:col-span-2 lg:col-span-1">
                <div className="flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 rounded-lg mb-3 sm:mb-4">
                  <svg className="w-6 h-6 sm:w-8 sm:h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-2">관리자 검증으로 신뢰도 강화</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  전문 관리자가 신고 내용을 검토하고, 사업자 정보와 SSL 인증서를 직접 확인하여 신뢰도를 보장합니다.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 실시간 정보 섹션 */}
      <div className="container-custom py-8 md:py-12">
        <div className="max-w-7xl mx-auto">
          {lastUpdate && (
            <div className="mb-4 text-center">
              <p className="text-xs sm:text-sm text-gray-600">
                <span className="font-medium">마지막 업데이트:</span> {lastUpdate.toLocaleTimeString('ko-KR')}
                <span className="hidden sm:inline"> (30초마다 자동 업데이트)</span>
              </p>
            </div>
          )}
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
            {/* 주의가 필요한 페이지 */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="p-4 md:p-6">
                <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <span>⚠️</span>
                  <span>주의가 필요한 페이지 Top 5</span>
                </h3>
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {dangerousPages.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-8">아직 데이터가 없습니다.</p>
                  ) : (
                    dangerousPages.slice(0, 5).map((shop, index) => {
                      const faviconUrl = getFaviconUrl(shop);
                      return (
                        <div 
                          key={shop.id} 
                          className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer min-h-[44px] touch-manipulation"
                          onClick={() => {
                            if (isMockShop(shop)) {
                              navigate(`/search?url=${encodeURIComponent(shop.url)}&mock=true`);
                            } else {
                              navigate(`/search?url=${encodeURIComponent(shop.url)}`);
                            }
                          }}
                        >
                          <div className="flex-shrink-0 flex items-center gap-2">
                            <span className="w-8 h-8 flex items-center justify-center bg-red-100 text-red-700 rounded-full text-xs font-bold">
                              #{index + 1}
                            </span>
                            <img 
                              src={faviconUrl}
                              alt={`${shop.name || shop.url} 파비콘`}
                              className="w-6 h-6 rounded object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm md:text-base font-medium text-gray-900 truncate" title={shop.name || shop.url}>
                              {shop.name || shop.url}
                            </p>
                            <div className="flex items-center justify-between mt-1">
                              <span className="text-xs md:text-sm font-medium text-yellow-600">
                                {shop.averageRating !== undefined && shop.averageRating > 0 
                                  ? `${shop.averageRating.toFixed(1)}⭐` 
                                  : '평점 없음'}
                              </span>
                              <span className="text-xs md:text-sm text-gray-600">
                                {shop.reportCount}건 피해 사례 제보
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
            
            {/* 고평점 페이지 */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="p-4 md:p-6">
                <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <span>⭐</span>
                  <span>고평점 페이지 Top 5</span>
                </h3>
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {topRatedPages.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-8">아직 데이터가 없습니다.</p>
                  ) : (
                    topRatedPages.slice(0, 5).map((shop, index) => {
                      const faviconUrl = getFaviconUrl(shop);
                      return (
                        <div 
                          key={shop.id} 
                          className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer min-h-[44px] touch-manipulation"
                          onClick={() => {
                            if (isMockShop(shop)) {
                              navigate(`/search?url=${encodeURIComponent(shop.url)}&mock=true`);
                            } else {
                              navigate(`/search?url=${encodeURIComponent(shop.url)}`);
                            }
                          }}
                        >
                          <div className="flex-shrink-0 flex items-center gap-2">
                            <span className="w-8 h-8 flex items-center justify-center bg-green-100 text-green-700 rounded-full text-xs font-bold">
                              #{index + 1}
                            </span>
                            <img 
                              src={faviconUrl}
                              alt={`${shop.name || shop.url} 파비콘`}
                              className="w-6 h-6 rounded object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm md:text-base font-medium text-gray-900 truncate" title={shop.name || shop.url}>
                              {shop.name || shop.url}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs md:text-sm font-medium text-yellow-600">
                                {shop.averageRating.toFixed(1)}⭐
                              </span>
                              <span className="text-xs md:text-sm text-gray-600">
                                ({shop.totalRatings}명)
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}