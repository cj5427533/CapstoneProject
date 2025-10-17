const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');
require('dotenv').config();

// 라우터 import
const aiAnalysisRoutes = require('./routes/ai-analysis');
const communityRoutes = require('./routes/community');

// 입력 검증을 위한 유틸리티 함수들
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  return input
    .replace(/[<>]/g, '') // HTML 태그 제거
    .replace(/javascript:/gi, '') // JavaScript 프로토콜 제거
    .replace(/on\w+=/gi, '') // 이벤트 핸들러 제거
    .trim();
};

const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePhoneNumber = (phone) => {
  const phoneRegex = /^01\d{8,9}$/;
  return phoneRegex.test(phone.replace(/[-\s]/g, ''));
};

const validateUrl = (url) => {
  try {
    new URL(url.startsWith('http') ? url : 'https://' + url);
    return true;
  } catch {
    return false;
  }
};

// JWT 관련 함수들
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user.id, 
      username: user.username, 
      email: user.email 
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

const verifyToken = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: '액세스 토큰이 필요합니다.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: '유효하지 않은 토큰입니다.' });
  }
};

const app = express();
const PORT = process.env.PORT || 3001;

// 미들웨어
app.use(cors({
  origin: true, // 모든 오리진 허용
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.SUPABASE_URL || 'https://tqdvolgachfszomwhlfe.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

console.log('=== Supabase 연결 확인 ===');
console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key:', supabaseKey ? '설정됨' : '미설정');
console.log('====================');

// SMS 발송을 위한 설정 (SolAPI 사용)
const SMS_CONFIG = {
  solApiKey: process.env.SOL_API_KEY,
  solApiSecret: process.env.SOL_API_SECRET,
  solApiFromNumber: process.env.SOL_API_FROM_NUMBER,
  smsProvider: process.env.SMS_PROVIDER || 'solapi'
};

// Gmail SMTP 설정
const emailTransporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD
  }
});

// 이메일 전송 확인
if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
  console.log('=== Gmail SMTP 설정 ===');
  console.log('Gmail 계정:', process.env.GMAIL_USER);
  console.log('앱 비밀번호:', process.env.GMAIL_APP_PASSWORD ? '설정됨 ✓' : '미설정');
  console.log('====================');
  
  // Gmail 연결 테스트
  emailTransporter.verify(function(error, success) {
    if (error) {
      console.error('❌ Gmail SMTP 연결 실패:', error.message);
    } else {
      console.log('✅ Gmail SMTP 서버 연결 성공!');
    }
  });
} else {
  console.warn('⚠️  Gmail SMTP 설정이 완료되지 않았습니다. .env 파일을 확인하세요.');
}

// 이메일 전송 함수
async function sendPasswordResetEmail(email, resetLink) {
  const mailOptions = {
    from: `"여기몰까 - 안전한 쇼핑몰 검증" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: '[여기몰까] 비밀번호 재설정 요청',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            background-color: #f5f5f5;
            margin: 0;
            padding: 0;
          }
          .email-container { 
            max-width: 600px; 
            margin: 20px auto; 
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          }
          .header { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
            color: white; 
            padding: 40px 30px; 
            text-align: center;
          }
          .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 600;
          }
          .header p {
            margin: 10px 0 0 0;
            opacity: 0.9;
            font-size: 14px;
          }
          .content { 
            padding: 40px 30px;
            background: white;
          }
          .content p {
            margin: 0 0 20px 0;
            color: #555;
          }
          .button-container {
            text-align: center;
            margin: 35px 0;
          }
          .button { 
            display: inline-block; 
            padding: 16px 40px; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white !important; 
            text-decoration: none; 
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
            transition: transform 0.2s;
          }
          .button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
          }
          .link-box {
            background: #f9f9f9;
            padding: 15px;
            border-radius: 6px;
            border-left: 4px solid #667eea;
            margin: 20px 0;
            word-break: break-all;
            font-size: 13px;
            color: #666;
          }
          .warning-box {
            background: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            border-radius: 6px;
            margin: 25px 0;
          }
          .warning-box p {
            margin: 0;
            color: #856404;
          }
          .warning-box strong {
            color: #d39e00;
          }
          .footer { 
            text-align: center; 
            padding: 30px;
            background: #f9f9f9;
            color: #999;
            font-size: 13px;
            border-top: 1px solid #eee;
          }
          .footer p {
            margin: 5px 0;
          }
          .divider {
            height: 1px;
            background: linear-gradient(to right, transparent, #ddd, transparent);
            margin: 30px 0;
          }
          .icon {
            font-size: 48px;
            margin-bottom: 10px;
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="header">
            <div class="icon">🔐</div>
            <h1>비밀번호 재설정</h1>
            <p>여기몰까 - 안전한 쇼핑을 위한 첫걸음</p>
          </div>
          
          <div class="content">
            <p>안녕하세요,</p>
            <p>고객님의 계정에 대한 비밀번호 재설정 요청을 받았습니다.</p>
            <p>아래 버튼을 클릭하여 새로운 비밀번호를 설정하세요:</p>
            
            <div class="button-container">
              <a href="${resetLink}" class="button">비밀번호 재설정하기</a>
            </div>
            
            <div class="divider"></div>
            
            <p style="font-size: 14px; color: #777;">버튼이 작동하지 않는다면, 아래 링크를 복사하여 브라우저 주소창에 붙여넣으세요:</p>
            <div class="link-box">
              ${resetLink}
            </div>
            
            <div class="warning-box">
              <p>⚠️ 이 링크는 <strong>1시간 동안만 유효</strong>합니다.</p>
              <p style="margin-top: 8px;">⏱️ 만료 후에는 다시 요청해주세요.</p>
            </div>
            
            <div class="divider"></div>
            
            <p style="color: #999; font-size: 13px; line-height: 1.8;">
              💡 <strong>보안 안내</strong><br>
              • 본인이 요청하지 않았다면 이 이메일을 무시하세요.<br>
              • 비밀번호를 타인과 절대 공유하지 마세요.<br>
              • 의심스러운 활동이 있다면 즉시 고객센터로 연락주세요.
            </p>
          </div>
          
          <div class="footer">
            <p><strong>여기몰까</strong> - 안전한 쇼핑몰 검증 서비스</p>
            <p>이 이메일에 회신하지 마세요. 자동 발송된 메일입니다.</p>
            <p style="margin-top: 15px; color: #ccc;">© 2024 여기몰까. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    const info = await emailTransporter.sendMail(mailOptions);
    console.log('✅ 이메일 전송 성공!');
    console.log('   메시지 ID:', info.messageId);
    console.log('   받는 사람:', email);
    return true;
  } catch (error) {
    console.error('❌ 이메일 전송 실패:', error.message);
    throw error;
  }
}

// 타이틀 캐시 (메모리 기반)
const titleCache = new Map();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24시간

// 웹사이트 타이틀 가져오기 함수
async function getWebsiteTitle(url) {
  try {
    // 캐시 확인
    const cacheKey = url.toLowerCase();
    const cached = titleCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log('캐시에서 타이틀 반환:', cached.title);
      return cached.title;
    }
    // 스마트 스토어는 URL에서 먼저 추출 시도
    if (url.includes('smartstore.naver.com')) {
      const storeName = await getStoreNameFromUrl(url);
      if (storeName) {
        console.log('스마트스토어 URL에서 추출 성공:', storeName);
        return storeName;
      }
    }
    
    const fetch = await import('node-fetch');
    
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    
    console.log('타이틀 가져오기 시도:', url);
    
    const response = await fetch.default(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache'
      },
      timeout: 10000, // 10초로 증가
      redirect: 'follow', // 리다이렉트 자동 처리
      follow: 5 // 최대 5번까지 리다이렉트 허용
    });
    
    if (!response.ok) {
      console.log(`HTTP 응답 실패 (${response.status}):`, url);
      if (url.includes('smartstore.naver.com')) {
        return await getStoreNameFromUrl(url);
      }
      return null;
    }
    
    const html = await response.text();
    console.log(`HTML 크기: ${html.length} bytes`);
    let title = null;
    
    // 스마트 스토어 특별 처리
    if (url.includes('smartstore.naver.com')) {
      // HTML에서 먼저 타이틀 추출
      const ogTitleMatch = html.match(/<meta[^>]*property=['"]og:title['"][^>]*content=['"]([^'"]+)['"][^>]*>/i);
      if (ogTitleMatch && ogTitleMatch[1]) {
        const cleanTitle = ogTitleMatch[1]
          .replace(/네이버 스마트스토어\s*/gi, '')
          .replace(/스마트스토어\s*/gi, '')
          .replace(/smartstore\s*/gi, '')
          .trim();
        if (cleanTitle && cleanTitle.length > 1) {
          console.log('스마트스토어 HTML에서 추출 성공:', cleanTitle);
          return cleanTitle;
        }
      }
      
      // title 태그도 확인
      const titleMatch = html.match(/<title[^>]*>\s*(.*?)\s*<\/title>/i);
      if (titleMatch && titleMatch[1]) {
        const cleanTitle = titleMatch[1]
          .replace(/네이버 스마트스토어\s*/gi, '')
          .replace(/스마트스토어\s*/gi, '')
          .trim();
        if (cleanTitle && cleanTitle.length > 1) {
          console.log('스마트스토어 title 태그에서 추출 성공:', cleanTitle);
          return cleanTitle;
        }
      }
      
      // 최후 수단으로 URL에서 추출
      const urlStoreName = await getStoreNameFromUrl(url);
      if (urlStoreName) {
        console.log('스마트스토어 URL 백업 추출 성공:', urlStoreName);
        return urlStoreName;
      }
    }
    
    // 기본 타이틀 태그
    const titleMatch = html.match(/<title[^>]*>\s*([^<]+)\s*<\/title>/i);
    if (titleMatch && titleMatch[1]) {
      title = titleMatch[1].trim();
    }
    
    // Open Graph 타이틀
    if (!title) {
      const ogTitleMatch = html.match(/<meta[^>]*property=['"]og:title['"][^>]*content=['"]([^'"]+)['"][^>]*>/i);
      if (ogTitleMatch && ogTitleMatch[1]) {
        title = ogTitleMatch[1].trim();
      }
    }
    
    // Twitter 타이틀
    if (!title) {
      const twitterTitleMatch = html.match(/<meta[^>]*name=['"]twitter:title['"][^>]*content=['"]([^'"]+)['"][^>]*>/i);
      if (twitterTitleMatch && twitterTitleMatch[1]) {
        title = twitterTitleMatch[1].trim();
      }
    }
    
    // meta description을 fallback으로 사용
    if (!title) {
      const descMatch = html.match(/<meta[^>]*name=['"]description['"][^>]*content=['"]([^'"]+)['"][^>]*>/i);
      if (descMatch && descMatch[1]) {
        title = descMatch[1].substring(0, 50).trim(); // 50자로 제한
        console.log('description에서 타이틀 추출:', title);
      }
    }
    
    // h1 태그를 최후 fallback으로 사용
    if (!title) {
      const h1Match = html.match(/<h1[^>]*>\s*([^<]+)\s*<\/h1>/i);
      if (h1Match && h1Match[1]) {
        title = h1Match[1].substring(0, 50).trim();
        console.log('h1 태그에서 타이틀 추출:', title);
      }
    }
    
    if (title) {
      const cleanTitle = title
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&#x27;/g, "'")
        .replace(/&nbsp;/g, ' ')
        .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec))
        .replace(/\s+/g, ' ')
        .trim();
      
      if (cleanTitle && cleanTitle.length > 0) {
        console.log('타이틀 추출 성공:', cleanTitle);
        
        // 캐시에 저장
        titleCache.set(cacheKey, {
          title: cleanTitle,
          timestamp: Date.now()
        });
        
        return cleanTitle;
      }
    }
    
    console.log('타이틀을 찾을 수 없음:', url);
    return null;
  } catch (error) {
    console.error('타이틀 가져오기 실패:', url);
    console.error('에러 타입:', error.name);
    console.error('에러 메시지:', error.message);
    
    // 타임아웃 에러
    if (error.name === 'AbortError' || error.message.includes('timeout')) {
      console.error('타임아웃 발생 (10초 초과)');
    }
    
    // 네트워크 에러
    if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
      console.error('네트워크 연결 실패:', error.message);
    }
    
    // SSL/TLS 에러
    if (error.message.includes('certificate') || error.message.includes('SSL')) {
      console.error('SSL/인증서 오류:', error.message);
    }
    
    if (url.includes('smartstore.naver.com')) {
      return await getStoreNameFromUrl(url);
    }
    return null;
  }
}

// URL에서 스토어명 추출
async function getStoreNameFromUrl(url) {
  try {
    if (!url.includes('smartstore.naver.com')) return null;
    
    const urlObj = new URL(url.startsWith('http') ? url : 'https://' + url);
    const pathSegments = urlObj.pathname.split('/').filter(part => part && part.length > 0);
    
    if (pathSegments.length > 0) {
      const storeSegment = pathSegments[0];
      
      if (storeSegment && 
          !storeSegment.includes('undefined') && 
          storeSegment.length >= 3 && 
          !storeSegment.match(/^\d+$/) &&
          isNaN(storeSegment)) {
        return storeSegment
          .replace(/_/g, ' ')
          .replace(/-/g, ' ')
          .split(/(?=[A-Z])/)
          .join(' ')
          .trim();
      }
    }
    return null;
  } catch (error) {
    return null;
  }
}

// URL 정규화 함수
function normalizeUrl(url) {
  try {
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    
    const urlObj = new URL(url);
    let domain = urlObj.hostname.toLowerCase();
    
    // www. 제거
    if (domain.startsWith('www.')) {
      domain = domain.substring(4);
    }
    
    // 네이버 스마트 스토어 특별 처리
    if (domain === 'smartstore.naver.com') {
      const pathParts = urlObj.pathname.split('/').filter(part => part);
      if (pathParts.length >= 1) {
        const storeId = pathParts[0];
        if (storeId && storeId !== 'undefined' && storeId !== '' && storeId.length > 1) {
          return `smartstore.naver.com/${storeId}`;
        }
      }
      return 'smartstore.naver.com';
    }

    // 모바일 도메인 매핑
    const mobileDomainMappings = {
      'm.11st.co.kr': '11st.co.kr',
      'm.gmarket.co.kr': 'gmarket.co.kr',
      'm.auction.co.kr': 'auction.co.kr',
      'm.coupang.com': 'coupang.com',
      'm.ssg.com': 'ssg.com',
      'm.lotte.com': 'lotte.com'
    };
    
    if (mobileDomainMappings[domain]) {
      return mobileDomainMappings[domain];
    }
    
    // 서브도메인 제거 (2단계 TLD 지원: co.kr, ne.jp 등)
    const parts = domain.split('.');
    if (parts.length > 2) {
      const lastPart = parts[parts.length - 1];
      const beforePart = parts[parts.length - 2];
      
      // 2단계 TLD 처리 (co.kr, ne.jp, com.cn 등)
      const twoLevelTLDs = ['co', 'ne', 'or', 'ac', 'go'];
      if (twoLevelTLDs.includes(beforePart) && ['kr', 'jp', 'cn', 'uk'].includes(lastPart)) {
        // guitarshop.co.kr -> guitarshop.co.kr
        const domainName = parts[parts.length - 3];
        return `${domainName}.${beforePart}.${lastPart}`;
      }
      
      // 일반 TLD 처리 (com, kr, net, org 등)
      if (['com', 'kr', 'net', 'org', 'io', 'ai'].includes(lastPart)) {
        return `${beforePart}.${lastPart}`;
      }
    }
    
    return domain;
  } catch (error) {
    console.error('URL 정규화 에러:', url, error.message);
    return url;
  }
}

// SolAPI HMAC-SHA256 인증 헤더 생성 함수 (공식 문서 기준)
function generateSolAPISignature(apiSecret, dateTime, salt) {
  const data = dateTime + salt;
  return crypto.createHmac('sha256', apiSecret).update(data).digest('hex');
}

function createSolAPIAuthHeader() {
  const dateTime = new Date().toISOString();
  const salt = crypto.randomBytes(16).toString('hex');
  const signature = generateSolAPISignature(SMS_CONFIG.solApiSecret, dateTime, salt);
  
  return `HMAC-SHA256 apiKey=${SMS_CONFIG.solApiKey}, date=${dateTime}, salt=${salt}, signature=${signature}`;
}

// SMS 발송 함수 (SolAPI 공식 문서 기준)
async function sendSolAPI(phoneNumber, message) {
  const fetch = await import('node-fetch');
  
  // SolAPI 공식 문서에 따른 요청 본문 (LMS로 변경하여 긴 메시지 지원)
  const body = {
    message: {
      to: phoneNumber,
      from: SMS_CONFIG.solApiFromNumber,
      text: message,
      type: 'SMS'  // LMS에서 SMS로 변경 (2000byte → 90byte)
    }
  };

  console.log('SMS 발송 요청 본문:', JSON.stringify(body, null, 2));

  const response = await fetch.default('https://api.solapi.com/messages/v4/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': createSolAPIAuthHeader()
    },
    body: JSON.stringify(body)
  });

  const result = await response.json();
  console.log('SolAPI 응답:', result);

  if (!response.ok) {
    throw new Error(`SolAPI Error: ${response.status} - ${JSON.stringify(result)}`);
  }

  return result;
}

// 비밀번호 해싱 함수
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// 비밀번호 검증 함수
function verifyPassword(password, hashedPassword) {
  return hashPassword(password) === hashedPassword;
}

// 레이트 리밋 확인 함수 (Supabase)
async function checkRateLimit(phoneNumber, ipAddress) {
    const now = new Date();
  
  try {
    const { data: rateLimits, error } = await supabase
      .from('sms_rate_limits')
      .select('*')
      .eq('phone_number', phoneNumber)
      .order('last_sent_at', { ascending: false })
      .limit(1);

    if (error) throw error;

    // 새로운 제한 기록이 없으면 생성
    if (!rateLimits || rateLimits.length === 0) {
      const { error: insertError } = await supabase
        .from('sms_rate_limits')
        .insert({
          phone_number: phoneNumber,
          ip_address: ipAddress,
          sent_count: 1,
          last_sent_at: now.toISOString()
        });
      
      if (insertError) throw insertError;
      return true;
    }

    const rateLimit = rateLimits[0];
    
    // 분당 제한 확인 (5회)
    const lastSentTime = new Date(rateLimit.last_sent_at);
    if (now - lastSentTime < 60000) {
      if (rateLimit.sent_count >= 5) {
        const remainingMinutes = Math.ceil((60000 - (now - lastSentTime)) / 60000);
        throw new Error(`${remainingMinutes}분 후 다시 시도해주세요.`);
      }
      
      // 카운트 증가
      const { error: updateError } = await supabase
        .from('sms_rate_limits')
        .update({ 
          sent_count: rateLimit.sent_count + 1,
          last_sent_at: now.toISOString()
        })
        .eq('id', rateLimit.id);
      
      if (updateError) throw updateError;
    }

    return true;
  } catch (error) {
    console.error('Rate limiting check failed:', error);
    throw error;
  }
}

// API 라우트

// 헬스체크
app.get('/api/health', (req, res) => {
  console.log(`Health check from: ${req.ip || req.connection.remoteAddress}`);
  res.json({ 
    status: 'OK', 
    message: 'Server is running',
    ip: req.ip || req.connection.remoteAddress,
    timestamp: new Date().toISOString()
  });
});

// 루트 테스트
app.get('/', (req, res) => {
  res.json({
    message: 'Shopping Mall Backend API',
    version: '1.0.0',
    endpoints: [
      '/api/health',
      '/api/shops/search',
      '/api/dangerous-pages',
      '/api/top-rated-pages'
    ]
  });
});

// SMS 인증번호 발송
app.post('/api/auth/send-sms', async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    
    if (!phoneNumber) {
      return res.status(400).json({ error: '전화번호가 필요합니다.' });
    }

    // 입력 검증 및 정제
    const cleanPhoneNumber = sanitizeInput(phoneNumber);
    if (!validatePhoneNumber(cleanPhoneNumber)) {
      return res.status(400).json({ error: '올바른 휴대폰 번호를 입력해주세요.' });
    }

    // 레이트 리밋 확인
    const ipAddress = req.ip || req.connection.remoteAddress;
    await checkRateLimit(phoneNumber, ipAddress);

    // 6자리 인증번호 생성
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    const message = `[여기몰까] 인증번호: ${verificationCode}`;
    
    let sentMessage = `인증번호가 발송되었습니다. ${phoneNumber}`;
    
    if (SMS_CONFIG.smsProvider === 'solapi') {
      try {
        await sendSolAPI(phoneNumber, message);
        console.log(`SMS 발송 성공: ${phoneNumber}`);
        sentMessage = `인증번호가 발송되었습니다. ${phoneNumber}`;
      } catch (smsError) {
        console.error('SMS 발송 실패:', smsError);
        throw new Error(`SMS 발송에 실패했습니다: ${smsError.message}`);
      }
    } else {
      console.log(`[개발모드] SMS 발송: ${phoneNumber}, 인증번호: ${verificationCode}`);
      sentMessage = `인증번호가 발송되었습니다. ${phoneNumber}`;
    }

    // Supabase에 인증 정보 저장
    const { error } = await supabase
      .from('sms_verifications')
      .insert({
        phone_number: phoneNumber,
        verification_code: verificationCode,
        is_verified: false
      });

    if (error) throw error;

    res.json({ 
      success: true, 
      message: sentMessage
    });
    
  } catch (error) {
    console.error('SMS 발송 오류:', error);
    res.status(500).json({ 
      error: `인증번호 발송에 실패했습니다. ${error.message}` 
    });
  }
});

// SMS 인증번호 확인
app.post('/api/auth/verify-sms', async (req, res) => {
  try {
    const { phoneNumber, verificationCode } = req.body;
    
    if (!phoneNumber || !verificationCode) {
      return res.status(400).json({ error: '전화번호와 인증번호가 필요합니다.' });
    }

    // Supabase에서 인증 정보 조회
    const { data: verification, error } = await supabase
      .from('sms_verifications')
      .select('*')
      .eq('phone_number', phoneNumber)
      .eq('verification_code', verificationCode)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) throw error;
    
    if (!verification || verification.length === 0) {
      return res.status(400).json({ error: '유효하지 않은 인증번호입니다.' });
    }

    const verificationData = verification[0];
    
    // 이미 사용된 인증번호인지 확인
    if (verificationData.is_verified) {
      return res.status(400).json({ error: '이미 사용된 인증번호입니다.' });
    }

    // 만료 시간 확인 (3분)
    const threeMinutes = 3 * 60 * 1000;
    if (Date.now() - new Date(verificationData.created_at).getTime() > threeMinutes) {
      return res.status(400).json({ error: '인증번호가 만료되었습니다.' });
    }

    // 인증 성공 처리
    const { error: updateError } = await supabase
      .from('sms_verifications')
      .update({ is_verified: true })
      .eq('id', verificationData.id);

    if (updateError) throw updateError;
    
    res.json({
      success: true, 
      message: '인증이 완료되었습니다.' 
    });
    
  } catch (error) {
    console.error('인증 확인 오류:', error);
    res.status(500).json({ 
      error: `인증 확인에 실패했습니다. ${error.message}` 
    });
  }
});

// 회원가입
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password, phoneNumber, verificationCode } = req.body;
    
    if (!username || !email || !password || !phoneNumber || !verificationCode) {
      return res.status(400).json({ error: '모든 필드를 입력해주세요.' });
    }

    // 입력 검증 및 정제
    const cleanUsername = sanitizeInput(username);
    const cleanEmail = sanitizeInput(email);
    const cleanPhoneNumber = sanitizeInput(phoneNumber);
    const cleanVerificationCode = sanitizeInput(verificationCode);

    // 사용자명 길이 및 특수문자 검증
    if (cleanUsername.length < 2 || cleanUsername.length > 20) {
      return res.status(400).json({ error: '사용자명은 2-20자 사이여야 합니다.' });
    }

    // 이메일 형식 확인
    if (!validateEmail(cleanEmail)) {
      return res.status(400).json({ error: '올바른 이메일 형식을 입력해주세요.' });
    }

    // 비밀번호 길이 및 복잡도 확인
    if (password.length < 6) {
      return res.status(400).json({ error: '비밀번호는 6자 이상이어야 합니다.' });
    }

    // 전화번호 형식 확인
    if (!validatePhoneNumber(cleanPhoneNumber)) {
      return res.status(400).json({ error: '올바른 휴대폰 번호를 입력해주세요.' });
    }

    // 인증번호 형식 확인 (6자리 숫자)
    if (!/^\d{6}$/.test(cleanVerificationCode)) {
      return res.status(400).json({ error: '인증번호는 6자리 숫자여야 합니다.' });
    }

    // SMS 인증 확인
    const { data: smsVerification, error: smsError } = await supabase
      .from('sms_verifications')
      .select('*')
      .eq('phone_number', phoneNumber)
      .eq('verification_code', verificationCode)
      .eq('is_verified', true)
      .order('created_at', { ascending: false })
      .limit(1);

    if (smsError) throw smsError;
    
    if (!smsVerification || smsVerification.length === 0) {
      return res.status(400).json({ error: '인증번호가 올바르지 않거나 만료되었습니다.' });
    }

    // 중복 사용자 확인
    const { data: existingUser, error: userCheckError } = await supabase
      .from('users')
      .select('id')
      .or(`username.eq.${username},email.eq.${email},phone_number.eq.${phoneNumber}`);

    if (userCheckError) throw userCheckError;
    
    if (existingUser && existingUser.length > 0) {
      return res.status(400).json({ error: '이미 존재하는 사용자입니다.' });
    }

    // 새 사용자 생성
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({
        username,
        email,
        password: hashPassword(password),
        phone_number: phoneNumber
      })
      .select('id, username, email, phone_number')
      .single();

    if (insertError) throw insertError;

    res.status(201).json({ 
      success: true, 
      message: '회원가입이 완료되었습니다.',
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        phoneNumber: newUser.phone_number  // camelCase로 변환
      }
    });
    
  } catch (error) {
    console.error('회원가입 오류:', error);
    res.status(500).json({ 
      error: `회원가입에 실패했습니다. ${error.message}` 
    });
  }
});

// 로그인
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: '이메일과 비밀번호를 입력해주세요.' });
    }

    // 사용자 조회
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error) throw error;
    
    if (!user) {
      return res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' });
    }

    // 비밀번호 확인
    if (!verifyPassword(password, user.password)) {
      return res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' });
    }

    // JWT 토큰 생성
    const token = generateToken(user);

    const userResponse = {
      id: user.id,
      username: user.username,
      email: user.email,
      phoneNumber: user.phone_number  // camelCase로 변환
    };

    res.json({ 
      success: true, 
      message: '로그인 성공',
      token: token,
      user: userResponse
    });
    
  } catch (error) {
    console.error('로그인 오류:', error);
    res.status(500).json({ 
      error: `로그인에 실패했습니다. ${error.message}` 
    });
  }
});

// 비밀번호 재설정 요청 (이메일로 링크 전송)
app.post('/api/auth/request-password-reset', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: '이메일을 입력해주세요.' });
    }

    // 사용자 조회
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    // 사용자가 존재하지 않으면 에러 반환
    if (error || !user) {
      return res.status(404).json({ 
        success: false,
        error: '존재하지 않는 이메일입니다. 가입된 이메일 주소를 입력해주세요.'
      });
    }

    // 재설정 토큰 생성 (UUID 또는 랜덤 문자열)
    const crypto = require('crypto');
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 3600000); // 1시간 후 만료

    // 토큰 저장
    const { error: tokenError } = await supabase
      .from('password_reset_tokens')
      .insert({
        user_id: user.id,
        token: resetToken,
        expires_at: expiresAt.toISOString(),
        used: false
      });

    if (tokenError) {
      console.error('토큰 저장 오류:', tokenError);
      throw tokenError;
    }

    // 재설정 링크 생성
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;

    // 이메일 전송
    console.log('=== 비밀번호 재설정 이메일 발송 시작 ===');
    console.log(`받는 사람: ${email}`);
    console.log(`사용자 ID: ${user.id}`);
    console.log(`토큰 생성 시간: ${new Date().toLocaleString('ko-KR')}`);
    console.log(`만료 시간: ${expiresAt.toLocaleString('ko-KR')}`);
    
    try {
      await sendPasswordResetEmail(email, resetLink);
      console.log('✅ 이메일 전송 완료!');
    } catch (emailError) {
      console.error('❌ 이메일 전송 실패:', emailError.message);
      // 이메일 전송 실패해도 보안상 사용자에게는 성공 메시지 반환
      // 실제로는 관리자가 로그를 확인하여 문제를 해결해야 함
    }
    
    console.log('========================================');

    res.json({ 
      success: true,
      message: '비밀번호 재설정 요청이 처리되었습니다. 등록된 이메일을 확인해주세요.'
    });
    
  } catch (error) {
    console.error('비밀번호 재설정 요청 오류:', error);
    res.status(500).json({ 
      error: `비밀번호 재설정 요청에 실패했습니다. ${error.message}` 
    });
  }
});

// 비밀번호 재설정 (토큰 검증 및 비밀번호 변경)
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword) {
      return res.status(400).json({ error: '토큰과 새 비밀번호를 입력해주세요.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: '비밀번호는 최소 6자 이상이어야 합니다.' });
    }

    // 토큰 조회 및 검증
    const { data: resetToken, error: tokenError } = await supabase
      .from('password_reset_tokens')
      .select('*')
      .eq('token', token)
      .eq('used', false)
      .single();

    if (tokenError || !resetToken) {
      return res.status(400).json({ 
        error: '유효하지 않거나 만료된 토큰입니다.' 
      });
    }

    // 만료 시간 확인
    if (new Date(resetToken.expires_at) < new Date()) {
      return res.status(400).json({ 
        error: '토큰이 만료되었습니다. 다시 요청해주세요.' 
      });
    }

    // 새 비밀번호 해시화
    const hashedPassword = hashPassword(newPassword);

    // 비밀번호 업데이트
    const { error: updateError } = await supabase
      .from('users')
      .update({ password: hashedPassword })
      .eq('id', resetToken.user_id);

    if (updateError) {
      console.error('비밀번호 업데이트 오류:', updateError);
      throw updateError;
    }

    // 토큰을 사용됨으로 표시
    await supabase
      .from('password_reset_tokens')
      .update({ used: true })
      .eq('id', resetToken.id);

    res.json({ 
      success: true,
      message: '비밀번호가 성공적으로 변경되었습니다.'
    });
    
  } catch (error) {
    console.error('비밀번호 재설정 오류:', error);
    res.status(500).json({ 
      error: `비밀번호 재설정에 실패했습니다. ${error.message}` 
    });
  }
});

// 현재 사용자 정보 조회
app.get('/api/auth/me', (req, res) => {
  // 이것은 JWT 토큰이나 세션 처리가 필요
  res.json({ success: true });
});

// 사용자명 중복 확인
app.post('/api/auth/check-username', async (req, res) => {
  try {
    const { username } = req.body;
    
    if (!username) {
      return res.status(400).json({ error: '사용자명이 필요합니다.' });
    }

    // 사용자명 길이 검증 (2~20자)
    if (username.length < 2) {
      return res.status(400).json({ 
        available: false,
        error: '사용자명은 최소 2자 이상이어야 합니다.' 
      });
    }

    if (username.length > 20) {
      return res.status(400).json({ 
        available: false,
        error: '사용자명은 최대 20자까지 가능합니다.' 
      });
    }

    // 중복 확인
    const { data: existingUser, error } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    if (existingUser) {
      return res.json({ 
        available: false,
        message: '이미 사용 중인 사용자명입니다.' 
      });
    }

    res.json({ 
      available: true,
      message: '사용 가능한 사용자명입니다.' 
    });
    
  } catch (error) {
    console.error('사용자명 중복 확인 오류:', error);
    res.status(500).json({ 
      error: `사용자명 중복 확인에 실패했습니다. ${error.message}` 
    });
  }
});

// 쇼핑몰 검색 또는 생성
app.post('/api/shops/search', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({
        success: false,
        message: 'URL이 필요합니다.'
      });
    }

    // URL 검증 및 정제
    const cleanUrl = sanitizeInput(url);
    if (!validateUrl(cleanUrl)) {
      return res.status(400).json({
        success: false,
        message: '올바른 URL 형식을 입력해주세요.'
      });
    }

    const normalizedUrl = normalizeUrl(url);
    console.log('원본 URL:', url, '-> 정규화된 URL:', normalizedUrl);

    // 기존 쇼핑몰 검색
    const { data: existingShops, error: searchError } = await supabase
      .from('shops')
      .select('*')
      .eq('url', normalizedUrl)
      .single();

    if (searchError && searchError.code !== 'PGRST116') {
      throw searchError;
    }

    if (existingShops) {
      let shop = existingShops;
      
      // parent_shop_id가 있으면 부모 쇼핑몰 정보를 가져옴
      if (shop.parent_shop_id) {
        const { data: parentShop, error: parentError } = await supabase
          .from('shops')
          .select('*')
          .eq('id', shop.parent_shop_id)
          .single();
        
        if (!parentError && parentShop) {
          console.log(`쇼핑몰 병합됨: ${shop.id} -> ${parentShop.id}`);
          shop = parentShop;
        }
      }
      
      // 이름이 없으면 백그라운드에서 타이틀 가져오기
      if (!shop.name) {
        getWebsiteTitle(url).then(titleName => {
          if (!titleName && url.includes('smartstore.naver.com')) {
            return getWebsiteTitle(normalizedUrl);
          }
          return titleName;
        }).then(titleName => {
          if (titleName) {
            supabase
              .from('shops')
              .update({ name: titleName })
              .eq('id', shop.id)
              .then(({ error }) => {
                if (error) {
                  console.error('타이틀 업데이트 에러:', error);
                } else {
                  console.log('타이틀 업데이트 성공:', titleName);
                }
              });
          }
        }).catch(error => {
          console.error('백그라운드 타이틀 가져오기 에러:', error);
        });
      }
      
      return res.json({ shop: shop, isNew: false });
    } else {
      // 새 쇼핑몰 생성 (타이틀 가져오기는 백그라운드에서 처리)
      const { data: newShop, error: insertError } = await supabase
        .from('shops')
        .insert({ url: normalizedUrl, name: null })
        .select('*')
        .single();

      if (insertError) throw insertError;

      // 백그라운드에서 타이틀 가져오기 (응답을 기다리지 않음)
      getWebsiteTitle(normalizedUrl).then(titleName => {
        if (titleName) {
          supabase
            .from('shops')
            .update({ name: titleName })
            .eq('id', newShop.id)
            .then(({ error }) => {
              if (error) {
                console.error('타이틀 업데이트 에러:', error);
              } else {
                console.log('타이틀 업데이트 성공:', titleName);
              }
            });
        }
      }).catch(error => {
        console.error('백그라운드 타이틀 가져오기 에러:', error);
      });

      return res.json({ shop: newShop, isNew: true });
    }
  } catch (error) {
    console.error('쇼핑몰 검색/생성 오류:', error);
    res.status(500).json({
      success: false,
      message: error.message || '쇼핑몰 검색에 실패했습니다.'
    });
  }
});

// 신고 목록 조회
app.get('/api/shops/:shopId/reports', async (req, res) => {
  try {
    const { shopId } = req.params;
    const { data: reports, error } = await supabase
      .from('reports')
      .select('*')
      .eq('shop_id', shopId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json(reports || []);
  } catch (error) {
    console.error('신고 목록 조회 오류:', error);
    res.status(500).json({ success: false, message: '신고 목록 조회 실패' });
  }
});

// 평점 조회
app.get('/api/shops/:shopId/ratings', async (req, res) => {
  try {
    const { shopId } = req.params;
    const { data: ratings, error } = await supabase
      .from('ratings')
      .select('rating')
      .eq('shop_id', shopId);

    if (error) throw error;

    const ratingCount = ratings.length;
    const totalRating = ratings.reduce((sum, r) => sum + r.rating, 0);
    const averageRating = ratingCount > 0 ? totalRating / ratingCount : 0;
    
    // 평점 분포 계산
    const ratingDistribution = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0
    };
    
    ratings.forEach(r => {
      if (r.rating >= 1 && r.rating <= 5) {
        ratingDistribution[r.rating]++;
      }
    });
    
    res.json({
      averageRating: Number(averageRating.toFixed(1)),
      totalRatings: ratingCount,
      ratingDistribution: ratingDistribution
    });
  } catch (error) {
    console.error('평점 조회 오류:', error);
    res.status(500).json({ success: false, message: '평점 조회 실패' });
  }
});

// 평점 생성
app.post('/api/ratings', async (req, res) => {
  try {
    const { shopUrl, rating } = req.body;
    
    if (!shopUrl || !rating || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: '올바른 평점을 입력해주세요.' });
    }

    const normalizedUrl = normalizeUrl(shopUrl);
    const { data: shops, error: searchError } = await supabase
      .from('shops')
      .select('*')
      .eq('url', normalizedUrl)
      .single();

    let shopId;
    
    if (searchError && searchError.code === 'PGRST116') {
      const { data: newShop, error: insertError } = await supabase
        .from('shops')
        .insert({ url: normalizedUrl, name: null })
        .select('*')
        .single();

      if (insertError) throw insertError;
      shopId = newShop.id;
    } else if (searchError) {
      throw searchError;
    } else {
      // parent_shop_id가 있으면 부모 ID를 사용
      shopId = shops.parent_shop_id || shops.id;
      console.log(`평점 등록 - Shop ID: ${shops.id}, Parent ID: ${shops.parent_shop_id}, 사용할 ID: ${shopId}`);
    }

    const { data: newRating, error: ratingError } = await supabase
      .from('ratings')
      .insert({ shop_id: shopId, rating: rating })
      .select('*')
      .single();

    if (ratingError) throw ratingError;

    res.status(201).json({ success: true, rating: newRating });
  } catch (error) {
    console.error('평점 등록 오류:', error);
    res.status(500).json({ success: false, message: '평점 등록 실패' });
  }
});

// 특정 사용자의 모든 신고 조회
app.get('/api/reports/user/:reporterName', async (req, res) => {
  try {
    const { reporterName } = req.params;
    
    console.log('=== 사용자 신고 조회 API 호출 ===');
    console.log('사용자명:', reporterName);
    
    if (!reporterName) {
      return res.status(400).json({ success: false, message: '사용자명이 필요합니다.' });
    }

    // 사용자의 모든 신고 조회 (쇼핑몰 정보 포함)
    const { data: reports, error } = await supabase
      .from('reports')
      .select(`
        *,
        shops (id, url, name)
      `)
      .eq('reporter_name', reporterName)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase 에러:', error);
      throw error;
    }

    console.log('조회된 신고 개수:', reports?.length || 0);
    if (reports && reports.length > 0) {
      console.log('첫 번째 신고:', reports[0]);
    }

    res.json({ 
      success: true, 
      reports: reports || []
    });
  } catch (error) {
    console.error('사용자 신고 목록 조회 오류:', error);
    res.status(500).json({ success: false, message: '신고 목록 조회 실패' });
  }
});

// 특정 사용자의 특정 쇼핑몰 신고 조회
app.get('/api/reports/user/:reporterName/shop/:shopUrl', async (req, res) => {
  try {
    const { reporterName, shopUrl } = req.params;
    
    if (!reporterName || !shopUrl) {
      return res.status(400).json({ success: false, message: '필수 파라미터가 누락되었습니다.' });
    }

    const normalizedUrl = normalizeUrl(shopUrl);
    
    // 먼저 쇼핑몰 찾기
    const { data: shops, error: searchError } = await supabase
      .from('shops')
      .select('*')
      .eq('url', normalizedUrl)
      .single();

    if (searchError && searchError.code === 'PGRST116') {
      // 쇼핑몰이 없으면 신고도 없음
      return res.json({ success: true, report: null });
    } else if (searchError) {
      throw searchError;
    }

    const shopId = shops.parent_shop_id || shops.id;

    // 해당 사용자의 신고 찾기
    const { data: reports, error: reportError } = await supabase
      .from('reports')
      .select('*')
      .eq('shop_id', shopId)
      .eq('reporter_name', reporterName)
      .order('created_at', { ascending: false })
      .limit(1);

    if (reportError) throw reportError;

    res.json({ 
      success: true, 
      report: reports && reports.length > 0 ? reports[0] : null 
    });
  } catch (error) {
    console.error('신고 조회 오류:', error);
    res.status(500).json({ success: false, message: '신고 조회 실패' });
  }
});

// 사용자 신고 삭제 (본인만 가능)
app.delete('/api/reports/:reportId/user/:reporterName', async (req, res) => {
  try {
    const { reportId, reporterName } = req.params;

    // 기존 신고 확인 및 권한 체크
    const { data: existingReport, error: checkError } = await supabase
      .from('reports')
      .select('*')
      .eq('id', reportId)
      .single();

    if (checkError) throw checkError;

    if (!existingReport) {
      return res.status(404).json({ success: false, message: '신고를 찾을 수 없습니다.' });
    }

    // 신고자 본인 확인
    if (existingReport.reporter_name !== reporterName) {
      return res.status(403).json({ success: false, message: '본인의 신고만 삭제할 수 있습니다.' });
    }

    // 신고 삭제
    const { error: deleteError } = await supabase
      .from('reports')
      .delete()
      .eq('id', reportId);

    if (deleteError) throw deleteError;

    res.json({ success: true, message: '신고가 삭제되었습니다.' });
  } catch (error) {
    console.error('신고 삭제 오류:', error);
    res.status(500).json({ success: false, message: '신고 삭제 실패' });
  }
});

// 신고 수정
app.put('/api/reports/:reportId', async (req, res) => {
  try {
    const { reportId } = req.params;
    const { categories, description, reporterName } = req.body;
    
    if (!categories || !description) {
      return res.status(400).json({ success: false, message: '필수 필드가 누락되었습니다.' });
    }

    // 기존 신고 확인 및 권한 체크
    const { data: existingReport, error: checkError } = await supabase
      .from('reports')
      .select('*')
      .eq('id', reportId)
      .single();

    if (checkError) throw checkError;

    if (!existingReport) {
      return res.status(404).json({ success: false, message: '신고를 찾을 수 없습니다.' });
    }

    // 신고자 본인 확인
    if (existingReport.reporter_name !== reporterName) {
      return res.status(403).json({ success: false, message: '본인의 신고만 수정할 수 있습니다.' });
    }

    // 신고 업데이트
    const { data: updatedReport, error: updateError } = await supabase
      .from('reports')
      .update({
        categories: JSON.stringify(categories),
        description: description
      })
      .eq('id', reportId)
      .select('*')
      .single();

    if (updateError) throw updateError;

    res.json({ success: true, report: updatedReport });
  } catch (error) {
    console.error('신고 수정 오류:', error);
    res.status(500).json({ success: false, message: '신고 수정 실패' });
  }
});

// 신고 제출
app.post('/api/reports', async (req, res) => {
  try {
    const { shopUrl, categories, description, reporterName, reporterPhone } = req.body;
    
    if (!shopUrl || !categories || !description) {
      return res.status(400).json({ success: false, message: '필수 필드가 누락되었습니다.' });
    }

    const normalizedUrl = normalizeUrl(shopUrl);
    const { data: shops, error: searchError } = await supabase
      .from('shops')
      .select('*')
      .eq('url', normalizedUrl)
      .single();

    let shopId;
    
    if (searchError && searchError.code === 'PGRST116') {
      const { data: newShop, error: insertError } = await supabase
        .from('shops')
        .insert({ url: normalizedUrl, name: null })
        .select('*')
        .single();

      if (insertError) throw insertError;
      shopId = newShop.id;
    } else if (searchError) {
      throw searchError;
    } else {
      // parent_shop_id가 있으면 부모 ID를 사용
      shopId = shops.parent_shop_id || shops.id;
      console.log(`신고 등록 - Shop ID: ${shops.id}, Parent ID: ${shops.parent_shop_id}, 사용할 ID: ${shopId}`);
    }

    // 중복 신고 체크 (같은 사용자가 같은 쇼핑몰에 이미 신고했는지)
    if (reporterName) {
      console.log(`중복 신고 체크 시작 - Shop ID: ${shopId}, 사용자: ${reporterName}`);
      
      const { data: existingReports, error: checkError } = await supabase
        .from('reports')
        .select('id')
        .eq('shop_id', shopId)
        .eq('reporter_name', reporterName);

      if (checkError) {
        console.error('중복 신고 체크 에러:', checkError);
        throw checkError;
      }

      console.log(`기존 신고 개수: ${existingReports?.length || 0}`);

      if (existingReports && existingReports.length > 0) {
        console.log(`중복 신고 감지! 기존 신고 ID: ${existingReports[0].id}`);
        return res.status(409).json({ 
          success: false, 
          message: '이미 이 쇼핑몰에 대한 신고가 존재합니다.',
          existingReportId: existingReports[0].id,
          isDuplicate: true
        });
      }
      
      console.log('중복 신고 없음 - 신규 신고 등록 진행');
    } else {
      console.log('경고: reporterName이 없습니다. 중복 체크 생략');
    }

    const { data: newReport, error: reportError } = await supabase
      .from('reports')
      .insert({
        shop_id: shopId,
        categories: JSON.stringify(categories),
        description: description,
        reporter_name: reporterName,
        reporter_phone: reporterPhone
      })
      .select('*')
      .single();

    if (reportError) throw reportError;

    res.status(201).json({ success: true, report: newReport });
  } catch (error) {
    console.error('신고 등록 오류:', error);
    res.status(500).json({ success: false, message: '신고 등록 실패' });
  }
});

// 위험 페이지 조회
app.get('/api/dangerous-pages', async (req, res) => {
  try {
    const { data: shopReports, error } = await supabase
      .from('reports')
      .select(`shop_id, shops!inner (id, url, name)`);

    if (error) throw error;

    const reportCounts = {};
    shopReports.forEach(report => {
      const shopId = report.shop_id;
      if (!reportCounts[shopId]) {
        reportCounts[shopId] = { shop: report.shops, reportCount: 0 };
      }
      reportCounts[shopId].reportCount++;
    });

    const topDangerous = Object.values(reportCounts)
      .sort((a, b) => b.reportCount - a.reportCount)
      .slice(0, 10)
      .map(item => ({
        id: item.shop.id,
        url: item.shop.url,
        name: item.shop.name || '알 수 없는 쇼핑몰',
        reportCount: item.reportCount
      }));

    res.json(topDangerous);
  } catch (error) {
    console.error('위험 페이지 조회 오류:', error);
    res.status(500).json({ success: false, message: '위험 페이지 조회 실패' });
  }
});

// 고평점 페이지 조회
app.get('/api/top-rated-pages', async (req, res) => {
  try {
    const { data: shopRatings, error } = await supabase
      .from('ratings')
      .select(`shop_id, rating, shops!inner (id, url, name)`);

    if (error) throw error;

    const ratingData = {};
    shopRatings.forEach(rate => {
      const shopId = rate.shop_id;
      if (!ratingData[shopId]) {
        ratingData[shopId] = { shop: rate.shops, ratings: [] };
      }
      ratingData[shopId].ratings.push(rate.rating);
    });

    const topRated = Object.values(ratingData)
      .map(item => {
        const totalRating = item.ratings.reduce((sum, rating) => sum + rating, 0);
        const averageRating = totalRating / item.ratings.length;
        return {
          id: item.shop.id,
          url: item.shop.url,
          name: item.shop.name || '알 수 없는 쇼핑몰',
          averageRating: Number(averageRating.toFixed(1)),
          totalRatings: item.ratings.length
        };
      })
      .sort((a, b) => b.averageRating - a.averageRating)
      .slice(0, 10);

    res.json(topRated);
  } catch (error) {
    console.error('고평점 페이지 조회 오류:', error);
    res.status(500).json({ success: false, message: '고평점 페이지 조회 실패' });
  }
});

// 평점 데이터 초기화
app.delete('/api/ratings/reset', async (req, res) => {
  try {
    const { error } = await supabase.from('ratings').delete().neq('id', 0);
    if (error) throw error;
    
    res.json({ success: true, message: '평점 데이터 초기화 완료' });
  } catch (error) {
    console.error('평점 데이터 초기화 오류:', error);
    res.status(500).json({ success: false, message: '평점 데이터 초기화 실패' });
  }
});

// ==================== 관리자 API ====================

// 전체 쇼핑몰 조회
app.get('/api/admin/shops', async (req, res) => {
  try {
    const { data: shops, error } = await supabase
      .from('shops')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ success: true, shops: shops || [] });
  } catch (error) {
    console.error('쇼핑몰 조회 오류:', error);
    res.status(500).json({ success: false, message: '쇼핑몰 조회 실패' });
  }
});

// 쇼핑몰 이름 수정
app.put('/api/admin/shops/:shopId', async (req, res) => {
  try {
    const { shopId } = req.params;
    const { name } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ success: false, message: '쇼핑몰 이름을 입력해주세요.' });
    }

    const { data, error } = await supabase
      .from('shops')
      .update({ name: name.trim() })
      .eq('id', shopId)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, message: '쇼핑몰 이름이 수정되었습니다.', shop: data });
  } catch (error) {
    console.error('쇼핑몰 이름 수정 오류:', error);
    res.status(500).json({ success: false, message: '쇼핑몰 이름 수정 실패' });
  }
});

// 쇼핑몰 삭제
app.delete('/api/admin/shops/:shopId', async (req, res) => {
  try {
    const { shopId } = req.params;

    // 연관된 신고, 평점 먼저 삭제
    await Promise.all([
      supabase.from('reports').delete().eq('shop_id', shopId),
      supabase.from('ratings').delete().eq('shop_id', shopId)
    ]);

    // 쇼핑몰 삭제
    const { error } = await supabase
      .from('shops')
      .delete()
      .eq('id', shopId);

    if (error) throw error;

    res.json({ success: true, message: '쇼핑몰이 삭제되었습니다.' });
  } catch (error) {
    console.error('쇼핑몰 삭제 오류:', error);
    res.status(500).json({ success: false, message: '쇼핑몰 삭제 실패' });
  }
});

// 전체 신고 조회
app.get('/api/admin/reports', async (req, res) => {
  try {
    const { data: reports, error } = await supabase
      .from('reports')
      .select(`
        *,
        shops (id, url, name)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ success: true, reports: reports || [] });
  } catch (error) {
    console.error('신고 조회 오류:', error);
    res.status(500).json({ success: false, message: '신고 조회 실패' });
  }
});

// 신고 삭제
app.delete('/api/admin/reports/:reportId', async (req, res) => {
  try {
    const { reportId } = req.params;

    const { error } = await supabase
      .from('reports')
      .delete()
      .eq('id', reportId);

    if (error) throw error;

    res.json({ success: true, message: '신고가 삭제되었습니다.' });
  } catch (error) {
    console.error('신고 삭제 오류:', error);
    res.status(500).json({ success: false, message: '신고 삭제 실패' });
  }
});

// 전체 평점 조회
app.get('/api/admin/ratings', async (req, res) => {
  try {
    const { data: ratings, error } = await supabase
      .from('ratings')
      .select(`
        *,
        shops (id, url, name)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ success: true, ratings: ratings || [] });
  } catch (error) {
    console.error('평점 조회 오류:', error);
    res.status(500).json({ success: false, message: '평점 조회 실패' });
  }
});

// 평점 삭제
app.delete('/api/admin/ratings/:ratingId', async (req, res) => {
  try {
    const { ratingId } = req.params;

    const { error } = await supabase
      .from('ratings')
      .delete()
      .eq('id', ratingId);

    if (error) throw error;

    res.json({ success: true, message: '평점이 삭제되었습니다.' });
  } catch (error) {
    console.error('평점 삭제 오류:', error);
    res.status(500).json({ success: false, message: '평점 삭제 실패' });
  }
});

// 전체 사용자 조회
app.get('/api/admin/users', async (req, res) => {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, username, email, phone_number, created_at')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ success: true, users: users || [] });
  } catch (error) {
    console.error('사용자 조회 오류:', error);
    res.status(500).json({ success: false, message: '사용자 조회 실패' });
  }
});

// 데이터베이스 통계
app.get('/api/admin/stats', async (req, res) => {
  try {
    const [
      shopsResult,
      reportsResult,
      ratingsResult,
      usersResult
    ] = await Promise.all([
      supabase.from('shops').select('id', { count: 'exact', head: true }),
      supabase.from('reports').select('id', { count: 'exact', head: true }),
      supabase.from('ratings').select('id', { count: 'exact', head: true }),
      supabase.from('users').select('id', { count: 'exact', head: true })
    ]);

    res.json({
      success: true,
      stats: {
        totalShops: shopsResult.count || 0,
        totalReports: reportsResult.count || 0,
        totalRatings: ratingsResult.count || 0,
        totalUsers: usersResult.count || 0
      }
    });
  } catch (error) {
    console.error('통계 조회 오류:', error);
    res.status(500).json({ success: false, message: '통계 조회 실패' });
  }
});

// 쇼핑몰 병합 (양방향 병합 - 두 쇼핑몰의 데이터를 실제로 합침)
app.post('/api/admin/shops/merge', async (req, res) => {
  try {
    const { parentId, childId } = req.body;

    if (!parentId || !childId) {
      return res.status(400).json({ success: false, message: '부모와 자식 쇼핑몰 ID가 필요합니다.' });
    }

    if (parentId === childId) {
      return res.status(400).json({ success: false, message: '같은 쇼핑몰은 병합할 수 없습니다.' });
    }

    // 부모와 자식 쇼핑몰 존재 확인
    const { data: parentShop, error: parentError } = await supabase
      .from('shops')
      .select('*')
      .eq('id', parentId)
      .single();

    const { data: childShop, error: childError } = await supabase
      .from('shops')
      .select('*')
      .eq('id', childId)
      .single();

    if (parentError || childError) {
      return res.status(404).json({ success: false, message: '쇼핑몰을 찾을 수 없습니다.' });
    }

    // 자식이 이미 다른 부모를 가지고 있는지 확인
    if (childShop.parent_shop_id) {
      return res.status(400).json({ success: false, message: '이미 병합된 쇼핑몰입니다.' });
    }

    // 부모가 다른 쇼핑몰의 자식인지 확인
    if (parentShop.parent_shop_id) {
      return res.status(400).json({ success: false, message: '부모 쇼핑몰이 다른 쇼핑몰에 병합되어 있습니다.' });
    }

    console.log(`병합 시작: Child ID ${childId} -> Parent ID ${parentId}`);

    // 1. Child의 모든 reports를 Parent로 이동
    const { data: childReports, error: reportsSelectError } = await supabase
      .from('reports')
      .select('*')
      .eq('shop_id', childId);

    if (reportsSelectError) throw reportsSelectError;

    if (childReports && childReports.length > 0) {
      console.log(`${childReports.length}개의 신고를 이동합니다.`);
      const { error: reportsUpdateError } = await supabase
        .from('reports')
        .update({ shop_id: parentId })
        .eq('shop_id', childId);

      if (reportsUpdateError) throw reportsUpdateError;
    }

    // 2. Child의 모든 ratings를 Parent로 이동
    const { data: childRatings, error: ratingsSelectError } = await supabase
      .from('ratings')
      .select('*')
      .eq('shop_id', childId);

    if (ratingsSelectError) throw ratingsSelectError;

    if (childRatings && childRatings.length > 0) {
      console.log(`${childRatings.length}개의 평점을 이동합니다.`);
      const { error: ratingsUpdateError } = await supabase
        .from('ratings')
        .update({ shop_id: parentId })
        .eq('shop_id', childId);

      if (ratingsUpdateError) throw ratingsUpdateError;
    }

    // 3. Child 쇼핑몰에 parent_shop_id 설정
    const { error: updateError } = await supabase
      .from('shops')
      .update({ parent_shop_id: parentId })
      .eq('id', childId);

    if (updateError) throw updateError;

    console.log(`병합 완료: ${childReports?.length || 0}개 신고, ${childRatings?.length || 0}개 평점 이동`);

    res.json({ 
      success: true, 
      message: '쇼핑몰이 병합되었습니다. 모든 데이터가 통합되어 두 URL에서 동일한 정보를 볼 수 있습니다.',
      details: {
        movedReports: childReports?.length || 0,
        movedRatings: childRatings?.length || 0
      }
    });
  } catch (error) {
    console.error('쇼핑몰 병합 오류:', error);
    res.status(500).json({ success: false, message: '쇼핑몰 병합 실패: ' + error.message });
  }
});

// CORS 에러 처리
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// AI 분석 라우터 등록
app.use('/api/ai', aiAnalysisRoutes);

// 커뮤니티 라우터 등록
app.use('/api/community', communityRoutes);

// 위험 쇼핑몰 목록 조회 (신고 많은 순)
app.get('/api/dangerous-shops', async (req, res) => {
  try {
    // 검색된 쇼핑몰만 조회 (search_count > 0)
    const { data: shops, error } = await supabase
      .from('shops')
      .select('*')
      .gt('search_count', 0);

    if (error) throw error;

    // 각 쇼핑몰의 신고 수와 평점 계산
    const shopsWithStats = await Promise.all(
      shops.map(async (shop) => {
        // 신고 수 조회
        const { count: reportCount } = await supabase
          .from('reports')
          .select('*', { count: 'exact', head: true })
          .eq('shop_id', shop.id);

        // 평점 조회
        const { data: ratings } = await supabase
          .from('ratings')
          .select('rating')
          .eq('shop_id', shop.id);

        const ratingCount = ratings?.length || 0;
        const averageRating = ratingCount > 0 
          ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratingCount 
          : 0;

        return {
          ...shop,
          reportCount: reportCount || 0,
          averageRating,
          ratingCount
        };
      })
    );

    // 신고 수 기준으로 정렬
    const sortedShops = shopsWithStats.sort((a, b) => b.reportCount - a.reportCount);

    res.json({ success: true, shops: sortedShops });
  } catch (error) {
    console.error('위험 쇼핑몰 조회 오류:', error);
    res.status(500).json({ error: '위험 쇼핑몰 조회 실패: ' + error.message });
  }
});

// 추천 쇼핑몰 목록 조회 (고평점 순)
app.get('/api/recommended-shops', async (req, res) => {
  try {
    // 검색된 쇼핑몰만 조회 (search_count > 0)
    const { data: shops, error } = await supabase
      .from('shops')
      .select('*')
      .gt('search_count', 0);

    if (error) throw error;

    // 각 쇼핑몰의 신고 수와 평점 계산
    const shopsWithStats = await Promise.all(
      shops.map(async (shop) => {
        // 신고 수 조회
        const { count: reportCount } = await supabase
          .from('reports')
          .select('*', { count: 'exact', head: true })
          .eq('shop_id', shop.id);

        // 평점 조회
        const { data: ratings } = await supabase
          .from('ratings')
          .select('rating')
          .eq('shop_id', shop.id);

        const ratingCount = ratings?.length || 0;
        const averageRating = ratingCount > 0 
          ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratingCount 
          : 0;

        return {
          ...shop,
          reportCount: reportCount || 0,
          averageRating,
          ratingCount
        };
      })
    );

    // 평점 기준으로 정렬 (검색된 쇼핑몰만)
    const sortedShops = shopsWithStats.sort((a, b) => b.averageRating - a.averageRating);

    res.json({ success: true, shops: sortedShops });
  } catch (error) {
    console.error('추천 쇼핑몰 조회 오류:', error);
    res.status(500).json({ error: '추천 쇼핑몰 조회 실패: ' + error.message });
  }
});

// 테스트 이메일 발송 API (개발용)
app.post('/api/test-email', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: '이메일 주소를 입력해주세요.' });
    }
    
    console.log(`\n=== 테스트 이메일 발송 시작 ===`);
    console.log(`받는 사람: ${email}`);
    console.log(`발신자: ${process.env.GMAIL_USER}`);
    
    const testResetLink = 'http://localhost:5173/reset-password?token=test123';
    await sendPasswordResetEmail(email, testResetLink);
    
    console.log(`✅ 테스트 이메일 전송 완료`);
    console.log(`===============================\n`);
    
    res.json({ success: true, message: '테스트 이메일이 발송되었습니다.' });
  } catch (error) {
    console.error(`❌ 테스트 이메일 전송 실패:`, error);
    res.status(500).json({ error: `이메일 전송 실패: ${error.message}` });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Server accessible at http://0.0.0.0:${PORT}`);
  console.log(`External access: http://172.30.1.97:${PORT}`);
  console.log(`CORS enabled for all origins`);
});
