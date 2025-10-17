import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { FakeReviewDetector, FakeReviewResult, ShopType } from '../services/fakeReviewDetector';
import { Review } from '../utils/openRouter';

interface FakeReviewAnalysisProps {
  reviews: Review[];
  shopType: ShopType;
}

interface AnalysisStatistics {
  fakeCount: number;
  fakePercentage: number;
  patternStats: {
    textPattern: number;
    temporalPattern: number;
    behaviorPattern: number;
  };
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export const FakeReviewAnalysis: React.FC<FakeReviewAnalysisProps> = ({
  reviews,
  shopType
}) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [fakeReviews, setFakeReviews] = useState<FakeReviewResult[]>([]);
  const [statistics, setStatistics] = useState<AnalysisStatistics | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);

  const detector = FakeReviewDetector.getInstance();

  const runAnalysis = async () => {
    if (reviews.length === 0) {
      toast.error('분석할 리뷰가 없습니다.');
      return;
    }

    setIsAnalyzing(true);
    try {
      const results = await detector.detectFakeReviews(reviews, shopType);
      setFakeReviews(results);
      
      const stats = detector.generateStatistics(results, reviews.length);
      setStatistics(stats);
      
      // 분석 완료 후 모달 표시
      setShowAnalysisModal(true);
      
      if (results.length > 0) {
        toast.success(`${results.length}개의 의심스러운 리뷰가 발견되었습니다.`);
      } else {
        toast.info('의심스러운 리뷰 패턴이 발견되지 않았습니다.');
      }
    } catch (error) {
      console.error('가짜 리뷰 분석 오류:', error);
      toast.error('리뷰 분석 중 오류가 발생했습니다.');
    } finally {
      setIsAnalyzing(false);
    }
  };


  const getRiskLevelText = (level: string) => {
    switch (level) {
      case 'LOW': return '낮음';
      case 'MEDIUM': return '보통';
      case 'HIGH': return '높음';
      case 'CRITICAL': return '매우 높음';
      default: return '알 수 없음';
    }
  };

  return (
    <div className="fake-review-analysis bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold text-gray-800 flex items-center">
          🔍 AI 리뷰 신뢰도 분석
          {shopType.type === 'mock' && (
            <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
              목업
            </span>
          )}
        </h3>
        <button
          onClick={runAnalysis}
          disabled={isAnalyzing}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isAnalyzing ? '분석 중...' : 'AI 분석 시작'}
        </button>
      </div>

      {shopType.type === 'mock' && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-blue-800 text-sm">
            ⚠️ 이 쇼핑몰은 교육용 목업입니다. AI 분석 결과는 가짜 리뷰 패턴 학습을 위한 것입니다.
          </p>
        </div>
      )}

      {/* 분석 결과는 모달로 표시됨 */}

      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-600">
          * AI 분석 결과는 참고용이며, 모든 리뷰가 가짜라는 의미는 아닙니다.
        </p>
        {shopType.type === 'mock' && (
          <p className="text-sm text-gray-600 mt-1">
            * 목업 쇼핑몰의 리뷰는 교육용으로 의도적으로 만들어진 것입니다.
          </p>
        )}
      </div>

      {/* 분석 결과 모달 */}
      {showAnalysisModal && statistics && (
        <div className="analysis-modal-overlay">
          <div className="analysis-modal-content">
            <div className="analysis-modal-header">
              <h3 className="analysis-modal-title">
                AI 리뷰 신뢰도 분석 결과
              </h3>
              <button 
                className="analysis-modal-close"
                onClick={() => setShowAnalysisModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="analysis-modal-body">
              <div className="space-y-6">
                {/* 통계 정보 */}
                <div className="analysis-result-section fake-review">
                  <h4 className="analysis-result-title">
                    분석 결과 요약
                  </h4>
                  <div className="analysis-stats-grid">
                    <div className="analysis-stat-card">
                      <h5 className="analysis-stat-title">의심스러운 리뷰</h5>
                      <p className="analysis-stat-value">{statistics.fakeCount}개</p>
                      <p className="analysis-stat-subtitle">
                        전체 {reviews.length}개 중 {statistics.fakePercentage}%
                      </p>
                    </div>
                    
                    <div className="analysis-stat-card">
                      <h5 className="analysis-stat-title">위험도</h5>
                      <p className="analysis-stat-value">
                        <span className={`analysis-risk-badge ${statistics.riskLevel.toLowerCase()}`}>
                          {getRiskLevelText(statistics.riskLevel)}
                        </span>
                      </p>
                      <p className="analysis-stat-subtitle">종합 평가</p>
                    </div>
                    
                    <div className="analysis-stat-card">
                      <h5 className="analysis-stat-title">패턴 분석</h5>
                      <div className="analysis-detail-scores">
                        <div>텍스트: {Math.round(statistics.patternStats.textPattern * 100)}%</div>
                        <div>시간적: {Math.round(statistics.patternStats.temporalPattern * 100)}%</div>
                        <div>행동: {Math.round(statistics.patternStats.behaviorPattern * 100)}%</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 상세 리뷰 정보 */}
                {fakeReviews.length > 0 && (
                  <div className="analysis-result-section fake-review">
                    <h4 className="analysis-result-title">
                      의심스러운 리뷰 상세
                    </h4>
                    
                    <button
                      onClick={() => setShowDetails(!showDetails)}
                      className="analysis-details-button"
                    >
                      {showDetails ? '상세 정보 숨기기' : '상세 정보 보기'} ({fakeReviews.length}개)
                    </button>
                    
                    {showDetails && (
                      <div className="analysis-details">
                        {fakeReviews.map((result, index) => (
                          <div key={index} className="analysis-detail-card">
                            <div className="analysis-detail-header">
                              <div className="analysis-detail-badges">
                                <span className="analysis-badge fake">
                                  의심도: {Math.round(result.fakeScore * 100)}%
                                </span>
                                <span className="analysis-badge rating">
                                  평점: {result.review.rating}점
                                </span>
                              </div>
                              <span className="analysis-detail-date">
                                {new Date(result.review.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            
                            <p className="analysis-detail-content">{result.review.content}</p>
                            
                            <div className="analysis-patterns">
                              <h6 className="analysis-patterns-title">발견된 패턴:</h6>
                              <ul className="analysis-patterns-list">
                                {result.reasons.map((reason, reasonIndex) => (
                                  <li key={reasonIndex}>{reason}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 면책 조항 */}
                <div className="analysis-disclaimer">
                  <p className="analysis-disclaimer-text">
                    * AI 분석 결과는 참고용이며, 모든 리뷰가 가짜라는 의미는 아닙니다.
                  </p>
                  {shopType.type === 'mock' && (
                    <p className="analysis-disclaimer-text">
                      * 목업 쇼핑몰의 리뷰는 교육용으로 의도적으로 만들어진 것입니다.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
