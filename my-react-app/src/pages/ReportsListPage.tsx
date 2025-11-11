import { useState, useEffect } from 'react';
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
        JSON.parse(report.categories).includes(selectedCategory)
      ));
    }
  };

  const getCategoryBadge = (category: string) => {
    const colors = {
      '배송 문제': '#f59e0b',
      '상품 불일치': '#ef4444',
      '환불 문제': '#8b5cf6',
      '고객 서비스': '#06b6d4',
      '사기/피싱': '#dc2626',
      '품질 문제': '#f97316',
      '기타': '#6b7280'
    };
    
    return (
      <span 
        className="category-badge"
        style={{ backgroundColor: colors[category as keyof typeof colors] || '#6b7280' }}
      >
        {category}
      </span>
    );
  };

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
                  {reports.filter(r => JSON.parse(r.categories).includes(category)).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* 피해사례 목록 */}
        <div className="reports-list">
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
            filteredReports.map(report => (
              <div key={report.id} className="report-card">
                <div className="report-header">
                  <div className="report-info">
                    <h3 className="shop-name">
                      <Link to={`/search?url=${encodeURIComponent(report.shop_url || '')}`}>
                        {report.shops?.name || '알 수 없는 쇼핑몰'}
                      </Link>
                    </h3>
                    <div className="report-meta">
                      <span className="date">{formatDate(report.created_at)}</span>
                      <span className="evidence-count">
                        증빙자료 0개
                      </span>
                    </div>
                  </div>
                  <div className="report-categories">
                    {JSON.parse(report.categories).map((category: string) => (
                      <span key={category}>
                        {getCategoryBadge(category)}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div className="report-content">
                  <p className="description">{report.description}</p>
                </div>

                <div className="report-footer">
                  <div className="evidence-info">
                    <div className="evidence-files">
                      <span className="evidence-label">📎 첨부파일: 없음</span>
                    </div>
                  </div>
                  <div className="report-actions">
                    <Link 
                      to={`/search?url=${encodeURIComponent(report.shop_url || '')}`}
                      className="view-shop-button"
                    >
                      쇼핑몰 보기
                    </Link>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
