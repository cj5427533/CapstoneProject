import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { getReports } from '../utils/api';
import { Report } from '../utils/api';

const categories = [
  '전체',
  '배송 문제',
  '상품 불일치', 
  '환불 문제',
  '고객 서비스',
  '사기/피싱',
  '품질 문제',
  '기타'
];

const parseCategories = (rawCategories: string): string[] => {
  try {
    const parsed = JSON.parse(rawCategories);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const getReportSeverity = (reportCategories: string[]) => {
  if (reportCategories.includes('사기/피싱')) {
    return { label: '긴급 주의', indicatorClass: 'risk-critical', rankClass: 'report-critical', icon: '🚨' };
  }
  if (reportCategories.includes('환불 문제') || reportCategories.includes('고객 서비스')) {
    return { label: '주의 필요', indicatorClass: 'risk-high', rankClass: 'report-high', icon: '⚠️' };
  }
  if (reportCategories.includes('배송 문제') || reportCategories.includes('품질 문제')) {
    return { label: '관심 필요', indicatorClass: 'risk-medium', rankClass: 'report-medium', icon: '⚠️' };
  }

  return { label: '정보', indicatorClass: 'risk-low', rankClass: 'report-low', icon: 'ℹ️' };
};

export function ReportsListPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [filteredReports, setFilteredReports] = useState<Report[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('전체');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReports();
  }, []);

  useEffect(() => {
    filterReports();
  }, [reports, selectedCategory]);

  const loadReports = async () => {
    try {
      setLoading(true);
      const reportsData = await getReports();
      setReports(reportsData);
    } catch (error) {
      console.error('피해사례 목록 로드 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterReports = () => {
    if (selectedCategory === '전체') {
      setFilteredReports(reports);
    } else {
      setFilteredReports(reports.filter(report => 
        parseCategories(report.categories).includes(selectedCategory)
      ));
    }
  };

  const reportStats = useMemo(() => {
    const total = reports.length;
    const critical = reports.filter(report => {
      const reportCategories = parseCategories(report.categories);
      return getReportSeverity(reportCategories).indicatorClass === 'risk-critical';
    }).length;

    const recent = reports.filter(report => {
      const created = new Date(report.created_at);
      const diffDays = (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24);
      return diffDays <= 30;
    }).length;

    const shopIds = new Set(
      reports.map(report => report.shops?.id ?? report.shop_id ?? report.shop_url ?? `report-${report.id}`)
    );

    return {
      total,
      critical,
      recent,
      uniqueShops: shopIds.size
    };
  }, [reports]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="page-sky-background">
        <div className="reports-list-page">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>피해사례 목록을 불러오는 중...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-sky-background">
      <div className="reports-list-page">
        <div className="page-header">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 page-header-content">
            <div className="text-center space-y-3">
              <h1 className="text-4xl font-bold">피해사례 제보 목록</h1>
              <p className="text-lg text-slate-600">
                실제 이용자들이 경험한 피해사례를 한눈에 확인하고, 위험 신호를 빠르게 파악해 보세요.
              </p>
              <p className="text-base text-slate-500">
                카테고리별 필터로 원하는 사례만 모아볼 수 있으며, 상세 페이지에서 쇼핑몰 분석도 이어서 확인할 수 있습니다.
              </p>
            </div>
          </div>
        </div>

        {/* 카테고리 탭 */}
        <div className="category-tabs">
          {categories.map(category => (
            <button
              key={category}
              className={`tab-button ${selectedCategory === category ? 'active' : ''}`}
              onClick={() => setSelectedCategory(category)}
            >
              {category}
              {category !== '전체' && (
                <span className="count">
                  {reports.filter(r => parseCategories(r.categories).includes(category)).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* 통계 카드 */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value text-indigo-600">{reportStats.total}</div>
            <div className="stat-label">전체 피해사례</div>
          </div>
          <div className="stat-card">
            <div className="stat-value text-red-600">{reportStats.critical}</div>
            <div className="stat-label">긴급 주의 사례</div>
          </div>
          <div className="stat-card">
            <div className="stat-value text-blue-600">{reportStats.uniqueShops}</div>
            <div className="stat-label">제보된 쇼핑몰 수</div>
          </div>
          <div className="stat-card">
            <div className="stat-value text-emerald-600">{reportStats.recent}</div>
            <div className="stat-label">최근 30일 내 제보</div>
          </div>
        </div>

        {/* 피해사례 목록 */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="px-6 py-4 bg-indigo-50 border-b border-indigo-200">
            <h2 className="text-xl font-semibold text-indigo-800 flex items-center">
              최신 피해사례 제보
            </h2>
          </div>

          <div className="reports-list reports-grid shop-grid p-6">
            {filteredReports.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📝</div>
                <h3>아직 제보된 피해사례가 없습니다</h3>
                <p>첫 번째 피해사례를 제보해주세요!</p>
                <Link to="/report" className="report-button">
                  피해사례 제보하기
                </Link>
              </div>
            ) : (
              filteredReports.map((report, index) => {
                const shopUrl = report.shop_url || report.shops?.url || '';
                const parsedCategories = parseCategories(report.categories);
                const shopName = report.shops?.name || '알 수 없는 쇼핑몰';
                const hasShopLink = Boolean(shopUrl);
                const severity = getReportSeverity(parsedCategories);

                return (
                  <article key={report.id} className="shop-item report-item">
                    <div className={`shop-rank report ${severity.rankClass}`}>#{index + 1}</div>

                    <div className="shop-info">
                      <div className={`risk-indicator ${severity.indicatorClass}`}>
                        {severity.icon} {severity.label}
                      </div>

                      <h3 className="shop-name">
                        {hasShopLink ? (
                          <Link to={`/search?url=${encodeURIComponent(shopUrl)}`}>
                            {shopName}
                          </Link>
                        ) : (
                          <span>{shopName}</span>
                        )}
                      </h3>

                      <div className="report-details-meta">
                        <span>{formatDate(report.created_at)}</span>
                        <span>{report.reporter_name ? `제보자 ${report.reporter_name}` : '익명 제보'}</span>
                      </div>

                      <div className="report-tags">
                        {parsedCategories.map((category: string) => (
                          <span key={category} className="report-tag">
                            {category}
                          </span>
                        ))}
                      </div>

                      <p className="report-description">{report.description}</p>

                      <div className="shop-stats">
                        <div className="stat-item">
                          <div className="stat-value text-rose-600">{parsedCategories.length}</div>
                          <div className="stat-label">연관 카테고리</div>
                        </div>
                        <div className="stat-item">
                          <div className="stat-value text-slate-600">
                            {report.shops?.url ? '등록된 쇼핑몰' : '직접 입력'}
                          </div>
                          <div className="stat-label">쇼핑몰 정보</div>
                        </div>
                      </div>

                      <div className="shop-actions">
                        <Link 
                          to={hasShopLink ? `/search?url=${encodeURIComponent(shopUrl)}` : '#'}
                          className={`btn-primary ${hasShopLink ? '' : 'disabled-link'}`}
                          onClick={(event) => {
                            if (!hasShopLink) {
                              event.preventDefault();
                            }
                          }}
                          aria-disabled={!hasShopLink}
                        >
                          쇼핑몰 분석 보기
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
