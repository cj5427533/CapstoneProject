# styles.css 분석 보고서

## 전체 통계
- **총 라인 수**: 5,314줄
- **CSS 클래스 수**: 약 660개
- **CSS 변수**: 10개 (--primary-color, --background-color 등)

## 섹션별 분류

### 1. CSS 변수 (1-17줄)
- 색상: primary, secondary, success, warning, danger
- 배경: background-color, card-background
- 텍스트: text-primary, text-secondary
- 그림자: shadow, shadow-lg

### 2. 기본 리셋 및 전역 스타일 (19-55줄)
- `*`, `html`, `body`, `#root` 리셋
- 폰트 설정
- 링크 스타일

### 3. 레이아웃 관련 (~15%)
- `.app`, `.container-custom`, `.main-content`, `.main-section`
- `.home-content`, `.page-sky-background`
- 그리드 레이아웃: `.stats-grid`, `.result-summary`
- 반응형 미디어 쿼리

### 4. 컴포넌트 스타일 (~40%)
- **버튼**: `.button`, `.search-button`, `.report-button`, `.auth-button`, `.submit-btn`, `.verify-btn`
- **카드**: `.card`, `.feature-card`, `.summary-card`, `.report-card`, `.realtime-box`
- **폼**: `.form-group`, `.form-input`, `.form-textarea`, `.form-section`
- **모달**: `.modal-overlay`, `.modal-content`, `.modal-header`
- **배지**: `.category`, `.badge`, `.risk-indicator`

### 5. 페이지별 스타일 (~30%)
- **HomePage**: `.home-page`, `.home-content`, `.realtime-section`, `.realtime-item`
- **SearchResultPage**: `.search-result-page`, `.result-header`, `.shop-info`
- **ReportFormPage**: `.report-page`, `.report-form`, `.form-section`
- **AdminPage**: `.admin-page`, `.admin-header`, `.admin-section`
- **Auth Pages**: `.signup-page`, `.login-page`, `.auth-container`

### 6. 타이포그래피 (~5%)
- `.hero-title`, `.hero-subtitle`, `.section-title`, `.realtime-title`
- `h1`, `h2`, `h3` 스타일

### 7. 유틸리티 클래스 (~10%)
- `.loading`, `.error`, `.empty-state`, `.no-reports`
- `.clickable`, `.disabled`
- 애니메이션: `@keyframes spin`, `@keyframes slideDown`

## 중복/유사 패턴

### 버튼 스타일 중복
- `.search-button`, `.report-button`, `.auth-button`, `.submit-btn` 모두 유사한 스타일
- → Tailwind `Button` 컴포넌트로 통일 가능

### 카드 스타일 중복
- `.feature-card`, `.summary-card`, `.report-card`, `.realtime-box` 모두 유사
- → Tailwind `Card` 컴포넌트로 통일 가능

### 폼 입력 중복
- `.form-input`, `.search-input` 유사
- → shadcn/ui `Input` 컴포넌트로 통일 가능

### 색상 값 하드코딩
- `#2563eb`, `#ef4444`, `#10b981` 등이 여러 곳에 하드코딩
- → Tailwind 토큰으로 통일 필요

## Tailwind 전환 우선순위

### 높음 (즉시 전환 가능)
1. 레이아웃 클래스 (`.container-custom`, `.main-section`)
2. 버튼 클래스 (모든 `.button-*`)
3. 카드 클래스 (모든 `.card-*`, `.box-*`)
4. 폼 입력 (`.form-input`, `.search-input`)

### 중간 (점진적 전환)
1. 페이지별 스타일 (`.home-page`, `.search-result-page`)
2. 반응형 미디어 쿼리
3. 애니메이션

### 낮음 (유지 필요)
1. 복잡한 그라디언트 배경
2. 특수 애니메이션 (rainbow-border 등)
3. 레거시 호환성 유지가 필요한 부분

