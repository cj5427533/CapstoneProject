/**
 * AI 분석 관련 컨트롤러
 */
const aiService = require('../services/aiService');
const { success, error } = require('../utils/response');
const { sanitizeInput, validateUrl } = require('../utils/validation');
const { normalizeUrl } = require('../utils/url');
const supabase = require('../config/supabase');

// server.js에서 runPhishingMLPrediction 함수 가져오기
// (server.js에서 export하지 않으므로 직접 구현하거나 server.js를 수정해야 함)
// 일단 여기서 직접 구현하거나, server.js에서 export하도록 수정
const { spawn } = require('child_process');
const path = require('path');

/**
 * ML 기반 신뢰도 점수 계산
 * @param {number} label - 0 (SAFE) 또는 1 (PHISHING)
 * @param {number} confidence - 0~1 사이의 신뢰도
 * @returns {number} 0~100 사이의 trustScore
 */
function computeMlTrustScore(label, confidence) {
  if (label === 0) {
    // SAFE: confidence가 높을수록 높은 trustScore
    return Math.round(100 * confidence);
  } else if (label === 1) {
    // PHISHING: confidence가 높을수록 낮은 trustScore
    return Math.round(100 * (1 - confidence));
  }
  // 기본값 (예상치 못한 경우)
  return 50;
}

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
    // Windows에서는 python, Linux/Mac에서는 python3
    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
    const scriptPath = path.join(__dirname, "..", "ml", "predict.py");
    
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
          
          resolve({
            url: rawUrl,
            normalizedUrl: normalized,
            label,
            confidence,
            id: saved && saved[0] ? saved[0].id : null,
          });
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

