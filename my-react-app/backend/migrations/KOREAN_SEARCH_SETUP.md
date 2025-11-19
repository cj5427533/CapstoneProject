# 한국어 검색 개선 설정 가이드

이 문서는 pg_trgm 확장을 사용한 한국어 검색 개선 기능을 설정하는 방법을 안내합니다.

## 📋 개요

기존 Full-Text Search에 `pg_trgm` 확장을 추가하여 한국어 검색 성능과 정확도를 향상시킵니다.

### 주요 개선 사항
- ✅ 부분 문자열 매칭 지원
- ✅ 유사도 검색 (similarity)
- ✅ 한국어 단어 경계 인식 개선
- ✅ 오타 허용 검색
- ✅ Full-Text Search와 하이브리드 검색

## 🚀 마이그레이션 실행 순서

### 1단계: pg_trgm 확장 및 인덱스 생성
```sql
-- 파일: add_korean_search_improvements.sql
-- Supabase SQL Editor에서 실행
```

### 2단계: 한국어 검색 RPC 함수 생성
```sql
-- 파일: add_korean_search_functions.sql
-- Supabase SQL Editor에서 실행
```

## 📝 Supabase에서 실행하는 방법

### 방법 1: Supabase Dashboard 사용

1. Supabase Dashboard에 로그인
2. 프로젝트 선택
3. 좌측 메뉴에서 **SQL Editor** 클릭
4. 각 마이그레이션 파일의 내용을 복사하여 실행
5. **Run** 버튼 클릭

### 방법 2: psql 사용

```bash
# Supabase 프로젝트의 Database URL 사용
psql "postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres" -f add_korean_search_improvements.sql
psql "postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres" -f add_korean_search_functions.sql
```

## ✅ 확인 사항

### pg_trgm 확장 활성화 확인
```sql
SELECT * FROM pg_extension WHERE extname = 'pg_trgm';
```

### 인덱스 생성 확인
```sql
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE indexname LIKE '%trgm%'
ORDER BY tablename, indexname;
```

예상 결과:
- `shops_name_trgm_idx`
- `shops_url_trgm_idx`
- `shop_reports_description_trgm_idx`
- `shop_reports_categories_trgm_idx`
- `shop_reports_reporter_name_trgm_idx`
- `users_username_trgm_idx`
- `users_email_trgm_idx`
- `users_phone_number_trgm_idx`
- `community_posts_title_trgm_idx`
- `community_posts_content_trgm_idx`

### RPC 함수 생성 확인
```sql
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE '%korean%'
ORDER BY routine_name;
```

예상 결과:
- `search_shops_korean`
- `search_reports_korean`
- `search_users_korean`
- `count_shops_korean`
- `count_reports_korean`
- `count_users_korean`

## 🧪 테스트

### 쇼핑몰 한국어 검색 테스트
```sql
-- 기본 유사도 임계값 (0.3) 사용
SELECT * FROM search_shops_korean('테스트', 0.3, 10, 0);

-- 더 엄격한 검색 (0.5)
SELECT * FROM search_shops_korean('테스트', 0.5, 10, 0);

-- 더 관대한 검색 (0.2)
SELECT * FROM search_shops_korean('테스트', 0.2, 10, 0);
```

### 신고 한국어 검색 테스트
```sql
SELECT * FROM search_reports_korean('사기', 0.3, 10, 0);
```

### 사용자 한국어 검색 테스트
```sql
SELECT * FROM search_users_korean('admin', 0.3, 10, 0);
```

## ⚙️ 유사도 임계값 설정

유사도 임계값(similarity_threshold)은 0.0 ~ 1.0 사이의 값입니다.

- **0.0 ~ 0.2**: 매우 관대한 검색 (많은 결과, 낮은 정확도)
- **0.3 ~ 0.4**: 기본값 (권장) - 균형잡힌 검색
- **0.5 ~ 0.7**: 엄격한 검색 (적은 결과, 높은 정확도)
- **0.8 ~ 1.0**: 매우 엄격한 검색 (매우 적은 결과, 매우 높은 정확도)

### API에서 사용
```
GET /api/admin/shops?search=검색어&similarity=0.3
GET /api/admin/reports?search=검색어&similarity=0.4
GET /api/admin/users?search=검색어&similarity=0.3
```

## 🔍 검색 방식 비교

### 기존 Full-Text Search
- 단어 단위 매칭
- 한국어 형태소 분석 미지원
- 정확한 단어 일치 필요

### 개선된 한국어 검색 (pg_trgm)
- 부분 문자열 매칭 지원
- 유사도 기반 검색
- 오타 허용
- 한국어 단어 경계 인식 개선
- Full-Text Search와 하이브리드 사용

## 📊 성능 고려사항

### 인덱스 크기
- pg_trgm 인덱스는 일반적으로 Full-Text Search 인덱스보다 큽니다
- 대용량 데이터의 경우 인덱스 생성에 시간이 걸릴 수 있습니다

### 검색 성능
- GIN 인덱스를 사용하여 빠른 검색 지원
- 유사도 계산은 CPU 집약적일 수 있으므로 적절한 임계값 설정 권장

### 최적화 팁
1. 적절한 유사도 임계값 사용 (기본값 0.3 권장)
2. 검색 결과 제한 (page_limit 사용)
3. 자주 사용되는 컬럼에만 인덱스 생성

## 🐛 문제 해결

### pg_trgm 확장 활성화 실패
- Supabase에서는 일반적으로 자동으로 활성화되지만, 수동으로 활성화해야 할 수 있습니다
- `CREATE EXTENSION IF NOT EXISTS pg_trgm;` 실행

### 인덱스 생성 실패
- 테이블이 존재하는지 확인
- 권한이 충분한지 확인
- 기존 인덱스와 충돌하지 않는지 확인

### 검색 결과가 나오지 않음
- 유사도 임계값을 낮춰보세요 (예: 0.2)
- 검색어가 올바른지 확인
- 데이터가 실제로 존재하는지 확인

### 성능 문제
- 유사도 임계값을 높여보세요 (더 엄격한 검색)
- 검색 결과 제한을 줄이세요
- 인덱스가 제대로 생성되었는지 확인

## 📚 참고 자료

- [PostgreSQL pg_trgm 문서](https://www.postgresql.org/docs/current/pgtrgm.html)
- [Trigram 기반 유사도 검색](https://www.postgresql.org/docs/current/pgtrgm.html#PGTRGM-FUNC-TABLE)
- [GIN 인덱스 문서](https://www.postgresql.org/docs/current/gin.html)

---

**작성일**: 2025년 1월  
**버전**: 1.0.0

