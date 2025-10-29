// 개선된 쇼핑몰 신뢰도 분석 서비스 - 증빙 기반 + 객관적 데이터 중심
export interface Shop {
  id: number;
  url: string;
  name?: string;
  parent_shop_id?: number;
  created_at: string;
}

export interface EnhancedReport {
  id: number;
  shop_id: number;
  categories: string;
  description: string;
  reporter_name?: string;
  reporter_phone?: string;
  evidence_type: 'NONE' | 'RECEIPT' | 'CONTRACT' | 'PAYMENT_RECORD' | 'COMMUNICATION';
  evidence_files?: string[];
  evidence_verified: boolean;
  verification_score: number;
  report_type: 'GENERAL_REVIEW' | 'VERIFIED_COMPLAINT';
  created_at: string;
}

export interface BusinessRegistration {
  id: number;
  shop_id: number;
  business_number?: string;
  registration_date?: string;
  business_status: 'ACTIVE' | 'SUSPENDED' | 'CLOSED' | 'UNKNOWN';
  business_type?: string;
  capital_amount?: number;
  representative_name?: string;
  business_address?: string;
  phone_number?: string;
  email?: string;
  last_verified: string;
  verification_source: 'API' | 'MANUAL' | 'CRAWLING';
}

export interface WebAnalysis {
  id: number;
  shop_id: number;
  suspicious_keywords?: string[];
  price_analysis?: {
    unrealisticPricing: boolean;
    priceFluctuation: number;
    averagePrice: number;
  };
  technical_analysis?: {
    sslCertificate: boolean;
    domainAge: number;
    suspiciousPattern: boolean;
    serverLocation: string;
    responseTime: number;
  };
  domain_analysis?: {
    domainAge: number;
    suspiciousPattern: boolean;
    registrationInfo: any;
  };
  analysis_date: string;
  confidence_score: number;
}

export interface Rating {
  id: number;
  shop_id: number;
  rating: number;
  created_at: string;
}

export interface EnhancedShopRiskResult {
  riskScore: number; // 0-100점
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  reasons: string[];
  recommendations: string[];
  analysis: {
    objectiveDataAnalysis: number; // 객관적 데이터 분석 (60% 가중치)
    evidenceBasedAnalysis: number; // 증빙 기반 분석 (30% 가중치)
    ratingAnalysis: number; // 평점 분석 (10% 가중치)
  };
  disclaimer: string;
  evidenceSummary: {
    totalReports: number;
    verifiedReports: number;
    evidenceTypes: Record<string, number>;
    verificationRate: number;
  };
}

// 개선된 분석 기준 - 객관적 데이터 중심
export const ENHANCED_SHOP_RISK_CRITERIA = {
  // 객관적 데이터 분석 (60% 가중치)
  objectiveDataAnalysis: {
    weight: 0.6,
    
    // 공정위/국세청 등록 현황
    businessRegistration: {
      unregisteredBusiness: { penalty: 90 }, // 미등록 사업자
      newBusiness: { 
        threshold: 180, // 180일 이내
        penalty: 30 
      },
      suspendedBusiness: { penalty: 80 }, // 휴업/폐업 상태
      lowCapital: { 
        threshold: 10000000, // 1천만원 이하
        penalty: 20 
      },
      missingBusinessInfo: { penalty: 50 } // 사업자 정보 부족
    },
    
    // 웹 크롤링 키워드 분석
    webCrawlingAnalysis: {
      suspiciousKeywords: {
        keywords: ['후원수당', '하위라인', '멀티레벨', '피라미드', '투자보장', '무조건수익', '단기부자', '재택근무', '부업'],
        penalty: 70
      },
      priceAnalysis: {
        unrealisticPricing: { penalty: 50 },
        priceFluctuation: { threshold: 0.5, penalty: 40 }
      }
    },
    
    // 기술적 신뢰도 분석
    technicalAnalysis: {
      sslCertificate: { penalty: 30 }, // SSL 인증서 없음
      domainAge: { 
        newDomain: { threshold: 30, penalty: 40 }, // 30일 이내 신규 도메인
        suspiciousPattern: { penalty: 60 } // 의심스러운 도메인 패턴
      },
      serverLocation: { penalty: 20 }, // 해외 서버 사용
      responseTime: { penalty: 15 } // 느린 응답속도
    }
  },
  
  // 증빙 기반 피해 사례 제보 분석 (30% 가중치)
  evidenceBasedAnalysis: {
    weight: 0.3,
    
    evidenceWeights: {
      NONE: 1.0, // 증빙 없음
      RECEIPT: 2.0, // 구매 영수증
      CONTRACT: 3.0, // 계약서
      PAYMENT_RECORD: 4.0, // 입금 내역
      COMMUNICATION: 2.5 // 고객센터 대화 기록
    },
    
    verifiedComplaintMultiplier: 5.0, // 증빙 완료된 피해 사례 5배 가중치
    
    criticalCategories: ['사기', '가짜리뷰', '배송지연', '환불거부', '개인정보유출'],
    criticalCategoryPenalty: 20 // 중요 카테고리당 20점 감점
  },
  
  // 평점 분석 (10% 가중치 - 대폭 축소)
  ratingAnalysis: {
    weight: 0.1,
    
    perfectRating: {
      threshold: 0.9, // 90% 이상이 5점
      penalty: 40 // 기존 80에서 40으로 감소
    },
    
    ratingFluctuation: {
      threshold: 2.0, // 2점 이상 급변
      timeWindow: 1, // 1일 내
      penalty: 35 // 기존 70에서 35로 감소
    },
    
    reviewDensity: {
      threshold: 20, // 하루에 20개 이상
      timeWindow: 1, // 1일
      penalty: 30 // 기존 60에서 30으로 감소
    }
  }
};

export class EnhancedShopRiskAnalyzer {
  private static instance: EnhancedShopRiskAnalyzer;
  
  public static getInstance(): EnhancedShopRiskAnalyzer {
    if (!EnhancedShopRiskAnalyzer.instance) {
      EnhancedShopRiskAnalyzer.instance = new EnhancedShopRiskAnalyzer();
    }
    return EnhancedShopRiskAnalyzer.instance;
  }

  /**
   * 개선된 쇼핑몰 신뢰도 분석
   */
  async analyzeShopRisk(
    reports: EnhancedReport[], 
    businessData: BusinessRegistration | null,
    webAnalysis: WebAnalysis | null,
    ratings: Rating[]
  ): Promise<EnhancedShopRiskResult> {
    try {
      // 1. 객관적 데이터 분석 (60% 가중치)
      const objectiveAnalysis = this.analyzeObjectiveData(businessData, webAnalysis);
      
      // 2. 증빙 기반 피해 사례 제보 분석 (30% 가중치)
      const evidenceBasedAnalysis = this.analyzeEvidenceBasedReports(reports);
      
      // 3. 평점 분석 (10% 가중치)
      const ratingAnalysis = this.analyzeRatings(ratings);
      
      // 최종 점수 계산
      const totalScore = 
        (objectiveAnalysis.score * ENHANCED_SHOP_RISK_CRITERIA.objectiveDataAnalysis.weight) +
        (evidenceBasedAnalysis.score * ENHANCED_SHOP_RISK_CRITERIA.evidenceBasedAnalysis.weight) +
        (ratingAnalysis.score * ENHANCED_SHOP_RISK_CRITERIA.ratingAnalysis.weight);
      
      const riskLevel = this.determineRiskLevel(totalScore);
      const recommendations = this.generateRecommendations(riskLevel);
      
      // 증빙 요약 정보
      const evidenceSummary = this.generateEvidenceSummary(reports);
      
      return {
        riskScore: Math.min(totalScore, 100),
        riskLevel,
        reasons: [
          ...objectiveAnalysis.reasons,
          ...evidenceBasedAnalysis.reasons,
          ...ratingAnalysis.reasons
        ],
        recommendations,
        analysis: {
          objectiveDataAnalysis: objectiveAnalysis.score,
          evidenceBasedAnalysis: evidenceBasedAnalysis.score,
          ratingAnalysis: ratingAnalysis.score
        },
        disclaimer: '이 분석은 AI 알고리즘을 통해 생성된 것으로, 참고용입니다. 실제 거래 시 신중한 판단이 필요합니다.',
        evidenceSummary
      };
    } catch (error) {
      console.error('Enhanced shop risk analysis error:', error);
      throw error;
    }
  }

  /**
   * 객관적 데이터 분석 (60% 가중치)
   */
  private analyzeObjectiveData(
    businessData: BusinessRegistration | null,
    webAnalysis: WebAnalysis | null
  ): { score: number; reasons: string[] } {
    let score = 0;
    const reasons: string[] = [];
    
    // 1. 사업자 등록 정보 분석
    if (businessData) {
      const businessScore = this.analyzeBusinessRegistration(businessData);
      score += businessScore.score;
      reasons.push(...businessScore.reasons);
    } else {
      score += ENHANCED_SHOP_RISK_CRITERIA.objectiveDataAnalysis.businessRegistration.missingBusinessInfo.penalty;
      reasons.push('사업자 등록 정보가 없어 신뢰도 평가가 어렵습니다');
    }
    
    // 2. 웹 크롤링 분석
    if (webAnalysis) {
      const webScore = this.analyzeWebData(webAnalysis);
      score += webScore.score;
      reasons.push(...webScore.reasons);
    }
    
    // 3. 기술적 분석
    if (webAnalysis?.technical_analysis) {
      const technicalScore = this.analyzeTechnicalData(webAnalysis.technical_analysis);
      score += technicalScore.score;
      reasons.push(...technicalScore.reasons);
    }
    
    return { 
      score: Math.min(score, 100), 
      reasons 
    };
  }

  /**
   * 사업자 등록 정보 분석
   */
  private analyzeBusinessRegistration(businessData: BusinessRegistration): { score: number; reasons: string[] } {
    let score = 0;
    const reasons: string[] = [];
    
    // 사업자 등록번호 유효성
    if (!businessData.business_number) {
      score += ENHANCED_SHOP_RISK_CRITERIA.objectiveDataAnalysis.businessRegistration.unregisteredBusiness.penalty;
      reasons.push('사업자등록번호가 없어 미등록 사업자로 판단됩니다');
    }
    
    // 사업 상태 확인
    if (businessData.business_status === 'SUSPENDED' || businessData.business_status === 'CLOSED') {
      score += ENHANCED_SHOP_RISK_CRITERIA.objectiveDataAnalysis.businessRegistration.suspendedBusiness.penalty;
      reasons.push(`사업 상태가 ${businessData.business_status === 'SUSPENDED' ? '휴업' : '폐업'} 상태입니다`);
    }
    
    // 신규 사업자 확인
    if (businessData.registration_date) {
      const registrationDate = new Date(businessData.registration_date);
      const daysSinceRegistration = (Date.now() - registrationDate.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysSinceRegistration <= ENHANCED_SHOP_RISK_CRITERIA.objectiveDataAnalysis.businessRegistration.newBusiness.threshold) {
        score += ENHANCED_SHOP_RISK_CRITERIA.objectiveDataAnalysis.businessRegistration.newBusiness.penalty;
        reasons.push(`${Math.round(daysSinceRegistration)}일 전 등록된 신규 사업자입니다`);
      }
    }
    
    // 자본금 확인
    if (businessData.capital_amount && businessData.capital_amount <= ENHANCED_SHOP_RISK_CRITERIA.objectiveDataAnalysis.businessRegistration.lowCapital.threshold) {
      score += ENHANCED_SHOP_RISK_CRITERIA.objectiveDataAnalysis.businessRegistration.lowCapital.penalty;
      reasons.push(`등록자본금이 ${businessData.capital_amount.toLocaleString()}원으로 낮습니다`);
    }
    
    return { score, reasons };
  }

  /**
   * 웹 크롤링 데이터 분석
   */
  private analyzeWebData(webAnalysis: WebAnalysis): { score: number; reasons: string[] } {
    let score = 0;
    const reasons: string[] = [];
    
    // 의심 키워드 검사
    if (webAnalysis.suspicious_keywords && webAnalysis.suspicious_keywords.length > 0) {
      score += ENHANCED_SHOP_RISK_CRITERIA.objectiveDataAnalysis.webCrawlingAnalysis.suspiciousKeywords.penalty;
      reasons.push(`의심 키워드 ${webAnalysis.suspicious_keywords.length}개 발견: ${webAnalysis.suspicious_keywords.join(', ')}`);
    }
    
    // 가격 분석
    if (webAnalysis.price_analysis) {
      if (webAnalysis.price_analysis.unrealisticPricing) {
        score += ENHANCED_SHOP_RISK_CRITERIA.objectiveDataAnalysis.webCrawlingAnalysis.priceAnalysis.unrealisticPricing.penalty;
        reasons.push('비현실적으로 낮은 가격이 발견되었습니다');
      }
      
      if (webAnalysis.price_analysis.priceFluctuation >= ENHANCED_SHOP_RISK_CRITERIA.objectiveDataAnalysis.webCrawlingAnalysis.priceAnalysis.priceFluctuation.threshold) {
        score += ENHANCED_SHOP_RISK_CRITERIA.objectiveDataAnalysis.webCrawlingAnalysis.priceAnalysis.priceFluctuation.penalty;
        reasons.push(`가격 변동률이 ${Math.round(webAnalysis.price_analysis.priceFluctuation * 100)}%로 높습니다`);
      }
    }
    
    return { score, reasons };
  }

  /**
   * 기술적 데이터 분석
   */
  private analyzeTechnicalData(technicalAnalysis: any): { score: number; reasons: string[] } {
    let score = 0;
    const reasons: string[] = [];
    
    // SSL 인증서 확인
    if (!technicalAnalysis.sslCertificate) {
      score += ENHANCED_SHOP_RISK_CRITERIA.objectiveDataAnalysis.technicalAnalysis.sslCertificate.penalty;
      reasons.push('SSL 인증서가 없어 보안이 취약합니다');
    }
    
    // 도메인 연령 확인
    if (technicalAnalysis.domainAge <= ENHANCED_SHOP_RISK_CRITERIA.objectiveDataAnalysis.technicalAnalysis.domainAge.newDomain.threshold) {
      score += ENHANCED_SHOP_RISK_CRITERIA.objectiveDataAnalysis.technicalAnalysis.domainAge.newDomain.penalty;
      reasons.push(`${technicalAnalysis.domainAge}일 된 신규 도메인입니다`);
    }
    
    // 의심스러운 도메인 패턴
    if (technicalAnalysis.suspiciousPattern) {
      score += ENHANCED_SHOP_RISK_CRITERIA.objectiveDataAnalysis.technicalAnalysis.domainAge.suspiciousPattern.penalty;
      reasons.push('의심스러운 도메인 패턴이 발견되었습니다');
    }
    
    // 서버 위치 확인
    if (technicalAnalysis.serverLocation && !technicalAnalysis.serverLocation.includes('Korea')) {
      score += ENHANCED_SHOP_RISK_CRITERIA.objectiveDataAnalysis.technicalAnalysis.serverLocation.penalty;
      reasons.push('해외 서버를 사용하고 있습니다');
    }
    
    // 응답 시간 확인
    if (technicalAnalysis.responseTime > 3000) { // 3초 이상
      score += ENHANCED_SHOP_RISK_CRITERIA.objectiveDataAnalysis.technicalAnalysis.responseTime.penalty;
      reasons.push(`응답 시간이 ${technicalAnalysis.responseTime}ms로 느립니다`);
    }
    
    return { score, reasons };
  }

  /**
   * 증빙 기반 피해 사례 제보 분석 (30% 가중치)
   */
  private analyzeEvidenceBasedReports(reports: EnhancedReport[]): { score: number; reasons: string[] } {
    let score = 0;
    const reasons: string[] = [];
    
    if (reports.length === 0) {
      return { score: 0, reasons: ['피해 사례 제보가 없어 안전합니다'] };
    }
    
    reports.forEach(report => {
      const categories = JSON.parse(report.categories);
      
      // 증빙 기반 가중치 계산
      const evidenceWeight = ENHANCED_SHOP_RISK_CRITERIA.evidenceBasedAnalysis.evidenceWeights[report.evidence_type];
      const verifiedMultiplier = report.report_type === 'VERIFIED_COMPLAINT' ? 
        ENHANCED_SHOP_RISK_CRITERIA.evidenceBasedAnalysis.verifiedComplaintMultiplier : 1.0;
      
      const finalWeight = evidenceWeight * verifiedMultiplier;
      
      // 중요 카테고리 검사
      const criticalCategories = ENHANCED_SHOP_RISK_CRITERIA.evidenceBasedAnalysis.criticalCategories;
      const hasCriticalCategory = categories.some((cat: string) => criticalCategories.includes(cat));
      
      if (hasCriticalCategory) {
        const penalty = ENHANCED_SHOP_RISK_CRITERIA.evidenceBasedAnalysis.criticalCategoryPenalty * finalWeight;
        score += penalty;
        
        const evidenceTypeText = this.getEvidenceTypeText(report.evidence_type);
        const verifiedText = report.evidence_verified ? ' (증빙 완료)' : '';
        reasons.push(`${evidenceTypeText}${verifiedText} 피해 사례 제보: ${categories.join(', ')}`);
      }
    });
    
    return { 
      score: Math.min(score, 100), 
      reasons 
    };
  }

  /**
   * 평점 분석 (10% 가중치)
   */
  private analyzeRatings(ratings: Rating[]): { score: number; reasons: string[] } {
    let score = 0;
    const reasons: string[] = [];
    
    if (ratings.length === 0) {
      return { score: 0, reasons: ['평점이 없어 분석할 수 없습니다'] };
    }
    
    // 완벽한 평점 분포 검사
    const perfectRating = ENHANCED_SHOP_RISK_CRITERIA.ratingAnalysis.perfectRating;
    const perfectCount = ratings.filter(rating => rating.rating === 5).length;
    const perfectPercentage = perfectCount / ratings.length;
    
    if (perfectPercentage >= perfectRating.threshold) {
      score += perfectRating.penalty;
      reasons.push(`${Math.round(perfectPercentage * 100)}%의 리뷰가 5점으로 비정상적`);
    }
    
    // 평점 급변 검사
    const ratingFluctuation = this.calculateRatingFluctuation(ratings);
    if (ratingFluctuation >= ENHANCED_SHOP_RISK_CRITERIA.ratingAnalysis.ratingFluctuation.threshold) {
      score += ENHANCED_SHOP_RISK_CRITERIA.ratingAnalysis.ratingFluctuation.penalty;
      reasons.push(`평점이 ${ratingFluctuation.toFixed(1)}점 급변`);
    }
    
    // 리뷰 밀도 검사
    const reviewDensity = this.calculateReviewDensity(ratings);
    if (reviewDensity >= ENHANCED_SHOP_RISK_CRITERIA.ratingAnalysis.reviewDensity.threshold) {
      score += ENHANCED_SHOP_RISK_CRITERIA.ratingAnalysis.reviewDensity.penalty;
      reasons.push(`하루에 ${reviewDensity}개의 리뷰로 비정상적 밀도`);
    }
    
    return { 
      score: Math.min(score, 100), 
      reasons 
    };
  }

  /**
   * 신뢰도 레벨 결정
   */
  private determineRiskLevel(score: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (score >= 80) return 'CRITICAL';
    if (score >= 60) return 'HIGH';
    if (score >= 30) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * 권장사항 생성
   */
  private generateRecommendations(
    riskLevel: string
  ): string[] {
    const recommendations: string[] = [];
    
    if (riskLevel === 'CRITICAL') {
      recommendations.push('🚨 이 쇼핑몰은 매우 주의가 필요합니다. 신중한 거래를 권장합니다');
      recommendations.push('관련 기관에 피해 사례 제보를 고려하세요');
      recommendations.push('개인정보 입력을 절대 하지 마세요');
    } else if (riskLevel === 'HIGH') {
      recommendations.push('⚠️ 이 쇼핑몰은 주의가 필요합니다');
      recommendations.push('추가적인 사업자 정보 확인이 필요합니다');
      recommendations.push('소액 거래로 먼저 테스트해보세요');
    } else if (riskLevel === 'MEDIUM') {
      recommendations.push('⚡ 이 쇼핑몰은 보통 수준의 신뢰도를 보입니다');
      recommendations.push('거래 전 충분한 검토를 권장합니다');
    } else {
      recommendations.push('✅ 이 쇼핑몰은 상대적으로 안전해 보입니다');
      recommendations.push('일반적인 주의사항만 지키면 됩니다');
    }
    
    return recommendations;
  }

  /**
   * 증빙 요약 정보 생성
   */
  private generateEvidenceSummary(reports: EnhancedReport[]): any {
    const totalReports = reports.length;
    const verifiedReports = reports.filter(r => r.evidence_verified).length;
    
    const evidenceTypes = reports.reduce((acc, report) => {
      acc[report.evidence_type] = (acc[report.evidence_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const verificationRate = totalReports > 0 ? (verifiedReports / totalReports) * 100 : 0;
    
    return {
      totalReports,
      verifiedReports,
      evidenceTypes,
      verificationRate: Math.round(verificationRate)
    };
  }

  /**
   * 증빙 유형 텍스트 변환
   */
  private getEvidenceTypeText(evidenceType: string): string {
    const typeMap: Record<string, string> = {
      'NONE': '증빙 없음',
      'RECEIPT': '구매 영수증',
      'CONTRACT': '계약서',
      'PAYMENT_RECORD': '입금 내역',
      'COMMUNICATION': '고객센터 대화'
    };
    return typeMap[evidenceType] || '알 수 없음';
  }

  /**
   * 평점 급변 계산
   */
  private calculateRatingFluctuation(ratings: Rating[]): number {
    if (ratings.length < 2) return 0;
    
    const sortedRatings = ratings.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    const recent = sortedRatings.slice(-10); // 최근 10개
    const older = sortedRatings.slice(-20, -10); // 그 이전 10개
    
    if (recent.length === 0 || older.length === 0) return 0;
    
    const recentAvg = recent.reduce((sum, r) => sum + r.rating, 0) / recent.length;
    const olderAvg = older.reduce((sum, r) => sum + r.rating, 0) / older.length;
    
    return Math.abs(recentAvg - olderAvg);
  }

  /**
   * 리뷰 밀도 계산
   */
  private calculateReviewDensity(ratings: Rating[]): number {
    if (ratings.length === 0) return 0;
    
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const recentRatings = ratings.filter(rating => 
      new Date(rating.created_at) >= oneDayAgo
    );
    
    return recentRatings.length;
  }
}