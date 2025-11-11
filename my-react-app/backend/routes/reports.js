const express = require('express');
const router = express.Router();
const { authenticateToken } = require('./auth');
const { upload, uploadDir } = require('./index');
const path = require('path');
const fs = require('fs');

// server.js에서 pool을 가져옴 (실제 export 방식에 맞게 조정 필요)
// 일반적으로: const { pool } = require('../server');
const { pool } = require('../server');

// POST /api/reports - 피해 사례 제보 생성 (파일 업로드 지원)
router.post('/', authenticateToken, upload.array('evidenceFiles', 10), async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { shopUrl, categories, description, reporterName, reporterPhone } = req.body;
    
    // 파일 URL 배열 생성
    const evidenceFiles = req.files ? req.files.map(file => `/uploads/evidence/${file.filename}`) : [];
    
    // URL 정규화
    let normalizedUrl = shopUrl.trim().replace(/\s+/g, '');
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = 'https://' + normalizedUrl;
    }
    
    // 기존 신고 확인
    const existingReport = await client.query(
      'SELECT id FROM reports WHERE shop_url = $1 AND reporter_name = $2',
      [normalizedUrl, reporterName]
    );
    
    if (existingReport.rows.length > 0) {
      // 업로드된 파일 삭제
      if (req.files) {
        req.files.forEach(file => {
          const filePath = path.join(uploadDir, file.filename);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        });
      }
      
      await client.query('ROLLBACK');
      client.release();
      return res.status(409).json({
        isDuplicate: true,
        existingReportId: existingReport.rows[0].id,
        message: '이미 해당 쇼핑몰에 대한 피해 사례 제보가 존재합니다.'
      });
    }
    
    // 쇼핑몰 존재 확인 및 생성
    let shopResult = await client.query('SELECT id FROM shops WHERE url = $1', [normalizedUrl]);
    let shopId;
    
    if (shopResult.rows.length === 0) {
      const shopInsert = await client.query(
        'INSERT INTO shops (url, created_at) VALUES ($1, NOW()) RETURNING id',
        [normalizedUrl]
      );
      shopId = shopInsert.rows[0].id;
    } else {
      shopId = shopResult.rows[0].id;
    }
    
    // 신고 생성 (evidence_files 컬럼에 JSON 배열로 저장)
    const reportResult = await client.query(
      `INSERT INTO reports (shop_id, shop_url, categories, description, reporter_name, reporter_phone, evidence_files, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW()) RETURNING id`,
      [shopId, normalizedUrl, categories, description, reporterName, reporterPhone || null, JSON.stringify(evidenceFiles)]
    );
    
    await client.query('COMMIT');
    client.release();
    
    res.status(201).json({
      id: reportResult.rows[0].id,
      message: '피해 사례 제보가 접수되었습니다.',
      evidenceFiles: evidenceFiles
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    client.release();
    console.error('신고 생성 오류:', error);
    
    // 파일 업로드 실패 시 업로드된 파일 삭제
    if (req.files) {
      req.files.forEach(file => {
        const filePath = path.join(uploadDir, file.filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      });
    }
    
    res.status(500).json({ message: '신고 제출에 실패했습니다.' });
  }
});

module.exports = router;
