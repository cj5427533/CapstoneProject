import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { AdvancedFakeReviewDetector, Review, FakeReviewResult } from '../services/advancedFakeReviewDetector';
import { ShopRiskAnalyzer, Shop, Report, Rating, ShopRiskResult } from '../services/shopRiskAnalyzer';
import { RealTimePhishingSystem, PhishingAlert } from '../services/realTimePhishingSystem';
import { AdvancedFakeReviewSystem } from '../services/advancedFakeReviewSystem';

interface AdvancedAIAnalysisProps {
  shop: Shop;
  reports: Report[];
  ratings: Rating[];
  shopUrl: string;
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

  const fakeReviewDetector = AdvancedFakeReviewDetector.getInstance();
  const shopRiskAnalyzer = ShopRiskAnalyzer.getInstance();
  const phishingSystem = RealTimePhishingSystem.getInstance();
  const advancedSystem = AdvancedFakeReviewSystem.getInstance();

  useEffect(() => {
    // 실시간 모니터링 상태 확인
    const status = advancedSystem.getSystemStatus();
    setMonitoringEnabled(status.monitoringShops > 0);
  }, []);

  const runAdvancedAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      // 1. 고급 가짜 리뷰 탐지
      const fakeReviewResults = await fakeReviewDetector.detectFakeReviews(ratings);
      
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
      const fakeStats = fakeReviewDetector.generateStatistics(fakeReviewResults, ratings.length);
      
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

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'LOW': return 'text-green-600 bg-green-100';
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-100';
      case 'HIGH': return 'text-orange-600 bg-orange-100';
      case 'CRITICAL': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
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
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-bold text-gray-800 flex items-center">
          🤖 고급 AI 분석 시스템
          <span className="ml-2 px-3 py-1 text-xs bg-purple-100 text-purple-800 rounded-full">
            구체적 기준 기반
          </span>
        </h3>
        <div className="flex space-x-3">
          <button
            onClick={toggleRealTimeMonitoring}
            className={`px-4 py-2 rounded-lg font-medium ${
              monitoringEnabled 
                ? 'bg-red-600 text-white hover:bg-red-700' 
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {monitoringEnabled ? '모니터링 중지' : '실시간 모니터링'}
          </button>
          <button
            onClick={runAdvancedAnalysis}
            disabled={isAnalyzing}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {isAnalyzing ? '분석 중...' : '고급 AI 분석 시작'}
          </button>
        </div>
      </div>

      {/* 실시간 모니터링 상태 */}
      {monitoringEnabled && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse mr-2"></div>
            <span className="text-green-800 font-medium">실시간 모니터링 활성화</span>
            <span className="ml-2 text-green-600 text-sm">새 리뷰와 위험 요소를 실시간으로 감시합니다</span>
          </div>
        </div>
      )}

      {/* 분석 결과 */}
      {analysisResults && (
        <div className="space-y-6">
          {/* 1. 가짜 리뷰 탐지 결과 */}
          {analysisResults.fakeReviews.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="font-bold text-red-800 mb-3 flex items-center">
                🔍 가짜 리뷰 탐지 결과 (구체적 기준)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="bg-white p-3 rounded border">
                  <h5 className="font-medium text-red-700 mb-1">의심스러운 리뷰</h5>
                  <p className="text-2xl font-bold text-red-600">{analysisResults.fakeReviews.length}개</p>
                  <p className="text-sm text-gray-600">전체 {ratings.length}개 중</p>
                </div>
                <div className="bg-white p-3 rounded border">
                  <h5 className="font-medium text-red-700 mb-1">평균 의심도</h5>
                  <p className="text-2xl font-bold text-red-600">
                    {Math.round(analysisResults.fakeReviews.reduce((sum, r) => sum + r.fakeScore, 0) / analysisResults.fakeReviews.length)}점
                  </p>
                  <p className="text-sm text-gray-600">0-100점 기준</p>
                </div>
                <div className="bg-white p-3 rounded border">
                  <h5 className="font-medium text-red-700 mb-1">평균 신뢰도</h5>
                  <p className="text-2xl font-bold text-red-600">
                    {Math.round(analysisResults.fakeReviews.reduce((sum, r) => sum + r.confidence, 0) / analysisResults.fakeReviews.length)}점
                  </p>
                  <p className="text-sm text-gray-600">0-100점 기준</p>
                </div>
              </div>
              
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-red-600 hover:text-red-800 font-medium mb-3"
              >
                {showDetails ? '상세 정보 숨기기' : '상세 정보 보기'} ({analysisResults.fakeReviews.length}개)
              </button>
              
              {showDetails && (
                <div className="space-y-3">
                  {analysisResults.fakeReviews.map((result, index) => (
                    <div key={index} className="bg-white p-4 rounded border border-red-200">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center space-x-3">
                          <span className="px-2 py-1 bg-red-100 text-red-800 text-sm rounded">
                            의심도: {result.fakeScore}점
                          </span>
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded">
                            신뢰도: {result.confidence}점
                          </span>
                          <span className="text-sm text-gray-600">
                            평점: {result.review.rating}점
                          </span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(result.review.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      
                      <p className="text-gray-800 mb-3">{result.review.content}</p>
                      
                      <div className="space-y-2">
                        <h6 className="font-medium text-red-800">발견된 패턴 (구체적 기준):</h6>
                        <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
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
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <h4 className="font-bold text-orange-800 mb-3 flex items-center">
                ⚠️ 쇼핑몰 위험도 분석 (구체적 기준)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="bg-white p-3 rounded border">
                  <h5 className="font-medium text-orange-700 mb-1">종합 위험도</h5>
                  <p className="text-2xl font-bold text-orange-600">{analysisResults.shopRisk.riskScore}점</p>
                  <span className={`inline-block px-2 py-1 rounded text-sm font-medium ${getRiskLevelColor(analysisResults.shopRisk.riskLevel)}`}>
                    {getRiskLevelText(analysisResults.shopRisk.riskLevel)}
                  </span>
                </div>
                <div className="bg-white p-3 rounded border">
                  <h5 className="font-medium text-orange-700 mb-1">분석 세부사항</h5>
                  <div className="space-y-1 text-sm">
                    <div>신고 분석: {Math.round(analysisResults.shopRisk.analysis.reportAnalysis)}점</div>
                    <div>평점 분석: {Math.round(analysisResults.shopRisk.analysis.ratingAnalysis)}점</div>
                    <div>도메인 분석: {Math.round(analysisResults.shopRisk.analysis.domainAnalysis)}점</div>
                    <div>사업자 분석: {Math.round(analysisResults.shopRisk.analysis.businessAnalysis)}점</div>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <div>
                  <h6 className="font-medium text-orange-800 mb-2">발견된 위험 요소:</h6>
                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                    {analysisResults.shopRisk.reasons.map((reason, index) => (
                      <li key={index}>{reason}</li>
                    ))}
                  </ul>
                </div>
                
                <div>
                  <h6 className="font-medium text-orange-800 mb-2">권장사항:</h6>
                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
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
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="font-bold text-red-800 mb-3 flex items-center">
                🚨 실시간 피싱 탐지 결과
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="bg-white p-3 rounded border">
                  <h5 className="font-medium text-red-700 mb-1">피싱 점수</h5>
                  <p className="text-2xl font-bold text-red-600">{analysisResults.phishingAlert.phishingScore}점</p>
                  <span className={`inline-block px-2 py-1 rounded text-sm font-medium ${getRiskLevelColor(analysisResults.phishingAlert.riskLevel)}`}>
                    {getRiskLevelText(analysisResults.phishingAlert.riskLevel)}
                  </span>
                </div>
                <div className="bg-white p-3 rounded border">
                  <h5 className="font-medium text-red-700 mb-1">권장 액션</h5>
                  <p className="text-lg font-bold text-red-600">
                    {analysisResults.phishingAlert.action === 'BLOCK' ? '즉시 차단' :
                     analysisResults.phishingAlert.action === 'ALERT' ? '강력 경고' : '모니터링'}
                  </p>
                  <p className="text-sm text-gray-600">실시간 탐지 결과</p>
                </div>
              </div>
              
              <div>
                <h6 className="font-medium text-red-800 mb-2">탐지된 위험 요소:</h6>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                  {analysisResults.phishingAlert.reasons.map((reason, index) => (
                    <li key={index}>{reason}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 분석 기준 설명 */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h5 className="font-medium text-gray-800 mb-2">🔬 우리만의 구체적 분석 기준</h5>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
          <div>
            <h6 className="font-medium text-gray-700 mb-1">가짜 리뷰 탐지:</h6>
            <ul className="list-disc list-inside space-y-1">
              <li>과도한 긍정 표현 2개 이상 사용</li>
              <li>5분 내 3개 이상 연속 리뷰</li>
              <li>90% 이상 5점 리뷰</li>
              <li>비현실적 배송/가격 표현</li>
            </ul>
          </div>
          <div>
            <h6 className="font-medium text-gray-700 mb-1">피싱 사이트 탐지:</h6>
            <ul className="list-disc list-inside space-y-1">
              <li>유명 사이트와 85% 이상 유사한 도메인</li>
              <li>긴급성 강조 표현 3개 이상</li>
              <li>30일 이내 신규 도메인</li>
              <li>사업자 정보 2개 이상 부족</li>
            </ul>
          </div>
        </div>
      </div>

      {/* 면책 조항 */}
      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-sm text-yellow-800">
          ⚠️ <strong>면책 조항:</strong> AI 분석 결과는 참고용이며, 최종 판단은 사용자에게 있습니다. 
          모든 분석은 구체적인 기준에 따라 객관적으로 수행됩니다.
        </p>
      </div>
    </div>
  );
};
