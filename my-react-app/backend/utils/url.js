/**
 * URL 정규화 및 관련 유틸리티 함수
 */

/**
 * URL 정규화 함수 (개선 버전)
 * 
 * 교수님 피드백 반영:
 * - m.naver.com, www.naver.com, naver.com, http://www.naver.com, https://www.naver.com 등
 *   모두 동일한 쇼핑몰로 인식하도록 통합
 * - 쿼리스트링/앵커 제거
 * - /index.* 같은 기본 페이지를 / 로 통합
 * 
 * @param {string} url - 정규화할 URL
 * @returns {string} 정규화된 canonical URL
 */
function normalizeUrl(url) {
  try {
    if (!url || typeof url !== 'string') {
      return url;
    }
    
    // 공백 제거 및 정리
    url = url.trim().replace(/\s+/g, '');
    
    if (!url) {
      return url;
    }
    
    // 일반적인 오타 수정
    url = url.replace(/^htps:\/\//i, 'https://');
    
    // 프로토콜이 없으면 https:// 추가
    if (!url.match(/^https?:\/\//i)) {
      url = 'https://' + url;
    }
    
    // URL 객체로 파싱
    const urlObj = new URL(url);
    
    // 호스트명 소문자화
    let hostname = urlObj.hostname.toLowerCase();
    
    // www. 제거
    if (hostname.startsWith('www.')) {
      hostname = hostname.substring(4);
    }
    
    // 모바일 서브도메인 제거 (m., mobile., m2. 등)
    // 브랜드 차이가 없는 서브도메인을 동일 처리
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
    const mobileDomainMappings = {
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
    
    // trailing slash 제거 (루트는 유지)
    if (path.length > 1 && path.endsWith('/')) {
      path = path.slice(0, -1);
    }
    
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
    
    // 쿼리스트링과 앵커 제거 (canonical URL에는 포함하지 않음)
    // 결과: https://example.com/path 형태 (프로토콜 포함, 쿼리스트링/앵커 제거)
    
    // 저장 정책: 프로토콜 제거 후 저장 (기존 정책 유지)
    // 하지만 정규화된 값은 도메인+경로만 반환
    const normalized = hostname + path;
    
    return normalized;
  } catch (error) {
    console.error('URL 정규화 에러:', url, error.message);
    // 에러 발생 시 원본 URL에서 프로토콜만 제거하여 반환
    try {
      return url.replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('?')[0].split('#')[0];
    } catch {
      return url;
    }
  }
}

/**
 * 도메인에서 루트 도메인 추출
 * @param {string} url - URL
 * @returns {string} 루트 도메인
 */
function extractRootDomain(url) {
  try {
    const urlObj = new URL(url.startsWith('http') ? url : 'https://' + url);
    const domain = urlObj.hostname.toLowerCase().replace(/^www\./, '');
    const domainParts = domain.split('.');
    
    if (domainParts.length >= 2) {
      // 2단계 TLD 처리 (co.kr, ne.jp 등)
      const twoLevelTLDs = ['co', 'ne', 'or', 'ac', 'go'];
      if (domainParts.length >= 3 && twoLevelTLDs.includes(domainParts[domainParts.length - 2])) {
        return domainParts.slice(-3).join('.');
      } else {
        return domainParts.slice(-2).join('.');
      }
    }
    return domain;
  } catch (error) {
    console.error('루트 도메인 추출 에러:', error);
    return url;
  }
}

/**
 * 레벤슈타인 거리 기반 유사도 계산
 * @param {string} str1 - 첫 번째 문자열
 * @param {string} str2 - 두 번째 문자열
 * @returns {number} 레벤슈타인 거리
 */
function levenshteinDistance(str1, str2) {
  const m = str1.length;
  const n = str2.length;
  const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,     // 삭제
          dp[i][j - 1] + 1,     // 삽입
          dp[i - 1][j - 1] + 1  // 교체
        );
      }
    }
  }

  return dp[m][n];
}

/**
 * 문자열 유사도 계산 (0-1 사이 값)
 * @param {string} str1 - 첫 번째 문자열
 * @param {string} str2 - 두 번째 문자열
 * @returns {number} 유사도 (0-1)
 */
function calculateSimilarity(str1, str2) {
  if (!str1 || !str2) return 0;
  const maxLen = Math.max(str1.length, str2.length);
  if (maxLen === 0) return 1;
  const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
  return 1 - distance / maxLen;
}

module.exports = {
  normalizeUrl,
  extractRootDomain,
  levenshteinDistance,
  calculateSimilarity
};

