/**
 * 쇼핑몰 관련 라우트
 */
const express = require('express');
const router = express.Router();
const shopController = require('../controllers/shopController');
const ratingController = require('../controllers/ratingController');

// 쇼핑몰 검색
router.post('/search', shopController.searchShop);

// 쇼핑몰 전체 분석
router.post('/analyze', shopController.analyzeShop);

// 쇼핑몰별 신고/평점/리뷰 조회
router.get('/:shopId/reports', shopController.getShopReports);
router.get('/:shopId/ratings', shopController.getShopRatings);
router.get('/:shopId/reviews', shopController.getShopReviews);

// 평점 등록
router.post('/ratings', ratingController.createRating);

// 주의가 필요한 쇼핑몰 / 고평점 쇼핑몰
router.get('/dangerous/list', shopController.getDangerousShops);
router.get('/dangerous/detailed', shopController.getDangerousShopsDetailed);
router.get('/top-rated/list', shopController.getTopRatedShops);
router.get('/recommended/detailed', shopController.getRecommendedShopsDetailed);

module.exports = router;

