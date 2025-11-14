/**
 * 사용자 관련 서비스
 */
const supabase = require('../config/supabase');
const { hashPassword, verifyPassword } = require('../utils/password');
const { generateToken } = require('../utils/jwt');
const { sendPasswordResetEmail } = require('./emailService');
const crypto = require('crypto');

/**
 * 사용자 등록
 */
async function registerUser(userData) {
  const { username, email, password, phoneNumber, verificationCode } = userData;

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
    throw new Error('인증번호가 올바르지 않거나 만료되었습니다.');
  }

  // 중복 사용자 확인
  const { data: existingUser, error: userCheckError } = await supabase
    .from('users')
    .select('id')
    .or(`username.eq.${username},email.eq.${email},phone_number.eq.${phoneNumber}`);

  if (userCheckError) throw userCheckError;
  
  if (existingUser && existingUser.length > 0) {
    throw new Error('이미 존재하는 사용자입니다.');
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

  return {
    id: newUser.id,
    username: newUser.username,
    email: newUser.email,
    phoneNumber: newUser.phone_number
  };
}

/**
 * 사용자 로그인
 */
async function loginUser(email, password) {
  // 사용자 조회
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single();

  if (error) throw error;
  
  if (!user) {
    throw new Error('이메일 또는 비밀번호가 올바르지 않습니다.');
  }

  // 비밀번호 확인
  if (!verifyPassword(password, user.password)) {
    throw new Error('이메일 또는 비밀번호가 올바르지 않습니다.');
  }

  // JWT 토큰 생성
  const token = generateToken(user);

  return {
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      phoneNumber: user.phone_number
    }
  };
}

/**
 * 사용자명 중복 확인
 */
async function checkUsername(username) {
  const { data: existingUser, error } = await supabase
    .from('users')
    .select('id')
    .eq('username', username)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw error;
  }

  return !existingUser;
}

/**
 * 비밀번호 재설정 요청
 */
async function requestPasswordReset(email) {
  // 사용자 조회
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single();

  if (error || !user) {
    throw new Error('존재하지 않는 이메일입니다. 가입된 이메일 주소를 입력해주세요.');
  }

  // 재설정 토큰 생성
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
  await sendPasswordResetEmail(email, resetLink);

  return { success: true };
}

/**
 * 비밀번호 재설정
 */
async function resetPassword(token, newPassword) {
  // 토큰 확인
  const { data: tokenData, error: tokenError } = await supabase
    .from('password_reset_tokens')
    .select('*')
    .eq('token', token)
    .eq('used', false)
    .single();

  if (tokenError || !tokenData) {
    throw new Error('유효하지 않거나 만료된 토큰입니다.');
  }

  // 만료 시간 확인
  if (new Date() > new Date(tokenData.expires_at)) {
    throw new Error('토큰이 만료되었습니다. 다시 요청해주세요.');
  }

  // 비밀번호 업데이트
  const { error: updateError } = await supabase
    .from('users')
    .update({ password: hashPassword(newPassword) })
    .eq('id', tokenData.user_id);

  if (updateError) throw updateError;

  // 토큰 사용 처리
  await supabase
    .from('password_reset_tokens')
    .update({ used: true })
    .eq('id', tokenData.id);

  return { success: true };
}

module.exports = {
  registerUser,
  loginUser,
  checkUsername,
  requestPasswordReset,
  resetPassword
};

