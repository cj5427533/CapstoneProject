// AI 기반 가짜 리뷰 탐지 (고급) - 실시간 모니터링 및 패턴 학습
import { AdvancedFakeReviewDetector, Review, FakeReviewResult } from './advancedFakeReviewDetector';

export interface RealTimeMonitoringConfig {
  enabled: boolean;
  checkInterval: number; // 밀리초
  alertThreshold: number; // 0-100점
  autoBlock: boolean;
}

export interface PatternLearningData {
  confirmedFakeReviews: Review[];
  confirmedRealReviews: Review[];
  newPatterns: string[];
  accuracy: number;
}

export interface RealTimeAlert {
  id: string;
  shopId: number;
  reviewId: string;
  fakeScore: number;
  confidence: number;
  timestamp: string;
  action: 'ALERT' | 'BLOCK' | 'MONITOR';
}

export interface LearningResult {
  newPatterns: string[];
  accuracy: number;
  falsePositiveRate: number;
  falseNegativeRate: number;
}

export class AdvancedFakeReviewSystem {
  private static instance: AdvancedFakeReviewSystem;
  private detector: AdvancedFakeReviewDetector;
  private monitoringConfig: RealTimeMonitoringConfig;
  private learningData: PatternLearningData;
  private activeAlerts: Map<string, RealTimeAlert>;
  private monitoringIntervals: Map<number, NodeJS.Timeout>;
  
  private constructor() {
    this.detector = AdvancedFakeReviewDetector.getInstance();
    this.monitoringConfig = {
      enabled: true,
      checkInterval: 30000, // 30초마다 체크
      alertThreshold: 80, // 80점 이상 시 알림
      autoBlock: false
    };
    this.learningData = {
      confirmedFakeReviews: [],
      confirmedRealReviews: [],
      newPatterns: [],
      accuracy: 0
    };
    this.activeAlerts = new Map();
    this.monitoringIntervals = new Map();
  }
  
  public static getInstance(): AdvancedFakeReviewSystem {
    if (!AdvancedFakeReviewSystem.instance) {
      AdvancedFakeReviewSystem.instance = new AdvancedFakeReviewSystem();
    }
    return AdvancedFakeReviewSystem.instance;
  }

  /**
   * 실시간 모니터링 시작
   */
  startRealTimeMonitoring(shopId: number): void {
    if (this.monitoringIntervals.has(shopId)) {
      console.log(`이미 모니터링 중인 쇼핑몰: ${shopId}`);
      return;
    }

    const interval = setInterval(async () => {
      await this.checkNewReviews(shopId);
    }, this.monitoringConfig.checkInterval);

    this.monitoringIntervals.set(shopId, interval);
    console.log(`실시간 모니터링 시작: 쇼핑몰 ${shopId}`);
  }

  /**
   * 실시간 모니터링 중지
   */
  stopRealTimeMonitoring(shopId: number): void {
    const interval = this.monitoringIntervals.get(shopId);
    if (interval) {
      clearInterval(interval);
      this.monitoringIntervals.delete(shopId);
      console.log(`실시간 모니터링 중지: 쇼핑몰 ${shopId}`);
    }
  }

  /**
   * 새 리뷰 체크 (실시간)
   */
  private async checkNewReviews(shopId: number): Promise<void> {
    try {
      // 실제 구현에서는 최근 리뷰들을 가져와야 함
      const recentReviews = await this.getRecentReviews(shopId);
      
      for (const review of recentReviews) {
        const analysis = await this.detector.detectFakeReviews([review]);
        
        if (analysis.length > 0) {
          const result = analysis[0];
          
          if (result.fakeScore >= this.monitoringConfig.alertThreshold) {
            await this.handleSuspiciousReview(shopId, review, result);
          }
        }
      }
    } catch (error) {
      console.error(`새 리뷰 체크 오류 (쇼핑몰 ${shopId}):`, error);
    }
  }

  /**
   * 의심스러운 리뷰 처리
   */
  private async handleSuspiciousReview(
    shopId: number, 
    review: Review, 
    result: FakeReviewResult
  ): Promise<void> {
    const alertId = `${shopId}-${review.id}`;
    
    // 이미 알림이 있는지 확인
    if (this.activeAlerts.has(alertId)) {
      return;
    }

    const alert: RealTimeAlert = {
      id: alertId,
      shopId,
      reviewId: review.id,
      fakeScore: result.fakeScore,
      confidence: result.confidence,
      timestamp: new Date().toISOString(),
      action: this.determineAction(result.fakeScore, result.confidence)
    };

    this.activeAlerts.set(alertId, alert);

    // 알림 전송
    await this.sendAlert(alert);

    // 자동 차단 처리
    if (this.monitoringConfig.autoBlock && alert.action === 'BLOCK') {
      await this.blockReview(review.id);
    }
  }

  /**
   * 액션 결정
   */
  private determineAction(fakeScore: number, confidence: number): 'ALERT' | 'BLOCK' | 'MONITOR' {
    if (fakeScore >= 95 && confidence >= 90) {
      return 'BLOCK'; // 즉시 차단
    } else if (fakeScore >= 85 && confidence >= 80) {
      return 'ALERT'; // 강력 경고
    } else {
      return 'MONITOR'; // 모니터링
    }
  }

  /**
   * 알림 전송
   */
  private async sendAlert(alert: RealTimeAlert): Promise<void> {
    // 실제 구현에서는 웹소켓, 푸시 알림 등을 사용
    console.log(`🚨 실시간 알림: 쇼핑몰 ${alert.shopId}에서 의심스러운 리뷰 발견`);
    console.log(`   - 리뷰 ID: ${alert.reviewId}`);
    console.log(`   - 가짜 점수: ${alert.fakeScore}점`);
    console.log(`   - 신뢰도: ${alert.confidence}점`);
    console.log(`   - 액션: ${alert.action}`);
    
    // 브라우저 알림 (실제 구현)
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('의심스러운 리뷰 발견', {
        body: `쇼핑몰에서 가짜 리뷰가 탐지되었습니다. (${alert.fakeScore}점)`,
        icon: '/favicon.ico'
      });
    }
  }

  /**
   * 리뷰 차단
   */
  private async blockReview(reviewId: string): Promise<void> {
    // 실제 구현에서는 데이터베이스에서 리뷰를 비활성화
    console.log(`🔒 리뷰 차단: ${reviewId}`);
  }

  /**
   * 최근 리뷰 가져오기 (시뮬레이션)
   */
  private async getRecentReviews(shopId: number): Promise<Review[]> {
    // 실제 구현에서는 API 호출
    // 여기서는 시뮬레이션으로 빈 배열 반환
    return [];
  }

  /**
   * 패턴 학습 - 확실한 가짜 리뷰로부터 학습
   */
  async learnFromConfirmedFakes(confirmedFakeReviews: Review[]): Promise<LearningResult> {
    this.learningData.confirmedFakeReviews.push(...confirmedFakeReviews);
    
    // 새로운 패턴 추출
    const newPatterns = await this.extractNewPatterns(confirmedFakeReviews);
    this.learningData.newPatterns.push(...newPatterns);
    
    // 정확도 계산
    const accuracy = await this.calculateAccuracy();
    
    // 오탐률 계산
    const falsePositiveRate = await this.calculateFalsePositiveRate();
    const falseNegativeRate = await this.calculateFalseNegativeRate();
    
    return {
      newPatterns,
      accuracy,
      falsePositiveRate,
      falseNegativeRate
    };
  }

  /**
   * 패턴 학습 - 확실한 진짜 리뷰로부터 학습
   */
  async learnFromConfirmedReals(confirmedRealReviews: Review[]): Promise<LearningResult> {
    this.learningData.confirmedRealReviews.push(...confirmedRealReviews);
    
    // 정확도 재계산
    const accuracy = await this.calculateAccuracy();
    
    // 오탐률 재계산
    const falsePositiveRate = await this.calculateFalsePositiveRate();
    const falseNegativeRate = await this.calculateFalseNegativeRate();
    
    return {
      newPatterns: [],
      accuracy,
      falsePositiveRate,
      falseNegativeRate
    };
  }

  /**
   * 새로운 패턴 추출
   */
  private async extractNewPatterns(reviews: Review[]): Promise<string[]> {
    const patterns: string[] = [];
    
    for (const review of reviews) {
      // 1. 텍스트 패턴 추출
      const textPatterns = this.extractTextPatterns(review.content);
      patterns.push(...textPatterns);
      
      // 2. 시간적 패턴 추출
      const temporalPatterns = this.extractTemporalPatterns(review);
      patterns.push(...temporalPatterns);
    }
    
    // 중복 제거 및 정리
    return [...new Set(patterns)];
  }

  /**
   * 텍스트 패턴 추출
   */
  private extractTextPatterns(content: string): string[] {
    const patterns: string[] = [];
    
    // 반복되는 문구 패턴
    const repetitivePatterns = [
      /상품이\s+\w+습니다\.\s+추천\w+\./g,
      /정말\s+\w+합니다/g,
      /완벽\w+입니다/g
    ];
    
    for (const pattern of repetitivePatterns) {
      const matches = content.match(pattern);
      if (matches) {
        patterns.push(...matches);
      }
    }
    
    return patterns;
  }

  /**
   * 시간적 패턴 추출
   */
  private extractTemporalPatterns(review: Review): string[] {
    const patterns: string[] = [];
    
    // 특정 시간대 패턴
    const hour = new Date(review.createdAt).getHours();
    if (hour >= 9 && hour <= 11) {
      patterns.push('오전 9-11시 집중 작성');
    }
    
    return patterns;
  }

  /**
   * 정확도 계산
   */
  private async calculateAccuracy(): Promise<number> {
    const totalConfirmed = this.learningData.confirmedFakeReviews.length + 
                          this.learningData.confirmedRealReviews.length;
    
    if (totalConfirmed === 0) return 0;
    
    let correctPredictions = 0;
    
    // 가짜 리뷰에 대한 예측 정확도
    for (const fakeReview of this.learningData.confirmedFakeReviews) {
      const analysis = await this.detector.detectFakeReviews([fakeReview]);
      if (analysis.length > 0 && analysis[0].fakeScore >= 70) {
        correctPredictions++;
      }
    }
    
    // 진짜 리뷰에 대한 예측 정확도
    for (const realReview of this.learningData.confirmedRealReviews) {
      const analysis = await this.detector.detectFakeReviews([realReview]);
      if (analysis.length === 0 || analysis[0].fakeScore < 70) {
        correctPredictions++;
      }
    }
    
    return (correctPredictions / totalConfirmed) * 100;
  }

  /**
   * 오탐률 계산 (가짜를 진짜로 잘못 분류)
   */
  private async calculateFalsePositiveRate(): Promise<number> {
    if (this.learningData.confirmedRealReviews.length === 0) return 0;
    
    let falsePositives = 0;
    
    for (const realReview of this.learningData.confirmedRealReviews) {
      const analysis = await this.detector.detectFakeReviews([realReview]);
      if (analysis.length > 0 && analysis[0].fakeScore >= 70) {
        falsePositives++;
      }
    }
    
    return (falsePositives / this.learningData.confirmedRealReviews.length) * 100;
  }

  /**
   * 미탐률 계산 (진짜를 가짜로 잘못 분류)
   */
  private async calculateFalseNegativeRate(): Promise<number> {
    if (this.learningData.confirmedFakeReviews.length === 0) return 0;
    
    let falseNegatives = 0;
    
    for (const fakeReview of this.learningData.confirmedFakeReviews) {
      const analysis = await this.detector.detectFakeReviews([fakeReview]);
      if (analysis.length === 0 || analysis[0].fakeScore < 70) {
        falseNegatives++;
      }
    }
    
    return (falseNegatives / this.learningData.confirmedFakeReviews.length) * 100;
  }

  /**
   * 모니터링 설정 업데이트
   */
  updateMonitoringConfig(config: Partial<RealTimeMonitoringConfig>): void {
    this.monitoringConfig = { ...this.monitoringConfig, ...config };
    console.log('모니터링 설정 업데이트:', this.monitoringConfig);
  }

  /**
   * 활성 알림 조회
   */
  getActiveAlerts(): RealTimeAlert[] {
    return Array.from(this.activeAlerts.values());
  }

  /**
   * 알림 해제
   */
  dismissAlert(alertId: string): void {
    this.activeAlerts.delete(alertId);
  }

  /**
   * 학습 데이터 조회
   */
  getLearningData(): PatternLearningData {
    return { ...this.learningData };
  }

  /**
   * 시스템 상태 조회
   */
  getSystemStatus(): {
    monitoringShops: number;
    activeAlerts: number;
    learningAccuracy: number;
    newPatterns: number;
  } {
    return {
      monitoringShops: this.monitoringIntervals.size,
      activeAlerts: this.activeAlerts.size,
      learningAccuracy: this.learningData.accuracy,
      newPatterns: this.learningData.newPatterns.length
    };
  }
}
