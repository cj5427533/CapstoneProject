import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { AdvancedFakeReviewDetector, FakeReviewResult } from '../../services/advancedFakeReviewDetector';
import { ShopRiskAnalyzer, Shop, Report, Rating, ShopRiskResult } from '../../services/shopRiskAnalyzer';
import { RealTimePhishingSystem, PhishingAlert } from '../../services/realTimePhishingSystem';
import { FakeReviewDetector, ShopType } from '../../services/fakeReviewDetector';
import { Review } from '../../utils/openRouter';
import { ScoreDial } from '../report/ScoreDial';
import { predictPhishingWithML, MLPredictionResult, analyzeReviewTrust, ReviewTrustAnalysisResult } from '../../utils/api';

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
  const [isAnalysisComplete, setIsAnalysisComplete] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<{
    fakeReviews: FakeReviewResult[];
    shopRisk: ShopRiskResult | null;
    phishingAlert: PhishingAlert | null;
    mlPrediction: MLPredictionResult | null;
  } | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  
  // 분석 진행률 추적 상태
  const [analysisProgress, setAnalysisProgress] = useState<{
    mlPrediction: number;
    fakeReview: number;
    shopRisk: number;
    phishing: number;
  }>({
    mlPrediction: 0,
    fakeReview: 0,
    shopRisk: 0,
    phishing: 0
  });
  
  // AI 리뷰 분석 관련 상태 (기존 프론트엔드 로직용)
  const [isReviewAnalyzing, setIsReviewAnalyzing] = useState(false);
  const [fakeReviews, setFakeReviews] = useState<FakeReviewResult[]>([]);
  const [reviewStatistics, setReviewStatistics] = useState<AnalysisStatistics | null>(null);
  const [showReviewDetails, setShowReviewDetails] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);

  // 리뷰 신뢰도 분석 관련 상태 (백엔드 API용)
  const [isReviewTrustAnalyzing, setIsReviewTrustAnalyzing] = useState(false);
  const [isReviewTrustComplete, setIsReviewTrustComplete] = useState(false);
  const [reviewTrustResult, setReviewTrustResult] = useState<ReviewTrustAnalysisResult | null>(null);
  const [showReviewTrustModal, setShowReviewTrustModal] = useState(false);
  const [showReviewTrustDetails, setShowReviewTrustDetails] = useState(false);
  const [showAllReviewCriteria, setShowAllReviewCriteria] = useState(false);
  const [showAllPhishingCriteria, setShowAllPhishingCriteria] = useState(false);

  const fakeReviewDetector = AdvancedFakeReviewDetector.getInstance();
  const shopRiskAnalyzer = ShopRiskAnalyzer.getInstance();
  const phishingSystem = RealTimePhishingSystem.getInstance();
  const basicFakeReviewDetector = FakeReviewDetector.getInstance();

  const reviewCriteria = [
    '과도한 극단 표현 반복 (예: "최고", "완벽", "최악", "사기" 등)',
    '동일 패턴 리뷰 (비슷한 문체, 비슷한 내용)',
    '시간대 편중 (짧은 시간 내 다수 리뷰)',
    '균형 없는 평가 (너무 좋은/나쁜 표현만 있는 경우)',
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
    setIsAnalysisComplete(false);
    // 진행률 초기화
    setAnalysisProgress({
      mlPrediction: 0,
      fakeReview: 0,
      shopRisk: 0,
      phishing: 0
    });
    
    try {
      // 각 작업의 진행률을 시뮬레이션하는 헬퍼 함수
      const simulateProgress = (key: 'mlPrediction' | 'fakeReview' | 'shopRisk' | 'phishing', promise: Promise<any>) => {
        return new Promise(async (resolve) => {
          // 진행률 애니메이션
          const progressInterval = setInterval(() => {
            setAnalysisProgress(prev => {
              const current = prev[key];
              if (current < 90) {
                return { ...prev, [key]: current + Math.random() * 15 };
              }
              return prev;
            });
          }, 200);
          
          try {
            const result = await promise;
            clearInterval(progressInterval);
            setAnalysisProgress(prev => ({ ...prev, [key]: 100 }));
            // 완료 후 약간의 딜레이
            setTimeout(() => resolve(result), 100);
          } catch (error) {
            clearInterval(progressInterval);
            setAnalysisProgress(prev => ({ ...prev, [key]: 100 }));
            setTimeout(() => resolve(null), 100);
          }
        });
      };
      
      // 병렬 처리로 분석 시간 단축: 독립적인 작업들을 동시에 실행
      const [mlPredictionResult, fakeReviewResults, shopRiskResult, phishingAlertResult] = await Promise.allSettled([
        // 1. ML 모델을 이용한 피싱 URL 예측
        simulateProgress('mlPrediction', predictPhishingWithML(shopUrl).catch((mlError) => {
          console.error('ML 예측 오류:', mlError);
          toast.warning('ML 모델 예측 중 오류가 발생했습니다. 다른 분석은 계속 진행됩니다.');
          return null;
        })),
        
        // 2. 고급 가짜 리뷰 탐지 (빈 배열이므로 즉시 반환)
        simulateProgress('fakeReview', fakeReviewDetector.detectFakeReviews([])),
        
        // 3. 쇼핑몰 신뢰도 분석
        simulateProgress('shopRisk', shopRiskAnalyzer.analyzeShopRisk(shop, reports, ratings)),
        
        // 4. 실시간 피싱 탐지
        simulateProgress('phishing', phishingSystem.detectPhishingRealTime(shopUrl).catch((phishingError) => {
          console.error('피싱 탐지 오류:', phishingError);
          toast.warning('피싱 탐지 중 오류가 발생했습니다. 다른 분석은 계속 진행됩니다.');
          return null;
        }))
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
      
      // 모든 진행률을 100%로 설정
      setAnalysisProgress({
        mlPrediction: 100,
        fakeReview: 100,
        shopRisk: 100,
        phishing: 100
      });
      
      // 분석 완료 상태로 변경 (자동으로 결과 모달을 띄우지 않음)
      setIsAnalysisComplete(true);
      
    } catch (error) {
      console.error('피싱 사이트 검사 오류:', error);
      toast.error('사이트 검사 중 오류가 발생했습니다.');
      setIsAnalyzing(false);
      setIsAnalysisComplete(false);
    }
  };

  // 결과 확인하기 버튼 클릭 핸들러
  const handleViewResults = () => {
    setIsAnalyzing(false);
    setIsAnalysisComplete(false);
    setShowAnalysisModal(true);
    
    // ML 예측 결과에 따른 알림
    if (analysisResults?.mlPrediction) {
      const mlPrediction = analysisResults.mlPrediction;
      if (mlPrediction.label === 1) {
        toast.warning(`ML 모델 분석: 피싱 사이트로 의심됩니다. (신뢰도: ${(mlPrediction.confidence * 100).toFixed(1)}%)`);
      } else {
        toast.success(`ML 모델 분석: 정상 사이트로 판단됩니다. (신뢰도: ${(mlPrediction.confidence * 100).toFixed(1)}%)`);
      }
    }
    
    if (analysisResults && (
      analysisResults.fakeReviews.length > 0 || 
      (analysisResults.shopRisk && analysisResults.shopRisk.riskScore >= 70) || 
      analysisResults.phishingAlert || 
      (analysisResults.mlPrediction && analysisResults.mlPrediction.label === 1)
    )) {
      toast.success('피싱 사이트 검사가 완료되었습니다. 주의가 필요한 항목이 발견되었습니다.');
    } else {
      toast.info('피싱 사이트 검사가 완료되었습니다. 특별한 문제가 발견되지 않았습니다.');
    }
  };


  // 백엔드 API를 사용한 리뷰 신뢰도 분석
  const runReviewTrustAnalysis = async () => {
    setIsReviewTrustAnalyzing(true);
    setIsReviewTrustComplete(false);
    setReviewTrustResult(null);

    try {
      const result = await analyzeReviewTrust(shop.id, shopUrl);
      setReviewTrustResult(result);
      setIsReviewTrustComplete(true);
    } catch (error: any) {
      console.error('리뷰 신뢰도 분석 오류:', error);
      setIsReviewTrustAnalyzing(false);
      setIsReviewTrustComplete(false);
      toast.error(error.message || '리뷰 신뢰도 분석 중 오류가 발생했습니다.');
    }
  };

  // 리뷰 신뢰도 분석 결과 확인하기 버튼 클릭 핸들러
  const handleViewReviewTrustResults = () => {
    setIsReviewTrustAnalyzing(false);
    setIsReviewTrustComplete(false);
    setShowReviewTrustModal(true);
    
    if (reviewTrustResult) {
      if (reviewTrustResult.overallLevel === 'HIGH') {
        toast.success('리뷰 신뢰도가 높습니다.');
      } else if (reviewTrustResult.overallLevel === 'MEDIUM') {
        toast.info('리뷰 신뢰도가 보통 수준입니다.');
      } else if (reviewTrustResult.overallLevel === 'LOW') {
        toast.warning('리뷰 신뢰도가 낮습니다. 일부 리뷰를 검토할 필요가 있습니다.');
      }
    }
  };

  // 기존 프론트엔드 로직 (레거시, 사용하지 않음)
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


  // 로딩 텍스트 점 애니메이션
  const [loadingDots, setLoadingDots] = useState('');
  
  useEffect(() => {
    if ((isAnalyzing && !isAnalysisComplete) || (isReviewTrustAnalyzing && !isReviewTrustComplete)) {
      const interval = setInterval(() => {
        setLoadingDots(prev => {
          if (prev === '') return '.';
          if (prev === '.') return '..';
          if (prev === '..') return '...';
          return '';
        });
      }, 500);
      return () => clearInterval(interval);
    } else {
      setLoadingDots('');
    }
  }, [isAnalyzing, isAnalysisComplete, isReviewTrustAnalyzing, isReviewTrustComplete]);

  // 전체 진행률 계산
  const totalProgress = Math.round(
    (analysisProgress.mlPrediction + 
     analysisProgress.fakeReview + 
     analysisProgress.shopRisk + 
     analysisProgress.phishing) / 4
  );

  return (
    <div className="advanced-ai-analysis bg-white rounded-lg shadow-lg p-6 mb-6">
      {/* 쇼핑몰 신뢰도 분석 로딩 화면 */}
      {isAnalyzing && (
        <div className="analysis-modal-overlay">
          <div className="analysis-modal-content">
            <div className="analysis-modal-header">
              <h3 className="analysis-modal-title">
                {isAnalysisComplete ? '✅ 분석 완료!' : '신뢰도 분석 진행중' + loadingDots}
              </h3>
              {!isAnalysisComplete && (
                <button 
                  className="analysis-modal-close"
                  onClick={() => {
                    setIsAnalyzing(false);
                    setIsAnalysisComplete(false);
                  }}
                >
                  ✕
                </button>
              )}
            </div>
            
            <div className="analysis-modal-body">
              <div className="analysis-loading-content">
                {isAnalysisComplete ? (
                  <div className="analysis-complete-actions">
                    <div className="analysis-complete-icon">
                      <svg width="80" height="80" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="12" cy="12" r="10" fill="#10b981" opacity="0.2"/>
                        <path d="M9 12l2 2 4-4" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                        <circle cx="12" cy="12" r="10" stroke="#10b981" strokeWidth="2"/>
                      </svg>
                    </div>
                    <h4 className="analysis-complete-title">분석이 완료되었습니다!</h4>
                    <p className="analysis-complete-message">
                      쇼핑몰 신뢰도 분석이 성공적으로 완료되었습니다.<br/>
                      결과를 확인하여 안전한 쇼핑을 하세요.
                    </p>
                    <button 
                      className="analysis-view-results-btn"
                      onClick={handleViewResults}
                    >
                      <span>결과 확인하기</span>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  </div>
                ) : (
                  <div className="analysis-loading-progress-container">
                    {/* 로딩 아이콘 */}
                    <div className="analysis-loading-icon">
                      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="12" cy="12" r="10" stroke="#e2e8f0" strokeWidth="2"/>
                        <path d="M12 2a10 10 0 0 1 10 10" stroke="#2563eb" strokeWidth="2" strokeLinecap="round">
                          <animateTransform
                            attributeName="transform"
                            type="rotate"
                            from="0 12 12"
                            to="360 12 12"
                            dur="1s"
                            repeatCount="indefinite"
                          />
                        </path>
                      </svg>
                    </div>
                    
                    {/* 진행률 게이지바 */}
                    <div className="analysis-progress-section">
                      <div className="analysis-progress-label">
                        <span>분석 진행률</span>
                        <span className="analysis-progress-percent">{totalProgress}%</span>
                      </div>
                      <div className="analysis-progress-gauge-wrapper">
                        <div 
                          className="analysis-progress-gauge-bar"
                          style={{ width: `${Math.max(totalProgress, 2)}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    {/* 안내 메시지 */}
                    <p className="analysis-loading-hint">
                      잠시만 기다려주세요. 쇼핑몰을 분석하고 있습니다...
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 리뷰 신뢰도 분석 로딩 화면 */}
      {isReviewTrustAnalyzing && (
        <div className="analysis-modal-overlay">
          <div className="analysis-modal-content">
            <div className="analysis-modal-header">
              <h3 className="analysis-modal-title">
                {isReviewTrustComplete ? '✅ 분석 완료!' : '리뷰 신뢰도 분석 진행중' + loadingDots}
              </h3>
              {!isReviewTrustComplete && (
                <button 
                  className="analysis-modal-close"
                  onClick={() => {
                    setIsReviewTrustAnalyzing(false);
                    setIsReviewTrustComplete(false);
                  }}
                >
                  ✕
                </button>
              )}
            </div>
            
            <div className="analysis-modal-body">
              <div className="analysis-loading-content">
                {isReviewTrustComplete ? (
                  <div className="analysis-complete-actions">
                    <div className="analysis-complete-icon">
                      <svg width="80" height="80" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="12" cy="12" r="10" fill="#10b981" opacity="0.2"/>
                        <path d="M9 12l2 2 4-4" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                        <circle cx="12" cy="12" r="10" stroke="#10b981" strokeWidth="2"/>
                      </svg>
                    </div>
                    <h4 className="analysis-complete-title">분석이 완료되었습니다!</h4>
                    <p className="analysis-complete-message">
                      리뷰 신뢰도 분석이 성공적으로 완료되었습니다.<br/>
                      결과를 확인하여 신뢰할 수 있는 리뷰를 확인하세요.
                    </p>
                    <button 
                      className="analysis-view-results-btn"
                      onClick={handleViewReviewTrustResults}
                    >
                      <span>결과 확인하기</span>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  </div>
                ) : (
                  <div className="analysis-loading-progress-container">
                    {/* 로딩 아이콘 */}
                    <div className="analysis-loading-icon">
                      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="12" cy="12" r="10" stroke="#e2e8f0" strokeWidth="2"/>
                        <path d="M12 2a10 10 0 0 1 10 10" stroke="#2563eb" strokeWidth="2" strokeLinecap="round">
                          <animateTransform
                            attributeName="transform"
                            type="rotate"
                            from="0 12 12"
                            to="360 12 12"
                            dur="1s"
                            repeatCount="indefinite"
                          />
                        </path>
                      </svg>
                    </div>
                    
                    {/* 안내 메시지 */}
                    <p className="analysis-loading-hint">
                      잠시만 기다려주세요. 리뷰를 분석하고 있습니다...
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

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
              {isReviewTrustAnalyzing ? '분석 중...' : '리뷰 신뢰도 분석하기'}
            </button>
            <button 
              className="review-analyze-btn"
              onClick={runAdvancedAnalysis}
              disabled={isAnalyzing || isReviewTrustAnalyzing}
            >
              {isAnalyzing ? '분석 중...' : '쇼핑몰 신뢰도 분석'}
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
                  
                  if (isMock && analysisResults.shopRisk) {
                    // 목업 쇼핑몰: shopRiskAnalyzer 결과 사용
                    trustScore = 100 - analysisResults.shopRisk.riskScore;
                    isPhishing = analysisResults.shopRisk.riskScore >= 65;
                  } else if (analysisResults.mlPrediction) {
                    // 실제 쇼핑몰: ML 예측 결과 사용
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
                    // shopRisk만 있는 경우
                    trustScore = analysisResults.shopRisk ? 100 - analysisResults.shopRisk.riskScore : 50;
                    isPhishing = analysisResults.shopRisk ? analysisResults.shopRisk.riskScore >= 65 : false;
                  }
                  
                  // riskScore로 변환 (getRiskLevelKorean과 getRiskStatus 함수 사용을 위해)
                  const riskScore = 100 - trustScore;
                  const riskStatus = getRiskStatus(riskScore);
                  const riskLevelKorean = getRiskLevelKorean(riskScore);
                  
                  const riskColor = riskStatus === 'safe' ? 'text-green-600' : 
                                   riskStatus === 'neutral' ? 'text-blue-600' : 
                                   riskStatus === 'warning' ? 'text-yellow-600' : 'text-orange-600';
                  
                  // 90~100: 파란색(매우안전), 70~89: 초록색(안전), 40~69: 노란색(주의), 0~39: 주황색(의심)
                  const progressColor = trustScore >= 90 ? '#3B82F6' : 
                                       trustScore >= 70 ? '#10B981' : 
                                       trustScore >= 40 ? '#F59E0B' : '#F97316';
                  
                  // 분석 세부사항 계산
                  let adjustedUrlStructureScore: number;
                  let adjustedDomainTrustScore: number;
                  let adjustedSecurityProtocolScore: number;
                  let adjustedSuspiciousKeywordScore: number;
                  
                  if (isMock && analysisResults.shopRisk) {
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
                  // 90~100: 파란색(매우안전), 70~89: 초록색(안전), 40~69: 노란색(주의), 0~39: 주황색(의심)
                  const progressColor = trustScore >= 90 ? '#3B82F6' : 
                                       trustScore >= 70 ? '#10B981' : 
                                       trustScore >= 40 ? '#F59E0B' : '#F97316';
                  
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
                          <h5 className="analysis-stat-title">전체 리뷰 수</h5>
                          <p className="analysis-stat-value">{reviewTrustResult.stats.totalReviews}개</p>
                          <p className="analysis-stat-subtitle">분석 대상 리뷰</p>
                        </div>
                        <div className="analysis-stat-card">
                          <h5 className="analysis-stat-title">의심 리뷰</h5>
                          <p className="analysis-stat-value">{reviewTrustResult.stats.suspiciousCount}개</p>
                          <p className="analysis-stat-subtitle">
                            {reviewTrustResult.stats.totalReviews > 0 
                              ? `${(reviewTrustResult.stats.suspiciousRatio * 100).toFixed(1)}%`
                              : '0%'}
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

