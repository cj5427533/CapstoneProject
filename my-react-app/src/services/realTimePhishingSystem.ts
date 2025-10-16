// 실시간 피싱 사이트 탐지 시스템
import { PhishingDetector, PhishingResult } from './phishingDetector';

export interface RealTimePhishingConfig {
  enabled: boolean;
  checkInterval: number; // 밀리초
  alertThreshold: number; // 0-100점
  autoBlock: boolean;
  whitelist: string[]; // 신뢰할 수 있는 도메인
  blacklist: string[]; // 확실히 위험한 도메인
}

export interface PhishingAlert {
  id: string;
  url: string;
  phishingScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  timestamp: string;
  action: 'ALERT' | 'BLOCK' | 'MONITOR';
  reasons: string[];
}

export interface PhishingStats {
  totalChecks: number;
  phishingDetected: number;
  falsePositives: number;
  accuracy: number;
  blockedSites: number;
}

export interface DomainReputation {
  domain: string;
  reputation: 'TRUSTED' | 'NEUTRAL' | 'SUSPICIOUS' | 'MALICIOUS';
  score: number;
  lastChecked: string;
  sources: string[];
}

export class RealTimePhishingSystem {
  private static instance: RealTimePhishingSystem;
  private detector: PhishingDetector;
  private config: RealTimePhishingConfig;
  private activeAlerts: Map<string, PhishingAlert>;
  private domainReputation: Map<string, DomainReputation>;
  private phishingStats: PhishingStats;
  private checkHistory: Map<string, PhishingResult[]>;
  
  private constructor() {
    this.detector = PhishingDetector.getInstance();
    this.config = {
      enabled: true,
      checkInterval: 10000, // 10초마다 체크
      alertThreshold: 70, // 70점 이상 시 알림
      autoBlock: false,
      whitelist: [
        'naver.com', 'daum.net', 'google.com', 'amazon.com',
        'coupang.com', '11st.co.kr', 'gmarket.co.kr', 'auction.co.kr',
        'ssg.com', 'lotte.com', 'wemakeprice.com'
      ],
      blacklist: []
    };
    this.activeAlerts = new Map();
    this.domainReputation = new Map();
    this.phishingStats = {
      totalChecks: 0,
      phishingDetected: 0,
      falsePositives: 0,
      accuracy: 0,
      blockedSites: 0
    };
    this.checkHistory = new Map();
  }
  
  public static getInstance(): RealTimePhishingSystem {
    if (!RealTimePhishingSystem.instance) {
      RealTimePhishingSystem.instance = new RealTimePhishingSystem();
    }
    return RealTimePhishingSystem.instance;
  }

  /**
   * 실시간 피싱 탐지 (URL 입력 시 즉시 체크)
   */
  async detectPhishingRealTime(url: string): Promise<PhishingAlert | null> {
    try {
      // 1. 화이트리스트 체크
      if (this.isWhitelisted(url)) {
        return null; // 신뢰할 수 있는 사이트
      }
      
      // 2. 블랙리스트 체크
      if (this.isBlacklisted(url)) {
        return this.createAlert(url, 100, 'CRITICAL', ['확실히 위험한 사이트로 분류됨']);
      }
      
      // 3. 도메인 평판 체크
      const reputation = await this.checkDomainReputation(url);
      if (reputation && reputation.reputation === 'MALICIOUS') {
        return this.createAlert(url, 95, 'CRITICAL', ['악성 사이트로 분류됨']);
      }
      
      // 4. AI 기반 피싱 탐지
      const phishingResult = await this.detector.detectPhishing(url);
      
      // 5. 통계 업데이트
      this.updateStats(phishingResult);
      
      // 6. 알림 생성 (임계값 이상인 경우)
      if (phishingResult.phishingScore >= this.config.alertThreshold) {
        const alert = this.createAlert(
          url, 
          phishingResult.phishingScore, 
          phishingResult.riskLevel, 
          phishingResult.reasons
        );
        
        // 7. 실시간 알림 전송
        await this.sendRealTimeAlert(alert);
        
        // 8. 자동 차단 처리
        if (this.config.autoBlock && alert.action === 'BLOCK') {
          await this.blockSite(url);
        }
        
        return alert;
      }
      
      return null;
      
    } catch (error) {
      console.error('실시간 피싱 탐지 오류:', error);
      return null;
    }
  }

  /**
   * 화이트리스트 체크
   */
  private isWhitelisted(url: string): boolean {
    const domain = this.extractDomain(url);
    return this.config.whitelist.some(whitelistedDomain => 
      domain.includes(whitelistedDomain)
    );
  }

  /**
   * 블랙리스트 체크
   */
  private isBlacklisted(url: string): boolean {
    const domain = this.extractDomain(url);
    return this.config.blacklist.some(blacklistedDomain => 
      domain.includes(blacklistedDomain)
    );
  }

  /**
   * 도메인 평판 체크
   */
  private async checkDomainReputation(url: string): Promise<DomainReputation | null> {
    const domain = this.extractDomain(url);
    
    // 캐시된 평판 정보 확인
    if (this.domainReputation.has(domain)) {
      const reputation = this.domainReputation.get(domain)!;
      const lastChecked = new Date(reputation.lastChecked);
      const now = new Date();
      
      // 24시간 이내 체크한 경우 캐시 사용
      if (now.getTime() - lastChecked.getTime() < 24 * 60 * 60 * 1000) {
        return reputation;
      }
    }
    
    // 새로운 평판 정보 조회
    const reputation = await this.fetchDomainReputation(domain);
    if (reputation) {
      this.domainReputation.set(domain, reputation);
    }
    
    return reputation;
  }

  /**
   * 도메인 평판 정보 조회 (시뮬레이션)
   */
  private async fetchDomainReputation(domain: string): Promise<DomainReputation | null> {
    // 실제 구현에서는 외부 평판 서비스 API를 사용해야 함
    // 여기서는 시뮬레이션으로 구현
    
    const suspiciousDomains = [
      'fake-shop.com', 'scam-store.com', 'phishing-site.com'
    ];
    
    if (suspiciousDomains.some(suspicious => domain.includes(suspicious))) {
      return {
        domain,
        reputation: 'MALICIOUS',
        score: 95,
        lastChecked: new Date().toISOString(),
        sources: ['내부 블랙리스트', '사용자 신고']
      };
    }
    
    return {
      domain,
      reputation: 'NEUTRAL',
      score: 50,
      lastChecked: new Date().toISOString(),
      sources: ['기본값']
    };
  }

  /**
   * 알림 생성
   */
  private createAlert(
    url: string, 
    score: number, 
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    reasons: string[]
  ): PhishingAlert {
    const alertId = `phishing-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const alert: PhishingAlert = {
      id: alertId,
      url,
      phishingScore: score,
      riskLevel,
      timestamp: new Date().toISOString(),
      action: this.determineAction(score, riskLevel),
      reasons
    };
    
    this.activeAlerts.set(alertId, alert);
    return alert;
  }

  /**
   * 액션 결정
   */
  private determineAction(
    score: number, 
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  ): 'ALERT' | 'BLOCK' | 'MONITOR' {
    if (riskLevel === 'CRITICAL' || score >= 95) {
      return 'BLOCK'; // 즉시 차단
    } else if (riskLevel === 'HIGH' || score >= 80) {
      return 'ALERT'; // 강력 경고
    } else {
      return 'MONITOR'; // 모니터링
    }
  }

  /**
   * 실시간 알림 전송
   */
  private async sendRealTimeAlert(alert: PhishingAlert): Promise<void> {
    console.log(`🚨 실시간 피싱 알림: ${alert.url}`);
    console.log(`   - 피싱 점수: ${alert.phishingScore}점`);
    console.log(`   - 위험도: ${alert.riskLevel}`);
    console.log(`   - 액션: ${alert.action}`);
    console.log(`   - 이유: ${alert.reasons.join(', ')}`);
    
    // 브라우저 알림
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification('피싱 사이트 탐지', {
          body: `위험한 사이트가 탐지되었습니다. (${alert.phishingScore}점)`,
          icon: '/favicon.ico',
          tag: alert.id
        });
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            new Notification('피싱 사이트 탐지', {
              body: `위험한 사이트가 탐지되었습니다. (${alert.phishingScore}점)`,
              icon: '/favicon.ico',
              tag: alert.id
            });
          }
        });
      }
    }
    
    // 웹소켓을 통한 실시간 알림 (실제 구현)
    // this.sendWebSocketAlert(alert);
  }

  /**
   * 사이트 차단
   */
  private async blockSite(url: string): Promise<void> {
    console.log(`🔒 사이트 차단: ${url}`);
    this.phishingStats.blockedSites++;
    
    // 실제 구현에서는 브라우저 확장 프로그램이나 
    // 네트워크 레벨에서 차단해야 함
  }

  /**
   * 통계 업데이트
   */
  private updateStats(result: PhishingResult): void {
    this.phishingStats.totalChecks++;
    
    if (result.phishingScore >= 70) {
      this.phishingStats.phishingDetected++;
    }
    
    // 정확도 계산 (실제 구현에서는 더 정교한 계산 필요)
    this.phishingStats.accuracy = this.calculateAccuracy();
  }

  /**
   * 정확도 계산
   */
  private calculateAccuracy(): number {
    if (this.phishingStats.totalChecks === 0) return 0;
    
    const correctDetections = this.phishingStats.phishingDetected - this.phishingStats.falsePositives;
    return (correctDetections / this.phishingStats.totalChecks) * 100;
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
   * 설정 업데이트
   */
  updateConfig(config: Partial<RealTimePhishingConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('피싱 탐지 설정 업데이트:', this.config);
  }

  /**
   * 화이트리스트에 도메인 추가
   */
  addToWhitelist(domain: string): void {
    if (!this.config.whitelist.includes(domain)) {
      this.config.whitelist.push(domain);
      console.log(`화이트리스트에 추가: ${domain}`);
    }
  }

  /**
   * 블랙리스트에 도메인 추가
   */
  addToBlacklist(domain: string): void {
    if (!this.config.blacklist.includes(domain)) {
      this.config.blacklist.push(domain);
      console.log(`블랙리스트에 추가: ${domain}`);
    }
  }

  /**
   * 활성 알림 조회
   */
  getActiveAlerts(): PhishingAlert[] {
    return Array.from(this.activeAlerts.values());
  }

  /**
   * 알림 해제
   */
  dismissAlert(alertId: string): void {
    this.activeAlerts.delete(alertId);
  }

  /**
   * 통계 조회
   */
  getStats(): PhishingStats {
    return { ...this.phishingStats };
  }

  /**
   * 도메인 평판 조회
   */
  getDomainReputation(domain: string): DomainReputation | null {
    return this.domainReputation.get(domain) || null;
  }

  /**
   * 체크 히스토리 조회
   */
  getCheckHistory(url: string): PhishingResult[] {
    return this.checkHistory.get(url) || [];
  }

  /**
   * 시스템 상태 조회
   */
  getSystemStatus(): {
    enabled: boolean;
    activeAlerts: number;
    totalChecks: number;
    accuracy: number;
    whitelistSize: number;
    blacklistSize: number;
  } {
    return {
      enabled: this.config.enabled,
      activeAlerts: this.activeAlerts.size,
      totalChecks: this.phishingStats.totalChecks,
      accuracy: this.phishingStats.accuracy,
      whitelistSize: this.config.whitelist.length,
      blacklistSize: this.config.blacklist.length
    };
  }
}
