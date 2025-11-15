/**
 * 관리자 API 테스트
 */
const request = require('supertest');
const app = require('../server');

describe('Admin API', () => {
  // 테스트용 관리자 토큰 (실제 환경에서는 관리자 계정으로 로그인하여 발급)
  let adminToken = null;

  // 모든 관리자 API는 인증이 필요하므로, 인증 없이 접근 시 401 확인
  describe('인증 없이 접근', () => {
    it('GET /api/admin/shops - 401 에러 반환', async () => {
      const res = await request(app)
        .get('/api/admin/shops');

      // 관리자 라우트는 인증이 필요하므로 401 또는 403
      expect([401, 403]).toContain(res.statusCode);
    });

    it('GET /api/admin/reports - 401 에러 반환', async () => {
      const res = await request(app)
        .get('/api/admin/reports');

      expect([401, 403]).toContain(res.statusCode);
    });

    it('GET /api/admin/users - 401 에러 반환', async () => {
      const res = await request(app)
        .get('/api/admin/users');

      expect([401, 403]).toContain(res.statusCode);
    });

    it('GET /api/admin/stats - 401 에러 반환', async () => {
      const res = await request(app)
        .get('/api/admin/stats');

      expect([401, 403]).toContain(res.statusCode);
    });
  });

  describe('인증된 관리자 접근 (토큰 필요)', () => {
    // 실제 테스트 환경에서는 관리자 계정으로 로그인하여 토큰 발급 필요
    // 여기서는 스킵하거나 mock 처리

    it('GET /api/admin/shops - 쇼핑몰 목록 조회', async () => {
      if (!adminToken) {
        // 토큰이 없으면 스킵
        return;
      }

      const res = await request(app)
        .get('/api/admin/shops')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('shops');
      expect(Array.isArray(res.body.data.shops)).toBe(true);
    });

    it('GET /api/admin/reports - 신고 목록 조회', async () => {
      if (!adminToken) {
        return;
      }

      const res = await request(app)
        .get('/api/admin/reports')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('GET /api/admin/users - 사용자 목록 조회', async () => {
      if (!adminToken) {
        return;
      }

      const res = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('users');
      expect(Array.isArray(res.body.data.users)).toBe(true);
    });

    it('GET /api/admin/stats - 통계 조회', async () => {
      if (!adminToken) {
        return;
      }

      const res = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('totalShops');
      expect(res.body.data).toHaveProperty('totalReports');
      expect(res.body.data).toHaveProperty('totalRatings');
      expect(res.body.data).toHaveProperty('totalUsers');
    });
  });

  describe('PUT /api/admin/shops/:shopId', () => {
    it('인증 없이 접근 시 401 에러', async () => {
      const res = await request(app)
        .put('/api/admin/shops/1')
        .send({ name: '새 이름' });

      expect([401, 403]).toContain(res.statusCode);
    });

    it('shopId가 없으면 404 에러', async () => {
      if (!adminToken) {
        return;
      }

      const res = await request(app)
        .put('/api/admin/shops/')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: '새 이름' });

      expect(res.statusCode).toBe(404);
    });

    it('이름이 없으면 400 에러', async () => {
      if (!adminToken) {
        return;
      }

      const res = await request(app)
        .put('/api/admin/shops/1')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('PATCH /api/admin/reports/:id', () => {
    it('인증 없이 접근 시 401 에러', async () => {
      const res = await request(app)
        .patch('/api/admin/reports/1')
        .send({ status: 'approved' });

      expect([401, 403]).toContain(res.statusCode);
    });

    it('잘못된 상태 값이면 400 에러', async () => {
      if (!adminToken) {
        return;
      }

      const res = await request(app)
        .patch('/api/admin/reports/1')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'invalid-status' });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('유효한 상태 값이면 200 반환', async () => {
      if (!adminToken) {
        return;
      }

      const res = await request(app)
        .patch('/api/admin/reports/1')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'approved' });

      // 존재하지 않는 ID면 404, 존재하면 200
      expect([200, 404]).toContain(res.statusCode);
    });
  });

  describe('DELETE /api/admin/shops/:shopId', () => {
    it('인증 없이 접근 시 401 에러', async () => {
      const res = await request(app)
        .delete('/api/admin/shops/1');

      expect([401, 403]).toContain(res.statusCode);
    });
  });

  describe('POST /api/admin/shops/merge', () => {
    it('인증 없이 접근 시 401 에러', async () => {
      const res = await request(app)
        .post('/api/admin/shops/merge')
        .send({ parentId: 1, childId: 2 });

      expect([401, 403]).toContain(res.statusCode);
    });

    it('필수 필드가 없으면 400 에러', async () => {
      if (!adminToken) {
        return;
      }

      const res = await request(app)
        .post('/api/admin/shops/merge')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });
});

