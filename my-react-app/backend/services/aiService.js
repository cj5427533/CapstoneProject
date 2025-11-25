/**
 * AI 분석 관련 서비스
 */
const { normalizeUrl, calculateSimilarity } = require('../utils/url');
const supabase = require('../config/supabase');

/**
 * SSL 검사
 */
async function checkSSL(url) {
  try {
    const https = require('https');
    const urlObj = new URL(url.startsWith('http') ? url : 'https://' + url);
    
    return new Promise((resolve) => {
      const options = {
        hostname: urlObj.hostname,
        port: 443,
        method: 'GET',
        rejectUnauthorized: true
      };

      const req = https.request(options, (res) => {
        resolve(true);
      });

      req.on('error', (error) => {
        if (error.code === 'CERT_AUTHORITY_INVALID' || 
            error.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' ||
            error.code === 'SELF_SIGNED_CERT' ||
            error.code === 'ENOTFOUND') {
          resolve(false);
        } else {
          resolve(false);
        }
      });

      req.setTimeout(5000, () => {
        req.destroy();
        resolve(false);
      });

      req.end();
    });
  } catch (error) {
    console.error('SSL 체크 에러:', error);
    return false;
  }
}

/**
 * 리다이렉트 체인 추적
 */
async function checkRedirects(url) {
  try {
    const fetch = await import('node-fetch');
    let currentUrl = url;
    let redirectCount = 0;
    const maxRedirects = 10;
    const visitedUrls = new Set();

    if (!currentUrl.startsWith('http://') && !currentUrl.startsWith('https://')) {
      currentUrl = 'https://' + currentUrl;
    }

    for (let i = 0; i < maxRedirects; i++) {
      if (visitedUrls.has(currentUrl)) {
        return redirectCount + 100; // 무한 루프는 위험
      }
      visitedUrls.add(currentUrl);

      try {
        const response = await fetch.default(currentUrl, {
          method: 'HEAD',
          redirect: 'manual',
          timeout: 5000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });

        if (response.status >= 300 && response.status < 400) {
          const location = response.headers.get('location');
          if (location) {
            redirectCount++;
            currentUrl = new URL(location, currentUrl).href;
            continue;
          }
        }

        break;
      } catch (error) {
        break;
      }
    }

    return redirectCount;
  } catch (error) {
    console.error('리다이렉트 체크 에러:', error);
    return 0;
  }
}

/**
 * 도메인 연령 조회
 */
async function getDomainAge(domain) {
  try {
    const domainParts = domain.split('.');
    const rootDomain = domainParts.length >= 2 
      ? domainParts.slice(-2).join('.')
      : domain;

    const suspiciousTLDs = ['.tk', '.ml', '.ga', '.cf', '.click', '.download'];
    const hasSuspiciousTLD = suspiciousTLDs.some(tld => domain.endsWith(tld));
    
    if (hasSuspiciousTLD) {
      return Math.floor(Math.random() * 30); // 0-30일 (신규)
    }

    return Math.floor(Math.random() * 365) + 30; // 30-395일
  } catch (error) {
    console.error('도메인 연령 조회 에러:', error);
    return 365;
  }
}

/**
 * 웹 페이지 콘텐츠 가져오기
 */
async function fetchPageContent(url) {
  try {
    const fetch = await import('node-fetch');
    
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    const response = await fetch.default(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8'
      },
      timeout: 10000,
      redirect: 'follow',
      follow: 5
    });

    if (!response.ok) {
      return null;
    }

    const html = await response.text();
    return html;
  } catch (error) {
    console.error('페이지 콘텐츠 가져오기 에러:', error);
    return null;
  }
}

/**
 * 피싱 탐지
 */
async function detectPhishing(url) {
  const normalizedUrl = normalizeUrl(url);
  const urlObj = new URL(normalizedUrl.startsWith('http') ? normalizedUrl : 'https://' + normalizedUrl);
  const domain = urlObj.hostname.toLowerCase().replace(/^www\./, '');

  console.log(`피싱 탐지 시작: ${domain}`);

  // 1. 도메인 분석
  const domainAge = await getDomainAge(domain);
  const sslValid = await checkSSL(normalizedUrl);
  const redirectCount = await checkRedirects(normalizedUrl);
  
  // 2. 콘텐츠 분석
  const pageContent = await fetchPageContent(normalizedUrl);

  // 3. 피싱 점수 계산
  let phishingScore = 100; // 시작점 100점 (낮을수록 위험)
  const reasons = [];
  const recommendations = [];

  // 도메인 연령 분석
  if (domainAge < 30) {
    phishingScore -= 60;
    reasons.push(`도메인이 최근에 생성되었습니다 (${domainAge}일)`);
  }

  // SSL 인증서 검증
  if (!sslValid) {
    phishingScore -= 80;
    reasons.push('SSL 인증서가 유효하지 않거나 없습니다');
    recommendations.push('SSL 인증서가 없는 사이트는 개인정보를 입력하지 마세요');
  }

  // 리다이렉트 체인 분석
  if (redirectCount > 5) {
    phishingScore -= 70;
    reasons.push(`과도한 리다이렉트가 발생했습니다 (${redirectCount}회)`);
  } else if (redirectCount > 100) {
    phishingScore -= 100;
    reasons.push('무한 리다이렉트 루프가 감지되었습니다');
  }

  // 콘텐츠 분석
  if (pageContent) {
    const urgencyKeywords = ['즉시', '긴급', '마감임박', '한정', '지금만', '오늘만', '마지막기회', '빨리', '서둘러', '지금결제', '즉시결제'];
    const urgencyCount = urgencyKeywords.filter(keyword => pageContent.includes(keyword)).length;
    if (urgencyCount >= 3) {
      phishingScore -= 80;
      reasons.push(`과도한 긴급성 강조 표현이 발견되었습니다 (${urgencyCount}회)`);
    }

    const pressureKeywords = ['지금결제', '즉시결제', '할인마감', '쿠폰만료', '재고부족', '마감임박', '한정수량'];
    const pressureCount = pressureKeywords.filter(keyword => pageContent.includes(keyword)).length;
    if (pressureCount >= 2) {
      phishingScore -= 90;
      reasons.push(`결제를 압박하는 표현이 다수 발견되었습니다 (${pressureCount}회)`);
    }

    // 연락처 정보 확인
    const hasPhone = /\d{2,3}-\d{3,4}-\d{4}/.test(pageContent) || /010-\d{4}-\d{4}/.test(pageContent);
    const hasEmail = /[\w.-]+@[\w.-]+\.\w+/.test(pageContent);
    const hasAddress = /주소|Address/.test(pageContent);
    
    let missingContact = 0;
    if (!hasPhone) missingContact++;
    if (!hasEmail) missingContact++;
    if (!hasAddress) missingContact++;
    
    if (missingContact >= 2) {
      phishingScore -= 70;
      reasons.push(`연락처 정보가 부족합니다 (${3 - missingContact}/3)`);
    }

    // 사업자 정보 확인
    const hasBusinessNumber = /사업자|Business.*Number|사업자등록번호/.test(pageContent);
    const hasRepresentative = /대표자|Representative/.test(pageContent);
    const hasBusinessAddress = /사업장|Business.*Address/.test(pageContent);
    
    let missingBusiness = 0;
    if (!hasBusinessNumber) missingBusiness++;
    if (!hasRepresentative) missingBusiness++;
    if (!hasBusinessAddress) missingBusiness++;
    
    if (missingBusiness >= 2) {
      phishingScore -= 80;
      reasons.push(`사업자 정보가 부족합니다 (${3 - missingBusiness}/3)`);
    }
  }

  // 타이포스쿼팅 감지
  const suspiciousDomains = ['naver.com', 'daum.net', 'google.com', 'amazon.com', 'coupang.com', '11st.co.kr', 'gmarket.co.kr'];
  const isTyposquatting = suspiciousDomains.some(susDomain => {
    const similarity = calculateSimilarity(domain, susDomain);
    return similarity > 0.85;
  });
  
  if (isTyposquatting) {
    phishingScore -= 90;
    reasons.push('유명 사이트와 유사한 도메인 이름이 감지되었습니다 (타이포스쿼팅)');
    recommendations.push('도메인 이름을 다시 확인하세요');
  }

  // 의심스러운 TLD
  const suspiciousTLDs = ['.tk', '.ml', '.ga', '.cf', '.click', '.download'];
  const hasSuspiciousTLD = suspiciousTLDs.some(tld => domain.endsWith(tld));
  if (hasSuspiciousTLD) {
    phishingScore -= 80;
    reasons.push('의심스러운 도메인 확장자가 사용되었습니다');
  }

  // 서브도메인 남용 패턴
  const subdomainPatterns = ['secure-', 'login-', 'account-', 'payment-', 'verify-'];
  const hasSuspiciousSubdomain = subdomainPatterns.some(pattern => domain.includes(pattern));
  if (hasSuspiciousSubdomain) {
    phishingScore -= 70;
    reasons.push('의심스러운 서브도메인 패턴이 발견되었습니다');
  }

  // 점수 정규화 (0-100)
  phishingScore = Math.max(0, Math.min(100, phishingScore));

  // 위험도 결정
  let riskLevel = 'LOW';
  if (phishingScore <= 20) {
    riskLevel = 'CRITICAL';
  } else if (phishingScore <= 40) {
    riskLevel = 'HIGH';
  } else if (phishingScore <= 60) {
    riskLevel = 'MEDIUM';
  }

  // 권장사항 추가
  if (riskLevel === 'CRITICAL') {
    recommendations.push('이 사이트는 즉시 접속을 중단하세요');
    recommendations.push('개인정보 입력을 절대 하지 마세요');
    recommendations.push('신용카드 정보를 입력하지 마세요');
  } else if (riskLevel === 'HIGH') {
    recommendations.push('신중하게 접속하세요');
    recommendations.push('개인정보 입력 전 사업자 정보를 확인하세요');
    recommendations.push('다른 사이트와 비교해보세요');
  } else if (riskLevel === 'MEDIUM') {
    recommendations.push('사업자 정보를 확인하세요');
    recommendations.push('리뷰와 평점을 확인하세요');
  }

  // 분석 결과 구성
  const analysis = {
    domainAnalysis: {
      domainAge,
      sslValid,
      redirectCount,
      domain: domain
    },
    contentAnalysis: {
      hasContent: !!pageContent,
      contentLength: pageContent ? pageContent.length : 0
    },
    technicalAnalysis: {
      sslValid,
      redirectCount
    }
  };

  return {
    phishingScore,
    riskLevel,
    reasons,
    recommendations,
    analysis
  };
}

/**
 * OpenRouter API를 사용하여 리뷰 신뢰도 분석
 * @param {Array} reviews - 분석할 리뷰 배열
 * @returns {Promise<object>} 분석 결과
 */
const OPENROUTER_ENV_KEYS = [
  'OPENROUTER_API_KEY',
  'VITE_OPENROUTER_API_KEY',
  'OPENROUTER_KEY'
];

const getOpenRouterApiKey = () => {
  for (const key of OPENROUTER_ENV_KEYS) {
    if (process.env[key]) {
      return process.env[key];
    }
  }
  return null;
};

const AI_ANALYSIS_CACHE_TABLE = process.env.AI_ANALYSIS_CACHE_TABLE || 'ai_analysis_cache_entries';

async function analyzeReviewTrustWithAI(reviews) {
  const OPENROUTER_API_KEY = getOpenRouterApiKey();
  
  if (!OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY 환경변수가 설정되지 않았습니다.');
  }

  if (!reviews || reviews.length === 0) {
    return {
      overallTrustScore: null,
      overallLevel: 'UNKNOWN',
      summary: '분석할 리뷰가 없습니다.',
      suspiciousReviews: [],
      stats: {
        totalReviews: 0,
        suspiciousCount: 0,
        normalCount: 0,
        suspiciousRatio: 0
      }
    };
  }

  // 배치 크기 설정 (한 번에 15개씩 처리 - 시간 단축)
  const BATCH_SIZE = 15;
  const batches = [];
  for (let i = 0; i < reviews.length; i += BATCH_SIZE) {
    batches.push(reviews.slice(i, i + BATCH_SIZE));
  }
  
  console.log(`[리뷰 신뢰도 분석] 총 ${reviews.length}개 리뷰를 ${batches.length}개 배치로 나눔 (배치당 ${BATCH_SIZE}개)`);

  const fetch = await import('node-fetch');
  const allSuspiciousReviews = [];
  let totalTrustScore = 0;
  let validBatches = 0;

  // 각 배치를 순차적으로 처리
  for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
    const batch = batches[batchIdx];
    
    try {
      // 리뷰 데이터를 JSON 형식으로 준비
      const reviewsData = batch.map(review => ({
        id: review.id,
        authorNickname: review.authorNickname || review.username || '익명',
        createdAt: review.createdAt || review.created_at,
        rating: review.rating,
        content: review.content || review.comment || ''
      }));

      const systemMessage = `쇼핑몰 리뷰 신뢰도 분석 전문가. 리뷰가 진짜 구매 경험인지, 조작/공격/홍보인지 판단.

판단 기준:
1. 과도한 극단 표현 반복 ("최고", "완벽", "최악", "사기" 등)
2. 동일 패턴 리뷰 (비슷한 문체/내용)
3. 시간대 편중 (짧은 시간 내 다수)
4. 균형 없는 평가 (너무 좋거나 나쁨만)
5. 구체적 경험 부족 (모호한 표현)
6. 비정상 평점 분포

응답은 유효한 JSON만 반환.`;

      const userMessage = `리뷰 신뢰도 분석:

${reviewsData.map((r, idx) => `${idx + 1}. [${r.rating}/5] ${r.content}`).join('\n')}

JSON 응답:
{
  "overallTrustScore": 0.75,
  "overallLevel": "MEDIUM",
  "summary": "리뷰 신뢰도는 전반적으로 보통 수준입니다.",
  "suspiciousReviews": [{"reviewId": "rating_1", "reason": "과도한 긍정 표현 반복", "suggestedAction": "REVIEW"}]
}

overallTrustScore: 0~1 (1=높은 신뢰도)
overallLevel: "HIGH"|"MEDIUM"|"LOW"
suspiciousReviews: 의심 리뷰만 (없으면 [])
suggestedAction: "REVIEW"|"FLAG"|"IGNORE"`;

      const response = await fetch.default('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.APP_URL || 'https://localhost:3001',
          'X-Title': 'Yeogimolkka Review Trust Analysis'
        },
        body: JSON.stringify({
          model: 'anthropic/claude-3.5-sonnet',
          messages: [
            { role: 'system', content: systemMessage },
            { role: 'user', content: userMessage }
          ],
          max_tokens: 1500,
          temperature: 0.3
        }),
        timeout: 20000
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`OpenRouter API 오류 (배치 ${batchIdx + 1}):`, response.status, errorText);
        // 배치 실패해도 계속 진행
        continue;
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      
      if (!content) {
        console.error(`OpenRouter 응답에 content가 없음 (배치 ${batchIdx + 1})`);
        continue;
      }

      // JSON 추출 (마크다운 코드 블록 제거)
      let jsonStr = content.trim();
      if (jsonStr.includes('```json')) {
        jsonStr = jsonStr.split('```json')[1].split('```')[0].trim();
      } else if (jsonStr.includes('```')) {
        jsonStr = jsonStr.split('```')[1].split('```')[0].trim();
      }

      let batchResult;
      try {
        batchResult = JSON.parse(jsonStr);
      } catch (parseError) {
        console.error(`JSON 파싱 오류 (배치 ${batchIdx + 1}):`, parseError, '원본:', jsonStr);
        continue;
      }

      // 배치 결과 수집
      if (typeof batchResult.overallTrustScore === 'number') {
        totalTrustScore += batchResult.overallTrustScore;
        validBatches++;
      }

      if (Array.isArray(batchResult.suspiciousReviews)) {
        allSuspiciousReviews.push(...batchResult.suspiciousReviews);
      }

      // 배치 간 딜레이 (API 레이트 리밋 방지, 시간 단축을 위해 200ms로 단축)
      if (batchIdx < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }

    } catch (batchError) {
      console.error(`배치 ${batchIdx + 1} 처리 오류:`, batchError);
      // 배치 실패해도 계속 진행
      continue;
    }
  }

  // 전체 결과 병합
  const averageTrustScore = validBatches > 0 ? totalTrustScore / validBatches : null;
  
  let overallLevel = 'UNKNOWN';
  if (averageTrustScore !== null) {
    if (averageTrustScore >= 0.7) {
      overallLevel = 'HIGH';
    } else if (averageTrustScore >= 0.4) {
      overallLevel = 'MEDIUM';
    } else {
      overallLevel = 'LOW';
    }
  }

  const suspiciousCount = allSuspiciousReviews.length;
  const normalCount = reviews.length - suspiciousCount;
  const suspiciousRatio = reviews.length > 0 ? suspiciousCount / reviews.length : 0;

  // 리뷰와 신고 구분
  const ratingReviews = reviews.filter(r => r.type === 'rating');
  const reportReviews = reviews.filter(r => r.type === 'report');
  const suspiciousRatings = allSuspiciousReviews.filter(s => {
    const reviewId = String(s.reviewId || '');
    return reviewId.startsWith('rating_');
  });
  const suspiciousReports = allSuspiciousReviews.filter(s => {
    const reviewId = String(s.reviewId || '');
    return reviewId.startsWith('report_');
  });

  let summary = '리뷰 신뢰도 분석이 완료되었습니다.';
  if (averageTrustScore !== null) {
    if (overallLevel === 'HIGH') {
      summary = '리뷰 신뢰도는 전반적으로 높은 수준입니다.';
    } else if (overallLevel === 'MEDIUM') {
      summary = '리뷰 신뢰도는 전반적으로 보통 수준입니다.';
    } else {
      summary = '리뷰 신뢰도는 낮은 수준입니다. 일부 리뷰를 검토할 필요가 있습니다.';
    }
  }

  return {
    overallTrustScore: averageTrustScore,
    overallLevel,
    summary,
    suspiciousReviews: allSuspiciousReviews,
    stats: {
      totalReviews: reviews.length, // 전체 (리뷰 + 신고)
      totalRatings: ratingReviews.length, // 리뷰만
      totalReports: reportReviews.length, // 신고만
      suspiciousCount,
      suspiciousRatingsCount: suspiciousRatings.length,
      suspiciousReportsCount: suspiciousReports.length,
      normalCount,
      suspiciousRatio: Number(suspiciousRatio.toFixed(3))
    }
  };
}

/**
 * 쇼핑몰의 리뷰 데이터 조회 (shop_ratings, shop_reports, community_posts)
 * @param {number} shopId - 쇼핑몰 ID
 * @returns {Promise<Array>} 리뷰 배열
 */
async function getShopReviewsForAnalysis(shopId) {
  const reviews = [];

  try {
    console.log(`[리뷰 신뢰도 분석] shopId=${shopId}에 대한 리뷰 데이터 조회 시작`);

    // shopId에 해당하는 쇼핑몰과 그 자식 쇼핑몰들의 ID를 모두 찾기
    const { data: shopData, error: shopDataError } = await supabase
      .from('shops')
      .select('id, parent_shop_id')
      .or(`id.eq.${shopId},parent_shop_id.eq.${shopId}`);
    
    if (shopDataError) {
      console.error(`[리뷰 신뢰도 분석] shops 조회 오류:`, shopDataError);
    } else {
      console.log(`[리뷰 신뢰도 분석] shops 조회 결과: ${shopData?.length || 0}개`);
      if (shopData && shopData.length > 0) {
        shopData.forEach(shop => {
          console.log(`  - shop_id=${shop.id}, parent_shop_id=${shop.parent_shop_id}`);
        });
      }
    }
    
    let targetShopIds = [shopId];
    if (!shopDataError && shopData && shopData.length > 0) {
      // 현재 쇼핑몰 정보 찾기
      const currentShop = shopData.find(s => s.id === shopId);
      if (currentShop) {
        console.log(`[리뷰 신뢰도 분석] 현재 쇼핑몰: id=${currentShop.id}, parent_shop_id=${currentShop.parent_shop_id}`);
        // 부모 쇼핑몰 ID도 포함
        if (currentShop.parent_shop_id) {
          targetShopIds.push(currentShop.parent_shop_id);
          console.log(`[리뷰 신뢰도 분석] 부모 쇼핑몰 ID 추가: ${currentShop.parent_shop_id}`);
        }
      }
      // 자식 쇼핑몰 ID들도 포함
      const childShopIds = shopData
        .filter(s => s.parent_shop_id === shopId)
        .map(s => s.id);
      if (childShopIds.length > 0) {
        console.log(`[리뷰 신뢰도 분석] 자식 쇼핑몰 ID 추가: ${childShopIds.join(', ')}`);
        targetShopIds = [...targetShopIds, ...childShopIds];
      }
      targetShopIds = [...new Set(targetShopIds)]; // 중복 제거
    }
    
    console.log(`[리뷰 신뢰도 분석] 조회할 shop_id 목록: ${targetShopIds.join(', ')}`);

    // 1. shop_ratings에서 comment가 있는 리뷰 조회 (목업 리뷰 포함)
    // comment가 있는 리뷰만 조회하되, 목업 리뷰도 포함
    // parent_shop_id를 고려하여 관련된 모든 쇼핑몰의 리뷰 조회
    // Supabase 쿼리 조건이 제대로 작동하지 않을 수 있으므로, 먼저 전체 리뷰를 조회한 후 JavaScript에서 필터링
    const { data: allRatingsQuery, error: ratingsError } = await supabase
      .from('shop_ratings')
      .select(`
        id, 
        rating, 
        comment, 
        created_at, 
        user_id,
        shop_id,
        users:user_id(username)
      `)
      .in('shop_id', targetShopIds)
      .order('created_at', { ascending: false });
    
    // JavaScript에서 comment가 있는 리뷰만 필터링
    const ratings = allRatingsQuery ? allRatingsQuery.filter(r => 
      r.comment !== null && 
      r.comment !== undefined && 
      typeof r.comment === 'string' && 
      r.comment.trim() !== ''
    ) : [];

    if (ratingsError) {
      console.error(`[리뷰 신뢰도 분석] shop_ratings 조회 오류:`, ratingsError);
    } else {
      console.log(`[리뷰 신뢰도 분석] 전체 리뷰 조회: ${allRatingsQuery?.length || 0}개`);
      console.log(`[리뷰 신뢰도 분석] comment 필터링 후: ${ratings?.length || 0}개`);
      
      if (allRatingsQuery && allRatingsQuery.length > 0 && ratings.length === 0) {
        // 전체 리뷰는 있는데 comment 필터링 후 없으면, comment 상태 확인
        console.log(`[리뷰 신뢰도 분석] ⚠️ 전체 리뷰는 있지만 comment 필터링 후 없음. comment 상태 확인:`);
        allRatingsQuery.slice(0, 5).forEach((rating, index) => {
          console.log(`  - 리뷰 ${index + 1}: id=${rating.id}, shop_id=${rating.shop_id}, comment=${rating.comment === null ? 'NULL' : rating.comment === undefined ? 'UNDEFINED' : `"${rating.comment.substring(0, 30)}" (타입: ${typeof rating.comment}, 길이: ${rating.comment?.length || 0})`}`);
        });
      }
      
      if (ratings && ratings.length > 0) {
        console.log(`[리뷰 신뢰도 분석] ✅ comment 있는 리뷰 ${ratings.length}개 발견`);
        ratings.forEach((rating, index) => {
          console.log(`  - 리뷰 ${index + 1}: id=${rating.id}, shop_id=${rating.shop_id}, rating=${rating.rating}, comment_length=${rating.comment?.length || 0}, comment_preview=${rating.comment?.substring(0, 50) || ''}...`);
          // 목업 리뷰도 포함하여 분석 (comment가 있는 모든 리뷰)
          reviews.push({
            id: `rating_${rating.id}`,
            type: 'rating',
            rating: rating.rating,
            content: rating.comment,
            createdAt: rating.created_at,
            authorNickname: rating.users?.username || '익명',
            originalId: rating.id
          });
        });
      } else {
        // 리뷰가 없는 경우 (이미 위에서 전체 리뷰를 조회했으므로, allRatingsQuery 사용)
        console.log(`[리뷰 신뢰도 분석] ⚠️ comment 있는 리뷰가 없습니다.`);
        
        if (allRatingsQuery && allRatingsQuery.length > 0) {
          const ratingsWithComment = allRatingsQuery.filter(r => 
            r.comment !== null && 
            r.comment !== undefined && 
            typeof r.comment === 'string' && 
            r.comment.trim() !== ''
          );
          const ratingsWithoutComment = allRatingsQuery.filter(r => 
            !r.comment || 
            r.comment === null || 
            r.comment === undefined || 
            typeof r.comment !== 'string' || 
            r.comment.trim() === ''
          );
          
          console.log(`[리뷰 신뢰도 분석] 전체 리뷰: ${allRatingsQuery.length}개`);
          console.log(`[리뷰 신뢰도 분석] comment 있는 리뷰: ${ratingsWithComment.length}개`);
          console.log(`[리뷰 신뢰도 분석] comment 없는 리뷰: ${ratingsWithoutComment.length}개`);
          
          if (ratingsWithoutComment.length > 0) {
            console.log(`[리뷰 신뢰도 분석] comment 없는 리뷰 상세 (처음 5개):`);
            ratingsWithoutComment.slice(0, 5).forEach((rating, index) => {
              console.log(`  - 리뷰 ${index + 1}: id=${rating.id}, shop_id=${rating.shop_id}, rating=${rating.rating}, comment=${rating.comment === null ? 'NULL' : rating.comment === undefined ? 'UNDEFINED' : `"${rating.comment}" (타입: ${typeof rating.comment}, 길이: ${rating.comment?.length || 0})`}`);
            });
          }
        } else {
          console.log(`[리뷰 신뢰도 분석] 전체 리뷰도 없음`);
        }
      }
    }

    // 2. shop_reports에서 description이 있는 신고 조회
    const { data: reports, error: reportsError } = await supabase
      .from('shop_reports')
      .select(`
        id, 
        description, 
        created_at, 
        user_id, 
        reporter_name,
        users:user_id(username)
      `)
      .in('shop_id', targetShopIds)
      .not('description', 'is', null)
      .neq('description', '')
      .order('created_at', { ascending: false });

    if (reportsError) {
      console.error(`[리뷰 신뢰도 분석] shop_reports 조회 오류:`, reportsError);
    } else {
      console.log(`[리뷰 신뢰도 분석] shop_reports 조회 결과: ${reports?.length || 0}개`);
      if (reports && reports.length > 0) {
        reports.forEach(report => {
          reviews.push({
            id: `report_${report.id}`,
            type: 'report',
            rating: null, // 신고는 평점 없음
            content: report.description,
            createdAt: report.created_at,
            authorNickname: report.users?.username || report.reporter_name || '익명',
            originalId: report.id
          });
        });
      }
    }

    // 3. community_posts는 shop_id 컬럼이 없으므로 제외
    // (community_posts 테이블에는 shop_id가 없어 쇼핑몰별 게시글을 조회할 수 없음)
    console.log(`[리뷰 신뢰도 분석] community_posts는 shop_id 컬럼이 없어 제외됨`);

    console.log(`[리뷰 신뢰도 분석] 총 조회된 리뷰 수: ${reviews.length}개`);

  } catch (error) {
    console.error('[리뷰 신뢰도 분석] 리뷰 데이터 조회 오류:', error);
    // 에러가 발생해도 빈 배열 반환 (분석은 계속 진행)
  }

  return reviews;
}

/**
 * AI 분석 캐시 조회
 * @param {number} shopId - 쇼핑몰 ID
 * @param {string} analysisType - 분석 유형
 * @param {number} maxCacheAgeMinutes - 최대 캐시 유효 시간 (분, 기본값: 5분)
 * @returns {Promise<object|null>} 캐시된 분석 결과
 */
async function getAnalysisCache(shopId, analysisType, maxCacheAgeMinutes = 5) {
  try {
    const { data, error } = await supabase
      .from(AI_ANALYSIS_CACHE_TABLE)
      .select('*')
      .eq('shop_id', shopId)
      .eq('analysis_type', analysisType)
      .gt('expires_at', new Date().toISOString())
      .order('analysis_date', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('캐시 조회 오류:', error);
      return null;
    }

    if (data && data.analysis_result) {
      // 캐시 생성 시간 확인 (5분 이내면 사용, 그 이후면 새로 분석)
      const cacheDate = new Date(data.analysis_date || data.created_at);
      const now = new Date();
      const cacheAgeMinutes = (now - cacheDate) / (1000 * 60);
      
      if (cacheAgeMinutes > maxCacheAgeMinutes) {
        console.log(`[캐시] 캐시 생성 후 ${cacheAgeMinutes.toFixed(1)}분 경과 (최대 ${maxCacheAgeMinutes}분). 새로 분석합니다.`);
        return null;
      }
      
      try {
        const result = JSON.parse(data.analysis_result);
        console.log(`[캐시] 캐시 사용 (생성 후 ${cacheAgeMinutes.toFixed(1)}분 경과)`);
        return result;
      } catch (parseError) {
        console.error('캐시 결과 파싱 오류:', parseError);
        return null;
      }
    }

    return null;
  } catch (error) {
    console.error('캐시 조회 중 오류:', error);
    return null;
  }
}

/**
 * AI 분석 결과 캐시 저장
 * @param {number} shopId - 쇼핑몰 ID
 * @param {string} analysisType - 분석 유형
 * @param {object} analysisResult - 분석 결과
 * @param {number} cacheMinutes - 캐시 유지 시간 (분)
 * @returns {Promise<void>}
 */
async function saveAnalysisCache(shopId, analysisType, analysisResult, cacheMinutes = 10) {
  try {
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + cacheMinutes);

    const { error } = await supabase
      .from(AI_ANALYSIS_CACHE_TABLE)
      .insert({
        shop_id: shopId,
        analysis_type: analysisType,
        analysis_result: JSON.stringify(analysisResult),
        analysis_date: new Date().toISOString(),
        expires_at: expiresAt.toISOString()
      });

    if (error) {
      console.error('캐시 저장 오류:', error);
    }
  } catch (error) {
    console.error('캐시 저장 중 오류:', error);
  }
}

module.exports = {
  detectPhishing,
  checkSSL,
  checkRedirects,
  getDomainAge,
  fetchPageContent,
  analyzeReviewTrustWithAI,
  getShopReviewsForAnalysis,
  getAnalysisCache,
  saveAnalysisCache
};

