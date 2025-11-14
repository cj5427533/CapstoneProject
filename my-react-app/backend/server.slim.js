/**
 * Express 서버 메인 파일 (Slim 버전)
 * 모든 비즈니스 로직은 controllers, services, routes로 분리됨
 */
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
require('dotenv').config({ path: path.join(__dirname, '.env') });

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
      '/api/community'
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
