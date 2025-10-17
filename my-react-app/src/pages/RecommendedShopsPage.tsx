import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

interface Shop {
  id: number;
  name: string;
  url: string;
  reportCount: number;
  averageRating: number;
  ratingCount: number;
  created_at: string;
}

export function RecommendedShopsPage() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchRecommendedShops();
  }, []);

  const fetchRecommendedShops = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:3001/api/recommended-shops');
      const data = await response.json();
      
      if (data.success) {
        // 평점이 0인 쇼핑몰들을 제외
        const filteredShops = data.shops.filter((shop: Shop) => shop.averageRating > 0);
        setShops(filteredShops);
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

  const getRatingLevel = (rating: number) => {
    if (rating >= 4.5) return { level: '매우 우수', color: 'text-green-600 bg-green-100', icon: '⭐' };
    if (rating >= 4.0) return { level: '우수', color: 'text-blue-600 bg-blue-100', icon: '⭐' };
    if (rating >= 3.5) return { level: '양호', color: 'text-yellow-600 bg-yellow-100', icon: '⭐' };
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
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="page-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 page-header-content">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">추천 쇼핑몰 목록</h1>
            <p className="text-xl opacity-90 max-w-3xl mx-auto">
              검색된 쇼핑몰 중 고객들의 높은 평가를 받은 신뢰할 수 있는 쇼핑몰들을 평점 순서대로 확인하세요. 
              안전하고 만족스러운 온라인 쇼핑 경험을 제공합니다.
            </p>
          </div>
        </div>
      </div>

      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">

        {/* 통계 카드 */}
        <div className="stats-grid">
        <div className="stat-card">
            <div className="stat-value text-red-600">
            {shops.filter(shop => shop.reportCount >= 20).length}
            </div>
            <div className="stat-label">매우 우수</div>
        </div>

        <div className="stat-card">
            <div className="stat-value text-orange-600">
            {shops.filter(shop => shop.reportCount >= 10 && shop.reportCount < 20).length}
            </div>
            <div className="stat-label">우수</div>
        </div>

        <div className="stat-card">
            <div className="stat-value text-yellow-600">
            {shops.filter(shop => shop.reportCount >= 5 && shop.reportCount < 10).length}
            </div>
            <div className="stat-label">양호</div>
        </div>

        <div className="stat-card">
            <div className="stat-value text-gray-600">
            {shops.length}
            </div>
            <div className="stat-label">총 추천 쇼핑몰</div>
        </div>
        </div>

        {/* 쇼핑몰 목록 */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="px-6 py-4 bg-green-50 border-b border-green-200">
            <h2 className="text-xl font-semibold text-green-800 flex items-center">
              평점 높은 순서대로 정렬
            </h2>
          </div>
          
          {shops.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">😔</div>
              <h3 className="empty-state-title">검색된 쇼핑몰이 없습니다</h3>
              <p className="empty-state-description">아직 검색된 쇼핑몰이 없습니다. 먼저 쇼핑몰을 검색해보세요.</p>
            </div>
          ) : (
            <div className="shop-grid p-6">
              {shops.map((shop, index) => {
                const ratingInfo = getRatingLevel(shop.averageRating);
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
                          <div className="stat-label">신고 건수</div>
                        </div>
                      </div>
                      
                      <div className="mb-4">
                        <span className={`risk-indicator ${
                          shop.averageRating >= 4.5 ? 'excellent-rating' :
                          shop.averageRating >= 4.0 ? 'good-rating' :
                          shop.averageRating >= 3.5 ? 'average-rating' : 'poor-rating'
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
  );
}
