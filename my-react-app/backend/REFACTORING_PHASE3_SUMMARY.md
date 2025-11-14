# 🧩 프로젝트 정리 3단계 - Backend server.js 분리 리팩토링

## 📋 Summary

backend/server.js (3,844줄)를 계층형 구조로 분리하기 위한 초기 작업을 완료했습니다.

## ✅ Completed Tasks

### 1. Utils 폴더 생성 및 유틸리티 함수 분리 ✅

**생성된 파일:**
- `utils/url.js` - URL 정규화 및 관련 함수
- `utils/validation.js` - 입력 검증 함수
- `utils/jwt.js` - JWT 토큰 생성/검증
- `utils/response.js` - 공통 응답 유틸리티
- `utils/error.js` - 에러 처리 유틸리티
- `utils/password.js` - 비밀번호 해싱/검증

### 2. Services 폴더 생성 및 비즈니스 로직 분리 ✅

**생성된 파일:**
- `services/smsService.js` - SMS 발송 서비스
- `services/emailService.js` - 이메일 발송 서비스

### 3. Middleware 폴더 생성 ✅

**생성된 파일:**
- `middleware/verifyToken.js` - JWT 토큰 검증 미들웨어

### 4. Server.js Slim 버전 생성 ✅

**생성된 파일:**
- `server.slim.js` - Slim 버전 서버 파일 (약 100줄)

## 📁 New Folder Tree

```
backend/
 ├── server.js              # 원본 (3,844줄) - 점진적 마이그레이션 예정
 ├── server.slim.js         # ✅ Slim 버전 (100줄)
 ├── routes/                # ✅ 기존 라우터들
 │    ├── auth.js
 │    ├── ai-analysis.js
 │    ├── community.js
 │    ├── reports.js
 │    └── admin.js
 ├── controllers/           # 🔜 생성 필요
 │    ├── shopController.js
 │    ├── authController.js
 │    ├── reportController.js
 │    ├── adminController.js
 │    └── aiController.js
 ├── services/              # ✅ 부분 완료
 │    ├── smsService.js     # ✅ 완료
 │    ├── emailService.js   # ✅ 완료
 │    ├── shopService.js    # 🔜 생성 필요
 │    ├── reportService.js  # 🔜 생성 필요
 │    ├── aiService.js      # 🔜 생성 필요
 │    └── userService.js    # 🔜 생성 필요
 ├── middleware/            # ✅ 부분 완료
 │    ├── verifyToken.js    # ✅ 완료
 │    ├── validator.js      # 🔜 생성 필요
 │    └── errorHandler.js   # ✅ 기존 파일 존재
 └── utils/                 # ✅ 완료
      ├── url.js            # ✅ 완료
      ├── jwt.js            # ✅ 완료
      ├── validation.js     # ✅ 완료
      ├── response.js       # ✅ 완료
      ├── error.js          # ✅ 완료
      └── password.js       # ✅ 완료
```

## 🔄 Migration Plan

### Phase 1: Utils & Services (완료 ✅)
- [x] Utils 폴더 생성 및 함수 분리
- [x] Services 폴더 생성 (SMS, Email)
- [x] Middleware 기본 구조 생성

### Phase 2: Controllers & Routes (진행 중 🔄)
- [ ] Controllers 폴더 생성
- [ ] server.js의 라우트 핸들러를 controllers로 이동
- [ ] Routes 파일들 업데이트 (controllers 사용)

### Phase 3: Remaining Services (예정 📅)
- [ ] shopService.js 생성 (쇼핑몰 관련 비즈니스 로직)
- [ ] reportService.js 생성 (신고 관련 비즈니스 로직)
- [ ] aiService.js 생성 (AI 분석 관련 비즈니스 로직)
- [ ] userService.js 생성 (사용자 관련 비즈니스 로직)

### Phase 4: Server.js 완전 분리 (예정 📅)
- [ ] server.js의 모든 라우트를 routes로 이동
- [ ] server.js의 모든 비즈니스 로직을 services로 이동
- [ ] server.js를 server.slim.js로 교체
- [ ] 원본 server.js 백업

## 📝 주요 변경 사항

### Utils 분리
- `normalizeUrl`, `extractRootDomain`, `calculateSimilarity` → `utils/url.js`
- `validateEmail`, `validatePhoneNumber`, `validateUrl`, `sanitizeInput` → `utils/validation.js`
- `generateToken`, `verifyToken` → `utils/jwt.js`
- `hashPassword`, `verifyPassword` → `utils/password.js`
- 공통 응답 함수 → `utils/response.js`

### Services 분리
- SMS 발송 로직 → `services/smsService.js`
- 이메일 발송 로직 → `services/emailService.js`

### Middleware 분리
- JWT 토큰 검증 → `middleware/verifyToken.js`

## ⚠️ 주의사항

1. **기존 server.js는 유지**: 점진적 마이그레이션을 위해 원본 파일은 유지
2. **server.slim.js는 참고용**: 완전한 분리가 완료되면 server.js로 교체 예정
3. **Routes 업데이트 필요**: 기존 routes 파일들이 utils를 사용하도록 업데이트 필요

## 🔜 다음 단계

1. Controllers 폴더 생성 및 라우트 핸들러 이동
2. Remaining Services 생성 (shop, report, ai, user)
3. Routes 파일들 업데이트 (controllers 사용)
4. server.js 완전 분리 및 교체

---

**작업 일시**: 2025-01-14
**작업 범위**: Backend server.js 분리 리팩토링 초기 작업

