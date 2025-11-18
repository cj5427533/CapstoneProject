/**
 * URL 정규화 및 검증 유틸리티 함수
 */

/**
 * URL을 정규화합니다.
 * 백엔드의 normalizeUrl과 동일한 로직을 사용합니다.
 * - 프로토콜 자동 추가
 * - www. 제거
 * - 모바일 도메인 매핑
 * - 서브도메인 정리
 * - 경로 정규화
 */
export const normalizeUrl = (url: string): string => {
  if (!url || typeof url !== 'string') {
    return url;
  }
  
  try {
    // 공백 제거 및 정리
    url = url.trim().replace(/\s+/g, '');
    
    if (!url) {
      return url;
    }
    
    // 기본적인 URL 형식 검증 (공백, 특수문자 등)
    if (url.includes(' ') || url.includes('\n') || url.includes('\t')) {
      throw new Error('Invalid URL format: contains whitespace');
    }
    
    // 일반적인 오타 수정
    url = url.replace(/^htps:\/\//i, 'https://');
    
    // 프로토콜이 없으면 https:// 추가
    if (!url.match(/^https?:\/\//i)) {
      url = 'https://' + url;
    }
    
    // URL 객체로 파싱 (에러 발생 가능)
    let urlObj: URL;
    try {
      urlObj = new URL(url);
    } catch (urlError) {
      // URL 파싱 실패 시 더 간단한 방법으로 처리
      console.warn('URL 파싱 실패, 간단한 정규화 시도:', url, urlError);
      // 프로토콜 제거하고 도메인만 추출 시도
      const withoutProtocol = url.replace(/^https?:\/\//i, '').split('/')[0].split('?')[0].split('#')[0];
      if (withoutProtocol && withoutProtocol.includes('.')) {
        return withoutProtocol.toLowerCase().replace(/^www\./, '');
      }
      throw urlError;
    }
    
    // 호스트명 소문자화
    let hostname = urlObj.hostname.toLowerCase();
    
    // www. 제거
    if (hostname.startsWith('www.')) {
      hostname = hostname.substring(4);
    }
    
    // 모바일 서브도메인 제거 (m., mobile., m2. 등)
    const mobilePrefixes = ['m.', 'mobile.', 'm2.', 'm1.', 'wap.'];
    for (const prefix of mobilePrefixes) {
      if (hostname.startsWith(prefix)) {
        hostname = hostname.substring(prefix.length);
        break;
      }
    }
    
    // 네이버 스마트 스토어 특별 처리
    if (hostname === 'smartstore.naver.com') {
      const pathParts = urlObj.pathname.split('/').filter(part => part);
      if (pathParts.length >= 1) {
        const storeId = pathParts[0];
        if (storeId && storeId !== 'undefined' && storeId !== '' && storeId.length > 1) {
          return `smartstore.naver.com/${storeId}`;
        }
      }
      return 'smartstore.naver.com';
    }
    
    // 모바일 도메인 매핑 (명시적 매핑)
    const mobileDomainMappings: { [key: string]: string } = {
      'm.11st.co.kr': '11st.co.kr',
      'm.gmarket.co.kr': 'gmarket.co.kr',
      'm.auction.co.kr': 'auction.co.kr',
      'm.coupang.com': 'coupang.com',
      'm.ssg.com': 'ssg.com',
      'm.lotte.com': 'lotte.com',
      'mobile.coupang.com': 'coupang.com',
      'm.shop.naver.com': 'smartstore.naver.com'
    };
    
    if (mobileDomainMappings[hostname]) {
      hostname = mobileDomainMappings[hostname];
    }
    
    // 서브도메인 제거 (2단계 TLD 지원: co.kr, ne.jp 등)
    const parts = hostname.split('.');
    if (parts.length > 2) {
      const lastPart = parts[parts.length - 1];
      const beforePart = parts[parts.length - 2];
      
      // 2단계 TLD 처리 (co.kr, ne.jp, com.cn, co.uk 등)
      const twoLevelTLDs = ['co', 'ne', 'or', 'ac', 'go', 'com', 'net', 'org'];
      const twoLevelTLDSuffixes = ['kr', 'jp', 'cn', 'uk', 'au', 'nz'];
      
      if (twoLevelTLDs.includes(beforePart) && twoLevelTLDSuffixes.includes(lastPart)) {
        const domainName = parts[parts.length - 3];
        hostname = `${domainName}.${beforePart}.${lastPart}`;
      } else if (['com', 'kr', 'net', 'org', 'io', 'ai', 'co', 'me', 'us'].includes(lastPart)) {
        // 일반 TLD 처리
        hostname = `${beforePart}.${lastPart}`;
      }
    }
    
    // 경로 정규화
    let path = urlObj.pathname;
    
    // /index.* 같은 기본 페이지를 / 로 통합
    const indexPatterns = [
      /^\/index\.(html?|php|jsp|aspx?|do)$/i,
      /^\/default\.(html?|php|jsp|aspx?)$/i,
      /^\/home\.(html?|php|jsp|aspx?)$/i,
      /^\/main\.(html?|php|jsp|aspx?|do)$/i
    ];
    
    for (const pattern of indexPatterns) {
      if (pattern.test(path)) {
        path = '/';
        break;
      }
    }
    
    // 경로가 루트(/)이거나 비어있으면 경로 제거 (도메인만 반환)
    if (path === '/' || path === '') {
      path = '';
    } else {
      // trailing slash 제거
      if (path.endsWith('/')) {
        path = path.slice(0, -1);
      }
    }
    
    // 정규화된 값: hostname + path (프로토콜 제거)
    const normalized = hostname + path;
    
    return normalized;
  } catch (error) {
    console.error('URL 정규화 에러:', url, error);
    // 에러 발생 시 원본 URL에서 프로토콜만 제거하여 반환
    try {
      return url.replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('?')[0].split('#')[0];
    } catch {
      return url;
    }
  }
};

/**
 * URL 유효성 검증
 * 프로토콜이 없어도 도메인만으로 검증 가능
 */
export const validateUrl = (url: string): boolean => {
  if (!url || typeof url !== 'string') {
    return false;
  }
  
  try {
    // 공백 제거
    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      return false;
    }
    
    // 프로토콜이 없으면 https:// 추가하여 검증
    const urlToValidate = trimmedUrl.match(/^https?:\/\//i) ? trimmedUrl : `https://${trimmedUrl}`;
    const urlObj = new URL(urlToValidate);
    
    // 호스트명이 있어야 함
    if (!urlObj.hostname || urlObj.hostname.length === 0) {
      return false;
    }
    
    // 기본적인 도메인 형식 검증 (최소한 점이 하나는 있어야 함)
    if (!urlObj.hostname.includes('.')) {
      return false;
    }
    
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

