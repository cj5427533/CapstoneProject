-- parent_shop_id 컬럼 추가 (병합 기능 지원)
-- Supabase 대시보드의 SQL Editor에서 이 파일을 실행하세요

-- 1. shops 테이블에 parent_shop_id 컬럼 추가
ALTER TABLE shops 
ADD COLUMN IF NOT EXISTS parent_shop_id BIGINT;

-- 2. parent_shop_id에 외래 키 제약 조건 추가
ALTER TABLE shops 
ADD CONSTRAINT fk_parent_shop 
FOREIGN KEY (parent_shop_id) 
REFERENCES shops (id) 
ON DELETE SET NULL;

-- 3. 성능을 위한 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_shops_parent_shop_id ON shops(parent_shop_id);

-- 완료! 이제 서로 다른 URL을 같은 쇼핑몰로 병합할 수 있습니다.

