# SMS 발송 설정 가이드

## 현재 상태
- SMS 발송 기능이 개발 모드로 설정되어 있습니다
- 실제 SMS는 발송되지 않고 콘솔에 로그만 출력됩니다

## 실제 SMS 발송을 위한 설정 방법

### 1. SolAPI 사용 (현재 설정)
1. [SolAPI 웹사이트](https://solapi.com/)에서 계정 생성
2. API 키와 시크릿 키 발급
3. 발신번호 등록 및 인증
4. 환경 변수 설정:
   ```bash
   SOLAPI_KEY=your_actual_api_key
   SOLAPI_SECRET=your_actual_secret
   SOLAPI_FROM_NUMBER=your_registered_number
   ```
5. `server.js`에서 `smsProvider: 'solapi'`로 변경

### 2. 다른 SMS 서비스 사용

#### 알리고 (Aligo)
- 웹사이트: https://www.aligo.in/
- 특징: 국내 SMS 서비스, 간편한 연동

#### 비즈고 (BIZGO)
- 웹사이트: https://www.bizgo.io/
- 특징: REST API 방식, 클라우드형 서비스

#### AWS SNS
- AWS 계정 필요
- 글로벌 서비스
- 더 복잡한 설정 필요

### 3. 설정 변경 방법

1. **환경 변수 설정**:
   ```bash
   # .env 파일에 추가하거나
   export SOLAPI_KEY="your_key"
   export SOLAPI_SECRET="your_secret"
   export SOLAPI_FROM_NUMBER="01012345678"
   ```

2. **서버 코드 수정**:
   ```javascript
   // server.js의 SMS_CONFIG에서
   smsProvider: 'solapi' // 'development'에서 변경
   ```

3. **서버 재시작**:
   ```bash
   npm start
   ```

### 4. 테스트 방법

```bash
# PowerShell에서
Invoke-RestMethod -Uri "http://localhost:3001/api/auth/send-sms" -Method POST -ContentType "application/json" -Body '{"phoneNumber": "01012345678"}'
```

### 5. 주의사항

- **발신번호 등록**: 국내에서 SMS 발송 시 발신번호 등록이 필요합니다
- **요금**: SMS 발송 시 건당 요금이 발생합니다
- **법적 준수**: 광고성 문자 발송 시 수신자 동의가 필요합니다
- **발송량 제한**: 일일/월별 발송량 제한이 있을 수 있습니다

### 6. 현재 문제 해결

SolAPI에서 "date 필드 오류"가 발생하는 경우:
1. API 키와 시크릿이 유효한지 확인
2. 발신번호가 등록되어 있는지 확인
3. SolAPI 계정에 충분한 크레딧이 있는지 확인
4. SolAPI 공식 문서의 최신 API 형식 확인

### 7. 대안 방법

SMS 서비스 연동이 어려운 경우:
1. 이메일 인증으로 대체
2. 휴대폰 앱 푸시 알림 사용
3. 카카오톡 알림톡 서비스 사용
