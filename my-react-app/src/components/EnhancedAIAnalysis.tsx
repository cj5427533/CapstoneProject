import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { EnhancedShopRiskAnalyzer, EnhancedShopRiskResult, EnhancedReport, BusinessRegistration, WebAnalysis } from '../services/enhancedShopRiskAnalyzer';
import { WebCrawlingAnalyzer, WebCrawlingResult } from '../services/webCrawlingAnalyzer';
import { Shop, Rating } from '../utils/api';

interface EnhancedAIAnalysisProps {
  shop: Shop;
  reports: EnhancedReport[];
  ratings: Rating[];
  shopUrl: string;
}

interface AnalysisCache {
  riskAnalysis: EnhancedShopRiskResult | null;
  webAnalysis: WebCrawlingResult | null;
  businessData: BusinessRegistration | null;
  lastUpdated: Date | null;
}

export const EnhancedAIAnalysis: React.FC<EnhancedAIAnalysisProps> = ({
  shop,
  reports,
  ratings,
  shopUrl
}) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<AnalysisCache>({
    riskAnalysis: null,
    webAnalysis: null,
    businessData: null,
    lastUpdated: null
  });
  const [showDetails, setShowDetails] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [currentAnalysisStep, setCurrentAnalysisStep] = useState('');

  // 분석 실행
  const runEnhancedAnalysis = async () => {
    if (!shop || shop.id <= 0) {
      toast.error('유효한 쇼핑몰 정보가 필요합니다.');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisProgress(0);
    setCurrentAnalysisStep('분석 준비 중...');

    try {
      const analyzer = EnhancedShopRiskAnalyzer.getInstance();
      const webAnalyzer = WebCrawlingAnalyzer.getInstance();

      // 1. 웹 크롤링 분석
      setAnalysisProgress(20);
      setCurrentAnalysisStep('웹 크롤링 분석 중...');
      
      const webAnalysis = await webAnalyzer.analyzeWebsite(shopUrl);
      
      // 2. 사업자 등록 정보 조회 (모의 데이터)
      setAnalysisProgress(40);
      setCurrentAnalysisStep('사업자 등록 정보 확인 중...');
      
      const businessData: BusinessRegistration = {
        id: 1,
        shop_id: shop.id,
        business_number: '123-45-67890',
        registration_date: '2022-01-01',
        business_status: Math.random() > 0.5 ? 'ACTIVE' : 'SUSPENDED',
        business_type: '온라인쇼핑몰',
        capital_amount: 10000000,
        representative_name: '홍길동',
        business_address: '서울시 강남구',
        phone_number: '02-1234-5678',
        email: 'info@example.com',
        last_verified: new Date().toISOString(),
        verification_source: 'API'
      };

      // 3. 개선된 위험도 분석
      setAnalysisProgress(70);
      setCurrentAnalysisStep('AI 위험도 분석 중...');
      
      const riskAnalysis = await analyzer.analyzeShopRisk(
        shop,
        reports,
        businessData,
        {
          id: 1,
          shop_id: shop.id,
          suspicious_keywords: webAnalysis.suspiciousKeywords,
          price_analysis: webAnalysis.priceAnalysis,
          technical_analysis: webAnalysis.technicalAnalysis,
          analysis_date: new Date().toISOString(),
          confidence_score: webAnalysis.confidenceScore
        } as WebAnalysis,
        ratings
      );

      setAnalysisProgress(100);
      setCurrentAnalysisStep('분석 완료!');

      setAnalysisResults({
        riskAnalysis,
        webAnalysis,
        businessData,
        lastUpdated: new Date()
      });

      toast.success('AI 분석이 완료되었습니다!');

    } catch (error) {
      console.error('Enhanced AI 분석 에러:', error);
      toast.error('분석 중 오류가 발생했습니다.');
    } finally {
      setIsAnalyzing(false);
      setCurrentAnalysisStep('');
      setAnalysisProgress(0);
    }
  };

  // 분석 결과 요약 컴포넌트
  const AnalysisSummary = () => {
    if (!analysisResults.riskAnalysis) return null;

    const { riskAnalysis, webAnalysis, businessData } = analysisResults;
    const { riskScore, riskLevel, evidenceSummary } = riskAnalysis;

    return (
      <div className="analysis-summary">
        <div className="summary-header">
          <h3>🎯 AI 분석 결과 요약</h3>
          <div className="risk-badge">
            <span className={`risk-level ${riskLevel.toLowerCase()}`}>
              {riskLevel === 'CRITICAL' && '🚨 매우 위험'}
              {riskLevel === 'HIGH' && '⚠️ 주의 필요'}
              {riskLevel === 'MEDIUM' && '⚡ 보통 수준'}
              {riskLevel === 'LOW' && '✅ 상대적 안전'}
            </span>
            <span className="risk-score">{riskScore}점</span>
          </div>
        </div>

        <div className="analysis-breakdown">
          <div className="breakdown-item">
            <span className="label">객관적 데이터 분석:</span>
            <span className="score">{riskAnalysis.analysis.objectiveDataAnalysis}점</span>
          </div>
          <div className="breakdown-item">
            <span className="label">증빙 기반 분석:</span>
            <span className="score">{riskAnalysis.analysis.evidenceBasedAnalysis}점</span>
          </div>
          <div className="breakdown-item">
            <span className="label">평점 분석:</span>
            <span className="score">{riskAnalysis.analysis.ratingAnalysis}점</span>
          </div>
        </div>

        <div className="evidence-summary">
          <h4>📋 증빙 요약</h4>
          <div className="evidence-stats">
            <div className="stat">
              <span className="label">총 피해 사례 제보:</span>
              <span className="value">{evidenceSummary.totalReports}건</span>
            </div>
            <div className="stat">
              <span className="label">검증된 제보:</span>
              <span className="value">{evidenceSummary.verifiedReports}건</span>
            </div>
            <div className="stat">
              <span className="label">검증률:</span>
              <span className="value">{evidenceSummary.verificationRate}%</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // 상세 분석 결과 컴포넌트
  const DetailedAnalysis = () => {
    if (!analysisResults.riskAnalysis || !analysisResults.webAnalysis) return null;

    const { riskAnalysis, webAnalysis, businessData } = analysisResults;

    return (
      <div className="detailed-analysis">
        <h3>🔍 상세 분석 결과</h3>

        {/* 객관적 데이터 분석 */}
        <div className="analysis-section">
          <h4>📊 객관적 데이터 분석 (60% 가중치)</h4>
          
          {/* 사업자 등록 정보 */}
          <div className="business-info">
            <h5>🏢 사업자 등록 정보</h5>
            <div className="info-grid">
              <div className="info-item">
                <span className="label">사업자등록번호:</span>
                <span className="value">{businessData?.business_number || '미등록'}</span>
              </div>
              <div className="info-item">
                <span className="label">사업 상태:</span>
                <span className={`value status-${businessData?.business_status?.toLowerCase()}`}>
                  {businessData?.business_status === 'ACTIVE' ? '🟢 운영중' : 
                   businessData?.business_status === 'SUSPENDED' ? '🟡 휴업' : '🔴 폐업'}
                </span>
              </div>
              <div className="info-item">
                <span className="label">등록자본금:</span>
                <span className="value">{businessData?.capital_amount?.toLocaleString() || '정보없음'}원</span>
              </div>
            </div>
          </div>

          {/* 웹 크롤링 분석 */}
          <div className="web-analysis">
            <h5>🌐 웹 크롤링 분석</h5>
            <div className="web-results">
              {webAnalysis.suspiciousKeywords.length > 0 && (
                <div className="suspicious-keywords">
                  <span className="label">의심 키워드:</span>
                  <div className="keywords">
                    {webAnalysis.suspiciousKeywords.map((keyword, index) => (
                      <span key={index} className="keyword">{keyword}</span>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="technical-info">
                <div className="tech-item">
                  <span className="label">SSL 인증서:</span>
                  <span className={`value ${webAnalysis.technicalAnalysis.sslCertificate ? 'positive' : 'negative'}`}>
                    {webAnalysis.technicalAnalysis.sslCertificate ? '✅ 있음' : '❌ 없음'}
                  </span>
                </div>
                <div className="tech-item">
                  <span className="label">도메인 연령:</span>
                  <span className="value">{webAnalysis.technicalAnalysis.domainAge}일</span>
                </div>
                <div className="tech-item">
                  <span className="label">서버 위치:</span>
                  <span className="value">{webAnalysis.technicalAnalysis.serverLocation}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 증빙 기반 분석 */}
        <div className="analysis-section">
          <h4>📋 증빙 기반 분석 (30% 가중치)</h4>
          <div className="evidence-analysis">
            <div className="evidence-types">
              <h5>증빙 유형별 분포</h5>
              <div className="evidence-grid">
                {Object.entries(riskAnalysis.evidenceSummary.evidenceTypes).map(([type, count]) => (
                  <div key={type} className="evidence-type">
                    <span className="type">{this.getEvidenceTypeText(type)}</span>
                    <span className="count">{count}건</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 권장사항 */}
        <div className="analysis-section">
          <h4>💡 권장사항</h4>
          <div className="recommendations">
            {riskAnalysis.recommendations.map((recommendation, index) => (
              <div key={index} className="recommendation">
                {recommendation}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // 증빙 유형 텍스트 변환
  const getEvidenceTypeText = (type: string): string => {
    const typeMap: Record<string, string> = {
      'NONE': '증빙 없음',
      'RECEIPT': '구매 영수증',
      'CONTRACT': '계약서',
      'PAYMENT_RECORD': '입금 내역',
      'COMMUNICATION': '고객센터 대화'
    };
    return typeMap[type] || type;
  };

  return (
    <div className="enhanced-ai-analysis">
      <div className="analysis-header">
        <h2>🔍 피싱 사이트 검사 시스템</h2>
        <p className="analysis-description">
          객관적 데이터 60% + 증빙 기반 리뷰 30% + 일반 평점 10%의 혁신적 분석 시스템
        </p>
      </div>

      {!analysisResults.riskAnalysis && (
        <div className="analysis-start">
          <div className="start-content">
            <h3>🚀 AI 분석 시작</h3>
            <p>다층적 AI 분석을 통해 쇼핑몰의 신뢰도를 정확히 평가합니다.</p>
            <button 
              onClick={runEnhancedAnalysis}
              disabled={isAnalyzing}
              className="start-analysis-btn"
            >
              {isAnalyzing ? '분석 중...' : 'AI 분석 시작'}
            </button>
          </div>
        </div>
      )}

      {isAnalyzing && (
        <div className="analysis-progress">
          <div className="progress-header">
            <h3>🔄 AI 분석 진행 중</h3>
            <span className="progress-text">{currentAnalysisStep}</span>
          </div>
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${analysisProgress}%` }}
            ></div>
          </div>
          <div className="progress-percentage">{analysisProgress}%</div>
        </div>
      )}

      {analysisResults.riskAnalysis && (
        <>
          <AnalysisSummary />
          
          <div className="analysis-actions">
            <button 
              onClick={() => setShowDetails(!showDetails)}
              className="toggle-details-btn"
            >
              {showDetails ? '간단히 보기' : '상세 분석 보기'}
            </button>
            <button 
              onClick={runEnhancedAnalysis}
              className="refresh-analysis-btn"
            >
              🔄 분석 새로고침
            </button>
          </div>

          {showDetails && <DetailedAnalysis />}
        </>
      )}

      <style jsx>{`
        .enhanced-ai-analysis {
          background: white;
          border-radius: 12px;
          padding: 2rem;
          margin: 2rem 0;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }

        .analysis-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .analysis-header h2 {
          color: #333;
          margin-bottom: 0.5rem;
        }

        .analysis-description {
          color: #666;
          font-size: 0.9rem;
        }

        .analysis-start {
          text-align: center;
          padding: 3rem 2rem;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 12px;
          color: white;
        }

        .start-analysis-btn {
          background: white;
          color: #667eea;
          border: none;
          padding: 1rem 2rem;
          border-radius: 8px;
          font-size: 1.1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
          margin-top: 1rem;
        }

        .start-analysis-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(0,0,0,0.2);
        }

        .start-analysis-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .analysis-progress {
          background: #f8f9fa;
          border-radius: 12px;
          padding: 2rem;
          text-align: center;
        }

        .progress-bar {
          background: #e9ecef;
          height: 8px;
          border-radius: 4px;
          overflow: hidden;
          margin: 1rem 0;
        }

        .progress-fill {
          background: linear-gradient(90deg, #667eea, #764ba2);
          height: 100%;
          transition: width 0.3s ease;
        }

        .analysis-summary {
          background: #f8f9fa;
          border-radius: 12px;
          padding: 2rem;
          margin-bottom: 2rem;
        }

        .summary-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .risk-badge {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .risk-level {
          padding: 0.5rem 1rem;
          border-radius: 20px;
          font-weight: 600;
          font-size: 0.9rem;
        }

        .risk-level.critical { background: #fee; color: #d32f2f; }
        .risk-level.high { background: #fff3e0; color: #f57c00; }
        .risk-level.medium { background: #e3f2fd; color: #1976d2; }
        .risk-level.low { background: #e8f5e8; color: #388e3c; }

        .risk-score {
          font-size: 1.5rem;
          font-weight: 700;
          color: #333;
        }

        .analysis-breakdown {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .breakdown-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          background: white;
          border-radius: 8px;
          border-left: 4px solid #667eea;
        }

        .evidence-summary {
          background: white;
          border-radius: 8px;
          padding: 1.5rem;
        }

        .evidence-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 1rem;
          margin-top: 1rem;
        }

        .stat {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.5rem 0;
          border-bottom: 1px solid #eee;
        }

        .analysis-actions {
          display: flex;
          gap: 1rem;
          justify-content: center;
          margin: 2rem 0;
        }

        .toggle-details-btn,
        .refresh-analysis-btn {
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 8px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s;
        }

        .toggle-details-btn {
          background: #667eea;
          color: white;
        }

        .refresh-analysis-btn {
          background: #28a745;
          color: white;
        }

        .detailed-analysis {
          background: #f8f9fa;
          border-radius: 12px;
          padding: 2rem;
        }

        .analysis-section {
          background: white;
          border-radius: 8px;
          padding: 1.5rem;
          margin-bottom: 2rem;
        }

        .info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1rem;
          margin-top: 1rem;
        }

        .info-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem;
          background: #f8f9fa;
          border-radius: 6px;
        }

        .keywords {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-top: 0.5rem;
        }

        .keyword {
          background: #ffebee;
          color: #d32f2f;
          padding: 0.25rem 0.5rem;
          border-radius: 12px;
          font-size: 0.8rem;
        }

        .technical-info {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          margin-top: 1rem;
        }

        .tech-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem;
          background: #f8f9fa;
          border-radius: 6px;
        }

        .value.positive { color: #388e3c; }
        .value.negative { color: #d32f2f; }

        .recommendations {
          margin-top: 1rem;
        }

        .recommendation {
          padding: 0.75rem;
          background: #e3f2fd;
          border-left: 4px solid #1976d2;
          border-radius: 4px;
          margin-bottom: 0.5rem;
        }

        @media (max-width: 768px) {
          .enhanced-ai-analysis {
            padding: 1rem;
          }

          .summary-header {
            flex-direction: column;
            gap: 1rem;
            text-align: center;
          }

          .analysis-breakdown {
            grid-template-columns: 1fr;
          }

          .analysis-actions {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
};
