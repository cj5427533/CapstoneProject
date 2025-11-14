/**
 * 신고 관련 라우트
 */
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const reportController = require('../controllers/reportController');

// 업로드 디렉토리 생성
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer 설정
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

// 신고 생성 (파일 업로드 포함)
router.post('/', upload.array('evidenceFiles', 10), reportController.createReport);

// 사용자별 신고 조회
router.get('/user/:reporterName', reportController.getUserReports);
router.get('/user/:reporterName/shop/:shopUrl', reportController.getUserShopReport);

// 신고 수정/삭제
router.put('/:reportId', reportController.updateReport);
router.delete('/:reportId/user/:reporterName', reportController.deleteReport);

// 모든 신고 조회 (승인된 것만)
router.get('/', reportController.getAllReports);

module.exports = router;
