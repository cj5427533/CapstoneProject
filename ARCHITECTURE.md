# 여기몰까 (YeogiMolkka) - 시스템 아키텍처 문서

> **프로젝트명**: 여기몰까 (ygmk)  
> **목적**: 안전한 온라인 쇼핑을 위한 쇼핑몰 검증 및 신고 플랫폼  
> **최종 업데이트**: 2025년 1월  
> **버전**: 2.0.0

---

## 📑 목차

1. [시스템 개요](#1-시스템-개요)
2. [전체 아키텍처](#2-전체-아키텍처)
3. [프로젝트 구조](#3-프로젝트-구조)
4. [기술 스택](#4-기술-스택)
5. [프론트엔드 구조](#5-프론트엔드-구조)
6. [백엔드 구조](#6-백엔드-구조)
7. [데이터베이스 스키마](#7-데이터베이스-스키마)
8. [API 엔드포인트](#8-api-엔드포인트)
9. [주요 기능 흐름](#9-주요-기능-흐름)
10. [보안 구조](#10-보안-구조)
11. [외부 서비스 통합](#11-외부-서비스-통합)
12. [배포 환경](#12-배포-환경)
13. [주요 설정 파일](#13-주요-설정-파일)
14. [데이터베이스 마이그레이션](#14-데이터베이스-마이그레이션)
15. [에러 처리](#15-에러-처리)
16. [성능 최적화](#16-성능-최적화)
17. [테스트 데이터](#17-테스트-데이터)
18. [주요 알고리즘](#18-주요-알고리즘)
19. [파일 업로드 시스템](#19-파일-업로드-시스템)
20. [환경 변수 참조](#20-환경-변수-참조)
21. [개발 가이드](#21-개발-가이드)
22. [트러블슈팅](#22-트러블슈팅)
23. [향후 개선 사항](#23-향후-개선-사항)
24. [참고 자료](#24-참고-자료)
25. [최근 업데이트 내역](#25-최근-업데이트-내역)

---

## 1. 시스템 개요

### 1.1 프로젝트 소개

**여기몰까**는 사용자들이 온라인 쇼핑몰의 신뢰성을 검증하고, 피해 사례를 공유할 수 있는 플랫폼입니다.

### 1.2 핵심 기능

- 🔍 **쇼핑몰 검색 및 분석**: URL 기반 쇼핑몰 정보 조회, AI 기반 위험도 분석
- 📊 **피해 사례 제보**: 사용자 신고 접수, 증빙 자료 업로드, 카테고리 분류
- ⭐ **평점 및 리뷰 시스템**: 쇼핑몰별 사용자 평가, 리뷰 작성 및 조회
- 🤖 **AI 기반 분석**: 가짜 리뷰 탐지, 쇼핑몰 신뢰도 분석, 피싱 탐지
- 💬 **커뮤니티**: 사용자 간 정보 공유 게시판, 댓글, 좋아요
- 👤 **사용자 인증**: SMS 인증 기반 회원가입, JWT 로그인, 비밀번호 재설정
- 🔐 **관리자 시스템**: 신고 관리, 통계 대시보드, 쇼핑몰 병합

---

## 2. 전체 아키텍처

### 2.1 시스템 아키텍처 다이어그램

```
┌─────────────────────────────────────────────────────────────────┐
│                    클라이언트 레이어 (Frontend)                   │
│                                                                 │
│  React 18.3.1 + TypeScript 5.5.4 + Vite 5.4.0                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Pages (18개)                                            │  │
│  │  • HomePage, SearchResultPage, ReportPage               │  │
│  │  • LoginPage, SignupPage, MyPage                        │  │
│  │  • CommunityPage, AdminPage, ReportsListPage            │  │
│  │  • DangerousShopsPage, RecommendedShopsPage             │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Components (25개+)                                      │  │
│  │  • Header, Footer, Rating, ReviewForm                   │  │
│  │  • AdvancedAIAnalysis, FakeReviewAnalysis               │  │
│  │  • UI Components (shadcn/ui)                            │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Services (8개)                                          │  │
│  │  • fakeReviewDetector, shopRiskAnalyzer                 │  │
│  │  • phishingDetector, webCrawlingAnalyzer                │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  Port: 5173 (개발) / 정적 파일 (프로덕션)                        │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ HTTP/HTTPS REST API
                             │
┌────────────────────────────┴────────────────────────────────────┐
│                    백엔드 레이어 (Backend)                        │
│                                                                 │
│  Express.js 5.1.0 + Node.js                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  미들웨어                                                  │  │
│  │  • CORS (모든 오리진 허용)                                 │  │
│  │  • JWT 인증 (verifyToken)                                 │  │
│  │  • Multer (파일 업로드, 10MB 제한)                        │  │
│  │  • 입력 검증 (XSS 방지, sanitizeInput)                    │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  라우터 (6개)                                             │  │
│  │  • /api/auth (인증)                                       │  │
│  │  • /api/shops (쇼핑몰)                                    │  │
│  │  • /api/reports (신고)                                    │  │
│  │  • /api/community (커뮤니티)                              │  │
│  │  • /api/ai (AI 분석)                                      │  │
│  │  • /api/admin (관리자)                                    │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  Port: 3001                                                     │
└────────────────────┬─────────────────┬─────────────────────────┘
                     │                 │                 │
         ┌───────────┴────────┐        │                 │
         │                    │        │                 │
         ▼                    ▼        ▼                 ▼
┌─────────────────┐  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐
│   Supabase      │  │   SolAPI    │  │ Gmail SMTP   │  │ OpenRouter   │
│   PostgreSQL    │  │  (SMS 인증)  │  │ (이메일 발송) │  │ AI (Claude)  │
│                 │  └─────────────┘  └──────────────┘  └──────────────┘
│  14개 테이블     │
│  • users        │
│  • shops        │
│  • reports      │
│  • ratings      │
│  • community_*  │
│  • ai_cache     │
└─────────────────┘
```

### 2.2 데이터 흐름

1. **사용자 요청** → React 프론트엔드
2. **API 호출** → Express.js 백엔드
3. **데이터 처리** → Supabase PostgreSQL
4. **외부 서비스** → SolAPI, Gmail SMTP, OpenRouter AI
5. **응답 반환** → JSON 형식으로 프론트엔드에 전달

---

## 3. 프로젝트 구조

### 3.1 디렉토리 구조

```
CapstoneProject/
├── my-react-app/
│   ├── src/
│   │   ├── pages/              # 페이지 컴포넌트 (18개)
│   │   ├── components/         # 재사용 컴포넌트 (25개+)
│   │   │   ├── report/         # 신고 관련 컴포넌트
│   │   │   ├── theme/          # 테마 관련 컴포넌트
│   │   │   └── ui/             # UI 기본 컴포넌트 (shadcn/ui)
│   │   ├── services/           # 비즈니스 로직 (8개)
│   │   ├── utils/              # 유틸리티 함수
│   │   ├── contexts/           # React Context (AuthContext)
│   │   ├── types/              # TypeScript 타입 정의
│   │   └── styles.css          # 전역 스타일
│   ├── backend/
│   │   ├── routes/             # API 라우터 (6개)
│   │   ├── middleware/         # 미들웨어
│   │   ├── migrations/         # 데이터베이스 마이그레이션
│   │   ├── uploads/            # 업로드된 파일 저장소
│   │   └── server.js           # 메인 서버 파일
│   ├── package.json
│   └── vite.config.ts
├── ARCHITECTURE.md             # 이 문서
├── SYSTEM_ARCHITECTURE.md      # 상세 아키텍처
└── ERD.mermaid                 # 데이터베이스 ERD
```

---

## 4. 기술 스택

### 4.1 프론트엔드

| 기술 | 버전 | 용도 | 파일 위치 |
|------|------|------|-----------|
| React | 18.3.1 | UI 프레임워크 | `src/` |
| TypeScript | 5.5.4 | 타입 안전성 | `tsconfig.json` |
| Vite | 5.4.0 | 빌드 도구 | `vite.config.ts` |
| React Router | 6.26.2 | 클라이언트 라우팅 | `src/App.tsx` |
| React Toastify | 11.0.5 | 알림 메시지 | 전역 사용 |
| Tailwind CSS | 3.4.1 | CSS 프레임워크 | `tailwind.config.js` |
| class-variance-authority | 0.7.0 | 컴포넌트 변형 | `src/components/ui/` |
| Recharts | 3.4.1 | 차트 및 데이터 시각화 | `src/components/admin/` |
| shadcn/ui | - | UI 컴포넌트 라이브러리 | `src/components/ui/` |

### 4.2 백엔드

| 기술 | 버전 | 용도 | 파일 위치 |
|------|------|------|-----------|
| Node.js | - | 런타임 환경 | - |
| Express.js | 5.1.0 | 웹 프레임워크 | `backend/server.js` |
| JWT | 9.0.2 | 인증 토큰 | `backend/server.js` |
| Multer | 2.0.2 | 파일 업로드 | `backend/server.js` |
| Node-Fetch | 3.3.2 | HTTP 클라이언트 | `backend/server.js` |
| Nodemailer | 7.0.9 | 이메일 발송 | `backend/server.js` |
| Supabase Client | 2.58.0 | 데이터베이스 클라이언트 | `backend/server.js` |

### 4.3 데이터베이스

| 기술 | 용도 | 연결 정보 |
|------|------|-----------|
| Supabase | PostgreSQL 호스팅 | 환경 변수: `SUPABASE_URL`, `SUPABASE_KEY` |
| PostgreSQL | 관계형 데이터베이스 | Supabase를 통해 관리 |

### 4.4 외부 서비스

| 서비스 | 용도 | 환경 변수 |
|--------|------|-----------|
| SolAPI | SMS 인증번호 발송 | `SOLAPI_KEY`, `SOLAPI_SECRET`, `SOLAPI_FROM_NUMBER` |
| Gmail SMTP | 비밀번호 재설정 이메일 | `GMAIL_USER`, `GMAIL_APP_PASSWORD` |
| OpenRouter AI | AI 기반 분석 (Claude 3.5 Sonnet) | `VITE_OPENROUTER_API_KEY` |

---

## 5. 프론트엔드 구조

### 5.1 페이지 컴포넌트 (18개)

**파일 위치**: `src/pages/`

| 페이지 | 파일명 | 경로 | 설명 |
|--------|--------|------|------|
| 홈 | `HomePage.tsx` | `/` | 메인 검색 페이지 |
| 검색 결과 | `SearchResultPage.tsx` | `/search` | 쇼핑몰 상세 정보 및 AI 분석 |
| 신고 작성 | `ReportPage.tsx` | `/report` | 피해 사례 제보 (구버전) |
| 신고 작성 (신규) | `ReportFormPage.tsx` | `/report/new` | 피해 사례 제보 (신규 UI) |
| 신고 목록 | `ReportsListPage.tsx` | `/reports` | 전체 피해 사례 목록 |
| 커뮤니티 | `CommunityPage.tsx` | `/community` | 게시판 |
| 관리자 | `AdminPage.tsx` | `/admin` | 관리자 대시보드 |
| 마이페이지 | `MyPage.tsx` | `/mypage` | 사용자 정보 및 내 활동 |
| 로그인 | `LoginPage.tsx` | `/login` | 로그인 |
| 회원가입 | `SignupPage.tsx` | `/signup` | 회원가입 |
| 비밀번호 찾기 | `ForgotPasswordPage.tsx` | `/forgot-password` | 비밀번호 재설정 요청 |
| 비밀번호 재설정 | `ResetPasswordPage.tsx` | `/reset-password` | 비밀번호 재설정 |
| 소개 | `AboutPage.tsx` | `/about` | 서비스 소개 |
| 위험 쇼핑몰 | `DangerousPage.tsx` | `/dangerous` | 위험 쇼핑몰 목록 (구버전) |
| 위험 쇼핑몰 (신규) | `DangerousShopsPage.tsx` | `/dangerous-shops` | 위험 쇼핑몰 목록 (신규) |
| 추천 쇼핑몰 | `TopRatedPage.tsx` | `/top-rated` | 고평점 쇼핑몰 (구버전) |
| 추천 쇼핑몰 (신규) | `RecommendedShopsPage.tsx` | `/recommended-shops` | 추천 쇼핑몰 목록 (신규) |

### 5.2 주요 컴포넌트 (25개+)

**파일 위치**: `src/components/`

#### 레이아웃 컴포넌트
- `Header.tsx` - 상단 네비게이션 바
- `Footer.tsx` - 하단 푸터

#### 기능 컴포넌트
- `Rating.tsx` - 별점 표시 및 입력
- `ReviewForm.tsx` - 리뷰 작성 폼
- `ReviewsList.tsx` - 리뷰 목록 표시
- `URLSearchBar.tsx` - URL 검색 바

#### AI 분석 컴포넌트
- `AdvancedAIAnalysis.tsx` - 고급 AI 분석 결과 표시
- `EnhancedAIAnalysis.tsx` - 향상된 AI 분석
- `FakeReviewAnalysis.tsx` - 가짜 리뷰 분석 결과
- `MockShopAnalysis.tsx` - 목업 쇼핑몰 분석
- `MockShopSelector.tsx` - 목업 쇼핑몰 선택기

#### 신고 관련 컴포넌트 (`components/report/`)
- `FileDropzone.tsx` - 파일 드래그 앤 드롭
- `ReportHeader.tsx` - 신고 헤더
- `ScoreDial.tsx` - 점수 다이얼
- `StatusBadge.tsx` - 상태 배지
- `StepIndicator.tsx` - 단계 표시기

#### UI 컴포넌트 (`components/ui/`)
- `badge.tsx`, `button.tsx`, `card.tsx`
- `input.tsx`, `label.tsx`, `skeleton.tsx`, `textarea.tsx`
- shadcn/ui 기반 고품질 컴포넌트

#### 테마 컴포넌트 (`components/theme/`)
- `theme-provider.tsx` - 테마 제공자 (다크/라이트/시스템 모드)
- `theme-toggle.tsx` - 테마 토글 버튼

#### 관리자 컴포넌트 (`components/admin/`)
- `AdminDashboardCharts.tsx` - 관리자 대시보드 차트 (통계 시각화)

### 5.3 서비스 레이어 (8개)

**파일 위치**: `src/services/`

| 서비스 | 파일명 | 설명 |
|--------|--------|------|
| 가짜 리뷰 탐지 | `fakeReviewDetector.ts` | 기본 가짜 리뷰 탐지 |
| 고급 가짜 리뷰 탐지 | `advancedFakeReviewDetector.ts` | 고급 가짜 리뷰 탐지 |
| 고급 가짜 리뷰 시스템 | `advancedFakeReviewSystem.ts` | 통합 가짜 리뷰 시스템 |
| 쇼핑몰 위험 분석 | `shopRiskAnalyzer.ts` | 기본 위험도 분석 |
| 향상된 위험 분석 | `enhancedShopRiskAnalyzer.ts` | 향상된 위험도 분석 |
| 피싱 탐지 | `phishingDetector.ts` | 피싱 사이트 탐지 |
| 실시간 피싱 시스템 | `realTimePhishingSystem.ts` | 실시간 피싱 탐지 |
| 웹 크롤링 분석 | `webCrawlingAnalyzer.ts` | 웹사이트 크롤링 및 분석 |

### 5.4 유틸리티

**파일 위치**: `src/utils/`

- `api.ts` - API 호출 함수 (40개+ 함수)
- `helpers.ts` - 헬퍼 함수
- `openRouter.ts` - OpenRouter AI 클라이언트

### 5.5 상태 관리

**파일 위치**: `src/contexts/`

- `AuthContext.tsx` - 사용자 인증 상태 관리
  - `user`: 현재 로그인한 사용자 정보
  - `isAuthenticated`: 로그인 여부
  - `login()`, `logout()`: 로그인/로그아웃 함수

---

## 6. 백엔드 구조

### 6.1 메인 서버 파일

**파일 위치**: `backend/server.js` (3,445줄)

**주요 기능**:
- Express 앱 초기화
- 미들웨어 설정 (CORS, JSON 파싱, 파일 업로드)
- 라우터 등록
- 서버 시작 (Port 3001)

### 6.2 라우터 모듈 (6개)

**파일 위치**: `backend/routes/`

| 라우터 | 파일명 | 주요 엔드포인트 |
|--------|--------|----------------|
| 인증 | `auth.js` | 회원가입, 로그인, SMS 인증, 비밀번호 재설정 |
| 쇼핑몰 | `index.js` | 쇼핑몰 검색, 조회, 위험/추천 목록 |
| 신고 | `reports.js` | 신고 작성, 조회, 수정, 삭제 |
| 커뮤니티 | `community.js` | 게시글, 댓글, 좋아요 |
| AI 분석 | `ai-analysis.js` | 가짜 리뷰 탐지, 쇼핑몰 위험도 분석 |
| 관리자 | `admin.js` | 관리자 전용 API (통계, 신고/쇼핑몰/커뮤니티 관리) |

### 6.3 미들웨어

**파일 위치**: `backend/middleware/`

- `errorHandler.js` - 에러 핸들링 미들웨어

**서버 파일 내 미들웨어**:
- `cors()` - CORS 설정 (모든 오리진 허용)
- `express.json()` - JSON 파싱
- `multer` - 파일 업로드 (10MB 제한, PNG/JPG만)
- `verifyToken()` - JWT 토큰 검증

### 6.4 주요 함수

**서버 파일 내 정의된 함수**:

| 함수명 | 설명 | 위치 |
|--------|------|------|
| `sanitizeInput()` | XSS 방지 입력 정제 | 라인 17-24 |
| `validateEmail()` | 이메일 형식 검증 | 라인 26-29 |
| `validatePhoneNumber()` | 전화번호 형식 검증 | 라인 31-34 |
| `validateUrl()` | URL 형식 검증 | 라인 36-43 |
| `generateToken()` | JWT 토큰 생성 | 라인 49-59 |
| `verifyToken()` | JWT 토큰 검증 | 라인 61-75 |
| `hashPassword()` | 비밀번호 해싱 (SHA-256) | 라인 702-705 |
| `verifyPassword()` | 비밀번호 검증 | 라인 707-710 |
| `normalizeUrl()` | URL 정규화 | 라인 571-637 |
| `getWebsiteTitle()` | 웹사이트 타이틀 추출 | 라인 356-539 |
| `sendPasswordResetEmail()` | 비밀번호 재설정 이메일 발송 | 라인 172-350 |
| `sendSolAPI()` | SMS 발송 (SolAPI) | 라인 659-700 |
| `checkRateLimit()` | SMS 레이트 리밋 확인 | 라인 712-781 |
| `checkSSL()` | SSL 인증서 검증 | 라인 2610-2651 |
| `checkRedirects()` | 리다이렉트 체인 추적 | 라인 2653-2703 |
| `fetchPageContent()` | 웹 페이지 콘텐츠 가져오기 | 라인 2735-2775 |

---

## 7. 데이터베이스 스키마

### 7.1 테이블 목록 (14개)

**데이터베이스**: Supabase PostgreSQL

#### 사용자 & 인증 (4개)
1. **users** - 사용자 정보
   - `id` (bigserial, PK)
   - `username` (varchar)
   - `email` (varchar, unique)
   - `password` (varchar, SHA-256 해시)
   - `phone_number` (varchar)
   - `created_at`, `updated_at` (timestamptz)

2. **password_reset_tokens** - 비밀번호 재설정 토큰
   - `id` (bigserial, PK)
   - `user_id` (bigint, FK → users.id)
   - `token` (varchar, unique)
   - `expires_at` (timestamptz)
   - `used` (boolean)
   - `created_at` (timestamptz)

3. **sms_verifications** - SMS 인증 정보
   - `id` (bigserial, PK)
   - `phone_number` (varchar)
   - `verification_code` (varchar, 6자리)
   - `is_verified` (boolean)
   - `expires_at` (timestamptz)
   - `created_at` (timestamptz)

4. **sms_request_tracking** - SMS 발송 추적
   - `id` (bigserial, PK)
   - `phone_number` (varchar)
   - `ip_address` (varchar)
   - `sent_count` (integer)
   - `last_sent_at` (timestamptz)
   - `created_at`, `updated_at` (timestamptz)

#### 쇼핑몰 & 신고 (4개)
5. **shops** - 쇼핑몰 정보
   - `id` (bigserial, PK)
   - `url` (varchar, unique, 정규화된 URL)
   - `name` (varchar, 웹 스크래핑으로 자동 추출)
   - `parent_shop_id` (bigint, FK → shops.id, 자기참조)
   - `search_count` (integer)
   - `created_at`, `updated_at` (timestamptz)

6. **reports** - 신고 내역
   - `id` (bigserial, PK)
   - `shop_id` (bigint, FK → shops.id)
   - `user_id` (bigint, FK → users.id, nullable)
   - `reporter_name` (varchar)
   - `reporter_phone` (varchar, nullable)
   - `categories` (text, JSON 배열)
   - `description` (text)
   - `evidence_files` (text, JSON 배열, 파일 경로)
   - `status` (varchar, 'pending'/'approved'/'rejected')
   - `created_at`, `updated_at` (timestamptz)

7. **ratings** - 평점 및 리뷰
   - `id` (bigserial, PK)
   - `shop_id` (bigint, FK → shops.id)
   - `user_id` (bigint, FK → users.id, nullable)
   - `rating` (integer, 1-5)
   - `comment` (text, nullable, 리뷰 내용)
   - `created_at` (timestamptz)

8. **uploaded_files** - 업로드된 파일 메타데이터
   - `id` (bigserial, PK)
   - `report_id` (bigint, FK → reports.id)
   - `file_path` (varchar)
   - `file_name` (varchar)
   - `file_size` (bigint)
   - `mime_type` (varchar)
   - `created_at` (timestamptz)

#### 커뮤니티 (3개)
9. **community_posts** - 커뮤니티 게시글
   - `id` (bigserial, PK)
   - `user_id` (bigint, FK → users.id)
   - `title` (varchar)
   - `content` (text)
   - `views` (integer, 기본값 0)
   - `likes` (integer, 기본값 0)
   - `comments_count` (integer, 기본값 0)
   - `created_at`, `updated_at` (timestamptz)

10. **community_comments** - 커뮤니티 댓글
    - `id` (bigserial, PK)
    - `post_id` (bigint, FK → community_posts.id)
    - `user_id` (bigint, FK → users.id)
    - `content` (text)
    - `created_at`, `updated_at` (timestamptz)

11. **community_post_likes** - 게시글 좋아요
    - `id` (bigserial, PK)
    - `post_id` (bigint, FK → community_posts.id)
    - `user_id` (bigint, FK → users.id)
    - `created_at` (timestamptz)
    - UNIQUE 제약: (post_id, user_id)

#### 분석 & 캐시 (3개)
12. **ai_analysis_cache** - AI 분석 결과 캐시
    - `id` (bigserial, PK)
    - `shop_id` (bigint, FK → shops.id)
    - `analysis_type` (varchar)
    - `analysis_result` (jsonb)
    - `created_at`, `updated_at` (timestamptz)

13. **web_analysis** - 웹 분석 결과
    - `id` (bigserial, PK)
    - `shop_id` (bigint, FK → shops.id)
    - `analysis_data` (jsonb)
    - `created_at` (timestamptz)

14. **business_registrations** - 사업자 등록 정보
    - `id` (bigserial, PK)
    - `shop_id` (bigint, FK → shops.id)
    - `business_number` (varchar)
    - `business_name` (varchar)
    - `representative` (varchar)
    - `address` (text)
    - `created_at`, `updated_at` (timestamptz)

### 7.2 주요 관계

```
users (1) ──→ (N) reports
users (1) ──→ (N) ratings
users (1) ──→ (N) community_posts
users (1) ──→ (N) community_comments

shops (1) ──→ (N) reports
shops (1) ──→ (N) ratings
shops (1) ──→ (N) shops (parent_shop_id, 자기참조)
shops (1) ──→ (N) ai_analysis_cache
shops (1) ──→ (N) web_analysis
shops (1) ──→ (N) business_registrations

reports (1) ──→ (N) uploaded_files

community_posts (1) ──→ (N) community_comments
community_posts (1) ──→ (N) community_post_likes
```

---

## 8. API 엔드포인트

### 8.1 인증 API (`/api/auth`)

**파일 위치**: `backend/server.js` (라인 810-1232)

| 메서드 | 엔드포인트 | 설명 | 인증 필요 |
|--------|-----------|------|-----------|
| POST | `/api/auth/send-sms` | SMS 인증번호 발송 | ❌ |
| POST | `/api/auth/verify-sms` | SMS 인증번호 확인 | ❌ |
| POST | `/api/auth/register` | 회원가입 | ❌ |
| POST | `/api/auth/login` | 로그인 | ❌ |
| POST | `/api/auth/request-password-reset` | 비밀번호 재설정 요청 | ❌ |
| POST | `/api/auth/reset-password` | 비밀번호 재설정 | ❌ |
| GET | `/api/auth/me` | 현재 사용자 정보 | ✅ |
| POST | `/api/auth/check-username` | 사용자명 중복 확인 | ❌ |

**요청 예시**:
```javascript
// 회원가입
POST /api/auth/register
{
  "username": "testuser",
  "email": "test@example.com",
  "password": "password123",
  "phoneNumber": "01012345678",
  "verificationCode": "123456"
}

// 로그인
POST /api/auth/login
{
  "email": "test@example.com",
  "password": "password123"
}

// 응답
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "testuser",
    "email": "test@example.com",
    "phoneNumber": "01012345678"
  }
}
```

### 8.2 쇼핑몰 API (`/api/shops`)

**파일 위치**: `backend/server.js` (라인 1294-1612)

| 메서드 | 엔드포인트 | 설명 | 인증 필요 |
|--------|-----------|------|-----------|
| POST | `/api/shops/search` | 쇼핑몰 검색 또는 생성 | ❌ |
| GET | `/api/shops/:shopId/reports` | 쇼핑몰 신고 목록 | ❌ |
| GET | `/api/shops/:shopId/ratings` | 쇼핑몰 평점 조회 | ❌ |
| GET | `/api/shops/:shopId/reviews` | 쇼핑몰 리뷰 목록 (comment 포함) | ❌ |
| GET | `/api/dangerous-pages` | 위험 쇼핑몰 목록 | ❌ |
| GET | `/api/top-rated-pages` | 고평점 쇼핑몰 목록 | ❌ |
| GET | `/api/dangerous-shops` | 위험 쇼핑몰 목록 (신규) | ❌ |
| GET | `/api/recommended-shops` | 추천 쇼핑몰 목록 (신규) | ❌ |

**요청 예시**:
```javascript
// 쇼핑몰 검색
POST /api/shops/search
{
  "url": "https://example.com"
}

// 응답
{
  "shop": {
    "id": 1,
    "url": "example.com",
    "name": "Example Shop",
    "created_at": "2025-01-01T00:00:00Z"
  },
  "isNew": false
}
```

### 8.3 평점 API (`/api/ratings`)

**파일 위치**: `backend/server.js` (라인 1565-1654)

| 메서드 | 엔드포인트 | 설명 | 인증 필요 |
|--------|-----------|------|-----------|
| POST | `/api/ratings` | 평점 및 리뷰 작성 | ✅ (선택적) |
| DELETE | `/api/ratings/reset` | 평점 데이터 초기화 (관리자) | ❌ |

**요청 예시**:
```javascript
// 리뷰 작성
POST /api/ratings
Headers: { "Authorization": "Bearer <token>" }
{
  "shopUrl": "https://example.com",
  "rating": 5,
  "comment": "정말 만족스러운 쇼핑이었습니다!"
}

// 응답
{
  "success": true,
  "rating": {
    "id": 1,
    "shop_id": 1,
    "user_id": 1,
    "rating": 5,
    "comment": "정말 만족스러운 쇼핑이었습니다!",
    "created_at": "2025-01-01T00:00:00Z"
  }
}
```

### 8.4 신고 API (`/api/reports`)

**파일 위치**: `backend/server.js` (라인 1794-1930)

| 메서드 | 엔드포인트 | 설명 | 인증 필요 |
|--------|-----------|------|-----------|
| POST | `/api/reports` | 신고 작성 (파일 업로드 지원) | ✅ (선택적) |
| GET | `/api/reports/user/:reporterName` | 사용자별 신고 목록 | ❌ |
| GET | `/api/reports/user/:reporterName/shop/:shopUrl` | 특정 쇼핑몰 신고 조회 | ❌ |
| PUT | `/api/reports/:reportId` | 신고 수정 | ❌ |
| DELETE | `/api/reports/:reportId/user/:reporterName` | 신고 삭제 | ❌ |

**요청 예시**:
```javascript
// 신고 작성 (FormData)
POST /api/reports
Content-Type: multipart/form-data
{
  "shopUrl": "https://example.com",
  "categories": '["사기/피싱", "배송 문제"]',
  "description": "피해 사례 설명...",
  "reporterName": "testuser",
  "reporterPhone": "01012345678",
  "evidenceFiles": [File, File, ...]  // 최대 10개
}

// 응답
{
  "success": true,
  "report": {
    "id": 1,
    "shop_id": 1,
    "categories": '["사기/피싱", "배송 문제"]',
    "description": "피해 사례 설명...",
    "evidence_files": '["/uploads/file1.png", "/uploads/file2.png"]',
    "created_at": "2025-01-01T00:00:00Z"
  },
  "uploadedFiles": ["/uploads/file1.png", "/uploads/file2.png"]
}
```

### 8.5 커뮤니티 API (`/api/community`)

**파일 위치**: `backend/routes/community.js`

| 메서드 | 엔드포인트 | 설명 | 인증 필요 |
|--------|-----------|------|-----------|
| GET | `/api/community/posts` | 게시글 목록 (댓글 수 포함) | ❌ |
| POST | `/api/community/posts` | 게시글 작성 (제목 2-100자, 내용 10-1000자) | ✅ |
| GET | `/api/community/posts/:id` | 게시글 상세 (조회수 자동 증가) | ❌ |
| PUT | `/api/community/posts/:id` | 게시글 수정 (본인만) | ✅ |
| DELETE | `/api/community/posts/:id` | 게시글 삭제 (본인만) | ✅ |
| POST | `/api/community/posts/:id/comments` | 댓글 작성 (1-500자) | ✅ |
| DELETE | `/api/community/comments/:id` | 댓글 삭제 (본인만) | ✅ |
| GET | `/api/community/posts/:id/comments` | 댓글 목록 조회 | ❌ |
| POST | `/api/community/posts/:id/like` | 좋아요 (중복 방지) | ✅ |
| GET | `/api/community/admin/posts` | 관리자: 모든 게시글 조회 | ❌ |
| DELETE | `/api/community/admin/posts/:id` | 관리자: 게시글 삭제 | ❌ |
| GET | `/api/community/admin/comments` | 관리자: 모든 댓글 조회 | ❌ |
| DELETE | `/api/community/admin/comments/:id` | 관리자: 댓글 삭제 | ❌ |

### 8.6 AI 분석 API (`/api/ai`)

**파일 위치**: `backend/routes/ai-analysis.js`

| 메서드 | 엔드포인트 | 설명 | 인증 필요 |
|--------|-----------|------|-----------|
| POST | `/api/ai/detect-fake-reviews` | 가짜 리뷰 탐지 | ❌ |
| POST | `/api/ai/analyze-shop-risk` | 쇼핑몰 위험도 분석 | ❌ |

### 8.7 피싱 탐지 API (`/api/phishing`)

**파일 위치**: `backend/server.js` (라인 2777-2974)

| 메서드 | 엔드포인트 | 설명 | 인증 필요 |
|--------|-----------|------|-----------|
| POST | `/api/phishing/detect` | 피싱 사이트 탐지 | ❌ |

**요청 예시**:
```javascript
POST /api/phishing/detect
{
  "url": "https://suspicious-site.com"
}

// 응답
{
  "success": true,
  "result": {
    "phishingScore": 25,  // 0-100 (낮을수록 위험)
    "riskLevel": "HIGH",  // LOW/MEDIUM/HIGH/CRITICAL
    "reasons": [
      "도메인이 최근에 생성되었습니다 (15일)",
      "SSL 인증서가 유효하지 않거나 없습니다"
    ],
    "recommendations": [
      "신중하게 접속하세요",
      "개인정보 입력 전 사업자 정보를 확인하세요"
    ],
    "analysis": {
      "domainAnalysis": {
        "domainAge": 15,
        "sslValid": false,
        "redirectCount": 3
      }
    }
  }
}
```

### 8.8 관리자 API (`/api/admin`)

**파일 위치**: `backend/server.js` (라인 2249-2587)

| 메서드 | 엔드포인트 | 설명 | 인증 필요 |
|--------|-----------|------|-----------|
| GET | `/api/admin/shops` | 전체 쇼핑몰 조회 | ❌ |
| PUT | `/api/admin/shops/:shopId` | 쇼핑몰 이름 수정 | ❌ |
| DELETE | `/api/admin/shops/:shopId` | 쇼핑몰 삭제 | ❌ |
| POST | `/api/admin/shops/merge` | 쇼핑몰 병합 | ❌ |
| GET | `/api/admin/reports` | 전체 신고 조회 | ❌ |
| PATCH | `/api/admin/reports/:id` | 신고 상태 변경 | ❌ |
| DELETE | `/api/admin/reports/:reportId` | 신고 삭제 | ❌ |
| GET | `/api/admin/ratings` | 전체 평점 조회 | ❌ |
| DELETE | `/api/admin/ratings/:ratingId` | 평점 삭제 | ❌ |
| GET | `/api/admin/users` | 전체 사용자 조회 | ❌ |
| GET | `/api/admin/stats` | 시스템 통계 (쇼핑몰 수, 신고 수, 사용자 수, 게시글 수, 차트 데이터) | ❌ |
| GET | `/api/admin/community/posts` | 관리자: 커뮤니티 게시글 목록 | ❌ |
| DELETE | `/api/admin/community/posts/:id` | 관리자: 커뮤니티 게시글 삭제 | ❌ |
| GET | `/api/admin/community/comments` | 관리자: 커뮤니티 댓글 목록 | ❌ |
| DELETE | `/api/admin/community/comments/:id` | 관리자: 커뮤니티 댓글 삭제 | ❌ |

### 8.9 기타 API

| 메서드 | 엔드포인트 | 설명 |
|--------|-----------|------|
| GET | `/api/health` | 헬스 체크 |
| GET | `/` | API 정보 |
| POST | `/api/mock/ratings/generate` | 목업 리뷰 데이터 생성 |
| POST | `/api/test-email` | 테스트 이메일 발송 |

---

## 9. 주요 기능 흐름

### 9.1 쇼핑몰 검색 플로우

```
[사용자] 
  ↓ URL 입력
[HomePage.tsx]
  ↓ navigate('/search?url=...')
[SearchResultPage.tsx]
  ↓ useEffect
[api.ts - searchOrCreateShop()]
  ↓ POST /api/shops/search
[server.js - POST /api/shops/search]
  ↓ normalizeUrl()
  ↓ Supabase shops 테이블 조회
  ↓ (없으면) getWebsiteTitle() - 웹 스크래핑
  ↓ (없으면) shops 테이블에 INSERT
  ↓ 응답 반환
[SearchResultPage.tsx]
  ↓ getShopReports(), getShopRatings()
  ↓ AdvancedAIAnalysis 컴포넌트 렌더링
  ↓ ReviewsList 컴포넌트 렌더링
[화면 표시]
```

### 9.2 회원가입 플로우

```
[사용자]
  ↓ SignupPage.tsx
  ↓ 정보 입력 (이름, 이메일, 비밀번호, 전화번호)
  ↓ "인증번호 발송" 버튼 클릭
[api.ts - sendSMSVerification()]
  ↓ POST /api/auth/send-sms
[server.js - POST /api/auth/send-sms]
  ↓ validatePhoneNumber()
  ↓ checkRateLimit() - 레이트 리밋 확인
  ↓ 6자리 인증번호 생성
  ↓ sendSolAPI() - SMS 발송
  ↓ Supabase sms_verifications 테이블에 저장
  ↓ 응답 반환
[SignupPage.tsx]
  ↓ 인증번호 입력
  ↓ "인증번호 확인" 버튼 클릭
[api.ts - verifySMSVerification()]
  ↓ POST /api/auth/verify-sms
[server.js - POST /api/auth/verify-sms]
  ↓ Supabase에서 인증번호 확인
  ↓ 만료 시간 확인 (3분)
  ↓ is_verified = true로 업데이트
  ↓ 응답 반환
[SignupPage.tsx]
  ↓ "회원가입" 버튼 클릭
[api.ts - register()]
  ↓ POST /api/auth/register
[server.js - POST /api/auth/register]
  ↓ 입력 검증 (sanitizeInput, validateEmail, validatePhoneNumber)
  ↓ SMS 인증 확인
  ↓ 중복 사용자 확인
  ↓ hashPassword() - SHA-256 해싱
  ↓ Supabase users 테이블에 INSERT
  ↓ generateToken() - JWT 토큰 생성
  ↓ 응답 반환
[SignupPage.tsx]
  ↓ AuthContext.login() - 로그인 상태 저장
  ↓ LocalStorage에 토큰 저장
  ↓ navigate('/mypage')
```

### 9.3 신고 작성 플로우

```
[사용자]
  ↓ ReportFormPage.tsx 또는 ReportPage.tsx
  ↓ 쇼핑몰 URL 입력
  ↓ 카테고리 선택 (체크박스)
  ↓ 설명 작성
  ↓ 증빙 파일 업로드 (선택)
  ↓ "제보하기" 버튼 클릭
[api.ts - createReport()]
  ↓ FormData 생성
  ↓ POST /api/reports (multipart/form-data)
[server.js - POST /api/reports]
  ↓ multer 미들웨어 - 파일 업로드 처리
  ↓ normalizeUrl() - URL 정규화
  ↓ Supabase shops 테이블 조회/생성
  ↓ 중복 신고 체크 (같은 사용자, 같은 쇼핑몰)
  ↓ Supabase reports 테이블에 INSERT
  ↓ 응답 반환
[ReportFormPage.tsx]
  ↓ toast.success() - 성공 메시지
  ↓ navigate('/reports')
```

### 9.4 리뷰 작성 플로우

```
[사용자]
  ↓ SearchResultPage.tsx
  ↓ "리뷰 작성하기" 버튼 클릭
  ↓ ReviewForm 컴포넌트 표시
  ↓ 평점 선택 (1-5)
  ↓ 리뷰 내용 작성 (최소 10자)
  ↓ "리뷰 등록하기" 버튼 클릭
[ReviewForm.tsx]
  ↓ createRating() 호출
[api.ts - createRating()]
  ↓ POST /api/ratings
  ↓ Headers: { "Authorization": "Bearer <token>" }
[server.js - POST /api/ratings]
  ↓ JWT 토큰에서 user_id 추출 (선택적)
  ↓ normalizeUrl() - URL 정규화
  ↓ Supabase shops 테이블 조회/생성
  ↓ Supabase ratings 테이블에 INSERT
    - shop_id, rating, comment, user_id (있으면)
  ↓ 응답 반환
[ReviewForm.tsx]
  ↓ onReviewSubmitted() 콜백 호출
[SearchResultPage.tsx]
  ↓ handleReviewSubmitted()
  ↓ reviewRefreshKey 증가
[ReviewsList.tsx]
  ↓ useEffect (refreshKey 변경 감지)
  ↓ getShopReviews() 호출
  ↓ GET /api/shops/:shopId/reviews
[server.js - GET /api/shops/:shopId/reviews]
  ↓ Supabase ratings 테이블 조회
  ↓ comment가 있는 리뷰만 필터링
  ↓ user_id가 있으면 users 테이블에서 username 조회
  ↓ 응답 반환
[ReviewsList.tsx]
  ↓ 리뷰 목록 업데이트
  ↓ 화면에 새 리뷰 표시
```

### 9.5 AI 가짜 리뷰 탐지 플로우

```
[사용자]
  ↓ SearchResultPage.tsx
  ↓ AdvancedAIAnalysis 컴포넌트
  ↓ "가짜 리뷰 분석" 버튼 클릭
[FakeReviewAnalysis.tsx]
  ↓ fakeReviewDetector.detectFakeReviews() 호출
[services/fakeReviewDetector.ts]
  ↓ getShopReviews() - 리뷰 목록 가져오기
  ↓ OpenRouter AI API 호출 (배치 처리, 5개씩)
[utils/openRouter.ts]
  ↓ POST https://openrouter.ai/api/v1/chat/completions
  ↓ Model: anthropic/claude-3.5-sonnet
  ↓ 프롬프트: 리뷰 텍스트 분석 요청
[OpenRouter AI]
  ↓ Claude 3.5 Sonnet 모델 분석
  ↓ 가짜 리뷰 점수 반환 (0-1)
[services/fakeReviewDetector.ts]
  ↓ 점수 계산 (텍스트 패턴 40% + 시간적 패턴 30% + 행동 패턴 30%)
  ↓ 0.7 이상이면 가짜 리뷰로 판정
  ↓ AI에게 이유 생성 요청
[FakeReviewAnalysis.tsx]
  ↓ 결과 표시 (가짜 리뷰 목록, 통계, 신뢰도 등급)
```

---

## 10. 보안 구조

### 10.1 인증 & 인가

**JWT 토큰**:
- 알고리즘: HS256
- 만료 시간: 7일
- 저장 위치: LocalStorage (`authToken`)
- 검증 함수: `verifyToken()` (backend/server.js:61-75)

**비밀번호**:
- 해싱 알고리즘: SHA-256
- 함수: `hashPassword()` (backend/server.js:702-705)
- 검증 함수: `verifyPassword()` (backend/server.js:707-710)

### 10.2 SMS 인증 보안

**인증번호**:
- 형식: 6자리 랜덤 숫자
- 만료 시간: 3분
- 저장: Supabase `sms_verifications` 테이블

**레이트 리밋**:
- 제한: 5회/분
- 추적: Supabase `sms_request_tracking` 테이블
- 함수: `checkRateLimit()` (backend/server.js:712-781)

### 10.3 입력 검증

**XSS 방지**:
```javascript
const sanitizeInput = (input) => {
  return input
    .replace(/[<>]/g, '')           // HTML 태그 제거
    .replace(/javascript:/gi, '')   // JavaScript 프로토콜 제거
    .replace(/on\w+=/gi, '')        // 이벤트 핸들러 제거
    .trim();
};
```

**검증 함수**:
- `validateEmail()` - 이메일 형식 검증
- `validatePhoneNumber()` - 전화번호 형식 검증 (한국: 010-XXXX-XXXX)
- `validateUrl()` - URL 형식 검증

### 10.4 파일 업로드 보안

**Multer 설정**:
- 허용 타입: `image/jpeg`, `image/jpg`, `image/png`만
- 파일 크기 제한: 10MB
- 파일명: 랜덤 생성 (`Date.now() + '-' + Math.random()`)
- 저장 위치: `backend/uploads/`

### 10.5 환경 변수

**필수 환경 변수** (`.env` 파일):
```bash
# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# JWT
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=7d

# SMS (SolAPI)
SOLAPI_KEY=xxx
SOLAPI_SECRET=xxx
SOLAPI_FROM_NUMBER=01012345678

# Email (Gmail SMTP)
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=xxx

# Frontend URL
FRONTEND_URL=http://localhost:5173

# OpenRouter AI (프론트엔드)
VITE_OPENROUTER_API_KEY=sk-or-v1-xxx
```

---

## 11. 외부 서비스 통합

### 11.1 Supabase (PostgreSQL)

**용도**: 메인 데이터베이스

**연결**:
```javascript
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);
```

**주요 기능**:
- 사용자 인증 및 데이터 저장
- 쇼핑몰, 신고, 평점 데이터 관리
- 커뮤니티 게시글 및 댓글 관리

### 11.2 SolAPI (SMS 인증)

**용도**: SMS 인증번호 발송

**인증 방식**: HMAC-SHA256

**함수**: `sendSolAPI()` (backend/server.js:659-700)

**API 엔드포인트**: `https://api.solapi.com/messages/v4/send`

**요청 형식**:
```javascript
{
  "message": {
    "to": "01012345678",
    "from": "01012345678",
    "text": "[여기몰까] 인증번호: 123456",
    "type": "SMS"
  }
}
```

### 11.3 Gmail SMTP (이메일)

**용도**: 비밀번호 재설정 이메일 발송

**설정**: Nodemailer + Gmail SMTP

**함수**: `sendPasswordResetEmail()` (backend/server.js:172-350)

**이메일 형식**: HTML 템플릿 (비밀번호 재설정 링크 포함)

### 11.4 OpenRouter AI (Claude 3.5 Sonnet)

**용도**: AI 기반 가짜 리뷰 탐지 및 쇼핑몰 신뢰도 분석

**모델**: `anthropic/claude-3.5-sonnet`

**API 엔드포인트**: `https://openrouter.ai/api/v1/chat/completions`

**파일 위치**: `src/utils/openRouter.ts`

**주요 함수**:
- `analyzeFakeReview()` - 가짜 리뷰 분석
- `analyzeShopRisk()` - 쇼핑몰 위험도 분석

**최적화**:
- 배치 처리: 5개씩 묶어서 처리
- Rate Limiting: 1초 간격
- 에러 핸들링: 실패 시 기본값 반환
- AI 분석 결과 캐싱: `ai_analysis_cache` 테이블에 저장하여 재사용

---

## 12. 배포 환경

### 12.1 개발 환경

```bash
# 프론트엔드
cd my-react-app
npm run dev
# → http://localhost:5173

# 백엔드
cd my-react-app/backend
npm run dev
# → http://localhost:3001
```

### 12.2 프로덕션 빌드

```bash
# 프론트엔드 빌드
cd my-react-app
npm run build
# → dist/ 디렉토리에 정적 파일 생성

# 백엔드 실행
cd my-react-app/backend
npm start
# → Port 3001에서 실행
```

### 12.3 배포 옵션

- **Railway**: `railway.json` 설정 파일 포함
- **Serverless**: `serverless.yml` 설정 파일 포함
- **AWS Lambda**: `serverless-http` 패키지 사용 가능

---

## 13. 주요 설정 파일

### 13.1 프론트엔드 설정

**`vite.config.ts`**:
- 포트: 5173
- 프록시: `/api` → `http://localhost:3001`
- 경로 별칭: `@/*` → `./src/*`

**`tsconfig.json`**:
- 타겟: ES2020
- 모듈: ESNext
- JSX: react-jsx
- Strict 모드: 활성화

**`tailwind.config.js`**:
- Tailwind CSS 설정
- 커스텀 테마 설정

### 13.2 백엔드 설정

**`server.js`**:
- 포트: 3001 (환경 변수 `PORT` 또는 기본값)
- 호스트: `0.0.0.0` (모든 인터페이스)
- CORS: 모든 오리진 허용

---

## 14. 데이터베이스 마이그레이션

**파일 위치**: `backend/migrations/`

- `add_evidence_files.sql` - 증빙 파일 테이블 추가

**스키마 파일**:
- `backend/complete-schema.sql` - 전체 스키마
- `backend/enhanced-schema.sql` - 향상된 스키마
- `backend/supabase-schema.sql` - Supabase 스키마
- `backend/update_schema_parent_shop.sql` - 쇼핑몰 병합 기능 추가

---

## 15. 에러 처리

### 15.1 프론트엔드 에러 처리

- **React Toastify**: 사용자에게 에러 메시지 표시
- **Try-Catch**: API 호출 시 에러 캐치
- **에러 바운더리**: (향후 추가 가능)

### 15.2 백엔드 에러 처리

- **에러 핸들링 미들웨어**: `backend/middleware/errorHandler.js`
- **Try-Catch**: 모든 비동기 함수에서 에러 처리
- **에러 로깅**: `console.error()`로 서버 콘솔에 기록

---

## 16. 성능 최적화

### 16.1 프론트엔드

- **코드 스플리팅**: React Router 기반 자동 코드 스플리팅
- **이미지 최적화**: Vite 빌드 시 자동 최적화
- **디바운싱**: 검색 입력 디바운싱 (HomePage.tsx)

### 16.2 백엔드

- **캐싱**: 웹사이트 타이틀 캐싱 (24시간, 메모리 기반)
- **배치 처리**: AI 분석 시 5개씩 묶어서 처리 (1초 간격)
- **AI 분석 결과 캐싱**: `ai_analysis_cache` 테이블에 저장하여 중복 분석 방지
- **Rate Limiting**: SMS 발송 레이트 리밋 (5회/분)
- **데이터베이스 인덱싱**: 자주 조회되는 컬럼에 인덱스 추가 (user_id, shop_id, created_at 등)

---

## 17. 테스트 데이터

### 17.1 목업 데이터

**파일 위치**: `src/data/mockData.ts`

**목업 쇼핑몰**:
- `trusted-mall.co.kr` - 신뢰 쇼핑몰 (교육용)
- `reliable-store.com` - 안전한 스토어 (교육용)
- `caution-mall.com` - 주의 쇼핑몰 (교육용)
- `mixed-reviews.co.kr` - 혼재 리뷰몰 (교육용)

**목업 리뷰 생성**:
- API: `POST /api/mock/ratings/generate`
- 함수: `initializeMockRatings()` (서버 시작 시 자동 실행)

---

## 18. 주요 알고리즘

### 18.1 URL 정규화

**함수**: `normalizeUrl()` (backend/server.js:571-637)

**처리 내용**:
1. 프로토콜 추가 (`https://`)
2. `www.` 제거
3. 모바일 도메인 매핑 (`m.11st.co.kr` → `11st.co.kr`)
4. 2단계 TLD 처리 (`co.kr`, `ne.jp` 등)
5. 네이버 스마트스토어 특별 처리

### 18.2 쇼핑몰 병합

**함수**: `POST /api/admin/shops/merge` (backend/server.js:2487-2587)

**로직**:
1. 같은 루트 도메인 감지
2. 자식 쇼핑몰의 모든 `reports`를 부모로 이동
3. 자식 쇼핑몰의 모든 `ratings`를 부모로 이동
4. 자식 쇼핑몰에 `parent_shop_id` 설정

### 18.3 가짜 리뷰 탐지 알고리즘

**가중치**:
- 텍스트 패턴: 40%
- 시간적 패턴: 30%
- 행동 패턴: 30%

**임계값**: 0.7 이상이면 가짜 리뷰로 판정

---

## 19. 파일 업로드 시스템

### 19.1 업로드 프로세스

1. **Multer 설정**:
   - 저장 위치: `backend/uploads/`
   - 파일명 형식: `evidenceFiles-{timestamp}-{random}.{ext}`
   - 크기 제한: 10MB
   - 허용 타입: PNG, JPG만

2. **파일 저장**:
   - 물리적 저장: `backend/uploads/` 디렉토리
   - DB 저장: `reports.evidence_files` (JSON 배열, 파일 경로)

3. **파일 서빙**:
   - 정적 파일 서빙: `app.use('/uploads', express.static(...))`
   - URL: `http://localhost:3001/uploads/{filename}`

---

## 20. 환경 변수 참조

### 20.1 프론트엔드 환경 변수

**파일**: `.env` (프로젝트 루트)

```bash
VITE_OPENROUTER_API_KEY=sk-or-v1-xxxxx
VITE_API_URL=http://localhost:3001/api
```

### 20.2 백엔드 환경 변수

**파일**: `backend/.env`

```bash
# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

# SMS
SOLAPI_KEY=xxx
SOLAPI_SECRET=xxx
SOLAPI_FROM_NUMBER=01012345678

# Email
GMAIL_USER=xxx@gmail.com
GMAIL_APP_PASSWORD=xxx

# Server
PORT=3001
FRONTEND_URL=http://localhost:5173
```

---

## 21. 개발 가이드

### 21.1 프로젝트 시작

```bash
# 1. 저장소 클론
git clone https://github.com/yeogimolkka/CapstoneProject.git
cd CapstoneProject

# 2. 프론트엔드 의존성 설치
cd my-react-app
npm install

# 3. 백엔드 의존성 설치
cd backend
npm install

# 4. 환경 변수 설정
cp env.example .env
# .env 파일 수정

# 5. 프론트엔드 실행
cd ..
npm run dev

# 6. 백엔드 실행 (새 터미널)
cd backend
npm run dev
```

### 21.2 빌드

```bash
# 프론트엔드 빌드
cd my-react-app
npm run build

# 빌드 결과: dist/ 디렉토리
```

### 21.3 코드 스타일

- **TypeScript**: Strict 모드 활성화
- **ESLint**: (설정 파일 확인 필요)
- **Prettier**: (설정 파일 확인 필요)

---

## 22. 트러블슈팅

### 22.1 일반적인 문제

**문제**: CORS 에러
- **해결**: 백엔드 CORS 설정 확인 (`server.js` 라인 81-86)

**문제**: JWT 토큰 만료
- **해결**: 재로그인 또는 토큰 갱신 로직 추가

**문제**: 파일 업로드 실패
- **해결**: `uploads/` 디렉토리 존재 확인, 파일 크기/타입 확인

**문제**: SMS 발송 실패
- **해결**: SolAPI 환경 변수 확인, 레이트 리밋 확인

---

## 23. 향후 개선 사항

### 23.1 계획된 기능

- [ ] 실시간 알림 시스템 (새 댓글, 좋아요, 관리자 승인)
- [ ] 쇼핑몰 비교 기능
- [ ] 고급 검색 필터 (카테고리, 날짜 범위, 위험도 등)
- [ ] 모바일 앱 (React Native)
- [ ] 커뮤니티 개선 (게시글 검색, 이미지 업로드, 카테고리 분류)
- [ ] Recharts 활용 고급 통계 차트 (관리자 대시보드)

### 23.2 기술 부채

- [ ] 에러 바운더리 추가
- [ ] 단위 테스트 작성
- [ ] E2E 테스트 작성
- [ ] API 문서화 (Swagger/OpenAPI)
- [ ] 로깅 시스템 개선

---

## 24. 참고 자료

### 24.1 문서 파일

- `ARCHITECTURE_SIMPLE.md` - 간단한 아키텍처 설명
- `SYSTEM_ARCHITECTURE.md` - 상세 시스템 아키텍처
- `SYSTEM_ARCHITECTURE.mermaid` - Mermaid 다이어그램
- `ERD.mermaid` - 데이터베이스 ERD
- `presentation_script.md` - 발표 스크립트

### 24.2 외부 링크

- [Supabase 문서](https://supabase.com/docs)
- [SolAPI 문서](https://docs.solapi.com/)
- [OpenRouter AI 문서](https://openrouter.ai/docs)
- [React Router 문서](https://reactrouter.com/)

---

**문서 작성일**: 2025년 1월  
**최종 업데이트**: 2025년 1월  
**프로젝트 버전**: 2.0.0  
**문서 버전**: 2.0.0

---

## 25. 최근 업데이트 내역

### 2025년 1월 업데이트
- ✅ **커뮤니티 기능 추가**: 게시판, 댓글, 좋아요 기능 완전 구현
- ✅ **다크/라이트 테마 지원**: Tailwind CSS 기반 테마 시스템 추가
- ✅ **관리자 대시보드 개선**: 통계 차트 및 시각화 추가 (AdminDashboardCharts)
- ✅ **shadcn/ui 도입**: 고품질 UI 컴포넌트 라이브러리 통합
- ✅ **백엔드 라우터 분리**: routes 디렉토리로 라우터 모듈화
- ✅ **데이터베이스 확장**: 커뮤니티 관련 테이블 3개 추가 (community_posts, community_comments, community_post_likes)
- ✅ **보안 강화**: XSS 방지, 레이트 리밋, 파일 업로드 검증
- ✅ **성능 최적화**: AI 분석 배치 처리, 캐싱 시스템 개선

