// 실시간 피싱 사이트 탐지 서비스 - 구체적 기준 기반
export interface PhishingResult {
  phishingScore: number; // 0-100점
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  reasons: string[];
  recommendations: string[];
  analysis: {
    domainAnalysis: number;
    contentAnalysis: number;
    technicalAnalysis: number;
  };
}

export interface DomainInfo {
  domain: string;
  age: number; // 일 단위
  registrar: string;
  sslValid: boolean;
  redirectCount: number;
}

// 우리만의 구체적인 피싱 탐지 기준
export const PHISHING_CRITERIA = {
  // 도메인 분석 기준
  domainAnalysis: {
    // 타이포스쿼팅 (유명 사이트와 유사한 도메인)
    typosquatting: {
      suspiciousDomains: [
        'naver.com', 'daum.net', 'google.com', 'amazon.com', 'coupang.com',
        '11st.co.kr', 'gmarket.co.kr', 'auction.co.kr', 'ssg.com', 'lotte.com'
      ],
      similarity: 0.85, // 85% 이상 유사
      penalty: 90 // 90점 감점
    },
    
    // 서브도메인 남용
    subdomainAbuse: {
      patterns: ['secure-', 'login-', 'account-', 'payment-', 'verify-'],
      penalty: 70 // 70점 감점
    },
    
    // 신규 도메인
    newDomain: {
      age: 30, // 30일 이내
      penalty: 60 // 60점 감점
    },
    
    // 의심스러운 TLD
    suspiciousTLD: {
      tlds: ['.tk', '.ml', '.ga', '.cf', '.click', '.download'],
      penalty: 80 // 80점 감점
    }
  },
  
  // 콘텐츠 분석 기준
  contentAnalysis: {
    // 긴급성 강조 표현
    urgencyIndicators: {
      keywords: [
        '즉시', '긴급', '마감임박', '한정', '지금만', '오늘만',
        '마지막기회', '빨리', '서둘러', '지금결제', '즉시결제'
      ],
      threshold: 3, // 3개 이상 사용
      penalty: 80 // 80점 감점
    },
    
    // 결제 압박 표현
    paymentPressure: {
      patterns: [
        '지금결제', '즉시결제', '할인마감', '쿠폰만료',
        '재고부족', '마감임박', '한정수량'
      ],
      threshold: 2, // 2개 이상 사용
      penalty: 90 // 90점 감점
    },
    
    // 연락처 정보 부족
    contactInfo: {
      required: ['전화번호', '이메일', '주소'],
      missing: 1, // 1개 이상 부족
      penalty: 70 // 70점 감점
    },
    
    // 사업자 정보 부족
    businessInfo: {
      required: ['사업자등록번호', '대표자명', '사업장주소'],
      missing: 2, // 2개 이상 부족
      penalty: 80 // 80점 감점
    }
  },
  
  // 기술적 분석 기준
  technicalAnalysis: {
    // SSL 인증서 문제
    sslCertificate: {
      invalid: true,
      penalty: 80 // 80점 감점
    },
    
    // 리다이렉트 체인
    redirectChains: {
      count: 3, // 3회 이상
      penalty: 60 // 60점 감점
    },
    
    // 의심스러운 스크립트
    suspiciousScripts: {
      patterns: ['eval(', 'document.write', 'innerHTML', 'outerHTML'],
      penalty: 90 // 90점 감점
    },
    
    // 외부 리소스 로딩
    externalResources: {
      suspiciousDomains: ['bit.ly', 'tinyurl.com', 'goo.gl'],
      penalty: 70 // 70점 감점
    }
  }
};

export class PhishingDetector {
  private static instance: PhishingDetector;
  
  public static getInstance(): PhishingDetector {
    if (!PhishingDetector.instance) {
      PhishingDetector.instance = new PhishingDetector();
    }
    return PhishingDetector.instance;
  }

  /**
   * 도메인 분석 (구체적 기준)
   */
  private async analyzeDomain(url: string): Promise<{ score: number; reasons: string[] }> {
    let score = 0;
    const reasons: string[] = [];
    
    try {
      const domain = this.extractDomain(url);
      
      // 1. 타이포스쿼팅 검사
      const typosquatting = PHISHING_CRITERIA.domainAnalysis.typosquatting;
      const similarity = this.calculateSimilarity(domain, typosquatting.suspiciousDomains);
      if (similarity >= typosquatting.similarity) {
        score += typosquatting.penalty;
        reasons.push(`유명 사이트와 ${Math.round(similarity * 100)}% 유사한 도메인명 사용`);
      }
      
      // 2. 서브도메인 남용 검사
      const subdomainAbuse = PHISHING_CRITERIA.domainAnalysis.subdomainAbuse;
      const foundSubdomain = subdomainAbuse.patterns.filter(pattern => 
        domain.includes(pattern)
      );
      if (foundSubdomain.length > 0) {
        score += subdomainAbuse.penalty;
        reasons.push(`의심스러운 서브도메인 "${foundSubdomain.join(', ')}" 사용`);
      }
      
      // 3. 신규 도메인 검사
      const domainAge = await this.getDomainAge(domain);
      if (domainAge <= PHISHING_CRITERIA.domainAnalysis.newDomain.age) {
        score += PHISHING_CRITERIA.domainAnalysis.newDomain.penalty;
        reasons.push(`도메인 연령이 ${domainAge}일로 신규`);
      }
      
      // 4. 의심스러운 TLD 검사
      const suspiciousTLD = PHISHING_CRITERIA.domainAnalysis.suspiciousTLD;
      const foundTLD = suspiciousTLD.tlds.filter(tld => domain.endsWith(tld));
      if (foundTLD.length > 0) {
        score += suspiciousTLD.penalty;
        reasons.push(`의심스러운 TLD "${foundTLD.join(', ')}" 사용`);
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
   * 콘텐츠 분석 (구체적 기준)
   */
  private async analyzeContent(url: string): Promise<{ score: number; reasons: string[] }> {
    let score = 0;
    const reasons: string[] = [];
    
    try {
      // 실제 구현에서는 웹 스크래핑이 필요하지만, 
      // 여기서는 시뮬레이션으로 구현
      const content = await this.fetchPageContent(url);
      
      // 1. 긴급성 강조 표현 검사
      const urgencyIndicators = PHISHING_CRITERIA.contentAnalysis.urgencyIndicators;
      const foundUrgency = urgencyIndicators.keywords.filter(keyword => 
        content.includes(keyword)
      );
      if (foundUrgency.length >= urgencyIndicators.threshold) {
        score += urgencyIndicators.penalty;
        reasons.push(`긴급성 강조 표현 "${foundUrgency.join(', ')}" ${foundUrgency.length}개 사용`);
      }
      
      // 2. 결제 압박 표현 검사
      const paymentPressure = PHISHING_CRITERIA.contentAnalysis.paymentPressure;
      const foundPressure = paymentPressure.patterns.filter(pattern => 
        content.includes(pattern)
      );
      if (foundPressure.length >= paymentPressure.threshold) {
        score += paymentPressure.penalty;
        reasons.push(`결제 압박 표현 "${foundPressure.join(', ')}" 사용`);
      }
      
      // 3. 연락처 정보 부족 검사
      const contactInfo = PHISHING_CRITERIA.contentAnalysis.contactInfo;
      const missingContact = contactInfo.required.filter(info => 
        !content.includes(info)
      );
      if (missingContact.length >= contactInfo.missing) {
        score += contactInfo.penalty;
        reasons.push(`연락처 정보 부족: ${missingContact.join(', ')}`);
      }
      
      // 4. 사업자 정보 부족 검사
      const businessInfo = PHISHING_CRITERIA.contentAnalysis.businessInfo;
      const missingBusiness = businessInfo.required.filter(info => 
        !content.includes(info)
      );
      if (missingBusiness.length >= businessInfo.missing) {
        score += businessInfo.penalty;
        reasons.push(`사업자 정보 부족: ${missingBusiness.join(', ')}`);
      }
      
    } catch (error) {
      console.error('콘텐츠 분석 오류:', error);
    }
    
    return { 
      score: Math.min(score, 100), 
      reasons 
    };
  }

  /**
   * 기술적 분석 (구체적 기준)
   */
  private async analyzeTechnical(url: string): Promise<{ score: number; reasons: string[] }> {
    let score = 0;
    const reasons: string[] = [];
    
    try {
      // 1. SSL 인증서 검사
      const sslValid = await this.checkSSL(url);
      if (!sslValid) {
        score += PHISHING_CRITERIA.technicalAnalysis.sslCertificate.penalty;
        reasons.push('유효하지 않은 SSL 인증서 사용');
      }
      
      // 2. 리다이렉트 체인 검사
      const redirectCount = await this.checkRedirects(url);
      if (redirectCount >= PHISHING_CRITERIA.technicalAnalysis.redirectChains.count) {
        score += PHISHING_CRITERIA.technicalAnalysis.redirectChains.penalty;
        reasons.push(`${redirectCount}회의 리다이렉트로 의심스러움`);
      }
      
      // 3. 의심스러운 스크립트 검사
      const content = await this.fetchPageContent(url);
      const suspiciousScripts = PHISHING_CRITERIA.technicalAnalysis.suspiciousScripts;
      const foundScripts = suspiciousScripts.patterns.filter(pattern => 
        content.includes(pattern)
      );
      if (foundScripts.length > 0) {
        score += suspiciousScripts.penalty;
        reasons.push(`의심스러운 스크립트 "${foundScripts.join(', ')}" 발견`);
      }
      
      // 4. 외부 리소스 검사
      const externalResources = PHISHING_CRITERIA.technicalAnalysis.externalResources;
      const foundExternal = externalResources.suspiciousDomains.filter(domain => 
        content.includes(domain)
      );
      if (foundExternal.length > 0) {
        score += externalResources.penalty;
        reasons.push(`의심스러운 외부 리소스 "${foundExternal.join(', ')}" 사용`);
      }
      
    } catch (error) {
      console.error('기술적 분석 오류:', error);
    }
    
    return { 
      score: Math.min(score, 100), 
      reasons 
    };
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
   * 유사도 계산 (레벤슈타인 거리 기반)
   */
  private calculateSimilarity(domain: string, suspiciousDomains: string[]): number {
    let maxSimilarity = 0;
    
    for (const suspiciousDomain of suspiciousDomains) {
      const similarity = this.levenshteinSimilarity(domain, suspiciousDomain);
      maxSimilarity = Math.max(maxSimilarity, similarity);
    }
    
    return maxSimilarity;
  }

  /**
   * 레벤슈타인 유사도 계산
   */
  private levenshteinSimilarity(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => 
      Array(str1.length + 1).fill(null)
    );
    
    for (let i = 0; i <= str1.length; i++) {
      matrix[0][i] = i;
    }
    
    for (let j = 0; j <= str2.length; j++) {
      matrix[j][0] = j;
    }
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }
    
    const distance = matrix[str2.length][str1.length];
    const maxLength = Math.max(str1.length, str2.length);
    
    return maxLength === 0 ? 1 : (maxLength - distance) / maxLength;
  }

  /**
   * 도메인 연령 조회 (시뮬레이션)
   */
  private async getDomainAge(domain: string): Promise<number> {
    // 실제 구현에서는 WHOIS API를 사용해야 함
    // 여기서는 시뮬레이션으로 랜덤 연령 반환
    return Math.floor(Math.random() * 365) + 1;
  }

  /**
   * 페이지 콘텐츠 가져오기 (시뮬레이션)
   */
  private async fetchPageContent(url: string): Promise<string> {
    // 실제 구현에서는 웹 스크래핑이 필요하지만,
    // 여기서는 시뮬레이션으로 샘플 콘텐츠 반환
    return `
      지금만 특가! 즉시결제하세요! 마감임박!
      한정수량으로 재고부족! 서둘러주세요!
      할인쿠폰이 곧 만료됩니다!
      전화번호: 010-1234-5678
      이메일: contact@example.com
    `;
  }

  /**
   * SSL 인증서 검사 (시뮬레이션)
   */
  private async checkSSL(url: string): Promise<boolean> {
    // 실제 구현에서는 SSL 인증서 검증이 필요
    // 여기서는 시뮬레이션으로 랜덤 결과 반환
    return Math.random() > 0.3; // 70% 확률로 유효
  }

  /**
   * 리다이렉트 체인 검사 (시뮬레이션)
   */
  private async checkRedirects(url: string): Promise<number> {
    // 실제 구현에서는 HTTP 리다이렉트를 추적해야 함
    // 여기서는 시뮬레이션으로 랜덤 결과 반환
    return Math.floor(Math.random() * 5);
  }

  /**
   * 권장사항 생성
   */
  private generateRecommendations(riskLevel: string, reasons: string[]): string[] {
    const recommendations: string[] = [];
    
    if (riskLevel === 'CRITICAL') {
      recommendations.push('이 사이트는 즉시 접속을 중단하세요');
      recommendations.push('개인정보 입력을 절대 하지 마세요');
      recommendations.push('신용카드 정보를 입력하지 마세요');
    } else if (riskLevel === 'HIGH') {
      recommendations.push('추가적인 사업자 정보 확인이 필요합니다');
      recommendations.push('실제 구매 후기를 더 찾아보시기 바랍니다');
      recommendations.push('신용카드 결제 시 보안에 주의하세요');
    } else if (riskLevel === 'MEDIUM') {
      recommendations.push('사업자 등록 정보를 확인해보세요');
      recommendations.push('다른 쇼핑몰과 가격을 비교해보세요');
    } else {
      recommendations.push('일반적인 온라인 쇼핑 주의사항을 준수하세요');
    }
    
    return recommendations;
  }

  /**
   * 메인 피싱 탐지 함수
   */
  async detectPhishing(url: string): Promise<PhishingResult> {
    try {
      // 1. 도메인 분석
      const domainAnalysis = await this.analyzeDomain(url);
      
      // 2. 콘텐츠 분석
      const contentAnalysis = await this.analyzeContent(url);
      
      // 3. 기술적 분석
      const technicalAnalysis = await this.analyzeTechnical(url);
      
      // 4. 종합 점수 계산 (가중치 적용)
      const weights = { domainAnalysis: 0.4, contentAnalysis: 0.4, technicalAnalysis: 0.2 };
      const phishingScore = Math.round(
        domainAnalysis.score * weights.domainAnalysis +
        contentAnalysis.score * weights.contentAnalysis +
        technicalAnalysis.score * weights.technicalAnalysis
      );
      
      // 5. 위험도 레벨 결정
      const riskLevel = this.getRiskLevel(phishingScore);
      
      // 6. 모든 이유 합치기
      const allReasons = [
        ...domainAnalysis.reasons,
        ...contentAnalysis.reasons,
        ...technicalAnalysis.reasons
      ];
      
      // 7. 권장사항 생성
      const recommendations = this.generateRecommendations(riskLevel, allReasons);
      
      return {
        phishingScore,
        riskLevel,
        reasons: allReasons,
        recommendations,
        analysis: {
          domainAnalysis: domainAnalysis.score,
          contentAnalysis: contentAnalysis.score,
          technicalAnalysis: technicalAnalysis.score
        }
      };
      
    } catch (error) {
      console.error('피싱 탐지 오류:', error);
      return {
        phishingScore: 0,
        riskLevel: 'LOW',
        reasons: ['분석 중 오류가 발생했습니다'],
        recommendations: ['일반적인 온라인 쇼핑 주의사항을 준수하세요'],
        analysis: {
          domainAnalysis: 0,
          contentAnalysis: 0,
          technicalAnalysis: 0
        }
      };
    }
  }

  /**
   * 위험도 레벨 결정
   */
  private getRiskLevel(phishingScore: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (phishingScore >= 90) return 'CRITICAL';
    if (phishingScore >= 70) return 'HIGH';
    if (phishingScore >= 50) return 'MEDIUM';
    return 'LOW';
  }
}
