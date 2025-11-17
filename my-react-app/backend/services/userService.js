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
      phone_number: phoneNumber,
      status: 'active' // 기본 상태: active
    })
    .select('id, username, email, phone_number, status')
    .single();

  if (insertError) throw insertError;

  return {
    id: newUser.id,
    username: newUser.username,
    email: newUser.email,
    phoneNumber: newUser.phone_number,
    status: newUser.status || 'active'
  };
}

/**
 * 사용자 로그인
 */
async function loginUser(email, password) {
  // 사용자 조회 (탈퇴한 사용자는 제외)
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .neq('status', 'deleted') // 탈퇴한 사용자는 로그인 불가
    .single();

  if (error && error.code === 'PGRST116') {
    throw new Error('이메일 또는 비밀번호가 올바르지 않습니다.');
  }
  
  if (error) throw error;
  
  if (!user) {
    throw new Error('이메일 또는 비밀번호가 올바르지 않습니다.');
  }

  // 탈퇴한 사용자 확인
  if (user.status === 'deleted' || user.status === 'unregistered') {
    throw new Error('탈퇴한 계정입니다.');
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
      phoneNumber: user.phone_number,
      status: user.status || 'active'
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
    .neq('status', 'deleted'); // 탈퇴한 사용자는 제외

  if (error) throw error;

  return !existingUser || existingUser.length === 0;
}

/**
 * 비밀번호 재설정 요청
 */
async function requestPasswordReset(email) {
  const { data: user, error } = await supabase
    .from('users')
    .select('id, email, username')
    .eq('email', email)
    .neq('status', 'deleted') // 탈퇴한 사용자는 제외
    .single();

  if (error || !user) {
    throw new Error('해당 이메일로 등록된 사용자를 찾을 수 없습니다.');
  }

  // 토큰 생성
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 1); // 1시간 후 만료

  // 기존 토큰 삭제
  await supabase
    .from('password_reset_tokens')
    .delete()
    .eq('user_id', user.id);

  // 새 토큰 저장
  const { error: insertError } = await supabase
    .from('password_reset_tokens')
    .insert({
      user_id: user.id,
      token,
      expires_at: expiresAt.toISOString(),
      used: false
    });

  if (insertError) throw insertError;

  // 이메일 발송
  await sendPasswordResetEmail(user.email, token);

  return { token };
}

/**
 * 비밀번호 재설정
 */
async function resetPassword(token, newPassword) {
  const { data: resetToken, error: tokenError } = await supabase
    .from('password_reset_tokens')
    .select('*, users!inner(id, email)')
    .eq('token', token)
    .eq('used', false)
    .single();

  if (tokenError || !resetToken) {
    throw new Error('유효하지 않거나 만료된 토큰입니다.');
  }

  if (new Date() > new Date(resetToken.expires_at)) {
    throw new Error('토큰이 만료되었습니다.');
  }

  // 비밀번호 업데이트
  const { error: updateError } = await supabase
    .from('users')
    .update({ password: hashPassword(newPassword) })
    .eq('id', resetToken.user_id);

  if (updateError) throw updateError;

  // 토큰 사용 처리
  await supabase
    .from('password_reset_tokens')
    .update({ used: true })
    .eq('id', resetToken.id);

  return { success: true };
}

/**
 * 사용자 탈퇴 (CASCADE 전략 변경 대응)
 * DELETE 대신 status를 'deleted'로 변경
 */
async function deleteUser(userId) {
  // 익명 사용자는 삭제 불가
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, email, status')
    .eq('id', userId)
    .single();

  if (userError) throw userError;
  
  if (!user) {
    throw new Error('사용자를 찾을 수 없습니다.');
  }

  // 익명 사용자는 삭제 불가
  if (user.email === 'anonymous@system.local' || user.status === 'anonymous') {
    throw new Error('익명 사용자는 삭제할 수 없습니다.');
  }

  // DELETE 대신 status를 'deleted'로 변경
  const { error: updateError } = await supabase
    .from('users')
    .update({ 
      status: 'deleted',
      updated_at: new Date().toISOString()
    })
    .eq('id', userId);

  if (updateError) throw updateError;

  return { success: true };
}

module.exports = {
  registerUser,
  loginUser,
  checkUsername,
  requestPasswordReset,
  resetPassword,
  deleteUser
};
