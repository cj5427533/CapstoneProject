import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { API_BASE_URL } from '../utils/api';

interface Shop {
  id: number;
  name: string;
  url: string;
  reportCount: number;
  averageRating: number;
  ratingCount: number;
  created_at: string;
  grade?: 'excellent' | 'good' | 'satisfactory' | null;
}

export function RecommendedShopsPage() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // 등급 분류 기준 (백엔드에서 grade가 있으면 사용, 없으면 계산)
  const getShopGrade = (shop: Shop): 'excellent' | 'good' | 'satisfactory' | 'none' => {
    // 백엔드에서 grade가 있으면 사용
    if (shop.grade) {
      return shop.grade;
    }
    
    // 백엔드에서 grade가 없으면 프론트엔드에서 계산
    // 매우 우수: 평균 별점 4.5 이상 + 리뷰 10개 이상
    if (shop.averageRating >= 4.5 && shop.ratingCount >= 10) {
      return 'excellent';
    }
    // 우수: 평균 별점 4.0 이상 + 리뷰 5개 이상
    if (shop.averageRating >= 4.0 && shop.ratingCount >= 5) {
      return 'good';
    }
    // 양호: 평균 별점 3.5 이상 + 리뷰 3개 이상
    if (shop.averageRating >= 3.5 && shop.ratingCount >= 3) {
      return 'satisfactory';
    }
    return 'none';
  };

  useEffect(() => {
    fetchRecommendedShops();
  }, []);

  const fetchRecommendedShops = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/shops/recommended/detailed`);
      const data = await response.json();
      
      if (data.success) {
        // 응답 형식: { success: true, data: { shops: [...] } } 또는 { success: true, shops: [...] }
        const shops = data.shops || data.data?.shops || data.data || [];
        // 등급이 있는 쇼핑몰만 필터링 (매우 우수, 우수, 양호만)
        const filteredShops = Array.isArray(shops) 
          ? shops.filter((shop: Shop) => {
              const grade = getShopGrade(shop);
              return grade === 'excellent' || grade === 'good' || grade === 'satisfactory';
            })
          : [];
        
        // 등급별로 정렬 (매우 우수 > 우수 > 양호), 같은 등급 내에서는 평점 높은 순
        const gradeOrder: { [key: string]: number } = { 'excellent': 3, 'good': 2, 'satisfactory': 1, 'none': 0 };
        const sortedShops = filteredShops.sort((a, b) => {
          const gradeA = getShopGrade(a);
          const gradeB = getShopGrade(b);
          const gradeDiff = (gradeOrder[gradeB] || 0) - (gradeOrder[gradeA] || 0);
          if (gradeDiff !== 0) {
            return gradeDiff;
          }
          return b.averageRating - a.averageRating;
        });
        
        setShops(sortedShops);
      } else {
        toast.error('추천 쇼핑몰 목록을 불러오는데 실패했습니다.');
      }
    } catch (error) {
      console.error('추천 쇼핑몰 조회 오류:', error);
      toast.error('서버 연결에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleShopClick = (shopUrl: string) => {
    navigate(`/search?url=${encodeURIComponent(shopUrl)}`);
  };

  const getRatingLevel = (rating: number, ratingCount: number) => {
    // 등급은 별점과 리뷰 개수를 모두 고려
    if (rating >= 4.5 && ratingCount >= 10) return { level: '매우 우수', color: 'text-green-600 bg-green-100', icon: '⭐' };
    if (rating >= 4.0 && ratingCount >= 5) return { level: '우수', color: 'text-blue-600 bg-blue-100', icon: '⭐' };
    if (rating >= 3.5 && ratingCount >= 3) return { level: '양호', color: 'text-yellow-600 bg-yellow-100', icon: '⭐' };
    return { level: '보통', color: 'text-gray-600 bg-gray-100', icon: '⭐' };
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    for (let i = 0; i < fullStars; i++) {
      stars.push(<span key={i} className="text-yellow-400">⭐</span>);
    }
    
    if (hasHalfStar) {
      stars.push(<span key="half" className="text-yellow-400">⭐</span>);
    }
    
    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<span key={`empty-${i}`} className="text-gray-300">⭐</span>);
    }
    
    return stars;
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-gray-50 z-50">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="page-sky-background">
      {/* 헤더 */}
      <div className="page-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 page-header-content">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">추천 쇼핑몰 목록</h1>
            <p className="text-xl max-w-3xl mx-auto text-slate-600">
              검색된 쇼핑몰 중 고객들의 높은 평가를 받은 신뢰할 수 있는 쇼핑몰들을 평점 순서대로 확인하세요. 
              안전하고 만족스러운 온라인 쇼핑 경험을 제공합니다.
            </p>
          </div>
        </div>
      </div>

      <div className="recommended-shops-page">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-8">

        {/* 통계 카드 */}
        <div className="stats-grid">
        <div className="stat-card stat-card-excellent">
            <div className="stat-header">
              <div className="stat-value text-green-600">
                {shops.filter(shop => getShopGrade(shop) === 'excellent').length}
              </div>
              <div className="stat-label">매우 우수</div>
            </div>
            <div className="stat-criteria">
              <div className="criteria-item">• 평점 4.5 이상</div>
              <div className="criteria-item">• 리뷰 10개 이상</div>
            </div>
        </div>

        <div className="stat-card stat-card-good">
            <div className="stat-header">
              <div className="stat-value text-blue-600">
                {shops.filter(shop => getShopGrade(shop) === 'good').length}
              </div>
              <div className="stat-label">우수</div>
            </div>
            <div className="stat-criteria">
              <div className="criteria-item">• 평점 4.0 이상</div>
              <div className="criteria-item">• 리뷰 5개 이상</div>
            </div>
        </div>

        <div className="stat-card stat-card-satisfactory">
            <div className="stat-header">
              <div className="stat-value text-yellow-600">
                {shops.filter(shop => getShopGrade(shop) === 'satisfactory').length}
              </div>
              <div className="stat-label">양호</div>
            </div>
            <div className="stat-criteria">
              <div className="criteria-item">• 평점 3.5 이상</div>
              <div className="criteria-item">• 리뷰 3개 이상</div>
            </div>
        </div>

        <div className="stat-card stat-card-total">
            <div className="stat-header">
              <div className="stat-value text-gray-600">
                {shops.length}
              </div>
              <div className="stat-label">총 추천 쇼핑몰</div>
            </div>
        </div>
        </div>

        {/* 쇼핑몰 목록 */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="px-6 py-4 bg-green-50 border-b border-green-200">
            <h2 className="text-xl font-semibold text-green-800 flex items-center">
              추천 쇼핑몰 순서대로 정렬
            </h2>
          </div>
          
          {shops.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">😔</div>
              <h3 className="empty-state-title">검색된 쇼핑몰이 없습니다.</h3>
              <p className="empty-state-description">아직 검색된 쇼핑몰이 없습니다. 먼저 쇼핑몰을 검색해보세요.</p>
            </div>
          ) : (
            <div className="shop-grid p-6">
              {shops.map((shop, index) => {
                const ratingInfo = getRatingLevel(shop.averageRating, shop.ratingCount);
                return (
                  <div 
                    key={shop.id} 
                    className="shop-item cursor-pointer"
                    onClick={() => handleShopClick(shop.url)}
                  >
                    <div className="shop-rank recommended">#{index + 1}</div>
                    
                    <div className="shop-info">
                      <h3 className="shop-name">{shop.name}</h3>
                      <div className="shop-url">{shop.url}</div>
                      
                      <div className="rating-display">
                        <div className="rating-stars">
                          {renderStars(shop.averageRating)}
                        </div>
                        <span className="rating-text">{shop.averageRating.toFixed(1)}</span>
                        <span className="text-sm text-gray-500">({shop.ratingCount}개 리뷰)</span>
                      </div>
                      
                      <div className="shop-stats">
                        <div className="stat-item">
                          <div className="stat-value text-green-600">{shop.averageRating.toFixed(1)}</div>
                          <div className="stat-label">평균 평점</div>
                        </div>
                        <div className="stat-item">
                          <div className="stat-value text-gray-600">{shop.reportCount}</div>
                          <div className="stat-label">피해 사례 제보 건수</div>
                        </div>
                      </div>
                      
                      <div className="mb-4">
                        <span className={`risk-indicator ${
                          getShopGrade(shop) === 'excellent' ? 'excellent-rating' :
                          getShopGrade(shop) === 'good' ? 'good-rating' :
                          getShopGrade(shop) === 'satisfactory' ? 'average-rating' : 'poor-rating'
                        }`}>
                          {ratingInfo.icon} {ratingInfo.level}
                        </span>
                      </div>
                      
                      <div className="shop-actions">
                        <button className="btn-primary">상세 분석</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
