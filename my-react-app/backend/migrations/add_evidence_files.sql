-- reports 테이블에 evidence_files 컬럼 추가
ALTER TABLE reports 
ADD COLUMN IF NOT EXISTS evidence_files TEXT;

-- 기존 NULL 값들을 빈 JSON 배열로 초기화
UPDATE reports 
SET evidence_files = '[]' 
WHERE evidence_files IS NULL;
