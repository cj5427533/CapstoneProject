# 마이그레이션 및 코드 업데이트 체크리스트

## ✅ 완료된 항목

### 1. 테이블 이름 변경 반영 ✅

**마이그레이션**: `001_table_naming_refactoring.sql`

**백엔드 코드 업데이트**:
- ✅ `services/reportService.js`: `reports` → `shop_reports`
- ✅ `services/shopService.js`: `reports` → `shop_reports`, `ratings` → `shop_ratings`
- ✅ `services/smsService.js`: `sms_request_tracking` → `sms_request_logs`
- ✅ `controllers/ratingController.js`: `ratings` → `shop_ratings`
- ✅ `controllers/adminController.js`: `reports` → `shop_reports`, `ratings` → `shop_ratings`
- ✅ `controllers/shopController.js`: `reports` → `shop_reports`, `ratings` → `shop_ratings`

**확인 방법**:
```bash
grep -r "\.from(['\"]reports" my-react-app/backend/services my-react-app/backend/controllers
# 결과: server.legacy.js에만 남아있음 (레거시 파일이므로 무시)
```

### 2. 익명 사용자 처리 ✅

**마이그레이션**: `003_anonymous_user_and_null_handling.sql`

**백엔드 코드 업데이트**:
- ✅ `utils/anonymousUser.js`: 익명 사용자 ID 조회/확인 함수 생성
- ✅ `services/reportService.js`: `ensureUserId()` 사용하여 user_id 자동 설정
- ✅ `controllers/ratingController.js`: `ensureUserId()` 사용하여 user_id 자동 설정
- ✅ `services/userService.js`: `deleteUser()` 함수에 익명 사용자 삭제 방지 로직 추가

**익명 사용자 정보**:
- 이메일: `anonymous@system.local`
- 사용자명: `anonymous`
- 상태: `anonymous`
- 삭제 방지: `deleteUser()` 함수에서 체크

### 3. CASCADE 전략 변경 반영 ✅

**마이그레이션**: `004_cascade_strategy_refactoring.sql`

**백엔드 코드 업데이트**:
- ✅ `services/userService.js`: `deleteUser()` 함수 추가
  - DELETE 대신 `UPDATE users SET status = 'deleted'` 사용
  - 익명 사용자 삭제 방지
- ✅ `controllers/authController.js`: `deleteAccount()` 컨트롤러 추가
- ✅ `routes/auth.js`: `DELETE /api/auth/account` 엔드포인트 추가
- ✅ `services/userService.js`: `loginUser()` 함수에서 탈퇴한 사용자 로그인 불가 처리
- ✅ `services/userService.js`: `checkUsername()`, `requestPasswordReset()` 함수에서 탈퇴한 사용자 제외

### 4. ENUM 타입 정의 ✅

**마이그레이션**: `005_enum_verification_source.sql`

**TypeScript 타입 정의**:
- ✅ `src/types/shared.ts`: `VerificationSource` 타입 추가
  ```typescript
  export type VerificationSource = 'API' | 'MANUAL' | 'CRAWLING';
  ```
- ✅ `src/services/enhancedShopRiskAnalyzer.ts`: 이미 정의되어 있음 확인

**참고**: `business_registrations` 테이블은 현재 백엔드에서 직접 사용하지 않으므로 추가 업데이트 불필요

## 📋 추가 확인 사항

### 익명 사용자 삭제 방지 (데이터베이스 레벨)

데이터베이스에서 직접 익명 사용자를 삭제하는 것을 방지하려면 다음 제약조건 추가를 고려할 수 있습니다:

```sql
-- 선택사항: 익명 사용자 삭제 방지 트리거
CREATE OR REPLACE FUNCTION prevent_anonymous_user_deletion()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.email = 'anonymous@system.local' OR OLD.status = 'anonymous' THEN
        RAISE EXCEPTION '익명 사용자는 삭제할 수 없습니다.';
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_prevent_anonymous_user_deletion
    BEFORE DELETE ON users
    FOR EACH ROW
    EXECUTE FUNCTION prevent_anonymous_user_deletion();
```

**현재 상태**: 애플리케이션 레벨에서만 방지 (위 트리거는 선택사항)

### 사용자 탈퇴 엔드포인트

**추가됨**: `DELETE /api/auth/account`
- ✅ 인증 필요 (JWT 토큰)
- ✅ DELETE 대신 status = 'deleted'로 변경
- ✅ 익명 사용자 삭제 방지

**테스트 방법**:
```bash
DELETE /api/auth/account
Headers: { "Authorization": "Bearer <token>" }
```

### 사용자 조회 시 탈퇴 사용자 제외

다음 함수들에서 탈퇴한 사용자를 제외하도록 업데이트됨:
- ✅ `loginUser()`: `.neq('status', 'deleted')` 추가
- ✅ `checkUsername()`: `.neq('status', 'deleted')` 추가
- ✅ `requestPasswordReset()`: `.neq('status', 'deleted')` 추가

## 🔍 최종 검증 쿼리

마이그레이션 완료 후 다음 쿼리로 검증:

```sql
-- 1. 테이블 이름 확인
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('shop_reports', 'shop_ratings', 'report_evidence_attachments', 
                     'sms_request_logs', 'ai_analysis_cache_entries', 'web_analysis_results')
ORDER BY table_name;

-- 2. 익명 사용자 확인
SELECT id, username, email, status FROM users 
WHERE email = 'anonymous@system.local' OR status = 'anonymous';

-- 3. user_id NULL 확인 (없어야 함)
SELECT COUNT(*) as null_count FROM shop_reports WHERE user_id IS NULL;
SELECT COUNT(*) as null_count FROM shop_ratings WHERE user_id IS NULL;
-- 결과: 둘 다 0이어야 함

-- 4. 인덱스 확인
SELECT indexname FROM pg_indexes 
WHERE schemaname = 'public' 
  AND indexname LIKE 'idx_shop_%'
ORDER BY indexname;

-- 5. FK 제약조건 확인 (ON DELETE RESTRICT)
SELECT conname, conrelid::regclass as table_name, confrelid::regclass as ref_table,
       pg_get_constraintdef(oid) as constraint_def
FROM pg_constraint 
WHERE contype = 'f' 
  AND conname LIKE '%user_id%'
ORDER BY conname;

-- 6. ENUM 타입 확인
SELECT typname, typtype FROM pg_type 
WHERE typname = 'verification_source_enum';

-- 7. users.status 컬럼 확인
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'status';
```

## ⚠️ 남은 작업 (선택사항)

1. **익명 사용자 삭제 방지 트리거** (데이터베이스 레벨)
   - 현재는 애플리케이션 레벨에서만 방지
   - 데이터베이스 트리거 추가를 고려할 수 있음

2. **사용자 탈퇴 UI 추가** (프론트엔드)
   - 마이페이지에 탈퇴 버튼 추가
   - `DELETE /api/auth/account` 호출

3. **탈퇴 사용자 표시** (프론트엔드)
   - 리뷰/신고 작성자 이름 표시 시 탈퇴 사용자는 "탈퇴한 사용자"로 표시
   - 데이터베이스 함수 `get_user_display_name()` 활용 가능

## ✅ 체크리스트 요약

| 항목 | 상태 | 비고 |
|------|------|------|
| 테이블 이름 변경 반영 | ✅ 완료 | 모든 서비스/컨트롤러 업데이트 완료 |
| 익명 사용자 ID 자동 설정 | ✅ 완료 | `ensureUserId()` 함수 사용 |
| 익명 사용자 삭제 방지 | ✅ 완료 | `deleteUser()` 함수에서 체크 |
| CASCADE 전략 변경 (탈퇴 로직) | ✅ 완료 | `DELETE /api/auth/account` 엔드포인트 추가 |
| ENUM 타입 정의 (TypeScript) | ✅ 완료 | `src/types/shared.ts`에 추가 |
| 사용자 조회 시 탈퇴 사용자 제외 | ✅ 완료 | `loginUser`, `checkUsername`, `requestPasswordReset`에서 처리 |

## 📝 참고

- **레거시 파일**: `server.legacy.js`에 예전 테이블 이름이 남아있지만, 이 파일은 사용하지 않으므로 무시해도 됩니다.
- **데이터베이스 트리거**: 익명 사용자 삭제 방지 트리거는 선택사항입니다. 현재는 애플리케이션 레벨에서 충분히 방지하고 있습니다.

