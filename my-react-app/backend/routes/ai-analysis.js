/**
 * AI 분석 관련 라우트
 */
const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');

// 피싱 탐지
router.post('/phishing/detect', aiController.detectPhishing);
router.post('/detect', aiController.detectPhishing); // 별칭

// 리뷰 신뢰도 분석
router.post('/review-trust', aiController.analyzeReviewTrust);

module.exports = router;
