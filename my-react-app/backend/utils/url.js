/**
 * URL 정규화 및 관련 유틸리티 함수
 */

/**
 * URL 정규화 함수
 * @param {string} url - 정규화할 URL
 * @returns {string} 정규화된 URL
 */
function normalizeUrl(url) {
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
    const mobileDomainMappings = {
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
    
    // 서브도메인 제거 (2단계 TLD 지원: co.kr, ne.jp 등)
    const parts = domain.split('.');
    if (parts.length > 2) {
      const lastPart = parts[parts.length - 1];
      const beforePart = parts[parts.length - 2];
      
      // 2단계 TLD 처리 (co.kr, ne.jp, com.cn 등)
      const twoLevelTLDs = ['co', 'ne', 'or', 'ac', 'go'];
      if (twoLevelTLDs.includes(beforePart) && ['kr', 'jp', 'cn', 'uk'].includes(lastPart)) {
        // guitarshop.co.kr -> guitarshop.co.kr
        const domainName = parts[parts.length - 3];
        return `${domainName}.${beforePart}.${lastPart}`;
      }
      
      // 일반 TLD 처리 (com, kr, net, org 등)
      if (['com', 'kr', 'net', 'org', 'io', 'ai'].includes(lastPart)) {
        return `${beforePart}.${lastPart}`;
      }
    }
    
    return domain;
  } catch (error) {
    console.error('URL 정규화 에러:', url, error.message);
    return url;
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

