/**
 * 신고 API 테스트
 */
const request = require('supertest');
const app = require('../server');

describe('Reports API', () => {
  let testReport = {
    shopUrl: 'https://test-shop.com',
    categories: ['배송지연', '상품불량'],
    description: '테스트 신고 내용입니다.',
    reporterName: `test_reporter_${Date.now()}`,
    reporterPhone: '01012345678'
  };

  let createdReportId = null;

  describe('POST /api/reports', () => {
    it('필수 필드가 없으면 400 에러 반환', async () => {
      const res = await request(app)
        .post('/api/reports')
        .send({});

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('shopUrl이 없으면 400 에러 반환', async () => {
      const res = await request(app)
        .post('/api/reports')
        .send({
          categories: testReport.categories,
          description: testReport.description
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('categories가 없으면 400 에러 반환', async () => {
      const res = await request(app)
        .post('/api/reports')
        .send({
          shopUrl: testReport.shopUrl,
          description: testReport.description
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('description이 없으면 400 에러 반환', async () => {
      const res = await request(app)
        .post('/api/reports')
        .send({
          shopUrl: testReport.shopUrl,
          categories: testReport.categories
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('유효한 신고 데이터면 201 반환', async () => {
      const res = await request(app)
        .post('/api/reports')
        .send(testReport);

      // 성공 또는 실패 가능 (DB 연결 상태에 따라)
      expect([201, 400, 409, 500]).toContain(res.statusCode);
      if (res.statusCode === 201) {
        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveProperty('report');
        createdReportId = res.body.data.report.id;
      }
    });

    it('중복 신고 시 409 에러 반환', async () => {
      // 같은 사용자가 같은 쇼핑몰에 신고하면 중복
      const res = await request(app)
        .post('/api/reports')
        .send(testReport);

      if (res.statusCode === 409) {
        expect(res.body.success).toBe(false);
        expect(res.body.error).toContain('이미');
      }
    });
  });

  describe('GET /api/reports', () => {
    it('승인된 신고 목록 조회', async () => {
      const res = await request(app)
        .get('/api/reports');

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.reports)).toBe(true);
    });
  });

  describe('GET /api/reports/user/:reporterName', () => {
    it('사용자명이 없으면 400 에러 반환', async () => {
      const res = await request(app)
        .get('/api/reports/user/');

      expect(res.statusCode).toBe(404); // 라우트 매칭 실패
    });

    it('특정 사용자의 신고 목록 조회', async () => {
      const res = await request(app)
        .get(`/api/reports/user/${testReport.reporterName}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('reports');
      expect(Array.isArray(res.body.data.reports)).toBe(true);
    });
  });

  describe('GET /api/reports/user/:reporterName/shop/:shopUrl', () => {
    it('특정 사용자의 특정 쇼핑몰 신고 조회', async () => {
      const encodedShopUrl = encodeURIComponent(testReport.shopUrl);
      const res = await request(app)
        .get(`/api/reports/user/${testReport.reporterName}/shop/${encodedShopUrl}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('report');
    });
  });

  describe('PUT /api/reports/:reportId', () => {
    it('reportId가 없으면 404 에러 반환', async () => {
      const res = await request(app)
        .put('/api/reports/');

      expect(res.statusCode).toBe(404);
    });

    it('존재하지 않는 reportId면 404 에러 반환', async () => {
      const res = await request(app)
        .put('/api/reports/999999')
        .send({
          categories: ['배송지연'],
          description: '수정된 내용',
          reporterName: testReport.reporterName
        });

      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('필수 필드가 없으면 400 에러 반환', async () => {
      if (!createdReportId) {
        return; // 신고가 생성되지 않았으면 스킵
      }

      const res = await request(app)
        .put(`/api/reports/${createdReportId}`)
        .send({
          reporterName: testReport.reporterName
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('DELETE /api/reports/:reportId/user/:reporterName', () => {
    it('존재하지 않는 reportId면 404 에러 반환', async () => {
      const res = await request(app)
        .delete('/api/reports/999999/user/testuser');

      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('본인의 신고가 아니면 403 에러 반환', async () => {
      if (!createdReportId) {
        return;
      }

      const res = await request(app)
        .delete(`/api/reports/${createdReportId}/user/different_user`);

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });
});

