/**
 * 관리자 관련 라우트
 */
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const verifyTokenMiddleware = require('../middleware/verifyToken');
const requireAdmin = require('../middleware/requireAdmin');

// 모든 admin 라우트에 인증 + 관리자 권한 체크 적용
router.use(verifyTokenMiddleware);
router.use(requireAdmin);

// 쇼핑몰 관리
router.get('/shops', adminController.getShops);
router.put('/shops/:shopId', adminController.updateShop);
router.delete('/shops/:shopId', adminController.deleteShop);
router.post('/shops/merge', adminController.mergeShops);
router.delete('/shops/unknown', adminController.deleteUnknownShops);

// 신고 관리
router.get('/reports', adminController.getReports);
router.patch('/reports/:id', adminController.updateReportStatus);
router.delete('/reports/:reportId', adminController.deleteReport);

// 평점 관리
router.get('/ratings', adminController.getRatings);
router.delete('/ratings/:ratingId', adminController.deleteRating);

// 사용자 관리
router.get('/users', adminController.getUsers);
// 더 구체적인 라우트를 먼저 정의 (순서 중요!)
router.patch('/users/:userId/role', adminController.updateUserRole);
router.get('/users/:userId/shops', adminController.getUserShops);

// 통계
router.get('/stats', adminController.getStats);

// 신뢰도 분포
router.get('/trust-distribution', adminController.getTrustDistribution);

module.exports = router;
