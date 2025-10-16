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

export const normalizeUrl = (url: string): string => {
  try {
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    
    const urlObj = new URL(url);
    let domain = urlObj.hostname.toLowerCase();
    
    // www. 제거
    if (domain.startsWith('www.')) {
      domain = domain.substring(4);
    }
    
    // 네이버 스마트 스토어 특별 처리
    if (domain === 'smartstore.naver.com') {
      const pathParts = urlObj.pathname.split('/').filter(part => part);
      if (pathParts.length >= 1) {
        const storeId = pathParts[0];
        if (storeId && storeId !== 'undefined' && storeId !== '' && storeId.length > 1) {
          return `smartstore.naver.com/${storeId}`;
        }
      }
      return 'smartstore.naver.com';
    }

    // 모바일 도메인 매핑
    const mobileDomainMappings: { [key: string]: string } = {
      'm.11st.co.kr': '11st.co.kr',
      'm.gmarket.co.kr': 'gmarket.co.kr',
      'm.auction.co.kr': 'auction.co.kr',
      'm.coupang.com': 'coupang.com',
      'm.ssg.com': 'ssg.com',
      'm.lotte.com': 'lotte.com'
    };
    
    if (mobileDomainMappings[domain]) {
      return mobileDomainMappings[domain];
    }
    
    // 서브도메인 제거
    const parts = domain.split('.');
    if (parts.length > 2) {
      const lastPart = parts[parts.length - 1];
      const beforePart = parts[parts.length - 2];
      
      // 2단계 TLD 처리
      const twoLevelTLDs = ['co', 'ne', 'or', 'ac', 'go'];
      if (twoLevelTLDs.includes(beforePart) && ['kr', 'jp', 'cn', 'uk'].includes(lastPart)) {
        const domainName = parts[parts.length - 3];
        return `${domainName}.${beforePart}.${lastPart}`;
      }
      
      // 일반 TLD 처리
      if (['com', 'kr', 'net', 'org', 'io', 'ai'].includes(lastPart)) {
        return `${beforePart}.${lastPart}`;
      }
    }
    
    return domain;
  } catch (error) {
    console.error('URL 정규화 에러:', url, error);
    return url;
  }
};

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
