/**
 * 평점 관련 컨트롤러
 */
const supabase = require('../config/supabase');
const shopService = require('../services/shopService');
const { success, error } = require('../utils/response');
const { sanitizeInput } = require('../utils/validation');
const { normalizeUrl } = require('../utils/url');

/**
 * 평점 등록
 */
exports.createRating = async (req, res) => {
  try {
    const { shopUrl, rating, comment } = req.body;
    
    console.log('평점 등록 요청:', { shopUrl, rating, hasComment: !!comment, commentLength: comment?.length });
    
    if (!shopUrl || !rating || rating < 1 || rating > 5) {
      return error(res, '올바른 평점을 입력해주세요.', 400);
    }

    // 로그인한 사용자 정보 가져오기 (필수)
    // verifyTokenMiddleware를 통해 req.user에 사용자 정보가 설정됨
    if (!req.user || !req.user.id) {
      return error(res, '로그인이 필요합니다.', 401);
    }

    const userId = req.user.id;
    console.log('로그인한 사용자 ID:', userId);

    const normalizedUrl = normalizeUrl(shopUrl);
    
    // 쇼핑몰 생성 또는 조회
    const { shop, error: shopError } = await shopService.createShopIfNotExists(
      normalizedUrl,
      userId,
      'rating',
      null
    );

    if (shopError) {
      return error(res, shopError, 400);
    }

    if (!shop) {
      return error(res, '쇼핑몰 정보를 가져올 수 없습니다.', 500);
    }

    // parent_shop_id가 있으면 부모 ID를 사용
    const shopId = shop.parent_shop_id || shop.id;
    console.log(`평점 등록 - Shop ID: ${shop.id}, Parent ID: ${shop.parent_shop_id}, 사용할 ID: ${shopId}`);

    // comment가 있으면 포함하여 저장
    const ratingData = { 
      shop_id: shopId,
      user_id: userId,
      rating: rating 
    };
    
    if (comment && comment.trim()) {
      ratingData.comment = comment.trim();
      console.log('리뷰 내용 저장:', ratingData.comment.substring(0, 50) + '...');
    }

    console.log('저장할 평점 데이터:', ratingData);

    const { data: newRating, error: ratingError } = await supabase
      .from('shop_ratings')
      .insert(ratingData)
      .select('*')
      .single();

    if (ratingError) {
      console.error('평점 저장 오류:', ratingError);
      throw ratingError;
    }

    console.log('평점 저장 성공:', newRating);

    return success(res, { rating: newRating }, '평점이 등록되었습니다.', 201);
  } catch (err) {
    console.error('평점 등록 오류:', err);
    return error(res, `평점 등록 실패: ${err.message || '알 수 없는 오류'}`, 500);
  }
};

