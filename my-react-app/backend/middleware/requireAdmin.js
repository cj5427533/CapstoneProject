/**
 * 관리자 권한 확인 미들웨어
 * verifyTokenMiddleware 이후에 사용해야 함
 */
const { error } = require('../utils/response');
const supabase = require('../config/supabase');

/**
 * 관리자 권한 확인 미들웨어
 * req.user가 있어야 함 (verifyTokenMiddleware 이후)
 */
const requireAdmin = async (req, res, next) => {
  try {
    // req.user가 없으면 verifyTokenMiddleware를 먼저 적용해야 함
    if (!req.user || !req.user.id) {
      return error(res, '인증이 필요합니다.', 401);
    }

    // JWT에서 role 확인 (빠른 체크)
    if (req.user.role === 'admin') {
      return next();
    }

    // DB에서 최신 role 정보 확인 (JWT가 오래되었을 수 있음)
    const { data: user, error: dbError } = await supabase
      .from('users')
      .select('role')
      .eq('id', req.user.id)
      .single();

    if (dbError) throw dbError;

    if (!user || user.role !== 'admin') {
      return error(res, '관리자 권한이 필요합니다.', 403);
    }

    // req.user에 최신 role 업데이트
    req.user.role = user.role;

    next();
  } catch (err) {
    console.error('관리자 권한 확인 오류:', err);
    return error(res, '권한 확인에 실패했습니다.', 500);
  }
};

module.exports = requireAdmin;

