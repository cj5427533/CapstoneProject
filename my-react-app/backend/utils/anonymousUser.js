/**
 * 익명 사용자 관련 유틸리티
 */
const supabase = require('../config/supabase');

let cachedAnonymousUserId = null;

/**
 * 익명 사용자 ID 가져오기 (캐싱)
 * 
 * 주의: 이 사용자는 삭제하면 안 됩니다.
 * - 이메일: anonymous@system.local
 * - 사용자명: anonymous
 * - 상태: anonymous
 */
async function getAnonymousUserId() {
  // 캐시된 값이 있으면 반환
  if (cachedAnonymousUserId) {
    return cachedAnonymousUserId;
  }

  try {
    const { data: anonymousUser, error } = await supabase
      .from('users')
      .select('id')
      .eq('email', 'anonymous@system.local')
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('익명 사용자 조회 에러:', error);
      throw new Error('익명 사용자를 찾을 수 없습니다.');
    }

    if (!anonymousUser) {
      // 익명 사용자가 없으면 생성 시도 (하지만 마이그레이션에서 이미 생성했어야 함)
      throw new Error('익명 사용자가 데이터베이스에 존재하지 않습니다. 마이그레이션 003을 실행해주세요.');
    }

    // 캐시에 저장
    cachedAnonymousUserId = anonymousUser.id;
    return cachedAnonymousUserId;
  } catch (error) {
    console.error('익명 사용자 ID 가져오기 실패:', error);
    throw error;
  }
}

/**
 * 익명 사용자 삭제 방지 체크
 */
async function checkIsAnonymousUser(userId) {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, status')
      .eq('id', userId)
      .single();

    if (error) return false;

    return user && (user.email === 'anonymous@system.local' || user.status === 'anonymous');
  } catch {
    return false;
  }
}

/**
 * 사용자 ID가 없으면 익명 사용자 ID로 변환
 */
async function ensureUserId(userId) {
  if (userId) {
    return userId;
  }
  return await getAnonymousUserId();
}

module.exports = {
  getAnonymousUserId,
  ensureUserId,
  checkIsAnonymousUser
};

