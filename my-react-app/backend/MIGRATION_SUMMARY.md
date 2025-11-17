# 데이터베이스 리팩토링 마이그레이션 요약

## 개요

최병욱 교수님 피드백을 반영하여 PostgreSQL (Supabase) 데이터베이스 스키마와 백엔드 코드를 리팩토링함.

## 주요 변경 사항

### 1. 테이블 네이밍 리팩토링

더 명확한 의미와 일관된 복수형으로 테이블 이름 변경:

- `reports` → `shop_reports`
- `ratings` → `shop_ratings`
- `uploaded_files` → `report_evidence_attachments`
- `sms_request_tracking` → `sms_request_logs`
- `ai_analysis_cache` → `ai_analysis_cache_entries`
- `web_analysis` → `web_analysis_results`

**마이그레이션 파일**: `backend/migrations/001_table_naming_refactoring.sql`

### 2. 인덱스 구조 최적화

불필요한 인덱스 제거 및 필요한 복합 인덱스 추가:

**제거된 인덱스**:
- 시간 기반 단독 인덱스 (`created_at`)
- 자주 변경되는 카운터 인덱스 (`search_count`)
- 사용 빈도가 낮은 인덱스

**추가된 복합 인덱스**:
- `idx_shop_ratings_shop_id_rating` (shop_id + rating)
- `idx_shop_reports_shop_id_status` (shop_id + status)

**마이그레이션 파일**: `backend/migrations/002_index_optimization.sql`

### 3. NULL 처리 전략 개선

익명 사용자 도입 및 user_id NOT NULL 적용:

- 익명 사용자 생성 (email: `anonymous@system.local`, username: `anonymous`)
- 기존 NULL user_id를 익명 사용자로 업데이트
- `shop_reports.user_id`, `shop_ratings.user_id`에 NOT NULL 제약조건 추가
- 외래키 제약조건 `ON DELETE SET NULL` → `ON DELETE RESTRICT` 변경

**마이그레이션 파일**: `backend/migrations/003_anonymous_user_and_null_handling.sql`

### 4. CASCADE 전략 재고

사용자 탈퇴 시 물리 삭제 대신 status 변경:

- `users.status` 컬럼 추가 (active, unregistered, deleted, anonymous)
- 모든 외래키 제약조건 `ON DELETE CASCADE` → `ON DELETE RESTRICT` 변경
- 탈퇴 사용자 마스킹 함수 `get_user_display_name()` 생성

**주의**: 사용자 탈퇴 시 `DELETE` 대신 `UPDATE users SET status = 'deleted'` 사용 필요

**마이그레이션 파일**: `backend/migrations/004_cascade_strategy_refactoring.sql`

### 5. ENUM 도입

verification_source를 ENUM 타입으로 변경:

- `verification_source_enum` 타입 생성 (API, MANUAL, CRAWLING)
- `business_registrations.verification_source` 컬럼 타입 변경: VARCHAR → ENUM

**마이그레이션 파일**: `backend/migrations/005_enum_verification_source.sql`

### 6. URL 정규화 강화

normalizeUrl 함수 개선:

- `m.naver.com`, `www.naver.com`, `naver.com` 등 모두 동일한 쇼핑몰로 인식
- 쿼리스트링/앵커 제거
- `/index.*` 같은 기본 페이지를 `/`로 통합
- 모바일 서브도메인 제거 확대

**파일**: `backend/utils/url.js`

**테스트 파일**: `backend/tests/url-normalization.test.js`

### 7. 백엔드 코드 업데이트

모든 테이블 참조를 새 이름으로 업데이트:

- `services/reportService.js`
- `services/shopService.js`
- `services/smsService.js`
- `controllers/ratingController.js`
- `controllers/adminController.js`
- `controllers/shopController.js`

