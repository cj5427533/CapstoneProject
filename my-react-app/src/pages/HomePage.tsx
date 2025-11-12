import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchOrCreateShop, getShopReports, getShopRatings, getDangerousPages, getTopRatedPages } from '../utils/api';
import type { DangerousShop, TopRatedShop } from '../utils/api';
import { URLSearchBar } from '@/components/URLSearchBar';
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
        const { shop } = await searchOrCreateShop(searchUrl.trim());
        
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
      const normalizedUrl = normalizeUrl(url);
      debouncedPreviewSearchRef.current(normalizedUrl);
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

  // URL 유효성 검증 함수
  const isValidUrl = (url: string): boolean => {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  };

  // URL 정규화 함수 (개선된 버전)
  const normalizeUrl = (url: string): string => {
    if (!url) return url;
    
    // 공백 제거 및 정리
    url = url.trim().replace(/\s+/g, '');
    
    // 빈 문자열 체크
    if (!url) return url;
    
    // 일반적인 오타 수정
    url = url.replace(/^htps:\/\//, 'https://');
    url = url.replace(/^http:\/\//, 'http://');
    
    // 프로토콜이 없으면 https:// 추가
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    
    // 이중 점 제거
    url = url.replace(/\.{2,}/g, '.');
    
    // 잘못된 슬래시 정리
    url = url.replace(/\/{2,}/g, '/');
    
    return url;
  };

  // URL 변경 시 실시간 검증
  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputUrl = e.target.value;
    setUrl(inputUrl);
    
    // 에러 메시지 초기화
    setUrlError('');
    
    // 빈 문자열이면 에러 없음
    if (!inputUrl.trim()) {
      return;
    }
    
    // URL 정규화
    const normalizedUrl = normalizeUrl(inputUrl);
    
    // 유효성 검증
    if (!isValidUrl(normalizedUrl)) {
      setUrlError('올바른 URL 형식을 입력해주세요. (예: example.com 또는 https://example.com)');
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url.trim()) {
      setUrlError('URL을 입력해주세요.');
      return;
    }
    
    const normalizedUrl = normalizeUrl(url);
    
    if (!isValidUrl(normalizedUrl)) {
      setUrlError('올바른 URL 형식을 입력해주세요. (예: example.com 또는 https://example.com)');
      return;
    }
    
    setIsLoading(true);
    // 검색 결과 페이지로 즉시 이동 (미리보기는 이미 디바운싱으로 처리됨)
    setTimeout(() => {
      navigate(`/search?url=${encodeURIComponent(normalizedUrl)}`);
      setIsLoading(false);
    }, 500); // 미리보기가 보여진 후 잠시 대기
  };

  return (
    <div className="home-page">
      <div className="w-full bg-gradient-to-b from-blue-100 via-blue-100 to-blue-50">
        <section className="container-custom py-16">
          <div className="mx-auto max-w-[960px] lg:max-w-[1120px] text-center">
            <h1 className="flex items-center justify-center gap-4 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
              여기몰까
              <img src={logoMark} alt="여기몰까 로고" className="h-12 w-12 sm:h-14 sm:w-14 object-contain" />
            </h1>
            <p className="mt-3 text-base text-slate-700 sm:text-lg">믿을 수 있는 쇼핑몰인지 확인해보세요</p>
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
              <div className="mt-6 text-left">
                <h3 className="mb-2 text-sm font-medium text-muted-foreground">쇼핑몰 미리보기</h3>
                {isPreviewLoading ? (
                  <div className="rounded-md border p-4 text-sm text-muted-foreground">쇼핑몰 정보를 확인하는 중...</div>
                ) : shopData ? (
                  <div className="grid gap-2 rounded-md border p-4 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">피해 사례 제보 건수</span>
                      <span className="font-medium">{shopData.reportsCount}건</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">평균 평점</span>
                      <span className="font-medium">{shopData.averageRating.toFixed(1)}점</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">평점 개수</span>
                      <span className="font-medium">{shopData.totalRatings}개</span>
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </section>
      </div>

      <div className="home-content">
        {/* 메인 컨텐츠 */}
        <div className="main-section">
          {/* 실시간 정보 섹션 - 신뢰성 검증 위로 이동 */}
          <div className="realtime-section">
            {lastUpdate && (
              <div className="realtime-update-info">
                <span className="update-text">
                  마지막 업데이트: {lastUpdate.toLocaleTimeString('ko-KR')}
                </span>
                <span className="update-hint"> (30초마다 자동 업데이트)</span>
              </div>
            )}
            <div className="realtime-horizontal">
              <div className="realtime-box">
                <h3 className="realtime-title">⚠️ 주의가 필요한 페이지 Top 10</h3>
                <div className="realtime-list">
                  {dangerousPages.length === 0 ? (
                    <p className="empty-message">아직 데이터가 없습니다</p>
                  ) : (
                    dangerousPages.slice(0, 10).map((shop, index) => (
                      <div 
                        key={shop.id} 
                        className="realtime-item clickable"
                        onClick={() => {
                          if (isMockShop(shop)) {
                            // 목업 쇼핑몰인 경우 분석 페이지로 이동
                            navigate(`/search?url=${encodeURIComponent(shop.url)}&mock=true`);
                          } else {
                            // 실제 쇼핑몰인 경우 일반 검색 페이지로 이동
                            navigate(`/search?url=${encodeURIComponent(shop.url)}`);
                          }
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        <span className="rank">#{index + 1}</span>
                        <div className="shop-info">
                          <span className="shop-name" title={shop.name}>
                            {shop.name || shop.url}
                          </span>
                          <span className="shop-count">{shop.reportCount}건 피해 사례 제보</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
              
              <div className="realtime-box">
                <h3 className="realtime-title">⭐ 고평점 페이지 Top 10</h3>
                <div className="realtime-list">
                  {topRatedPages.length === 0 ? (
                    <p className="empty-message">아직 데이터가 없습니다</p>
                  ) : (
                    topRatedPages.slice(0, 10).map((shop, index) => (
                      <div 
                        key={shop.id} 
                        className="realtime-item clickable"
                        onClick={() => {
                          if (isMockShop(shop)) {
                            // 목업 쇼핑몰인 경우 분석 페이지로 이동
                            navigate(`/search?url=${encodeURIComponent(shop.url)}&mock=true`);
                          } else {
                            // 실제 쇼핑몰인 경우 일반 검색 페이지로 이동
                            navigate(`/search?url=${encodeURIComponent(shop.url)}`);
                          }
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        <span className="rank">#{index + 1}</span>
                        <div className="shop-info">
                          <span className="shop-name" title={shop.name}>
                            {shop.name || shop.url}
                          </span>
                          <div className="rating-info">
                            <span className="shop-rating">{shop.averageRating}⭐</span>
                            <span className="shop-count">({shop.totalRatings}명)</span>
                          </div>
                        </div>
                      </div>
                    ))
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
