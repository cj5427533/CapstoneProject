# 보안 가이드

## 환경변수 설정

이 프로젝트는 민감한 정보(API 키, 비밀번호 등)를 환경변수로 관리합니다.

### 설정 방법

#### 1. 백엔드 환경변수 설정

`my-react-app/backend/.env.example` 파일을 복사하여 `.env` 파일을 생성하고 실제 값을 입력하세요:

```bash
cd my-react-app/backend
cp .env.example .env
```

`.env` 파일에 실제 값을 입력하세요:

```env
# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key

# SMS Configuration (SolAPI)
SOL_API_KEY=your_sol_api_key
SOL_API_SECRET=your_sol_api_secret
SOL_API_FROM_NUMBER=your_phone_number
SMS_PROVIDER=solapi

# Server Configuration
PORT=3001
```

#### 2. 프론트엔드 환경변수 설정

`my-react-app/.env.example` 파일을 복사하여 `.env` 파일을 생성하고 실제 값을 입력하세요:

```bash
cd my-react-app
cp .env.example .env
```

`.env` 파일에 실제 값을 입력하세요:

```env
# OpenRouter API Configuration
VITE_OPENROUTER_API_KEY=your_openrouter_api_key

# Backend API URL
VITE_API_URL=http://localhost:3001
```

### 중요 사항

⚠️ **절대로 `.env` 파일을 Git에 커밋하지 마세요!**

- `.env` 파일은 `.gitignore`에 추가되어 있어 Git에서 추적되지 않습니다.
- `.env.example` 파일만 Git에 커밋하세요.
- 실제 키 값은 팀원들과 안전한 방법(비밀번호 관리자, 암호화된 채널 등)으로 공유하세요.

### 환경변수 파일 확인

다음 명령어로 `.env` 파일이 Git에서 무시되는지 확인할 수 있습니다:

```bash
git check-ignore my-react-app/.env my-react-app/backend/.env
```

정상적으로 무시되면 파일 경로가 출력됩니다.

## 보안 체크리스트

- [ ] `.env` 파일이 `.gitignore`에 추가되어 있는지 확인
- [ ] `.env` 파일에 실제 API 키가 포함되어 있지 않은지 확인
- [ ] 코드에 하드코딩된 API 키나 비밀번호가 없는지 확인
- [ ] `.env.example` 파일에는 실제 값이 아닌 예시 값만 포함되어 있는지 확인

