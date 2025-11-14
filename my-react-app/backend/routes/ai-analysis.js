/**
 * AI 분석 관련 라우트
 */
const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');

// 피싱 탐지
router.post('/phishing/detect', aiController.detectPhishing);
router.post('/detect', aiController.detectPhishing); // 별칭

module.exports = router;
