// 실시간 피싱 사이트 탐지 서비스 - 구체적 기준 기반
import { API_BASE_URL } from '../utils/api';

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
  private async _analyzeDomain(url: string): Promise<{ score: number; reasons: string[] }> {
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
      const domainAge = await this.getDomainAge();
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
  private async _analyzeContent(): Promise<{ score: number; reasons: string[] }> {
    let score = 0;
    const reasons: string[] = [];
    
    try {
      // 실제 구현에서는 웹 스크래핑이 필요하지만, 
      // 여기서는 시뮬레이션으로 구현
      const content = await this.fetchPageContent();
      
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
  private async _analyzeTechnical(): Promise<{ score: number; reasons: string[] }> {
    let score = 0;
    const reasons: string[] = [];
    
    try {
      // 1. SSL 인증서 검사
      const sslValid = await this.checkSSL();
      if (!sslValid) {
        score += PHISHING_CRITERIA.technicalAnalysis.sslCertificate.penalty;
        reasons.push('유효하지 않은 SSL 인증서 사용');
      }
      
      // 2. 리다이렉트 체인 검사
      const redirectCount = await this.checkRedirects();
      if (redirectCount >= PHISHING_CRITERIA.technicalAnalysis.redirectChains.count) {
        score += PHISHING_CRITERIA.technicalAnalysis.redirectChains.penalty;
        reasons.push(`${redirectCount}회의 리다이렉트로 의심스러움`);
      }
      
      // 3. 의심스러운 스크립트 검사
      const content = await this.fetchPageContent();
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
  private async getDomainAge(): Promise<number> {
    // 실제 구현에서는 WHOIS API를 사용해야 함
    // 여기서는 시뮬레이션으로 랜덤 연령 반환
    return Math.floor(Math.random() * 365) + 1;
  }

  /**
   * 페이지 콘텐츠 가져오기 (시뮬레이션)
   */
  private async fetchPageContent(): Promise<string> {
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
  private async checkSSL(): Promise<boolean> {
    // 실제 구현에서는 SSL 인증서 검증이 필요
    // 여기서는 시뮬레이션으로 랜덤 결과 반환
    return Math.random() > 0.3; // 70% 확률로 유효
  }

  /**
   * 리다이렉트 체인 검사 (시뮬레이션)
   */
  private async checkRedirects(): Promise<number> {
    // 실제 구현에서는 HTTP 리다이렉트를 추적해야 함
    // 여기서는 시뮬레이션으로 랜덤 결과 반환
    return Math.floor(Math.random() * 5);
  }

  /**
   * 권장사항 생성
   */
  private _generateRecommendations(riskLevel: string): string[] {
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
   * 메인 피싱 탐지 함수 (백엔드 API 호출)
   */
  async detectPhishing(url: string): Promise<PhishingResult> {
    try {
      // 백엔드 API 호출 (api.ts의 API_BASE_URL 사용 - 프로덕션 환경에서 HTTPS 자동 사용)
      const response = await fetch(`${API_BASE_URL}/phishing/detect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        throw new Error(`피싱 탐지 API 호출 실패: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || '피싱 탐지 실패');
      }

      // 백엔드 응답 형식: { success: true, ml: { label, riskLabel, confidence, trustScore }, reports: {...}, webMeta: {...} }
      // 또는 { success: true, data: { ... } } 형식
      const mlData = data.ml || data.data?.ml || data.result?.ml;
      
      if (!mlData || typeof mlData !== 'object') {
        console.error('피싱 탐지 응답 형식 오류:', { data, mlData });
        throw new Error('예상치 못한 응답 형식: ml 데이터가 없습니다');
      }
      
      // 백엔드의 trustScore는 0~100 (높을수록 안전)
      // 프론트엔드의 phishingScore는 0~100 (높을수록 위험)
      const trustScore = typeof mlData.trustScore === 'number' ? mlData.trustScore : 0;
      const phishingScore = 100 - trustScore; // 신뢰도 점수를 위험도 점수로 변환
      
      // riskLevel 결정 (phishingScore 기준)
      let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
      if (phishingScore <= 10) riskLevel = 'LOW';      // trustScore 90~100: 매우안전
      else if (phishingScore <= 30) riskLevel = 'MEDIUM';   // trustScore 70~89: 안전
      else if (phishingScore <= 60) riskLevel = 'HIGH';     // trustScore 40~69: 주의
      else riskLevel = 'CRITICAL';                           // trustScore 0~39: 의심
      
      // reasons와 recommendations 생성
      const reasons: string[] = [];
      const recommendations: string[] = [];
      
      if (mlData.riskLabel === 'PHISHING') {
        reasons.push('ML 모델이 피싱 사이트로 판단했습니다');
        recommendations.push('이 사이트는 피싱 사이트일 가능성이 높습니다. 접속을 중단하세요');
      } else {
        reasons.push('ML 모델이 정상 사이트로 판단했습니다');
        recommendations.push('일반적인 온라인 쇼핑 주의사항을 준수하세요');
      }
      
      // webMeta 정보가 있으면 추가
      const webMeta = data.webMeta || data.data?.webMeta || data.result?.webMeta;
      if (webMeta) {
        if (!webMeta.sslValid) {
          reasons.push('SSL 인증서가 유효하지 않습니다');
        }
        if (webMeta.domainAge && webMeta.domainAge < 30) {
          reasons.push(`도메인이 최근에 생성되었습니다 (${webMeta.domainAge}일)`);
        }
      }
      
      return {
        phishingScore,
        riskLevel,
        reasons,
        recommendations,
        analysis: {
          domainAnalysis: webMeta?.domainAge || 0,
          contentAnalysis: 0,
          technicalAnalysis: webMeta?.sslValid ? 100 : 0
        }
      };
      
    } catch (error) {
      console.error('피싱 탐지 오류:', error);
      // 에러 발생 시 기본값을 반환하지 않고 에러를 다시 던져서
      // 상위 레벨(realTimePhishingSystem)에서 null을 반환하도록 함
      // 이렇게 하면 ML 예측 결과만 사용하게 됨
      throw error;
    }
  }

  /**
   * 신뢰도 레벨 결정
   * phishingScore는 위험도 점수 (높을수록 위험)
   * trustScore = 100 - phishingScore 기준: 90~100(매우안전/파랑), 70~89(안전/초록), 40~69(주의/노랑), 0~39(의심/주황)
   * - phishingScore <= 10 → LOW (매우안전/파랑)
   * - phishingScore 11~30 → MEDIUM (안전/초록)
   * - phishingScore 31~60 → HIGH (주의/노랑)
   * - phishingScore >= 61 → CRITICAL (의심/주황)
   */
  private _getRiskLevel(phishingScore: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (phishingScore <= 10) return 'LOW';      // trustScore 90~100: 매우안전(파랑)
    if (phishingScore <= 30) return 'MEDIUM';   // trustScore 70~89: 안전(초록)
    if (phishingScore <= 60) return 'HIGH';     // trustScore 40~69: 주의(노랑)
    return 'CRITICAL';                           // trustScore 0~39: 의심(주황)
  }
}
