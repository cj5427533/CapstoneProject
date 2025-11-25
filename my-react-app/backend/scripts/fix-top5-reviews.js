/**
 * 주의가 필요한 페이지 Top 5 쇼핑몰 리뷰 수정 스크립트
 * 
 * 사용법:
 * node scripts/fix-top5-reviews.js
 * 
 * 1. 모든 Top 5 쇼핑몰에 충분한 리뷰가 있는지 확인하고 추가
 * 2. anonymous 사용자명을 가진 리뷰를 실제 사용자 ID로 변경
 * 3. comment가 없는 리뷰에 부정적인 리뷰 내용 추가
 */

const supabase = require('../config/supabase');
const { normalizeUrl } = require('../utils/url');

// Top 5 쇼핑몰 목록
const top5Shops = [
  {
    name: '매우 의심가는 쇼핑몰 [테스트]',
    url: null,
    targetReviewCount: 25
  },
  {
    name: '의심가는 쇼핑몰 [테스트]',
    url: null,
    targetReviewCount: 25
  },
  {
    name: '우아한',
    url: 'https://wooahwan.co.kr/pages/xyMbKB251029?mediaCode=FBIG_05_03A&utm_source=meta&utm_medium=cpc&utm_campaign=wooahwan&utm_term=FBIG_05_03A&utm_id=120235391964000389&utm_content=120235539917910389&fbclid=PAZXh0bgNhZW0BMABhZGlkAaspytjObkFzcnRjBmFwcF9pZA8xMjQwMjQ1NzQyODc0MTQAAafyQBLrLA6pvuylziCSWs7be_hbRk5hSzmQgO1eeytuDUxPCnFg_GpU73GLwg_aem_Uu_J6eR1d8WxeQ8AD_6g7A',
    targetReviewCount: 25
  },
  {
    name: '프로뉴트리션',
    url: 'https://pronutrition.co.kr/product/detail.html?product_no=52&cafe_mkt=ue_dp_nt_v2703&utm_medium=paid&utm_source=ig&utm_id=120230608167000017_v2_s02&utm_content=120233249084780017&utm_term=120233249084790017&utm_campaign=120230608167000017&fbclid=PAZXh0bgNhZW0BMABhZGlkAaspytjObkFzcnRjBmFwcF9pZA8xMjQwMjQ1NzQyODc0MTQAAafyQBLrLA6pvuylziCSWs7be_hbRk5hSzmQgO1eeytuDUxPCnFg_GpU73GLwg_aem_Uu_J6eR1d8WxeQ8AD_6g7A',
    targetReviewCount: 25
  },
  {
    name: '리필드',
    url: 'https://refilled.co.kr/product/detail.html?product_no=285&gad_source=4&gad_campaignid=22681366979&gbraid=0AAAAABYcevjDuN4QKUyFkbRgxSCzzR1c0&gclid=Cj0KCQiA5abIBhCaARIsAM3-zFUPWAHbC6cFEiMyyqF5h3sytoKRJ6b5W7Zs-i2CGWy466nx0kVLVFIaApZJEALw_wcB',
    targetReviewCount: 25
  }
];

// 부정적인 리뷰 템플릿
const negativeReviewTemplates = [
  '헐~ 여기 진짜 사기꾼인데.. 돈만 받고 배송도 안 해줘 ㅠㅠ',
  'ㅋㅋ 여기서는 그냥 제품 사지말자. 완전 사기',
  '와 진짜 후회함.. 결제했는데 연락도 안 되고 배송도 안 옴',
  '이거 사기 사이트 맞아요. 돈만 날렸어요 ㅠ',
  '제발 여기서 사지 마세요. 완전 사기꾼들임',
  '고객센터 전화도 안 받고 이메일도 안 답해줌. 진짜 최악',
  '배송비만 받고 상품은 안 보내줌. 명백한 사기',
  '여기서 주문한 지 한 달 됐는데 아직도 안 옴. 환불도 안 해줌',
  '완전 사기 사이트입니다. 제발 피하세요',
  '돈만 받고 연락 두절. 진짜 최악의 쇼핑몰',
  '여기서 사면 후회합니다. 제품도 안 오고 환불도 안 해줌',
  '사기꾼들 집합소네요. 여기서 사지 마세요',
  '배송 추적도 안 되고 연락도 안 됨. 완전 사기',
  '제품 받았는데 사진이랑 완전 달라요. 가짜 제품 같아요',
  '환불 요청했는데 2개월째 답변 없음. 진짜 최악',
  '여기서 사면 돈만 날리는 거예요. 제발 피하세요',
  '고객센터가 존재하는지 모르겠어요. 전화도 안 받음',
  '사기 사이트 맞습니다. 제발 여기서 사지 마세요',
  '배송도 안 해주고 환불도 안 해줌. 완전 사기꾼',
  '여기서 주문한 제품 아직도 안 옴. 돈만 날렸어요',
  '진짜 최악의 쇼핑몰입니다. 제발 피하세요',
  '사기꾼들 모임이네요. 여기서 사면 후회합니다',
  '배송비만 받고 제품은 안 보내줌. 명백한 사기',
  '연락도 안 되고 배송도 안 해줌. 완전 사기',
  '여기서 사면 돈만 날리는 거예요. 제발 피하세요',
  '고객센터 전화도 안 받고 이메일도 안 답해줌',
  '사기 사이트 맞아요. 제발 여기서 사지 마세요',
  '배송 추적도 안 되고 연락도 안 됨. 완전 사기',
  '제품 받았는데 사진이랑 완전 달라요. 가짜 같아요',
  '환불 요청했는데 답변 없음. 진짜 최악'
];

// 랜덤 날짜 생성 (최근 3개월)
function generateRandomDate() {
  const now = new Date();
  const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const timeDiff = now.getTime() - threeMonthsAgo.getTime();
  const randomTime = Math.random() * timeDiff;
  return new Date(threeMonthsAgo.getTime() + randomTime).toISOString();
}

// 실제 사용자 ID 목록 가져오기
async function getRandomUserIds(count = 20) {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('id')
      .limit(count);
    
    if (error) {
      console.error('사용자 조회 오류:', error);
      return [];
    }
    
    return users ? users.map(u => u.id) : [];
  } catch (error) {
    console.error('사용자 ID 가져오기 오류:', error);
    return [];
  }
}

// 쇼핑몰 ID 조회
async function getShopId(normalizedUrl, shopName) {
  // 이름으로 먼저 찾기
  if (shopName) {
    const { data: shopsByName, error: nameError } = await supabase
      .from('shops')
      .select('id, name, url, parent_shop_id')
      .eq('name', shopName);
    
    if (!nameError && shopsByName && shopsByName.length > 0) {
      const shop = shopsByName[0];
      // parent_shop_id가 있으면 부모 ID 사용
      const shopId = shop.parent_shop_id || shop.id;
      console.log(`  → 이름으로 쇼핑몰 찾음: ${shop.name} (ID: ${shop.id}, Parent ID: ${shop.parent_shop_id || '없음'}, 사용할 ID: ${shopId})`);
      return shopId;
    }
  }
  
  // URL로 찾기
  if (normalizedUrl) {
    const { data: shop, error } = await supabase
      .from('shops')
      .select('id, name, parent_shop_id')
      .eq('url', normalizedUrl)
      .single();
    
    if (error || !shop) {
      console.error(`  ❌ 쇼핑몰을 찾을 수 없습니다: ${normalizedUrl}`);
      return null;
    }
    
    const shopId = shop.parent_shop_id || shop.id;
    console.log(`  → URL로 쇼핑몰 찾음: ${shop.name} (ID: ${shop.id}, Parent ID: ${shop.parent_shop_id || '없음'}, 사용할 ID: ${shopId})`);
    return shopId;
  }
  
  console.error(`  ❌ 쇼핑몰을 찾을 수 없습니다: 이름=${shopName}, URL=${normalizedUrl}`);
  return null;
}

// 리뷰 생성
async function createRating(shopId, rating, comment, userId) {
  const createdAt = generateRandomDate();
  
  const { data: newRating, error } = await supabase
    .from('shop_ratings')
    .insert({
      shop_id: shopId,
      user_id: userId,
      rating: rating,
      comment: comment,
      created_at: createdAt
    })
    .select('id')
    .single();
  
  if (error) {
    console.error(`    ❌ 리뷰 생성 실패: ${error.message}`);
    return { success: false, error: error.message };
  }
  
  return { success: true, rating: newRating };
}

// 메인 함수
async function main() {
  console.log('=== Top 5 쇼핑몰 리뷰 수정 시작 ===\n');
  
  // 실제 사용자 ID 목록 가져오기
  const userIds = await getRandomUserIds(30);
  if (userIds.length === 0) {
    console.error('❌ 사용자 ID를 가져올 수 없습니다. DB에 사용자가 있는지 확인해주세요.');
    process.exit(1);
  }
  console.log(`✅ 사용 가능한 사용자 ID: ${userIds.length}개\n`);
  
  let stats = {
    shopsProcessed: 0,
    reviewsCreated: 0,
    reviewsUpdated: 0,
    anonymousFixed: 0,
    commentsAdded: 0,
    errors: 0
  };
  
  // 각 쇼핑몰 처리
  for (const shop of top5Shops) {
    console.log(`\n[${shop.name}]`);
    
    let normalizedUrl = null;
    if (shop.url) {
      console.log(`  URL: ${shop.url}`);
      normalizedUrl = normalizeUrl(shop.url);
      console.log(`  → 정규화된 URL: ${normalizedUrl}`);
    } else {
      console.log(`  → URL 없음, 이름으로 검색: ${shop.name}`);
    }
    
    const shopId = await getShopId(normalizedUrl, shop.name);
    if (!shopId) {
      stats.errors++;
      continue;
    }
    
    // 1. 기존 리뷰 수 확인 및 추가 생성
    const { data: existingRatings, error: countError } = await supabase
      .from('shop_ratings')
      .select('id, user_id, comment, rating')
      .eq('shop_id', shopId);
    
    if (countError) {
      console.error(`  ❌ 리뷰 조회 오류: ${countError.message}`);
      stats.errors++;
      continue;
    }
    
    const currentRatingCount = existingRatings ? existingRatings.length : 0;
    const needToCreate = Math.max(0, shop.targetReviewCount - currentRatingCount);
    
    console.log(`  → 현재 리뷰 수: ${currentRatingCount}건`);
    console.log(`  → 목표 리뷰 수: ${shop.targetReviewCount}건`);
    console.log(`  → 추가 생성 필요: ${needToCreate}건`);
    
    // 부족한 리뷰 생성
    if (needToCreate > 0) {
      for (let i = 0; i < needToCreate; i++) {
        const rating = Math.floor(Math.random() * 3) + 1; // 1, 2, 3
        const template = negativeReviewTemplates[Math.floor(Math.random() * negativeReviewTemplates.length)];
        const randomUserId = userIds[Math.floor(Math.random() * userIds.length)];
        
        const result = await createRating(shopId, rating, template, randomUserId);
        
        if (result.success) {
          stats.reviewsCreated++;
          if ((i + 1) % 5 === 0 || i === needToCreate - 1) {
            console.log(`    ✅ 리뷰 생성 중... (${i + 1}/${needToCreate})`);
          }
        } else {
          stats.errors++;
        }
        
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
    
    // 2. anonymous 사용자명을 가진 리뷰 수정 (user_id가 null이거나 users 테이블에 없는 경우)
    if (existingRatings && existingRatings.length > 0) {
      let anonymousCount = 0;
      let commentMissingCount = 0;
      
      for (const rating of existingRatings) {
        let needsUpdate = false;
        const updates = {};
        
        // user_id가 null이거나 없는 경우
        if (!rating.user_id) {
          updates.user_id = userIds[Math.floor(Math.random() * userIds.length)];
          needsUpdate = true;
          anonymousCount++;
        }
        
        // comment가 없는 경우
        if (!rating.comment || rating.comment.trim() === '') {
          updates.comment = negativeReviewTemplates[Math.floor(Math.random() * negativeReviewTemplates.length)];
          needsUpdate = true;
          commentMissingCount++;
        }
        
        if (needsUpdate) {
          const { error: updateError } = await supabase
            .from('shop_ratings')
            .update(updates)
            .eq('id', rating.id);
          
          if (updateError) {
            console.error(`    ❌ 리뷰 업데이트 실패 (ID: ${rating.id}): ${updateError.message}`);
            stats.errors++;
          } else {
            if (updates.user_id) stats.anonymousFixed++;
            if (updates.comment) stats.commentsAdded++;
            stats.reviewsUpdated++;
          }
          
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      if (anonymousCount > 0) {
        console.log(`  → anonymous 사용자 수정: ${anonymousCount}건`);
      }
      if (commentMissingCount > 0) {
        console.log(`  → comment 추가: ${commentMissingCount}건`);
      }
    }
    
    stats.shopsProcessed++;
    console.log(`  ✅ ${shop.name} 처리 완료`);
  }
  
  // 결과 요약
  console.log('\n\n=== 처리 완료 ===');
  console.log(`📊 쇼핑몰:`);
  console.log(`  - 처리 완료: ${stats.shopsProcessed}개`);
  console.log(`📊 리뷰:`);
  console.log(`  - 새로 생성: ${stats.reviewsCreated}개`);
  console.log(`  - 수정 완료: ${stats.reviewsUpdated}개`);
  console.log(`  - anonymous 수정: ${stats.anonymousFixed}개`);
  console.log(`  - comment 추가: ${stats.commentsAdded}개`);
  console.log(`  - 오류: ${stats.errors}개`);
  console.log('\n✅ 완료!\n');
}

// 스크립트 실행
main().catch(error => {
  console.error('스크립트 실행 오류:', error);
  process.exit(1);
});

