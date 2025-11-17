/**
 * URL 정규화 함수 테스트
 * 
 * 교수님 피드백 반영 테스트 케이스:
 * - m.naver.com, www.naver.com, naver.com, http://www.naver.com, https://www.naver.com 등
 *   모두 동일한 쇼핑몰로 인식하도록 통합
 * - 쿼리스트링/앵커 제거
 * - /index.* 같은 기본 페이지를 / 로 통합
 */

const { normalizeUrl } = require('../utils/url');

describe('normalizeUrl 함수 테스트', () => {
  
  // ============================================================================
  // 기본 프로토콜 제거 테스트
  // ============================================================================
  test('프로토콜 제거: https://example.com → example.com', () => {
    expect(normalizeUrl('https://example.com')).toBe('example.com');
  });

  test('프로토콜 제거: http://example.com → example.com', () => {
    expect(normalizeUrl('http://example.com')).toBe('example.com');
  });

  test('프로토콜 자동 추가: example.com → example.com (프로토콜 제거된 결과)', () => {
    expect(normalizeUrl('example.com')).toBe('example.com');
  });

  // ============================================================================
  // www. 제거 테스트
  // ============================================================================
  test('www. 제거: www.naver.com → naver.com', () => {
    expect(normalizeUrl('www.naver.com')).toBe('naver.com');
  });

  test('www. 제거: https://www.naver.com → naver.com', () => {
    expect(normalizeUrl('https://www.naver.com')).toBe('naver.com');
  });

  test('www. 제거: http://www.naver.com → naver.com', () => {
    expect(normalizeUrl('http://www.naver.com')).toBe('naver.com');
  });

  // ============================================================================
  // 모바일 서브도메인 통합 테스트
  // ============================================================================
  test('모바일 도메인 통합: m.naver.com → naver.com', () => {
    expect(normalizeUrl('m.naver.com')).toBe('naver.com');
  });

  test('모바일 도메인 통합: https://m.naver.com → naver.com', () => {
    expect(normalizeUrl('https://m.naver.com')).toBe('naver.com');
  });

  test('모바일 도메인 통합: mobile.naver.com → naver.com', () => {
    expect(normalizeUrl('mobile.naver.com')).toBe('naver.com');
  });

  // ============================================================================
  // 동일 쇼핑몰 통합 테스트 (교수님 피드백)
  // ============================================================================
  test('동일 쇼핑몰 통합: m.naver.com → naver.com', () => {
    expect(normalizeUrl('m.naver.com')).toBe('naver.com');
  });

  test('동일 쇼핑몰 통합: www.naver.com → naver.com', () => {
    expect(normalizeUrl('www.naver.com')).toBe('naver.com');
  });

  test('동일 쇼핑몰 통합: naver.com → naver.com', () => {
    expect(normalizeUrl('naver.com')).toBe('naver.com');
  });

  test('동일 쇼핑몰 통합: http://www.naver.com → naver.com', () => {
    expect(normalizeUrl('http://www.naver.com')).toBe('naver.com');
  });

  test('동일 쇼핑몰 통합: https://www.naver.com → naver.com', () => {
    expect(normalizeUrl('https://www.naver.com')).toBe('naver.com');
  });

  test('동일 쇼핑몰 통합: https://www.naver.com/index.do?from=pc → naver.com/', () => {
    expect(normalizeUrl('https://www.naver.com/index.do?from=pc')).toBe('naver.com/');
  });

  // ============================================================================
  // 쿼리스트링/앵커 제거 테스트
  // ============================================================================
  test('쿼리스트링 제거: example.com?param=value → example.com', () => {
    expect(normalizeUrl('example.com?param=value')).toBe('example.com');
  });

  test('앵커 제거: example.com#section → example.com', () => {
    expect(normalizeUrl('example.com#section')).toBe('example.com');
  });

  test('쿼리스트링+앵커 제거: example.com?param=value#section → example.com', () => {
    expect(normalizeUrl('example.com?param=value#section')).toBe('example.com');
  });

  // ============================================================================
  // index 페이지 통합 테스트
  // ============================================================================
  test('index 페이지 통합: www.naver.com/index.html → naver.com/', () => {
    expect(normalizeUrl('www.naver.com/index.html')).toBe('naver.com/');
  });

  test('index 페이지 통합: www.naver.com/index.do → naver.com/', () => {
    expect(normalizeUrl('www.naver.com/index.do')).toBe('naver.com/');
  });

  test('index 페이지 통합: www.naver.com/index.php → naver.com/', () => {
    expect(normalizeUrl('www.naver.com/index.php')).toBe('naver.com/');
  });

  test('index 페이지 통합: www.naver.com/index.jsp → naver.com/', () => {
    expect(normalizeUrl('www.naver.com/index.jsp')).toBe('naver.com/');
  });

  test('index 페이지 통합: https://www.naver.com/index.do?from=pc → naver.com/', () => {
    expect(normalizeUrl('https://www.naver.com/index.do?from=pc')).toBe('naver.com/');
  });

  // ============================================================================
  // 2단계 TLD 테스트
  // ============================================================================
  test('2단계 TLD: example.co.kr → example.co.kr', () => {
    expect(normalizeUrl('example.co.kr')).toBe('example.co.kr');
  });

  test('2단계 TLD 서브도메인 제거: shop.example.co.kr → example.co.kr', () => {
    expect(normalizeUrl('shop.example.co.kr')).toBe('example.co.kr');
  });

  // ============================================================================
  // 네이버 스마트 스토어 특별 처리 테스트
  // ============================================================================
  test('네이버 스마트 스토어: smartstore.naver.com/store123 → smartstore.naver.com/store123', () => {
    expect(normalizeUrl('smartstore.naver.com/store123')).toBe('smartstore.naver.com/store123');
  });

  // ============================================================================
  // 경로 유지 테스트
  // ============================================================================
  test('경로 유지: example.com/products → example.com/products', () => {
    expect(normalizeUrl('example.com/products')).toBe('example.com/products');
  });

  test('경로 유지 + 쿼리스트링 제거: example.com/products?id=1 → example.com/products', () => {
    expect(normalizeUrl('example.com/products?id=1')).toBe('example.com/products');
  });

  // ============================================================================
  // 에러 처리 테스트
  // ============================================================================
  test('빈 문자열 처리: "" → ""', () => {
    expect(normalizeUrl('')).toBe('');
  });

  test('null 처리: null → null', () => {
    expect(normalizeUrl(null)).toBe(null);
  });

  test('undefined 처리: undefined → undefined', () => {
    expect(normalizeUrl(undefined)).toBe(undefined);
  });

  // ============================================================================
  // 실제 쇼핑몰 사례 테스트
  // ============================================================================
  test('실제 쇼핑몰 1: m.11st.co.kr → 11st.co.kr', () => {
    expect(normalizeUrl('m.11st.co.kr')).toBe('11st.co.kr');
  });

  test('실제 쇼핑몰 2: www.coupang.com → coupang.com', () => {
    expect(normalizeUrl('www.coupang.com')).toBe('coupang.com');
  });

  test('실제 쇼핑몰 3: mobile.coupang.com → coupang.com', () => {
    expect(normalizeUrl('mobile.coupang.com')).toBe('coupang.com');
  });
});

// 실행 방법:
// npm install --save-dev jest
// npx jest url-normalization.test.js

