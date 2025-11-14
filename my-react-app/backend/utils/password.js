/**
 * 비밀번호 관련 유틸리티
 */
const crypto = require('crypto');

/**
 * 비밀번호 해싱
 */
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

/**
 * 비밀번호 검증
 */
function verifyPassword(password, hashedPassword) {
  return hashPassword(password) === hashedPassword;
}

module.exports = {
  hashPassword,
  verifyPassword
};

