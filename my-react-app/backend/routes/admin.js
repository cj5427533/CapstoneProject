const express = require('express');
const router = express.Router();
const { authenticateToken } = require('./auth');
const { pool } = require('../server');

// 관리자용 신고 목록 조회 (evidence_files 포함)
router.get('/reports', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        r.id,
        r.shop_id,
        r.shop_url as "shopUrl",
        r.categories,
        r.description,
        r.reporter_name as "reporterName",
        r.status,
        r.created_at,
        r.evidence_files as "evidenceFiles",
        s.id as "shop.id",
        s.name as "shop.name",
        s.url as "shop.url"
      FROM reports r
      LEFT JOIN shops s ON r.shop_id = s.id
      ORDER BY r.created_at DESC
    `);

    const reports = result.rows.map(row => ({
      id: row.id,
      shop_id: row.shop_id || null,
      shopUrl: row.shopUrl,
      categories: row.categories,
      description: row.description,
      reporter_name: row.reporterName,
      status: row.status || 'pending',
      created_at: row.created_at,
      evidenceFiles: row.evidenceFiles ? JSON.parse(row.evidenceFiles) : [],
      shops: row['shop.id'] ? {
        id: row['shop.id'],
        name: row['shop.name'],
        url: row['shop.url']
      } : null
    }));

    res.json(reports);
  } catch (error) {
    console.error('관리자 신고 목록 조회 오류:', error);
    res.status(500).json({ message: '신고 목록을 불러오는데 실패했습니다.' });
  }
});

// 신고 승인/거부
router.patch('/reports/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: '올바른 상태 값을 입력해주세요. (pending, approved, rejected)' });
    }

    const result = await pool.query(
      'UPDATE reports SET status = $1 WHERE id = $2 RETURNING id, status',
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: '피해 사례 제보를 찾을 수 없습니다.' });
    }

    res.json({ 
      message: '상태가 업데이트되었습니다.', 
      id: result.rows[0].id, 
      status: result.rows[0].status 
    });
  } catch (error) {
    console.error('피해 사례 제보 상태 업데이트 오류:', error);
    res.status(500).json({ message: '상태 업데이트에 실패했습니다.' });
  }
});

module.exports = router;



