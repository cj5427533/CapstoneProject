/**
 * 관리자 관련 라우트
 */
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

// 쇼핑몰 관리
router.get('/shops', adminController.getShops);
router.put('/shops/:shopId', adminController.updateShop);
router.delete('/shops/:shopId', adminController.deleteShop);
router.post('/shops/merge', adminController.mergeShops);

// 신고 관리
router.get('/reports', adminController.getReports);
router.patch('/reports/:id', adminController.updateReportStatus);
router.delete('/reports/:reportId', adminController.deleteReport);

// 평점 관리
router.get('/ratings', adminController.getRatings);
router.delete('/ratings/:ratingId', adminController.deleteRating);

// 사용자 관리
router.get('/users', adminController.getUsers);
router.get('/users/:userId/shops', adminController.getUserShops);

// 통계
router.get('/stats', adminController.getStats);

module.exports = router;
