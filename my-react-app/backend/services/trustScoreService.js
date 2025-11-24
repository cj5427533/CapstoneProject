/**
 * 신뢰도 점수 계산 서비스
 */
const supabase = require('../config/supabase');

/**
 * 신뢰도 등급 타입
 * @typedef {'VERY_HIGH' | 'HIGH' | 'CAUTION' | 'LOW' | 'VERY_LOW'} TrustGrade
 */

/**
 * 신뢰도 등급 계산
 * @param {number} finalTrust - 최종 신뢰도 점수 (0~100)
 * @returns {TrustGrade}
 * 기준: 90~100(매우안전/파랑), 70~89(안전/초록), 40~69(주의/노랑), 0~39(의심/주황)
 */
function calculateTrustGrade(finalTrust) {
  if (finalTrust >= 90) return 'VERY_HIGH';  // 매우안전(파랑)
  if (finalTrust >= 70) return 'HIGH';       // 안전(초록)
  if (finalTrust >= 40) return 'CAUTION';    // 주의(노랑)
  return 'LOW';                               // 의심(주황) - 0~39
}

/**
 * 최종 신뢰도 점수 계산
 * @param {Object} params - 계산 파라미터
 * @param {number} params.techRisk - 기술적 위험도 (0~1)
 * @param {number} params.reviewRisk - 리뷰 위험도 (0~1)
 * @param {number} params.reportPenalty - 신고사례 패널티 (0~15)
 * @returns {{finalTrust: number, trustGrade: TrustGrade}}
 */
function calculateFinalTrustScore(params) {
  const { techRisk, reviewRisk, reportPenalty } = params;
  
  // 점수 계산: 100 - (techRisk * 75) - (reviewRisk * 10) - reportPenalty
  const finalTrust = Math.max(
    0,
    Math.min(
      100,
      100 - techRisk * 75 - reviewRisk * 10 - reportPenalty
    )
  );
  
  return {
    finalTrust: Math.round(finalTrust),
    trustGrade: calculateTrustGrade(finalTrust)
  };
}

/**
 * 신뢰도 등급 라벨 반환
 * @param {TrustGrade} grade - 신뢰도 등급
 * @returns {string}
 */
function getTrustGradeLabel(grade) {
  const labels = {
    'VERY_HIGH': '매우안전',
    'HIGH': '안전',
    'CAUTION': '주의',
    'LOW': '의심',
    'VERY_LOW': '의심'
  };
  return labels[grade] || '알 수 없음';
}

/**
 * ML 엔진으로부터 기술적 위험도 가져오기 (임시 구현)
 * TODO: 실제 ML 엔진 연동 필요
 * @param {string} shopUrl - 쇼핑몰 URL
 * @returns {Promise<number>} - 기술적 위험도 (0~1)
 */
async function getTechRiskFromMLEngine(shopUrl) {
  try {
    // TODO: 실제 ML 엔진 API 호출
    // 현재는 임시로 기본값 반환
    // 실제 구현 시: ML 엔진 API 호출하여 techRisk 값 받아오기
    
    // 임시: URL 기반 간단한 위험도 추정
    const urlObj = new URL(shopUrl.startsWith('http') ? shopUrl : 'https://' + shopUrl);
    const domain = urlObj.hostname.toLowerCase();
    
    // 의심스러운 TLD 체크
    const suspiciousTLDs = ['.tk', '.ml', '.ga', '.cf', '.click', '.download'];
    const hasSuspiciousTLD = suspiciousTLDs.some(tld => domain.endsWith(tld));
    
    if (hasSuspiciousTLD) {
      return 0.8; // 높은 위험도
    }
    
    // 기본값: 낮은 위험도
    return 0.1;
  } catch (error) {
    console.error('ML 엔진 기술적 위험도 조회 오류:', error);
    return 0.2; // 에러 시 기본값
  }
}

/**
 * 리뷰 분석 모듈로부터 리뷰 위험도 가져오기 (임시 구현)
 * TODO: 실제 리뷰 분석 모듈 연동 필요
 * @param {number} shopId - 쇼핑몰 ID
 * @returns {Promise<number>} - 리뷰 위험도 (0~1)
 */
async function getReviewRiskFromAnalysis(shopId) {
  try {
    // TODO: 실제 리뷰 분석 모듈 호출
    // 현재는 임시로 기본값 반환
    // 실제 구현 시: 리뷰 분석 모듈 호출하여 reviewRisk 값 받아오기
    
    // 임시: 리뷰 데이터 기반 간단한 위험도 추정
    const { data: ratings, error } = await supabase
      .from('shop_ratings')
      .select('rating, comment')
      .eq('shop_id', shopId);
    
    if (error) {
      console.error('리뷰 조회 오류:', error);
      return 0.2; // 에러 시 기본값
    }
    
    if (!ratings || ratings.length === 0) {
      return 0.1; // 리뷰 없음 → 낮은 위험도
    }
    
    // 5점 리뷰 비율이 너무 높으면 의심
    const fiveStarCount = ratings.filter(r => r.rating === 5).length;
    const fiveStarRatio = fiveStarCount / ratings.length;
    
    if (fiveStarRatio > 0.9) {
      return 0.5; // 90% 이상이 5점이면 중간 위험도
    }
    
    return 0.1; // 기본값: 낮은 위험도
  } catch (error) {
    console.error('리뷰 분석 위험도 조회 오류:', error);
    return 0.2; // 에러 시 기본값
  }
}

/**
 * 관리자 검수된 신고 건수 기반 reportPenalty 계산
 * @param {number} shopId - 쇼핑몰 ID
 * @returns {Promise<number>} - 신고사례 패널티 (0~15)
 */
async function calculateReportPenalty(shopId) {
  try {
    // 관리자가 승인한 신고만 카운트
    const { data: approvedReports, error } = await supabase
      .from('shop_reports')
      .select('id')
      .eq('shop_id', shopId)
      .eq('status', 'approved');
    
    if (error) {
      console.error('신고 조회 오류:', error);
      return 0;
    }
    
    const reportCount = approvedReports ? approvedReports.length : 0;
    
    // 신고 건수에 따른 패널티 계산 (최대 15점)
    if (reportCount === 0) return 0;
    if (reportCount === 1) return 2;
    if (reportCount === 2) return 5;
    if (reportCount <= 4) return 8;
    if (reportCount <= 7) return 12;
    return 15; // 8건 이상
  } catch (error) {
    console.error('신고 패널티 계산 오류:', error);
    return 0;
  }
}

/**
 * 쇼핑몰 신뢰도 점수 저장 (upsert)
 * @param {number} shopId - 쇼핑몰 ID
 * @param {Object} trustData - 신뢰도 데이터
 * @param {number} trustData.techRisk - 기술적 위험도
 * @param {number} trustData.reviewRisk - 리뷰 위험도
 * @param {number} trustData.reportPenalty - 신고사례 패널티
 * @param {number} trustData.finalTrust - 최종 신뢰도
 * @param {TrustGrade} trustData.trustGrade - 신뢰도 등급
 * @param {string} [trustData.modelVersion] - 모델 버전
 * @returns {Promise<Object>}
 */
async function upsertTrustScore(shopId, trustData) {
  try {
    const { data, error } = await supabase
      .from('shop_trust_scores')
      .upsert({
        shop_id: shopId,
        tech_risk: trustData.techRisk,
        review_risk: trustData.reviewRisk,
        report_penalty: trustData.reportPenalty,
        final_trust: trustData.finalTrust,
        trust_grade: trustData.trustGrade,
        model_version: trustData.modelVersion || 'v1.0',
        analyzed_at: new Date().toISOString()
      }, {
        onConflict: 'shop_id'
      })
      .select()
      .single();
    
    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('신뢰도 점수 저장 오류:', error);
    throw error;
  }
}

/**
 * 쇼핑몰 신뢰도 점수 조회
 * @param {number} shopId - 쇼핑몰 ID
 * @returns {Promise<Object|null>}
 */
async function getTrustScore(shopId) {
  try {
    const { data, error } = await supabase
      .from('shop_trust_scores')
      .select('*')
      .eq('shop_id', shopId)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    
    return data || null;
  } catch (error) {
    console.error('신뢰도 점수 조회 오류:', error);
    throw error;
  }
}

module.exports = {
  calculateTrustGrade,
  calculateFinalTrustScore,
  getTrustGradeLabel,
  getTechRiskFromMLEngine,
  getReviewRiskFromAnalysis,
  calculateReportPenalty,
  upsertTrustScore,
  getTrustScore
};

