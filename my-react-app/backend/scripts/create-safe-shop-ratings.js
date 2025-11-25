/**
 * 안전한 쇼핑몰에 높은 평점 추가 스크립트
 * 
 * 사용법:
 * node scripts/create-safe-shop-ratings.js
 * 
 * safe_shops_urls_raw.txt의 모든 안전한 쇼핑몰에 높은 평점(4-5점)을 추가합니다.
 */

const supabase = require('../config/supabase');
const { normalizeUrl } = require('../utils/url');
const { getAnonymousUserId } = require('../utils/anonymousUser');

// 안전한 쇼핑몰 URL 목록 (전체 20개)
const safeShopUrls = [
  'https://www.coupang.com',
  'https://www.gmarket.co.kr',
  'https://www.auction.co.kr',
  'https://www.11st.co.kr',
  'https://www.ssg.com',
  'https://www.lotteon.com',
  'https://www.interpark.com',
  'https://www.tmon.co.kr',
  'https://www.wemakeprice.com',
  'https://www.musinsa.com',
  'https://www.yes24.com',
  'https://www.aladin.co.kr',
  'https://www.costco.co.kr',
  'https://www.homeplus.co.kr',
  'https://www.amazon.com',
  'https://www.ebay.com',
  'https://www.nike.com',
  'https://www.adidas.com',
  'https://www.alibaba.com',
  'https://www.aliexpress.com'
];

// 긍정적인 리뷰 템플릿
const positiveReviewTemplates = [
  '배송이 빠르고 상품 품질도 좋습니다. 만족합니다!',
  '정말 좋은 쇼핑몰이에요. 다음에도 이용하겠습니다.',
  '상품이 사진과 동일하고 포장도 깔끔합니다.',
  '고객 서비스가 친절하고 배송도 신속합니다.',
  '가격 대비 품질이 우수합니다. 추천합니다!',
  '빠른 배송과 좋은 상품으로 만족스러운 구매였습니다.',
  '신뢰할 수 있는 쇼핑몰입니다. 안심하고 구매할 수 있어요.',
  '상품 설명이 정확하고 실제 상품과 일치합니다.',
  '배송 추적이 잘 되고 고객센터 응대도 좋습니다.',
  '다양한 상품과 합리적인 가격으로 만족합니다.',
  '포인트 적립도 되고 할인 혜택도 많아서 좋아요.',
  '상품 교환/반품 정책이 명확하고 처리도 빠릅니다.',
  '모바일 앱도 편리하고 결제 시스템도 안전합니다.',
  '리뷰가 많아서 구매 결정에 도움이 됩니다.',
  '정기적으로 구매하는 신뢰할 수 있는 쇼핑몰입니다.',
  '상품 검색 기능이 편리하고 카테고리 분류도 잘 되어 있습니다.',
  '배송비가 합리적이고 무료배송 기준도 적절합니다.',
  '이벤트와 프로모션이 자주 있어서 좋습니다.',
  '상품 사진이 선명하고 상세 정보가 충실합니다.',
  '구매 후 후기 작성 시 포인트 적립이 되어 좋습니다.'
];

// 10월~11월 사이의 랜덤 날짜 생성
function generateRandomDate() {
  const startDate = new Date('2024-10-01');
  const endDate = new Date('2024-11-30');
  const timeDiff = endDate.getTime() - startDate.getTime();
  const randomTime = Math.random() * timeDiff;
  const randomDate = new Date(startDate.getTime() + randomTime);
  return randomDate.toISOString();
}

// 쇼핑몰 ID 조회
async function getShopId(normalizedUrl) {
  const { data: shop, error } = await supabase
    .from('shops')
    .select('id, parent_shop_id')
    .eq('url', normalizedUrl)
    .single();
  
  if (error) {
    console.error(`  ❌ 쇼핑몰 조회 실패: ${error.message}`);
    return null;
  }
  
  if (!shop) {
    console.error(`  ❌ 쇼핑몰을 찾을 수 없습니다: ${normalizedUrl}`);
    return null;
  }
  
  // parent_shop_id가 있으면 부모 ID 사용
  return shop.parent_shop_id || shop.id;
}

// 평점 생성
async function createRating(shopId, rating, comment, anonymousUserId, customDate = null) {
  const createdAt = customDate || generateRandomDate();
  
  const { data: newRating, error } = await supabase
    .from('shop_ratings')
    .insert({
      shop_id: shopId,
      user_id: anonymousUserId,
      rating: rating,
      comment: comment || null,
      created_at: createdAt
    })
    .select('id')
    .single();
  
  if (error) {
    console.error(`  ❌ 평점 생성 실패: ${error.message}`);
    return { success: false, error: error.message };
  }
  
  return { success: true, rating: newRating };
}

// 메인 함수
async function main() {
  console.log('=== 안전한 쇼핑몰 평점 추가 시작 ===\n');
  
  // 익명 사용자 ID 가져오기
  let anonymousUserId;
  try {
    anonymousUserId = await getAnonymousUserId();
    console.log(`✅ 익명 사용자 ID: ${anonymousUserId}\n`);
  } catch (error) {
    console.error('❌ 익명 사용자 ID를 가져올 수 없습니다:', error.message);
    console.error('익명 사용자가 데이터베이스에 존재하는지 확인해주세요.');
    process.exit(1);
  }
  
  let stats = {
    total: 0,
    created: 0,
    errors: 0
  };
  
  // 각 안전한 쇼핑몰에 평점 추가 (5-10개씩)
  for (const url of safeShopUrls) {
    const normalizedUrl = normalizeUrl(url);
    console.log(`\n[${safeShopUrls.indexOf(url) + 1}/${safeShopUrls.length}] ${url}`);
    console.log(`  → 정규화: ${normalizedUrl}`);
    
    const shopId = await getShopId(normalizedUrl);
    if (!shopId) {
      stats.errors++;
      continue;
    }
    
    // 각 쇼핑몰당 5-10개의 평점 생성
    const ratingCount = Math.floor(Math.random() * 6) + 5; // 5-10개
    console.log(`  → 평점 생성 예정: ${ratingCount}개`);
    
    for (let i = 0; i < ratingCount; i++) {
      stats.total++;
      
      // 높은 평점 (4-5점) 생성 (대부분 5점, 일부 4점)
      const rating = Math.random() < 0.8 ? 5 : 4; // 80% 확률로 5점
      
      // 랜덤 리뷰 선택 (50% 확률로 리뷰 포함)
      const hasComment = Math.random() < 0.5;
      const comment = hasComment 
        ? positiveReviewTemplates[Math.floor(Math.random() * positiveReviewTemplates.length)]
        : null;
      
      console.log(`    [${i + 1}/${ratingCount}] 평점: ${rating}점${comment ? ' (리뷰 포함)' : ''}`);
      
      const result = await createRating(shopId, rating, comment, anonymousUserId);
      
      if (result.success) {
        stats.created++;
        console.log(`      ✅ 평점 생성 성공 (ID: ${result.rating.id})`);
      } else {
        stats.errors++;
      }
      
      // API 레이트 리밋 방지
      await new Promise(resolve => setTimeout(resolve, 150));
    }
  }
  
  // 결과 요약
  console.log('\n\n=== 처리 완료 ===');
  console.log(`📊 전체: ${stats.total}개`);
  console.log(`  - 생성: ${stats.created}개`);
  console.log(`  - 오류: ${stats.errors}개`);
  console.log('\n✅ 완료!\n');
}

// 스크립트 실행
main().catch(error => {
  console.error('\n❌ 스크립트 실행 중 오류 발생:', error);
  process.exit(1);
});

