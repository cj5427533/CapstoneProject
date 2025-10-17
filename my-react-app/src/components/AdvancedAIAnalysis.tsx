import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { AdvancedFakeReviewDetector, FakeReviewResult } from '../services/advancedFakeReviewDetector';
import { ShopRiskAnalyzer, Shop, Report, Rating, ShopRiskResult } from '../services/shopRiskAnalyzer';
import { RealTimePhishingSystem, PhishingAlert } from '../services/realTimePhishingSystem';
import { AdvancedFakeReviewSystem } from '../services/advancedFakeReviewSystem';
import { FakeReviewDetector, ShopType } from '../services/fakeReviewDetector';
import { Review } from '../utils/openRouter';

interface AdvancedAIAnalysisProps {
  shop: Shop;
  reports: Report[];
  ratings: Rating[];
  shopUrl: string;
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

export const AdvancedAIAnalysis: React.FC<AdvancedAIAnalysisProps> = ({
  shop,
  reports,
  ratings,
  shopUrl
}) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<{
    fakeReviews: FakeReviewResult[];
    shopRisk: ShopRiskResult | null;
    phishingAlert: PhishingAlert | null;
  } | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [monitoringEnabled, setMonitoringEnabled] = useState(false);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  
  // AI 리뷰 분석 관련 상태
  const [isReviewAnalyzing, setIsReviewAnalyzing] = useState(false);
  const [fakeReviews, setFakeReviews] = useState<FakeReviewResult[]>([]);
  const [reviewStatistics, setReviewStatistics] = useState<AnalysisStatistics | null>(null);
  const [showReviewDetails, setShowReviewDetails] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);

  const fakeReviewDetector = AdvancedFakeReviewDetector.getInstance();
  const shopRiskAnalyzer = ShopRiskAnalyzer.getInstance();
  const phishingSystem = RealTimePhishingSystem.getInstance();
  const advancedSystem = AdvancedFakeReviewSystem.getInstance();
  const basicFakeReviewDetector = FakeReviewDetector.getInstance();

  useEffect(() => {
    // 실시간 모니터링 상태 확인
    const status = advancedSystem.getSystemStatus();
    setMonitoringEnabled(status.monitoringShops > 0);
  }, []);

  const runAdvancedAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      // 1. 고급 가짜 리뷰 탐지
      const fakeReviewResults = await fakeReviewDetector.detectFakeReviews([]);
      
      // 2. 쇼핑몰 위험도 분석
      const shopRiskResult = await shopRiskAnalyzer.analyzeShopRisk(shop, reports, ratings);
      
      // 3. 실시간 피싱 탐지
      const phishingAlert = await phishingSystem.detectPhishingRealTime(shopUrl);
      
      setAnalysisResults({
        fakeReviews: fakeReviewResults,
        shopRisk: shopRiskResult,
        phishingAlert
      });
      
      // 4. 통계 생성
      // const fakeStats = fakeReviewDetector.generateStatistics(fakeReviewResults, ratings.length);
      
      // 분석 완료 후 모달 표시
      setShowAnalysisModal(true);
      
      if (fakeReviewResults.length > 0 || shopRiskResult.riskScore >= 70 || phishingAlert) {
        toast.success('고급 AI 분석이 완료되었습니다. 주의가 필요한 항목이 발견되었습니다.');
      } else {
        toast.info('고급 AI 분석이 완료되었습니다. 특별한 문제가 발견되지 않았습니다.');
      }
      
    } catch (error) {
      console.error('고급 AI 분석 오류:', error);
      toast.error('AI 분석 중 오류가 발생했습니다.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const toggleRealTimeMonitoring = () => {
    if (monitoringEnabled) {
      advancedSystem.stopRealTimeMonitoring(shop.id);
      setMonitoringEnabled(false);
      toast.info('실시간 모니터링이 중지되었습니다.');
    } else {
      advancedSystem.startRealTimeMonitoring(shop.id);
      setMonitoringEnabled(true);
      toast.success('실시간 모니터링이 시작되었습니다.');
    }
  };

  const runReviewAnalysis = async () => {
    if (ratings.length === 0) {
      toast.error('분석할 리뷰가 없습니다.');
      return;
    }

    setIsReviewAnalyzing(true);
    try {
      const shopType: ShopType = { type: 'real' };
      const reviews: Review[] = ratings.map(rating => ({
        id: rating.id.toString(),
        content: `평점: ${rating.rating}점`, // Rating에는 content가 없으므로 임시로 생성
        rating: rating.rating,
        createdAt: rating.created_at,
        userId: 'unknown' // Rating에는 userId가 없으므로 기본값 사용
      }));

      const results = await basicFakeReviewDetector.detectFakeReviews(reviews, shopType);
      // AdvancedFakeReviewResult로 변환
      const advancedResults: FakeReviewResult[] = results.map(result => ({
        ...result,
        confidence: result.fakeScore // confidence 필드 추가
      }));
      setFakeReviews(advancedResults);
      
      const stats = basicFakeReviewDetector.generateStatistics(results, reviews.length);
      setReviewStatistics(stats);
      
      // 분석 완료 후 모달 표시
      setShowReviewModal(true);
      
      if (results.length > 0) {
        toast.success(`${results.length}개의 의심스러운 리뷰가 발견되었습니다.`);
      } else {
        toast.info('의심스러운 리뷰 패턴이 발견되지 않았습니다.');
      }
    } catch (error) {
      console.error('가짜 리뷰 분석 오류:', error);
      toast.error('리뷰 분석 중 오류가 발생했습니다.');
    } finally {
      setIsReviewAnalyzing(false);
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
    <div className="advanced-ai-analysis bg-white rounded-lg shadow-lg p-6 mb-6">
      {/* 헤더 섹션은 분석 기준 컨테이너로 이동됨 */}


      {/* 분석 결과는 모달로 표시됨 */}

      {/* 분석 기준 설명 */}
      <div className="analysis-criteria-container">
        <div className="criteria-header">
          <div className="criteria-title">
            <h5>고급 AI 분석 시스템 구체적 기준 기반</h5>
          </div>
          
          <div className="action-buttons">
            <button 
              className={`monitor-btn ${monitoringEnabled ? 'active' : ''}`}
              onClick={toggleRealTimeMonitoring}
            >
              {monitoringEnabled ? '모니터링 중지' : '실시간 모니터링'}
            </button>
            <button 
              className="review-analyze-btn"
              onClick={runReviewAnalysis}
              disabled={isReviewAnalyzing}
            >
              {isReviewAnalyzing ? '분석 중...' : 'AI 리뷰 분석'}
            </button>
            <button 
              className="analyze-btn"
              onClick={runAdvancedAnalysis}
              disabled={isAnalyzing}
            >
              {isAnalyzing ? '분석 중...' : '고급 AI 분석 시작'}
            </button>
          </div>
        </div>

        <div className="criteria-subtitle">
          <span className="triangle-icon">▲</span>
          <span>우리만의 구체적 분석 기준</span>
        </div>

        <div className="criteria-grid">
          <div className="criteria-section">
            <h6 className="section-title fake-review">가짜 리뷰 탐지:</h6>
            <ul className="criteria-list">
              <li>과도한 긍정 표현 2개 이상 사용</li>
              <li>5분 내 3개 이상 연속 리뷰</li>
              <li>90% 이상 5점 리뷰</li>
              <li>비현실적 배송/가격 표현</li>
            </ul>
          </div>

          <div className="criteria-section">
            <h6 className="section-title phishing">피싱 사이트 탐지:</h6>
            <ul className="criteria-list">
              <li>유명 사이트와 85% 이상 유사한 도메인</li>
              <li>긴급성 강조 표현 3개 이상</li>
              <li>30일 이내 신규 도메인</li>
              <li>사업자 정보 2개 이상 부족</li>
            </ul>
          </div>
        </div>

        <div className="disclaimer">
          <span>면책 조항: AI 분석 결과는 참고용이며, 최종 판단은 사용자에게 있습니다. 모든 분석은 구체적인 기준에 따라 객관적으로 수행됩니다.</span>
        </div>
      </div>

      {/* 분석 결과 모달 */}
      {showAnalysisModal && analysisResults && (
        <div className="analysis-modal-overlay">
          <div className="analysis-modal-content">
            <div className="analysis-modal-header">
              <h3 className="analysis-modal-title">
                고급 AI 분석 결과
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
                {/* 1. 가짜 리뷰 탐지 결과 */}
                {analysisResults.fakeReviews.length > 0 && (
                  <div className="analysis-result-section fake-review">
                    <h4 className="analysis-result-title">
                      가짜 리뷰 탐지 결과 (구체적 기준)
                    </h4>
                    <div className="analysis-stats-grid">
                      <div className="analysis-stat-card">
                        <h5 className="analysis-stat-title">의심스러운 리뷰</h5>
                        <p className="analysis-stat-value">{analysisResults.fakeReviews.length}개</p>
                        <p className="analysis-stat-subtitle">전체 {ratings.length}개 중</p>
                      </div>
                      <div className="analysis-stat-card">
                        <h5 className="analysis-stat-title">평균 의심도</h5>
                        <p className="analysis-stat-value">
                          {Math.round(analysisResults.fakeReviews.reduce((sum, r) => sum + r.fakeScore, 0) / analysisResults.fakeReviews.length)}점
                        </p>
                        <p className="analysis-stat-subtitle">0-100점 기준</p>
                      </div>
                      <div className="analysis-stat-card">
                        <h5 className="analysis-stat-title">평균 신뢰도</h5>
                        <p className="analysis-stat-value">
                          {Math.round(analysisResults.fakeReviews.reduce((sum, r) => sum + r.confidence, 0) / analysisResults.fakeReviews.length)}점
                        </p>
                        <p className="analysis-stat-subtitle">0-100점 기준</p>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => setShowDetails(!showDetails)}
                      className="analysis-details-button"
                    >
                      {showDetails ? '상세 정보 숨기기' : '상세 정보 보기'} ({analysisResults.fakeReviews.length}개)
                    </button>
                    
                    {showDetails && (
                      <div className="analysis-details">
                        {analysisResults.fakeReviews.map((result, index) => (
                          <div key={index} className="analysis-detail-card">
                            <div className="analysis-detail-header">
                              <div className="analysis-detail-badges">
                                <span className="analysis-badge fake">의심도: {result.fakeScore}점</span>
                                <span className="analysis-badge confidence">신뢰도: {result.confidence}점</span>
                                <span className="analysis-badge rating">평점: {result.review.rating}점</span>
                              </div>
                              <span className="analysis-detail-date">
                                {new Date(result.review.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            
                            <p className="analysis-detail-content">{result.review.content}</p>
                            
                            <div className="analysis-patterns">
                              <h6 className="analysis-patterns-title">발견된 패턴 (구체적 기준):</h6>
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

                {/* 2. 쇼핑몰 위험도 분석 결과 */}
                {analysisResults.shopRisk && (
                  <div className="analysis-result-section shop-risk">
                    <h4 className="analysis-result-title">
                      쇼핑몰 위험도 분석 (구체적 기준)
                    </h4>
                    <div className="analysis-stats-grid">
                      <div className="analysis-stat-card">
                        <h5 className="analysis-stat-title">종합 위험도</h5>
                        <p className="analysis-stat-value">{analysisResults.shopRisk.riskScore}점</p>
                        <span className={`analysis-risk-badge ${analysisResults.shopRisk.riskLevel.toLowerCase()}`}>
                          {getRiskLevelText(analysisResults.shopRisk.riskLevel)}
                        </span>
                      </div>
                      <div className="analysis-stat-card">
                        <h5 className="analysis-stat-title">분석 세부사항</h5>
                        <div className="analysis-detail-scores">
                          <div>신고 분석: {Math.round(analysisResults.shopRisk.analysis.reportAnalysis)}점</div>
                          <div>평점 분석: {Math.round(analysisResults.shopRisk.analysis.ratingAnalysis)}점</div>
                          <div>도메인 분석: {Math.round(analysisResults.shopRisk.analysis.domainAnalysis)}점</div>
                          <div>사업자 분석: {Math.round(analysisResults.shopRisk.analysis.businessAnalysis)}점</div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="analysis-recommendations">
                      <div className="analysis-recommendation-section">
                        <h6 className="analysis-recommendation-title">발견된 위험 요소:</h6>
                        <ul className="analysis-recommendation-list">
                          {analysisResults.shopRisk.reasons.map((reason, index) => (
                            <li key={index}>{reason}</li>
                          ))}
                        </ul>
                      </div>
                      
                      <div className="analysis-recommendation-section">
                        <h6 className="analysis-recommendation-title">권장사항:</h6>
                        <ul className="analysis-recommendation-list">
                          {analysisResults.shopRisk.recommendations.map((recommendation, index) => (
                            <li key={index}>{recommendation}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. 실시간 피싱 탐지 결과 */}
                {analysisResults.phishingAlert && (
                  <div className="analysis-result-section phishing">
                    <h4 className="analysis-result-title">
                      🚨 실시간 피싱 탐지 결과
                    </h4>
                    <div className="analysis-stats-grid">
                      <div className="analysis-stat-card">
                        <h5 className="analysis-stat-title">피싱 점수</h5>
                        <p className="analysis-stat-value">{analysisResults.phishingAlert.phishingScore}점</p>
                        <span className={`analysis-risk-badge ${analysisResults.phishingAlert.riskLevel.toLowerCase()}`}>
                          {getRiskLevelText(analysisResults.phishingAlert.riskLevel)}
                        </span>
                      </div>
                      <div className="analysis-stat-card">
                        <h5 className="analysis-stat-title">권장 액션</h5>
                        <p className="analysis-action-text">
                          {analysisResults.phishingAlert.action === 'BLOCK' ? '즉시 차단' :
                           analysisResults.phishingAlert.action === 'ALERT' ? '강력 경고' : '모니터링'}
                        </p>
                        <p className="analysis-action-subtitle">실시간 탐지 결과</p>
                      </div>
                    </div>
                    
                    <div className="analysis-phishing-details">
                      <h6 className="analysis-phishing-title">탐지된 위험 요소:</h6>
                      <ul className="analysis-phishing-list">
                        {analysisResults.phishingAlert.reasons.map((reason, index) => (
                          <li key={index}>{reason}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* AI 리뷰 분석 모달 */}
      {showReviewModal && reviewStatistics && (
        <div className="analysis-modal-overlay">
          <div className="analysis-modal-content">
            <div className="analysis-modal-header">
              <h3 className="analysis-modal-title">
                AI 리뷰 신뢰도 분석 결과
              </h3>
              <button 
                className="analysis-modal-close"
                onClick={() => setShowReviewModal(false)}
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
                      <p className="analysis-stat-value">{reviewStatistics.fakeCount}개</p>
                      <p className="analysis-stat-subtitle">
                        전체 {ratings.length}개 중 {reviewStatistics.fakePercentage}%
                      </p>
                    </div>
                    
                    <div className="analysis-stat-card">
                      <h5 className="analysis-stat-title">위험도</h5>
                      <p className="analysis-stat-value">
                        <span className={`analysis-risk-badge ${reviewStatistics.riskLevel.toLowerCase()}`}>
                          {getRiskLevelText(reviewStatistics.riskLevel)}
                        </span>
                      </p>
                      <p className="analysis-stat-subtitle">종합 평가</p>
                    </div>
                    
                    <div className="analysis-stat-card">
                      <h5 className="analysis-stat-title">패턴 분석</h5>
                      <div className="analysis-detail-scores">
                        <div>텍스트: {Math.round(reviewStatistics.patternStats.textPattern * 100)}%</div>
                        <div>시간적: {Math.round(reviewStatistics.patternStats.temporalPattern * 100)}%</div>
                        <div>행동: {Math.round(reviewStatistics.patternStats.behaviorPattern * 100)}%</div>
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
                      onClick={() => setShowReviewDetails(!showReviewDetails)}
                      className="analysis-details-button"
                    >
                      {showReviewDetails ? '상세 정보 숨기기' : '상세 정보 보기'} ({fakeReviews.length}개)
                    </button>
                    
                    {showReviewDetails && (
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
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
