import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDangerousPages } from '../utils/api';
import type { DangerousShop } from '../utils/api';

export function DangerousPage() {
  const [dangerousPages, setDangerousPages] = useState<DangerousShop[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loadDangerousPages = async () => {
      try {
        setIsLoading(true);
        const dangerous = await getDangerousPages();
        setDangerousPages(dangerous);
        setLastUpdate(new Date());
      } catch (error) {
        console.error('매우주의 페이지 로드 에러:', error);
      } finally {
        setIsLoading(false);
      }
    };

    // 초기 로드
    loadDangerousPages();

    // 30초마다 자동 새로고침
    const interval = setInterval(() => {
      loadDangerousPages();
      console.log('매우주의 페이지 자동 새로고침');
    }, 30000);

    // cleanup
    return () => {
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="dangerous-page">
      <div className="page-container">
        <div className="page-header">
          <h1>매우주의 쇼핑몰</h1>
          <p className="page-subtitle">
            신고가 접수된 모든 쇼핑몰 목록입니다. 이용에 주의하세요.
          </p>
          {lastUpdate && (
            <div className="update-info">
              <span className="update-text">
                마지막 업데이트: {lastUpdate.toLocaleTimeString('ko-KR')}
              </span>
              <span className="update-hint"> (30초마다 자동 업데이트)</span>
            </div>
          )}
          <div className="disclaimer-notice" style={{ marginTop: '1rem', padding: '1rem', background: '#fff3cd', border: '1px solid #ffc107', borderRadius: '8px', fontSize: '0.9rem', color: '#856404' }}>
            <strong>⚠️ 안내사항:</strong> 본 목록에 표시된 정보는 참고용이며, 법적 효력은 없습니다. 최종 판단은 사용자 본인의 몫이며, 실제 거래 시 신중한 검토가 필요합니다.
          </div>
        </div>

        <div className="dangerous-list">
          {isLoading ? (
            <div className="loading-container">
              <p>데이터를 불러오는 중...</p>
            </div>
          ) : dangerousPages.length === 0 ? (
            <div className="empty-container">
              <p className="empty-message">아직 신고된 쇼핑몰이 없습니다.</p>
            </div>
          ) : (
            dangerousPages.map((shop, index) => (
              <div
                key={shop.id}
                className="dangerous-card"
                onClick={() => navigate(`/search?url=${encodeURIComponent(shop.url)}`)}
              >
                <div className="card-rank">
                  <span className="rank-number">#{index + 1}</span>
                </div>
                <div className="card-content">
                  <h3 className="shop-name" title={shop.name || shop.url}>
                    {shop.name || shop.url}
                  </h3>
                  <p className="shop-url">{shop.url}</p>
                  <div className="shop-stats">
                    <span className="report-count">
                      🚨 {shop.reportCount}건 신고
                    </span>
                  </div>
                </div>
                <div className="card-action">
                  <button className="detail-button">
                    상세 보기 →
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <style>{`
        .dangerous-page {
          min-height: 100vh;
          background: var(--background-color);
          padding: 2rem 1rem;
        }

        .page-container {
          max-width: 1200px;
          margin: 0 auto;
        }

        .page-header {
          text-align: center;
          margin-bottom: 3rem;
          padding: 2rem;
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .page-header h1 {
          font-size: 2.5rem;
          color: #d63031;
          margin-bottom: 1rem;
        }

        .page-subtitle {
          font-size: 1.1rem;
          color: #666;
          margin-bottom: 1rem;
        }

        .update-info {
          display: inline-block;
          background: #f8f9fa;
          padding: 0.5rem 1rem;
          border-radius: 20px;
          font-size: 0.9rem;
          color: #666;
        }

        .update-text {
          font-weight: 500;
          color: #333;
        }

        .update-hint {
          color: #999;
        }

        .dangerous-list {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 1.5rem;
        }

        .loading-container,
        .empty-container {
          grid-column: 1 / -1;
          text-align: center;
          padding: 4rem 2rem;
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .empty-message {
          font-size: 1.1rem;
          color: #999;
        }

        .dangerous-card {
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          transition: all 0.3s ease;
          cursor: pointer;
          display: flex;
          align-items: center;
          padding: 1.5rem;
          gap: 1.5rem;
          border-left: 4px solid #d63031;
        }

        .dangerous-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
        }

        .card-rank {
          flex-shrink: 0;
        }

        .rank-number {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 50px;
          height: 50px;
          background: linear-gradient(135deg, #d63031 0%, #e17055 100%);
          color: white;
          border-radius: 50%;
          font-size: 1.2rem;
          font-weight: bold;
        }

        .card-content {
          flex: 1;
          min-width: 0;
        }

        .shop-name {
          font-size: 1.2rem;
          font-weight: 600;
          color: #2d3436;
          margin: 0 0 0.5rem 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .shop-url {
          font-size: 0.9rem;
          color: #636e72;
          margin: 0 0 0.75rem 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .shop-stats {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .report-count {
          display: inline-block;
          background: #fff5f5;
          color: #d63031;
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.9rem;
          font-weight: 600;
        }

        .card-action {
          flex-shrink: 0;
        }

        .detail-button {
          padding: 0.75rem 1.5rem;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          white-space: nowrap;
        }

        .detail-button:hover {
          transform: translateX(4px);
          box-shadow: 0 4px 8px rgba(102, 126, 234, 0.3);
        }

        @media (max-width: 768px) {
          .dangerous-page {
            padding: 1rem;
          }

          .page-header h1 {
            font-size: 1.8rem;
          }

          .page-subtitle {
            font-size: 1rem;
          }

          .dangerous-list {
            grid-template-columns: 1fr;
          }

          .dangerous-card {
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
          }

          .card-action {
            width: 100%;
          }

          .detail-button {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}

