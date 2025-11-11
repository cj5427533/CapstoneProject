// 웹 크롤링 분석 서비스
export interface WebCrawlingResult {
  suspiciousKeywords: string[];
  priceAnalysis: {
    unrealisticPricing: boolean;
    priceFluctuation: number;
    averagePrice: number;
    priceRange: { min: number; max: number };
  };
  technicalAnalysis: {
    sslCertificate: boolean;
    domainAge: number;
    suspiciousPattern: boolean;
    serverLocation: string;
    responseTime: number;
    hasContactInfo: boolean;
    hasPrivacyPolicy: boolean;
    hasTermsOfService: boolean;
  };
  contentAnalysis: {
    hasSuspiciousContent: boolean;
    contentQuality: 'LOW' | 'MEDIUM' | 'HIGH';
    languageConsistency: boolean;
    imageQuality: 'LOW' | 'MEDIUM' | 'HIGH';
  };
  confidenceScore: number;
}

// 의심 키워드 목록
const SUSPICIOUS_KEYWORDS = [
  // 멀티레벨 마케팅 관련
  '후원수당', '하위라인', '멀티레벨', 'MLM', '다단계',
  '피라미드', '피라미드식', '수당지급', '추천수당',
  
  // 투자 관련 (의심스러운)
  '투자보장', '무조건수익', '단기부자', '일확천금',
  '투자성공률', '보장수익', '리스크없음', '실패보상',
  
  // 가짜 긴급성
  '지금만', '한정시간', '마감임박', '마지막기회',
  '오늘만', '지금당장', '서둘러주세요',
  
  // 부업/재택근무 (의심스러운)
  '재택근무', '부업', '부업수당', '재택수당',
  '시간자유', '월수입보장', '부업성공',
  
  // 가짜 리뷰/평점
  '100%만족', '모든고객만족', '완벽한서비스',
  '단한건도불만없음', '모든리뷰5점',
  
  // 개인정보 수집 (의심스러운)
  '개인정보필수', '신분증필요', '계좌정보필수',
  '신용카드정보', '주민등록번호필수'
];

// 가격 분석 함수
export class WebCrawlingAnalyzer {
  private static instance: WebCrawlingAnalyzer;
  
  public static getInstance(): WebCrawlingAnalyzer {
    if (!WebCrawlingAnalyzer.instance) {
      WebCrawlingAnalyzer.instance = new WebCrawlingAnalyzer();
    }
    return WebCrawlingAnalyzer.instance;
  }

  /**
   * 웹 크롤링 분석 수행
   */
  async analyzeWebsite(url: string): Promise<WebCrawlingResult> {
    try {
      console.log('웹 크롤링 분석 시작:', url);
      
      // URL 정규화
      const normalizedUrl = this.normalizeUrl(url);
      
      // 여러 분석을 병렬로 수행
      const [
        contentAnalysis,
        priceAnalysis,
        technicalAnalysis,
        suspiciousKeywords
      ] = await Promise.all([
        this.analyzeContent(),
        this.analyzePricing(),
        this.analyzeTechnical(normalizedUrl),
        this.detectSuspiciousKeywords(normalizedUrl)
      ]);

      // 신뢰도 점수 계산
      const confidenceScore = this.calculateConfidenceScore({
        contentAnalysis,
        priceAnalysis,
        technicalAnalysis,
        suspiciousKeywords
      });

      const result: WebCrawlingResult = {
        suspiciousKeywords,
        priceAnalysis,
        technicalAnalysis: {
          ...technicalAnalysis,
          domainAge: await this.getDomainAge()
        },
        contentAnalysis,
        confidenceScore
      };

      console.log('웹 크롤링 분석 완료:', result);
      return result;
    } catch (error) {
      console.error('웹 크롤링 분석 에러:', error);
      // 에러 시 기본값 반환
      return this.getDefaultResult();
    }
  }

  /**
   * 의심 키워드 탐지
   */
  private async detectSuspiciousKeywords(url: string): Promise<string[]> {
    try {
      // 실제 구현에서는 웹페이지 내용을 크롤링해야 하지만,
      // 현재는 모의 데이터로 구현
      const detectedKeywords: string[] = [];
      
      // URL에서 키워드 검사
      const urlLower = url.toLowerCase();
      SUSPICIOUS_KEYWORDS.forEach(keyword => {
        if (urlLower.includes(keyword.toLowerCase())) {
          detectedKeywords.push(keyword);
        }
      });

      // 모의 데이터: 실제 구현에서는 웹페이지 텍스트 분석
      const mockDetectedKeywords = [
        // 30% 확률로 의심 키워드 발견
        ...(Math.random() > 0.7 ? ['후원수당', '멀티레벨'] : []),
        ...(Math.random() > 0.8 ? ['투자보장'] : [])
      ];

      return [...detectedKeywords, ...mockDetectedKeywords];
    } catch (error) {
      console.error('의심 키워드 탐지 에러:', error);
      return [];
    }
  }

  /**
   * 가격 분석
   */
  private async analyzePricing(): Promise<WebCrawlingResult['priceAnalysis']> {
    try {
      // 모의 가격 분석 데이터
      const mockPrices = [1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000];
      const prices = Array.from({ length: 10 }, () => 
        mockPrices[Math.floor(Math.random() * mockPrices.length)]
      );

      const averagePrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      
      // 가격 변동률 계산
      const priceFluctuation = (maxPrice - minPrice) / averagePrice;
      
      // 비현실적으로 낮은 가격 체크 (평균의 10% 이하)
      const unrealisticPricing = minPrice < averagePrice * 0.1;

      return {
        unrealisticPricing,
        priceFluctuation,
        averagePrice: Math.round(averagePrice),
        priceRange: { min: minPrice, max: maxPrice }
      };
    } catch (error) {
      console.error('가격 분석 에러:', error);
      return {
        unrealisticPricing: false,
        priceFluctuation: 0,
        averagePrice: 0,
        priceRange: { min: 0, max: 0 }
      };
    }
  }

  /**
   * 기술적 분석
   */
  private async analyzeTechnical(url: string): Promise<WebCrawlingResult['technicalAnalysis']> {
    try {
      // URL 분석
      const urlObj = new URL(url);
      const domain = urlObj.hostname;
      
      // SSL 인증서 확인 (실제 구현에서는 실제 체크)
      const sslCertificate = url.startsWith('https://');
      
      // 의심스러운 도메인 패턴 체크
      const suspiciousPatterns = ['secure-', 'login-', 'account-', 'payment-', 'bank-'];
      const suspiciousPattern = suspiciousPatterns.some(pattern => 
        domain.includes(pattern)
      );

      // 서버 위치 (모의 데이터)
      const serverLocations = ['Korea', 'USA', 'China', 'Unknown'];
      const serverLocation = serverLocations[Math.floor(Math.random() * serverLocations.length)];

      // 응답 시간 (모의 데이터)
      const responseTime = Math.floor(Math.random() * 3000) + 500; // 500-3500ms

      // 연락처 정보 및 정책 페이지 존재 여부 (모의 데이터)
      const hasContactInfo = Math.random() > 0.3; // 70% 확률
      const hasPrivacyPolicy = Math.random() > 0.4; // 60% 확률
      const hasTermsOfService = Math.random() > 0.5; // 50% 확률

      return {
        sslCertificate,
        domainAge: 0, // 별도 함수에서 계산
        suspiciousPattern,
        serverLocation,
        responseTime,
        hasContactInfo,
        hasPrivacyPolicy,
        hasTermsOfService
      };
    } catch (error) {
      console.error('기술적 분석 에러:', error);
      return {
        sslCertificate: false,
        domainAge: 0,
        suspiciousPattern: true,
        serverLocation: 'Unknown',
        responseTime: 5000,
        hasContactInfo: false,
        hasPrivacyPolicy: false,
        hasTermsOfService: false
      };
    }
  }

  /**
   * 콘텐츠 분석
   */
  private async analyzeContent(): Promise<WebCrawlingResult['contentAnalysis']> {
    try {
      // 모의 콘텐츠 분석 데이터
      const hasSuspiciousContent = Math.random() > 0.8; // 20% 확률
      
      const contentQualityOptions: ('LOW' | 'MEDIUM' | 'HIGH')[] = ['LOW', 'MEDIUM', 'HIGH'];
      const contentQuality = contentQualityOptions[Math.floor(Math.random() * 3)];
      
      const languageConsistency = Math.random() > 0.2; // 80% 확률
      
      const imageQuality = contentQualityOptions[Math.floor(Math.random() * 3)];

      return {
        hasSuspiciousContent,
        contentQuality,
        languageConsistency,
        imageQuality
      };
    } catch (error) {
      console.error('콘텐츠 분석 에러:', error);
      return {
        hasSuspiciousContent: true,
        contentQuality: 'LOW',
        languageConsistency: false,
        imageQuality: 'LOW'
      };
    }
  }

  /**
   * 도메인 연령 계산
   */
  private async getDomainAge(): Promise<number> {
    try {
      // 실제 구현에서는 WHOIS API를 사용하여 도메인 등록일 확인
      // 현재는 모의 데이터
      const mockAges = [1, 7, 30, 90, 180, 365, 730, 1095]; // 일 단위
      return mockAges[Math.floor(Math.random() * mockAges.length)];
    } catch (error) {
      console.error('도메인 연령 계산 에러:', error);
      return 0;
    }
  }

  /**
   * 신뢰도 점수 계산
   */
  private calculateConfidenceScore(analysis: {
    contentAnalysis: WebCrawlingResult['contentAnalysis'];
    priceAnalysis: WebCrawlingResult['priceAnalysis'];
    technicalAnalysis: WebCrawlingResult['technicalAnalysis'];
    suspiciousKeywords: string[];
  }): number {
    let score = 100;

    // 의심 키워드 감점
    score -= analysis.suspiciousKeywords.length * 15;

    // 가격 분석 감점
    if (analysis.priceAnalysis.unrealisticPricing) score -= 20;
    if (analysis.priceAnalysis.priceFluctuation > 0.5) score -= 10;

    // 기술적 분석 감점
    if (!analysis.technicalAnalysis.sslCertificate) score -= 15;
    if (analysis.technicalAnalysis.suspiciousPattern) score -= 20;
    if (analysis.technicalAnalysis.serverLocation !== 'Korea') score -= 10;
    if (analysis.technicalAnalysis.responseTime > 3000) score -= 10;
    if (!analysis.technicalAnalysis.hasContactInfo) score -= 10;
    if (!analysis.technicalAnalysis.hasPrivacyPolicy) score -= 5;
    if (!analysis.technicalAnalysis.hasTermsOfService) score -= 5;

    // 콘텐츠 분석 감점
    if (analysis.contentAnalysis.hasSuspiciousContent) score -= 25;
    if (analysis.contentAnalysis.contentQuality === 'LOW') score -= 15;
    if (analysis.contentAnalysis.contentQuality === 'MEDIUM') score -= 5;
    if (!analysis.contentAnalysis.languageConsistency) score -= 10;
    if (analysis.contentAnalysis.imageQuality === 'LOW') score -= 10;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * URL 정규화
   */
  private normalizeUrl(url: string): string {
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return 'https://' + url;
    }
    return url;
  }

  /**
   * 기본 결과 반환 (에러 시)
   */
  private getDefaultResult(): WebCrawlingResult {
    return {
      suspiciousKeywords: [],
      priceAnalysis: {
        unrealisticPricing: false,
        priceFluctuation: 0,
        averagePrice: 0,
        priceRange: { min: 0, max: 0 }
      },
      technicalAnalysis: {
        sslCertificate: false,
        domainAge: 0,
        suspiciousPattern: false,
        serverLocation: 'Unknown',
        responseTime: 0,
        hasContactInfo: false,
        hasPrivacyPolicy: false,
        hasTermsOfService: false
      },
      contentAnalysis: {
        hasSuspiciousContent: false,
        contentQuality: 'MEDIUM',
        languageConsistency: true,
        imageQuality: 'MEDIUM'
      },
      confidenceScore: 50
    };
  }
}
