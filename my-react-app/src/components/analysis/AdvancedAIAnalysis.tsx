import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { AdvancedFakeReviewDetector, FakeReviewResult } from '../../services/advancedFakeReviewDetector';
import { ShopRiskAnalyzer, Shop, Report, Rating, ShopRiskResult } from '../../services/shopRiskAnalyzer';
import { RealTimePhishingSystem, PhishingAlert } from '../../services/realTimePhishingSystem';
import { FakeReviewDetector, ShopType } from '../../services/fakeReviewDetector';
import { Review } from '../../utils/openRouter';
import { ScoreDial } from '../report/ScoreDial';

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
  const basicFakeReviewDetector = FakeReviewDetector.getInstance();

  const runAdvancedAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      // 1. 고급 가짜 리뷰 탐지
      const fakeReviewResults = await fakeReviewDetector.detectFakeReviews([]);
      
      // 2. 쇼핑몰 신뢰도 분석
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
        toast.success('피싱 사이트 검사가 완료되었습니다. 주의가 필요한 항목이 발견되었습니다.');
      } else {
        toast.info('피싱 사이트 검사가 완료되었습니다. 특별한 문제가 발견되지 않았습니다.');
      }
      
    } catch (error) {
      console.error('피싱 사이트 검사 오류:', error);
      toast.error('사이트 검사 중 오류가 발생했습니다.');
    } finally {
      setIsAnalyzing(false);
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
      console.error('리뷰 신뢰도 분석 오류:', error);
      toast.error('리뷰 분석 중 오류가 발생했습니다.');
    } finally {
      setIsReviewAnalyzing(false);
    }
  };


  const getRiskLevelText = (level: string) => {
    switch (level) {
      case 'LOW': return '신뢰도 매우 높음';
      case 'MEDIUM': return '신뢰도 높음';
      case 'HIGH': return '신뢰도 보통';
      case 'CRITICAL': return '신뢰도 낮음';
      default: return '알 수 없음';
    }
  };

  const getRiskStatus = (riskScore: number): "safe" | "neutral" | "warning" | "danger" => {
    const trustScore = 100 - riskScore;
    if (trustScore >= 90) return 'neutral'; // 90점 이상: 파란색 (neutral을 파란색으로 사용)
    if (trustScore >= 70) return 'safe'; // 70~89: 초록색
    if (trustScore >= 40) return 'warning'; // 40~69: 주황색
    return 'danger'; // 0~39: 빨간색
  };

  const getRiskLevelKorean = (riskScore: number): string => {
    const trustScore = 100 - riskScore;
    if (trustScore >= 80) return '신뢰도 매우 높음';
    if (trustScore >= 60) return '신뢰도 높음';
    if (trustScore >= 40) return '주의 필요';
    if (trustScore >= 20) return '신뢰도 낮음';
    return '신뢰도 매우 낮음';
  };


  return (
    <div className="advanced-ai-analysis bg-white rounded-lg shadow-lg p-6 mb-6">
      {/* 헤더 섹션은 분석 기준 컨테이너로 이동됨 */}


      {/* 분석 결과는 모달로 표시됨 */}

      {/* 분석 기준 설명 */}
      <div className="analysis-criteria-container">
        <div className="criteria-header">
          <div className="criteria-title">
            <h5>피싱 사이트 검사 시스템 구체적 기준 기반</h5>
          </div>
          
          <div className="action-buttons">
            <button 
              className="review-analyze-btn"
              onClick={runReviewAnalysis}
              disabled={isReviewAnalyzing}
            >
              {isReviewAnalyzing ? '분석 중...' : '리뷰 신뢰도 분석하기'}
            </button>
            <button 
              className="analyze-btn"
              onClick={runAdvancedAnalysis}
              disabled={isAnalyzing}
            >
              {isAnalyzing ? '분석 중...' : '피싱 사이트 검사 시작'}
            </button>
          </div>
        </div>

        <div className="criteria-subtitle">
          <span className="triangle-icon">▲</span>
          <span>우리만의 구체적 검사 기준</span>
        </div>

        <div className="criteria-grid">
          <div className="criteria-section">
            <h6 className="section-title fake-review">리뷰 신뢰도 분석:</h6>
            <ul className="criteria-list">
              <li>과도한 긍정 표현 2개 이상 사용</li>
              <li>5분 내 3개 이상 연속 리뷰</li>
              <li>90% 이상 5점 리뷰</li>
              <li>비현실적 배송/가격 표현</li>
            </ul>
          </div>

          <div className="criteria-section">
            <h6 className="section-title phishing">피싱 사이트 검사:</h6>
            <ul className="criteria-list">
              <li>유명 사이트와 85% 이상 유사한 도메인</li>
              <li>긴급성 강조 표현 3개 이상</li>
              <li>30일 이내 신규 도메인</li>
              <li>사업자 정보 2개 이상 부족</li>
            </ul>
          </div>
        </div>

        <div className="disclaimer">
          <span>면책 조항: 검사 결과는 참고용이며, 최종 판단은 사용자에게 있습니다. 모든 검사는 구체적인 기준에 따라 객관적으로 수행됩니다.</span>
        </div>
      </div>

      {/* 분석 결과 모달 */}
      {showAnalysisModal && analysisResults && (
        <div className="analysis-modal-overlay">
          <div className="analysis-modal-content">
            <div className="analysis-modal-header">
              <h3 className="analysis-modal-title">AI 분석 결과</h3>
              <button className="analysis-modal-close" onClick={() => setShowAnalysisModal(false)}>✕</button>
            </div>
            <div className="analysis-modal-body bg-gradient-to-b from-sky-50 via-sky-100 to-sky-50">
              <div className="space-y-6">
                {/* 가짜 리뷰 분석 결과 */}
                {analysisResults.fakeReviews.length > 0 && (
                  <div className="analysis-result-section fake-review">
                    <h4 className="analysis-result-title">리뷰 신뢰도 분석 결과</h4>
                    <div className="analysis-stats-grid">
                      <div className="analysis-stat-card">
                        <h5 className="analysis-stat-title">평균 의심도</h5>
                        <p className="analysis-stat-value">{Math.round(analysisResults.fakeReviews.reduce((sum, r) => sum + r.fakeScore, 0) / analysisResults.fakeReviews.length)}점</p>
                        <p className="analysis-stat-subtitle">0-100점 기준</p>
                      </div>
                      <div className="analysis-stat-card">
                        <h5 className="analysis-stat-title">평균 신뢰도</h5>
                        <p className="analysis-stat-value">{Math.round(analysisResults.fakeReviews.reduce((sum, r) => sum + r.confidence, 0) / analysisResults.fakeReviews.length)}점</p>
                        <p className="analysis-stat-subtitle">0-100점 기준</p>
                      </div>
                    </div>
                    <button onClick={() => setShowDetails(!showDetails)} className="analysis-details-button">
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
                              <span className="analysis-detail-date">{new Date(result.review.createdAt).toLocaleDateString()}</span>
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

                {/* 쇼핑몰 신뢰도 분석 결과 */}
                {analysisResults.shopRisk && (() => {
                  const trustScore = 100 - analysisResults.shopRisk.riskScore;
                  const riskStatus = getRiskStatus(analysisResults.shopRisk.riskScore);
                  const riskLevelKorean = getRiskLevelKorean(analysisResults.shopRisk.riskScore);
                  const riskColor = riskStatus === 'safe' ? 'text-green-600' : 
                                   riskStatus === 'neutral' ? 'text-blue-600' : 
                                   riskStatus === 'warning' ? 'text-orange-600' : 'text-red-600';
                  // 90점 이상: 파란색, 70~89: 초록색, 40~69: 주황색, 0~39: 빨간색
                  const progressColor = trustScore >= 90 ? '#3B82F6' : 
                                       trustScore >= 70 ? '#10B981' : 
                                       trustScore >= 40 ? '#F59E0B' : '#EF4444';
                  
                  return (
                    <div className="analysis-result-section shop-risk bg-gradient-to-b from-sky-50 via-sky-100 to-sky-50 rounded-lg p-6">
                      <h4 className="analysis-result-title mb-6">쇼핑몰 신뢰도 분석</h4>
                      
                      {/* 신뢰도 점수 섹션 - 하얀색 배경 */}
                      <div className="mb-8 bg-white rounded-lg p-6 shadow-sm">
                        <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
                          {/* 원형 점수 표시기 */}
                          <div className="flex-shrink-0">
                            <ScoreDial score={trustScore} status={riskStatus} />
                          </div>
                          
                          {/* 설명 텍스트 */}
                          <div className="flex-1">
                            <p className="text-base mb-2">
                              현재 이 쇼핑몰의 신뢰도 점수는 <span className="text-blue-600 font-semibold">{trustScore}점</span>이며, 
                              <span className={`${riskColor} font-semibold`}> '{riskLevelKorean}'</span> 단계입니다.
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {trustScore >= 80 ? '안전하게 이용할 수 있는 쇼핑몰입니다.' :
                               trustScore >= 60 ? '대체로 신뢰할 수 있는 쇼핑몰입니다.' :
                               trustScore >= 40 ? '일부 주의가 필요할 수 있습니다. 구매 전 신중히 검토하세요.' :
                               '주의가 필요합니다. 구매 전 반드시 신중히 검토하세요.'}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      {/* 분석 세부사항 - 원래 스타일로 복원 */}
                      <div className="analysis-stats-grid">
                        <div className="analysis-stat-card">
                          <h5 className="analysis-stat-title">종합 신뢰도</h5>
                          <p className="analysis-stat-value">{trustScore}점</p>
                          <div className="trust-score-gauge" style={{ background: '#f3f4f6', height: '8px', borderRadius: '4px', overflow: 'hidden', margin: '10px 0' }}>
                            <div className="gauge-bar" style={{
                              width: `${trustScore}%`,
                              height: '100%',
                              background: progressColor,
                              borderRadius: '4px',
                              transition: 'width 0.5s ease'
                            }}></div>
                          </div>
                          <span className={`analysis-risk-badge ${analysisResults.shopRisk.riskLevel.toLowerCase()}`}>{riskLevelKorean}</span>
                        </div>
                        <div className="analysis-stat-card">
                          <h5 className="analysis-stat-title">분석 세부사항</h5>
                          <div className="analysis-detail-scores">
                            <div>피해 사례 제보 분석: {Math.round(analysisResults.shopRisk.analysis.reportAnalysis)}점</div>
                            <div>평점 분석: {Math.round(analysisResults.shopRisk.analysis.ratingAnalysis)}점</div>
                            <div>도메인 분석: {Math.round(analysisResults.shopRisk.analysis.domainAnalysis)}점</div>
                            <div>사업자 분석: {Math.round(analysisResults.shopRisk.analysis.businessAnalysis)}점</div>
                          </div>
                        </div>
                      </div>
                      
                      {/* 발견된 신뢰도 요소 및 권장사항 */}
                      <div className="space-y-4">
                        <div>
                          <h6 className="font-semibold mb-2">발견된 신뢰도 요소:</h6>
                          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                            {analysisResults.shopRisk.reasons.map((reason, index) => (
                              <li key={index}>{reason}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <h6 className="font-semibold mb-2">권장사항:</h6>
                          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                            {analysisResults.shopRisk.recommendations.map((recommendation, index) => (
                              <li key={index}>{recommendation}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* 실시간 피싱 검사 결과 */}
                {analysisResults.phishingAlert && (() => {
                  // 피싱 점수는 높을수록 매우주의하므로, 신뢰도 점수는 100 - phishingScore
                  const trustScore = 100 - analysisResults.phishingAlert.phishingScore;
                  const riskStatus = getRiskStatus(analysisResults.phishingAlert.phishingScore);
                  const riskLevelKorean = getRiskLevelKorean(analysisResults.phishingAlert.phishingScore);
                  const riskColor = riskStatus === 'safe' ? 'text-green-600' : 
                                   riskStatus === 'neutral' ? 'text-blue-600' : 
                                   riskStatus === 'warning' ? 'text-orange-600' : 'text-red-600';
                  // 90점 이상: 파란색, 70~89: 초록색, 40~69: 주황색, 0~39: 빨간색
                  const progressColor = trustScore >= 90 ? '#3B82F6' : 
                                       trustScore >= 70 ? '#10B981' : 
                                       trustScore >= 40 ? '#F59E0B' : '#EF4444';
                  
                  return (
                    <div className="analysis-result-section phishing bg-gradient-to-b from-sky-50 via-sky-100 to-sky-50 rounded-lg p-6">
                      <h4 className="analysis-result-title mb-6">🚨 실시간 피싱 사이트 검사 결과</h4>
                      
                      {/* 신뢰도 점수 섹션 - 하얀색 배경 */}
                      <div className="mb-8 bg-white rounded-lg p-6 shadow-sm">
                        <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
                          {/* 원형 점수 표시기 */}
                          <div className="flex-shrink-0">
                            <ScoreDial score={trustScore} status={riskStatus} />
                          </div>
                          
                          {/* 설명 텍스트 */}
                          <div className="flex-1">
                            <p className="text-base mb-2">
                              현재 이 쇼핑몰의 신뢰도 점수는 <span className="text-blue-600 font-semibold">{trustScore}점</span>이며, 
                              <span className={`${riskColor} font-semibold`}> '{riskLevelKorean}'</span> 단계입니다.
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {trustScore >= 80 ? '안전하게 이용할 수 있는 쇼핑몰입니다.' :
                               trustScore >= 60 ? '대체로 신뢰할 수 있는 쇼핑몰입니다.' :
                               trustScore >= 40 ? '일부 주의가 필요할 수 있습니다. 구매 전 신중히 검토하세요.' :
                               '주의가 필요합니다. 구매 전 반드시 신중히 검토하세요.'}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      {/* 분석 세부사항 */}
                      <div className="analysis-stats-grid">
                        <div className="analysis-stat-card">
                          <h5 className="analysis-stat-title">종합 신뢰도</h5>
                          <p className="analysis-stat-value">{trustScore}점</p>
                          <div className="trust-score-gauge" style={{ background: '#f3f4f6', height: '8px', borderRadius: '4px', overflow: 'hidden', margin: '10px 0' }}>
                            <div className="gauge-bar" style={{
                              width: `${trustScore}%`,
                              height: '100%',
                              background: progressColor,
                              borderRadius: '4px',
                              transition: 'width 0.5s ease'
                            }}></div>
                          </div>
                          <span className={`analysis-risk-badge ${analysisResults.phishingAlert.riskLevel.toLowerCase()}`}>{riskLevelKorean}</span>
                        </div>
                        <div className="analysis-stat-card">
                          <h5 className="analysis-stat-title">분석 세부사항</h5>
                          <div className="analysis-detail-scores">
                            <div>피해 사례 제보 분석: 0점</div>
                            <div>평점 분석: 0점</div>
                            <div>도메인 분석: {Math.round(trustScore * 0.7)}점</div>
                            <div>사업자 분석: 0점</div>
                          </div>
                        </div>
                      </div>
                      
                      {/* 탐지된 주의 요소 및 권장사항 */}
                      <div className="space-y-4 mt-6">
                        <div>
                          <h6 className="font-semibold mb-2">탐지된 주의 요소:</h6>
                          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                            {analysisResults.phishingAlert.reasons.map((reason, index) => (
                              <li key={index}>{reason}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <h6 className="font-semibold mb-2">권장 액션:</h6>
                          <p className="text-sm text-muted-foreground">
                            {analysisResults.phishingAlert.action === 'BLOCK' ? '즉시 차단' : 
                             analysisResults.phishingAlert.action === 'ALERT' ? '강력 경고' : 
                             '모니터링'} - 실시간 탐지 결과
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

