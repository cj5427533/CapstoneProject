-- ============================================================================
-- SMS 테이블 관계 설정 (통합 접근)
-- ============================================================================
-- Supabase 대시보드의 SQL Editor에서 이 파일을 실행하세요
-- 
-- 추가되는 관계:
-- 1. sms_verifications ↔ users (user_id)
-- 2. sms_verifications ↔ sms_request_tracking (sms_request_tracking_id)
-- 3. sms_request_tracking ↔ users (user_id)
-- 
-- 주의: sms_request_tracking 테이블이 없으면 먼저 생성합니다.
-- ============================================================================

-- ============================================================================
-- 0. sms_request_tracking 테이블이 없으면 생성
-- ============================================================================
CREATE TABLE IF NOT EXISTS sms_request_tracking (
    id BIGSERIAL PRIMARY KEY,
    phone_number VARCHAR(20) NOT NULL,
    ip_address INET,
    sent_count INTEGER DEFAULT 1,
    last_sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 주석 추가
COMMENT ON TABLE sms_request_tracking IS 'SMS 발송 요청 추적 테이블 (레이트 리밋 + IP 추적 통합)';
COMMENT ON COLUMN sms_request_tracking.phone_number IS '요청 전화번호';
COMMENT ON COLUMN sms_request_tracking.ip_address IS '요청 IP 주소 (IPv4/IPv6)';
COMMENT ON COLUMN sms_request_tracking.sent_count IS '발송 횟수 (분당 제한용)';
COMMENT ON COLUMN sms_request_tracking.last_sent_at IS '마지막 발송 시간';
COMMENT ON COLUMN sms_request_tracking.created_at IS '최초 요청 일시';
COMMENT ON COLUMN sms_request_tracking.updated_at IS '정보 수정일시';

-- 기본 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_sms_request_tracking_phone ON sms_request_tracking(phone_number);
CREATE INDEX IF NOT EXISTS idx_sms_request_tracking_ip ON sms_request_tracking(ip_address);

-- ============================================================================
-- 1. sms_verifications 테이블에 user_id 추가
-- ============================================================================
-- 역할: 인증 완료 후 사용자와 연결하여 사용자별 SMS 인증 이력 추적
ALTER TABLE sms_verifications 
ADD COLUMN IF NOT EXISTS user_id BIGINT;

-- 외래 키 제약 조건 추가 (users 테이블 존재 여부 확인)
DO $$ 
BEGIN
    -- users 테이블이 존재하는지 확인
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'users'
    ) THEN
        -- 외래 키 제약 조건이 없으면 추가
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'fk_sms_verifications_user'
        ) THEN
            ALTER TABLE sms_verifications 
            ADD CONSTRAINT fk_sms_verifications_user 
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL;
        END IF;
    ELSE
        RAISE NOTICE 'users 테이블이 존재하지 않습니다. 외래 키 제약 조건을 추가할 수 없습니다.';
    END IF;
END $$;

-- 주석 추가
COMMENT ON COLUMN sms_verifications.user_id IS '인증 완료 후 연결된 사용자 ID (Foreign Key → users.id, 선택적)';

-- ============================================================================
-- 2. sms_verifications 테이블에 sms_request_tracking_id 추가
-- ============================================================================
-- 역할: 어떤 SMS 요청으로 인해 인증번호가 생성되었는지 추적
ALTER TABLE sms_verifications 
ADD COLUMN IF NOT EXISTS sms_request_tracking_id BIGINT;

-- 외래 키 제약 조건 추가 (테이블 존재 여부 확인)
DO $$ 
BEGIN
    -- sms_request_tracking 테이블이 존재하는지 확인
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'sms_request_tracking'
    ) THEN
        -- 외래 키 제약 조건이 없으면 추가
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'fk_sms_verifications_request_tracking'
        ) THEN
            ALTER TABLE sms_verifications 
            ADD CONSTRAINT fk_sms_verifications_request_tracking 
            FOREIGN KEY (sms_request_tracking_id) REFERENCES sms_request_tracking (id) ON DELETE SET NULL;
        END IF;
    ELSE
        RAISE NOTICE 'sms_request_tracking 테이블이 존재하지 않습니다. 외래 키 제약 조건을 추가할 수 없습니다.';
    END IF;
END $$;

-- 주석 추가
COMMENT ON COLUMN sms_verifications.sms_request_tracking_id IS '인증번호 생성 요청 추적 ID (Foreign Key → sms_request_tracking.id, 선택적)';

-- ============================================================================
-- 3. sms_request_tracking 테이블에 user_id 추가
-- ============================================================================
-- 역할: 회원인 경우 사용자별 SMS 요청 추적 및 레이트 리밋 개선
ALTER TABLE sms_request_tracking 
ADD COLUMN IF NOT EXISTS user_id BIGINT;

-- 외래 키 제약 조건 추가 (users 테이블 존재 여부 확인)
DO $$ 
BEGIN
    -- users 테이블이 존재하는지 확인
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'users'
    ) THEN
        -- 외래 키 제약 조건이 없으면 추가
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'fk_sms_request_tracking_user'
        ) THEN
            ALTER TABLE sms_request_tracking 
            ADD CONSTRAINT fk_sms_request_tracking_user 
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL;
        END IF;
    ELSE
        RAISE NOTICE 'users 테이블이 존재하지 않습니다. 외래 키 제약 조건을 추가할 수 없습니다.';
    END IF;
END $$;

-- 주석 추가
COMMENT ON COLUMN sms_request_tracking.user_id IS 'SMS 요청한 사용자 ID (Foreign Key → users.id, 선택적, 회원인 경우)';

-- ============================================================================
-- 4. 인덱스 생성 (성능 최적화)
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_sms_verifications_user_id ON sms_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_sms_verifications_request_tracking_id ON sms_verifications(sms_request_tracking_id);
CREATE INDEX IF NOT EXISTS idx_sms_request_tracking_user_id ON sms_request_tracking(user_id);

-- ============================================================================
-- 완료!
-- ============================================================================
-- 이제 다음 기능들이 가능합니다:
-- 1. 사용자별 SMS 인증 이력 추적 (sms_verifications.user_id)
-- 2. SMS 요청과 인증번호 생성 연결 추적 (sms_verifications.sms_request_tracking_id)
-- 3. 사용자별 SMS 요청 추적 및 레이트 리밋 개선 (sms_request_tracking.user_id)
-- 4. 보안 모니터링을 위한 IP 기반 연계 분석 가능
-- ============================================================================

