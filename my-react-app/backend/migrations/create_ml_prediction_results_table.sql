-- ML 예측 결과를 저장하는 테이블 생성
-- Supabase SQL Editor에서 실행하거나 마이그레이션으로 실행

CREATE TABLE IF NOT EXISTS ml_prediction_results (
  id SERIAL PRIMARY KEY,
  url VARCHAR NOT NULL,
  label INT NOT NULL,
  confidence FLOAT,
  created_at TIMESTAMP DEFAULT NOW(),
  requested_by VARCHAR
);

-- 인덱스 추가 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_ml_prediction_results_url ON ml_prediction_results(url);
CREATE INDEX IF NOT EXISTS idx_ml_prediction_results_created_at ON ml_prediction_results(created_at);
CREATE INDEX IF NOT EXISTS idx_ml_prediction_results_label ON ml_prediction_results(label);

