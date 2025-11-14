/**
 * 입력 검증 유틸리티 함수
 */

/**
 * 입력값 정제 (XSS 방지)
 * @param {any} input - 정제할 입력값
 * @returns {any} 정제된 입력값
 */
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  return input
    .replace(/[<>]/g, '') // HTML 태그 제거
    .replace(/javascript:/gi, '') // JavaScript 프로토콜 제거
    .replace(/on\w+=/gi, '') // 이벤트 핸들러 제거
    .trim();
};

/**
 * 이메일 검증
 * @param {string} email - 검증할 이메일
 * @returns {boolean} 유효 여부
 */
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * 휴대폰 번호 검증
 * @param {string} phone - 검증할 전화번호
 * @returns {boolean} 유효 여부
 */
const validatePhoneNumber = (phone) => {
  const phoneRegex = /^01\d{8,9}$/;
  return phoneRegex.test(phone.replace(/[-\s]/g, ''));
};

/**
 * URL 검증
 * @param {string} url - 검증할 URL
 * @returns {boolean} 유효 여부
 */
const validateUrl = (url) => {
  try {
    new URL(url.startsWith('http') ? url : 'https://' + url);
    return true;
  } catch {
    return false;
  }
};

module.exports = {
  sanitizeInput,
  validateEmail,
  validatePhoneNumber,
  validateUrl
};

