-- ============================================================================
-- "여기몰까" 통합 데이터베이스 스키마
-- ============================================================================
-- 목적: 온라인 쇼핑몰의 신뢰도를 분석하고 피해 사례를 공유하는 플랫폼
-- 데이터베이스: PostgreSQL (Supabase)
-- 작성일: 2024
-- ============================================================================
-- 이 파일의 내용을 Supabase 대시보드의 SQL Editor에서 실행하세요
-- ============================================================================

-- ============================================================================
-- 1. 사용자 관리 테이블
-- ============================================================================

-- 사용자 테이블
-- 역할: 회원가입한 사용자 정보 관리
-- 관계: password_reset_tokens, community_posts, community_comments, community_post_likes 참조
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 기존 테이블에 updated_at 컬럼 추가 (이미 존재하면 무시)
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 주석 추가 (테이블 생성 후)
COMMENT ON TABLE users IS '회원가입한 사용자 정보를 저장하는 메인 테이블';
COMMENT ON COLUMN users.id IS '사용자 고유 ID (Primary Key)';
COMMENT ON COLUMN users.username IS '사용자 이름 (고유값)';
COMMENT ON COLUMN users.email IS '이메일 주소 (고유값)';
COMMENT ON COLUMN users.password IS '암호화된 비밀번호';
COMMENT ON COLUMN users.phone_number IS '전화번호 (고유값)';
COMMENT ON COLUMN users.created_at IS '계정 생성일시';
COMMENT ON COLUMN users.updated_at IS '계정 정보 수정일시';

-- 비밀번호 재설정 토큰 테이블
-- 역할: 비밀번호 재설정을 위한 임시 토큰 관리
-- 관계: users 테이블 참조 (ON DELETE CASCADE)
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);
-- 주석 추가 (테이블 생성 후)
COMMENT ON TABLE password_reset_tokens IS '비밀번호 재설정용 임시 토큰 저장 테이블';
COMMENT ON COLUMN password_reset_tokens.user_id IS '재설정 대상 사용자 ID (Foreign Key → users.id)';
COMMENT ON COLUMN password_reset_tokens.token IS '재설정 토큰 (고유값)';
COMMENT ON COLUMN password_reset_tokens.expires_at IS '토큰 만료일시';
COMMENT ON COLUMN password_reset_tokens.used IS '토큰 사용 여부 (false: 미사용, true: 사용됨)';

-- 사용자 로그인 기록 테이블
-- 역할: 사용자 로그인 시도 기록 (성공/실패 모두 기록)
-- 관계: users 테이블 참조 (ON DELETE CASCADE)
CREATE TABLE IF NOT EXISTS user_login_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    ip_address VARCHAR(64),
    user_agent TEXT,
    login_success BOOLEAN DEFAULT TRUE,
    failure_reason VARCHAR(255), -- 'INVALID_PASSWORD', 'USER_NOT_FOUND', 'ACCOUNT_DELETED' 등
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);
-- 주석 추가 (테이블 생성 후)
COMMENT ON TABLE user_login_logs IS '사용자 로그인 기록 테이블 (성공/실패 모두 기록)';
COMMENT ON COLUMN user_login_logs.user_id IS '로그인 시도한 사용자 ID (Foreign Key → users.id)';
COMMENT ON COLUMN user_login_logs.ip_address IS '로그인 시도 IP 주소';
COMMENT ON COLUMN user_login_logs.user_agent IS '로그인 시도 User-Agent';
COMMENT ON COLUMN user_login_logs.login_success IS '로그인 성공 여부 (true: 성공, false: 실패)';
COMMENT ON COLUMN user_login_logs.failure_reason IS '로그인 실패 사유 (성공 시 NULL)';

-- users 테이블에 마지막 로그인 시간 컬럼 추가
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE;
COMMENT ON COLUMN users.last_login_at IS '마지막 로그인 시간';

-- ============================================================================
-- 2. 쇼핑몰 관리 테이블
-- ============================================================================

-- 쇼핑몰 테이블
-- 역할: 분석 대상 쇼핑몰 정보 저장
-- 관계: 자기 참조 (parent_shop_id), reports, ratings, ai_analysis_cache, web_analysis, business_registrations 참조
-- 주의: parent_shop_id는 무한루프 방지를 위해 CHECK 제약조건 필요
CREATE TABLE IF NOT EXISTS shops (
    id BIGSERIAL PRIMARY KEY,
    url VARCHAR(500) UNIQUE NOT NULL,
    name VARCHAR(255),
    parent_shop_id BIGINT,
    search_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (parent_shop_id) REFERENCES shops (id) ON DELETE SET NULL,
    -- 무한루프 방지: 자기 자신을 부모로 참조할 수 없음
    CONSTRAINT check_parent_not_self CHECK (parent_shop_id IS NULL OR parent_shop_id != id)
);

-- 기존 테이블에 컬럼 추가 (이미 존재하면 무시)
ALTER TABLE shops ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE shops ADD COLUMN IF NOT EXISTS search_count INTEGER DEFAULT 0;

-- 주석 추가 (테이블 생성 후)
COMMENT ON TABLE shops IS '분석 대상 쇼핑몰 정보 저장 테이블 (병합 쇼핑몰 지원)';
COMMENT ON COLUMN shops.id IS '쇼핑몰 고유 ID (Primary Key)';
COMMENT ON COLUMN shops.url IS '쇼핑몰 URL (고유값, 정규화된 형태로 저장)';
COMMENT ON COLUMN shops.name IS '쇼핑몰 이름 (자동 추출 또는 수동 입력)';
COMMENT ON COLUMN shops.parent_shop_id IS '병합된 부모 쇼핑몰 ID (자기 참조, NULL: 독립 쇼핑몰)';
COMMENT ON COLUMN shops.search_count IS '검색된 횟수 (인기도 측정용)';
COMMENT ON COLUMN shops.created_at IS '쇼핑몰 등록일시';
COMMENT ON COLUMN shops.updated_at IS '쇼핑몰 정보 수정일시';

-- ============================================================================
-- 3. 신고 및 평가 테이블 (Users 의존성 완화)
-- ============================================================================

-- 신고 테이블
-- 역할: 사용자의 피해 신고 저장 (회원/비회원 모두 가능)
-- 관계: shops 참조, user_id는 선택적 (NULL 가능)
-- 관계: uploaded_files 참조 (증빙 파일)
CREATE TABLE IF NOT EXISTS reports (
    id BIGSERIAL PRIMARY KEY,
    shop_id BIGINT NOT NULL,
    user_id BIGINT,
    reporter_name VARCHAR(255),
    reporter_phone VARCHAR(20),
    categories TEXT NOT NULL,
    description TEXT NOT NULL,
    evidence_type VARCHAR(50) DEFAULT 'NONE',
    evidence_files TEXT,
    evidence_verified BOOLEAN DEFAULT FALSE,
    verification_score INTEGER DEFAULT 0,
    report_type VARCHAR(50) DEFAULT 'GENERAL_REVIEW',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (shop_id) REFERENCES shops (id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
);

-- 기존 테이블에 컬럼 추가 (이미 존재하면 무시)
ALTER TABLE reports ADD COLUMN IF NOT EXISTS user_id BIGINT;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE reports ADD COLUMN IF NOT EXISTS evidence_type VARCHAR(50) DEFAULT 'NONE';
ALTER TABLE reports ADD COLUMN IF NOT EXISTS evidence_files TEXT;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS evidence_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS verification_score INTEGER DEFAULT 0;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS report_type VARCHAR(50) DEFAULT 'GENERAL_REVIEW';

-- 주석 추가 (테이블 생성 후)
COMMENT ON TABLE reports IS '사용자 피해 신고 저장 테이블 (회원/비회원 모두 사용 가능)';
COMMENT ON COLUMN reports.shop_id IS '신고 대상 쇼핑몰 ID (Foreign Key → shops.id, 필수)';
COMMENT ON COLUMN reports.user_id IS '신고자 사용자 ID (Foreign Key → users.id, 선택적, NULL: 비회원 신고)';
COMMENT ON COLUMN reports.reporter_name IS '신고자 이름 (회원은 users.username과 동기화 가능)';
COMMENT ON COLUMN reports.reporter_phone IS '신고자 전화번호 (회원은 users.phone_number와 동기화 가능)';
COMMENT ON COLUMN reports.categories IS '피해 유형 (JSON 또는 텍스트)';
COMMENT ON COLUMN reports.description IS '신고 상세 내용';
COMMENT ON COLUMN reports.evidence_type IS '증빙 유형 (NONE, IMAGE, VIDEO, DOCUMENT 등)';
COMMENT ON COLUMN reports.evidence_files IS '증빙 파일 경로 (JSON 형태)';
COMMENT ON COLUMN reports.evidence_verified IS '증빙 검증 여부';
COMMENT ON COLUMN reports.verification_score IS '검증 점수 (0-100)';
COMMENT ON COLUMN reports.report_type IS '신고 유형 (GENERAL_REVIEW, FRAUD, DELAYED_DELIVERY 등)';
COMMENT ON COLUMN reports.updated_at IS '신고 수정일시';

-- 외래키 제약조건 추가 (이미 존재하면 무시)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'reports_user_id_fkey'
    ) THEN
        ALTER TABLE reports ADD CONSTRAINT reports_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL;
    END IF;
END $$;

-- 평점 테이블
-- 역할: 쇼핑몰에 대한 사용자 평점 저장 (회원/비회원 모두 가능)
-- 관계: shops 참조, user_id는 선택적 (NULL 가능)
CREATE TABLE IF NOT EXISTS ratings (
    id BIGSERIAL PRIMARY KEY,
    shop_id BIGINT NOT NULL,
    user_id BIGINT,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (shop_id) REFERENCES shops (id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
);

-- 기존 테이블에 user_id 컬럼 추가 (이미 존재하면 무시)
ALTER TABLE ratings ADD COLUMN IF NOT EXISTS user_id BIGINT;
ALTER TABLE ratings ADD COLUMN IF NOT EXISTS comment TEXT;

-- 주석 추가 (테이블 생성 후)
COMMENT ON TABLE ratings IS '쇼핑몰 평점 저장 테이블 (회원/비회원 모두 평가 가능)';
COMMENT ON COLUMN ratings.shop_id IS '평가 대상 쇼핑몰 ID (Foreign Key → shops.id, 필수)';
COMMENT ON COLUMN ratings.user_id IS '평가자 사용자 ID (Foreign Key → users.id, 선택적, NULL: 비회원 평가)';
COMMENT ON COLUMN ratings.rating IS '별점 (1-5점)';
COMMENT ON COLUMN ratings.comment IS '평가 코멘트 (선택적)';

-- 외래키 제약조건 추가 (이미 존재하면 무시)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'ratings_user_id_fkey'
    ) THEN
        ALTER TABLE ratings ADD CONSTRAINT ratings_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL;
    END IF;
END $$;

-- ============================================================================
-- 4. SMS 인증 및 요청 추적 테이블 (통합)
-- ============================================================================

-- SMS 인증 테이블
-- 역할: SMS 인증번호 발송 및 검증 관리
-- 관계: users와 독립적 (인증 완료 전에는 user_id 없음)
CREATE TABLE IF NOT EXISTS sms_verifications (
    id BIGSERIAL PRIMARY KEY,
    phone_number VARCHAR(20) NOT NULL,
    verification_code VARCHAR(10) NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- 주석 추가 (테이블 생성 후)
COMMENT ON TABLE sms_verifications IS 'SMS 인증번호 발송 및 검증 관리 테이블';
COMMENT ON COLUMN sms_verifications.phone_number IS '인증 대상 전화번호';
COMMENT ON COLUMN sms_verifications.verification_code IS '발송된 인증번호';
COMMENT ON COLUMN sms_verifications.is_verified IS '인증 완료 여부';
COMMENT ON COLUMN sms_verifications.expires_at IS '인증번호 만료일시';

-- SMS 요청 추적 테이블 (sms_rate_limits와 sms_care_areas 통합)
-- 역할: SMS 발송 요청 레이트 리밋 및 IP 추적 통합 관리
-- 관계: users와 독립적 (IP 기반 추적)
CREATE TABLE IF NOT EXISTS sms_request_tracking (
    id BIGSERIAL PRIMARY KEY,
    phone_number VARCHAR(20) NOT NULL,
    ip_address INET,
    sent_count INTEGER DEFAULT 1,
    last_sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 기존 테이블에 updated_at 컬럼 추가 (이미 존재하면 무시)
ALTER TABLE sms_request_tracking ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 주석 추가 (테이블 생성 후)
COMMENT ON TABLE sms_request_tracking IS 'SMS 발송 요청 추적 테이블 (레이트 리밋 + IP 추적 통합)';
COMMENT ON COLUMN sms_request_tracking.phone_number IS '요청 전화번호';
COMMENT ON COLUMN sms_request_tracking.ip_address IS '요청 IP 주소 (IPv4/IPv6)';
COMMENT ON COLUMN sms_request_tracking.sent_count IS '발송 횟수 (분당 제한용)';
COMMENT ON COLUMN sms_request_tracking.last_sent_at IS '마지막 발송 시간';
COMMENT ON COLUMN sms_request_tracking.created_at IS '최초 요청 일시';
COMMENT ON COLUMN sms_request_tracking.updated_at IS '정보 수정일시';

-- ============================================================================
-- 5. 커뮤니티 기능 테이블
-- ============================================================================

-- 커뮤니티 게시글 테이블
-- 역할: 커뮤니티 게시글 저장
-- 관계: users 참조 (필수, 커뮤니티는 회원만 사용)
CREATE TABLE IF NOT EXISTS community_posts (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    title VARCHAR(100) NOT NULL,
    content TEXT NOT NULL,
    views INTEGER DEFAULT 0,
    likes INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- 기존 테이블에 updated_at 컬럼 추가 (이미 존재하면 무시)
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 주석 추가 (테이블 생성 후)
COMMENT ON TABLE community_posts IS '커뮤니티 게시글 저장 테이블 (회원 전용)';
COMMENT ON COLUMN community_posts.user_id IS '게시글 작성자 ID (Foreign Key → users.id, 필수)';
COMMENT ON COLUMN community_posts.title IS '게시글 제목';
COMMENT ON COLUMN community_posts.content IS '게시글 내용';
COMMENT ON COLUMN community_posts.views IS '조회수';
COMMENT ON COLUMN community_posts.likes IS '좋아요 수 (실제는 community_post_likes 테이블에서 집계)';
COMMENT ON COLUMN community_posts.updated_at IS '게시글 수정일시';

-- 커뮤니티 댓글 테이블
-- 역할: 게시글에 대한 댓글 저장
-- 관계: community_posts, users 참조 (필수)
CREATE TABLE IF NOT EXISTS community_comments (
    id BIGSERIAL PRIMARY KEY,
    post_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    content VARCHAR(500) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (post_id) REFERENCES community_posts (id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);
-- 주석 추가 (테이블 생성 후)
COMMENT ON TABLE community_comments IS '커뮤니티 게시글 댓글 저장 테이블';
COMMENT ON COLUMN community_comments.post_id IS '댓글이 속한 게시글 ID (Foreign Key → community_posts.id)';
COMMENT ON COLUMN community_comments.user_id IS '댓글 작성자 ID (Foreign Key → users.id)';
COMMENT ON COLUMN community_comments.content IS '댓글 내용';

-- 커뮤니티 게시글 좋아요 테이블
-- 역할: 게시글 좋아요 저장 (중복 방지)
-- 관계: community_posts, users 참조 (필수)
CREATE TABLE IF NOT EXISTS community_post_likes (
    id BIGSERIAL PRIMARY KEY,
    post_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (post_id) REFERENCES community_posts (id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    UNIQUE(post_id, user_id)
);
-- 주석 추가 (테이블 생성 후)
COMMENT ON TABLE community_post_likes IS '커뮤니티 게시글 좋아요 저장 테이블 (중복 방지)';
COMMENT ON COLUMN community_post_likes.post_id IS '좋아요 대상 게시글 ID (Foreign Key → community_posts.id)';
COMMENT ON COLUMN community_post_likes.user_id IS '좋아요한 사용자 ID (Foreign Key → users.id)';
COMMENT ON CONSTRAINT community_post_likes_post_id_user_id_key ON community_post_likes IS '게시글-사용자 조합은 고유해야 함 (중복 좋아요 방지)';

-- ============================================================================
-- 6. AI 분석 및 검증 테이블
-- ============================================================================

-- AI 분석 결과 캐시 테이블
-- 역할: AI 분석 결과를 캐시하여 성능 최적화
-- 관계: shops 참조
CREATE TABLE IF NOT EXISTS ai_analysis_cache (
    id BIGSERIAL PRIMARY KEY,
    shop_id BIGINT NOT NULL,
    analysis_type VARCHAR(50) NOT NULL,
    analysis_result TEXT NOT NULL,
    analysis_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (shop_id) REFERENCES shops (id) ON DELETE CASCADE
);
-- 주석 추가 (테이블 생성 후)
COMMENT ON TABLE ai_analysis_cache IS 'AI 분석 결과 캐시 테이블 (성능 최적화용)';
COMMENT ON COLUMN ai_analysis_cache.shop_id IS '분석 대상 쇼핑몰 ID (Foreign Key → shops.id)';
COMMENT ON COLUMN ai_analysis_cache.analysis_type IS '분석 유형 (RISK_ANALYSIS, BUSINESS_ANALYSIS, WEB_ANALYSIS 등)';
COMMENT ON COLUMN ai_analysis_cache.analysis_result IS '분석 결과 (JSON 형태)';
COMMENT ON COLUMN ai_analysis_cache.analysis_date IS '분석 수행일시';
COMMENT ON COLUMN ai_analysis_cache.expires_at IS '캐시 만료일시';

-- 웹 분석 결과 테이블
-- 역할: 웹 크롤링 및 기술적 분석 결과 저장
-- 관계: shops 참조
CREATE TABLE IF NOT EXISTS web_analysis (
    id BIGSERIAL PRIMARY KEY,
    shop_id BIGINT NOT NULL,
    suspicious_keywords TEXT,
    price_analysis TEXT,
    technical_analysis TEXT,
    domain_analysis TEXT,
    analysis_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    analysis_source VARCHAR(50) DEFAULT 'AUTO',
    confidence_score INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (shop_id) REFERENCES shops (id) ON DELETE CASCADE
);
-- 주석 추가 (테이블 생성 후)
COMMENT ON TABLE web_analysis IS '웹 크롤링 및 기술적 분석 결과 저장 테이블';
COMMENT ON COLUMN web_analysis.shop_id IS '분석 대상 쇼핑몰 ID (Foreign Key → shops.id)';
COMMENT ON COLUMN web_analysis.suspicious_keywords IS '의심 키워드 (JSON 형태)';
COMMENT ON COLUMN web_analysis.price_analysis IS '가격 분석 결과 (JSON 형태)';
COMMENT ON COLUMN web_analysis.technical_analysis IS '기술적 분석 결과 (JSON 형태)';
COMMENT ON COLUMN web_analysis.domain_analysis IS '도메인 분석 결과 (JSON 형태)';
COMMENT ON COLUMN web_analysis.analysis_source IS '분석 소스 (AUTO: 자동, MANUAL: 수동)';
COMMENT ON COLUMN web_analysis.confidence_score IS '분석 신뢰도 점수 (0-100)';

-- 사업자 등록 정보 테이블
-- 역할: 공정위/국세청 등록 정보 저장
-- 관계: shops 참조
CREATE TABLE IF NOT EXISTS business_registrations (
    id BIGSERIAL PRIMARY KEY,
    shop_id BIGINT NOT NULL,
    business_number VARCHAR(20),
    registration_date DATE,
    business_status VARCHAR(20) DEFAULT 'UNKNOWN',
    business_type VARCHAR(100),
    capital_amount BIGINT,
    representative_name VARCHAR(100),
    business_address TEXT,
    phone_number VARCHAR(20),
    email VARCHAR(255),
    last_verified TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    verification_source VARCHAR(50) DEFAULT 'MANUAL',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (shop_id) REFERENCES shops (id) ON DELETE CASCADE
);

-- 기존 테이블에 updated_at 컬럼 추가 (이미 존재하면 무시)
ALTER TABLE business_registrations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 주석 추가 (테이블 생성 후)
COMMENT ON TABLE business_registrations IS '사업자 등록 정보 저장 테이블 (공정위/국세청 연동)';
COMMENT ON COLUMN business_registrations.shop_id IS '연결된 쇼핑몰 ID (Foreign Key → shops.id)';
COMMENT ON COLUMN business_registrations.business_number IS '사업자 등록번호';
COMMENT ON COLUMN business_registrations.business_status IS '사업 상태 (ACTIVE, SUSPENDED, CLOSED, UNKNOWN)';
COMMENT ON COLUMN business_registrations.verification_source IS '검증 소스 (API, MANUAL, CRAWLING)';
COMMENT ON COLUMN business_registrations.updated_at IS '정보 수정일시';

-- 파일 업로드 관리 테이블
-- 역할: 신고에 첨부된 증빙 파일 관리
-- 관계: reports 참조
CREATE TABLE IF NOT EXISTS uploaded_files (
    id BIGSERIAL PRIMARY KEY,
    report_id BIGINT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    upload_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    verification_status VARCHAR(20) DEFAULT 'PENDING',
    FOREIGN KEY (report_id) REFERENCES reports (id) ON DELETE CASCADE
);
-- 주석 추가 (테이블 생성 후)
COMMENT ON TABLE uploaded_files IS '신고 증빙 파일 저장 테이블';
COMMENT ON COLUMN uploaded_files.report_id IS '연결된 신고 ID (Foreign Key → reports.id)';
COMMENT ON COLUMN uploaded_files.verification_status IS '파일 검증 상태 (PENDING, VERIFIED, REJECTED)';

-- ============================================================================
-- 7. 인덱스 생성 (성능 최적화)
-- ============================================================================

-- 사용자 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone_number ON users(phone_number);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- 쇼핑몰 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_shops_url ON shops(url);
CREATE INDEX IF NOT EXISTS idx_shops_parent_shop_id ON shops(parent_shop_id);
CREATE INDEX IF NOT EXISTS idx_shops_created_at ON shops(created_at);
CREATE INDEX IF NOT EXISTS idx_shops_search_count ON shops(search_count);

-- 신고 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_reports_shop_id ON reports(shop_id);
CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at);
CREATE INDEX IF NOT EXISTS idx_reports_evidence_type ON reports(evidence_type);
CREATE INDEX IF NOT EXISTS idx_reports_report_type ON reports(report_type);
CREATE INDEX IF NOT EXISTS idx_reports_verification_score ON reports(verification_score);

-- 평점 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_ratings_shop_id ON ratings(shop_id);
CREATE INDEX IF NOT EXISTS idx_ratings_user_id ON ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_ratings_created_at ON ratings(created_at);
CREATE INDEX IF NOT EXISTS idx_ratings_rating ON ratings(rating);

-- SMS 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_sms_verifications_phone ON sms_verifications(phone_number);
CREATE INDEX IF NOT EXISTS idx_sms_verifications_code ON sms_verifications(verification_code);
CREATE INDEX IF NOT EXISTS idx_sms_request_tracking_phone ON sms_request_tracking(phone_number);
CREATE INDEX IF NOT EXISTS idx_sms_request_tracking_ip ON sms_request_tracking(ip_address);

-- 비밀번호 재설정 토큰 인덱스
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);

-- 사용자 로그인 기록 인덱스
CREATE INDEX IF NOT EXISTS idx_user_login_logs_user_id ON user_login_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_login_logs_created_at ON user_login_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_user_login_logs_ip_address ON user_login_logs(ip_address);
CREATE INDEX IF NOT EXISTS idx_user_login_logs_login_success ON user_login_logs(login_success);

-- 커뮤니티 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_community_posts_user_id ON community_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_community_posts_created_at ON community_posts(created_at);
CREATE INDEX IF NOT EXISTS idx_community_comments_post_id ON community_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_community_comments_user_id ON community_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_community_post_likes_post_id ON community_post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_community_post_likes_user_id ON community_post_likes(user_id);

-- AI 분석 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_ai_analysis_cache_shop_id ON ai_analysis_cache(shop_id);
CREATE INDEX IF NOT EXISTS idx_ai_analysis_cache_expires_at ON ai_analysis_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_ai_analysis_cache_type ON ai_analysis_cache(analysis_type);
CREATE INDEX IF NOT EXISTS idx_web_analysis_shop_id ON web_analysis(shop_id);
CREATE INDEX IF NOT EXISTS idx_web_analysis_analysis_date ON web_analysis(analysis_date);
CREATE INDEX IF NOT EXISTS idx_business_registrations_shop_id ON business_registrations(shop_id);
CREATE INDEX IF NOT EXISTS idx_business_registrations_business_number ON business_registrations(business_number);
CREATE INDEX IF NOT EXISTS idx_business_registrations_business_status ON business_registrations(business_status);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_report_id ON uploaded_files(report_id);

-- ============================================================================
-- 8. Row Level Security (RLS) 활성화
-- ============================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_request_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_login_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_analysis_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE web_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE uploaded_files ENABLE ROW LEVEL SECURITY;

-- 기본 정책 설정 (모든 사용자가 읽기/쓰기 가능)
-- 기존 정책이 있으면 삭제 후 재생성
DROP POLICY IF EXISTS "Enable all operations for all users" ON users;
CREATE POLICY "Enable all operations for all users" ON users FOR ALL USING (true);

DROP POLICY IF EXISTS "Enable all operations for all users" ON shops;
CREATE POLICY "Enable all operations for all users" ON shops FOR ALL USING (true);

DROP POLICY IF EXISTS "Enable all operations for all users" ON reports;
CREATE POLICY "Enable all operations for all users" ON reports FOR ALL USING (true);

DROP POLICY IF EXISTS "Enable all operations for all users" ON ratings;
CREATE POLICY "Enable all operations for all users" ON ratings FOR ALL USING (true);

DROP POLICY IF EXISTS "Enable all operations for all users" ON sms_verifications;
CREATE POLICY "Enable all operations for all users" ON sms_verifications FOR ALL USING (true);

DROP POLICY IF EXISTS "Enable all operations for all users" ON sms_request_tracking;
CREATE POLICY "Enable all operations for all users" ON sms_request_tracking FOR ALL USING (true);

DROP POLICY IF EXISTS "Enable all operations for all users" ON password_reset_tokens;
CREATE POLICY "Enable all operations for all users" ON password_reset_tokens FOR ALL USING (true);

DROP POLICY IF EXISTS "Enable all operations for all users" ON user_login_logs;
CREATE POLICY "Enable all operations for all users" ON user_login_logs FOR ALL USING (true);

DROP POLICY IF EXISTS "Enable all operations for all users" ON community_posts;
CREATE POLICY "Enable all operations for all users" ON community_posts FOR ALL USING (true);

DROP POLICY IF EXISTS "Enable all operations for all users" ON community_comments;
CREATE POLICY "Enable all operations for all users" ON community_comments FOR ALL USING (true);

DROP POLICY IF EXISTS "Enable all operations for all users" ON community_post_likes;
CREATE POLICY "Enable all operations for all users" ON community_post_likes FOR ALL USING (true);

DROP POLICY IF EXISTS "Enable all operations for all users" ON ai_analysis_cache;
CREATE POLICY "Enable all operations for all users" ON ai_analysis_cache FOR ALL USING (true);

DROP POLICY IF EXISTS "Enable all operations for all users" ON web_analysis;
CREATE POLICY "Enable all operations for all users" ON web_analysis FOR ALL USING (true);

DROP POLICY IF EXISTS "Enable all operations for all users" ON business_registrations;
CREATE POLICY "Enable all operations for all users" ON business_registrations FOR ALL USING (true);

DROP POLICY IF EXISTS "Enable all operations for all users" ON uploaded_files;
CREATE POLICY "Enable all operations for all users" ON uploaded_files FOR ALL USING (true);

-- ============================================================================
-- 9. 함수 정의
-- ============================================================================

-- 조회수 증가 함수
CREATE OR REPLACE FUNCTION increment_post_views(post_id BIGINT)
RETURNS void AS $$
BEGIN
    UPDATE community_posts
    SET views = views + 1
    WHERE id = post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
COMMENT ON FUNCTION increment_post_views IS '커뮤니티 게시글 조회수 증가 함수';

-- 증빙 파일 검증 함수
CREATE OR REPLACE FUNCTION verify_evidence_file(file_id BIGINT, verification_status VARCHAR(20))
RETURNS void AS $$
BEGIN
    UPDATE uploaded_files
    SET verification_status = verification_status
    WHERE id = file_id;
    
    -- 관련 리포트의 검증 점수 업데이트
    UPDATE reports
    SET evidence_verified = (verification_status = 'VERIFIED'),
        verification_score = CASE 
            WHEN verification_status = 'VERIFIED' THEN 100
            WHEN verification_status = 'REJECTED' THEN 0
            ELSE verification_score
        END
    WHERE id = (SELECT report_id FROM uploaded_files WHERE id = file_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
COMMENT ON FUNCTION verify_evidence_file IS '증빙 파일 검증 상태 업데이트 및 관련 신고 검증 점수 갱신 함수';

-- 사업자 등록 정보 업데이트 함수
CREATE OR REPLACE FUNCTION update_business_registration(
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
RETURNS void AS $$
BEGIN
    INSERT INTO business_registrations (
        shop_id, business_number, registration_date, business_status,
        business_type, capital_amount, representative_name, business_address,
        phone_number, email, verification_source, last_verified, updated_at
    ) VALUES (
        p_shop_id, p_business_number, p_registration_date, p_business_status,
        p_business_type, p_capital_amount, p_representative_name, p_business_address,
        p_phone_number, p_email, p_verification_source, NOW(), NOW()
    )
    ON CONFLICT (shop_id) DO UPDATE SET
        business_number = EXCLUDED.business_number,
        registration_date = EXCLUDED.registration_date,
        business_status = EXCLUDED.business_status,
        business_type = EXCLUDED.business_type,
        capital_amount = EXCLUDED.capital_amount,
        representative_name = EXCLUDED.representative_name,
        business_address = EXCLUDED.business_address,
        phone_number = EXCLUDED.phone_number,
        email = EXCLUDED.email,
        verification_source = EXCLUDED.verification_source,
        last_verified = NOW(),
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
COMMENT ON FUNCTION update_business_registration IS '사업자 등록 정보 업데이트 함수 (INSERT or UPDATE)';

-- 웹 분석 결과 저장 함수
CREATE OR REPLACE FUNCTION store_web_analysis(
    p_shop_id BIGINT,
    p_suspicious_keywords TEXT,
    p_price_analysis TEXT,
    p_technical_analysis TEXT,
    p_domain_analysis TEXT,
    p_confidence_score INTEGER,
    p_analysis_source VARCHAR(50)
)
RETURNS void AS $$
BEGIN
    INSERT INTO web_analysis (
        shop_id, suspicious_keywords, price_analysis, technical_analysis,
        domain_analysis, confidence_score, analysis_source, analysis_date
    ) VALUES (
        p_shop_id, p_suspicious_keywords, p_price_analysis, p_technical_analysis,
        p_domain_analysis, p_confidence_score, p_analysis_source, NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
COMMENT ON FUNCTION store_web_analysis IS '웹 분석 결과 저장 함수';

-- 무한루프 방지 체크 함수 (shops 테이블의 parent_shop_id 순환 참조 방지)
CREATE OR REPLACE FUNCTION check_shop_parent_cycle()
RETURNS TRIGGER AS $$
DECLARE
    current_id BIGINT;
    parent_id BIGINT;
    depth INTEGER := 0;
    max_depth INTEGER := 100;
BEGIN
    -- 자기 자신 참조는 이미 CHECK 제약조건으로 방지
    -- 여기서는 깊이 체크 (간접 순환 방지)
    current_id := NEW.id;
    parent_id := NEW.parent_shop_id;
    
    WHILE parent_id IS NOT NULL AND depth < max_depth LOOP
        IF parent_id = current_id THEN
            RAISE EXCEPTION 'Circular reference detected: shop % cannot be parent of itself', current_id;
        END IF;
        
        SELECT parent_shop_id INTO parent_id
        FROM shops
        WHERE id = parent_id;
        
        depth := depth + 1;
    END LOOP;
    
    IF depth >= max_depth THEN
        RAISE EXCEPTION 'Reference chain too deep: possible circular reference';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
COMMENT ON FUNCTION check_shop_parent_cycle IS 'shops 테이블의 parent_shop_id 순환 참조 방지 트리거 함수';

-- 트리거 생성 (무한루프 방지)
CREATE TRIGGER trigger_check_shop_parent_cycle
    BEFORE INSERT OR UPDATE ON shops
    FOR EACH ROW
    WHEN (NEW.parent_shop_id IS NOT NULL)
    EXECUTE FUNCTION check_shop_parent_cycle();
COMMENT ON TRIGGER trigger_check_shop_parent_cycle ON shops IS 'shops 테이블의 parent_shop_id 순환 참조 방지 트리거';

-- ============================================================================
-- 10. 완료 메시지
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '============================================================================';
    RAISE NOTICE '스키마 생성 완료!';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE '생성된 테이블:';
    RAISE NOTICE '  - 사용자 관리: users, password_reset_tokens, user_login_logs';
    RAISE NOTICE '  - 쇼핑몰 관리: shops';
    RAISE NOTICE '  - 신고/평가: reports, ratings';
    RAISE NOTICE '  - SMS 인증: sms_verifications, sms_request_tracking';
    RAISE NOTICE '  - 커뮤니티: community_posts, community_comments, community_post_likes';
    RAISE NOTICE '  - AI 분석: ai_analysis_cache, web_analysis, business_registrations, uploaded_files';
    RAISE NOTICE '============================================================================';
END $$;

