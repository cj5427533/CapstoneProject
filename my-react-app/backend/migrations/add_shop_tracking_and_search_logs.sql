-- 쇼핑몰 추적 및 검색 로그를 위한 스키마 변경
-- Supabase 대시보드의 SQL Editor에서 이 파일을 실행하세요

-- 1. shops 테이블에 created_by_user_id, created_via 컬럼 추가
ALTER TABLE shops 
ADD COLUMN IF NOT EXISTS created_by_user_id BIGINT,
ADD COLUMN IF NOT EXISTS created_via VARCHAR(50); -- 'report', 'rating', 'admin', 'search' 등

-- 2. created_by_user_id에 외래 키 제약 조건 추가
ALTER TABLE shops 
ADD CONSTRAINT fk_shops_created_by_user 
FOREIGN KEY (created_by_user_id) 
REFERENCES users (id) 
ON DELETE SET NULL;

-- 3. shop_search_logs 테이블 생성
CREATE TABLE IF NOT EXISTS shop_search_logs (
  id BIGSERIAL PRIMARY KEY,
  normalized_url VARCHAR(255) NOT NULL,
  raw_url TEXT,
  user_id BIGINT NULL,
  ip_address VARCHAR(64) NULL,
  user_agent TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
);

-- 4. 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_shops_created_by_user_id ON shops(created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_shops_created_via ON shops(created_via);
CREATE INDEX IF NOT EXISTS idx_shops_created_at_date ON shops(created_at);
CREATE INDEX IF NOT EXISTS idx_shop_search_logs_normalized_url ON shop_search_logs(normalized_url);
CREATE INDEX IF NOT EXISTS idx_shop_search_logs_user_id ON shop_search_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_shop_search_logs_created_at ON shop_search_logs(created_at);

-- 완료! 이제 쇼핑몰 생성 추적과 검색 로그가 가능합니다.

