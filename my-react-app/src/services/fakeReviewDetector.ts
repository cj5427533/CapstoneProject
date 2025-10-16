import { openRouterAPI, Review, FakeReviewAnalysis } from '../utils/openRouter';

export interface FakeReviewResult {
  review: Review;
  fakeScore: number;
  reasons: string[];
  patterns: {
    textPattern: number;
    temporalPattern: number;
    behaviorPattern: number;
  };
}

export interface ShopType {
  type: 'real' | 'mock';
  name?: string;
}

export class FakeReviewDetector {
  private static instance: FakeReviewDetector;
  
  public static getInstance(): FakeReviewDetector {
    if (!FakeReviewDetector.instance) {
      FakeReviewDetector.instance = new FakeReviewDetector();
    }
    return FakeReviewDetector.instance;
  }

  /**
   * 가짜 리뷰 탐지 메인 함수
   */
  async detectFakeReviews(reviews: Review[], shopType: ShopType): Promise<FakeReviewResult[]> {
    if (reviews.length === 0) return [];

    const results: FakeReviewResult[] = [];
    const batchSize = 5; // API 호출 제한을 위해 배치 처리

    // 리뷰를 배치로 나누어 처리
    for (let i = 0; i < reviews.length; i += batchSize) {
      const batch = reviews.slice(i, i + batchSize);
      const batchResults = await this.processBatch(batch, reviews, shopType);
      results.push(...batchResults);
      
      // API 호출 간격 조절
      if (i + batchSize < reviews.length) {
        await this.delay(1000);
      }
    }

    return results.filter(result => result.fakeScore > 0.7);
  }

  /**
   * 배치 단위로 리뷰 처리
   */
  private async processBatch(
    batch: Review[], 
    allReviews: Review[], 
    shopType: ShopType
  ): Promise<FakeReviewResult[]> {
    const results: FakeReviewResult[] = [];

    for (const review of batch) {
      try {
        const analysis = await this.analyzeReview(review, allReviews, shopType);
        
        if (analysis.fakeScore > 0.7) {
          results.push({
            review,
            fakeScore: analysis.fakeScore,
            reasons: analysis.reasons,
            patterns: analysis.patterns
          });
        }
      } catch (error) {
        console.error(`Error analyzing review ${review.id}:`, error);
      }
    }

    return results;
  }

  /**
   * 개별 리뷰 분석
   */
  private async analyzeReview(
    review: Review, 
    allReviews: Review[], 
    shopType: ShopType
  ): Promise<FakeReviewAnalysis> {
    // 1. 텍스트 패턴 분석
    const textPattern = await openRouterAPI.analyzeTextPatterns(review.content);
    
    // 2. 시간적 패턴 분석 (전체 리뷰 컨텍스트 필요)
    const temporalPattern = await openRouterAPI.analyzeTemporalPatterns(allReviews);
    
    // 3. 행동 패턴 분석 (전체 리뷰 컨텍스트 필요)
    const behaviorPattern = await openRouterAPI.analyzeBehaviorPatterns(allReviews);
    
    // 4. 종합 점수 계산
    const fakeScore = this.calculateFakeScore({
      textPattern,
      temporalPattern,
      behaviorPattern
    }, shopType);
    
    // 5. 이유 생성
    const reasons = await openRouterAPI.generateFakeReasons({
      fakeScore,
      reasons: [],
      patterns: {
        textPattern,
        temporalPattern,
        behaviorPattern
      }
    });

    return {
      fakeScore,
      reasons,
      patterns: {
        textPattern,
        temporalPattern,
        behaviorPattern
      }
    };
  }

  /**
   * 종합 가짜 점수 계산
   */
  private calculateFakeScore(
    patterns: { textPattern: number; temporalPattern: number; behaviorPattern: number },
    shopType: ShopType
  ): number {
    const weights = {
      textPattern: 0.4,
      temporalPattern: 0.3,
      behaviorPattern: 0.3
    };

    const baseScore = 
      patterns.textPattern * weights.textPattern +
      patterns.temporalPattern * weights.temporalPattern +
      patterns.behaviorPattern * weights.behaviorPattern;

    // 목업 쇼핑몰은 더 엄격하게 평가
    const multiplier = shopType.type === 'mock' ? 1.2 : 1.0;
    
    return Math.min(baseScore * multiplier, 1.0);
  }

  /**
   * 지연 함수 (API 호출 제한)
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 가짜 리뷰 통계 생성
   */
  generateStatistics(fakeReviews: FakeReviewResult[], totalReviews: number) {
    const fakeCount = fakeReviews.length;
    const fakePercentage = totalReviews > 0 ? (fakeCount / totalReviews) * 100 : 0;
    
    const patternStats = {
      textPattern: fakeReviews.reduce((sum, r) => sum + r.patterns.textPattern, 0) / fakeCount || 0,
      temporalPattern: fakeReviews.reduce((sum, r) => sum + r.patterns.temporalPattern, 0) / fakeCount || 0,
      behaviorPattern: fakeReviews.reduce((sum, r) => sum + r.patterns.behaviorPattern, 0) / fakeCount || 0
    };

    return {
      fakeCount,
      fakePercentage: Math.round(fakePercentage * 10) / 10,
      patternStats,
      riskLevel: this.getRiskLevel(fakePercentage)
    };
  }

  /**
   * 위험도 레벨 결정
   */
  private getRiskLevel(fakePercentage: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (fakePercentage < 10) return 'LOW';
    if (fakePercentage < 25) return 'MEDIUM';
    if (fakePercentage < 50) return 'HIGH';
    return 'CRITICAL';
  }
}
