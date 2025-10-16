const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

// Supabase 클라이언트
const supabaseUrl = process.env.SUPABASE_URL || 'https://tqdvolgachfszomwhlfe.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// JWT 설정
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// 유틸리티 함수들
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  return input
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
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

const hashPassword = (password) => {
  return crypto.createHash('sha256').update(password).digest('hex');
};

const verifyPassword = (password, hashedPassword) => {
  return hashPassword(password) === hashedPassword;
};

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

// SMS 인증번호 발송
router.post('/send-sms', async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    
    if (!phoneNumber) {
      return res.status(400).json({ error: '전화번호가 필요합니다.' });
    }

    const cleanPhoneNumber = sanitizeInput(phoneNumber);
    if (!validatePhoneNumber(cleanPhoneNumber)) {
      return res.status(400).json({ error: '올바른 휴대폰 번호를 입력해주세요.' });
    }

    // 레이트 리밋 확인 (간단한 구현)
    const { data: rateLimits } = await supabase
      .from('sms_rate_limits')
      .select('*')
      .eq('phone_number', cleanPhoneNumber)
      .order('last_sent_at', { ascending: false })
      .limit(1);

    if (rateLimits && rateLimits.length > 0) {
      const lastSent = new Date(rateLimits[0].last_sent_at);
      const now = new Date();
      if (now - lastSent < 60000 && rateLimits[0].sent_count >= 5) {
        return res.status(429).json({ error: '1분 후 다시 시도해주세요.' });
      }
    }

    // 6자리 인증번호 생성
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // SMS 발송 (실제 구현은 SMS 서비스 연동 필요)
    console.log(`SMS 발송: ${cleanPhoneNumber}, 인증번호: ${verificationCode}`);
    
    // Supabase에 인증 정보 저장
    const { error } = await supabase
      .from('sms_verifications')
      .insert({
        phone_number: cleanPhoneNumber,
        verification_code: verificationCode,
        is_verified: false,
        expires_at: new Date(Date.now() + 3 * 60 * 1000).toISOString() // 3분 후 만료
      });

    if (error) throw error;

    res.json({ 
      success: true, 
      message: `인증번호가 발송되었습니다. ${cleanPhoneNumber}`
    });
    
  } catch (error) {
    console.error('SMS 발송 오류:', error);
    res.status(500).json({ 
      error: `인증번호 발송에 실패했습니다. ${error.message}` 
    });
  }
});

// SMS 인증번호 확인
router.post('/verify-sms', async (req, res) => {
  try {
    const { phoneNumber, verificationCode } = req.body;
    
    if (!phoneNumber || !verificationCode) {
      return res.status(400).json({ error: '전화번호와 인증번호가 필요합니다.' });
    }

    const cleanPhoneNumber = sanitizeInput(phoneNumber);
    const cleanCode = sanitizeInput(verificationCode);

    // Supabase에서 인증 정보 조회
    const { data: verification, error } = await supabase
      .from('sms_verifications')
      .select('*')
      .eq('phone_number', cleanPhoneNumber)
      .eq('verification_code', cleanCode)
      .eq('is_verified', false)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) throw error;
    
    if (!verification || verification.length === 0) {
      return res.status(400).json({ error: '유효하지 않은 인증번호입니다.' });
    }

    const verificationData = verification[0];
    
    // 만료 시간 확인
    if (new Date() > new Date(verificationData.expires_at)) {
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
router.post('/register', async (req, res) => {
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

    // 사용자명 길이 검증
    if (cleanUsername.length < 2 || cleanUsername.length > 20) {
      return res.status(400).json({ error: '사용자명은 2-20자 사이여야 합니다.' });
    }

    // 이메일 형식 확인
    if (!validateEmail(cleanEmail)) {
      return res.status(400).json({ error: '올바른 이메일 형식을 입력해주세요.' });
    }

    // 비밀번호 길이 확인
    if (password.length < 6) {
      return res.status(400).json({ error: '비밀번호는 6자 이상이어야 합니다.' });
    }

    // 전화번호 형식 확인
    if (!validatePhoneNumber(cleanPhoneNumber)) {
      return res.status(400).json({ error: '올바른 휴대폰 번호를 입력해주세요.' });
    }

    // 인증번호 형식 확인
    if (!/^\d{6}$/.test(cleanVerificationCode)) {
      return res.status(400).json({ error: '인증번호는 6자리 숫자여야 합니다.' });
    }

    // SMS 인증 확인
    const { data: smsVerification, error: smsError } = await supabase
      .from('sms_verifications')
      .select('*')
      .eq('phone_number', cleanPhoneNumber)
      .eq('verification_code', cleanVerificationCode)
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
      .or(`username.eq.${cleanUsername},email.eq.${cleanEmail},phone_number.eq.${cleanPhoneNumber}`);

    if (userCheckError) throw userCheckError;
    
    if (existingUser && existingUser.length > 0) {
      return res.status(400).json({ error: '이미 존재하는 사용자입니다.' });
    }

    // 새 사용자 생성
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({
        username: cleanUsername,
        email: cleanEmail,
        password: hashPassword(password),
        phone_number: cleanPhoneNumber
      })
      .select('id, username, email, phone_number')
      .single();

    if (insertError) throw insertError;

    res.status(201).json({ 
      success: true, 
      message: '회원가입이 완료되었습니다.',
      user: newUser
    });
    
  } catch (error) {
    console.error('회원가입 오류:', error);
    res.status(500).json({ 
      error: `회원가입에 실패했습니다. ${error.message}` 
    });
  }
});

// 로그인
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: '이메일과 비밀번호를 입력해주세요.' });
    }

    const cleanEmail = sanitizeInput(email);

    // 사용자 조회
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', cleanEmail)
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

    res.json({ 
      success: true, 
      message: '로그인 성공',
      token: token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        phone_number: user.phone_number
      }
    });
    
  } catch (error) {
    console.error('로그인 오류:', error);
    res.status(500).json({ 
      error: `로그인에 실패했습니다. ${error.message}` 
    });
  }
});

// 사용자명 중복 확인
router.post('/check-username', async (req, res) => {
  try {
    const { username } = req.body;
    
    if (!username) {
      return res.status(400).json({ error: '사용자명이 필요합니다.' });
    }

    const cleanUsername = sanitizeInput(username);

    // 사용자명 길이 검증
    if (cleanUsername.length < 2) {
      return res.status(400).json({ 
        available: false,
        error: '사용자명은 최소 2자 이상이어야 합니다.' 
      });
    }

    if (cleanUsername.length > 20) {
      return res.status(400).json({ 
        available: false,
        error: '사용자명은 최대 20자까지 가능합니다.' 
      });
    }

    // 중복 확인
    const { data: existingUser, error } = await supabase
      .from('users')
      .select('id')
      .eq('username', cleanUsername)
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

module.exports = router;
