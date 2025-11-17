-- shop_trust_scores 테이블 생성
-- Supabase 대시보드의 SQL Editor에서 이 파일을 실행하세요

CREATE TABLE IF NOT EXISTS "shop_trust_scores" (
  "id"              BIGSERIAL PRIMARY KEY,
  "shop_id"         BIGINT NOT NULL UNIQUE REFERENCES "shops" ("id") ON DELETE CASCADE,
  
  -- 0~1 사이 위험도 점수
  "tech_risk"       NUMERIC(5,4) NOT NULL CHECK ("tech_risk" >= 0 AND "tech_risk" <= 1),
  "review_risk"     NUMERIC(5,4) NOT NULL CHECK ("review_risk" >= 0 AND "review_risk" <= 1),
  
  -- 신고사례 패널티 (0~15)
  "report_penalty"  INTEGER NOT NULL CHECK ("report_penalty" >= 0 AND "report_penalty" <= 15),
  
  -- 최종 신뢰도 (0~100)
  "final_trust"     INTEGER NOT NULL CHECK ("final_trust" >= 0 AND "final_trust" <= 100),
  
  -- VERY_HIGH / HIGH / CAUTION / LOW / VERY_LOW
  "trust_grade"     VARCHAR(20) NOT NULL,
  
  -- 모델 버전 및 분석 시점
  "model_version"   VARCHAR(50),
  "analyzed_at"     TIMESTAMPTZ DEFAULT (NOW())
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS "idx_shop_trust_scores_grade"
  ON "shop_trust_scores" ("trust_grade");

CREATE INDEX IF NOT EXISTS "idx_shop_trust_scores_analyzed_at"
  ON "shop_trust_scores" ("analyzed_at");

CREATE INDEX IF NOT EXISTS "idx_shop_trust_scores_shop_id"
  ON "shop_trust_scores" ("shop_id");

-- 테이블 및 컬럼 주석 추가
COMMENT ON TABLE "shop_trust_scores" IS '쇼핑몰 신뢰도 점수 테이블';
COMMENT ON COLUMN "shop_trust_scores"."tech_risk" IS '기술적 위험도 점수 (0~1, 낮을수록 안전)';
COMMENT ON COLUMN "shop_trust_scores"."review_risk" IS '리뷰 위험도 점수 (0~1, 낮을수록 안전)';
COMMENT ON COLUMN "shop_trust_scores"."report_penalty" IS '신고사례 패널티 (0~15)';
COMMENT ON COLUMN "shop_trust_scores"."final_trust" IS '최종 신뢰도 점수 (0~100, 높을수록 신뢰도 높음)';
COMMENT ON COLUMN "shop_trust_scores"."trust_grade" IS '신뢰도 등급 (VERY_HIGH, HIGH, CAUTION, LOW, VERY_LOW)';
COMMENT ON COLUMN "shop_trust_scores"."model_version" IS '분석 모델 버전';
COMMENT ON COLUMN "shop_trust_scores"."analyzed_at" IS '분석 시점';

-- 완료!

