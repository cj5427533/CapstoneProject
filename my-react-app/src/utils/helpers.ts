// 공통 유틸리티 함수들
export const sanitizeInput = (input: string): string => {
  if (typeof input !== 'string') return input;
  return input
    .replace(/[<>]/g, '') // HTML 태그 제거
    .replace(/javascript:/gi, '') // JavaScript 프로토콜 제거
    .replace(/on\w+=/gi, '') // 이벤트 핸들러 제거
    .trim();
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePhoneNumber = (phone: string): boolean => {
  const phoneRegex = /^01\d{8,9}$/;
  return phoneRegex.test(phone.replace(/[-\s]/g, ''));
};

export const validateUrl = (url: string): boolean => {
  try {
    new URL(url.startsWith('http') ? url : 'https://' + url);
    return true;
  } catch {
    return false;
  }
};

// normalizeUrl은 utils/url.ts로 이동되었습니다.
// 하위 호환성을 위해 re-export
export { normalizeUrl } from './url';

export const formatDate = (date: string | Date): string => {
  const d = new Date(date);
  return d.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};
