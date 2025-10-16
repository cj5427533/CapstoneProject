import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { FakeReviewDetector, FakeReviewResult, ShopType } from '../services/fakeReviewDetector';
import { Review } from '../utils/openRouter';

interface FakeReviewAnalysisProps {
  reviews: Review[];
  shopType: ShopType;
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

export const FakeReviewAnalysis: React.FC<FakeReviewAnalysisProps> = ({
  reviews,
  shopType,
  shopUrl
}) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [fakeReviews, setFakeReviews] = useState<FakeReviewResult[]>([]);
  const [statistics, setStatistics] = useState<AnalysisStatistics | null>(null);
  const [showDetails, setShowDetails] = useState(false);

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

      {statistics && (
        <div className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-700 mb-2">의심스러운 리뷰</h4>
              <p className="text-2xl font-bold text-red-600">{statistics.fakeCount}개</p>
              <p className="text-sm text-gray-600">
                전체 {reviews.length}개 중 {statistics.fakePercentage}%
              </p>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-700 mb-2">위험도</h4>
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getRiskLevelColor(statistics.riskLevel)}`}>
                {getRiskLevelText(statistics.riskLevel)}
              </span>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-700 mb-2">패턴 분석</h4>
              <div className="space-y-1 text-sm">
                <div>텍스트: {Math.round(statistics.patternStats.textPattern * 100)}%</div>
                <div>시간적: {Math.round(statistics.patternStats.temporalPattern * 100)}%</div>
                <div>행동: {Math.round(statistics.patternStats.behaviorPattern * 100)}%</div>
              </div>
            </div>
          </div>

          {fakeReviews.length > 0 && (
            <div>
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                {showDetails ? '상세 정보 숨기기' : '상세 정보 보기'} ({fakeReviews.length}개)
              </button>
              
              {showDetails && (
                <div className="mt-4 space-y-4">
                  {fakeReviews.map((result, index) => (
                    <div key={index} className="border border-red-200 bg-red-50 p-4 rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-red-800">
                            의심도: {Math.round(result.fakeScore * 100)}%
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
                        <h5 className="font-medium text-red-800">발견된 패턴:</h5>
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
        </div>
      )}

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
    </div>
  );
};
