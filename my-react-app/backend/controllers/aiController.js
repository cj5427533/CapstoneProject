/**
 * AI 분석 관련 컨트롤러
 */
const aiService = require('../services/aiService');
const { success, error } = require('../utils/response');
const { sanitizeInput, validateUrl } = require('../utils/validation');
const { normalizeUrl } = require('../utils/url');
const { computeMlTrustScore } = require('../utils/mlTrustScore');
const supabase = require('../config/supabase');

// server.js에서 runPhishingMLPrediction 함수 가져오기
// (server.js에서 export하지 않으므로 직접 구현하거나 server.js를 수정해야 함)
// 일단 여기서 직접 구현하거나, server.js에서 export하도록 수정
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// computeMlTrustScore는 utils/mlTrustScore.js에서 import됨

/**
 * 피싱 URL ML 예측 실행
 * @param {string} rawUrl - 원본 URL
 * @param {object} req - Express request 객체
 * @returns {Promise<object>} 예측 결과 { url, normalizedUrl, label, confidence, id }
 */
async function runPhishingMLPrediction(rawUrl, req) {
  const normalized = normalizeUrl(rawUrl);
  const urls = [normalized];
  
  return new Promise((resolve, reject) => {
    // 가상환경 Python 경로 확인
    const mlDir = path.join(__dirname, "..", "ml");
    const venvPythonPath = process.platform === 'win32' 
      ? path.join(mlDir, ".venv-ml", "Scripts", "python.exe")
      : path.join(mlDir, ".venv-ml", "bin", "python");
    
    // 시스템 Python 경로 (fallback)
    const systemPythonCmd = process.platform === 'win32' ? 'python' : 'python3';
    
    // 가상환경 Python이 존재하면 사용, 없으면 시스템 Python 사용
    let pythonCmd;
    if (fs.existsSync(venvPythonPath)) {
      pythonCmd = venvPythonPath;
      console.log('가상환경 Python 사용:', pythonCmd);
    } else {
      pythonCmd = systemPythonCmd;
      console.log('시스템 Python 사용:', pythonCmd);
    }
    
    const scriptPath = path.join(mlDir, "predict.py");
    
    console.log(`Python 실행: ${pythonCmd} ${scriptPath}`);
    console.log(`입력 URL: ${JSON.stringify(urls)}`);
    
    const py = spawn(pythonCmd, [scriptPath]);
    let data = "";
    let errData = "";
    
    py.stdin.write(JSON.stringify(urls));
    py.stdin.end();
    
    py.stdout.on("data", (chunk) => {
      data += chunk.toString();
    });
    
    py.stderr.on("data", (chunk) => {
      errData += chunk.toString();
    });
    
    py.on("error", (error) => {
      console.error("Python 프로세스 실행 오류:", error);
      reject(new Error(`Python 실행 실패: ${error.message}. Python이 설치되어 있는지 확인하세요.`));
    });
    
    py.on("close", async (code) => {
      if (code !== 0) {
        console.error(`Python 프로세스 종료 코드: ${code}`);
        console.error("Python stderr:", errData);
        return reject(new Error(`Python 스크립트 실행 실패 (종료 코드: ${code}): ${errData || '알 수 없는 오류'}`));
      }
      
      if (errData && !errData.includes('Warning')) {
        console.warn("Python stderr (경고):", errData);
      }
      
      if (!data || data.trim() === "") {
        console.error("Python stdout가 비어있습니다.");
        console.error("Python stderr:", errData);
        return reject(new Error(`ML 모델이 빈 응답을 반환했습니다. Python 오류: ${errData || '알 수 없는 오류'}`));
      }
      
      try {
        const parsed = JSON.parse(data.trim());
        if (!Array.isArray(parsed) || parsed.length === 0) {
          return reject(new Error("ML 모델 응답 형식이 올바르지 않습니다."));
        }
        
        const result = parsed[0];
        
        // safe defaults
        const label = typeof result.label === "number" ? result.label : 0;
        const confidence = typeof result.confidence === "number" ? result.confidence : 0;
        
        console.log(`ML 예측 결과: label=${label}, confidence=${confidence}`);
        
        // log into Supabase
        try {
          const requester =
            (req && (req.ip || req.headers["x-forwarded-for"])) || "unknown";
          
          const { data: saved, error } = await supabase
            .from("ml_prediction_results")
            .insert([
              {
                url: rawUrl,
                normalized_url: normalized,
                label,
                confidence,
                requested_by: requester,
                source: "API",
              },
            ])
            .select();
          
          if (error) {
            console.error("Supabase ml_prediction_results insert error:", error);
          }
          
          // 실제 저장된 값 확인
          if (saved && saved[0]) {
            console.log(`[ML 예측 저장] 저장된 값: label=${saved[0].label}, confidence=${saved[0].confidence}, id=${saved[0].id}`);
            // 저장된 값을 사용하여 반환
            resolve({
              url: saved[0].url || rawUrl,
              normalizedUrl: saved[0].normalized_url || normalized,
              label: saved[0].label,
              confidence: saved[0].confidence,
              id: saved[0].id,
            });
          } else {
            // 저장 실패 시 원본 값 반환
            resolve({
              url: rawUrl,
              normalizedUrl: normalized,
              label,
              confidence,
              id: null,
            });
          }
        } catch (dbErr) {
          console.error("ML log DB error:", dbErr);
          // Still resolve with prediction even if logging fails
          resolve({
            url: rawUrl,
            normalizedUrl: normalized,
            label,
            confidence,
            id: null,
          });
        }
      } catch (e) {
        console.error("JSON 파싱 오류:", e);
        console.error("받은 데이터:", data);
        reject(new Error(`ML 모델 응답 파싱 실패: ${e.message}`));
      }
    });
  });
}

/**
 * URL 기반 신고 정보 조회 (참고용)
 * @param {string} url - 쇼핑몰 URL
 * @returns {Promise<object>} 신고 요약 정보
 */
async function getReportsSummary(url) {
  try {
    const normalizedUrl = normalizeUrl(url);
    
    // 쇼핑몰 찾기
    const { data: shops, error: shopError } = await supabase
      .from('shops')
      .select('id, parent_shop_id')
      .eq('url', normalizedUrl)
      .single();
    
    if (shopError && shopError.code === 'PGRST116') {
      // 쇼핑몰이 없으면 신고도 없음
      return {
        totalReports: 0,
        verifiedReports: 0,
        latestReportAt: null
      };
    }
    
    if (shopError) {
      console.error('신고 정보 조회 중 쇼핑몰 조회 오류:', shopError);
      return {
        totalReports: 0,
        verifiedReports: 0,
        latestReportAt: null
      };
    }
    
    const shopId = shops.parent_shop_id || shops.id;
    
    // 신고 정보 조회
    const { data: reports, error: reportError } = await supabase
      .from('shop_reports')
      .select('id, status, created_at')
      .eq('shop_id', shopId)
      .order('created_at', { ascending: false });
    
    if (reportError) {
      console.error('신고 정보 조회 오류:', reportError);
      return {
        totalReports: 0,
        verifiedReports: 0,
        latestReportAt: null
      };
    }
    
    const totalReports = reports ? reports.length : 0;
    const verifiedReports = reports ? reports.filter(r => r.status === 'approved').length : 0;
    const latestReport = reports && reports.length > 0 ? reports[0] : null;
    
    return {
      totalReports,
      verifiedReports,
      latestReportAt: latestReport ? latestReport.created_at : null
    };
  } catch (err) {
    console.error('신고 정보 조회 중 오류:', err);
    return {
      totalReports: 0,
      verifiedReports: 0,
      latestReportAt: null
    };
  }
}

/**
 * 피싱 탐지 (ML 기반)
 * 
 * Business rule:
 * - trustScore는 100% ML 모델 기반으로 계산
 * - 신고 정보는 참고용으로만 제공 (점수에 반영하지 않음)
 * - 리뷰 분석은 별도 기능으로 분리
 */
exports.detectPhishing = async (req, res) => {
  try {
    const { url: rawUrl } = req.body;
    
    if (!rawUrl || typeof rawUrl !== "string") {
      return error(res, "URL이 필요합니다.", 400);
    }

    const cleanUrl = sanitizeInput(rawUrl);
    if (!validateUrl(cleanUrl)) {
      return error(res, '올바른 URL 형식을 입력해주세요.', 400);
    }

    const normalizedUrl = normalizeUrl(cleanUrl);
    
    // 1. ML 모델 예측
    let mlResult = null;
    try {
      mlResult = await runPhishingMLPrediction(normalizedUrl, req);
      console.log('ML 예측 결과:', mlResult);
    } catch (mlError) {
      console.error("ML prediction failed in /api/phishing/detect:", mlError);
      return error(res, "ML 기반 피싱 분석 중 오류 발생", 500);
    }
    
    // 2. ML 기반 trustScore 계산
    const mlLabel = mlResult?.label;
    const mlConfidence = mlResult?.confidence;
    const trustScore = computeMlTrustScore(mlLabel, mlConfidence);
    const riskLabel = mlLabel === 1 ? "PHISHING" : "SAFE";
    
    // 3. 신고 정보 조회 (참고용, 점수에 반영하지 않음)
    const reportsSummary = await getReportsSummary(normalizedUrl);
    
    // 4. 기존 웹 메타데이터 정보 (참고용)
    // 기존 aiService의 일부 정보를 가져올 수 있지만, 점수에는 사용하지 않음
    let webMeta = null;
    try {
      // SSL, 도메인 연령 등 참고 정보만 가져오기 (점수 계산은 하지 않음)
      const sslValid = await aiService.checkSSL(normalizedUrl);
      const domainAge = await aiService.getDomainAge(normalizedUrl);
      const urlObj = new URL(normalizedUrl.startsWith('http') ? normalizedUrl : 'https://' + normalizedUrl);
      const domain = urlObj.hostname.toLowerCase().replace(/^www\./, '');
      
      webMeta = {
        domain,
        sslValid,
        domainAge,
        // 참고용 정보만 포함
      };
    } catch (metaError) {
      console.error('웹 메타데이터 조회 오류:', metaError);
      // 메타데이터 조회 실패해도 계속 진행
    }
    
    // 5. 응답 구성
    return success(res, {
      url: rawUrl,
      normalizedUrl,
      ml: {
        label: mlLabel,
        riskLabel,        // "SAFE" or "PHISHING"
        confidence: mlConfidence,
        trustScore,       // 0~100, ML 100% 기반 신뢰도
      },
      // 신고 정보는 참고용으로만 제공 (점수에는 반영하지 않음)
      reports: reportsSummary,
      // 기존에 웹 스크래핑/메타데이터/SSL/DNS 정보가 있다면 그대로 포함 (참고용)
      webMeta: webMeta || null,
    });
  } catch (err) {
    console.error('피싱 탐지 오류:', err);
    return error(res, `피싱 탐지 중 오류가 발생했습니다: ${err.message}`, 500);
  }
};

/**
 * 리뷰 신뢰도 분석
 * 
 * 특정 쇼핑몰에 대한 리뷰/신고/후기 텍스트의 신뢰도를 분석합니다.
 */
exports.analyzeReviewTrust = async (req, res) => {
  try {
    const { shopId, shopUrl } = req.body;

    // shopId 또는 shopUrl 중 하나는 필수
    if (!shopId && !shopUrl) {
      return error(res, 'shopId 또는 shopUrl 중 하나는 필수입니다.', 400);
    }

    let targetShopId = null;

    // shopUrl이 제공된 경우 shopId로 변환
    if (shopUrl && !shopId) {
      const normalizedUrl = normalizeUrl(shopUrl);
      const { data: shop, error: shopError } = await supabase
        .from('shops')
        .select('id, parent_shop_id')
        .eq('url', normalizedUrl)
        .single();

      if (shopError || !shop) {
        return error(res, '해당 쇼핑몰을 찾을 수 없습니다.', 404);
      }

      console.log(`[리뷰 신뢰도 분석] shopUrl로 쇼핑몰 찾음: id=${shop.id}, parent_shop_id=${shop.parent_shop_id}`);
      targetShopId = shop.parent_shop_id || shop.id;
      console.log(`[리뷰 신뢰도 분석] targetShopId 결정: ${targetShopId}`);
    } else {
      targetShopId = parseInt(shopId, 10);
      if (isNaN(targetShopId)) {
        return error(res, '유효하지 않은 shopId입니다.', 400);
      }
      console.log(`[리뷰 신뢰도 분석] shopId 직접 제공: ${targetShopId}`);
      
      // shopId로 쇼핑몰 정보 확인 (디버깅용)
      const { data: shopInfo, error: shopInfoError } = await supabase
        .from('shops')
        .select('id, parent_shop_id, name')
        .eq('id', targetShopId)
        .single();
      
      if (!shopInfoError && shopInfo) {
        console.log(`[리뷰 신뢰도 분석] 쇼핑몰 정보: id=${shopInfo.id}, name=${shopInfo.name}, parent_shop_id=${shopInfo.parent_shop_id}`);
      }
    }

    // 캐시 확인 전에 먼저 리뷰가 있는지 확인
    console.log(`[리뷰 신뢰도 분석] 컨트롤러: shopId=${targetShopId}에 대한 분석 시작`);
    const reviews = await aiService.getShopReviewsForAnalysis(targetShopId);
    console.log(`[리뷰 신뢰도 분석] 컨트롤러: 조회된 리뷰 수=${reviews?.length || 0}`);

    // 리뷰가 없으면 캐시 확인 없이 바로 빈 결과 반환
    if (!reviews || reviews.length === 0) {
      console.log(`[리뷰 신뢰도 분석] 리뷰가 없어 빈 결과 반환`);
      const CACHE_TYPE = 'REVIEW_TRUST';
      const emptyResult = {
        overallTrustScore: null,
        overallLevel: 'UNKNOWN',
        summary: '분석할 리뷰가 아직 없습니다.',
        suspiciousReviews: [],
        stats: {
          totalReviews: 0,
          suspiciousCount: 0,
          normalCount: 0,
          suspiciousRatio: 0
        },
        cached: false
      };

      // 빈 결과도 캐시에 저장 (1분으로 단축 - 리뷰가 추가될 수 있으므로)
      await aiService.saveAnalysisCache(targetShopId, CACHE_TYPE, emptyResult, 1);

      return success(res, emptyResult);
    }

    // 리뷰가 있으면 캐시 확인 (리뷰 수가 변경되었을 수 있으므로 리뷰 수도 확인)
    // 캐시는 5분 이내 생성된 것만 사용 (그 이후면 새로 분석)
    const CACHE_TYPE = 'REVIEW_TRUST';
    const cachedResult = await aiService.getAnalysisCache(targetShopId, CACHE_TYPE, 5);
    
    if (cachedResult && cachedResult.stats && cachedResult.stats.totalReviews === reviews.length) {
      console.log(`리뷰 신뢰도 분석 캐시 히트: shopId=${targetShopId}, 리뷰 수=${reviews.length}`);
      return success(res, {
        ...cachedResult,
        cached: true
      });
    } else if (cachedResult) {
      console.log(`[리뷰 신뢰도 분석] 캐시된 리뷰 수(${cachedResult.stats?.totalReviews || 0})와 현재 리뷰 수(${reviews.length})가 다름. 새로 분석합니다.`);
    } else {
      console.log(`[리뷰 신뢰도 분석] 캐시 없음 또는 만료됨. 새로 분석합니다.`);
    }

    // OpenRouter를 사용한 AI 분석
    let analysisResult;
    try {
      analysisResult = await aiService.analyzeReviewTrustWithAI(reviews);
    } catch (aiError) {
      console.error('OpenRouter AI 분석 오류:', aiError);
      
      // 타임아웃 또는 API 오류 시 에러 응답
      if (aiError.message.includes('timeout') || aiError.message.includes('TIMEOUT')) {
        return error(res, '분석에 시간이 너무 오래 걸렸습니다. 잠시 후 다시 시도해 주세요.', 504);
      }
      
      return error(res, '분석에 실패했습니다. 잠시 후 다시 시도해 주세요.', 500);
    }

    // 결과에 추가 정보 포함
    const finalResult = {
      ...analysisResult,
      shopId: targetShopId,
      cached: false
    };

    // 결과를 캐시에 저장 (5분 - 자주 업데이트되도록)
    await aiService.saveAnalysisCache(targetShopId, CACHE_TYPE, finalResult, 5);

    // trust score를 shop_trust_scores 테이블에 저장
    if (analysisResult.overallTrustScore !== null && analysisResult.overallTrustScore !== undefined) {
      try {
        const trustScoreService = require('../services/trustScoreService');
        
        // overallTrustScore (0~1, 1에 가까울수록 신뢰도 높음)를 reviewRisk (0~1, 1에 가까울수록 위험도 높음)로 변환
        const reviewRisk = 1 - analysisResult.overallTrustScore;
        
        // shopUrl이 없으면 shop 테이블에서 조회
        let actualShopUrl = shopUrl;
        if (!actualShopUrl) {
          const { data: shopData } = await supabase
            .from('shops')
            .select('url')
            .eq('id', targetShopId)
            .single();
          if (shopData) {
            actualShopUrl = shopData.url;
          }
        }
        
        // techRisk와 reportPenalty 계산
        const techRisk = await trustScoreService.getTechRiskFromMLEngine(actualShopUrl || '');
        const reportPenalty = await trustScoreService.calculateReportPenalty(targetShopId);
        
        // 최종 trust score 계산
        const { finalTrust, trustGrade } = trustScoreService.calculateFinalTrustScore({
          techRisk,
          reviewRisk,
          reportPenalty
        });
        
        // shop_trust_scores 테이블에 저장
        await trustScoreService.upsertTrustScore(targetShopId, {
          techRisk,
          reviewRisk,
          reportPenalty,
          finalTrust,
          trustGrade,
          modelVersion: 'v1.0'
        });
        
        console.log(`[리뷰 신뢰도 분석] trust score 저장 완료: shopId=${targetShopId}, finalTrust=${finalTrust}, trustGrade=${trustGrade}`);
      } catch (trustScoreError) {
        console.error('[리뷰 신뢰도 분석] trust score 저장 오류:', trustScoreError);
        // trust score 저장 실패해도 분석 결과는 반환
      }
    }

    return success(res, finalResult);

  } catch (err) {
    console.error('리뷰 신뢰도 분석 오류:', err);
    return error(res, `리뷰 신뢰도 분석 중 오류가 발생했습니다: ${err.message}`, 500);
  }
};

