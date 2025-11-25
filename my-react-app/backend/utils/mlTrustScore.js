/**
 * ML 예측 결과를 trust score로 변환하는 유틸리티 함수
 * @param {number} label - ML 예측 레이블 (0: SAFE, 1: PHISHING)
 * @param {number} confidence - 0~1 사이의 신뢰도
 * @returns {number} 0~100 사이의 trustScore (소수점 첫째 자리까지)
 */
function computeMlTrustScore(label, confidence) {
  // confidence 값이 유효한 범위인지 확인
  if (typeof confidence !== 'number' || isNaN(confidence) || confidence < 0 || confidence > 1) {
    console.warn(`Invalid confidence value: ${confidence}, using default 0.5`);
    confidence = 0.5;
  }
  
  let trustScore;
  if (label === 0) {
    // SAFE: confidence가 높을수록 높은 trustScore
    // confidence를 0.1~0.99 범위로 정규화하여 더 다양한 점수 생성
    const normalizedConfidence = Math.max(0.1, Math.min(0.99, confidence));
    trustScore = 100 * normalizedConfidence;
  } else if (label === 1) {
    // PHISHING: confidence가 높을수록 낮은 trustScore
    // confidence를 0.1~0.99 범위로 정규화하여 더 다양한 점수 생성
    const normalizedConfidence = Math.max(0.1, Math.min(0.99, confidence));
    trustScore = 100 * (1 - normalizedConfidence);
  } else {
    // 기본값 (예상치 못한 경우)
    trustScore = 50;
  }
  
  // 소수점 첫째 자리까지 반올림 (0.1 단위)
  // 100점은 정확히 100.0 이상일 때만 부여
  if (trustScore >= 100.0) {
    return 100;
  }
  
  // 0.1 단위로 반올림하여 더 다양한 점수 생성
  return Math.max(0, Math.min(99.9, Math.round(trustScore * 10) / 10));
}

module.exports = {
  computeMlTrustScore
};

