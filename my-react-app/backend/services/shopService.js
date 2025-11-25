/**
 * 쇼핑몰 관련 서비스
 */
const supabase = require('../config/supabase');
const { normalizeUrl, extractRootDomain, calculateSimilarity } = require('../utils/url');

// 타이틀 캐시 (메모리 기반)
const titleCache = new Map();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24시간

/**
 * 웹사이트 타이틀 가져오기
 */
async function getWebsiteTitle(url) {
  try {
    const cacheKey = url.toLowerCase();
    const cached = titleCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log('캐시에서 타이틀 반환:', cached.title);
      return cached.title;
    }
    
    if (url.includes('smartstore.naver.com')) {
      const storeName = await getStoreNameFromUrl(url);
      if (storeName) {
        console.log('스마트스토어 URL에서 추출 성공:', storeName);
        return storeName;
      }
    }
    
    const fetch = await import('node-fetch');
    
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    
    console.log('타이틀 가져오기 시도:', url);
    
    const response = await fetch.default(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache'
      },
      timeout: 10000,
      redirect: 'follow',
      follow: 5
    });
    
    if (!response.ok) {
      console.log(`HTTP 응답 실패 (${response.status}):`, url);
      if (url.includes('smartstore.naver.com')) {
        return await getStoreNameFromUrl(url);
      }
      return null;
    }
    
    const html = await response.text();
    let title = null;
    
    // 스마트 스토어 특별 처리
    if (url.includes('smartstore.naver.com')) {
      const ogTitleMatch = html.match(/<meta[^>]*property=['"]og:title['"][^>]*content=['"]([^'"]+)['"][^>]*>/i);
      if (ogTitleMatch && ogTitleMatch[1]) {
        const cleanTitle = ogTitleMatch[1]
          .replace(/네이버 스마트스토어\s*/gi, '')
          .replace(/스마트스토어\s*/gi, '')
          .replace(/smartstore\s*/gi, '')
          .trim();
        if (cleanTitle && cleanTitle.length > 1) {
          console.log('스마트스토어 HTML에서 추출 성공:', cleanTitle);
          return cleanTitle;
        }
      }
      
      const titleMatch = html.match(/<title[^>]*>\s*(.*?)\s*<\/title>/i);
      if (titleMatch && titleMatch[1]) {
        const cleanTitle = titleMatch[1]
          .replace(/네이버 스마트스토어\s*/gi, '')
          .replace(/스마트스토어\s*/gi, '')
          .trim();
        if (cleanTitle && cleanTitle.length > 1) {
          console.log('스마트스토어 title 태그에서 추출 성공:', cleanTitle);
          return cleanTitle;
        }
      }
      
      const urlStoreName = await getStoreNameFromUrl(url);
      if (urlStoreName) {
        console.log('스마트스토어 URL 백업 추출 성공:', urlStoreName);
        return urlStoreName;
      }
    }
    
    // 기본 타이틀 태그
    const titleMatch = html.match(/<title[^>]*>\s*([^<]+)\s*<\/title>/i);
    if (titleMatch && titleMatch[1]) {
      title = titleMatch[1].trim();
    }
    
    // Open Graph 타이틀
    if (!title) {
      const ogTitleMatch = html.match(/<meta[^>]*property=['"]og:title['"][^>]*content=['"]([^'"]+)['"][^>]*>/i);
      if (ogTitleMatch && ogTitleMatch[1]) {
        title = ogTitleMatch[1].trim();
      }
    }
    
    // Twitter 타이틀
    if (!title) {
      const twitterTitleMatch = html.match(/<meta[^>]*name=['"]twitter:title['"][^>]*content=['"]([^'"]+)['"][^>]*>/i);
      if (twitterTitleMatch && twitterTitleMatch[1]) {
        title = twitterTitleMatch[1].trim();
      }
    }
    
    // meta description을 fallback으로 사용
    if (!title) {
      const descMatch = html.match(/<meta[^>]*name=['"]description['"][^>]*content=['"]([^'"]+)['"][^>]*>/i);
      if (descMatch && descMatch[1]) {
        title = descMatch[1].substring(0, 50).trim();
        console.log('description에서 타이틀 추출:', title);
      }
    }
    
    // h1 태그를 최후 fallback으로 사용
    if (!title) {
      const h1Match = html.match(/<h1[^>]*>\s*([^<]+)\s*<\/h1>/i);
      if (h1Match && h1Match[1]) {
        title = h1Match[1].substring(0, 50).trim();
        console.log('h1 태그에서 타이틀 추출:', title);
      }
    }
    
    if (title) {
      const cleanTitle = title
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&#x27;/g, "'")
        .replace(/&nbsp;/g, ' ')
        .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec))
        .replace(/\s+/g, ' ')
        .trim();
      
      if (cleanTitle && cleanTitle.length > 0) {
        console.log('타이틀 추출 성공:', cleanTitle);
        
        titleCache.set(cacheKey, {
          title: cleanTitle,
          timestamp: Date.now()
        });
        
        return cleanTitle;
      }
    }
    
    console.log('타이틀을 찾을 수 없음:', url);
    return null;
  } catch (error) {
    console.error('타이틀 가져오기 실패:', url, error.message);
    if (url.includes('smartstore.naver.com')) {
      return await getStoreNameFromUrl(url);
    }
    return null;
  }
}

/**
 * URL에서 스토어명 추출
 */
async function getStoreNameFromUrl(url) {
  try {
    if (!url.includes('smartstore.naver.com')) return null;
    
    const urlObj = new URL(url.startsWith('http') ? url : 'https://' + url);
    const pathSegments = urlObj.pathname.split('/').filter(part => part && part.length > 0);
    
    if (pathSegments.length > 0) {
      const storeSegment = pathSegments[0];
      
      if (storeSegment && 
          !storeSegment.includes('undefined') && 
          storeSegment.length >= 3 && 
          !storeSegment.match(/^\d+$/) &&
          isNaN(storeSegment)) {
        return storeSegment
          .replace(/_/g, ' ')
          .replace(/-/g, ' ')
          .split(/(?=[A-Z])/)
          .join(' ')
          .trim();
      }
    }
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * 유사 쇼핑몰 찾기
 */
async function findSimilarShops(normalizedUrl, limit = 5, minSimilarity = 0.6) {
  try {
    const urlObj = new URL(normalizedUrl.startsWith('http') ? normalizedUrl : 'https://' + normalizedUrl);
    const domain = urlObj.hostname.toLowerCase().replace(/^www\./, '');
    const rootDomain = extractRootDomain(normalizedUrl);
    
    const { data: rootDomainShops, error: rootError } = await supabase
      .from('shops')
      .select('*')
      .ilike('url', `%${rootDomain}%`)
      .limit(50);
    
    if (rootError) {
      console.error('루트 도메인 검색 에러:', rootError);
    }
    
    const domainName = domain.split('.')[0];
    const allShops = rootDomainShops || [];
    
    const shopsWithSimilarity = allShops
      .map(shop => {
        try {
          const shopUrlObj = new URL(shop.url.startsWith('http') ? shop.url : 'https://' + shop.url);
          const shopDomain = shopUrlObj.hostname.toLowerCase().replace(/^www\./, '');
          const shopDomainName = shopDomain.split('.')[0];
          
          const similarity = calculateSimilarity(domainName, shopDomainName);
          
          return {
            ...shop,
            similarity,
            domainName: shopDomainName
          };
        } catch (error) {
          return null;
        }
      })
      .filter(shop => shop !== null && shop.similarity >= minSimilarity && shop.url !== normalizedUrl)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
    
    const result = [];
    for (const shop of shopsWithSimilarity) {
      let finalShop = shop;
      if (shop.parent_shop_id) {
        const { data: parentShop } = await supabase
          .from('shops')
          .select('*')
          .eq('id', shop.parent_shop_id)
          .single();
        if (parentShop) {
          finalShop = { ...parentShop, similarity: shop.similarity };
        }
      }
      if (!result.find(s => s.id === finalShop.id)) {
        result.push(finalShop);
      }
    }
    
    return result.slice(0, limit);
  } catch (error) {
    console.error('유사 쇼핑몰 찾기 에러:', error);
    return [];
  }
}

/**
 * 검색 로그 기록
 */
async function logShopSearch(normalizedUrl, rawUrl, userId = null, req = null) {
  try {
    const ipAddress = req ? (req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress) : null;
    const userAgent = req ? req.headers['user-agent'] : null;
    
    await supabase
      .from('shop_search_logs')
      .insert({
        normalized_url: normalizedUrl,
        raw_url: rawUrl,
        user_id: userId,
        ip_address: ipAddress,
        user_agent: userAgent
      });
  } catch (error) {
    console.error('검색 로그 기록 에러:', error);
  }
}

/**
 * 일일 쇼핑몰 생성 개수 확인
 */
async function checkDailyShopCreationLimit(userId) {
  try {
    if (!userId) {
      return { count: 0, limit: 3, canCreate: false };
    }
    
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    
    const { data: shops, error } = await supabase
      .from('shops')
      .select('id')
      .eq('created_by_user_id', userId)
      .gte('created_at', today.toISOString());
    
    if (error) {
      console.error('일일 생성 제한 확인 에러:', error);
      return { count: 0, limit: 3, canCreate: true };
    }
    
    const count = shops ? shops.length : 0;
    const limit = 3;
    
    return {
      count,
      limit,
      canCreate: count < limit
    };
  } catch (error) {
    console.error('일일 생성 제한 확인 에러:', error);
    return { count: 0, limit: 3, canCreate: true };
  }
}

/**
 * URL에서 기본 이름 추출
 */
function extractDefaultNameFromUrl(url) {
  try {
    // URL 정규화
    let cleanUrl = url;
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = 'https://' + cleanUrl;
    }
    
    const urlObj = new URL(cleanUrl);
    let hostname = urlObj.hostname.toLowerCase();
    
    // www. 제거
    hostname = hostname.replace(/^www\./, '');
    
    // 도메인에서 기본 이름 추출
    // 예: example.com -> example
    // 예: shop.example.com -> shop
    const parts = hostname.split('.');
    
    // 서브도메인이 있는 경우 서브도메인 사용, 없으면 메인 도메인 사용
    let defaultName = parts.length > 2 ? parts[0] : parts[0];
    
    // 특수 문자 제거 및 대문자 변환
    defaultName = defaultName
      .replace(/[_-]/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2') // camelCase 분리
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    
    // 너무 짧거나 의미 없는 이름인 경우 전체 도메인 사용
    if (defaultName.length < 2) {
      defaultName = hostname.split('.')[0];
    }
    
    return defaultName || hostname;
  } catch (error) {
    // URL 파싱 실패 시 원본 URL의 일부 사용
    return url.split('/')[0].replace(/^www\./, '').split('.')[0] || url;
  }
}

/**
 * 쇼핑몰 생성 (일일 제한 체크 포함)
 */
async function createShopIfNotExists(normalizedUrl, userId = null, createdVia = 'search', parentShopId = null) {
  try {
    const { data: existingShop, error: searchError } = await supabase
      .from('shops')
      .select('*')
      .eq('url', normalizedUrl)
      .single();
    
    if (searchError && searchError.code !== 'PGRST116') {
      throw searchError;
    }
    
    if (existingShop) {
      if (existingShop.parent_shop_id) {
        const { data: parentShop } = await supabase
          .from('shops')
          .select('*')
          .eq('id', existingShop.parent_shop_id)
          .single();
        return { shop: parentShop || existingShop, error: null };
      }
      return { shop: existingShop, error: null };
    }
    
    if (userId) {
      const limitCheck = await checkDailyShopCreationLimit(userId);
      if (!limitCheck.canCreate) {
        return {
          shop: null,
          error: `하루에 최대 ${limitCheck.limit}개의 쇼핑몰만 등록할 수 있습니다. (현재: ${limitCheck.count}개)`
        };
      }
    }
    
    // URL에서 기본 이름 추출 (타이틀을 가져오기 전에 임시로 사용)
    const defaultName = extractDefaultNameFromUrl(normalizedUrl);
    
    const { data: newShop, error: insertError } = await supabase
      .from('shops')
      .insert({
        url: normalizedUrl,
        name: defaultName, // 기본 이름 설정 (나중에 타이틀로 업데이트될 수 있음)
        parent_shop_id: parentShopId,
        created_by_user_id: userId,
        created_via: createdVia
      })
      .select('*')
      .single();
    
    if (insertError) throw insertError;
    
    // 백그라운드에서 타이틀 가져오기 (성공하면 더 나은 이름으로 업데이트)
    getWebsiteTitle(normalizedUrl).then(titleName => {
      if (titleName && titleName.trim().length > 0) {
        supabase
          .from('shops')
          .update({ name: titleName })
          .eq('id', newShop.id)
          .then(({ error }) => {
            if (error) {
              console.error('타이틀 업데이트 에러:', error);
            } else {
              console.log('타이틀 업데이트 성공:', titleName);
            }
          });
      }
    }).catch(error => {
      console.error('백그라운드 타이틀 가져오기 에러:', error);
      // 타이틀을 가져오지 못해도 기본 이름이 이미 설정되어 있음
    });
    
    return { shop: newShop, error: null };
  } catch (error) {
    console.error('쇼핑몰 생성 에러:', error);
    return {
      shop: null,
      error: error.message || '쇼핑몰 생성에 실패했습니다.'
    };
  }
}

/**
 * 쇼핑몰 검색
 */
async function searchShop(url, userId = null, req = null) {
  const normalizedUrl = normalizeUrl(url);
  console.log('원본 URL:', url, '-> 정규화된 URL:', normalizedUrl);

  // 검색 로그 기록 (비동기)
  logShopSearch(normalizedUrl, url, userId, req).catch(err => {
    console.error('검색 로그 기록 실패:', err);
  });

  // 기존 쇼핑몰 검색
  const { data: existingShop, error: searchError } = await supabase
    .from('shops')
    .select('*')
    .eq('url', normalizedUrl)
    .single();

  if (searchError && searchError.code !== 'PGRST116') {
    throw searchError;
  }

  if (existingShop) {
    let shop = existingShop;
    
    if (shop.parent_shop_id) {
      const { data: parentShop, error: parentError } = await supabase
        .from('shops')
        .select('*')
        .eq('id', shop.parent_shop_id)
        .single();
      
      if (!parentError && parentShop) {
        console.log(`쇼핑몰 병합됨: ${shop.id} -> ${parentShop.id}`);
        shop = parentShop;
      }
    }
    
    return {
      shop: shop,
      isNew: false,
      isTemporary: false
    };
  } else {
    const similarShops = await findSimilarShops(normalizedUrl, 5, 0.6);
    
    return {
      shop: {
        id: 0,
        url: normalizedUrl,
        name: null,
        parent_shop_id: null,
        created_at: null
      },
      isNew: true,
      isTemporary: true,
      similarShops: similarShops.map(s => ({
        id: s.id,
        url: s.url,
        name: s.name,
        similarity: s.similarity
      }))
    };
  }
}

/**
 * 쇼핑몰의 신고 목록 조회
 */
async function getShopReports(shopId) {
  const { data: reports, error } = await supabase
    .from('shop_reports')
    .select('*')
    .eq('shop_id', shopId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return reports || [];
}

/**
 * 쇼핑몰의 평점 조회
 */
async function getShopRatings(shopId) {
  const { data: ratings, error } = await supabase
    .from('shop_ratings')
    .select('rating')
    .eq('shop_id', shopId);

  if (error) throw error;

  const ratingCount = ratings.length;
  const totalRating = ratings.reduce((sum, r) => sum + r.rating, 0);
  const averageRating = ratingCount > 0 ? totalRating / ratingCount : 0;
  
  const ratingDistribution = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0
  };
  
  ratings.forEach(r => {
    if (r.rating >= 1 && r.rating <= 5) {
      ratingDistribution[r.rating]++;
    }
  });
  
  return {
    averageRating: Number(averageRating.toFixed(1)),
    totalRatings: ratingCount,
    ratingDistribution: ratingDistribution
  };
}

/**
 * 쇼핑몰의 리뷰 목록 조회
 */
async function getShopReviews(shopId) {
  const { data: ratings, error } = await supabase
    .from('shop_ratings')
    .select('id, rating, comment, created_at, user_id')
    .eq('shop_id', shopId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  const reviews = await Promise.all(
    (ratings || []).map(async (rating) => {
      if (rating.user_id) {
        const { data: user, error: userError } = await supabase
          .from('users')
          .select('username')
          .eq('id', rating.user_id)
          .single();
        
        if (!userError && user) {
          return {
            ...rating,
            username: user.username
          };
        }
      }
      return rating;
    })
  );

  return reviews;
}

/**
 * 주의가 필요한 쇼핑몰 목록 조회
 */
async function getDangerousShops() {
  try {
    const { data: shopReports, error } = await supabase
      .from('shop_reports')
      .select(`shop_id, shops!inner (id, url, name)`);

    if (error) {
      console.error('getDangerousShops DB 에러:', error);
      throw error;
    }

    if (!shopReports || shopReports.length === 0) {
      return [];
    }

    const reportCounts = {};
    shopReports.forEach(report => {
      const shopId = report.shop_id;
      if (!reportCounts[shopId]) {
        reportCounts[shopId] = { shop: report.shops, reportCount: 0 };
      }
      reportCounts[shopId].reportCount++;
    });

    // 각 쇼핑몰의 평점 정보도 가져오기
    const shopIds = Object.keys(reportCounts).map(id => parseInt(id));
    const { data: ratings, error: ratingsError } = await supabase
      .from('shop_ratings')
      .select('shop_id, rating')
      .in('shop_id', shopIds);

    if (ratingsError) {
      console.error('평점 조회 에러:', ratingsError);
    }

    // shop_id별 평점 집계
    const ratingStats = {};
    if (ratings) {
      ratings.forEach(rating => {
        const shopId = rating.shop_id;
        if (!ratingStats[shopId]) {
          ratingStats[shopId] = { total: 0, count: 0 };
        }
        ratingStats[shopId].total += rating.rating;
        ratingStats[shopId].count++;
      });
    }

    // 등급 계산 및 필터링
    const shopsWithGrade = Object.values(reportCounts)
      .map(item => {
        const shopId = item.shop.id;
        const stats = ratingStats[shopId] || { total: 0, count: 0 };
        const averageRating = stats.count > 0 ? stats.total / stats.count : 0;
        const reportCount = item.reportCount;
        
        // 등급 계산 (피싱 의심, 주의, 약간 주의)
        let grade = null;
        // 피싱 의심: 신고 10개 이상 AND 평점 2.0 이하, 또는 신고 15개 이상
        if ((reportCount >= 10 && averageRating <= 2.0) || reportCount >= 15) {
          grade = 'critical'; // 피싱 의심
        }
        // 주의: 신고 5개 이상 AND 평점 3.0 이하, 또는 신고 10개 이상
        else if ((reportCount >= 5 && averageRating <= 3.0) || reportCount >= 10) {
          grade = 'high'; // 주의
        }
        // 약간 주의: 신고 3개 이상 AND 평점 3.5 이하, 또는 신고 5개 이상
        else if ((reportCount >= 3 && averageRating <= 3.5) || reportCount >= 5) {
          grade = 'medium'; // 약간 주의
        }
        
        return {
          id: shopId,
          url: item.shop.url,
          name: item.shop.name || item.shop.url,
          reportCount: reportCount,
          averageRating: Number(averageRating.toFixed(1)),
          ratingCount: stats.count,
          grade: grade
        };
      })
      .filter(shop => shop.grade !== null); // 등급이 있는 쇼핑몰만 필터링

    // 등급별로 정렬 (피싱 의심 > 주의 > 약간 주의), 같은 등급 내에서는 신고 수 많은 순
    const gradeOrder = { 'critical': 3, 'high': 2, 'medium': 1 };
    const sortedShops = shopsWithGrade.sort((a, b) => {
      const gradeDiff = (gradeOrder[b.grade] || 0) - (gradeOrder[a.grade] || 0);
      if (gradeDiff !== 0) {
        return gradeDiff;
      }
      return b.reportCount - a.reportCount;
    });

    return sortedShops;
  } catch (err) {
    console.error('getDangerousShops 에러:', err);
    throw err;
  }
}

/**
 * 고평점 쇼핑몰 목록 조회
 */
async function getTopRatedShops() {
  const { data: shopRatings, error } = await supabase
    .from('shop_ratings')
    .select(`shop_id, rating, shops!inner (id, url, name)`);

  if (error) throw error;

  const ratingData = {};
  shopRatings.forEach(rate => {
    const shopId = rate.shop_id;
    if (!ratingData[shopId]) {
      ratingData[shopId] = { shop: rate.shops, ratings: [] };
    }
    ratingData[shopId].ratings.push(rate.rating);
  });

  const topRated = Object.values(ratingData)
    .map(item => {
      const ratings = item.ratings;
      const averageRating = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
      return {
        id: item.shop.id,
        url: item.shop.url,
        name: item.shop.name || item.shop.url, // name이 없으면 URL 사용
        averageRating: Number(averageRating.toFixed(1)),
        totalRatings: ratings.length
      };
    })
    .filter(item => item.totalRatings >= 5)
    .sort((a, b) => b.averageRating - a.averageRating)
    .slice(0, 10);

  return topRated;
}

module.exports = {
  searchShop,
  createShopIfNotExists,
  getShopReports,
  getShopRatings,
  getShopReviews,
  getDangerousShops,
  getTopRatedShops,
  getWebsiteTitle,
  findSimilarShops,
  logShopSearch,
  checkDailyShopCreationLimit
};

