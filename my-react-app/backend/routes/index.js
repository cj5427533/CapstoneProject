// 백엔드 모듈화를 위한 라우터 분리
const express = require('express');
const router = express.Router();

// 인증 관련 라우터
const authRoutes = require('./routes/auth');
const shopRoutes = require('./routes/shops');
const reportRoutes = require('./routes/reports');
const ratingRoutes = require('./routes/ratings');
const adminRoutes = require('./routes/admin');

// 라우터 등록
app.use('/api/auth', authRoutes);
app.use('/api/shops', shopRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/ratings', ratingRoutes);
app.use('/api/admin', adminRoutes);
