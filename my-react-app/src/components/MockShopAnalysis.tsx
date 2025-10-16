import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { detectFakeReviews, analyzeShopRisk } from '../utils/api';

interface MockShopAnalysisProps {
  shopUrl: string;
  mockReviews: Array<{
    id: string;
    content: string;
    rating: number;
    createdAt: string;
  }>;
}

export const MockShopAnalysis: React.FC<MockShopAnalysisProps> = ({
  shopUrl,
  mockReviews
}) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<{
    fakeReviews: any[];
    shopRisk: any;
  } | null>(null);

  const runMockAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      // 목업 쇼핑몰로 설정하여 분석
      const [fakeReviewResult, shopRiskResult] = await Promise.all([
        detectFakeReviews(shopUrl, 'mock'),
        analyzeShopRisk(shopUrl, 'mock')
      ]);

      setAnalysisResults({
        fakeReviews: fakeReviewResult.fakeReviews,
        shopRisk: shopRiskResult.analysis
      });

      toast.success('목업 쇼핑몰 AI 분석이 완료되었습니다!');
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
          🎓 교육용 목업 쇼핑몰 AI 분석
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

      <div className="mb-4 p-3 bg-blue-100 border border-blue-300 rounded-lg">
        <p className="text-blue-900 text-sm">
          📚 이 섹션은 교육용 목업 쇼핑몰의 AI 분석 기능을 시연합니다.
          실제 사기 쇼핑몰과 유사한 패턴을 학습할 수 있습니다.
        </p>
      </div>

      {/* 목업 리뷰 미리보기 */}
      <div className="mb-4">
        <h4 className="font-medium text-blue-800 mb-2">목업 리뷰 샘플:</h4>
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {mockReviews.slice(0, 5).map((review, index) => (
            <div key={index} className="bg-white p-3 rounded border text-sm">
              <div className="flex justify-between items-start mb-1">
                <span className="font-medium">평점: {review.rating}점</span>
                <span className="text-gray-500 text-xs">
                  {new Date(review.createdAt).toLocaleDateString()}
                </span>
              </div>
              <p className="text-gray-700">{review.content}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 분석 결과 */}
      {analysisResults && (
        <div className="space-y-4">
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
                        {result.reasons.slice(0, 2).map((reason, reasonIndex) => (
                          <li key={reasonIndex}>{reason}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 쇼핑몰 위험도 분석 결과 */}
          {analysisResults.shopRisk && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <h4 className="font-medium text-orange-800 mb-2">
                ⚠️ 쇼핑몰 위험도 분석 결과
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-orange-700 mb-2">
                    <strong>위험도 점수:</strong> {analysisResults.shopRisk.riskScore}/100
                  </p>
                  <p className="text-sm text-orange-700 mb-2">
                    <strong>위험 등급:</strong> {analysisResults.shopRisk.riskLevel}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-orange-700 mb-2">
                    <strong>주요 우려사항:</strong>
                  </p>
                  <ul className="list-disc list-inside text-xs text-orange-600">
                    {analysisResults.shopRisk.concerns.slice(0, 2).map((concern, index) => (
                      <li key={index}>{concern}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mt-4 p-3 bg-blue-100 rounded-lg">
        <p className="text-blue-800 text-sm">
          💡 <strong>학습 포인트:</strong> 이 목업 쇼핑몰은 실제 사기 쇼핑몰의 패턴을 모방하여 
          AI가 어떻게 가짜 리뷰와 위험 요소를 탐지하는지 학습할 수 있도록 설계되었습니다.
        </p>
      </div>
    </div>
  );
};
