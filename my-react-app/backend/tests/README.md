# Backend API 테스트 가이드

## 개요

이 디렉토리에는 Backend API의 스모크 테스트와 회귀 테스트가 포함되어 있습니다.

## 테스트 구조

```
tests/
├── setup.js          # Jest 전역 설정
├── auth.test.js      # 인증 API 테스트
├── shops.test.js     # 쇼핑몰 API 테스트
├── reports.test.js   # 신고 API 테스트
├── ai.test.js        # AI 분석 API 테스트
└── admin.test.js     # 관리자 API 테스트
```

## 실행 방법

### 1. 환경 변수 설정

`.env.test.example` 파일을 참고하여 `.env.test` 파일을 생성하고 실제 값으로 채워주세요.

```bash
cp .env.test.example .env.test
# .env.test 파일 편집
```

### 2. 테스트 실행

```bash
# 전체 테스트 실행
npm test

# Watch 모드 (파일 변경 시 자동 재실행)
npm run test:watch

# 커버리지 포함
npm run test:coverage
```

## 테스트 범위

### Auth API
- SMS 인증 발송/확인
- 회원가입
- 로그인
- 사용자명 중복 확인
- 비밀번호 재설정
- 내 정보 조회

### Shops API
- 쇼핑몰 검색
- 신고/평점/리뷰 조회
- 위험/추천 쇼핑몰 목록
- 평점 등록

### Reports API
- 신고 생성
- 신고 조회 (전체/사용자별)
- 신고 수정/삭제

### AI Analysis API
- 피싱 탐지
- 응답 구조 검증

### Admin API
- 관리자 권한 검증
- 쇼핑몰/신고/사용자 관리
- 통계 조회

## 주의사항

1. **실제 DB 연결 필요**: 일부 테스트는 실제 Supabase 연결이 필요합니다.
2. **테스트 데이터**: 테스트 실행 시 실제 데이터가 생성될 수 있습니다.
3. **통합 테스트 스킵**: `SKIP_INTEGRATION_TESTS=true` 환경 변수로 통합 테스트를 스킵할 수 있습니다.

## 문제 해결

### 테스트 실패 시

1. 환경 변수 확인 (`.env.test`)
2. Supabase 연결 확인
3. 테스트 데이터 정리
4. 로그 확인

### 특정 테스트만 실행

```bash
# 특정 파일만 실행
npm test -- auth.test.js

# 특정 테스트만 실행
npm test -- -t "로그인"
```

## 추가 개발

새로운 API 엔드포인트를 추가할 때는 해당 도메인의 테스트 파일에 테스트 케이스를 추가해주세요.

