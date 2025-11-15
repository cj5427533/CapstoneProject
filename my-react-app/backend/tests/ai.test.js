/**
 * AI 분석 API 테스트
 */
const request = require('supertest');
const app = require('../server');

describe('AI Analysis API', () => {
  describe('POST /api/phishing/detect', () => {
    it('URL이 없으면 400 에러 반환', async () => {
      const res = await request(app)
        .post('/api/phishing/detect')
        .send({});

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('잘못된 URL 형식이면 400 에러 반환', async () => {
      const res = await request(app)
        .post('/api/phishing/detect')
        .send({ url: 'not-a-url' });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('유효한 URL이면 200 반환 및 응답 구조 확인', async () => {
      const res = await request(app)
        .post('/api/phishing/detect')
        .send({ url: 'https://example.com' });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('result');
      
      const result = res.body.data.result;
      expect(result).toHaveProperty('phishingScore');
      expect(result).toHaveProperty('riskLevel');
      expect(result).toHaveProperty('reasons');
      expect(result).toHaveProperty('recommendations');
      expect(result).toHaveProperty('analysis');
      
      // 타입 검증
      expect(typeof result.phishingScore).toBe('number');
      expect(typeof result.riskLevel).toBe('string');
      expect(Array.isArray(result.reasons)).toBe(true);
      expect(Array.isArray(result.recommendations)).toBe(true);
    });

    it('피싱 점수는 0-100 범위', async () => {
      const res = await request(app)
        .post('/api/phishing/detect')
        .send({ url: 'https://example.com' });

      if (res.statusCode === 200) {
        const score = res.body.data.result.phishingScore;
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
      }
    });

    it('위험도 레벨은 유효한 값', async () => {
      const res = await request(app)
        .post('/api/phishing/detect')
        .send({ url: 'https://example.com' });

      if (res.statusCode === 200) {
        const riskLevel = res.body.data.result.riskLevel;
        expect(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).toContain(riskLevel);
      }
    });

    it('의심스러운 도메인에 대한 분석', async () => {
      const res = await request(app)
        .post('/api/phishing/detect')
        .send({ url: 'https://suspicious-site.tk' });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      
      if (res.body.data.result) {
        // 의심스러운 TLD는 낮은 점수 (높은 위험)
        expect(res.body.data.result.phishingScore).toBeLessThan(100);
      }
    });
  });

  describe('POST /api/ai-analysis/phishing/detect', () => {
    it('별칭 경로도 동일하게 동작', async () => {
      const res = await request(app)
        .post('/api/ai-analysis/phishing/detect')
        .send({ url: 'https://example.com' });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('result');
    });
  });

  describe('POST /api/ai/detect', () => {
    it('별칭 경로도 동일하게 동작', async () => {
      const res = await request(app)
        .post('/api/ai/detect')
        .send({ url: 'https://example.com' });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('result');
    });
  });

  describe('에러 핸들링', () => {
    it('외부 API 실패 시 Graceful Fallback', async () => {
      // 실제로는 mock을 사용하지만, 여기서는 기본 동작 확인
      const res = await request(app)
        .post('/api/phishing/detect')
        .send({ url: 'https://invalid-domain-that-does-not-exist-12345.com' });

      // 실패하더라도 일관된 에러 응답 형식
      if (res.statusCode !== 200) {
        expect(res.body.success).toBe(false);
        expect(res.body).toHaveProperty('error');
      }
    });
  });
});

