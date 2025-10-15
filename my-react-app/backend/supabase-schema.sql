-- Supabase 데이터베이스 스키마
-- 이 파일의 내용을 Supabase 대시보드의 SQL Editor에서 실행하세요

-- 사용자 테이블
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 상점 테이블
CREATE TABLE IF NOT EXISTS shops (
    id BIGSERIAL PRIMARY KEY,
    url VARCHAR(500) UNIQUE NOT NULL,
    name VARCHAR(255),
    parent_shop_id BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (parent_shop_id) REFERENCES shops (id) ON DELETE SET NULL
);

-- 신고 테이블
CREATE TABLE IF NOT EXISTS reports (
    id BIGSERIAL PRIMARY KEY,
    shop_id BIGINT NOT NULL,
    categories TEXT NOT NULL,
    description TEXT NOT NULL,
    reporter_name VARCHAR(255),
    reporter_phone VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (shop_id) REFERENCES shops (id) ON DELETE CASCADE
);

-- 평점 테이블
CREATE TABLE IF NOT EXISTS ratings (
    id BIGSERIAL PRIMARY KEY,
    shop_id BIGINT NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (shop_id) REFERENCES shops (id) ON DELETE CASCADE
);

-- SMS 인증 테이블
CREATE TABLE IF NOT EXISTS sms_verifications (
    id BIGSERIAL PRIMARY KEY,
    phone_number VARCHAR(20) NOT NULL,
    verification_code VARCHAR(10) NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- SMS 요청 제한 테이블
CREATE TABLE IF NOT EXISTS sms_rate_limits (
    id BIGSERIAL PRIMARY KEY,
    phone_number VARCHAR(20) NOT NULL,
    ip_address INET,
    sent_count INTEGER DEFAULT 1,
    last_sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_reports_shop_id ON reports(shop_id);
CREATE INDEX IF NOT EXISTS idx_ratings_shop_id ON ratings(shop_id);
CREATE INDEX IF NOT EXISTS idx_sms_verifications_phone ON sms_verifications(phone_number);
CREATE INDEX IF NOT EXISTS idx_sms_rate_limits_phone ON sms_rate_limits(phone_number);
CREATE INDEX IF NOT EXISTS idx_shops_url ON shops(url);
CREATE INDEX IF NOT EXISTS idx_shops_parent_shop_id ON shops(parent_shop_id);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at);
CREATE INDEX IF NOT EXISTS idx_ratings_created_at ON ratings(created_at);
CREATE INDEX IF NOT EXISTS idx_shops_created_at ON shops(created_at);

-- Row Level Security (RLS) 활성화
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_rate_limits ENABLE ROW LEVEL SECURITY;

-- 기본 정책 설정 (모든 사용자가 읽기/쓰기 가능)
CREATE POLICY "Enable all operations for all users" ON users FOR ALL USING (true);
CREATE POLICY "Enable all operations for all users" ON shops FOR ALL USING (true);
CREATE POLICY "Enable all operations for all users" ON reports FOR ALL USING (true);
CREATE POLICY "Enable all operations for all users" ON ratings FOR ALL USING (true);
CREATE POLICY "Enable all operations for all users" ON sms_verifications FOR ALL USING (true);
CREATE POLICY "Enable all operations for all users" ON sms_rate_limits FOR ALL USING (true);
