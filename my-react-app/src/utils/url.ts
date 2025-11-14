/**
 * URL 정규화 및 검증 유틸리티 함수
 */

/**
 * URL을 정규화합니다.
 * - 프로토콜 자동 추가
 * - www. 제거
 * - 모바일 도메인 매핑
 * - 서브도메인 정리
 */
export const normalizeUrl = (url: string): string => {
  if (!url) return url;
  
  try {
    // 공백 제거 및 정리
    url = url.trim().replace(/\s+/g, '');
    
    // 빈 문자열 체크
    if (!url) return url;
    
    // 일반적인 오타 수정
    url = url.replace(/^htps:\/\//, 'https://');
    url = url.replace(/^http:\/\//, 'http://');
    
    // 프로토콜이 없으면 https:// 추가
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    
    // 이중 점 제거
    url = url.replace(/\.{2,}/g, '.');
    
    // 잘못된 슬래시 정리
    url = url.replace(/\/{2,}/g, '/');
    
    // URL 객체로 파싱하여 도메인 정규화
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
    // 에러 발생 시 원본 URL 반환 (프로토콜만 추가)
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return 'https://' + url;
    }
    return url;
  }
};

/**
 * URL 유효성 검증
 */
export const validateUrl = (url: string): boolean => {
  try {
    const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;
    new URL(normalizedUrl);
    return true;
  } catch {
    return false;
  }
};

/**
 * URL에서 도메인 추출
 */
export const extractDomain = (url: string): string => {
  try {
    const normalized = normalizeUrl(url);
    if (normalized.includes('://')) {
      const urlObj = new URL(normalized);
      return urlObj.hostname;
    }
    return normalized;
  } catch {
    return url;
  }
};

