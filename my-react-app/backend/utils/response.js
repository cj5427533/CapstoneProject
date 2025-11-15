/**
 * 공통 응답 유틸리티 함수
 */

/**
 * 성공 응답
 * @param {object} res - Express response 객체
 * @param {any} data - 응답 데이터
 * @param {string} message - 응답 메시지
 * @param {number} statusCode - HTTP 상태 코드
 */
const success = (res, data = null, message = 'Success', statusCode = 200) => {
  const response = {
    success: true,
    message
  };
  
  // data가 객체이고 이미 success, message, token 등의 필드가 있으면 그대로 사용
  if (data !== null) {
    if (typeof data === 'object' && !Array.isArray(data)) {
      // data에 이미 success, message 등이 있으면 병합
      if (data.success !== undefined || data.message !== undefined || data.token !== undefined) {
        Object.assign(response, data);
      } else {
        // shops, users 등 특정 필드가 있으면 직접 병합, 아니면 data로 감싸기
        if (data.shops !== undefined || data.users !== undefined || data.reports !== undefined) {
          Object.assign(response, data);
        } else {
          response.data = data;
        }
      }
    } else {
      response.data = data;
    }
  }
  
  return res.status(statusCode).json(response);
};

/**
 * 에러 응답
 * @param {object} res - Express response 객체
 * @param {string} message - 에러 메시지
 * @param {number} statusCode - HTTP 상태 코드
 * @param {any} error - 에러 객체 (선택)
 */
const error = (res, message = 'Error', statusCode = 500, error = null) => {
  const response = {
    success: false,
    error: message
  };
  
  if (error && process.env.NODE_ENV === 'development') {
    response.details = error.message;
  }
  
  return res.status(statusCode).json(response);
};

module.exports = {
  success,
  error
};

