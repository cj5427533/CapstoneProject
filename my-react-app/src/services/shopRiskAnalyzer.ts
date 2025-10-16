// 쇼핑몰 위험도 분석 서비스 - 구체적 기준 기반
export interface Shop {
  id: number;
  url: string;
  name?: string;
  parent_shop_id?: number;
  created_at: string;
}

export interface Report {
  id: number;
  shop_id: number;
  categories: string;
  description: string;
  reporter_name?: string;
  reporter_phone?: string;
  created_at: string;
}

export interface Rating {
  id: number;
  shop_id: number;
  rating: number;
  created_at: string;
}

export interface ShopRiskResult {
  riskScore: number; // 0-100점
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  reasons: string[];
  recommendations: string[];
  analysis: {
    reportAnalysis: number;
    ratingAnalysis: number;
    domainAnalysis: number;
    businessAnalysis: number;
  };
  disclaimer: string;
}

// 우리만의 구체적인 쇼핑몰 위험도 기준
export const SHOP_RISK_CRITERIA = {
  // 신고 분석 기준
  reportAnalysis: {
    // 중요 신고 카테고리
    criticalCategories: {
      categories: ['사기', '가짜리뷰', '배송지연', '환불거부', '개인정보유출'],
      threshold: 2, // 2건 이상
      penalty: 70 // 70점 감점
    },
    
    // 신고 증가율
    reportIncrease: {
      threshold: 0.5, // 50% 이상 증가
      timeWindow: 7, // 7일 내
      penalty: 60 // 60점 감점
    },
    
    // 신고 밀도
    reportDensity: {
      threshold: 5, // 하루에 5건 이상
      timeWindow: 1, // 1일
      penalty: 80 // 80점 감점
    }
  },
  
  // 평점 분석 기준
  ratingAnalysis: {
    // 완벽한 평점 분포
    perfectRating: {
      threshold: 0.9, // 90% 이상이 5점
      penalty: 80 // 80점 감점
    },
    
    // 평점 급변
    ratingFluctuation: {
      threshold: 2.0, // 2점 이상 급변
      timeWindow: 1, // 1일 내
      penalty: 70 // 70점 감점
    },
    
    // 리뷰 밀도
    reviewDensity: {
      threshold: 20, // 하루에 20개 이상
      timeWindow: 1, // 1일
      penalty: 60 // 60점 감점
    }
  },
  
  // 도메인 분석 기준
  domainAnalysis: {
    // 신규 도메인
    newDomain: {
      age: 30, // 30일 이내
      penalty: 60 // 60점 감점
    },
    
    // 의심스러운 도메인 패턴
    suspiciousPattern: {
      patterns: ['secure-', 'login-', 'account-', 'payment-'],
      penalty: 70 // 70점 감점
    },
    
    // 도메인 연령과 신고 비율
    ageReportRatio: {
      threshold: 0.1, // 도메인 연령 대비 신고 비율 10% 이상
      penalty: 80 // 80점 감점
    }
  },
  
  // 사업자 정보 분석 기준
  businessAnalysis: {
    // 사업자 정보 부족
    missingInfo: {
      required: ['사업자등록번호', '대표자명', '사업장주소', '전화번호'],
      missing: 2, // 2개 이상 부족
      penalty: 70 // 70점 감점
    },
    
    // 연락처 정보 부족
    contactInfo: {
      required: ['전화번호', '이메일', '주소'],
      missing: 1, // 1개 이상 부족
      penalty: 50 // 50점 감점
    }
  }
};

export class ShopRiskAnalyzer {
  private static instance: ShopRiskAnalyzer;
  
  public static getInstance(): ShopRiskAnalyzer {
    if (!ShopRiskAnalyzer.instance) {
      ShopRiskAnalyzer.instance = new ShopRiskAnalyzer();
    }
    return ShopRiskAnalyzer.instance;
  }

  /**
   * 신고 분석 (구체적 기준)
   */
  private analyzeReports(reports: Report[]): { score: number; reasons: string[] } {
    let score = 0;
    const reasons: string[] = [];
    
    if (reports.length === 0) {
      return { score: 0, reasons: ['신고가 없어 안전합니다'] };
    }
    
    // 1. 중요 신고 카테고리 검사
    const criticalCategories = SHOP_RISK_CRITERIA.reportAnalysis.criticalCategories;
    const criticalReports = reports.filter(report => {
      const categories = JSON.parse(report.categories);
      return categories.some((category: string) => 
        criticalCategories.categories.includes(category)
      );
    });
    
    if (criticalReports.length >= criticalCategories.threshold) {
      score += criticalCategories.penalty;
      reasons.push(`중요 신고 카테고리 ${criticalReports.length}건 발견`);
    }
    
    // 2. 신고 증가율 검사
    const reportIncrease = this.calculateReportIncrease(reports);
    if (reportIncrease >= SHOP_RISK_CRITERIA.reportAnalysis.reportIncrease.threshold) {
      score += SHOP_RISK_CRITERIA.reportAnalysis.reportIncrease.penalty;
      reasons.push(`신고가 ${Math.round(reportIncrease * 100)}% 증가`);
    }
    
    // 3. 신고 밀도 검사
    const reportDensity = this.calculateReportDensity(reports);
    if (reportDensity >= SHOP_RISK_CRITERIA.reportAnalysis.reportDensity.threshold) {
      score += SHOP_RISK_CRITERIA.reportAnalysis.reportDensity.penalty;
      reasons.push(`하루에 ${reportDensity}건의 신고로 비정상적 밀도`);
    }
    
    return { 
      score: Math.min(score, 100), 
      reasons 
    };
  }

  /**
   * 평점 분석 (구체적 기준)
   */
  private analyzeRatings(ratings: Rating[]): { score: number; reasons: string[] } {
    let score = 0;
    const reasons: string[] = [];
    
    if (ratings.length === 0) {
      return { score: 0, reasons: ['평점이 없어 분석할 수 없습니다'] };
    }
    
    // 1. 완벽한 평점 분포 검사
    const perfectRating = SHOP_RISK_CRITERIA.ratingAnalysis.perfectRating;
    const perfectCount = ratings.filter(rating => rating.rating === 5).length;
    const perfectPercentage = perfectCount / ratings.length;
    
    if (perfectPercentage >= perfectRating.threshold) {
      score += perfectRating.penalty;
      reasons.push(`${Math.round(perfectPercentage * 100)}%의 리뷰가 5점으로 비정상적`);
    }
    
    // 2. 평점 급변 검사
    const ratingFluctuation = this.calculateRatingFluctuation(ratings);
    if (ratingFluctuation >= SHOP_RISK_CRITERIA.ratingAnalysis.ratingFluctuation.threshold) {
      score += SHOP_RISK_CRITERIA.ratingAnalysis.ratingFluctuation.penalty;
      reasons.push(`평점이 ${ratingFluctuation.toFixed(1)}점 급변`);
    }
    
    // 3. 리뷰 밀도 검사
    const reviewDensity = this.calculateReviewDensity(ratings);
    if (reviewDensity >= SHOP_RISK_CRITERIA.ratingAnalysis.reviewDensity.threshold) {
      score += SHOP_RISK_CRITERIA.ratingAnalysis.reviewDensity.penalty;
      reasons.push(`하루에 ${reviewDensity}개의 리뷰로 비정상적 밀도`);
    }
    
    return { 
      score: Math.min(score, 100), 
      reasons 
    };
  }

  /**
   * 도메인 분석 (구체적 기준)
   */
  private analyzeDomain(shop: Shop): { score: number; reasons: string[] } {
    let score = 0;
    const reasons: string[] = [];
    
    try {
      const domain = this.extractDomain(shop.url);
      
      // 1. 신규 도메인 검사
      const domainAge = this.calculateDomainAge(shop.created_at);
      if (domainAge <= SHOP_RISK_CRITERIA.domainAnalysis.newDomain.age) {
        score += SHOP_RISK_CRITERIA.domainAnalysis.newDomain.penalty;
        reasons.push(`도메인 연령이 ${domainAge}일로 신규`);
      }
      
      // 2. 의심스러운 도메인 패턴 검사
      const suspiciousPattern = SHOP_RISK_CRITERIA.domainAnalysis.suspiciousPattern;
      const foundPattern = suspiciousPattern.patterns.filter(pattern => 
        domain.includes(pattern)
      );
      if (foundPattern.length > 0) {
        score += suspiciousPattern.penalty;
        reasons.push(`의심스러운 도메인 패턴 "${foundPattern.join(', ')}" 사용`);
      }
      
    } catch (error) {
      console.error('도메인 분석 오류:', error);
    }
    
    return { 
      score: Math.min(score, 100), 
      reasons 
    };
  }

  /**
   * 사업자 정보 분석 (구체적 기준)
   */
  private analyzeBusinessInfo(shop: Shop): { score: number; reasons: string[] } {
    let score = 0;
    const reasons: string[] = [];
    
    // 실제 구현에서는 사업자 정보를 별도로 저장해야 하지만,
    // 여기서는 시뮬레이션으로 구현
    const businessInfo = this.getBusinessInfo(shop.url);
    
    // 1. 사업자 정보 부족 검사
    const missingInfo = SHOP_RISK_CRITERIA.businessAnalysis.missingInfo;
    const missingBusinessInfo = missingInfo.required.filter(info => 
      !businessInfo.includes(info)
    );
    if (missingBusinessInfo.length >= missingInfo.missing) {
      score += missingInfo.penalty;
      reasons.push(`사업자 정보 부족: ${missingBusinessInfo.join(', ')}`);
    }
    
    // 2. 연락처 정보 부족 검사
    const contactInfo = SHOP_RISK_CRITERIA.businessAnalysis.contactInfo;
    const missingContactInfo = contactInfo.required.filter(info => 
      !businessInfo.includes(info)
    );
    if (missingContactInfo.length >= contactInfo.missing) {
      score += contactInfo.penalty;
      reasons.push(`연락처 정보 부족: ${missingContactInfo.join(', ')}`);
    }
    
    return { 
      score: Math.min(score, 100), 
      reasons 
    };
  }

  /**
   * 신고 증가율 계산
   */
  private calculateReportIncrease(reports: Report[]): number {
    if (reports.length < 2) return 0;
    
    const sortedReports = [...reports].sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const recentReports = sortedReports.filter(report => 
      new Date(report.created_at) >= weekAgo
    );
    const olderReports = sortedReports.filter(report => 
      new Date(report.created_at) < weekAgo
    );
    
    if (olderReports.length === 0) return 0;
    
    return (recentReports.length - olderReports.length) / olderReports.length;
  }

  /**
   * 신고 밀도 계산
   */
  private calculateReportDensity(reports: Report[]): number {
    if (reports.length === 0) return 0;
    
    const sortedReports = [...reports].sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    
    const firstReport = new Date(sortedReports[0].created_at);
    const lastReport = new Date(sortedReports[sortedReports.length - 1].created_at);
    const timeDiff = lastReport.getTime() - firstReport.getTime();
    const daysDiff = timeDiff / (24 * 60 * 60 * 1000);
    
    return daysDiff > 0 ? reports.length / daysDiff : reports.length;
  }

  /**
   * 평점 급변 계산
   */
  private calculateRatingFluctuation(ratings: Rating[]): number {
    if (ratings.length < 2) return 0;
    
    const sortedRatings = [...ratings].sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const recentRatings = sortedRatings.filter(rating => 
      new Date(rating.created_at) >= dayAgo
    );
    const olderRatings = sortedRatings.filter(rating => 
      new Date(rating.created_at) < dayAgo
    );
    
    if (recentRatings.length === 0 || olderRatings.length === 0) return 0;
    
    const recentAverage = recentRatings.reduce((sum, r) => sum + r.rating, 0) / recentRatings.length;
    const olderAverage = olderRatings.reduce((sum, r) => sum + r.rating, 0) / olderRatings.length;
    
    return Math.abs(recentAverage - olderAverage);
  }

  /**
   * 리뷰 밀도 계산
   */
  private calculateReviewDensity(ratings: Rating[]): number {
    if (ratings.length === 0) return 0;
    
    const sortedRatings = [...ratings].sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    
    const firstRating = new Date(sortedRatings[0].created_at);
    const lastRating = new Date(sortedRatings[sortedRatings.length - 1].created_at);
    const timeDiff = lastRating.getTime() - firstRating.getTime();
    const daysDiff = timeDiff / (24 * 60 * 60 * 1000);
    
    return daysDiff > 0 ? ratings.length / daysDiff : ratings.length;
  }

  /**
   * 도메인 추출
   */
  private extractDomain(url: string): string {
    try {
      const urlObj = new URL(url.startsWith('http') ? url : 'https://' + url);
      return urlObj.hostname.toLowerCase();
    } catch {
      return url.toLowerCase();
    }
  }

  /**
   * 도메인 연령 계산
   */
  private calculateDomainAge(createdAt: string): number {
    const created = new Date(createdAt);
    const now = new Date();
    const timeDiff = now.getTime() - created.getTime();
    return Math.floor(timeDiff / (24 * 60 * 60 * 1000));
  }

  /**
   * 사업자 정보 가져오기 (시뮬레이션)
   */
  private getBusinessInfo(url: string): string {
    // 실제 구현에서는 사업자 정보를 별도로 저장해야 함
    // 여기서는 시뮬레이션으로 샘플 정보 반환
    return '사업자등록번호 대표자명 사업장주소 전화번호 이메일';
  }

  /**
   * 권장사항 생성
   */
  private generateRecommendations(riskLevel: string, reasons: string[]): string[] {
    const recommendations: string[] = [];
    
    if (riskLevel === 'CRITICAL') {
      recommendations.push('이 쇼핑몰은 즉시 이용을 중단하세요');
      recommendations.push('개인정보 입력을 절대 하지 마세요');
      recommendations.push('신용카드 정보를 입력하지 마세요');
      recommendations.push('관련 기관에 신고를 고려하세요');
    } else if (riskLevel === 'HIGH') {
      recommendations.push('추가적인 사업자 정보 확인이 필요합니다');
      recommendations.push('실제 구매 후기를 더 찾아보시기 바랍니다');
      recommendations.push('신용카드 결제 시 보안에 주의하세요');
      recommendations.push('소액 결제로 먼저 테스트해보세요');
    } else if (riskLevel === 'MEDIUM') {
      recommendations.push('사업자 등록 정보를 확인해보세요');
      recommendations.push('다른 쇼핑몰과 가격을 비교해보세요');
      recommendations.push('고객 서비스 연락처를 확인해보세요');
    } else {
      recommendations.push('일반적인 온라인 쇼핑 주의사항을 준수하세요');
      recommendations.push('정기적으로 리뷰를 확인해보세요');
    }
    
    return recommendations;
  }

  /**
   * 메인 쇼핑몰 위험도 분석 함수
   */
  async analyzeShopRisk(shop: Shop, reports: Report[], ratings: Rating[]): Promise<ShopRiskResult> {
    try {
      // 1. 신고 분석
      const reportAnalysis = this.analyzeReports(reports);
      
      // 2. 평점 분석
      const ratingAnalysis = this.analyzeRatings(ratings);
      
      // 3. 도메인 분석
      const domainAnalysis = this.analyzeDomain(shop);
      
      // 4. 사업자 정보 분석
      const businessAnalysis = this.analyzeBusinessInfo(shop);
      
      // 5. 종합 점수 계산 (가중치 적용)
      const weights = { 
        reportAnalysis: 0.4, 
        ratingAnalysis: 0.3, 
        domainAnalysis: 0.2, 
        businessAnalysis: 0.1 
      };
      const riskScore = Math.round(
        reportAnalysis.score * weights.reportAnalysis +
        ratingAnalysis.score * weights.ratingAnalysis +
        domainAnalysis.score * weights.domainAnalysis +
        businessAnalysis.score * weights.businessAnalysis
      );
      
      // 6. 위험도 레벨 결정
      const riskLevel = this.getRiskLevel(riskScore);
      
      // 7. 모든 이유 합치기
      const allReasons = [
        ...reportAnalysis.reasons,
        ...ratingAnalysis.reasons,
        ...domainAnalysis.reasons,
        ...businessAnalysis.reasons
      ];
      
      // 8. 권장사항 생성
      const recommendations = this.generateRecommendations(riskLevel, allReasons);
      
      return {
        riskScore,
        riskLevel,
        reasons: allReasons,
        recommendations,
        analysis: {
          reportAnalysis: reportAnalysis.score,
          ratingAnalysis: ratingAnalysis.score,
          domainAnalysis: domainAnalysis.score,
          businessAnalysis: businessAnalysis.score
        },
        disclaimer: 'AI 분석 결과는 참고용이며, 최종 판단은 사용자에게 있습니다.'
      };
      
    } catch (error) {
      console.error('쇼핑몰 위험도 분석 오류:', error);
      return {
        riskScore: 0,
        riskLevel: 'LOW',
        reasons: ['분석 중 오류가 발생했습니다'],
        recommendations: ['일반적인 온라인 쇼핑 주의사항을 준수하세요'],
        analysis: {
          reportAnalysis: 0,
          ratingAnalysis: 0,
          domainAnalysis: 0,
          businessAnalysis: 0
        },
        disclaimer: 'AI 분석 결과는 참고용이며, 최종 판단은 사용자에게 있습니다.'
      };
    }
  }

  /**
   * 위험도 레벨 결정
   */
  private getRiskLevel(riskScore: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (riskScore >= 90) return 'CRITICAL';
    if (riskScore >= 70) return 'HIGH';
    if (riskScore >= 50) return 'MEDIUM';
    return 'LOW';
  }
}
