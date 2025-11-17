/**
 * 쇼핑몰 관련 컨트롤러
 */
const shopService = require('../services/shopService');
const trustScoreService = require('../services/trustScoreService');
const supabase = require('../config/supabase');
const { success, error } = require('../utils/response');
const { sanitizeInput, validateUrl } = require('../utils/validation');
const { verifyToken } = require('../utils/jwt');
const { normalizeUrl } = require('../utils/url');

/**
 * 쇼핑몰 검색
 */
exports.searchShop = async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return error(res, 'URL이 필요합니다.', 400);
    }

    const cleanUrl = sanitizeInput(url);
    if (!validateUrl(cleanUrl)) {
      return error(res, '올바른 URL 형식을 입력해주세요.', 400);
    }

    // 현재 로그인한 유저 ID 가져오기 (선택적)
    let userId = null;
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (token) {
      const decoded = verifyToken(token);
      if (decoded) {
        userId = decoded.id;
      }
    }

    const result = await shopService.searchShop(cleanUrl, userId, req);

    return success(res, result);
  } catch (err) {
    console.error('쇼핑몰 검색 오류:', err);
    return error(res, err.message || '쇼핑몰 검색에 실패했습니다.', 500);
  }
};

/**
 * 쇼핑몰의 신고 목록 조회
 */
exports.getShopReports = async (req, res) => {
  try {
    const { shopId } = req.params;
    const reports = await shopService.getShopReports(shopId);
    return success(res, reports);
  } catch (err) {
    console.error('신고 목록 조회 오류:', err);
    return error(res, '신고 목록 조회 실패', 500);
  }
};

/**
 * 쇼핑몰의 평점 조회
 */
exports.getShopRatings = async (req, res) => {
  try {
    const { shopId } = req.params;
    const ratings = await shopService.getShopRatings(shopId);
    return success(res, ratings);
  } catch (err) {
    console.error('평점 조회 오류:', err);
    return error(res, '평점 조회 실패', 500);
  }
};

/**
 * 쇼핑몰의 리뷰 목록 조회
 */
exports.getShopReviews = async (req, res) => {
  try {
    const { shopId } = req.params;
    const reviews = await shopService.getShopReviews(shopId);
    return success(res, reviews);
  } catch (err) {
    console.error('리뷰 목록 조회 오류:', err);
    return error(res, '리뷰 목록 조회 실패', 500);
  }
};

/**
 * 주의가 필요한 쇼핑몰 목록 조회
 */
exports.getDangerousShops = async (req, res) => {
  try {
    const shops = await shopService.getDangerousShops();
    console.log('getDangerousShops 결과:', shops);
    // shops가 배열인지 확인하고, 빈 배열도 허용
    const shopsArray = Array.isArray(shops) ? shops : [];
    return success(res, { shops: shopsArray });
  } catch (err) {
    console.error('주의가 필요한 쇼핑몰 조회 오류:', err);
    return error(res, `주의가 필요한 쇼핑몰 조회 실패: ${err.message}`, 500);
  }
};

/**
 * 고평점 쇼핑몰 목록 조회
 */
exports.getTopRatedShops = async (req, res) => {
  try {
    const shops = await shopService.getTopRatedShops();
    return success(res, { shops });
  } catch (err) {
    console.error('고평점 쇼핑몰 조회 오류:', err);
    return error(res, '고평점 쇼핑몰 조회 실패', 500);
  }
};

/**
 * 주의가 필요한 쇼핑몰 목록 조회 (상세)
 */
exports.getDangerousShopsDetailed = async (req, res) => {
  try {
    const supabase = require('../config/supabase');
    
    const { data: reports, error: reportsError } = await supabase
      .from('shop_reports')
      .select('shop_id')
      .not('shop_id', 'is', null);

    if (reportsError) throw reportsError;

    const shopIds = [...new Set(reports.map(r => r.shop_id))];

    if (shopIds.length === 0) {
      return success(res, []);
    }

    const { data: shops, error: shopsError } = await supabase
      .from('shops')
      .select('*')
      .in('id', shopIds);

    if (shopsError) throw shopsError;

    const shopsWithStats = await Promise.all(
      shops.map(async (shop) => {
        const { count: reportCount } = await supabase
          .from('shop_reports')
          .select('id', { count: 'exact', head: true })
          .eq('shop_id', shop.id);

        const { data: ratings } = await supabase
          .from('shop_ratings')
          .select('rating')
          .eq('shop_id', shop.id);

        const ratingCount = ratings?.length || 0;
        const averageRating = ratingCount > 0 
          ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratingCount 
          : 0;

        return {
          ...shop,
          reportCount: reportCount || 0,
          averageRating,
          ratingCount
        };
      })
    );

    const sortedShops = shopsWithStats.sort((a, b) => b.reportCount - a.reportCount);

    return success(res, { shops: sortedShops });
  } catch (err) {
    console.error('주의가 필요한 쇼핑몰 조회 오류:', err);
    return error(res, `주의가 필요한 쇼핑몰 조회 실패: ${err.message}`, 500);
  }
};

/**
 * 추천 쇼핑몰 목록 조회 (상세)
 */
exports.getRecommendedShopsDetailed = async (req, res) => {
  try {
    const supabase = require('../config/supabase');
    
    const { data: ratings, error: ratingsError } = await supabase
      .from('shop_ratings')
      .select('shop_id')
      .not('shop_id', 'is', null);

    if (ratingsError) throw ratingsError;

    const shopIds = [...new Set(ratings.map(r => r.shop_id))];

    if (shopIds.length === 0) {
      return success(res, []);
    }

    const { data: shops, error: shopsError } = await supabase
      .from('shops')
      .select('*')
      .in('id', shopIds);

    if (shopsError) throw shopsError;

    const shopsWithStats = await Promise.all(
      shops.map(async (shop) => {
        const { count: reportCount } = await supabase
          .from('shop_reports')
          .select('id', { count: 'exact', head: true })
          .eq('shop_id', shop.id);

        const { data: shopRatings } = await supabase
          .from('shop_ratings')
          .select('rating')
          .eq('shop_id', shop.id);

        const ratingCount = shopRatings?.length || 0;
        const averageRating = ratingCount > 0 
          ? shopRatings.reduce((sum, r) => sum + r.rating, 0) / ratingCount 
          : 0;

        return {
          ...shop,
          reportCount: reportCount || 0,
          averageRating,
          ratingCount
        };
      })
    );

    const sortedShops = shopsWithStats.sort((a, b) => b.averageRating - a.averageRating);

    return success(res, { shops: sortedShops });
  } catch (err) {
    console.error('추천 쇼핑몰 조회 오류:', err);
    return error(res, `추천 쇼핑몰 조회 실패: ${err.message}`, 500);
  }
};

/**
 * 쇼핑몰 전체 분석 실행
 * POST /api/shops/analyze
 */
exports.analyzeShop = async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return error(res, 'URL이 필요합니다.', 400);
    }

    const cleanUrl = sanitizeInput(url);
    if (!validateUrl(cleanUrl)) {
      return error(res, '올바른 URL 형식을 입력해주세요.', 400);
    }

    // 1. URL 정규화 후 shop 조회/생성
    const normalizedUrl = normalizeUrl(cleanUrl);
    let userId = null;
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (token) {
      const decoded = verifyToken(token);
      if (decoded) {
        userId = decoded.id;
      }
    }

    const { shop, error: shopError } = await shopService.createShopIfNotExists(
      normalizedUrl,
      userId,
      'analysis'
    );

    if (shopError) {
      return error(res, shopError, 400);
    }

    if (!shop) {
      return error(res, '쇼핑몰을 찾거나 생성할 수 없습니다.', 500);
    }

    // 2. ML 엔진으로부터 techRisk 가져오기
    const techRisk = await trustScoreService.getTechRiskFromMLEngine(normalizedUrl);

    // 3. 리뷰 분석 모듈로부터 reviewRisk 가져오기
    const reviewRisk = await trustScoreService.getReviewRiskFromAnalysis(shop.id);

    // 4. 관리자 검수된 신고 건수 기반 reportPenalty 계산
    const reportPenalty = await trustScoreService.calculateReportPenalty(shop.id);

    // 5. 최종 신뢰도 계산
    const { finalTrust, trustGrade } = trustScoreService.calculateFinalTrustScore({
      techRisk,
      reviewRisk,
      reportPenalty
    });

    // 6. shop_trust_scores 테이블에 upsert
    await trustScoreService.upsertTrustScore(shop.id, {
      techRisk,
      reviewRisk,
      reportPenalty,
      finalTrust,
      trustGrade,
      modelVersion: 'v1.0'
    });

    // 7. 응답 데이터 구성
    const response = {
      shop: {
        id: shop.id,
        url: shop.url,
        name: shop.name || shop.url
      },
      trust: {
        finalTrust,
        grade: trustGrade,
        gradeLabel: trustScoreService.getTrustGradeLabel(trustGrade),
        techRisk,
        reviewRisk,
        reportPenalty,
        breakdown: {
          domainPenalty: Math.round(techRisk * 75 * 0.4), // techRisk의 40%가 도메인 관련
          businessPenalty: Math.round(techRisk * 75 * 0.2), // techRisk의 20%가 사업자 관련
          reviewPenalty: Math.round(reviewRisk * 10), // reviewRisk 전체
          reportPenalty: reportPenalty
        }
      },
      analysisDetails: {
        domain: {},
        business: {},
        reviews: {},
        reports: {}
      }
    };

    return success(res, response);
  } catch (err) {
    console.error('쇼핑몰 분석 오류:', err);
    return error(res, err.message || '쇼핑몰 분석에 실패했습니다.', 500);
  }
};

