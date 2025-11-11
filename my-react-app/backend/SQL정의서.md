# "여기몰까" SQL 정의서

## 📋 문서 정보

- **프로젝트명**: 여기몰까
- **목적**: 온라인 쇼핑몰의 신뢰도를 분석하고 피해 사례를 공유하는 플랫폼
- **데이터베이스**: PostgreSQL (Supabase)
- **버전**: 2.0
- **작성일**: 2025.01.15
- **최종 수정일**: 2025.01.15

---

## 📊 전체 데이터베이스 구조 개요

### 테이블 목록

| 카테고리 | 테이블명 | 설명 |
|---------|---------|------|
| 사용자 관리 | `users` | 회원가입한 사용자 정보 |
| 사용자 관리 | `password_reset_tokens` | 비밀번호 재설정 토큰 |
| 쇼핑몰 관리 | `shops` | 분석 대상 쇼핑몰 정보 (병합 지원) |
| 신고 및 평가 | `reports` | 피해 신고 (회원/비회원 모두 사용 가능) |
| 신고 및 평가 | `ratings` | 쇼핑몰 평점 (회원/비회원 모두 평가 가능) |
| SMS 인증 | `sms_verifications` | SMS 인증번호 발송 및 검증 |
| SMS 인증 | `sms_request_tracking` | SMS 요청 레이트 리밋 및 IP 추적 (통합) |
| 커뮤니티 | `community_posts` | 커뮤니티 게시글 (회원 전용) |
| 커뮤니티 | `community_comments` | 게시글 댓글 |
| 커뮤니티 | `community_post_likes` | 게시글 좋아요 (중복 방지) |
| AI 분석 | `ai_analysis_cache` | AI 분석 결과 캐시 |
| AI 분석 | `web_analysis` | 웹 크롤링 및 기술적 분석 결과 |
| AI 분석 | `business_registrations` | 사업자 등록 정보 |
| AI 분석 | `uploaded_files` | 신고 증빙 파일 |

**총 14개 테이블**

---

## 📐 테이블 상세 정의

### 1. users (사용자 테이블)

**역할**: 회원가입한 사용자 정보를 저장하는 메인 테이블

| 컬럼명 | 타입 | 제약조건 | 기본값 | 설명 |
|--------|------|----------|--------|------|
| id | BIGSERIAL | PRIMARY KEY | - | 사용자 고유 ID |
| username | VARCHAR(255) | UNIQUE NOT NULL | - | 사용자 이름 (고유값) |
| email | VARCHAR(255) | UNIQUE NOT NULL | - | 이메일 주소 (고유값) |
| password | VARCHAR(255) | NOT NULL | - | 암호화된 비밀번호 |
| phone_number | VARCHAR(20) | UNIQUE NOT NULL | - | 전화번호 (고유값) |
| created_at | TIMESTAMP WITH TIME ZONE | - | NOW() | 계정 생성일시 |
| updated_at | TIMESTAMP WITH TIME ZONE | - | NOW() | 계정 정보 수정일시 |

**인덱스:**
- `idx_users_email` (email)
- `idx_users_phone_number` (phone_number)
- `idx_users_created_at` (created_at)

**참조 관계:**
- `password_reset_tokens.user_id` → `users.id` (ON DELETE CASCADE)
- `community_posts.user_id` → `users.id` (ON DELETE CASCADE)
- `community_comments.user_id` → `users.id` (ON DELETE CASCADE)
- `community_post_likes.user_id` → `users.id` (ON DELETE CASCADE)
- `reports.user_id` → `users.id` (ON DELETE SET NULL, 선택적)
- `ratings.user_id` → `users.id` (ON DELETE SET NULL, 선택적)

---

### 2. password_reset_tokens (비밀번호 재설정 토큰 테이블)

**역할**: 비밀번호 재설정을 위한 임시 토큰 관리

| 컬럼명 | 타입 | 제약조건 | 기본값 | 설명 |
|--------|------|----------|--------|------|
| id | BIGSERIAL | PRIMARY KEY | - | 토큰 ID |
| user_id | BIGINT | FOREIGN KEY NOT NULL | - | 재설정 대상 사용자 ID |
| token | VARCHAR(255) | UNIQUE NOT NULL | - | 재설정 토큰 (고유값) |
| expires_at | TIMESTAMP WITH TIME ZONE | NOT NULL | - | 토큰 만료일시 |
| used | BOOLEAN | - | FALSE | 토큰 사용 여부 |
| created_at | TIMESTAMP WITH TIME ZONE | - | NOW() | 생성일시 |

**인덱스:**
- `idx_password_reset_tokens_token` (token)
- `idx_password_reset_tokens_user_id` (user_id)
- `idx_password_reset_tokens_expires_at` (expires_at)

**참조 관계:**
- `password_reset_tokens.user_id` → `users.id` (ON DELETE CASCADE)

---

### 3. shops (쇼핑몰 테이블)

**역할**: 분석 대상 쇼핑몰 정보 저장 (병합 쇼핑몰 지원)

| 컬럼명 | 타입 | 제약조건 | 기본값 | 설명 |
|--------|------|----------|--------|------|
| id | BIGSERIAL | PRIMARY KEY | - | 쇼핑몰 고유 ID |
| url | VARCHAR(500) | UNIQUE NOT NULL | - | 쇼핑몰 URL (정규화된 형태) |
| name | VARCHAR(255) | - | - | 쇼핑몰 이름 |
| parent_shop_id | BIGINT | FOREIGN KEY | - | 병합된 부모 쇼핑몰 ID (NULL: 독립 쇼핑몰) |
| search_count | INTEGER | - | 0 | 검색된 횟수 (인기도 측정용) |
| created_at | TIMESTAMP WITH TIME ZONE | - | NOW() | 등록일시 |
| updated_at | TIMESTAMP WITH TIME ZONE | - | NOW() | 수정일시 |

**제약조건:**
- `check_parent_not_self`: `parent_shop_id IS NULL OR parent_shop_id != id` (무한루프 방지)

**인덱스:**
- `idx_shops_url` (url)
- `idx_shops_parent_shop_id` (parent_shop_id)
- `idx_shops_created_at` (created_at)
- `idx_shops_search_count` (search_count)

**참조 관계:**
- `shops.parent_shop_id` → `shops.id` (자기 참조, ON DELETE SET NULL)
- `reports.shop_id` → `shops.id` (ON DELETE CASCADE)
- `ratings.shop_id` → `shops.id` (ON DELETE CASCADE)
- `ai_analysis_cache.shop_id` → `shops.id` (ON DELETE CASCADE)
- `web_analysis.shop_id` → `shops.id` (ON DELETE CASCADE)
- `business_registrations.shop_id` → `shops.id` (ON DELETE CASCADE)

**트리거:**
- `trigger_check_shop_parent_cycle`: 순환 참조 방지 (간접 순환까지 체크)

---

### 4. reports (신고 테이블)

**역할**: 사용자의 피해 신고 저장 (회원/비회원 모두 사용 가능)

| 컬럼명 | 타입 | 제약조건 | 기본값 | 설명 |
|--------|------|----------|--------|------|
| id | BIGSERIAL | PRIMARY KEY | - | 신고 ID |
| shop_id | BIGINT | FOREIGN KEY NOT NULL | - | 신고 대상 쇼핑몰 ID |
| user_id | BIGINT | FOREIGN KEY | - | 신고자 사용자 ID (NULL: 비회원 신고) |
| reporter_name | VARCHAR(255) | - | - | 신고자 이름 |
| reporter_phone | VARCHAR(20) | - | - | 신고자 전화번호 |
| categories | TEXT | NOT NULL | - | 피해 유형 (JSON 또는 텍스트) |
| description | TEXT | NOT NULL | - | 신고 상세 내용 |
| evidence_type | VARCHAR(50) | - | 'NONE' | 증빙 유형 (NONE, IMAGE, VIDEO, DOCUMENT 등) |
| evidence_files | TEXT | - | - | 증빙 파일 경로 (JSON 형태) |
| evidence_verified | BOOLEAN | - | FALSE | 증빙 검증 여부 |
| verification_score | INTEGER | - | 0 | 검증 점수 (0-100) |
| report_type | VARCHAR(50) | - | 'GENERAL_REVIEW' | 신고 유형 (GENERAL_REVIEW, FRAUD, DELAYED_DELIVERY 등) |
| created_at | TIMESTAMP WITH TIME ZONE | - | NOW() | 신고일시 |
| updated_at | TIMESTAMP WITH TIME ZONE | - | NOW() | 수정일시 |

**인덱스:**
- `idx_reports_shop_id` (shop_id)
- `idx_reports_user_id` (user_id)
- `idx_reports_created_at` (created_at)
- `idx_reports_evidence_type` (evidence_type)
- `idx_reports_report_type` (report_type)
- `idx_reports_verification_score` (verification_score)

**참조 관계:**
- `reports.shop_id` → `shops.id` (ON DELETE CASCADE, 필수)
- `reports.user_id` → `users.id` (ON DELETE SET NULL, 선택적)
- `uploaded_files.report_id` → `reports.id` (ON DELETE CASCADE)

**특징:**
- `user_id`는 선택적이며 NULL 가능 (비회원 신고 지원)
- 증빙 파일은 별도 테이블 (`uploaded_files`)로 관리

---

### 5. ratings (평점 테이블)

**역할**: 쇼핑몰에 대한 사용자 평점 저장 (회원/비회원 모두 평가 가능)

| 컬럼명 | 타입 | 제약조건 | 기본값 | 설명 |
|--------|------|----------|--------|------|
| id | BIGSERIAL | PRIMARY KEY | - | 평점 ID |
| shop_id | BIGINT | FOREIGN KEY NOT NULL | - | 평가 대상 쇼핑몰 ID |
| user_id | BIGINT | FOREIGN KEY | - | 평가자 사용자 ID (NULL: 비회원 평가) |
| rating | INTEGER | CHECK (1-5) NOT NULL | - | 별점 (1-5점) |
| comment | TEXT | - | - | 평가 코멘트 (선택적) |
| created_at | TIMESTAMP WITH TIME ZONE | - | NOW() | 등록일시 |

**인덱스:**
- `idx_ratings_shop_id` (shop_id)
- `idx_ratings_user_id` (user_id)
- `idx_ratings_created_at` (created_at)
- `idx_ratings_rating` (rating)

**참조 관계:**
- `ratings.shop_id` → `shops.id` (ON DELETE CASCADE, 필수)
- `ratings.user_id` → `users.id` (ON DELETE SET NULL, 선택적)

**특징:**
- `user_id`는 선택적이며 NULL 가능 (비회원 평가 지원)

---

### 6. sms_verifications (SMS 인증 테이블)

**역할**: SMS 인증번호 발송 및 검증 관리

| 컬럼명 | 타입 | 제약조건 | 기본값 | 설명 |
|--------|------|----------|--------|------|
| id | BIGSERIAL | PRIMARY KEY | - | 인증 ID |
| phone_number | VARCHAR(20) | NOT NULL | - | 인증 대상 전화번호 |
| verification_code | VARCHAR(10) | NOT NULL | - | 발송된 인증번호 |
| is_verified | BOOLEAN | - | FALSE | 인증 완료 여부 |
| expires_at | TIMESTAMP WITH TIME ZONE | - | - | 인증번호 만료일시 |
| created_at | TIMESTAMP WITH TIME ZONE | - | NOW() | 생성일시 |

**인덱스:**
- `idx_sms_verifications_phone` (phone_number)
- `idx_sms_verifications_code` (verification_code)

**특징:**
- users와 독립적 (인증 완료 전에는 user_id 없음)

---

### 7. sms_request_tracking (SMS 요청 추적 테이블)

**역할**: SMS 발송 요청 레이트 리밋 및 IP 추적 통합 관리 (sms_rate_limits + sms_care_areas 통합)

| 컬럼명 | 타입 | 제약조건 | 기본값 | 설명 |
|--------|------|----------|--------|------|
| id | BIGSERIAL | PRIMARY KEY | - | 추적 ID |
| phone_number | VARCHAR(20) | NOT NULL | - | 요청 전화번호 |
| ip_address | INET | - | - | 요청 IP 주소 (IPv4/IPv6) |
| sent_count | INTEGER | - | 1 | 발송 횟수 (분당 제한용) |
| last_sent_at | TIMESTAMP WITH TIME ZONE | - | NOW() | 마지막 발송 시간 |
| created_at | TIMESTAMP WITH TIME ZONE | - | NOW() | 최초 요청 일시 |
| updated_at | TIMESTAMP WITH TIME ZONE | - | NOW() | 정보 수정일시 |

**인덱스:**
- `idx_sms_request_tracking_phone` (phone_number)
- `idx_sms_request_tracking_ip` (ip_address)

**특징:**
- 기존 `sms_rate_limits`와 `sms_care_areas` 기능 통합
- users와 독립적 (IP 기반 추적)

---

### 8. community_posts (커뮤니티 게시글 테이블)

**역할**: 커뮤니티 게시글 저장 (회원 전용)

| 컬럼명 | 타입 | 제약조건 | 기본값 | 설명 |
|--------|------|----------|--------|------|
| id | BIGSERIAL | PRIMARY KEY | - | 게시글 ID |
| user_id | BIGINT | FOREIGN KEY NOT NULL | - | 게시글 작성자 ID |
| title | VARCHAR(100) | NOT NULL | - | 게시글 제목 |
| content | TEXT | NOT NULL | - | 게시글 내용 |
| views | INTEGER | - | 0 | 조회수 |
| likes | INTEGER | - | 0 | 좋아요 수 (실제는 community_post_likes 테이블에서 집계) |
| created_at | TIMESTAMP WITH TIME ZONE | - | NOW() | 작성일시 |
| updated_at | TIMESTAMP WITH TIME ZONE | - | NOW() | 수정일시 |

**인덱스:**
- `idx_community_posts_user_id` (user_id)
- `idx_community_posts_created_at` (created_at)

**참조 관계:**
- `community_posts.user_id` → `users.id` (ON DELETE CASCADE, 필수)
- `community_comments.post_id` → `community_posts.id` (ON DELETE CASCADE)
- `community_post_likes.post_id` → `community_posts.id` (ON DELETE CASCADE)

**특징:**
- 회원 전용 기능 (user_id 필수)

---

### 9. community_comments (커뮤니티 댓글 테이블)

**역할**: 게시글에 대한 댓글 저장

| 컬럼명 | 타입 | 제약조건 | 기본값 | 설명 |
|--------|------|----------|--------|------|
| id | BIGSERIAL | PRIMARY KEY | - | 댓글 ID |
| post_id | BIGINT | FOREIGN KEY NOT NULL | - | 소속 게시글 ID |
| user_id | BIGINT | FOREIGN KEY NOT NULL | - | 댓글 작성자 ID |
| content | VARCHAR(500) | NOT NULL | - | 댓글 내용 |
| created_at | TIMESTAMP WITH TIME ZONE | - | NOW() | 작성일시 |

**인덱스:**
- `idx_community_comments_post_id` (post_id)
- `idx_community_comments_user_id` (user_id)

**참조 관계:**
- `community_comments.post_id` → `community_posts.id` (ON DELETE CASCADE)
- `community_comments.user_id` → `users.id` (ON DELETE CASCADE)

---

### 10. community_post_likes (커뮤니티 게시글 좋아요 테이블)

**역할**: 게시글 좋아요 저장 (중복 방지)

| 컬럼명 | 타입 | 제약조건 | 기본값 | 설명 |
|--------|------|----------|--------|------|
| id | BIGSERIAL | PRIMARY KEY | - | 좋아요 ID |
| post_id | BIGINT | FOREIGN KEY NOT NULL | - | 대상 게시글 ID |
| user_id | BIGINT | FOREIGN KEY NOT NULL | - | 좋아요한 사용자 ID |
| created_at | TIMESTAMP WITH TIME ZONE | - | NOW() | 생성일시 |

**제약조건:**
- `UNIQUE(post_id, user_id)`: 중복 좋아요 방지

**인덱스:**
- `idx_community_post_likes_post_id` (post_id)
- `idx_community_post_likes_user_id` (user_id)

**참조 관계:**
- `community_post_likes.post_id` → `community_posts.id` (ON DELETE CASCADE)
- `community_post_likes.user_id` → `users.id` (ON DELETE CASCADE)

---

### 11. ai_analysis_cache (AI 분석 결과 캐시 테이블)

**역할**: AI 분석 결과를 캐시하여 성능 최적화

| 컬럼명 | 타입 | 제약조건 | 기본값 | 설명 |
|--------|------|----------|--------|------|
| id | BIGSERIAL | PRIMARY KEY | - | 캐시 ID |
| shop_id | BIGINT | FOREIGN KEY NOT NULL | - | 분석 대상 쇼핑몰 ID |
| analysis_type | VARCHAR(50) | NOT NULL | - | 분석 유형 (RISK_ANALYSIS, BUSINESS_ANALYSIS, WEB_ANALYSIS 등) |
| analysis_result | TEXT | NOT NULL | - | 분석 결과 (JSON 형태) |
| analysis_date | TIMESTAMP WITH TIME ZONE | - | NOW() | 분석 수행일시 |
| expires_at | TIMESTAMP WITH TIME ZONE | NOT NULL | - | 캐시 만료일시 |
| created_at | TIMESTAMP WITH TIME ZONE | - | NOW() | 생성일시 |

**인덱스:**
- `idx_ai_analysis_cache_shop_id` (shop_id)
- `idx_ai_analysis_cache_expires_at` (expires_at)
- `idx_ai_analysis_cache_type` (analysis_type)

**참조 관계:**
- `ai_analysis_cache.shop_id` → `shops.id` (ON DELETE CASCADE)

---

### 12. web_analysis (웹 분석 결과 테이블)

**역할**: 웹 크롤링 및 기술적 분석 결과 저장

| 컬럼명 | 타입 | 제약조건 | 기본값 | 설명 |
|--------|------|----------|--------|------|
| id | BIGSERIAL | PRIMARY KEY | - | 분석 ID |
| shop_id | BIGINT | FOREIGN KEY NOT NULL | - | 분석 대상 쇼핑몰 ID |
| suspicious_keywords | TEXT | - | - | 의심 키워드 (JSON 형태) |
| price_analysis | TEXT | - | - | 가격 분석 결과 (JSON 형태) |
| technical_analysis | TEXT | - | - | 기술적 분석 결과 (JSON 형태) |
| domain_analysis | TEXT | - | - | 도메인 분석 결과 (JSON 형태) |
| analysis_date | TIMESTAMP WITH TIME ZONE | - | NOW() | 분석 수행일시 |
| analysis_source | VARCHAR(50) | - | 'AUTO' | 분석 소스 (AUTO: 자동, MANUAL: 수동) |
| confidence_score | INTEGER | - | 0 | 분석 신뢰도 점수 (0-100) |
| created_at | TIMESTAMP WITH TIME ZONE | - | NOW() | 생성일시 |

**인덱스:**
- `idx_web_analysis_shop_id` (shop_id)
- `idx_web_analysis_analysis_date` (analysis_date)

**참조 관계:**
- `web_analysis.shop_id` → `shops.id` (ON DELETE CASCADE)

---

### 13. business_registrations (사업자 등록 정보 테이블)

**역할**: 공정위/국세청 등록 정보 저장

| 컬럼명 | 타입 | 제약조건 | 기본값 | 설명 |
|--------|------|----------|--------|------|
| id | BIGSERIAL | PRIMARY KEY | - | 등록 정보 ID |
| shop_id | BIGINT | FOREIGN KEY NOT NULL | - | 연결된 쇼핑몰 ID |
| business_number | VARCHAR(20) | - | - | 사업자 등록번호 |
| registration_date | DATE | - | - | 등록일 |
| business_status | VARCHAR(20) | - | 'UNKNOWN' | 사업 상태 (ACTIVE, SUSPENDED, CLOSED, UNKNOWN) |
| business_type | VARCHAR(100) | - | - | 사업 유형 |
| capital_amount | BIGINT | - | - | 자본금 |
| representative_name | VARCHAR(100) | - | - | 대표자 이름 |
| business_address | TEXT | - | - | 사업자 주소 |
| phone_number | VARCHAR(20) | - | - | 전화번호 |
| email | VARCHAR(255) | - | - | 이메일 |
| last_verified | TIMESTAMP WITH TIME ZONE | - | NOW() | 마지막 검증일시 |
| verification_source | VARCHAR(50) | - | 'MANUAL' | 검증 소스 (API, MANUAL, CRAWLING) |
| created_at | TIMESTAMP WITH TIME ZONE | - | NOW() | 생성일시 |
| updated_at | TIMESTAMP WITH TIME ZONE | - | NOW() | 수정일시 |

**인덱스:**
- `idx_business_registrations_shop_id` (shop_id)
- `idx_business_registrations_business_number` (business_number)
- `idx_business_registrations_business_status` (business_status)

**참조 관계:**
- `business_registrations.shop_id` → `shops.id` (ON DELETE CASCADE)

---

### 14. uploaded_files (파일 업로드 관리 테이블)

**역할**: 신고에 첨부된 증빙 파일 관리

| 컬럼명 | 타입 | 제약조건 | 기본값 | 설명 |
|--------|------|----------|--------|------|
| id | BIGSERIAL | PRIMARY KEY | - | 파일 ID |
| report_id | BIGINT | FOREIGN KEY NOT NULL | - | 연결된 신고 ID |
| file_name | VARCHAR(255) | NOT NULL | - | 파일명 |
| file_path | VARCHAR(500) | NOT NULL | - | 파일 경로 |
| file_size | BIGINT | NOT NULL | - | 파일 크기 (바이트) |
| file_type | VARCHAR(100) | NOT NULL | - | 파일 타입 |
| upload_date | TIMESTAMP WITH TIME ZONE | - | NOW() | 업로드일시 |
| verification_status | VARCHAR(20) | - | 'PENDING' | 파일 검증 상태 (PENDING, VERIFIED, REJECTED) |

**인덱스:**
- `idx_uploaded_files_report_id` (report_id)

**참조 관계:**
- `uploaded_files.report_id` → `reports.id` (ON DELETE CASCADE)

---

## 🔗 주요 관계도 (ERD 요약)

### 관계 종류

| 관계 | 부모 테이블 | 자식 테이블 | 카디널리티 | 삭제 정책 |
|------|------------|------------|-----------|----------|
| 사용자 → 비밀번호 재설정 | users | password_reset_tokens | 1:N | CASCADE |
| 사용자 → 커뮤니티 게시글 | users | community_posts | 1:N | CASCADE |
| 사용자 → 커뮤니티 댓글 | users | community_comments | 1:N | CASCADE |
| 사용자 → 커뮤니티 좋아요 | users | community_post_likes | 1:N | CASCADE |
| 사용자 → 신고 (선택적) | users | reports | 1:N | SET NULL |
| 사용자 → 평점 (선택적) | users | ratings | 1:N | SET NULL |
| 쇼핑몰 → 쇼핑몰 (자기 참조) | shops | shops | 1:N | SET NULL |
| 쇼핑몰 → 신고 | shops | reports | 1:N | CASCADE |
| 쇼핑몰 → 평점 | shops | ratings | 1:N | CASCADE |
| 쇼핑몰 → AI 분석 캐시 | shops | ai_analysis_cache | 1:N | CASCADE |
| 쇼핑몰 → 웹 분석 | shops | web_analysis | 1:N | CASCADE |
| 쇼핑몰 → 사업자 등록 | shops | business_registrations | 1:1 | CASCADE |
| 게시글 → 댓글 | community_posts | community_comments | 1:N | CASCADE |
| 게시글 → 좋아요 | community_posts | community_post_likes | 1:N | CASCADE |
| 신고 → 파일 | reports | uploaded_files | 1:N | CASCADE |

### 관계 설명

**필수 관계 (NOT NULL):**
- 커뮤니티 관련 테이블: users 필수 (회원 전용)
- 신고 및 평점: shops 필수, users 선택적 (비회원 지원)

**선택적 관계 (NULL 가능):**
- `reports.user_id`: 비회원 신고 지원
- `ratings.user_id`: 비회원 평가 지원
- `shops.parent_shop_id`: 독립 쇼핑몰은 NULL

---

## 📇 인덱스 목록

### 사용자 테이블 인덱스
- `idx_users_email` (email)
- `idx_users_phone_number` (phone_number)
- `idx_users_created_at` (created_at)

### 쇼핑몰 테이블 인덱스
- `idx_shops_url` (url)
- `idx_shops_parent_shop_id` (parent_shop_id)
- `idx_shops_created_at` (created_at)
- `idx_shops_search_count` (search_count)

### 신고 테이블 인덱스
- `idx_reports_shop_id` (shop_id)
- `idx_reports_user_id` (user_id)
- `idx_reports_created_at` (created_at)
- `idx_reports_evidence_type` (evidence_type)
- `idx_reports_report_type` (report_type)
- `idx_reports_verification_score` (verification_score)

### 평점 테이블 인덱스
- `idx_ratings_shop_id` (shop_id)
- `idx_ratings_user_id` (user_id)
- `idx_ratings_created_at` (created_at)
- `idx_ratings_rating` (rating)

### SMS 테이블 인덱스
- `idx_sms_verifications_phone` (phone_number)
- `idx_sms_verifications_code` (verification_code)
- `idx_sms_request_tracking_phone` (phone_number)
- `idx_sms_request_tracking_ip` (ip_address)

### 비밀번호 재설정 토큰 인덱스
- `idx_password_reset_tokens_token` (token)
- `idx_password_reset_tokens_user_id` (user_id)
- `idx_password_reset_tokens_expires_at` (expires_at)

### 커뮤니티 테이블 인덱스
- `idx_community_posts_user_id` (user_id)
- `idx_community_posts_created_at` (created_at)
- `idx_community_comments_post_id` (post_id)
- `idx_community_comments_user_id` (user_id)
- `idx_community_post_likes_post_id` (post_id)
- `idx_community_post_likes_user_id` (user_id)

### AI 분석 테이블 인덱스
- `idx_ai_analysis_cache_shop_id` (shop_id)
- `idx_ai_analysis_cache_expires_at` (expires_at)
- `idx_ai_analysis_cache_type` (analysis_type)
- `idx_web_analysis_shop_id` (shop_id)
- `idx_web_analysis_analysis_date` (analysis_date)
- `idx_business_registrations_shop_id` (shop_id)
- `idx_business_registrations_business_number` (business_number)
- `idx_business_registrations_business_status` (business_status)
- `idx_uploaded_files_report_id` (report_id)

**총 42개 인덱스**

---

## 🔐 Row Level Security (RLS) 정책

### 활성화된 테이블
모든 테이블에 RLS가 활성화되어 있습니다:
- users
- shops
- reports
- ratings
- sms_verifications
- sms_request_tracking
- password_reset_tokens
- community_posts
- community_comments
- community_post_likes
- ai_analysis_cache
- web_analysis
- business_registrations
- uploaded_files

### 기본 정책
- 정책명: `"Enable all operations for all users"`
- 적용 범위: 모든 테이블
- 정책 타입: `FOR ALL`
- 조건: `USING (true)` (모든 사용자 허용)

**참고**: 프로덕션 환경에서는 더 세밀한 권한 제어가 필요할 수 있습니다.

---

## 🔧 함수 정의

### 1. increment_post_views
**목적**: 커뮤니티 게시글 조회수 증가

**시그니처:**
```sql
FUNCTION increment_post_views(post_id BIGINT)
RETURNS void
```

**동작:**
- `community_posts` 테이블의 `views` 컬럼을 1 증가시킴

**보안:**
- `SECURITY DEFINER`: 함수 소유자 권한으로 실행

---

### 2. verify_evidence_file
**목적**: 증빙 파일 검증 상태 업데이트 및 관련 신고 검증 점수 갱신

**시그니처:**
```sql
FUNCTION verify_evidence_file(file_id BIGINT, verification_status VARCHAR(20))
RETURNS void
```

**동작:**
1. `uploaded_files` 테이블의 `verification_status` 업데이트
2. 관련 신고의 `evidence_verified` 및 `verification_score` 업데이트
   - VERIFIED → verification_score = 100
   - REJECTED → verification_score = 0

**보안:**
- `SECURITY DEFINER`: 함수 소유자 권한으로 실행

---

### 3. update_business_registration
**목적**: 사업자 등록 정보 업데이트 (INSERT or UPDATE)

**시그니처:**
```sql
FUNCTION update_business_registration(
    p_shop_id BIGINT,
    p_business_number VARCHAR(20),
    p_registration_date DATE,
    p_business_status VARCHAR(20),
    p_business_type VARCHAR(100),
    p_capital_amount BIGINT,
    p_representative_name VARCHAR(100),
    p_business_address TEXT,
    p_phone_number VARCHAR(20),
    p_email VARCHAR(255),
    p_verification_source VARCHAR(50)
)
RETURNS void
```

**동작:**
- `shop_id`로 조회하여 존재하면 UPDATE, 없으면 INSERT
- `ON CONFLICT (shop_id) DO UPDATE` 사용

**보안:**
- `SECURITY DEFINER`: 함수 소유자 권한으로 실행

---

### 4. store_web_analysis
**목적**: 웹 분석 결과 저장

**시그니처:**
```sql
FUNCTION store_web_analysis(
    p_shop_id BIGINT,
    p_suspicious_keywords TEXT,
    p_price_analysis TEXT,
    p_technical_analysis TEXT,
    p_domain_analysis TEXT,
    p_confidence_score INTEGER,
    p_analysis_source VARCHAR(50)
)
RETURNS void
```

**동작:**
- `web_analysis` 테이블에 분석 결과 저장

**보안:**
- `SECURITY DEFINER`: 함수 소유자 권한으로 실행

---

### 5. check_shop_parent_cycle
**목적**: shops 테이블의 parent_shop_id 순환 참조 방지 (트리거 함수)

**시그니처:**
```sql
FUNCTION check_shop_parent_cycle()
RETURNS TRIGGER
```

**동작:**
- `parent_shop_id`를 따라가며 최대 100단계까지 확인
- 순환 참조 발견 시 예외 발생
- 자기 자신 참조도 방지

**트리거:**
- `trigger_check_shop_parent_cycle`
- `BEFORE INSERT OR UPDATE ON shops`
- `WHEN (NEW.parent_shop_id IS NOT NULL)`

---

## 🚨 제약조건 및 무한루프 방지

### 제약조건

1. **check_parent_not_self** (shops 테이블)
   - 제약: `parent_shop_id IS NULL OR parent_shop_id != id`
   - 목적: 자기 자신을 부모로 참조하는 것 방지

2. **UNIQUE(post_id, user_id)** (community_post_likes 테이블)
   - 목적: 중복 좋아요 방지

### 무한루프 방지 메커니즘

1. **CHECK 제약조건**: 직접적인 자기 참조 방지
2. **트리거 함수**: 간접적인 순환 참조 방지 (최대 깊이: 100)

---

## 📝 설계 원칙

### 1. Users 의존성 완화
- `reports`와 `ratings` 테이블의 `user_id`는 선택적 (NULL 가능)
- 비회원도 신고 및 평점 등록 가능
- 커뮤니티 기능은 회원 전용 (필수 관계)

### 2. 무한루프 방지
- `shops.parent_shop_id`에 CHECK 제약조건 및 트리거 함수로 순환 참조 방지
- 최대 깊이 제한: 100단계

### 3. 데이터 정합성
- 외래키 제약조건으로 참조 무결성 보장
- ON DELETE CASCADE: 관련 데이터 자동 삭제
- ON DELETE SET NULL: 선택적 관계에서 참조 무결성 유지

### 4. 성능 최적화
- AI 분석 결과는 `ai_analysis_cache`에 캐시하여 중복 분석 방지
- 외래키 컬럼 및 검색에 사용되는 컬럼에 인덱스 추가
- 날짜 컬럼 인덱스로 시간 범위 쿼리 최적화

### 5. 통합 관리
- `sms_rate_limits`와 `sms_care_areas`를 `sms_request_tracking`으로 통합
- IP 추적 및 레이트 리밋을 하나의 테이블로 관리

---

## 📌 주의 사항

### 1. 기존 테이블 마이그레이션
- `complete-schema.sql` 파일에는 기존 테이블에 컬럼을 추가하는 `ALTER TABLE ADD COLUMN IF NOT EXISTS` 구문 포함
- 여러 번 실행해도 안전 (이미 존재하는 컬럼은 무시)

### 2. RLS 정책
- 현재 모든 사용자가 모든 데이터에 접근 가능하도록 설정
- 프로덕션 환경에서는 세밀한 권한 제어 필요

### 3. 트리거
- `trigger_check_shop_parent_cycle`는 자동으로 실행됨
- `parent_shop_id` 업데이트 시 순환 참조 체크

### 4. 인덱스
- 모든 인덱스는 `IF NOT EXISTS`로 생성되어 중복 실행 안전

---

## 🔄 실행 순서

1. **테이블 생성**: `CREATE TABLE IF NOT EXISTS`
2. **컬럼 추가**: `ALTER TABLE ADD COLUMN IF NOT EXISTS` (기존 테이블용)
3. **주석 추가**: `COMMENT ON TABLE/COLUMN`
4. **외래키 제약조건**: `DO $$ ... END $$` (조건부 추가)
5. **인덱스 생성**: `CREATE INDEX IF NOT EXISTS`
6. **RLS 활성화**: `ALTER TABLE ENABLE ROW LEVEL SECURITY`
7. **RLS 정책 생성**: `DROP POLICY IF EXISTS` + `CREATE POLICY`
8. **함수 및 트리거 생성**: `CREATE OR REPLACE FUNCTION/TRIGGER`

---

## 📚 관련 문서

- **DB 설계 요약**: `../../DB설계.md` (ERD 개요 및 테이블 요약)
- **프로젝트 전체 문서**: `../../여기몰까_프로젝트_문서.md`
- **스키마 SQL 파일**: `complete-schema.sql` (실제 실행 스크립트)
- **데이터베이스**: PostgreSQL (Supabase)

---

**작성일**: 2025.01.15  
**최종 수정일**: 2025.01.15  
**버전**: 2.0  
**작성자**: 여기몰까 개발팀

