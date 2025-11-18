/**
 * 인증 관련 컨트롤러
 */
const userService = require('../services/userService');
const smsService = require('../services/smsService');
const { success, error } = require('../utils/response');
const { sanitizeInput, validateEmail, validatePhoneNumber } = require('../utils/validation');
const supabase = require('../config/supabase');
const { generateToken } = require('../utils/jwt');
const verifyTokenMiddleware = require('../middleware/verifyToken');

/**
 * SMS 인증번호 발송
 */
exports.sendSMS = async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    
    if (!phoneNumber) {
      return error(res, '전화번호가 필요합니다.', 400);
    }

    const cleanPhoneNumber = sanitizeInput(phoneNumber);
    if (!validatePhoneNumber(cleanPhoneNumber)) {
      return error(res, '올바른 휴대폰 번호를 입력해주세요.', 400);
    }

    const ipAddress = req.ip || req.connection.remoteAddress;
    await smsService.checkRateLimit(phoneNumber, ipAddress);

    // 6자리 인증번호 생성
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const message = `[여기몰까] 인증번호: ${verificationCode}`;
    
    await smsService.sendSMS(phoneNumber, message, ipAddress);

    // Supabase에 인증 정보 저장
    const expiresAt = new Date(Date.now() + 3 * 60 * 1000).toISOString();
    const { error: dbError } = await supabase
      .from('sms_verifications')
      .insert({
        phone_number: cleanPhoneNumber,
        verification_code: verificationCode,
        is_verified: false,
        expires_at: expiresAt
      });

    if (dbError) throw dbError;

    return success(res, { message: `인증번호가 발송되었습니다. ${phoneNumber}` });
  } catch (err) {
    console.error('SMS 발송 오류:', err);
    return error(res, `인증번호 발송에 실패했습니다. ${err.message}`, 500);
  }
};

/**
 * SMS 인증번호 확인
 */
exports.verifySMS = async (req, res) => {
  try {
    const { phoneNumber, verificationCode } = req.body;
    
    if (!phoneNumber || !verificationCode) {
      return error(res, '전화번호와 인증번호가 필요합니다.', 400);
    }

    const { data: verification, error: dbError } = await supabase
      .from('sms_verifications')
      .select('*')
      .eq('phone_number', phoneNumber)
      .eq('verification_code', verificationCode)
      .order('created_at', { ascending: false })
      .limit(1);

    if (dbError) throw dbError;
    
    if (!verification || verification.length === 0) {
      return error(res, '유효하지 않은 인증번호입니다.', 400);
    }

    const verificationData = verification[0];
    
    if (verificationData.is_verified) {
      return error(res, '이미 사용된 인증번호입니다.', 400);
    }

    if (new Date() > new Date(verificationData.expires_at)) {
      return error(res, '인증번호가 만료되었습니다.', 400);
    }

    // 인증 성공 처리
    const { error: updateError } = await supabase
      .from('sms_verifications')
      .update({ is_verified: true })
      .eq('id', verificationData.id);

    if (updateError) throw updateError;
    
    return success(res, { message: '인증이 완료되었습니다.' });
  } catch (err) {
    console.error('인증 확인 오류:', err);
    return error(res, `인증 확인에 실패했습니다. ${err.message}`, 500);
  }
};

/**
 * 회원가입
 */
exports.register = async (req, res) => {
  try {
    const { username, email, password, phoneNumber, verificationCode } = req.body;
    
    if (!username || !email || !password || !phoneNumber || !verificationCode) {
      return error(res, '모든 필드를 입력해주세요.', 400);
    }

    const cleanUsername = sanitizeInput(username);
    const cleanEmail = sanitizeInput(email);
    const cleanPhoneNumber = sanitizeInput(phoneNumber);
    const cleanVerificationCode = sanitizeInput(verificationCode);

    if (cleanUsername.length < 2 || cleanUsername.length > 20) {
      return error(res, '사용자명은 2-20자 사이여야 합니다.', 400);
    }

    if (!validateEmail(cleanEmail)) {
      return error(res, '올바른 이메일 형식을 입력해주세요.', 400);
    }

    if (password.length < 6) {
      return error(res, '비밀번호는 6자 이상이어야 합니다.', 400);
    }

    if (!validatePhoneNumber(cleanPhoneNumber)) {
      return error(res, '올바른 휴대폰 번호를 입력해주세요.', 400);
    }

    if (!/^\d{6}$/.test(cleanVerificationCode)) {
      return error(res, '인증번호는 6자리 숫자여야 합니다.', 400);
    }

    const user = await userService.registerUser({
      username: cleanUsername,
      email: cleanEmail,
      password,
      phoneNumber: cleanPhoneNumber,
      verificationCode: cleanVerificationCode
    });

    return success(res, { 
      user 
    }, '회원가입이 완료되었습니다.', 201);
  } catch (err) {
    console.error('회원가입 오류:', err);
    return error(res, `회원가입에 실패했습니다. ${err.message}`, 500);
  }
};

/**
 * 로그인
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return error(res, '이메일과 비밀번호를 입력해주세요.', 400);
    }

    const cleanEmail = sanitizeInput(email);
    const result = await userService.loginUser(cleanEmail, password);

    return success(res, result, '로그인 성공');
  } catch (err) {
    console.error('로그인 오류:', err);
    return error(res, `로그인에 실패했습니다. ${err.message}`, 401);
  }
};

/**
 * 사용자명 중복 확인
 */
exports.checkUsername = async (req, res) => {
  try {
    const { username } = req.body;
    
    if (!username) {
      return error(res, '사용자명이 필요합니다.', 400);
    }

    const cleanUsername = sanitizeInput(username);

    if (cleanUsername.length < 2) {
      return success(res, { 
        available: false,
        message: '사용자명은 최소 2자 이상이어야 합니다.' 
      });
    }

    if (cleanUsername.length > 20) {
      return success(res, { 
        available: false,
        message: '사용자명은 최대 20자까지 가능합니다.' 
      });
    }

    const isAvailable = await userService.checkUsername(cleanUsername);

    return success(res, { 
      available: isAvailable,
      message: isAvailable ? '사용 가능한 사용자명입니다.' : '이미 사용 중인 사용자명입니다.' 
    });
  } catch (err) {
    console.error('사용자명 중복 확인 오류:', err);
    return error(res, `사용자명 중복 확인에 실패했습니다. ${err.message}`, 500);
  }
};

/**
 * 비밀번호 재설정 요청
 */
exports.requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return error(res, '이메일을 입력해주세요.', 400);
    }

    await userService.requestPasswordReset(email);

    return success(res, { 
      message: '비밀번호 재설정 링크가 이메일로 전송되었습니다.' 
    });
  } catch (err) {
    console.error('비밀번호 재설정 요청 오류:', err);
    return error(res, err.message, 404);
  }
};

/**
 * 비밀번호 재설정
 */
exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword) {
      return error(res, '토큰과 새 비밀번호가 필요합니다.', 400);
    }

    if (newPassword.length < 6) {
      return error(res, '비밀번호는 6자 이상이어야 합니다.', 400);
    }

    await userService.resetPassword(token, newPassword);

    return success(res, { 
      message: '비밀번호가 성공적으로 재설정되었습니다.' 
    });
  } catch (err) {
    console.error('비밀번호 재설정 오류:', err);
    return error(res, err.message, 400);
  }
};

/**
 * 현재 사용자 정보 조회
 */
exports.getMe = [verifyTokenMiddleware, async (req, res) => {
  try {
    // DB에서 최신 사용자 정보 조회 (role 포함)
    const { data: user, error: dbError } = await supabase
      .from('users')
      .select('id, username, email, phone_number, role, status')
      .eq('id', req.user.id)
      .single();

    if (dbError) throw dbError;

    if (!user) {
      return error(res, '사용자를 찾을 수 없습니다.', 404);
    }

    // 프론트엔드 형식에 맞게 변환
    const userData = {
      id: user.id,
      username: user.username,
      email: user.email,
      phoneNumber: user.phone_number,
      role: user.role || 'user',
      status: user.status || 'active'
    };

    return success(res, { user: userData });
  } catch (err) {
    console.error('사용자 정보 조회 오류:', err);
    return error(res, '사용자 정보 조회 실패', 500);
  }
}];

/**
 * 사용자 탈퇴 (CASCADE 전략 변경 대응)
 * DELETE 대신 status를 'deleted'로 변경
 */
exports.deleteAccount = [verifyTokenMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    
    await userService.deleteUser(userId);
    
    return success(res, null, '계정이 탈퇴 처리되었습니다.');
  } catch (err) {
    console.error('계정 탈퇴 오류:', err);
    return error(res, `계정 탈퇴에 실패했습니다. ${err.message}`, 500);
  }
}];

