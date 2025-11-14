/**
 * 인증 관련 라우트
 */
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/send-sms', authController.sendSMS);
router.post('/verify-sms', authController.verifySMS);
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/check-username', authController.checkUsername);
router.post('/request-password-reset', authController.requestPasswordReset);
router.post('/reset-password', authController.resetPassword);
router.get('/me', authController.getMe);

module.exports = router;
