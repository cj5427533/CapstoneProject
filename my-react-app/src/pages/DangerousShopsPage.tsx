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
}

export function DangerousShopsPage() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDangerousShops();
  }, []);

  const fetchDangerousShops = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/dangerous-shops`);
      const data = await response.json();
      
      if (data.success) {
        // 피해 사례 제보 건수가 0인 쇼핑몰들을 제외
        const filteredShops = data.shops.filter((shop: Shop) => shop.reportCount > 0);
        setShops(filteredShops);
      } else {
        toast.error('주의가 필요한 쇼핑몰 목록을 불러오는데 실패했습니다.');
      }
    } catch (error) {
      console.error('주의가 필요한 쇼핑몰 조회 오류:', error);
      toast.error('서버 연결에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleShopClick = (shopUrl: string) => {
    navigate(`/search?url=${encodeURIComponent(shopUrl)}`);
  };

  const getRiskLevel = (reportCount: number) => {
    if (reportCount >= 20) return { level: '매우 주의가 필요한', color: 'text-red-600 bg-red-100', icon: '🚨' };
    if (reportCount >= 10) return { level: '주의가 필요한', color: 'text-orange-600 bg-orange-100', icon: '⚠️' };
    if (reportCount >= 5) return { level: '주의', color: 'text-yellow-600 bg-yellow-100', icon: '⚠️' };
    return { level: '일반', color: 'text-gray-600 bg-gray-100', icon: 'ℹ️' };
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
            <h1 className="text-4xl font-bold mb-4">🚨 주의가 필요한 쇼핑몰 목록</h1>
            <p className="text-xl max-w-3xl mx-auto" style={{ color: 'rgba(255, 255, 255, 0.95)' }}>
              검색된 쇼핑몰 중 피해 사례 제보가 많이 접수된 쇼핑몰들을 피해 사례 제보 수 순서대로 확인하세요. 
              안전한 온라인 쇼핑을 위해 주의하시기 바랍니다.
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
            <div className="stat-label">매우 주의가 필요한</div>
        </div>

        <div className="stat-card">
            <div className="stat-value text-orange-600">
            {shops.filter(shop => shop.reportCount >= 10 && shop.reportCount < 20).length}
            </div>
            <div className="stat-label">주의가 필요한</div>
        </div>

        <div className="stat-card">
            <div className="stat-value text-yellow-600">
            {shops.filter(shop => shop.reportCount >= 5 && shop.reportCount < 10).length}
            </div>
            <div className="stat-label">주의</div>
        </div>

        <div className="stat-card">
            <div className="stat-value text-gray-600">
            {shops.length}
            </div>
            <div className="stat-label">총 피해 사례 제보된 쇼핑몰</div>
        </div>
        </div>


        {/* 쇼핑몰 목록 */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="px-6 py-4 bg-red-50 border-b border-red-200">
            <h2 className="text-xl font-semibold text-red-800 flex items-center">
              피해 사례 제보 많은 순서대로 정렬
            </h2>
          </div>
          
          {shops.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🎉</div>
              <h3 className="empty-state-title">검색된 쇼핑몰 중 피해 사례 제보된 쇼핑몰이 없습니다!</h3>
              <p className="empty-state-description">검색된 모든 쇼핑몰이 안전한 상태입니다.</p>
            </div>
          ) : (
            <div className="shop-grid p-6">
              {shops.map((shop, index) => {
                const riskInfo = getRiskLevel(shop.reportCount);
                return (
                  <div 
                    key={shop.id} 
                    className="shop-item cursor-pointer"
                    onClick={() => handleShopClick(shop.url)}
                  >
                    <div className="shop-rank dangerous">#{index + 1}</div>
                    
                    <div className="shop-info">
                      <h3 className="shop-name">{shop.name}</h3>
                      <div className="shop-url">{shop.url}</div>
                      
                      <div className="shop-stats">
                        <div className="stat-item">
                          <div className="stat-value text-red-600">{shop.reportCount}</div>
                          <div className="stat-label">피해 사례 제보 건수</div>
                        </div>
                        <div className="stat-item">
                          <div className="stat-value text-blue-600">{shop.averageRating.toFixed(1)}</div>
                          <div className="stat-label">평균 평점</div>
                        </div>
                      </div>
                      
                      <div className="mb-4">
                        <span className={`risk-indicator ${
                          shop.reportCount >= 20 ? 'risk-critical' :
                          shop.reportCount >= 10 ? 'risk-high' :
                          shop.reportCount >= 5 ? 'risk-medium' : 'risk-low'
                        }`}>
                          {riskInfo.icon} {riskInfo.level}
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
