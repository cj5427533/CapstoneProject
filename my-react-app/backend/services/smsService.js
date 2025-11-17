/**
 * SMS 발송 서비스
 */
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://tqdvolgachfszomwhlfe.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const SMS_CONFIG = {
  solApiKey: process.env.SOLAPI_KEY,
  solApiSecret: process.env.SOLAPI_SECRET,
  solApiFromNumber: process.env.SOLAPI_FROM_NUMBER,
  smsProvider: process.env.SMS_PROVIDER || 'solapi'
};

/**
 * SolAPI HMAC-SHA256 인증 헤더 생성
 */
function generateSolAPISignature(apiSecret, dateTime, salt) {
  if (!apiSecret) {
    throw new Error('SolAPI Secret이 설정되지 않았습니다. 환경 변수 SOLAPI_SECRET을 확인하세요.');
  }
  const data = dateTime + salt;
  return crypto.createHmac('sha256', apiSecret).update(data).digest('hex');
}

/**
 * SolAPI 인증 헤더 생성
 */
function createSolAPIAuthHeader() {
  if (!SMS_CONFIG.solApiKey || !SMS_CONFIG.solApiSecret) {
    throw new Error('SolAPI 설정이 완료되지 않았습니다. SOLAPI_KEY와 SOLAPI_SECRET 환경 변수를 확인하세요.');
  }
  const dateTime = new Date().toISOString();
  const salt = crypto.randomBytes(16).toString('hex');
  const signature = generateSolAPISignature(SMS_CONFIG.solApiSecret, dateTime, salt);
  
  return `HMAC-SHA256 apiKey=${SMS_CONFIG.solApiKey}, date=${dateTime}, salt=${salt}, signature=${signature}`;
}

/**
 * SMS 발송 (SolAPI)
 */
async function sendSolAPI(phoneNumber, message) {
  if (!SMS_CONFIG.solApiKey || !SMS_CONFIG.solApiSecret) {
    throw new Error('SolAPI 설정이 완료되지 않았습니다. SOLAPI_KEY와 SOLAPI_SECRET 환경 변수를 확인하세요.');
  }
  if (!SMS_CONFIG.solApiFromNumber) {
    throw new Error('SolAPI 발신번호가 설정되지 않았습니다. SOLAPI_FROM_NUMBER 환경 변수를 확인하세요.');
  }

  const fetch = await import('node-fetch');
  
  const body = {
    message: {
      to: phoneNumber,
      from: SMS_CONFIG.solApiFromNumber,
      text: message,
      type: 'SMS'
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

/**
 * 레이트 리밋 확인
 */
async function checkRateLimit(phoneNumber, ipAddress) {
  const now = new Date();
  
  try {
    const { data: rateLimits, error } = await supabase
      .from('sms_request_logs')
      .select('*')
      .eq('phone_number', phoneNumber)
      .order('last_sent_at', { ascending: false })
      .limit(1);

    if (error) throw error;

    // 새로운 제한 기록이 없으면 생성
    if (!rateLimits || rateLimits.length === 0) {
      const { error: insertError } = await supabase
        .from('sms_request_logs')
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
        .from('sms_request_logs')
        .update({ 
          sent_count: rateLimit.sent_count + 1,
          last_sent_at: now.toISOString(),
          updated_at: now.toISOString()
        })
        .eq('id', rateLimit.id);
      
      if (updateError) throw updateError;
    } else {
      // 1분이 지났으면 카운트 리셋
      const { error: updateError } = await supabase
        .from('sms_request_logs')
        .update({ 
          sent_count: 1,
          last_sent_at: now.toISOString(),
          updated_at: now.toISOString()
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

/**
 * SMS 발송 (레이트 리밋 포함)
 */
async function sendSMS(phoneNumber, message, ipAddress) {
  // 레이트 리밋 확인
  await checkRateLimit(phoneNumber, ipAddress);

  if (SMS_CONFIG.smsProvider === 'solapi') {
    return await sendSolAPI(phoneNumber, message);
  } else {
    // 개발 모드
    console.log(`[개발모드] SMS 발송: ${phoneNumber}, 메시지: ${message}`);
    return { success: true };
  }
}

module.exports = {
  sendSMS,
  checkRateLimit,
  sendSolAPI
};

