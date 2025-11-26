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
  grade?: 'critical' | 'high' | 'medium' | null;
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
      const response = await fetch(`${API_BASE_URL}/shops/dangerous/list`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('주의가 필요한 쇼핑몰 응답 데이터:', data);
      
      if (data.success) {
        // 응답 형식: { success: true, data: { shops: [...] } } 또는 { success: true, shops: [...] }
        const shops = data.shops || data.data?.shops || data.data || [];
        console.log('추출된 shops:', shops);
        
        // 등급이 있는 쇼핑몰만 필터링 (피싱 의심, 주의, 약간 주의만)
        const filteredShops = Array.isArray(shops) 
          ? shops.filter((shop: Shop) => {
              const grade = getShopGrade(shop);
              return grade === 'critical' || grade === 'high' || grade === 'medium';
            })
          : [];
        
        // 등급별로 정렬 (피싱 의심 > 주의 > 약간 주의), 같은 등급 내에서는 신고 수 많은 순
        const gradeOrder: { [key: string]: number } = { 'critical': 3, 'high': 2, 'medium': 1, 'none': 0 };
        const sortedShops = filteredShops.sort((a, b) => {
          const gradeA = getShopGrade(a);
          const gradeB = getShopGrade(b);
          const gradeDiff = (gradeOrder[gradeB] || 0) - (gradeOrder[gradeA] || 0);
          if (gradeDiff !== 0) {
            return gradeDiff;
          }
          return b.reportCount - a.reportCount;
        });
        
        console.log('필터링 및 정렬된 shops:', sortedShops);
        setShops(sortedShops);
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

  // 등급 분류 기준 (백엔드에서 grade가 있으면 사용, 없으면 계산)
  const getShopGrade = (shop: Shop): 'critical' | 'high' | 'medium' | 'none' => {
    // 백엔드에서 grade가 있으면 사용
    if (shop.grade) {
      return shop.grade;
    }
    
    // 백엔드에서 grade가 없으면 프론트엔드에서 계산
    const reportCount = shop.reportCount;
    const averageRating = shop.averageRating || 0;
    
    // 피싱 의심: 신고 10개 이상 AND 평점 2.0 이하, 또는 신고 15개 이상
    if ((reportCount >= 10 && averageRating <= 2.0) || reportCount >= 15) {
      return 'critical';
    }
    // 주의: 신고 5개 이상 AND 평점 3.0 이하, 또는 신고 10개 이상
    if ((reportCount >= 5 && averageRating <= 3.0) || reportCount >= 10) {
      return 'high';
    }
    // 약간 주의: 신고 3개 이상 AND 평점 3.5 이하, 또는 신고 5개 이상
    if ((reportCount >= 3 && averageRating <= 3.5) || reportCount >= 5) {
      return 'medium';
    }
    return 'none';
  };

  const getRiskLevel = (shop: Shop) => {
    const grade = getShopGrade(shop);
    if (grade === 'critical') return { level: '피싱 의심', color: 'text-red-600 bg-red-100', icon: '🚨' };
    if (grade === 'high') return { level: '주의', color: 'text-orange-600 bg-orange-100', icon: '⚠️' };
    if (grade === 'medium') return { level: '약간 주의', color: 'text-yellow-600 bg-yellow-100', icon: '⚠️' };
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
    <div className="page-sky-background">
      {/* 헤더 */}
      <div className="page-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 page-header-content">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">🚨 주의가 필요한 쇼핑몰 목록</h1>
            <p className="text-xl max-w-3xl mx-auto text-slate-600">
              검색된 쇼핑몰 중 피해 사례 제보가 많이 접수된 쇼핑몰들을 피해 사례 제보 수 순서대로 확인하세요. 
              안전한 온라인 쇼핑을 위해 주의하시기 바랍니다.
            </p>
            <div className="disclaimer-notice" style={{ marginTop: '1.5rem', padding: '1rem', background: '#fff3cd', border: '1px solid #ffc107', borderRadius: '8px', fontSize: '0.9rem', color: '#856404', maxWidth: '800px', marginLeft: 'auto', marginRight: 'auto' }}>
              <strong>⚠️ 안내사항:</strong> 본 목록에 표시된 정보는 참고용이며, 법적 효력은 없습니다. 최종 판단은 사용자 본인의 몫이며, 실제 거래 시 신중한 검토가 필요합니다.
            </div>
          </div>
        </div>
      </div>

      <div className="dangerous-shops-page">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-8">

        {/* 통계 카드 */}
        <div className="stats-grid">
        <div className="stat-card stat-card-critical">
            <div className="stat-header">
              <div className="stat-value text-red-600">
                {shops.filter(shop => getShopGrade(shop) === 'critical').length}
              </div>
              <div className="stat-label">피싱 의심</div>
            </div>
            <div className="stat-criteria">
              <div className="criteria-item">• 신고 10개 이상 + 평점 2.0 이하</div>
              <div className="criteria-item">• 또는 신고 15개 이상</div>
            </div>
        </div>

        <div className="stat-card stat-card-high">
            <div className="stat-header">
              <div className="stat-value text-orange-600">
                {shops.filter(shop => getShopGrade(shop) === 'high').length}
              </div>
              <div className="stat-label">주의</div>
            </div>
            <div className="stat-criteria">
              <div className="criteria-item">• 신고 5개 이상 + 평점 3.0 이하</div>
              <div className="criteria-item">• 또는 신고 10개 이상</div>
            </div>
        </div>

        <div className="stat-card stat-card-medium">
            <div className="stat-header">
              <div className="stat-value text-yellow-600">
                {shops.filter(shop => getShopGrade(shop) === 'medium').length}
              </div>
              <div className="stat-label">약간 주의</div>
            </div>
            <div className="stat-criteria">
              <div className="criteria-item">• 신고 3개 이상 + 평점 3.5 이하</div>
              <div className="criteria-item">• 또는 신고 5개 이상</div>
            </div>
        </div>

        <div className="stat-card stat-card-total">
            <div className="stat-header">
              <div className="stat-value text-gray-600">
                {shops.length}
              </div>
              <div className="stat-label">총 피해 사례 제보된 쇼핑몰</div>
            </div>
        </div>
        </div>


        {/* 쇼핑몰 목록 */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="px-6 py-4 bg-red-50 border-b border-red-200">
            <h2 className="text-xl font-semibold text-red-800 flex items-center">
              위험도 순서대로 정렬 (피싱 의심 &gt; 주의 &gt; 약간 주의)
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
                const riskInfo = getRiskLevel(shop);
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
                          <div className="stat-value text-blue-600">
                            {shop.averageRating != null ? shop.averageRating.toFixed(1) : 'N/A'}
                          </div>
                          <div className="stat-label">평균 평점</div>
                        </div>
                      </div>
                      
                      <div className="mb-4">
                        <span className={`risk-indicator ${
                          getShopGrade(shop) === 'critical' ? 'risk-critical' :
                          getShopGrade(shop) === 'high' ? 'risk-high' :
                          getShopGrade(shop) === 'medium' ? 'risk-medium' : 'risk-low'
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
    </div>
  );
}
