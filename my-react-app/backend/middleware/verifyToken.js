/**
 * JWT 토큰 검증 미들웨어
 */
const { verifyToken } = require('../utils/jwt');
const { error } = require('../utils/response');

/**
 * JWT 토큰 검증 미들웨어
 */
const verifyTokenMiddleware = (req, res, next) => {
  // localhost에서 오는 요청은 인증 우회 (개발 환경)
  const isLocalhost = req.hostname === 'localhost' || 
                      req.hostname === '127.0.0.1' || 
                      req.ip === '127.0.0.1' ||
                      req.headers['x-forwarded-for']?.includes('127.0.0.1');
  
  if (isLocalhost) {
    // localhost에서는 더미 관리자 사용자 설정
    req.user = { id: 1, role: 'admin', username: 'admin' };
    return next();
  }
  
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return error(res, '액세스 토큰이 필요합니다.', 401);
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return error(res, '유효하지 않은 토큰입니다.', 401);
  }

  req.user = decoded;
  next();
};

module.exports = verifyTokenMiddleware;

