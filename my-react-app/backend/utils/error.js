/**
 * 에러 처리 유틸리티
 */

/**
 * 커스텀 에러 클래스
 */
class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 에러 포맷팅
 * @param {Error} err - 에러 객체
 * @returns {object} 포맷팅된 에러 객체
 */
const formatError = (err) => {
  return {
    message: err.message || 'Internal Server Error',
    statusCode: err.statusCode || 500,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  };
};

module.exports = {
  AppError,
  formatError
};

