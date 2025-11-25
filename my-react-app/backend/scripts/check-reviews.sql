-- ============================================
-- 리뷰 데이터 진단 SQL 쿼리
-- ============================================

-- 1. 특정 쇼핑몰 정보 확인 (shop_id = 281)
SELECT 
    id,
    name,
    url,
    parent_shop_id,
    created_at
FROM shops
WHERE id = 281;

-- 2. shop_id 281의 전체 리뷰 확인
SELECT 
    id,
    shop_id,
    user_id,
    rating,
    comment,
    LENGTH(comment) as comment_length,
    CASE 
        WHEN comment IS NULL THEN 'NULL'
        WHEN comment = '' THEN '빈 문자열'
        ELSE '있음'
    END as comment_status,
    created_at
FROM shop_ratings
WHERE shop_id = 281
ORDER BY created_at DESC;

-- 3. shop_id 281의 comment가 있는 리뷰만 확인
SELECT 
    id,
    shop_id,
    user_id,
    rating,
    comment,
    LENGTH(comment) as comment_length,
    LEFT(comment, 50) as comment_preview,
    created_at
FROM shop_ratings
WHERE shop_id = 281
    AND comment IS NOT NULL
    AND comment != ''
ORDER BY created_at DESC;

-- 4. shop_id 281의 comment가 없는 리뷰 확인
SELECT 
    id,
    shop_id,
    user_id,
    rating,
    comment,
    CASE 
        WHEN comment IS NULL THEN 'NULL'
        WHEN comment = '' THEN '빈 문자열'
        ELSE '있음'
    END as comment_status,
    created_at
FROM shop_ratings
WHERE shop_id = 281
    AND (comment IS NULL OR comment = '')
ORDER BY created_at DESC;

-- 5. 리뷰 통계 (shop_id = 281)
SELECT 
    COUNT(*) as total_reviews,
    COUNT(CASE WHEN comment IS NOT NULL AND comment != '' THEN 1 END) as reviews_with_comment,
    COUNT(CASE WHEN comment IS NULL OR comment = '' THEN 1 END) as reviews_without_comment,
    AVG(rating) as average_rating,
    MIN(created_at) as first_review,
    MAX(created_at) as last_review
FROM shop_ratings
WHERE shop_id = 281;

-- 6. parent_shop_id를 고려한 관련 쇼핑몰 확인
-- (부모 쇼핑몰이 있는지, 자식 쇼핑몰이 있는지 확인)
SELECT 
    '현재 쇼핑몰' as type,
    id,
    name,
    url,
    parent_shop_id
FROM shops
WHERE id = 281

UNION ALL

SELECT 
    '부모 쇼핑몰' as type,
    id,
    name,
    url,
    parent_shop_id
FROM shops
WHERE id = (SELECT parent_shop_id FROM shops WHERE id = 281 AND parent_shop_id IS NOT NULL)

UNION ALL

SELECT 
    '자식 쇼핑몰' as type,
    id,
    name,
    url,
    parent_shop_id
FROM shops
WHERE parent_shop_id = 281;

-- 7. 관련된 모든 shop_id의 리뷰 확인 (parent_shop_id 고려)
WITH related_shops AS (
    -- 현재 쇼핑몰
    SELECT id FROM shops WHERE id = 281
    
    UNION
    
    -- 부모 쇼핑몰
    SELECT parent_shop_id FROM shops WHERE id = 281 AND parent_shop_id IS NOT NULL
    
    UNION
    
    -- 자식 쇼핑몰들
    SELECT id FROM shops WHERE parent_shop_id = 281
)
SELECT 
    sr.id,
    sr.shop_id,
    s.name as shop_name,
    sr.user_id,
    sr.rating,
    sr.comment,
    LENGTH(sr.comment) as comment_length,
    CASE 
        WHEN sr.comment IS NULL THEN 'NULL'
        WHEN sr.comment = '' THEN '빈 문자열'
        ELSE '있음'
    END as comment_status,
    sr.created_at
FROM shop_ratings sr
JOIN shops s ON sr.shop_id = s.id
WHERE sr.shop_id IN (SELECT id FROM related_shops)
ORDER BY sr.shop_id, sr.created_at DESC;

-- 8. 관련된 모든 shop_id의 리뷰 통계
WITH related_shops AS (
    SELECT id FROM shops WHERE id = 281
    UNION
    SELECT parent_shop_id FROM shops WHERE id = 281 AND parent_shop_id IS NOT NULL
    UNION
    SELECT id FROM shops WHERE parent_shop_id = 281
)
SELECT 
    sr.shop_id,
    s.name as shop_name,
    COUNT(*) as total_reviews,
    COUNT(CASE WHEN sr.comment IS NOT NULL AND sr.comment != '' THEN 1 END) as reviews_with_comment,
    COUNT(CASE WHEN sr.comment IS NULL OR sr.comment = '' THEN 1 END) as reviews_without_comment
FROM shop_ratings sr
JOIN shops s ON sr.shop_id = s.id
WHERE sr.shop_id IN (SELECT id FROM related_shops)
GROUP BY sr.shop_id, s.name
ORDER BY sr.shop_id;

-- 9. comment가 있는 리뷰 중 최근 10개 상세 확인
SELECT 
    sr.id,
    sr.shop_id,
    s.name as shop_name,
    sr.rating,
    sr.comment,
    LENGTH(sr.comment) as comment_length,
    LEFT(sr.comment, 100) as comment_preview,
    sr.created_at,
    u.username
FROM shop_ratings sr
JOIN shops s ON sr.shop_id = s.id
LEFT JOIN users u ON sr.user_id = u.id
WHERE sr.shop_id = 281
    AND sr.comment IS NOT NULL
    AND sr.comment != ''
ORDER BY sr.created_at DESC
LIMIT 10;

-- 10. 리뷰 생성 스크립트로 생성된 리뷰 확인 (최근 3개월 내)
SELECT 
    sr.id,
    sr.shop_id,
    s.name as shop_name,
    sr.rating,
    sr.comment,
    LENGTH(sr.comment) as comment_length,
    sr.created_at,
    CASE 
        WHEN sr.comment IS NULL THEN '❌ NULL'
        WHEN sr.comment = '' THEN '❌ 빈 문자열'
        ELSE '✅ 있음'
    END as comment_status
FROM shop_ratings sr
JOIN shops s ON sr.shop_id = s.id
WHERE sr.shop_id = 281
    AND sr.created_at >= NOW() - INTERVAL '3 months'
ORDER BY sr.created_at DESC;

-- ============================================
-- 캐시 삭제 (리뷰 신뢰도 분석 캐시 초기화)
-- ============================================

-- 11. shop_id 281의 리뷰 신뢰도 분석 캐시 삭제
DELETE FROM ai_analysis_cache_entries 
WHERE shop_id = 281 
AND analysis_type = 'REVIEW_TRUST';

-- 12. 모든 리뷰 신뢰도 분석 캐시 확인
SELECT 
    id,
    shop_id,
    analysis_type,
    created_at,
    expires_at,
    CASE 
        WHEN expires_at < NOW() THEN '만료됨'
        ELSE '유효함'
    END as cache_status
FROM ai_analysis_cache_entries
WHERE analysis_type = 'REVIEW_TRUST'
ORDER BY created_at DESC
LIMIT 20;

