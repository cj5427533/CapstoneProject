/**
 * Jest 테스트 전역 설정
 */
// 테스트 환경 변수 설정
process.env.NODE_ENV = 'test';

// 테스트용 환경 변수 기본값 설정 (실제 값은 .env.test에서 로드)
if (!process.env.SUPABASE_URL) {
  process.env.SUPABASE_URL = process.env.SUPABASE_URL_TEST || 'https://test.supabase.co';
}
if (!process.env.SUPABASE_KEY) {
  process.env.SUPABASE_KEY = process.env.SUPABASE_KEY_TEST || 'test-key';
}
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'test-jwt-secret-key';
}
if (!process.env.PORT) {
  process.env.PORT = '3002';
}

// 콘솔 로그 억제 (테스트 중 불필요한 로그 방지)
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

