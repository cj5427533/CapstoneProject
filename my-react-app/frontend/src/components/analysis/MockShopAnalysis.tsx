import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { mockShops, mockReviews, mockReports, mockRiskAnalysis } from '../../data/mockData';

interface MockShopAnalysisProps {
  shopUrl: string;
  selectedShopId?: string;
}

export const MockShopAnalysis: React.FC<MockShopAnalysisProps> = ({
  selectedShopId
}) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<{
    fakeReviews: any[];
    shopRisk: any;
    shopInfo: any;
  } | null>(null);

  // 선택된 쇼핑몰 정보 가져오기
  const selectedShop = selectedShopId ? mockShops.find(shop => shop.id === selectedShopId) : mockShops[0];
  const shopReviews = selectedShopId ? mockReviews[selectedShopId as keyof typeof mockReviews] || [] : [];
  const shopReports = selectedShopId ? mockReports[selectedShopId as keyof typeof mockReports] || [] : [];
  const shopAnalysis = selectedShopId ? mockRiskAnalysis[selectedShopId as keyof typeof mockRiskAnalysis] : null;

  const runMockAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      // 목업 데이터 기반 분석 결과 생성
      const mockAnalysisResults = {
        fakeReviews: shopReviews.map((review) => ({
          review,
          fakeScore: selectedShop?.riskLevel === 'HIGH' ? 0.8 + Math.random() * 0.2 : 
                    selectedShop?.riskLevel === 'MEDIUM' ? 0.4 + Math.random() * 0.3 : 
                    0.1 + Math.random() * 0.2,
          reasons: selectedShop?.riskLevel === 'HIGH' ? [
            '과도하게 긍정적인 표현 사용',
            '비현실적인 배송 시간 언급',
            '반복적인 문구 패턴'
          ] : selectedShop?.riskLevel === 'MEDIUM' ? [
            '일부 의심스러운 표현 발견',
            '평점 분포가 부자연스러움'
          ] : [
            '정상적인 리뷰 패턴'
          ]
        })).filter(result => result.fakeScore > 0.3),
        shopRisk: shopAnalysis,
        shopInfo: selectedShop
      };

      setAnalysisResults(mockAnalysisResults);

      toast.success(`${selectedShop?.name} 목업 쇼핑몰 AI 분석이 완료되었습니다!`);
    } catch (error) {
      console.error('목업 분석 오류:', error);
      toast.error('목업 분석 중 오류가 발생했습니다.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="mock-shop-analysis bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold text-blue-800 flex items-center">
          목업 쇼핑몰 AI 분석
          <span className="ml-2 px-2 py-1 text-xs bg-blue-200 text-blue-900 rounded">
            학습 모드
          </span>
        </h3>
        <button
          onClick={runMockAnalysis}
          disabled={isAnalyzing}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isAnalyzing ? '분석 중...' : '목업 분석 시작'}
        </button>
      </div>

      {/* 선택된 쇼핑몰 정보 */}
      {selectedShop && (
        <div className="mb-4 p-3 bg-white border border-blue-300 rounded-lg">
          <h4 className="font-medium text-blue-800 mb-2">선택된 목업 쇼핑몰:</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <strong>쇼핑몰명:</strong> {selectedShop.name}
            </div>
            <div>
              <strong>URL:</strong> {selectedShop.url}
            </div>
            <div>
              <strong>리스크 레벨:</strong> 
              <span className={`ml-1 px-2 py-1 text-xs rounded ${
                selectedShop.riskLevel === 'LOW' ? 'bg-green-200 text-green-800' :
                selectedShop.riskLevel === 'MEDIUM' ? 'bg-yellow-200 text-yellow-800' :
                'bg-red-200 text-red-800'
              }`}>
                {selectedShop.riskLevel}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="mb-4 p-3 bg-blue-100 border border-blue-300 rounded-lg">
        <p className="text-blue-900 text-sm">
          📚 이 섹션은 목업 쇼핑몰의 AI 분석 기능을 시연합니다.
          실제 사기 쇼핑몰과 유사한 패턴을 학습할 수 있습니다.
        </p>
      </div>

      {/* 목업 리뷰 미리보기 */}
      <div className="mb-4">
        <h4 className="font-medium text-blue-800 mb-2">목업 리뷰 샘플:</h4>
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {shopReviews.slice(0, 5).map((review, index) => (
            <div key={index} className="bg-white p-3 rounded border text-sm">
              <div className="flex justify-between items-start mb-1">
                <span className="font-medium">평점: {review.rating}점</span>
                <span className="text-gray-500 text-xs">
                  {new Date(review.createdAt).toLocaleDateString()}
                </span>
              </div>
              <p className="text-gray-700">{review.content}</p>
              {review.author && (
                <p className="text-gray-500 text-xs mt-1">작성자: {review.author}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 신고 데이터 미리보기 */}
      {shopReports.length > 0 && (
        <div className="mb-4">
          <h4 className="font-medium text-blue-800 mb-2">신고 데이터 샘플:</h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {shopReports.slice(0, 3).map((report, index) => (
              <div key={index} className="bg-white p-3 rounded border text-sm">
                <div className="flex justify-between items-start mb-1">
                  <span className="font-medium">카테고리: {report.categories.join(', ')}</span>
                  <span className="text-gray-500 text-xs">
                    {new Date(report.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-gray-700">{report.description}</p>
                <p className="text-gray-500 text-xs mt-1">신고자: {report.reporter_name}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 분석 결과 */}
      {analysisResults && (
        <div className="space-y-4">
          {/* 쇼핑몰 신뢰도 분석 결과 */}
          {analysisResults.shopRisk && (
            <div className={`border rounded-lg p-4 ${
              analysisResults.shopRisk.riskLevel === 'LOW' ? 'bg-green-50 border-green-200' :
              analysisResults.shopRisk.riskLevel === 'MEDIUM' ? 'bg-yellow-50 border-yellow-200' :
              'bg-red-50 border-red-200'
            }`}>
              <h4 className={`font-medium mb-2 ${
                analysisResults.shopRisk.riskLevel === 'LOW' ? 'text-green-800' :
                analysisResults.shopRisk.riskLevel === 'MEDIUM' ? 'text-yellow-800' :
                'text-red-800'
              }`}>
                {analysisResults.shopRisk.riskLevel === 'LOW' ? '✅' : 
                 analysisResults.shopRisk.riskLevel === 'MEDIUM' ? '⚠️' : '🚨'} 
                쇼핑몰 신뢰도 분석 결과
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className={`text-sm mb-2 ${
                    analysisResults.shopRisk.riskLevel === 'LOW' ? 'text-green-700' :
                    analysisResults.shopRisk.riskLevel === 'MEDIUM' ? 'text-yellow-700' :
                    'text-red-700'
                  }`}>
                    <strong>신뢰도 점수:</strong> {100 - analysisResults.shopRisk.riskScore}/100
                  </p>
                  <p className={`text-sm mb-2 ${
                    analysisResults.shopRisk.riskLevel === 'LOW' ? 'text-green-700' :
                    analysisResults.shopRisk.riskLevel === 'MEDIUM' ? 'text-yellow-700' :
                    'text-red-700'
                  }`}>
                    <strong>주의 등급:</strong> 
                    <span className={`ml-1 px-2 py-1 text-xs rounded ${
                      analysisResults.shopRisk.riskLevel === 'LOW' ? 'bg-green-200 text-green-800' :
                      analysisResults.shopRisk.riskLevel === 'MEDIUM' ? 'bg-yellow-200 text-yellow-800' :
                      'bg-red-200 text-red-800'
                    }`}>
                      {analysisResults.shopRisk.riskLevel}
                    </span>
                  </p>
                </div>
                <div>
                  <p className={`text-sm mb-2 ${
                    analysisResults.shopRisk.riskLevel === 'LOW' ? 'text-green-700' :
                    analysisResults.shopRisk.riskLevel === 'MEDIUM' ? 'text-yellow-700' :
                    'text-red-700'
                  }`}>
                    <strong>주요 우려사항:</strong>
                  </p>
                  <ul className={`list-disc list-inside text-xs ${
                    analysisResults.shopRisk.riskLevel === 'LOW' ? 'text-green-600' :
                    analysisResults.shopRisk.riskLevel === 'MEDIUM' ? 'text-yellow-600' :
                    'text-red-600'
                  }`}>
                    {analysisResults.shopRisk.concerns.slice(0, 2).map((concern: string, index: number) => (
                      <li key={index}>{concern}</li>
                    ))}
                  </ul>
                </div>
              </div>
              
              {/* 권장사항 */}
              <div className="mt-4">
                <p className={`text-sm mb-2 ${
                  analysisResults.shopRisk.riskLevel === 'LOW' ? 'text-green-700' :
                  analysisResults.shopRisk.riskLevel === 'MEDIUM' ? 'text-yellow-700' :
                  'text-red-700'
                }`}>
                  <strong>권장사항:</strong>
                </p>
                <ul className={`list-disc list-inside text-xs ${
                  analysisResults.shopRisk.riskLevel === 'LOW' ? 'text-green-600' :
                  analysisResults.shopRisk.riskLevel === 'MEDIUM' ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                  {analysisResults.shopRisk.recommendations.slice(0, 3).map((recommendation: string, index: number) => (
                    <li key={index}>{recommendation}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* 가짜 리뷰 분석 결과 */}
          {analysisResults.fakeReviews.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="font-medium text-red-800 mb-2">
                🔍 가짜 리뷰 탐지 결과
              </h4>
              <p className="text-red-700 text-sm mb-2">
                {analysisResults.fakeReviews.length}개의 의심스러운 리뷰가 발견되었습니다.
              </p>
              <div className="space-y-2">
                {analysisResults.fakeReviews.slice(0, 3).map((result, index) => (
                  <div key={index} className="bg-white p-3 rounded border text-sm">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-medium text-red-600">
                        의심도: {Math.round(result.fakeScore * 100)}%
                      </span>
                      <span className="text-gray-500">
                        평점: {result.review.rating}점
                      </span>
                    </div>
                    <p className="text-gray-700 mb-2">{result.review.content}</p>
                    <div className="text-xs text-red-600">
                      <strong>발견된 패턴:</strong>
                      <ul className="list-disc list-inside mt-1">
                        {result.reasons.slice(0, 2).map((reason: string, reasonIndex: number) => (
                          <li key={reasonIndex}>{reason}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 안전한 쇼핑몰의 경우 */}
          {analysisResults.fakeReviews.length === 0 && analysisResults.shopRisk?.riskLevel === 'LOW' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-medium text-green-800 mb-2">
                ✅ 리뷰 신뢰도 분석 결과
              </h4>
              <p className="text-green-700 text-sm">
                이 쇼핑몰의 리뷰들은 정상적인 패턴을 보이고 있습니다. 
                가짜 리뷰로 의심되는 패턴이 발견되지 않았습니다.
              </p>
            </div>
          )}
        </div>
      )}

      <div className="mt-4 p-3 bg-blue-100 rounded-lg">
        <p className="text-blue-800 text-sm">
          💡 <strong>학습 포인트:</strong> 이 목업 쇼핑몰은 실제 사기 쇼핑몰의 패턴을 모방하여 
          AI가 어떻게 가짜 리뷰와 주의 요소를 탐지하는지 학습할 수 있도록 설계되었습니다.
        </p>
      </div>

      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-yellow-800 text-sm">
          <strong>⚠️ 안내사항:</strong> 본 분석 결과는 참고용이며, 법적 효력은 없습니다. 최종 판단은 사용자 본인의 몫이며, 실제 거래 시 신중한 검토가 필요합니다.
        </p>
      </div>
    </div>
  );
};

