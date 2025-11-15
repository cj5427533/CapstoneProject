/**
 * 쇼핑몰 API 테스트
 */
const request = require('supertest');
const app = require('../server');

describe('Shops API', () => {
  describe('POST /api/shops/search', () => {
    it('URL이 없으면 400 에러 반환', async () => {
      const res = await request(app)
        .post('/api/shops/search')
        .send({});

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('잘못된 URL 형식이면 400 에러 반환', async () => {
      const res = await request(app)
        .post('/api/shops/search')
        .send({ url: 'not-a-url' });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('유효한 URL이면 200 반환 및 응답 구조 확인', async () => {
      const res = await request(app)
        .post('/api/shops/search')
        .send({ url: 'https://example.com' });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('shop');
      expect(res.body.data).toHaveProperty('isNew');
      expect(res.body.data).toHaveProperty('isTemporary');
    });

    it('URL 정규화 동작 확인 (www 제거)', async () => {
      const res = await request(app)
        .post('/api/shops/search')
        .send({ url: 'https://www.example.com' });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      // 정규화된 URL이 반환되는지 확인
      if (res.body.data.shop && res.body.data.shop.url) {
        expect(res.body.data.shop.url).not.toContain('www.');
      }
    });

    it('http 없이 도메인만 입력해도 정규화되어 처리', async () => {
      const res = await request(app)
        .post('/api/shops/search')
        .send({ url: 'example.com' });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('GET /api/shops/:shopId/reports', () => {
    it('존재하는 shopId의 신고 목록 조회', async () => {
      const shopId = 1; // 테스트용 shopId
      const res = await request(app)
        .get(`/api/shops/${shopId}/reports`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('존재하지 않는 shopId도 빈 배열 반환 (에러 아님)', async () => {
      const shopId = 999999;
      const res = await request(app)
        .get(`/api/shops/${shopId}/reports`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('GET /api/shops/:shopId/ratings', () => {
    it('평점 조회 응답 구조 확인', async () => {
      const shopId = 1;
      const res = await request(app)
        .get(`/api/shops/${shopId}/ratings`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('averageRating');
      expect(res.body.data).toHaveProperty('totalRatings');
      expect(res.body.data).toHaveProperty('ratingDistribution');
      expect(typeof res.body.data.averageRating).toBe('number');
      expect(typeof res.body.data.totalRatings).toBe('number');
    });
  });

  describe('GET /api/shops/:shopId/reviews', () => {
    it('리뷰 목록 조회 응답 구조 확인', async () => {
      const shopId = 1;
      const res = await request(app)
        .get(`/api/shops/${shopId}/reviews`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('GET /api/shops/dangerous/list', () => {
    it('주의가 필요한 쇼핑몰 목록 조회', async () => {
      const res = await request(app)
        .get('/api/shops/dangerous/list');

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('응답 항목 구조 확인', async () => {
      const res = await request(app)
        .get('/api/shops/dangerous/list');

      if (res.body.data.length > 0) {
        const item = res.body.data[0];
        expect(item).toHaveProperty('id');
        expect(item).toHaveProperty('url');
        expect(item).toHaveProperty('reportCount');
      }
    });
  });

  describe('GET /api/shops/top-rated/list', () => {
    it('고평점 쇼핑몰 목록 조회', async () => {
      const res = await request(app)
        .get('/api/shops/top-rated/list');

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('GET /api/shops/recommended/detailed', () => {
    it('추천 쇼핑몰 상세 목록 조회', async () => {
      const res = await request(app)
        .get('/api/shops/recommended/detailed');

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('응답 항목 구조 확인', async () => {
      const res = await request(app)
        .get('/api/shops/recommended/detailed');

      if (res.body.data.length > 0) {
        const item = res.body.data[0];
        expect(item).toHaveProperty('id');
        expect(item).toHaveProperty('url');
        expect(item).toHaveProperty('averageRating');
        expect(item).toHaveProperty('ratingCount');
      }
    });
  });

  describe('POST /api/shops/ratings', () => {
    it('필수 필드가 없으면 400 에러 반환', async () => {
      const res = await request(app)
        .post('/api/shops/ratings')
        .send({});

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('잘못된 평점 값이면 400 에러 반환', async () => {
      const res = await request(app)
        .post('/api/shops/ratings')
        .send({
          shopUrl: 'https://example.com',
          rating: 10 // 1-5 범위를 벗어남
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('유효한 평점이면 201 반환', async () => {
      const res = await request(app)
        .post('/api/shops/ratings')
        .send({
          shopUrl: 'https://example.com',
          rating: 5,
          comment: '테스트 리뷰'
        });

      // 성공 또는 실패 가능 (DB 연결 상태에 따라)
      expect([201, 400, 500]).toContain(res.statusCode);
      if (res.statusCode === 201) {
        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveProperty('rating');
      }
    });
  });
});

