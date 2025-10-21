-- 개선된 데이터베이스 스키마 (증빙 기반 리뷰 시스템)
-- 기존 스키마에 추가할 내용들

-- 1. 기존 reports 테이블에 증빙 관련 컬럼 추가
ALTER TABLE reports ADD COLUMN IF NOT EXISTS evidence_type VARCHAR(50) DEFAULT 'NONE';
ALTER TABLE reports ADD COLUMN IF NOT EXISTS evidence_files TEXT; -- JSON 형태로 파일 경로 저장
ALTER TABLE reports ADD COLUMN IF NOT EXISTS evidence_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS verification_score INTEGER DEFAULT 0;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS report_type VARCHAR(50) DEFAULT 'GENERAL_REVIEW';

-- 2. 공정위/국세청 등록 정보 테이블
CREATE TABLE IF NOT EXISTS business_registrations (
    id BIGSERIAL PRIMARY KEY,
    shop_id BIGINT NOT NULL,
    business_number VARCHAR(20),
    registration_date DATE,
    business_status VARCHAR(20) DEFAULT 'UNKNOWN', -- 'ACTIVE', 'SUSPENDED', 'CLOSED', 'UNKNOWN'
    business_type VARCHAR(100),
    capital_amount BIGINT,
    representative_name VARCHAR(100),
    business_address TEXT,
    phone_number VARCHAR(20),
    email VARCHAR(255),
    last_verified TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    verification_source VARCHAR(50) DEFAULT 'MANUAL', -- 'API', 'MANUAL', 'CRAWLING'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (shop_id) REFERENCES shops (id) ON DELETE CASCADE
);

-- 3. 웹 크롤링 분석 결과 테이블
CREATE TABLE IF NOT EXISTS web_analysis (
    id BIGSERIAL PRIMARY KEY,
    shop_id BIGINT NOT NULL,
    suspicious_keywords TEXT, -- JSON 형태로 의심 키워드 저장
    price_analysis TEXT, -- JSON 형태로 가격 분석 결과 저장
    technical_analysis TEXT, -- JSON 형태로 기술적 분석 결과 저장
    domain_analysis TEXT, -- JSON 형태로 도메인 분석 결과 저장
    analysis_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    analysis_source VARCHAR(50) DEFAULT 'AUTO', -- 'AUTO', 'MANUAL'
    confidence_score INTEGER DEFAULT 0, -- 분석 신뢰도 점수 (0-100)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (shop_id) REFERENCES shops (id) ON DELETE CASCADE
);

-- 4. 파일 업로드 관리 테이블
CREATE TABLE IF NOT EXISTS uploaded_files (
    id BIGSERIAL PRIMARY KEY,
    report_id BIGINT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    upload_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    verification_status VARCHAR(20) DEFAULT 'PENDING', -- 'PENDING', 'VERIFIED', 'REJECTED'
    FOREIGN KEY (report_id) REFERENCES reports (id) ON DELETE CASCADE
);

-- 5. AI 분석 결과 캐시 테이블
CREATE TABLE IF NOT EXISTS ai_analysis_cache (
    id BIGSERIAL PRIMARY KEY,
    shop_id BIGINT NOT NULL,
    analysis_type VARCHAR(50) NOT NULL, -- 'RISK_ANALYSIS', 'BUSINESS_ANALYSIS', 'WEB_ANALYSIS'
    analysis_result TEXT NOT NULL, -- JSON 형태로 분석 결과 저장
    analysis_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (shop_id) REFERENCES shops (id) ON DELETE CASCADE
);

-- 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_reports_evidence_type ON reports(evidence_type);
CREATE INDEX IF NOT EXISTS idx_reports_report_type ON reports(report_type);
CREATE INDEX IF NOT EXISTS idx_reports_verification_score ON reports(verification_score);
CREATE INDEX IF NOT EXISTS idx_business_registrations_shop_id ON business_registrations(shop_id);
CREATE INDEX IF NOT EXISTS idx_business_registrations_business_number ON business_registrations(business_number);
CREATE INDEX IF NOT EXISTS idx_business_registrations_business_status ON business_registrations(business_status);
CREATE INDEX IF NOT EXISTS idx_web_analysis_shop_id ON web_analysis(shop_id);
CREATE INDEX IF NOT EXISTS idx_web_analysis_analysis_date ON web_analysis(analysis_date);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_report_id ON uploaded_files(report_id);
CREATE INDEX IF NOT EXISTS idx_ai_analysis_cache_shop_id ON ai_analysis_cache(shop_id);
CREATE INDEX IF NOT EXISTS idx_ai_analysis_cache_expires_at ON ai_analysis_cache(expires_at);

-- RLS 정책 추가
ALTER TABLE business_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE web_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE uploaded_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_analysis_cache ENABLE ROW LEVEL SECURITY;

-- 기본 정책 설정
CREATE POLICY "Enable all operations for all users" ON business_registrations FOR ALL USING (true);
CREATE POLICY "Enable all operations for all users" ON web_analysis FOR ALL USING (true);
CREATE POLICY "Enable all operations for all users" ON uploaded_files FOR ALL USING (true);
CREATE POLICY "Enable all operations for all users" ON ai_analysis_cache FOR ALL USING (true);

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

