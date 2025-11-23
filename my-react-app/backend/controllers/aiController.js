/**
 * AI 분석 관련 컨트롤러
 */
const aiService = require('../services/aiService');
const { success, error } = require('../utils/response');
const { sanitizeInput, validateUrl } = require('../utils/validation');

/**
 * 피싱 탐지
 * 
 * TODO: Integrate ML prediction into phishing detection:
 * - Import runPhishingMLPrediction helper from server.js (or extract to a service)
 * - Call: const ml = await runPhishingMLPrediction(inputUrl, req);
 * - Combine ml.label / ml.confidence with existing rule-based score from aiService
 * - Enhance detection accuracy by merging ML predictions with rule-based analysis
 */
exports.detectPhishing = async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return error(res, 'URL이 필요합니다.', 400);
    }

    const cleanUrl = sanitizeInput(url);
    if (!validateUrl(cleanUrl)) {
      return error(res, '올바른 URL 형식을 입력해주세요.', 400);
    }

    const result = await aiService.detectPhishing(cleanUrl);

    return success(res, { result });
  } catch (err) {
    console.error('피싱 탐지 오류:', err);
    return error(res, `피싱 탐지 중 오류가 발생했습니다: ${err.message}`, 500);
  }
};

