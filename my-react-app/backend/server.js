/**
 * Express 서버 메인 파일 (Slim 버전)
 * 모든 비즈니스 로직은 controllers, services, routes로 분리됨
 */
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { spawn } = require('child_process');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Supabase 클라이언트 및 유틸리티
const supabase = require('./config/supabase');
const { normalizeUrl } = require('./utils/url');

// 라우터 import
const authRoutes = require('./routes/auth');
const shopRoutes = require('./routes/shops');
const reportRoutes = require('./routes/reports');
const adminRoutes = require('./routes/admin');
const aiAnalysisRoutes = require('./routes/ai-analysis');
const communityRoutes = require('./routes/community');

const app = express();
const PORT = process.env.PORT || 3001;

// 미들웨어
app.use(cors({
  origin: true, // 모든 오리진 허용
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// 업로드 디렉토리 생성
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer 설정 (파일 업로드)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB 제한
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('PNG 또는 JPG 파일만 업로드 가능합니다.'), false);
    }
  }
});

// 정적 파일 서빙 - 업로드된 증빙 자료 이미지 제공
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ---------------------
// ML Prediction Helper
// ---------------------
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
    const mlDir = path.join(__dirname, "ml");
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

// ---------------------
// ML Prediction API
// ---------------------
app.post("/api/ml/predict", async (req, res) => {
  try {
    const { url, shopId } = req.body || {};
    
    if (!url || typeof url !== "string") {
      return res.status(400).json({ error: "URL이 필요합니다." });
    }
    
    const prediction = await runPhishingMLPrediction(url, req);
    
    // shopId가 제공된 경우 trust score 저장
    if (shopId) {
      try {
        console.log(`[ML 예측] shopId 받음: ${shopId}, URL: ${url}`);
        const trustScoreService = require('./services/trustScoreService');
        const shopService = require('./services/shopService');
        
        // shopId로 shop 정보 조회
        const { data: shopData, error: shopError } = await supabase
          .from('shops')
          .select('id, url, parent_shop_id')
          .eq('id', parseInt(shopId, 10))
          .single();
        
        if (shopError) {
          console.error(`[ML 예측] shop 조회 오류:`, shopError);
        }
        
        if (shopData) {
          const targetShopId = shopData.parent_shop_id || shopData.id;
          const shopUrl = shopData.url || url;
          
          console.log(`[ML 예측] shop 정보: id=${shopData.id}, parent_shop_id=${shopData.parent_shop_id}, targetShopId=${targetShopId}`);
          
          // ML 예측 결과를 techRisk로 변환
          // label 1 (PHISHING)이면 높은 위험도, label 0 (LEGIT)이면 낮은 위험도
          const techRisk = prediction.label === 1 
            ? Math.max(0.5, prediction.confidence)  // 피싱이면 confidence가 높을수록 위험도 높음
            : Math.min(0.3, 1 - prediction.confidence);  // 정상이면 confidence가 높을수록 위험도 낮음
          
          // reviewRisk와 reportPenalty 계산
          const reviewRisk = await trustScoreService.getReviewRiskFromAnalysis(targetShopId);
          const reportPenalty = await trustScoreService.calculateReportPenalty(targetShopId);
          
          // 최종 trust score 계산
          const { finalTrust, trustGrade } = trustScoreService.calculateFinalTrustScore({
            techRisk,
            reviewRisk,
            reportPenalty
          });
          
          console.log(`[ML 예측] trust score 계산: techRisk=${techRisk}, reviewRisk=${reviewRisk}, reportPenalty=${reportPenalty}, finalTrust=${finalTrust}, trustGrade=${trustGrade}`);
          
          // shop_trust_scores 테이블에 저장
          const savedData = await trustScoreService.upsertTrustScore(targetShopId, {
            techRisk,
            reviewRisk,
            reportPenalty,
            finalTrust,
            trustGrade,
            modelVersion: 'v1.0'
          });
          
          console.log(`[ML 예측] trust score 저장 완료: shopId=${targetShopId}, finalTrust=${finalTrust}, trustGrade=${trustGrade}`, savedData);
        } else {
          console.warn(`[ML 예측] shop 데이터를 찾을 수 없음: shopId=${shopId}`);
        }
      } catch (trustScoreError) {
        console.error('[ML 예측] trust score 저장 오류:', trustScoreError);
        console.error('[ML 예측] trust score 저장 오류 스택:', trustScoreError.stack);
        // trust score 저장 실패해도 예측 결과는 반환
      }
    } else {
      console.log(`[ML 예측] shopId가 제공되지 않음, trust score 저장 건너뜀`);
    }
    
    return res.json({
      success: true,
      ...prediction,
      // optional: human-readable label mapping
      label_name: prediction.label === 1 ? "PHISHING" : "LEGIT",
    });
  } catch (error) {
    console.error("ML prediction API error:", error);
    return res
      .status(500)
      .json({ success: false, error: "ML 예측 처리 중 오류 발생" });
  }
});

// 라우터 연결
app.use('/api/auth', authRoutes);
app.use('/api/shops', shopRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ai-analysis', aiAnalysisRoutes);
app.use('/api/ai', aiAnalysisRoutes); // 별칭 추가
app.use('/api/phishing', aiAnalysisRoutes); // 별칭 추가
app.use('/api/community', communityRoutes);

// 헬스체크
app.get('/api/health', (req, res) => {
  console.log(`Health check from: ${req.ip || req.connection.remoteAddress}`);
  res.json({ 
    status: 'OK', 
    message: 'Server is running',
    ip: req.ip || req.connection.remoteAddress,
    timestamp: new Date().toISOString()
  });
});

// 루트 테스트
app.get('/', (req, res) => {
  res.json({
    message: 'Shopping Mall Backend API',
    version: '2.0.0',
    architecture: 'Layered Architecture (Controllers/Services/Routes)',
    endpoints: [
      '/api/health',
      '/api/auth',
      '/api/shops',
      '/api/reports',
      '/api/admin',
      '/api/ai-analysis',
      '/api/ai',
      '/api/phishing',
      '/api/community',
      '/api/ml/predict'
    ]
  });
});

// 서버 시작
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Server accessible at http://0.0.0.0:${PORT}`);
  console.log(`External access: http://172.30.1.97:${PORT}`);
  console.log(`CORS enabled for all origins`);
  console.log(`Architecture: Layered (Controllers/Services/Routes)`);
});

module.exports = app;
