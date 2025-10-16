// 고급 가짜 리뷰 탐지 서비스 - 구체적 기준 기반
export interface Review {
  id: string;
  content: string;
  rating: number;
  createdAt: string;
  author?: string;
}

export interface FakeReviewResult {
  review: Review;
  fakeScore: number; // 0-100점
  confidence: number; // 0-100점 (신뢰도)
  reasons: string[];
  patterns: {
    textPattern: number;
    temporalPattern: number;
    behaviorPattern: number;
  };
}

export interface AnalysisStatistics {
  fakeCount: number;
  fakePercentage: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  totalReviews: number;
  patternStats: {
    textPattern: number;
    temporalPattern: number;
    behaviorPattern: number;
  };
}

// 우리만의 구체적인 기준 정의
export const FAKE_REVIEW_CRITERIA = {
  // 텍스트 패턴 기준
  textPatterns: {
    // 과도한 긍정 표현 (정확한 키워드)
    excessivePositive: {
      keywords: ['정말정말', '최고최고', '완벽완벽', '대박대박', '최고최고최고', '완벽완벽완벽'],
      threshold: 2, // 2개 이상 사용 시
      penalty: 70 // 70점 감점
    },
    
    // 반복되는 문구 패턴 (정확한 패턴)
    repetitivePhrases: {
      patterns: [
        '상품이 좋습니다. 추천합니다.',
        '상품이 훌륭합니다. 추천드립니다.',
        '상품이 만족스럽습니다. 추천해요.',
        '상품이 예상보다 좋았습니다.',
        '상품이 생각보다 좋았습니다.',
        '상품이 기대보다 좋았습니다.'
      ],
      threshold: 1, // 1개 이상 발견 시
      penalty: 80 // 80점 감점
    },
    
    // 비현실적 표현 (정확한 표현)
    unrealisticClaims: {
      patterns: [
        '1시간 배송', '30분 배송', '즉시 배송',
        '무료배송', '100% 만족', '세상최고',
        '완전무료', '무조건환불', '100%환불'
      ],
      threshold: 1, // 1개 이상 사용 시
      penalty: 60 // 60점 감점
    },
    
    // 문체 부자연스러움 (정확한 패턴)
    unnaturalStyle: {
      patterns: [
        /[!]{3,}/g, // !!! 3개 이상
        /[.]{3,}/g, // ... 3개 이상
        /[?]{2,}/g, // ?? 2개 이상
        /[가-힣]{2,}[가-힣]{2,}[가-힣]{2,}/g // 같은 글자 3번 이상 반복
      ],
      threshold: 1, // 1개 이상 발견 시
      penalty: 50 // 50점 감점
    }
  },
  
  // 시간적 패턴 기준
  temporalPatterns: {
    // 연속 리뷰 패턴
    consecutiveReviews: {
      threshold: 3, // 3개 이상
      timeWindow: 5 * 60 * 1000, // 5분 이내
      penalty: 80 // 80점 감점
    },
    
    // 시간대 집중 패턴
    timeConcentration: {
      threshold: 0.8, // 80% 이상이 특정 시간대
      timeWindow: 2 * 60 * 60 * 1000, // 2시간 내
      penalty: 60 // 60점 감점
    },
    
    // 비정상적인 리뷰 밀도
    reviewDensity: {
      threshold: 10, // 하루에 10개 이상
      timeWindow: 24 * 60 * 60 * 1000, // 24시간
      penalty: 70 // 70점 감점
    }
  },
  
  // 행동 패턴 기준
  behaviorPatterns: {
    // 평점 분포 비정상성
    ratingDistribution: {
      perfectScore: 0.9, // 90% 이상이 5점
      penalty: 80 // 80점 감점
    },
    
    // 리뷰 길이 패턴
    reviewLength: {
      uniformLength: 0.7, // 70% 이상이 비슷한 길이 (±10자)
      penalty: 50 // 50점 감점
    },
    
    // 사용자 행동 패턴
    userBehavior: {
      sameAuthor: 0.8, // 80% 이상이 같은 작성자
      penalty: 90 // 90점 감점
    }
  }
};

export class AdvancedFakeReviewDetector {
  private static instance: AdvancedFakeReviewDetector;
  
  public static getInstance(): AdvancedFakeReviewDetector {
    if (!AdvancedFakeReviewDetector.instance) {
      AdvancedFakeReviewDetector.instance = new AdvancedFakeReviewDetector();
    }
    return AdvancedFakeReviewDetector.instance;
  }

  /**
   * 텍스트 패턴 분석 (구체적 기준)
   */
  private analyzeTextPatterns(content: string): { score: number; reasons: string[] } {
    let score = 0;
    const reasons: string[] = [];
    
    // 1. 과도한 긍정 표현 검사
    const excessivePositive = FAKE_REVIEW_CRITERIA.textPatterns.excessivePositive;
    const foundExcessive = excessivePositive.keywords.filter(keyword => 
      content.includes(keyword)
    );
    if (foundExcessive.length >= excessivePositive.threshold) {
      score += excessivePositive.penalty;
      reasons.push(`과도한 긍정 표현 "${foundExcessive.join(', ')}" ${foundExcessive.length}개 사용`);
    }
    
    // 2. 반복되는 문구 패턴 검사
    const repetitivePhrases = FAKE_REVIEW_CRITERIA.textPatterns.repetitivePhrases;
    const foundRepetitive = repetitivePhrases.patterns.filter(pattern => 
      content.includes(pattern.substring(0, 10)) // 앞 10글자로 패턴 매칭
    );
    if (foundRepetitive.length >= repetitivePhrases.threshold) {
      score += repetitivePhrases.penalty;
      reasons.push('반복되는 문구 패턴 발견');
    }
    
    // 3. 비현실적 표현 검사
    const unrealisticClaims = FAKE_REVIEW_CRITERIA.textPatterns.unrealisticClaims;
    const foundUnrealistic = unrealisticClaims.patterns.filter(claim => 
      content.includes(claim)
    );
    if (foundUnrealistic.length >= unrealisticClaims.threshold) {
      score += unrealisticClaims.penalty;
      reasons.push(`비현실적 표현 "${foundUnrealistic.join(', ')}" 사용`);
    }
    
    // 4. 문체 부자연스러움 검사
    const unnaturalStyle = FAKE_REVIEW_CRITERIA.textPatterns.unnaturalStyle;
    const foundUnnatural = unnaturalStyle.patterns.filter(pattern => 
      pattern.test(content)
    );
    if (foundUnnatural.length >= unnaturalStyle.threshold) {
      score += unnaturalStyle.penalty;
      reasons.push('부자연스러운 문체 패턴 발견');
    }
    
    return { 
      score: Math.min(score, 100), 
      reasons 
    };
  }

  /**
   * 시간적 패턴 분석 (구체적 기준)
   */
  private analyzeTemporalPatterns(reviews: Review[]): { score: number; reasons: string[] } {
    if (reviews.length < 3) return { score: 0, reasons: [] };
    
    let score = 0;
    const reasons: string[] = [];
    
    // 1. 연속 리뷰 패턴 검사
    const consecutiveReviews = this.findConsecutiveReviews(reviews, FAKE_REVIEW_CRITERIA.temporalPatterns.consecutiveReviews.timeWindow);
    if (consecutiveReviews.length >= FAKE_REVIEW_CRITERIA.temporalPatterns.consecutiveReviews.threshold) {
      score += FAKE_REVIEW_CRITERIA.temporalPatterns.consecutiveReviews.penalty;
      reasons.push(`${consecutiveReviews.length}개 리뷰가 5분 내 연속 작성됨`);
    }
    
    // 2. 시간대 집중 패턴 검사
    const timeDistribution = this.analyzeTimeDistribution(reviews);
    if (timeDistribution.concentration >= FAKE_REVIEW_CRITERIA.temporalPatterns.timeConcentration.threshold) {
      score += FAKE_REVIEW_CRITERIA.temporalPatterns.timeConcentration.penalty;
      reasons.push(`${Math.round(timeDistribution.concentration * 100)}%의 리뷰가 특정 시간대에 집중됨`);
    }
    
    // 3. 비정상적인 리뷰 밀도 검사
    const reviewDensity = this.calculateReviewDensity(reviews);
    if (reviewDensity >= FAKE_REVIEW_CRITERIA.temporalPatterns.reviewDensity.threshold) {
      score += FAKE_REVIEW_CRITERIA.temporalPatterns.reviewDensity.penalty;
      reasons.push(`하루에 ${reviewDensity}개의 리뷰로 비정상적 밀도`);
    }
    
    return { 
      score: Math.min(score, 100), 
      reasons 
    };
  }

  /**
   * 행동 패턴 분석 (구체적 기준)
   */
  private analyzeBehaviorPatterns(reviews: Review[]): { score: number; reasons: string[] } {
    if (reviews.length < 3) return { score: 0, reasons: [] };
    
    let score = 0;
    const reasons: string[] = [];
    
    // 1. 평점 분포 비정상성 검사
    const ratingDistribution = this.analyzeRatingDistribution(reviews);
    if (ratingDistribution.perfectScore >= FAKE_REVIEW_CRITERIA.behaviorPatterns.ratingDistribution.perfectScore) {
      score += FAKE_REVIEW_CRITERIA.behaviorPatterns.ratingDistribution.penalty;
      reasons.push(`${Math.round(ratingDistribution.perfectScore * 100)}%의 리뷰가 5점으로 비정상적`);
    }
    
    // 2. 리뷰 길이 패턴 검사
    const lengthPattern = this.analyzeLengthPattern(reviews);
    if (lengthPattern.uniformLength >= FAKE_REVIEW_CRITERIA.behaviorPatterns.reviewLength.uniformLength) {
      score += FAKE_REVIEW_CRITERIA.behaviorPatterns.reviewLength.penalty;
      reasons.push(`${Math.round(lengthPattern.uniformLength * 100)}%의 리뷰가 비슷한 길이`);
    }
    
    // 3. 사용자 행동 패턴 검사
    const userBehavior = this.analyzeUserBehavior(reviews);
    if (userBehavior.sameAuthor >= FAKE_REVIEW_CRITERIA.behaviorPatterns.userBehavior.sameAuthor) {
      score += FAKE_REVIEW_CRITERIA.behaviorPatterns.userBehavior.penalty;
      reasons.push(`${Math.round(userBehavior.sameAuthor * 100)}%의 리뷰가 같은 작성자`);
    }
    
    return { 
      score: Math.min(score, 100), 
      reasons 
    };
  }

  /**
   * 연속 리뷰 찾기
   */
  private findConsecutiveReviews(reviews: Review[], timeWindow: number): Review[] {
    const sortedReviews = [...reviews].sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    
    const consecutiveGroups: Review[][] = [];
    let currentGroup: Review[] = [sortedReviews[0]];
    
    for (let i = 1; i < sortedReviews.length; i++) {
      const timeDiff = new Date(sortedReviews[i].createdAt).getTime() - 
                      new Date(sortedReviews[i - 1].createdAt).getTime();
      
      if (timeDiff <= timeWindow) {
        currentGroup.push(sortedReviews[i]);
      } else {
        if (currentGroup.length >= 3) {
          consecutiveGroups.push([...currentGroup]);
        }
        currentGroup = [sortedReviews[i]];
      }
    }
    
    if (currentGroup.length >= 3) {
      consecutiveGroups.push(currentGroup);
    }
    
    return consecutiveGroups.flat();
  }

  /**
   * 시간 분포 분석
   */
  private analyzeTimeDistribution(reviews: Review[]): { concentration: number } {
    const hourCounts = new Array(24).fill(0);
    
    reviews.forEach(review => {
      const hour = new Date(review.createdAt).getHours();
      hourCounts[hour]++;
    });
    
    const maxCount = Math.max(...hourCounts);
    const totalCount = reviews.length;
    const concentration = maxCount / totalCount;
    
    return { concentration };
  }

  /**
   * 리뷰 밀도 계산
   */
  private calculateReviewDensity(reviews: Review[]): number {
    if (reviews.length === 0) return 0;
    
    const sortedReviews = [...reviews].sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    
    const firstReview = new Date(sortedReviews[0].createdAt);
    const lastReview = new Date(sortedReviews[sortedReviews.length - 1].createdAt);
    const timeDiff = lastReview.getTime() - firstReview.getTime();
    const daysDiff = timeDiff / (24 * 60 * 60 * 1000);
    
    return daysDiff > 0 ? reviews.length / daysDiff : reviews.length;
  }

  /**
   * 평점 분포 분석
   */
  private analyzeRatingDistribution(reviews: Review[]): { perfectScore: number } {
    const perfectCount = reviews.filter(review => review.rating === 5).length;
    const perfectScore = perfectCount / reviews.length;
    
    return { perfectScore };
  }

  /**
   * 리뷰 길이 패턴 분석
   */
  private analyzeLengthPattern(reviews: Review[]): { uniformLength: number } {
    if (reviews.length < 3) return { uniformLength: 0 };
    
    const lengths = reviews.map(review => review.content.length);
    const avgLength = lengths.reduce((sum, len) => sum + len, 0) / lengths.length;
    
    const similarLengthCount = lengths.filter(len => 
      Math.abs(len - avgLength) <= 10
    ).length;
    
    const uniformLength = similarLengthCount / lengths.length;
    
    return { uniformLength };
  }

  /**
   * 사용자 행동 패턴 분석
   */
  private analyzeUserBehavior(reviews: Review[]): { sameAuthor: number } {
    if (reviews.length < 3) return { sameAuthor: 0 };
    
    const authorCounts = new Map<string, number>();
    reviews.forEach(review => {
      const author = review.author || 'anonymous';
      authorCounts.set(author, (authorCounts.get(author) || 0) + 1);
    });
    
    const maxCount = Math.max(...authorCounts.values());
    const sameAuthor = maxCount / reviews.length;
    
    return { sameAuthor };
  }

  /**
   * 신뢰도 계산
   */
  private calculateConfidence(fakeScore: number, totalReasons: number): number {
    // 점수가 높을수록, 이유가 많을수록 신뢰도 높음
    const scoreConfidence = Math.min(fakeScore, 100);
    const reasonConfidence = Math.min(totalReasons * 20, 100);
    
    return Math.round((scoreConfidence + reasonConfidence) / 2);
  }

  /**
   * 메인 가짜 리뷰 탐지 함수
   */
  async detectFakeReviews(reviews: Review[]): Promise<FakeReviewResult[]> {
    if (reviews.length === 0) return [];

    const results: FakeReviewResult[] = [];

    for (const review of reviews) {
      // 1. 텍스트 패턴 분석
      const textAnalysis = this.analyzeTextPatterns(review.content);
      
      // 2. 시간적 패턴 분석 (전체 리뷰 컨텍스트 필요)
      const temporalAnalysis = this.analyzeTemporalPatterns(reviews);
      
      // 3. 행동 패턴 분석 (전체 리뷰 컨텍스트 필요)
      const behaviorAnalysis = this.analyzeBehaviorPatterns(reviews);
      
      // 4. 종합 점수 계산 (가중치 적용)
      const weights = { textPattern: 0.5, temporalPattern: 0.3, behaviorPattern: 0.2 };
      const fakeScore = Math.round(
        textAnalysis.score * weights.textPattern +
        temporalAnalysis.score * weights.temporalPattern +
        behaviorAnalysis.score * weights.behaviorPattern
      );
      
      // 5. 70점 이상인 경우만 의심스러운 리뷰로 분류
      if (fakeScore >= 70) {
        const allReasons = [...textAnalysis.reasons, ...temporalAnalysis.reasons, ...behaviorAnalysis.reasons];
        const confidence = this.calculateConfidence(fakeScore, allReasons.length);
        
        results.push({
          review,
          fakeScore,
          confidence,
          reasons: allReasons,
          patterns: {
            textPattern: textAnalysis.score,
            temporalPattern: temporalAnalysis.score,
            behaviorPattern: behaviorAnalysis.score
          }
        });
      }
    }

    return results;
  }

  /**
   * 통계 생성
   */
  generateStatistics(fakeReviews: FakeReviewResult[], totalReviews: number): AnalysisStatistics {
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
      riskLevel: this.getRiskLevel(fakePercentage),
      totalReviews,
      patternStats
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
