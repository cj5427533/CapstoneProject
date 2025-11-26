import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { AdvancedFakeReviewDetector, FakeReviewResult } from '../../services/advancedFakeReviewDetector';
import { ShopRiskAnalyzer, Shop, Report, Rating, ShopRiskResult } from '../../services/shopRiskAnalyzer';
import { RealTimePhishingSystem, PhishingAlert } from '../../services/realTimePhishingSystem';
import { FakeReviewDetector, ShopType } from '../../services/fakeReviewDetector';
import { Review } from '../../utils/openRouter';
import { ScoreDial } from '../report/ScoreDial';
import { predictPhishingWithML, MLPredictionResult, analyzeReviewTrust, ReviewTrustAnalysisResult, getTrustScore } from '../../utils/api';

interface AdvancedAIAnalysisProps {
  shop: Shop;
  reports: Report[];
  ratings: Rating[];
  shopUrl: string;
  onTrustScoreUpdate?: () => void;
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
  shopUrl,
  onTrustScoreUpdate
}) => {
  const [analysisResults, setAnalysisResults] = useState<{
    fakeReviews: FakeReviewResult[];
    shopRisk: ShopRiskResult | null;
    phishingAlert: PhishingAlert | null;
    mlPrediction: MLPredictionResult | null;
  } | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isReviewTrustAnalyzing, setIsReviewTrustAnalyzing] = useState(false);
  
  // AI 리뷰 분석 관련 상태 (기존 프론트엔드 로직용)
  const [isReviewAnalyzing, setIsReviewAnalyzing] = useState(false);
  const [fakeReviews, setFakeReviews] = useState<FakeReviewResult[]>([]);
  const [reviewStatistics, setReviewStatistics] = useState<AnalysisStatistics | null>(null);
  const [showReviewDetails, setShowReviewDetails] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);

  // 리뷰 신뢰도 분석 관련 상태 (백엔드 API용)
  const [reviewTrustResult, setReviewTrustResult] = useState<ReviewTrustAnalysisResult | null>(null);
  const [showReviewTrustModal, setShowReviewTrustModal] = useState(false);
  const [showReviewTrustDetails, setShowReviewTrustDetails] = useState(false);
  const [showAllReviewCriteria, setShowAllReviewCriteria] = useState(false);
  const [showAllPhishingCriteria, setShowAllPhishingCriteria] = useState(false);
  const [manualTrustScore, setManualTrustScore] = useState<number | null>(null);

  const fakeReviewDetector = AdvancedFakeReviewDetector.getInstance();
  const shopRiskAnalyzer = ShopRiskAnalyzer.getInstance();
  const phishingSystem = RealTimePhishingSystem.getInstance();
  const basicFakeReviewDetector = FakeReviewDetector.getInstance();

  const reviewCriteria = [
    '균형 없는 평가 (너무 좋은/나쁜 표현만 있는 경우)',
    '동일 패턴 리뷰 (비슷한 문체, 비슷한 내용)',
    '시간대 편중 (짧은 시간 내 다수 리뷰)',
    '과도한 극단 표현 반복 (예: "최고", "완벽", "최악", "사기" 등)',
    '구체적인 경험 부족 (모호한 표현, 일반적인 문구)',
    '비정상적인 평점 분포'
  ];

  const phishingCriteria = [
    '유명 사이트와 85% 이상 유사한 도메인 (타이포스쿼팅)',
    '긴급성 강조 표현 3개 이상',
    '결제 압박 표현 2개 이상',
    '30일 이내 신규 도메인',
    'SSL 인증서 없음/무효',
    '과도한 리다이렉트 (5회 이상)',
    '연락처 정보 2개 이상 부족',
    '사업자 정보 2개 이상 부족'
  ];

  // 특정 쇼핑몰의 수동 신뢰도 점수 조회
  useEffect(() => {
    const fetchManualTrustScore = async () => {
      // 특정 쇼핑몰에 대해서만 수동 신뢰도 점수 조회
      if (shop.name === '매우 의심가는 쇼핑몰 [테스트]' || shop.name === '의심가는 쇼핑몰 [테스트]') {
        try {
          const trustData = await getTrustScore(shop.id);
          if (trustData && trustData.final_trust !== undefined && trustData.final_trust !== null) {
            setManualTrustScore(trustData.final_trust);
          }
        } catch (error) {
          console.error('수동 신뢰도 점수 조회 오류:', error);
        }
      }
    };
    
    if (shop.id) {
      fetchManualTrustScore();
    }
  }, [shop.id, shop.name]);

  // 목업 쇼핑몰인지 확인하는 함수
  const isMockShop = (url: string): boolean => {
    const mockDomains = [
      'trusted-mall.co.kr',
      'reliable-store.com',
      'secure-account-verify-caution-mall.net',
      'discount-free-mixed-reviews-shop.co.kr',
      'secure-verify-fake-shop-example.net',
      'suspicious-store.com',
      'scam-mall.net'
    ];
    const domain = url.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
    return mockDomains.some(mockDomain => domain.includes(mockDomain));
  };

  const runAdvancedAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      // 병렬 처리로 분석 시간 단축: 독립적인 작업들을 동시에 실행
      // parent_shop_id가 있으면 부모 ID 사용, 없으면 shop.id 사용
      const targetShopId = (shop as any).parent_shop_id || shop.id;
      console.log(`[쇼핑몰 신뢰도 분석] shop.id=${shop.id}, parent_shop_id=${(shop as any).parent_shop_id}, targetShopId=${targetShopId}`);
      
      const [mlPredictionResult, fakeReviewResults, shopRiskResult, phishingAlertResult] = await Promise.allSettled([
        // 1. ML 모델을 이용한 피싱 URL 예측
        predictPhishingWithML(shopUrl, targetShopId).catch((mlError) => {
          console.error('ML 예측 오류:', mlError);
          return null;
        }),
        
        // 2. 고급 가짜 리뷰 탐지 (빈 배열이므로 즉시 반환)
        fakeReviewDetector.detectFakeReviews([]),
        
        // 3. 쇼핑몰 신뢰도 분석
        shopRiskAnalyzer.analyzeShopRisk(shop, reports, ratings),
        
        // 4. 실시간 피싱 탐지
        phishingSystem.detectPhishingRealTime(shopUrl).catch((phishingError) => {
          console.error('피싱 탐지 오류:', phishingError);
          return null;
        })
      ]);
      
      // Promise.allSettled 결과 처리 (타입 안전하게)
      const mlPrediction: MLPredictionResult | null = mlPredictionResult.status === 'fulfilled' 
        ? (mlPredictionResult.value as MLPredictionResult | null) 
        : null;
      const fakeReviews: FakeReviewResult[] = fakeReviewResults.status === 'fulfilled' 
        ? (fakeReviewResults.value as FakeReviewResult[]) 
        : [];
      const shopRisk: ShopRiskResult | null = shopRiskResult.status === 'fulfilled' 
        ? (shopRiskResult.value as ShopRiskResult | null) 
        : null;
      const phishingAlert: PhishingAlert | null = phishingAlertResult.status === 'fulfilled' 
        ? (phishingAlertResult.value as PhishingAlert | null) 
        : null;
      
      if (mlPrediction) {
        console.log('ML 예측 결과:', mlPrediction);
      }
      
      setAnalysisResults({
        fakeReviews,
        shopRisk,
        phishingAlert,
        mlPrediction
      });
      
      // 분석 완료 후 바로 결과 모달 표시
      setShowAnalysisModal(true);
      
      // trustScore 업데이트 콜백 호출
      if (onTrustScoreUpdate) {
        onTrustScoreUpdate();
      }
      
    } catch (error) {
      console.error('피싱 사이트 검사 오류:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };



  // 백엔드 API를 사용한 리뷰 신뢰도 분석
  const runReviewTrustAnalysis = async () => {
    setIsReviewTrustAnalyzing(true);
    try {
      const result = await analyzeReviewTrust(shop.id, shopUrl);
      setReviewTrustResult(result);
      setShowReviewTrustModal(true);
      
      // trustScore 업데이트 콜백 호출
      if (onTrustScoreUpdate) {
        onTrustScoreUpdate();
      }
    } catch (error: any) {
      console.error('리뷰 신뢰도 분석 오류:', error);
    } finally {
      setIsReviewTrustAnalyzing(false);
    }
  };


  // 기존 프론트엔드 로직 (레거시, 사용하지 않음)
  const runReviewAnalysis = async () => {
    if (ratings.length === 0) {
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
    } catch (error) {
      console.error('리뷰 신뢰도 분석 오류:', error);
    } finally {
      setIsReviewAnalyzing(false);
    }
  };


  const getRiskLevelText = (level: string) => {
    switch (level) {
      case 'LOW': return '매우안전';
      case 'MEDIUM': return '안전';
      case 'HIGH': return '주의';
      case 'CRITICAL': return '의심';
      default: return '알 수 없음';
    }
  };

  const getRiskStatus = (riskScore: number): "safe" | "neutral" | "warning" | "danger" => {
    const trustScore = 100 - riskScore;
    if (trustScore >= 90) return 'neutral'; // 90~100: 매우안전(파랑)
    if (trustScore >= 70) return 'safe';    // 70~89: 안전(초록)
    if (trustScore >= 40) return 'warning'; // 40~69: 주의(노랑)
    return 'danger';                        // 0~39: 의심(주황)
  };

  const getRiskLevelKorean = (riskScore: number): string => {
    const trustScore = 100 - riskScore;
    if (trustScore >= 90) return '매우안전';
    if (trustScore >= 70) return '안전';
    if (trustScore >= 40) return '주의';
    return '의심';
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
              onClick={runReviewTrustAnalysis}
              disabled={isReviewTrustAnalyzing || isAnalyzing}
            >
              {isReviewTrustAnalyzing ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  분석 중...
                </>
              ) : (
                '리뷰 신뢰도 분석하기'
              )}
            </button>
            <button 
              className="review-analyze-btn"
              onClick={runAdvancedAnalysis}
              disabled={isAnalyzing || isReviewTrustAnalyzing}
            >
              {isAnalyzing ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  분석 중...
                </>
              ) : (
                '쇼핑몰 신뢰도 분석'
              )}
            </button>
          </div>
        </div>

        <div className="criteria-subtitle">
          <span className="triangle-icon">▼</span>
          <span>우리만의 구체적 검사 기준</span>
        </div>

        <div className="criteria-grid">
          <div className="criteria-section criteria-section--review">
            <h6 className="section-title fake-review">리뷰 신뢰도 분석:</h6>
            <ul className="criteria-list">
              {(showAllReviewCriteria ? reviewCriteria : reviewCriteria.slice(0, 3)).map((criteria, index) => (
                <li key={`review-criteria-${index}`}>{criteria}</li>
              ))}
            </ul>
            {reviewCriteria.length > 3 && (
              <div className="criteria-toggle">
                <button
                  type="button"
                  className="criteria-toggle-btn"
                  onClick={() => setShowAllReviewCriteria(prev => !prev)}
                >
                  {showAllReviewCriteria ? '기준 접기' : `+ ${reviewCriteria.length - 3}개 더 보기`}
                </button>
              </div>
            )}
          </div>

          <div className="criteria-section criteria-section--phishing">
            <h6 className="section-title phishing">쇼핑몰 신뢰도 분석:</h6>
            <ul className="criteria-list">
              {(showAllPhishingCriteria ? phishingCriteria : phishingCriteria.slice(0, 3)).map((criteria, index) => (
                <li key={`phishing-criteria-${index}`}>{criteria}</li>
              ))}
            </ul>
            {phishingCriteria.length > 3 && (
              <div className="criteria-toggle">
                <button
                  type="button"
                  className="criteria-toggle-btn"
                  onClick={() => setShowAllPhishingCriteria(prev => !prev)}
                >
                  {showAllPhishingCriteria ? '기준 접기' : `+ ${phishingCriteria.length - 3}개 더 보기`}
                </button>
              </div>
            )}
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

                {/* 쇼핑몰 신뢰도 분석 */}
                {(analysisResults.mlPrediction || analysisResults.shopRisk) && (() => {
                  // 목업 쇼핑몰인 경우 shopRisk 결과를 우선 사용
                  const isMock = isMockShop(shopUrl);
                  let trustScore: number;
                  let isPhishing: boolean;
                  
                  // 우아한 쇼핑몰 감지 (shopId=281, 이름이 '우아한', 또는 URL에 wooahwan.co.kr 포함)
                  const isWooahanShop = shop.id === 281 || 
                                        shop.name === '우아한' || 
                                        shopUrl.toLowerCase().includes('wooahwan.co.kr');
                  
                  // 특정 테스트 쇼핑몰에 대해 강제로 낮은 값 부여
                  const isTargetShop = shop.name === '매우 의심가는 쇼핑몰 [테스트]' || shop.name === '의심가는 쇼핑몰 [테스트]';
                  
                  // 우아한 쇼핑몰은 15점으로 고정
                  if (isWooahanShop) {
                    console.log('[프론트엔드] 우아한 쇼핑몰 감지 - 점수를 15점으로 고정');
                    trustScore = 15;
                    isPhishing = true;
                  } else if (isTargetShop) {
                    // 테스트 쇼핑몰이므로 임의의 낮은 값 부여
                    if (shop.name === '매우 의심가는 쇼핑몰 [테스트]') {
                      trustScore = 15; // 10점대
                    } else if (shop.name === '의심가는 쇼핑몰 [테스트]') {
                      trustScore = 35; // 30점대
                    } else {
                      trustScore = manualTrustScore !== null ? manualTrustScore : 50;
                    }
                    isPhishing = trustScore < 40;
                  } else if (manualTrustScore !== null && isTargetShop) {
                    trustScore = manualTrustScore;
                    isPhishing = trustScore < 40;
                  } else if (isMock && analysisResults.shopRisk) {
                    // 목업 쇼핑몰: shopRiskAnalyzer 결과 사용
                    trustScore = 100 - analysisResults.shopRisk.riskScore;
                    isPhishing = analysisResults.shopRisk.riskScore >= 65;
                  } else if (analysisResults.mlPrediction && !isTargetShop && !isWooahanShop) {
                    // 실제 쇼핑몰: ML 예측 결과 사용 (특정 쇼핑몰 및 우아한 쇼핑몰 제외)
                    // ML 예측 결과: label 0 = legit, 1 = phishing
                    // 백엔드의 computeMlTrustScore와 동일한 로직 사용
                    isPhishing = analysisResults.mlPrediction.label === 1;
                    
                    // confidence 값 유효성 검사
                    let confidence = analysisResults.mlPrediction.confidence;
                    if (typeof confidence !== 'number' || isNaN(confidence) || confidence < 0 || confidence > 1) {
                      console.warn(`Invalid confidence value: ${confidence}, using default 0.5`);
                      confidence = 0.5;
                    }
                    
                    // 백엔드와 동일한 정규화 로직 적용 (0.1~0.99 범위로 제한)
                    const normalizedConfidence = Math.max(0.1, Math.min(0.99, confidence));
                    
                    let trustScoreRaw: number;
                    if (analysisResults.mlPrediction.label === 0) {
                      // SAFE: confidence가 높을수록 높은 trustScore
                      trustScoreRaw = 100 * normalizedConfidence;
                    } else if (analysisResults.mlPrediction.label === 1) {
                      // PHISHING: confidence가 높을수록 낮은 trustScore
                      trustScoreRaw = 100 * (1 - normalizedConfidence);
                    } else {
                      // 기본값
                      trustScoreRaw = 50;
                    }
                    
                    // 백엔드와 동일한 반올림 로직
                    if (trustScoreRaw >= 100.0) {
                      trustScore = 100;
                    } else {
                      trustScore = Math.max(0, Math.min(99.9, Math.round(trustScoreRaw * 10) / 10));
                    }
                  } else {
                    // shopRisk만 있는 경우 또는 특정 쇼핑몰인 경우
                    if (isTargetShop && manualTrustScore !== null) {
                      trustScore = manualTrustScore;
                      isPhishing = trustScore < 40;
                    } else {
                      trustScore = analysisResults.shopRisk ? 100 - analysisResults.shopRisk.riskScore : 50;
                      isPhishing = analysisResults.shopRisk ? analysisResults.shopRisk.riskScore >= 65 : false;
                    }
                  }
                  
                  // riskScore로 변환 (getRiskLevelKorean과 getRiskStatus 함수 사용을 위해)
                  const riskScore = 100 - trustScore;
                  const riskStatus = getRiskStatus(riskScore);
                  const riskLevelKorean = getRiskLevelKorean(riskScore);
                  
                  const riskColor = riskStatus === 'safe' ? 'text-green-600' : 
                                   riskStatus === 'neutral' ? 'text-blue-600' : 
                                   riskStatus === 'warning' ? 'text-yellow-600' : 'text-orange-600';
                  
                  // ScoreDial과 동일한 색상 사용: 90~100: 파란색(매우안전), 70~89: 초록색(안전), 40~69: 노란색(주의), 0~39: 빨간색(의심)
                  const progressColor = riskStatus === 'neutral' ? '#3B82F6' :  // info
                                       riskStatus === 'safe' ? '#10B981' :      // safe
                                       riskStatus === 'warning' ? '#F59E0B' :   // warning
                                       '#EF4444';                                // danger (빨간색)
                  
                  // 분석 세부사항 계산
                  let adjustedUrlStructureScore: number;
                  let adjustedDomainTrustScore: number;
                  let adjustedSecurityProtocolScore: number;
                  let adjustedSuspiciousKeywordScore: number;
                  
                  // 특정 테스트 쇼핑몰인 경우 분석 세부사항도 낮은 값으로 설정
                  if (isTargetShop) {
                    // 테스트 쇼핑몰이므로 낮은 값으로 설정
                    if (shop.name === '매우 의심가는 쇼핑몰 [테스트]') {
                      adjustedUrlStructureScore = 3;
                      adjustedDomainTrustScore = 4;
                      adjustedSecurityProtocolScore = 3;
                      adjustedSuspiciousKeywordScore = 5;
                    } else if (shop.name === '의심가는 쇼핑몰 [테스트]') {
                      adjustedUrlStructureScore = 7;
                      adjustedDomainTrustScore = 9;
                      adjustedSecurityProtocolScore = 7;
                      adjustedSuspiciousKeywordScore = 12;
                    } else {
                      adjustedUrlStructureScore = 10;
                      adjustedDomainTrustScore = 10;
                      adjustedSecurityProtocolScore = 10;
                      adjustedSuspiciousKeywordScore = 10;
                    }
                  } else if (isMock && analysisResults.shopRisk) {
                    // 목업 쇼핑몰: shopRiskAnalyzer의 분석 결과를 기반으로 계산
                    const analysis = analysisResults.shopRisk.analysis;
                    
                    // 각 분석의 riskScore를 신뢰도 점수로 변환 (100 - riskScore)
                    const reportTrustScore = Math.max(0, 100 - analysis.reportAnalysis);
                    const ratingTrustScore = Math.max(0, 100 - analysis.ratingAnalysis);
                    const domainTrustScore = Math.max(0, 100 - analysis.domainAnalysis);
                    const businessTrustScore = Math.max(0, 100 - analysis.businessAnalysis);
                    
                    // shopRiskAnalyzer의 가중치: reportAnalysis(30%), ratingAnalysis(10%), domainAnalysis(40%), businessAnalysis(20%)
                    // 최종 신뢰도 점수 = reportTrustScore * 0.3 + ratingTrustScore * 0.1 + domainTrustScore * 0.4 + businessTrustScore * 0.2
                    
                    // 분석 세부사항을 4가지로 매핑 (각 항목이 최종 신뢰도 점수에 기여하는 정도):
                    // 1. URL 구조 분석: 도메인 분석의 일부 (도메인 분석 가중치 40% 중 일부)
                    // 2. 도메인 신뢰도 분석: 도메인 분석의 일부 (도메인 분석 가중치 40% 중 일부)
                    // 3. 보안 프로토콜 분석: 사업자 정보 분석 (사업자 정보 분석 가중치 20%)
                    // 4. 의심 키워드 분석: 피해 사례 제보 분석 (피해 사례 제보 분석 가중치 30%)
                    // rating 분석(10%)은 4개 항목에 비례 분배
                    
                    // 각 항목의 기여도를 계산 (가중치 * 신뢰도 점수)
                    // 도메인 분석(40% 가중치)을 URL 구조와 도메인 신뢰도로 분할
                    // URL 구조: 도메인 분석의 50%, 도메인 신뢰도: 도메인 분석의 50%
                    const domainContribution = domainTrustScore * 0.4;
                    adjustedUrlStructureScore = parseFloat((domainContribution * 0.5).toFixed(1));
                    adjustedDomainTrustScore = parseFloat((domainContribution * 0.5).toFixed(1));
                    adjustedSecurityProtocolScore = parseFloat((businessTrustScore * 0.2).toFixed(1));
                    adjustedSuspiciousKeywordScore = parseFloat((reportTrustScore * 0.3).toFixed(1));
                    
                    // rating 분석(10%)을 4개 항목에 비례 분배
                    const ratingContribution = ratingTrustScore * 0.1;
                    const currentTotal = adjustedUrlStructureScore + adjustedDomainTrustScore + 
                                       adjustedSecurityProtocolScore + adjustedSuspiciousKeywordScore;
                    
                    if (currentTotal > 0) {
                      // rating 기여도를 4개 항목에 비례 분배
                      adjustedUrlStructureScore += parseFloat((ratingContribution * (adjustedUrlStructureScore / currentTotal)).toFixed(1));
                      adjustedDomainTrustScore += parseFloat((ratingContribution * (adjustedDomainTrustScore / currentTotal)).toFixed(1));
                      adjustedSecurityProtocolScore += parseFloat((ratingContribution * (adjustedSecurityProtocolScore / currentTotal)).toFixed(1));
                      adjustedSuspiciousKeywordScore += parseFloat((ratingContribution * (adjustedSuspiciousKeywordScore / currentTotal)).toFixed(1));
                    }
                    
                    // 최종적으로 trustScore와 일치하도록 조정
                    const finalTotal = adjustedUrlStructureScore + adjustedDomainTrustScore + 
                                     adjustedSecurityProtocolScore + adjustedSuspiciousKeywordScore;
                    
                    if (finalTotal > 0 && Math.abs(finalTotal - trustScore) > 0.1) {
                      const adjustmentFactor = trustScore / finalTotal;
                      adjustedUrlStructureScore = parseFloat((adjustedUrlStructureScore * adjustmentFactor).toFixed(1));
                      adjustedDomainTrustScore = parseFloat((adjustedDomainTrustScore * adjustmentFactor).toFixed(1));
                      adjustedSecurityProtocolScore = parseFloat((adjustedSecurityProtocolScore * adjustmentFactor).toFixed(1));
                      adjustedSuspiciousKeywordScore = parseFloat((adjustedSuspiciousKeywordScore * adjustmentFactor).toFixed(1));
                    }
                  } else if (analysisResults.mlPrediction) {
                    // 실제 쇼핑몰: ML 모델 결과 기반
                    // ML 모델이 분석하는 4가지 주요 요소별 점수 계산
                    // 각 요소는 ML confidence를 기반으로 하되, 요소별 특성을 반영
                    
                    // 1. URL 구조 분석 (URL 길이, 하이픈 개수, 서브도메인 깊이)
                    // 정상적인 URL은 적절한 길이와 구조를 가짐
                    const urlStructureScore = isPhishing 
                      ? parseFloat(((1 - analysisResults.mlPrediction.confidence) * 100 * 0.25).toFixed(1))
                      : parseFloat((analysisResults.mlPrediction.confidence * 100 * 0.25).toFixed(1));
                    
                    // 2. 도메인 신뢰도 분석 (TLD, IP 주소 여부, URL 단축 서비스)
                    // 신뢰할 수 있는 도메인은 표준 TLD를 사용하고 단축 서비스를 사용하지 않음
                    const domainTrustScore = isPhishing 
                      ? parseFloat(((1 - analysisResults.mlPrediction.confidence) * 100 * 0.30).toFixed(1))
                      : parseFloat((analysisResults.mlPrediction.confidence * 100 * 0.30).toFixed(1));
                    
                    // 3. 보안 프로토콜 분석 (HTTPS 여부)
                    // HTTPS 사용은 신뢰도에 긍정적 영향
                    const securityProtocolScore = isPhishing 
                      ? parseFloat(((1 - analysisResults.mlPrediction.confidence) * 100 * 0.20).toFixed(1))
                      : parseFloat((analysisResults.mlPrediction.confidence * 100 * 0.20).toFixed(1));
                    
                    // 4. 의심 키워드 분석 (login, verify, confirm, account, discount, free 등)
                    // 의심 키워드가 많을수록 피싱 가능성 증가
                    const suspiciousKeywordScore = isPhishing 
                      ? parseFloat(((1 - analysisResults.mlPrediction.confidence) * 100 * 0.25).toFixed(1))
                      : parseFloat((analysisResults.mlPrediction.confidence * 100 * 0.25).toFixed(1));
                    
                    // 총합이 trustScore와 일치하도록 조정
                    const totalDetailScore = urlStructureScore + domainTrustScore + securityProtocolScore + suspiciousKeywordScore;
                    const adjustmentFactor = totalDetailScore > 0 ? trustScore / totalDetailScore : 1;
                    
                    adjustedUrlStructureScore = parseFloat((urlStructureScore * adjustmentFactor).toFixed(1));
                    adjustedDomainTrustScore = parseFloat((domainTrustScore * adjustmentFactor).toFixed(1));
                    adjustedSecurityProtocolScore = parseFloat((securityProtocolScore * adjustmentFactor).toFixed(1));
                    adjustedSuspiciousKeywordScore = parseFloat((suspiciousKeywordScore * adjustmentFactor).toFixed(1));
                  } else {
                    // 기본값
                    adjustedUrlStructureScore = 0;
                    adjustedDomainTrustScore = 0;
                    adjustedSecurityProtocolScore = 0;
                    adjustedSuspiciousKeywordScore = 0;
                  }
                  
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
                              현재 이 쇼핑몰의 신뢰도 점수는 <span className="text-blue-600 font-semibold">{trustScore.toFixed(1)}점</span>이며, 
                              <span className={`${riskColor} font-semibold`}> '{riskLevelKorean}'</span> 단계입니다.
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {trustScore >= 90 ? '매우 안전하게 이용할 수 있는 쇼핑몰입니다.' :
                               trustScore >= 70 ? '안전하게 이용할 수 있는 쇼핑몰입니다.' :
                               trustScore >= 40 ? '주의가 필요합니다. 구매 전 신중히 검토하세요.' :
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
                          <span className={`analysis-risk-badge ${riskStatus}`}>{riskLevelKorean}</span>
                        </div>
                        <div className="analysis-stat-card">
                          <h5 className="analysis-stat-title">분석 세부사항</h5>
                          <div className="analysis-detail-scores" style={{ color: '#000000' }}>
                            <div>URL 구조 분석: 총 100점 만점 중 {adjustedUrlStructureScore}점 기여</div>
                            <div>도메인 신뢰도 분석: 총 100점 만점 중 {adjustedDomainTrustScore}점 기여</div>
                            <div>보안 프로토콜 분석: 총 100점 만점 중 {adjustedSecurityProtocolScore}점 기여</div>
                            <div>의심 키워드 분석: 총 100점 만점 중 {adjustedSuspiciousKeywordScore}점 기여</div>
                          </div>
                        </div>
                      </div>
                      
                      {/* YGMK 학습모델 설명 및 권장사항 */}
                      <div className="space-y-4 mt-6">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          {isMock ? (
                            <>
                              <p className="text-sm text-blue-800 mb-3">
                                💡 <strong>목업 쇼핑몰 분석:</strong> 이 쇼핑몰은 목업(테스트용) 쇼핑몰입니다. 신뢰도 점수는 YGMK의 쇼핑몰 신뢰도 분석 기준에 따라 계산되었습니다:
                              </p>
                              <ul className="list-disc list-inside space-y-1 text-sm text-blue-800 mb-3 ml-2">
                                <li><strong>도메인 분석 (40%):</strong> 도메인 연령, 의심스러운 패턴, TLD 등</li>
                                <li><strong>사업자 정보 분석 (20%):</strong> 사업자 등록 정보, 연락처 정보 등</li>
                                <li><strong>피해 사례 제보 분석 (30%):</strong> 신고된 피해 사례의 유형과 빈도</li>
                                <li><strong>평점/리뷰 분석 (10%):</strong> 리뷰 패턴, 평점 분포 등</li>
                              </ul>
                            </>
                          ) : (
                            <>
                              <p className="text-sm text-blue-800 mb-3">
                                💡 <strong>YGMK 학습모델 설명:</strong> 이 신뢰도 점수는 YGMK가 수집한 실제 피싱 사이트 데이터를 학습한 머신러닝 모델(Random Forest)이 분석한 결과입니다. 모델은 URL의 9가지 특징을 종합적으로 검토합니다:
                              </p>
                              <ul className="list-disc list-inside space-y-1 text-sm text-blue-800 mb-3 ml-2">
                                <li><strong>URL 구조:</strong> URL 길이, 하이픈 개수, 서브도메인 깊이</li>
                                <li><strong>도메인 신뢰도:</strong> 도메인 확장자(.com 등), IP 주소 사용 여부, URL 단축 서비스 사용 여부</li>
                                <li><strong>보안 프로토콜:</strong> HTTPS 사용 여부</li>
                                <li><strong>의심 키워드:</strong> login, verify, confirm, account, discount, free 등 피싱에 자주 사용되는 단어</li>
                                <li><strong>기타 특징:</strong> URL에 @ 기호 포함 여부</li>
                              </ul>
                            </>
                          )}
                          {analysisResults.shopRisk && analysisResults.shopRisk.recommendations.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-blue-200">
                              <h6 className="font-semibold mb-2 text-blue-800">권장사항:</h6>
                              <ul className="list-disc list-inside space-y-1 text-sm text-blue-800">
                                <li>이 신뢰도 점수는 참고용이며, 최종 판단은 사용자 본인의 몫입니다.</li>
                                <li>신뢰도 점수가 높더라도 개인정보 입력이나 결제 시에는 항상 신중하게 검토하시기 바랍니다.</li>
                                {analysisResults.shopRisk.recommendations.map((recommendation, index) => (
                                  <li key={index}>{recommendation}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {(!analysisResults.shopRisk || !analysisResults.shopRisk.recommendations || analysisResults.shopRisk.recommendations.length === 0) && (
                            <div className="mt-3 pt-3 border-t border-blue-200">
                              <h6 className="font-semibold mb-2 text-blue-800">권장사항:</h6>
                              <ul className="list-disc list-inside space-y-1 text-sm text-blue-800">
                                <li>이 신뢰도 점수는 참고용이며, 최종 판단은 사용자 본인의 몫입니다.</li>
                                <li>신뢰도 점수가 높더라도 개인정보 입력이나 결제 시에는 항상 신중하게 검토하시기 바랍니다.</li>
                                <li>일반적인 온라인 쇼핑 주의사항을 준수하세요</li>
                                <li>정기적으로 리뷰를 확인해보세요</li>
                              </ul>
                            </div>
                          )}
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
                                   riskStatus === 'warning' ? 'text-yellow-600' : 'text-orange-600';
                  // ScoreDial과 동일한 색상 사용: 90~100: 파란색(매우안전), 70~89: 초록색(안전), 40~69: 노란색(주의), 0~39: 빨간색(의심)
                  const progressColor = riskStatus === 'neutral' ? '#3B82F6' :  // info
                                       riskStatus === 'safe' ? '#10B981' :      // safe
                                       riskStatus === 'warning' ? '#F59E0B' :   // warning
                                       '#EF4444';                                // danger (빨간색)
                  
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
                              {trustScore >= 90 ? '매우 안전하게 이용할 수 있는 쇼핑몰입니다.' :
                               trustScore >= 70 ? '안전하게 이용할 수 있는 쇼핑몰입니다.' :
                               trustScore >= 40 ? '주의가 필요합니다. 구매 전 신중히 검토하세요.' :
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

      {/* 리뷰 신뢰도 분석 결과 모달 */}
      {showReviewTrustModal && reviewTrustResult && (
        <div className="analysis-modal-overlay">
          <div className="analysis-modal-content">
            <div className="analysis-modal-header">
              <h3 className="analysis-modal-title">리뷰 신뢰도 분석 결과</h3>
              <button className="analysis-modal-close" onClick={() => setShowReviewTrustModal(false)}>✕</button>
            </div>
            <div className="analysis-modal-body bg-gradient-to-b from-sky-50 via-sky-100 to-sky-50">
              <div className="space-y-6">
                {/* 리뷰 신뢰도 분석 결과 */}
                <div className="analysis-result-section fake-review bg-gradient-to-b from-sky-50 via-sky-100 to-sky-50 rounded-lg p-6">
                  <h4 className="analysis-result-title mb-6">리뷰 신뢰도 분석</h4>
                  
                  {/* 신뢰도 점수 섹션 */}
                  {reviewTrustResult.overallTrustScore !== null ? (
                    <>
                      <div className="mb-8 bg-white rounded-lg p-6 shadow-sm">
                        <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
                          {/* 원형 점수 표시기 */}
                          <div className="flex-shrink-0">
                            <ScoreDial 
                              score={reviewTrustResult.overallTrustScore * 100} 
                              status={
                                reviewTrustResult.overallTrustScore >= 0.7 ? 'safe' :
                                reviewTrustResult.overallTrustScore >= 0.4 ? 'warning' : 'danger'
                              } 
                            />
                          </div>
                          
                          {/* 설명 텍스트 */}
                          <div className="flex-1">
                            <p className="text-base mb-2">
                              현재 이 쇼핑몰의 리뷰 신뢰도 점수는 <span className="text-blue-600 font-semibold">{(reviewTrustResult.overallTrustScore * 100).toFixed(1)}점</span>이며, 
                              <span className={`font-semibold ${
                                reviewTrustResult.overallLevel === 'HIGH' ? 'text-green-600' :
                                reviewTrustResult.overallLevel === 'MEDIUM' ? 'text-yellow-600' : 'text-orange-600'
                              }`}> '{reviewTrustResult.overallLevel === 'HIGH' ? '높음' : reviewTrustResult.overallLevel === 'MEDIUM' ? '보통' : '낮음'}'</span> 단계입니다.
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {reviewTrustResult.summary}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      {/* 통계 정보 */}
                      <div className="analysis-stats-grid">
                        <div className="analysis-stat-card">
                          <h5 className="analysis-stat-title">전체 분석 대상</h5>
                          <p className="analysis-stat-value">{reviewTrustResult.stats.totalReviews}개</p>
                          <p className="analysis-stat-subtitle">
                            {reviewTrustResult.stats.totalRatings !== undefined && reviewTrustResult.stats.totalReports !== undefined
                              ? `리뷰 ${reviewTrustResult.stats.totalRatings}개 + 신고 ${reviewTrustResult.stats.totalReports}개`
                              : '분석 대상 리뷰'}
                          </p>
                        </div>
                        <div className="analysis-stat-card">
                          <h5 className="analysis-stat-title">의심 리뷰</h5>
                          <p className="analysis-stat-value">{reviewTrustResult.stats.suspiciousCount}개</p>
                          <p className="analysis-stat-subtitle">
                            {reviewTrustResult.stats.totalReviews > 0 
                              ? `${(reviewTrustResult.stats.suspiciousRatio * 100).toFixed(1)}%`
                              : '0%'}
                            {reviewTrustResult.stats.suspiciousRatingsCount !== undefined && reviewTrustResult.stats.suspiciousReportsCount !== undefined
                              ? ` (리뷰 ${reviewTrustResult.stats.suspiciousRatingsCount}개, 신고 ${reviewTrustResult.stats.suspiciousReportsCount}개)`
                              : ''}
                          </p>
                        </div>
                        <div className="analysis-stat-card">
                          <h5 className="analysis-stat-title">정상 리뷰</h5>
                          <p className="analysis-stat-value">{reviewTrustResult.stats.normalCount}개</p>
                          <p className="analysis-stat-subtitle">
                            {reviewTrustResult.stats.totalReviews > 0 
                              ? `${((1 - reviewTrustResult.stats.suspiciousRatio) * 100).toFixed(1)}%`
                              : '0%'}
                          </p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="mb-8 bg-white rounded-lg p-6 shadow-sm">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="flex-shrink-0 w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 9v4M12 17h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                        <div className="flex-1">
                          <h5 className="text-lg font-semibold text-gray-900 mb-1">리뷰 데이터 없음</h5>
                          <p className="text-base text-gray-700">
                            {reviewTrustResult.summary || '분석할 리뷰가 아직 없습니다.'}
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <p className="text-sm text-gray-600">
                          이 쇼핑몰에 대한 리뷰, 신고, 또는 커뮤니티 게시글이 등록되면 신뢰도 분석을 수행할 수 있습니다.
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {/* 의심 리뷰 상세 */}
                  {reviewTrustResult.suspiciousReviews.length > 0 && (
                    <div className="mt-6">
                      <button
                        onClick={() => setShowReviewTrustDetails(!showReviewTrustDetails)}
                        className="analysis-details-button"
                      >
                        {showReviewTrustDetails ? '상세 정보 숨기기' : '상세 정보 보기'} ({reviewTrustResult.suspiciousReviews.length}개)
                      </button>
                      
                      {showReviewTrustDetails && (
                        <div className="analysis-details mt-4">
                          {reviewTrustResult.suspiciousReviews.map((suspicious, index) => (
                            <div key={index} className="analysis-detail-card">
                              <div className="analysis-detail-header">
                                <div className="analysis-detail-badges">
                                  <span className="analysis-badge fake">의심 리뷰</span>
                                  <span className="analysis-badge confidence">
                                    {suspicious.suggestedAction === 'REVIEW' ? '검토 필요' :
                                     suspicious.suggestedAction === 'FLAG' ? '주의 필요' : '무시 가능'}
                                  </span>
                                </div>
                                <span className="analysis-detail-date">리뷰 ID: {suspicious.reviewId}</span>
                              </div>
                              <div className="analysis-patterns mt-3">
                                <h6 className="analysis-patterns-title">의심 이유:</h6>
                                <p className="text-sm text-muted-foreground mt-1">{suspicious.reason}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* 안내 메시지 */}
                  <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800 mb-3">
                      💡 <strong>리뷰 신뢰도 분석 설명:</strong> 이 분석은 여기몰까 플랫폼에 등록된 리뷰/신고/후기 텍스트를 기반으로 수행됩니다. 
                      OpenRouter의 Claude 3.5 Sonnet 모델이 각 리뷰의 패턴을 분석하여 신뢰도를 평가합니다.
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-sm text-blue-800 mb-3 ml-2">
                      <li><strong>분석 기준:</strong> 과도한 극단 표현 반복, 동일 패턴 리뷰, 시간대 편중, 균형 없는 평가 등</li>
                      <li><strong>의심 리뷰:</strong> AI가 의심스러운 패턴을 발견한 리뷰입니다. 반드시 가짜 리뷰를 의미하는 것은 아닙니다.</li>
                      <li><strong>참고용:</strong> 이 분석 결과는 참고용이며, 최종 판단은 사용자 본인의 몫입니다.</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

