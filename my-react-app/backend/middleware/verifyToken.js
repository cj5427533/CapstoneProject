/**
 * JWT 토큰 검증 미들웨어
 */
const { verifyToken } = require('../utils/jwt');
const { error } = require('../utils/response');

/**
 * JWT 토큰 검증 미들웨어
 */
const verifyTokenMiddleware = (req, res, next) => {
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

