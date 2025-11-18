# 여기몰까 (YeogiMolkka) - 배포 아키텍처 문서

> **프로젝트명**: 여기몰까 (ygmk)  
> **목적**: 안전한 온라인 쇼핑을 위한 쇼핑몰 검증 및 신고 플랫폼  
> **배포 환경**: Google Cloud Platform (GCP), Railway, AWS Lambda  
> **최종 업데이트**: 2025년 1월  
> **버전**: 2.0.0

---

## 📑 목차

1. [배포 아키텍처 개요](#1-배포-아키텍처-개요)
2. [전체 시스템 아키텍처](#2-전체-시스템-아키텍처)
3. [Google Cloud Platform (GCP) 배포](#3-google-cloud-platform-gcp-배포)
4. [Railway 배포](#4-railway-배포)
5. [AWS Lambda 배포](#5-aws-lambda-배포)
6. [네트워크 아키텍처](#6-네트워크-아키텍처)
7. [데이터 흐름](#7-데이터-흐름)
8. [보안 아키텍처](#8-보안-아키텍처)
9. [스케일링 전략](#9-스케일링-전략)
10. [모니터링 및 로깅](#10-모니터링-및-로깅)

---

## 1. 배포 아키텍처 개요

### 1.1 배포 환경

여기몰까 플랫폼은 **멀티 클라우드 아키텍처**를 채택하여 다양한 배포 옵션을 지원합니다:

- **Google Cloud Platform (GCP)**: 메인 프로덕션 환경
- **Railway**: 개발/스테이징 환경
- **AWS Lambda**: 서버리스 배포 옵션

### 1.2 아키텍처 패턴

- **3-Tier Architecture**: Presentation, Application, Data 계층 분리
- **Microservices-ready**: 모듈화된 구조로 확장 가능
- **Cloud-Native**: 클라우드 서비스 활용 (Supabase, 외부 API)

---

## 2. 전체 시스템 아키텍처

### 2.1 시스템 아키텍처 다이어그램 (마이크로서비스 구조)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          클라이언트 레이어 (Client Layer)                     │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │                    React + Vite                                    │    │
│  │                    (Frontend)                                      │    │
│  │                                                                    │    │
│  │  • 쇼핑몰 URL 검색                                                 │    │
│  │  • 피해 사례 제보                                                  │    │
│  │  • 커뮤니티 활동                                                  │    │
│  │  • 관리자 대시보드                                                │    │
│  └────────────────────────────────────────────────────────────────────┘    │
└───────────────────────────────┬─────────────────────────────────────────────┘
                                │
                                │ HTTPS / REST API
                                │ (양방향 통신)
                                │
┌───────────────────────────────┴─────────────────────────────────────────────┐
│                    백엔드 레이어 (Backend Layer)                              │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │                    Node.js + Express                               │    │
│  │                    (Main Backend Service)                          │    │
│  │                                                                    │    │
│  │  • API 라우팅                                                      │    │
│  │  • 인증/인가 처리                                                  │    │
│  │  • 비즈니스 로직 조율                                             │    │
│  │  • 요청/응답 처리                                                 │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                              │                                               │
│                              │ 데이터 조회/저장                               │
│                              │ (양방향 통신)                                  │
│                              │                                               │
│  ┌───────────────────────────┴────────────────────────────────────────┐    │
│  │                    Supabase                                         │    │
│  │                    (PostgreSQL Database)                            │    │
│  │                                                                    │    │
│  │  • users                                                           │    │
│  │  • shops                                                           │    │
│  │  • shop_reports                                                    │    │
│  │  • shop_ratings                                                    │    │
│  │  • community_posts                                                 │    │
│  │  • ai_analysis_cache_entries                                       │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │                    Redis Cache                                     │    │
│  │                    (Caching Layer)                                 │    │
│  │                                                                    │    │
│  │  • 웹사이트 타이틀 캐시                                            │    │
│  │  • 세션 데이터                                                     │    │
│  │  • API 응답 캐시                                                  │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│                              │                                               │
│                              │ 피싱 탐지 요청                                 │
│                              │ (단방향)                                      │
│                              │                                               │
│  ┌───────────────────────────┴────────────────────────────────────────┐    │
│  │                    피싱 탐지 서비스                                  │    │
│  │                    (Phishing Detection Service)                     │    │
│  │                    Node.js + Express                                │    │
│  │                                                                    │    │
│  │  • URL 분석                                                        │    │
│  │  • 도메인 검증                                                     │    │
│  │  • 콘텐츠 분석                                                     │    │
│  │  • 피싱 점수 계산                                                  │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                              │                                               │
│                              │ 모델 추론 요청                                 │
│                              │ (단방향)                                      │
│                              │                                               │
│  ┌───────────────────────────┴────────────────────────────────────────┐    │
│  │                    피싱 사이트 학습 모델                             │    │
│  │                    (Phishing ML Model)                              │    │
│  │                    Python + TensorFlow/PyTorch                      │    │
│  │                                                                    │    │
│  │  • 딥러닝 모델 (CNN/LSTM)                                          │    │
│  │  • 피싱 패턴 학습                                                  │    │
│  │  • 실시간 예측                                                     │    │
│  │  • 모델 버전 관리                                                  │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│                              │                                               │
│                              │ AI 분석 요청                                   │
│                              │ (단방향)                                      │
│                              │                                               │
│  ┌───────────────────────────┴────────────────────────────────────────┐    │
│  │                    AI 분석 서비스                                    │    │
│  │                    (AI Analysis Service)                            │    │
│  │                    Node.js + Express                                │    │
│  │                                                                    │    │
│  │  • 가짜 리뷰 탐지                                                  │    │
│  │  • 쇼핑몰 위험도 분석                                              │    │
│  │  • 리뷰 패턴 분석                                                  │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                              │                                               │
│                              │ AI API 호출                                   │
│                              │ (단방향)                                      │
│                              │                                               │
│  ┌───────────────────────────┴────────────────────────────────────────┐    │
│  │                    OpenRouter AI                                    │    │
│  │                    (Claude 3.5 Sonnet)                              │    │
│  │                                                                    │    │
│  │  • 자연어 처리                                                     │    │
│  │  • 리뷰 텍스트 분석                                                │    │
│  │  • 위험도 평가                                                     │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │                    파일 저장소 서비스                                │    │
│  │                    (File Storage Service)                           │    │
│  │                    Cloud Storage / S3                               │    │
│  │                                                                    │    │
│  │  • 증빙 파일 저장                                                  │    │
│  │  • 이미지 관리                                                     │    │
│  │  • 파일 URL 생성                                                   │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │                    외부 서비스 통합                                 │    │
│  │                    (External Services)                              │    │
│  │                                                                    │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │    │
│  │  │   SolAPI     │  │  Gmail SMTP  │  │   기타 API   │           │    │
│  │  │  (SMS 인증)  │  │ (이메일 발송) │  │              │           │    │
│  │  └──────────────┘  └──────────────┘  └──────────────┘           │    │
│  └────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 컴포넌트 상세 설명

#### 2.2.1 클라이언트 레이어
- **React + Vite**: SPA 프론트엔드 애플리케이션
- **Tailwind CSS**: 반응형 디자인
- **상태 관리**: React Context (AuthContext)

#### 2.2.2 메인 백엔드 서비스
- **Node.js + Express**: 메인 API 서버
- **라우터**: 7개 라우터 모듈 (auth, shops, reports, community, ai, admin, phishing)
- **컨트롤러**: 6개 컨트롤러 (비즈니스 로직 조율)
- **서비스**: 7개 서비스 (핵심 로직)

#### 2.2.3 데이터베이스
- **Supabase (PostgreSQL)**: 메인 데이터베이스
  - 사용자 정보, 쇼핑몰 정보, 신고 내역, 평점, 커뮤니티 데이터
  - 15개 테이블 관리

#### 2.2.4 캐싱 레이어
- **Redis**: 고성능 인메모리 캐시
  - 웹사이트 타이틀 캐시 (24시간)
  - 세션 데이터
  - API 응답 캐시

#### 2.2.5 피싱 탐지 서비스 (전용 마이크로서비스)
- **역할**: 피싱 사이트 탐지 전담 서비스
- **기능**:
  - URL 분석 및 검증
  - 도메인 연령 확인
  - SSL 인증서 검증
  - 리다이렉트 체인 분석
  - 콘텐츠 분석
  - 피싱 점수 계산

#### 2.2.6 피싱 사이트 학습 모델 (자체 개발)
- **기술 스택**: Python + TensorFlow/PyTorch
- **모델 타입**: 딥러닝 모델 (CNN/LSTM)
- **기능**:
  - 피싱 사이트 패턴 학습
  - 실시간 피싱 예측
  - 모델 버전 관리
  - 지속적 학습 (Continuous Learning)
- **배포**: 
  - GCP AI Platform / Vertex AI
  - 또는 별도 Python 서버 (Flask/FastAPI)
- **데이터 소스**:
  - 피싱 사이트 데이터셋
  - 사용자 신고 데이터
  - 외부 피싱 데이터베이스

#### 2.2.7 AI 분석 서비스
- **역할**: 가짜 리뷰 탐지 및 쇼핑몰 위험도 분석
- **기능**:
  - 리뷰 텍스트 분석
  - 패턴 기반 가짜 리뷰 탐지
  - 쇼핑몰 신뢰도 평가

#### 2.2.8 외부 AI 서비스
- **OpenRouter AI (Claude 3.5 Sonnet)**: 자연어 처리 및 고급 분석

#### 2.2.9 파일 저장소
- **Cloud Storage / S3**: 증빙 파일 및 이미지 저장

#### 2.2.10 외부 서비스
- **SolAPI**: SMS 인증번호 발송
- **Gmail SMTP**: 이메일 발송 (비밀번호 재설정 등)

### 2.3 서비스 간 통신

| 통신 경로 | 프로토콜 | 방향 | 설명 |
|----------|---------|------|------|
| React ↔ Main Backend | HTTPS/REST | 양방향 | API 요청/응답 |
| Main Backend ↔ Supabase | HTTPS/PostgreSQL | 양방향 | 데이터 조회/저장 |
| Main Backend ↔ Redis | TCP/Redis Protocol | 양방향 | 캐시 읽기/쓰기 |
| Main Backend → Phishing Service | HTTPS/REST | 단방향 | 피싱 탐지 요청 |
| Phishing Service → ML Model | HTTP/gRPC | 단방향 | 모델 추론 요청 |
| Main Backend → AI Service | HTTPS/REST | 단방향 | AI 분석 요청 |
| AI Service → OpenRouter | HTTPS/REST | 단방향 | AI API 호출 |
| Main Backend → File Storage | HTTPS/S3 API | 양방향 | 파일 업로드/다운로드 |
| Main Backend → External APIs | HTTPS/SMTP | 단방향 | SMS/이메일 발송 |

### 2.4 GCP 배포 환경 다이어그램

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          사용자 (Client)                                      │
│                    PC / Mobile / Tablet                                      │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │                    React + Vite (Frontend)                         │    │
│  │  • 쇼핑몰 URL 검색                                                  │    │
│  │  • 피해 사례 제보                                                   │    │
│  │  • 커뮤니티 활동                                                   │    │
│  │  • 관리자 대시보드                                                 │    │
│  └────────────────────────────────────────────────────────────────────┘    │
└───────────────────────────────┬─────────────────────────────────────────────┘
                                │
                                │ HTTPS / HTTP
                                │
┌───────────────────────────────┴─────────────────────────────────────────────┐
│                    Google Cloud Platform (GCP)                               │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │                    Cloud Load Balancer                              │    │
│  │              (Global Load Balancing)                                │    │
│  └───────────────────────────┬────────────────────────────────────────┘    │
│                              │                                               │
│  ┌───────────────────────────┴────────────────────────────────────────┐    │
│  │                    Cloud CDN (Content Delivery Network)             │    │
│  │  • 정적 파일 캐싱 (React 빌드 결과물)                                │    │
│  │  • 전 세계 엣지 서버 분산                                            │    │
│  └───────────────────────────┬────────────────────────────────────────┘    │
│                              │                                               │
│  ┌───────────────────────────┴────────────────────────────────────────┐    │
│  │                    Cloud Run (Container)                            │    │
│  │  ┌──────────────────────────────────────────────────────────────┐  │    │
│  │  │              Frontend Container (Nginx)                      │  │    │
│  │  │  • React 빌드 결과물 서빙                                     │  │    │
│  │  │  • SPA 라우팅 처리                                            │  │    │
│  │  │  • 정적 파일 최적화                                           │  │    │
│  │  └──────────────────────────────────────────────────────────────┘  │    │
│  │                                                                     │    │
│  │  ┌──────────────────────────────────────────────────────────────┐  │    │
│  │  │              Backend Container (Node.js)                     │  │    │
│  │  │  • Express.js 서버                                           │  │    │
│  │  │  • API 엔드포인트 처리                                       │  │    │
│  │  │  • 파일 업로드 처리                                          │  │    │
│  │  │  • 비즈니스 로직 실행                                        │  │    │
│  │  └──────────────────────────────────────────────────────────────┘  │    │
│  └───────────────────────────┬────────────────────────────────────────┘    │
│                              │                                               │
│  ┌───────────────────────────┴────────────────────────────────────────┐    │
│  │                    Cloud Storage (GCS)                              │    │
│  │  • 업로드된 증빙 파일 저장                                          │    │
│  │  • 이미지 파일 관리                                                 │    │
│  │  • 버킷: ygmk-uploads                                              │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │                    Cloud SQL (PostgreSQL) - 옵션                   │    │
│  │  • 대안 데이터베이스 옵션                                           │    │
│  │  • Supabase 대신 사용 가능                                         │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │                    Cloud Functions (서버리스)                       │    │
│  │  • 백그라운드 작업 처리                                             │    │
│  │  • 스케줄링된 작업                                                  │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │                    Cloud Logging & Monitoring                      │    │
│  │  • 애플리케이션 로그 수집                                           │    │
│  │  • 성능 모니터링                                                    │    │
│  │  • 에러 추적                                                        │    │
│  └────────────────────────────────────────────────────────────────────┘    │
└───────────────────────────────┬─────────────────────────────────────────────┘
                                │
                                │ HTTPS / PostgreSQL Protocol
                                │
┌───────────────────────────────┴─────────────────────────────────────────────┐
│                    외부 서비스 (External Services)                           │
│                                                                              │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐         │
│  │   Supabase       │  │   OpenRouter     │  │     SolAPI       │         │
│  │   (PostgreSQL)   │  │   AI (Claude)    │  │   (SMS 인증)     │         │
│  │                  │  │                  │  │                  │         │
│  │ • users          │  │ • 가짜 리뷰 탐지  │  │ • SMS 발송       │         │
│  │ • shops          │  │ • 위험도 분석    │  │ • 인증번호 전송   │         │
│  │ • shop_reports   │  │                  │  │                  │         │
│  │ • shop_ratings   │  │                  │  │                  │         │
│  │ • community_*    │  │                  │  │                  │         │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘         │
│                                                                              │
│  ┌──────────────────┐                                                       │
│  │   Gmail SMTP     │                                                       │
│  │   (이메일 발송)   │                                                       │
│  │                  │                                                       │
│  │ • 비밀번호 재설정 │                                                       │
│  │ • 알림 이메일     │                                                       │
│  └──────────────────┘                                                       │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 컴포넌트 설명

#### 2.2.1 클라이언트 레이어
- **React + Vite**: SPA 프론트엔드 애플리케이션
- **Tailwind CSS**: 반응형 디자인
- **정적 파일**: HTML, CSS, JavaScript 번들

#### 2.2.2 GCP 인프라
- **Cloud Load Balancer**: 트래픽 분산 및 SSL 종료
- **Cloud CDN**: 전 세계 정적 파일 캐싱
- **Cloud Run**: 컨테이너 기반 서버리스 실행 환경
- **Cloud Storage**: 파일 저장소
- **Cloud SQL**: 관리형 PostgreSQL (옵션)
- **Cloud Functions**: 서버리스 함수 실행
- **Cloud Logging & Monitoring**: 로깅 및 모니터링

#### 2.2.3 외부 서비스
- **Supabase**: 클라우드 PostgreSQL 데이터베이스
- **OpenRouter AI**: AI 분석 서비스
- **SolAPI**: SMS 발송 서비스
- **Gmail SMTP**: 이메일 발송 서비스

---

## 3. Google Cloud Platform (GCP) 배포

### 3.1 GCP 서비스 구성

#### 3.1.1 Cloud Run (컨테이너 배포)

**프론트엔드 컨테이너**:
```dockerfile
# Dockerfile (Frontend)
FROM nginx:alpine
COPY dist/ /usr/share/nginx/html/
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**백엔드 컨테이너**:
```dockerfile
# Dockerfile (Backend)
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3001
ENV NODE_ENV=production
CMD ["npm", "start"]
```

**배포 명령어**:
```bash
# 프론트엔드 빌드
cd my-react-app
npm run build

# 프론트엔드 배포
gcloud run deploy ygmk-frontend \
  --source . \
  --platform managed \
  --region asia-northeast3 \
  --allow-unauthenticated

# 백엔드 배포
cd backend
gcloud run deploy ygmk-backend \
  --source . \
  --platform managed \
  --region asia-northeast3 \
  --allow-unauthenticated \
  --set-env-vars="SUPABASE_URL=xxx,SUPABASE_KEY=xxx"
```

#### 3.1.2 Cloud Storage (파일 저장)

**버킷 생성 및 설정**:
```bash
# 버킷 생성
gsutil mb -p ygmk-project -c STANDARD -l asia-northeast3 gs://ygmk-uploads

# CORS 설정
gsutil cors set cors.json gs://ygmk-uploads

# 공개 읽기 권한 설정
gsutil iam ch allUsers:objectViewer gs://ygmk-uploads
```

**cors.json**:
```json
[
  {
    "origin": ["https://ygmk.example.com"],
    "method": ["GET", "POST", "PUT"],
    "responseHeader": ["Content-Type"],
    "maxAgeSeconds": 3600
  }
]
```

#### 3.1.3 Cloud Load Balancer

**설정**:
- **타입**: HTTP(S) Load Balancing
- **백엔드**: Cloud Run 서비스
- **SSL 인증서**: Google 관리형 인증서
- **도메인**: ygmk.example.com

**구성**:
```yaml
# load-balancer.yaml
backendServices:
  - name: ygmk-backend
    cloudRunService: ygmk-backend
    port: 443
    protocol: HTTPS

urlMaps:
  - name: ygmk-url-map
    defaultService: ygmk-backend
    hostRules:
      - hosts: ["ygmk.example.com"]
        pathMatcher: ygmk-paths

targetHttpsProxies:
  - name: ygmk-https-proxy
    urlMap: ygmk-url-map
    sslCertificates: [ygmk-ssl-cert]
```

#### 3.1.4 Cloud CDN

**설정**:
- **백엔드**: Cloud Load Balancer
- **캐시 정책**: 정적 파일 1년, API 응답 캐싱 안 함
- **캐시 키**: URL, 쿼리 파라미터 제외

### 3.2 환경 변수 관리

**Secret Manager 사용**:
```bash
# 시크릿 생성
gcloud secrets create supabase-url --data-file=- <<< "https://xxx.supabase.co"
gcloud secrets create supabase-key --data-file=- <<< "your-secret-key"
gcloud secrets create jwt-secret --data-file=- <<< "your-jwt-secret"

# Cloud Run에 시크릿 연결
gcloud run services update ygmk-backend \
  --update-secrets=SUPABASE_URL=supabase-url:latest,SUPABASE_KEY=supabase-key:latest
```

### 3.3 네트워크 구성

**VPC 네트워크**:
- **네트워크**: ygmk-vpc
- **서브넷**: asia-northeast3 (Seoul)
- **방화벽 규칙**: Cloud Run은 자동 관리

**Private Google Access**: Cloud SQL 접근 시 필요

---

## 4. Railway 배포

### 4.1 Railway 구성

**railway.json**:
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "services": [
    {
      "name": "frontend",
      "rootDirectory": "my-react-app",
      "buildCommand": "npm ci && npm run build",
      "startCommand": "npm run start",
      "envVars": {
        "PORT": "5173"
      }
    },
    {
      "name": "backend",
      "rootDirectory": "my-react-app/backend",
      "buildCommand": "npm ci",
      "startCommand": "npm start"
    }
  ]
}
```

### 4.2 배포 프로세스

1. **GitHub 연동**: Railway가 GitHub 저장소와 연결
2. **자동 빌드**: Push 시 자동 빌드 및 배포
3. **환경 변수**: Railway 대시보드에서 설정
4. **도메인**: Railway 제공 도메인 또는 커스텀 도메인

---

## 5. AWS Lambda 배포

### 5.1 Serverless Framework 구성

**serverless.yml**:
```yaml
service: shopping-mall-reports-api

provider:
  name: aws
  runtime: nodejs18.x
  region: ap-northeast-2
  stage: ${opt:stage, 'dev'}
  environment:
    SUPABASE_URL: ${env:SUPABASE_URL}
    SUPABASE_KEY: ${env:SUPABASE_KEY}
    NODE_ENV: production
  iamRoleStatements:
    - Effect: Allow
      Action:
        - s3:PutObject
        - s3:GetObject
      Resource: "arn:aws:s3:::ygmk-uploads/*"

functions:
  api:
    handler: serverless-handler.handler
    events:
      - http:
          path: /{proxy+}
          method: ANY
          cors: true
      - http:
          path: /
          method: ANY
          cors: true

plugins:
  - serverless-offline
```

### 5.2 배포 명령어

```bash
# 개발 환경 배포
npm run deploy:dev

# 프로덕션 환경 배포
npm run deploy:prod
```

---

## 6. 네트워크 아키텍처

### 6.1 요청 흐름 (GCP)

```
[사용자]
  ↓ HTTPS
[Cloud Load Balancer]
  ↓ SSL 종료
[Cloud CDN]
  ↓ 캐시 확인
  ├─ 캐시 Hit → [사용자] (응답)
  └─ 캐시 Miss ↓
[Cloud Run - Frontend]
  ↓ API 요청 (HTTPS)
[Cloud Run - Backend]
  ↓
  ├─ 데이터 조회 → [Supabase] (HTTPS/PostgreSQL)
  ├─ 파일 업로드 → [Cloud Storage] (HTTPS)
  ├─ AI 분석 → [OpenRouter] (HTTPS)
  ├─ SMS 발송 → [SolAPI] (HTTPS)
  └─ 이메일 발송 → [Gmail SMTP] (SMTP)
  ↓
[사용자] (JSON 응답)
```

### 6.2 포트 및 프로토콜

| 서비스 | 포트 | 프로토콜 | 용도 |
|--------|------|----------|------|
| Frontend | 80/443 | HTTP/HTTPS | 웹 애플리케이션 |
| Backend | 3001 | HTTP | API 서버 |
| Supabase | 5432 | PostgreSQL | 데이터베이스 |
| Cloud Storage | 443 | HTTPS | 파일 저장소 |

---

## 7. 데이터 흐름

### 7.1 쇼핑몰 검색 플로우

```
[사용자] 
  ↓ URL 입력
[React Frontend]
  ↓ POST /api/shops/search
[Cloud Load Balancer]
  ↓
[Cloud Run - Backend]
  ↓ normalizeUrl()
  ↓ Supabase Client
[Supabase PostgreSQL]
  ↓ 쇼핑몰 정보 조회
[Cloud Run - Backend]
  ↓ JSON 응답
[React Frontend]
  ↓ 화면 업데이트
[사용자]
```

### 7.2 파일 업로드 플로우

```
[사용자]
  ↓ 파일 선택
[React Frontend]
  ↓ FormData 생성
  ↓ POST /api/reports (multipart/form-data)
[Cloud Run - Backend]
  ↓ Multer 미들웨어
  ↓ 파일 검증 (타입, 크기)
  ↓ Cloud Storage SDK
[Cloud Storage]
  ↓ 파일 저장
  ↓ 공개 URL 반환
[Cloud Run - Backend]
  ↓ DB에 파일 경로 저장
  ↓ JSON 응답
[React Frontend]
  ↓ 성공 메시지 표시
[사용자]
```

### 7.3 AI 분석 플로우

```
[사용자]
  ↓ "가짜 리뷰 분석" 클릭
[React Frontend]
  ↓ POST /api/ai/detect-fake-reviews
[Cloud Run - Backend]
  ↓ 리뷰 데이터 조회
  ↓ Supabase Client
[Supabase PostgreSQL]
  ↓ 리뷰 목록 반환
[Cloud Run - Backend]
  ↓ OpenRouter API 호출
  ↓ HTTPS
[OpenRouter AI]
  ↓ Claude 3.5 Sonnet 분석
  ↓ 결과 반환
[Cloud Run - Backend]
  ↓ 결과 처리 및 캐싱
  ↓ JSON 응답
[React Frontend]
  ↓ 결과 표시
[사용자]
```

---

## 8. 보안 아키텍처

### 8.1 네트워크 보안

**GCP**:
- **Cloud Armor**: DDoS 공격 방어
- **VPC Firewall**: 네트워크 레벨 방화벽
- **Private Google Access**: 내부 서비스 간 통신

**SSL/TLS**:
- **Cloud Load Balancer**: SSL 종료
- **Google 관리형 인증서**: 자동 갱신
- **HTTPS 강제**: HTTP → HTTPS 리다이렉트

### 8.2 인증 및 인가

**JWT 토큰**:
- **알고리즘**: HS256
- **만료 시간**: 7일
- **저장**: LocalStorage (클라이언트)

**API 보안**:
- **CORS**: 허용된 오리진만 접근
- **Rate Limiting**: API 호출 제한
- **Input Validation**: XSS 방지

### 8.3 데이터 보안

**환경 변수**:
- **Secret Manager**: 민감 정보 암호화 저장
- **환경 변수**: 런타임에만 접근 가능

**데이터베이스**:
- **Supabase**: SSL 연결 강제
- **Row Level Security**: 데이터 접근 제어

**파일 저장소**:
- **Cloud Storage**: 버킷 정책으로 접근 제어
- **서명된 URL**: 임시 접근 권한

---

## 9. 스케일링 전략

### 9.1 수평 스케일링

**Cloud Run**:
- **자동 스케일링**: 트래픽에 따라 인스턴스 자동 증가/감소
- **최소 인스턴스**: 0 (비용 절감)
- **최대 인스턴스**: 100
- **동시 요청**: 인스턴스당 80개

**로드 밸런싱**:
- **Global Load Balancing**: 전 세계 트래픽 분산
- **Health Checks**: 비정상 인스턴스 자동 제거

### 9.2 수직 스케일링

**Cloud Run 리소스**:
- **CPU**: 1-4 vCPU
- **메모리**: 128MB - 8GB
- **요청에 따라 자동 조정**

### 9.3 캐싱 전략

**Cloud CDN**:
- **정적 파일**: 1년 캐시
- **API 응답**: 캐싱 안 함 (동적 데이터)

**애플리케이션 캐싱**:
- **메모리 캐시**: 웹사이트 타이틀 (24시간)
- **DB 캐시**: AI 분석 결과 (ai_analysis_cache_entries)

---

## 10. 모니터링 및 로깅

### 10.1 Cloud Logging

**로그 수집**:
- **애플리케이션 로그**: console.log, console.error
- **액세스 로그**: HTTP 요청/응답
- **에러 로그**: 예외 및 에러 추적

**로그 레벨**:
- **INFO**: 일반 정보
- **WARN**: 경고
- **ERROR**: 에러
- **DEBUG**: 디버깅 (개발 환경)

### 10.2 Cloud Monitoring

**메트릭 수집**:
- **요청 수**: API 호출 횟수
- **응답 시간**: 평균/최대 응답 시간
- **에러율**: 4xx, 5xx 에러 비율
- **인스턴스 수**: 실행 중인 인스턴스 수

**알림 설정**:
- **에러율 임계값**: 5% 초과 시 알림
- **응답 시간**: 5초 초과 시 알림
- **인스턴스 수**: 최대 인스턴스 도달 시 알림

### 10.3 에러 추적

**에러 로깅**:
```javascript
// 에러 발생 시
console.error('Error:', {
  message: error.message,
  stack: error.stack,
  timestamp: new Date().toISOString(),
  requestId: req.id
});
```

**에러 대시보드**:
- **Cloud Console**: 에러 로그 조회
- **에러 그룹화**: 유사한 에러 자동 그룹화
- **에러 트렌드**: 시간별 에러 발생 추이

---

## 11. 비용 최적화

### 11.1 GCP 비용 관리

**Cloud Run**:
- **요청 기반 과금**: 실제 사용량만 과금
- **최소 인스턴스 0**: 트래픽 없을 때 비용 없음
- **Cold Start**: 첫 요청 시 약간의 지연 (비용 절감)

**Cloud Storage**:
- **스토리지 클래스**: Standard (자주 접근), Nearline (가끔 접근)
- **수명 주기 정책**: 오래된 파일 자동 삭제

**Cloud CDN**:
- **캐시 Hit**: 비용 절감
- **엣지 캐싱**: 전송 비용 절감

### 11.2 예상 비용 (월간)

**소규모 트래픽** (일 1,000 요청):
- Cloud Run: $5-10
- Cloud Storage: $1-2
- Cloud CDN: $1-2
- **총계**: 약 $10-15/월

**중규모 트래픽** (일 10,000 요청):
- Cloud Run: $20-30
- Cloud Storage: $5-10
- Cloud CDN: $5-10
- **총계**: 약 $30-50/월

---

## 12. 배포 체크리스트

### 12.1 배포 전 확인사항

- [ ] 환경 변수 설정 완료
- [ ] Secret Manager에 민감 정보 저장
- [ ] Dockerfile 테스트 완료
- [ ] 로컬 빌드 성공 확인
- [ ] 데이터베이스 마이그레이션 완료
- [ ] SSL 인증서 설정 완료
- [ ] 도메인 DNS 설정 완료
- [ ] CORS 설정 확인
- [ ] 파일 업로드 테스트 완료
- [ ] 모니터링 설정 완료

### 12.2 배포 후 확인사항

- [ ] 헬스 체크 통과
- [ ] API 엔드포인트 정상 동작
- [ ] 파일 업로드 정상 동작
- [ ] 데이터베이스 연결 확인
- [ ] 외부 API 연결 확인
- [ ] 로그 수집 확인
- [ ] 모니터링 메트릭 확인
- [ ] 성능 테스트 완료

---

## 13. 재해 복구 (Disaster Recovery)

### 13.1 백업 전략

**데이터베이스**:
- **Supabase**: 자동 일일 백업
- **백업 보관**: 7일간 보관

**파일 저장소**:
- **Cloud Storage**: 자동 복제 (Multi-Region)
- **버전 관리**: 파일 버전 관리 활성화

### 13.2 복구 절차

1. **데이터베이스 복구**: Supabase 대시보드에서 백업 복원
2. **애플리케이션 재배포**: Cloud Run에서 새 버전 배포
3. **DNS 전환**: 필요 시 백업 리전으로 전환
4. **검증**: 모든 기능 정상 동작 확인

---

## 14. 참고 자료

### 14.1 GCP 문서
- [Cloud Run 문서](https://cloud.google.com/run/docs)
- [Cloud Storage 문서](https://cloud.google.com/storage/docs)
- [Cloud Load Balancing 문서](https://cloud.google.com/load-balancing/docs)
- [Secret Manager 문서](https://cloud.google.com/secret-manager/docs)

### 14.2 배포 도구
- [Docker 문서](https://docs.docker.com/)
- [Serverless Framework 문서](https://www.serverless.com/framework/docs)
- [Railway 문서](https://docs.railway.app/)

---

**문서 작성일**: 2025년 1월  
**최종 업데이트**: 2025년 1월  
**프로젝트 버전**: 2.0.0  
**문서 버전**: 1.0.0

