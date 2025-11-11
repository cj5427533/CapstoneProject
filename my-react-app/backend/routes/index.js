// 백엔드 모듈화를 위한 라우터 분리
const express = require('express');
const router = express.Router();

// 파일 업로드를 위한 multer 설정
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// 업로드 디렉토리 생성
const uploadDir = path.join(__dirname, '../uploads/evidence');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// multer 설정
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'evidence-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('이미지 파일만 업로드 가능합니다 (JPEG, PNG)'));
    }
  }
});

// upload를 다른 파일에서 사용할 수 있도록 export
module.exports.upload = upload;
module.exports.uploadDir = uploadDir;

// 인증 관련 라우터
const authRoutes = require('./routes/auth');
const shopRoutes = require('./routes/shops');
// reports 라우트 (같은 디렉토리에 있으므로)
const reportRoutes = require('./reports');
const ratingRoutes = require('./routes/ratings');
const adminRoutes = require('./routes/admin');

// 라우터 등록
app.use('/api/auth', authRoutes);
app.use('/api/shops', shopRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/ratings', ratingRoutes);
  app.use('/api/admin', adminRoutes);

// POST /api/reports 엔드포인트에 파일 업로드 기능이 필요합니다
// 기존 라우트를 찾아서 다음처럼 수정하세요:
// router.post('/reports', authenticateToken, upload.array('evidenceFiles', 10), async (req, res) => {
//   ... 파일 처리 로직 추가 ...
//   const evidenceFiles = req.files ? req.files.map(file => `/uploads/evidence/${file.filename}`) : [];
//   ... INSERT 쿼리에 evidence_files 추가 ...
// });
