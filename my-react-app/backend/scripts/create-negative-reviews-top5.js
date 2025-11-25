/**
 * 주의가 필요한 페이지 Top 5 쇼핑몰에 부정적인 리뷰 생성 스크립트
 * 
 * 사용법:
 * node scripts/create-negative-reviews-top5.js
 * 
 * 각 쇼핑몰에 2~30개 랜덤한 부정적인 리뷰를 생성합니다.
 */

const supabase = require('../config/supabase');
const { normalizeUrl } = require('../utils/url');

// Top 5 쇼핑몰 목록
const top5Shops = [
  {
    name: '매우 의심가는 쇼핑몰 [테스트]',
    url: null, // 이름으로 찾기
    reviewTemplates: [
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
    ]
  },
  {
    name: '의심가는 쇼핑몰 [테스트]',
    url: null, // 이름으로 찾기
    reviewTemplates: [
      '헐~ 여기 진짜 사기꾼인데.. 돈만 받고 배송도 안 해줘',
      'ㅋㅋ 여기서는 그냥 제품 사지말자. 완전 사기',
      '와 진짜 후회함.. 결제했는데 연락도 안 되고',
      '이거 사기 사이트 맞아요. 돈만 날렸어요',
      '제발 여기서 사지 마세요. 완전 사기꾼들임',
      '고객센터 전화도 안 받고 이메일도 안 답해줌',
      '배송비만 받고 상품은 안 보내줌. 명백한 사기',
      '여기서 주문한 지 한 달 됐는데 아직도 안 옴',
      '완전 사기 사이트입니다. 제발 피하세요',
      '돈만 받고 연락 두절. 진짜 최악의 쇼핑몰',
      '여기서 사면 후회합니다. 제품도 안 오고',
      '사기꾼들 집합소네요. 여기서 사지 마세요',
      '배송 추적도 안 되고 연락도 안 됨',
      '제품 받았는데 사진이랑 완전 달라요',
      '환불 요청했는데 답변 없음. 진짜 최악',
      '여기서 사면 돈만 날리는 거예요',
      '고객센터가 존재하는지 모르겠어요',
      '사기 사이트 맞습니다. 제발 여기서 사지 마세요',
      '배송도 안 해주고 환불도 안 해줌',
      '여기서 주문한 제품 아직도 안 옴'
    ]
  },
  {
    name: '우아한',
    url: 'https://wooahwan.co.kr/pages/xyMbKB251029?mediaCode=FBIG_05_03A&utm_source=meta&utm_medium=cpc&utm_campaign=wooahwan&utm_term=FBIG_05_03A&utm_id=120235391964000389&utm_content=120235539917910389&fbclid=PAZXh0bgNhZW0BMABhZGlkAasplirnO0UBp-XGSeUnr-GyAXDgfTnOZPVG65aKINE-VguELqXFNYZ7VrKDZi-xXNhEF1po_aem_vJ4coizMcEFL1vfk4d18Cw',
    reviewTemplates: [
      '헐~ 우아한이 2등이라고? 여기 진짜 사기꾼인데..',
      'ㅋㅋ 여기서는 그냥 제품 사지말자. 완전 사기',
      '와 진짜 후회함.. 약 먹고 부작용만 생겼어요',
      '이거 사기 사이트 맞아요. 약도 효과 없고',
      '제발 여기서 사지 마세요. 완전 사기꾼들임',
      '약 먹고 병원에 입원했어요. 진짜 최악',
      '광고만 보고 샀는데 전혀 효과 없어요',
      '약 받았는데 유통기한 지난 거 왔어요',
      '완전 사기 사이트입니다. 제발 피하세요',
      '약 먹고 부작용만 생겼어요. 돈만 날렸어요',
      '여기서 사면 후회합니다. 약도 효과 없고',
      '사기꾼들 집합소네요. 여기서 사지 마세요',
      '약 먹고 설사만 나고 효과는 전혀 없어요',
      '제품 받았는데 포장도 깨져있고',
      '환불 요청했는데 답변 없음. 진짜 최악',
      '여기서 사면 돈만 날리는 거예요',
      '약 먹고 알레르기 반응 생겼어요',
      '사기 사이트 맞습니다. 제발 여기서 사지 마세요',
      '약도 효과 없고 부작용만 생겨요',
      '여기서 주문한 약 아직도 안 옴',
      '약 먹고 두통만 생겼어요. 효과는 전혀',
      '광고만 보고 샀는데 완전 사기',
      '약 받았는데 성분도 다르게 나와있어요',
      '여기서 사면 후회합니다. 제발 피하세요',
      '약 먹고 복통만 생겼어요. 효과 없음',
      '사기꾼들 모임이네요. 여기서 사지 마세요',
      '약도 효과 없고 돈만 날렸어요',
      '제품 받았는데 유통기한 지난 거',
      '환불 요청했는데 답변 없음',
      '여기서 사면 돈만 날리는 거예요'
    ]
  },
  {
    name: '프로뉴트리션',
    url: 'https://pronutrition.co.kr/product/detail.html?product_no=52&cafe_mkt=ue_dp_nt_v2703&utm_medium=paid&utm_source=ig&utm_id=120230608167000017_v2_s02&utm_content=120233249084780017&utm_term=120233249084790017&utm_campaign=120230608167000017&fbclid=PAZXh0bgNhZW0BMABhZGlkAaspytjObkFzcnRjBmFwcF9pZA8xMjQwMjQ1NzQyODc0MTQAAafyQBLrLA6pvuylziCSWs7be_hbRk5hSzmQgO1eeytuDUxPCnFg_GpU73GLwg_aem_Uu_J6eR1d8WxeQ8AD_6g7A',
    reviewTemplates: [
      '헐~ 여기 진짜 사기꾼인데.. 유산균 먹었는데 효과 전혀 없어요',
      'ㅋㅋ 여기서는 그냥 제품 사지말자. 완전 사기',
      '와 진짜 후회함.. 3개월 먹었는데 전혀 효과 없음',
      '이거 사기 사이트 맞아요. 유산균도 효과 없고',
      '제발 여기서 사지 마세요. 완전 사기꾼들임',
      '유산균 먹고 복통만 생겼어요. 진짜 최악',
      '광고만 보고 샀는데 전혀 효과 없어요',
      '제품 받았는데 포장 깨져있고',
      '완전 사기 사이트입니다. 제발 피하세요',
      '유산균 먹고 설사만 나고 효과는 전혀',
      '여기서 사면 후회합니다. 제품도 효과 없고',
      '사기꾼들 집합소네요. 여기서 사지 마세요',
      '배송도 한 달 넘게 걸렸어요',
      '제품 받았는데 유통기한 임박한 거',
      '환불 요청했는데 답변 없음. 진짜 최악',
      '여기서 사면 돈만 날리는 거예요',
      '유산균 먹고 알레르기 반응 생겼어요',
      '사기 사이트 맞습니다. 제발 여기서 사지 마세요',
      '제품도 효과 없고 돈만 날렸어요',
      '여기서 주문한 제품 아직도 안 옴',
      '유산균 먹고 부작용만 생겼어요',
      '광고만 보고 샀는데 완전 사기',
      '제품 받았는데 성분도 다르게 나와있어요',
      '여기서 사면 후회합니다. 제발 피하세요',
      '유산균 먹고 복통만 생겼어요',
      '사기꾼들 모임이네요. 여기서 사지 마세요',
      '제품도 효과 없고 돈만 날렸어요',
      '배송도 너무 늦게 왔어요',
      '환불 요청했는데 답변 없음',
      '여기서 사면 돈만 날리는 거예요'
    ]
  },
  {
    name: '리필드',
    url: 'https://refilled.co.kr/product/detail.html?product_no=285&gad_source=4&gad_campaignid=22681366979&gbraid=0AAAAABYcevjDuN4QKUyFkbRgxSCzzR1c0&gclid=Cj0KCQiA5abIBhCaARIsAM3-zFUPWAHbC6cFEiMyyqF5h3sytoKRJ6b5W7Zs-i2CGWy466nx0kVLVFIaApZJEALw_wcB',
    reviewTemplates: [
      '헐~ 여기 진짜 사기꾼인데.. 탈모약 먹었는데 효과 전혀 없어요',
      'ㅋㅋ 여기서는 그냥 제품 사지말자. 완전 사기',
      '와 진짜 후회함.. 3개월 먹었는데 탈모 더 심해짐',
      '이거 사기 사이트 맞아요. 탈모약도 효과 없고',
      '제발 여기서 사지 마세요. 완전 사기꾼들임',
      '탈모약 먹고 부작용만 생겼어요. 진짜 최악',
      '광고만 보고 샀는데 전혀 효과 없어요',
      '약 받았는데 포장 깨져있고',
      '완전 사기 사이트입니다. 제발 피하세요',
      '탈모약 먹고 두통만 생겼어요. 효과는 전혀',
      '여기서 사면 후회합니다. 약도 효과 없고',
      '사기꾼들 집합소네요. 여기서 사지 마세요',
      '약 먹고 두피 알레르기 생겼어요',
      '제품 받았는데 유통기한 지난 거',
      '환불 요청했는데 답변 없음. 진짜 최악',
      '여기서 사면 돈만 날리는 거예요',
      '탈모약 먹고 성기능 장애 생겼어요',
      '사기 사이트 맞습니다. 제발 여기서 사지 마세요',
      '약도 효과 없고 돈만 날렸어요',
      '여기서 주문한 약 아직도 안 옴',
      '탈모약 먹고 부작용만 생겼어요',
      '광고만 보고 샀는데 완전 사기',
      '약 받았는데 성분도 다르게 나와있어요',
      '여기서 사면 후회합니다. 제발 피하세요',
      '탈모약 먹고 어지러움만 생겼어요',
      '사기꾼들 모임이네요. 여기서 사지 마세요',
      '약도 효과 없고 탈모 더 심해짐',
      '배송도 너무 늦게 왔어요',
      '환불 요청했는데 답변 없음',
      '여기서 사면 돈만 날리는 거예요'
    ]
  }
];

// 랜덤 아이디 생성
function generateRandomId() {
  const prefixes = ['user', 'shopper', 'buyer', 'customer', 'member', 'reviewer'];
  const suffixes = ['123', '456', '789', '2024', '2025', 'korea', 'kr'];
  const randomNum = Math.floor(Math.random() * 9999) + 1;
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
  return `${prefix}${randomNum}${suffix}`;
}

// 랜덤 날짜 생성 (최근 3개월 내)
function generateRandomDate() {
  const now = new Date();
  const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const timeDiff = now.getTime() - threeMonthsAgo.getTime();
  const randomTime = Math.random() * timeDiff;
  return new Date(threeMonthsAgo.getTime() + randomTime).toISOString();
}

// 쇼핑몰 ID 조회
async function getShopId(normalizedUrl, shopName) {
  // 이름으로 먼저 찾기
  if (shopName) {
    const { data: shopsByName, error: nameError } = await supabase
      .from('shops')
      .select('id, name, url')
      .eq('name', shopName);
    
    if (!nameError && shopsByName && shopsByName.length > 0) {
      const shop = shopsByName[0];
      console.log(`  → 이름으로 쇼핑몰 찾음: ${shop.name} (ID: ${shop.id}, URL: ${shop.url})`);
      return shop.id;
    }
  }
  
  // URL로 찾기
  if (normalizedUrl) {
    const { data: shop, error } = await supabase
      .from('shops')
      .select('id, name')
      .eq('url', normalizedUrl)
      .single();
    
    if (error || !shop) {
      console.error(`  ❌ 쇼핑몰을 찾을 수 없습니다: ${normalizedUrl}`);
      return null;
    }
    
    return shop.id;
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

// 실제 사용자 ID 목록 가져오기
async function getRandomUserIds(count = 10) {
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

// 메인 함수
async function main() {
  console.log('=== Top 5 쇼핑몰 부정적 리뷰 생성 시작 ===\n');
  
  // 실제 사용자 ID 목록 가져오기
  const userIds = await getRandomUserIds(20);
  if (userIds.length === 0) {
    console.error('❌ 사용자 ID를 가져올 수 없습니다. DB에 사용자가 있는지 확인해주세요.');
    process.exit(1);
  }
  console.log(`✅ 사용 가능한 사용자 ID: ${userIds.length}개\n`);
  
  let stats = {
    shopsProcessed: 0,
    reviewsCreated: 0,
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
    
    // 기존 리뷰 수 확인
    const { data: existingRatings, error: countError } = await supabase
      .from('shop_ratings')
      .select('id')
      .eq('shop_id', shopId);
    
    const currentRatingCount = existingRatings ? existingRatings.length : 0;
    
    // 20~30개 랜덤 리뷰 생성
    const targetCount = Math.floor(Math.random() * 11) + 20; // 20~30
    const needToCreate = Math.max(0, targetCount - currentRatingCount);
    
    console.log(`  → 현재 리뷰 수: ${currentRatingCount}건`);
    console.log(`  → 목표 리뷰 수: ${targetCount}건`);
    console.log(`  → 추가 생성 필요: ${needToCreate}건`);
    
    if (needToCreate <= 0) {
      console.log(`  ✅ 이미 목표 리뷰 수에 도달했습니다.`);
      stats.shopsProcessed++;
      continue;
    }
    
    // 리뷰 생성
    for (let i = 0; i < needToCreate; i++) {
      // 1~3점 랜덤 평점 (부정적)
      const rating = Math.floor(Math.random() * 3) + 1; // 1, 2, 3
      
      // 랜덤 리뷰 템플릿 선택
      const template = shop.reviewTemplates[Math.floor(Math.random() * shop.reviewTemplates.length)];
      
      // 랜덤 사용자 ID 선택
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
      
      // API 레이트 리밋 방지
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    stats.shopsProcessed++;
    console.log(`  ✅ ${shop.name} 처리 완료`);
  }
  
  // 결과 요약
  console.log('\n\n=== 처리 완료 ===');
  console.log(`📊 쇼핑몰:`);
  console.log(`  - 처리 완료: ${stats.shopsProcessed}개`);
  console.log(`📊 리뷰:`);
  console.log(`  - 생성: ${stats.reviewsCreated}개`);
  console.log(`  - 오류: ${stats.errors}개`);
  console.log('\n✅ 완료!\n');
}

// 스크립트 실행
main().catch(error => {
  console.error('\n❌ 스크립트 실행 중 오류 발생:', error);
  process.exit(1);
});

