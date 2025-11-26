/**
 * 주의가 필요한 페이지 Top 5 데이터 추가 스크립트
 * 
 * 사용법:
 * node scripts/add-dangerous-shops-top3.js
 * 
 * 실제 피싱 의심 사이트 3개와 목업 쇼핑몰 2개를 추가하고 각각 피해 신고를 생성합니다.
 */

const supabase = require('../config/supabase');
const { normalizeUrl } = require('../utils/url');
const { getAnonymousUserId } = require('../utils/anonymousUser');

// 주의가 필요한 쇼핑몰 Top 5 데이터 (신고 수 기준 순위: 18 > 16 > 15 > 12 > 8)
const dangerousShops = [
  {
    name: '우아한',
    url: 'https://wooahwan.co.kr/pages/xyMbKB251029?mediaCode=FBIG_05_03A&utm_source=meta&utm_medium=cpc&utm_campaign=wooahwan&utm_term=FBIG_05_03A&utm_id=120235391964000389&utm_content=120235539917910389&fbclid=PAZXh0bgNhZW0BMABhZGlkAasplirnO0UBp-XGSeUnr-GyAXDgfTnOZPVG65aKINE-VguELqXFNYZ7VrKDZi-xXNhEF1po_aem_vJ4coizMcEFL1vfk4d18Cw',
    reportCount: 18,
    rank: 1,
    averageRating: 1.8, // 낮은 평점
    ratingCount: 10,
    type: 'diet', // 다이어트 약품
    descriptions: [
      '다이어트 약품을 주문했는데 복용 후 심각한 부작용이 발생했습니다. 구토와 어지러움, 두통이 지속되어 병원에 입원해야 했습니다. 식약처 허가번호가 없는 불법 약품인 것으로 확인되었습니다.',
      '1주일 만에 10kg 감량이라는 광고에 속아 주문했는데, 약품을 복용한 후 부작용만 심각하고 체중 감량 효과는 전혀 없었습니다. 심장이 두근거리고 불면증까지 생겼습니다.',
      '주문한 다이어트 약품이 배송되지 않았습니다. 주문 후 2주가 지났는데 고객센터에 문의해도 답변이 없고, 환불도 안 해줍니다. 사기 사이트로 의심됩니다.',
      '약품을 받았는데 포장이 깨져있고 유통기한이 지난 제품이 왔습니다. 복용하기 두려워 바로 버렸고, 환불을 요청했지만 거부당했습니다.',
      '가짜 리뷰와 조작된 전후 사진에 속아 주문했습니다. 실제로는 전혀 효과가 없었고, 약품 성분도 표시된 것과 다를 가능성이 높습니다. 사기성이 매우 높습니다.',
      '약품 복용 후 설사와 복통이 심각하게 발생했습니다. 영업일 이내에 배송된다는 약속을 지키지 않았고, 고객센터 연락처가 모두 가짜였습니다.',
      '결제 정보를 입력한 후 계좌에서 추가로 돈이 인출되었습니다. 원인 모를 출금이 계속 발생해 카드사에 신고해야 했습니다.',
      '약품을 주문했는데 정식 의약품이 아닌 건강기능식품이 왔습니다. 광고와 실제 상품이 완전히 다릅니다. 명백한 허위 광고입니다.',
      '약품 복용 중 심각한 알레르기 반응이 발생해 응급실에 실려갔습니다. 제품에 알레르기 유발 성분이 표시되지 않았습니다.',
      '배송비를 과도하게 받았고, 약품 가격도 약속한 것보다 훨씬 비쌌습니다. 환불을 요청했지만 거부당했습니다.',
      '약품을 복용한 후 탈모가 심해지고 피부 트러블이 발생했습니다. 부작용에 대한 사전 안내가 전혀 없었습니다.',
      '주문 후 개인정보 유출 경고를 받았습니다. 이 사이트에서 입력한 정보가 타인에게 노출된 것으로 확인되었습니다.',
      '약품을 받았는데 제조일자와 유통기한이 가려져 있었습니다. 신뢰할 수 없는 제품이어서 사용하지 못했습니다.',
      '고객센터에 전화를 해도 받지 않고, 이메일 문의도 무응답입니다. 사기 사이트로 의심되며 소비자원에 신고하겠습니다.',
      '약품 복용 후 무기력증과 우울감이 심해졌습니다. 정신 건강에 악영향을 미치는 성분이 포함된 것으로 의심됩니다.',
      '가격이 주문 확인 후 갑자기 올라갔고, 추가 비용을 요구합니다. 명백한 사기 행위입니다.',
      '약품 효과가 전혀 없었고, 오히려 몸무게가 더 증가했습니다. 광고 내용이 모두 거짓이었습니다.',
      '약품을 주문했는데 다른 상품이 배송되었습니다. 교환 요청을 했지만 거부당했고, 환불도 불가능하다고 합니다.'
    ]
  },
  {
    name: '프로뉴트리션',
    url: 'https://pronutrition.co.kr/product/detail.html?product_no=52&cafe_mkt=ue_dp_nt_v2703&utm_medium=paid&utm_source=ig&utm_id=120230608167000017_v2_s02&utm_content=120233249084780017&utm_term=120233249084790017&utm_campaign=120230608167000017&fbclid=PAZXh0bgNhZW0BMABhZGlkAaspytjObkFzcnRjBmFwcF9pZA8xMjQwMjQ1NzQyODc0MTQAAafyQBLrLA6pvuylziCSWs7be_hbRk5hSzmQgO1eeytuDUxPCnFg_GpU73GLwg_aem_Uu_J6eR1d8WxeQ8AD_6g7A',
    reportCount: 16,
    rank: 2,
    averageRating: 2.1, // 낮은 평점
    ratingCount: 12,
    type: 'diet_lactobacillus', // 다이어트 유산균
    descriptions: [
      '다이어트 유산균을 3개월간 복용했는데 전혀 효과가 없었습니다. 광고에서 말한 복부 지방 감소나 배변 개선 효과가 전혀 없고, 오히려 복부 팽만감만 심해졌습니다.',
      '유산균 제품을 주문했는데 배송이 1개월이 넘게 지연되었습니다. 고객센터에 문의해도 답변이 없고, 환불도 안 해줍니다.',
      '유산균 캡슐을 받았는데 포장이 깨져있고 제품이 손상되어 있었습니다. 유통 과정에서 보관이 잘못된 것 같습니다. 교환을 요청했지만 거부당했습니다.',
      '제품을 복용한 후 복통과 설사가 심각하게 발생했습니다. 제품에 표시된 유산균 함량과 실제 함량이 다를 가능성이 높습니다.',
      '가짜 리뷰와 조작된 후기를 보고 주문했는데, 실제로는 전혀 효과가 없었습니다. 광고 내용이 모두 과장되었습니다.',
      '유산균 제품을 받았는데 유통기한이 얼마 남지 않았습니다. 신선한 제품을 약속했지만 실제로는 유통기한이 임박한 제품을 보냈습니다.',
      '결제를 완료했는데 주문 확인 메일이 오지 않고, 배송 추적도 불가능합니다. 연락이 전혀 안 됩니다.',
      '제품 성분표에 표시되지 않은 첨가물이 포함되어 있을 가능성이 있습니다. 알레르기 반응이 발생해 병원 치료를 받아야 했습니다.',
      '환불을 요청했는데 환불 수수료를 50%나 받겠다고 합니다. 이는 정상적인 환불 정책이 아닙니다. 명백한 불법입니다.',
      '유산균 제품 가격이 주문 후 갑자기 올라갔고, 추가 비용을 요구합니다. 사기 행위입니다.',
      '제품을 받았는데 다른 브랜드의 저렴한 제품이 왔습니다. 광고와 완전히 다른 제품을 보냈습니다.',
      '유산균 제품 복용 후 오히려 변비가 더 심해졌습니다. 광고와 정반대의 효과였습니다. 허위 광고입니다.',
      '고객센터에 전화를 해도 받지 않고, 이메일 문의도 무응답입니다. 사기 사이트로 의심됩니다.',
      '제품을 주문했는데 개인정보 유출 경고를 받았습니다. 이 사이트에서 입력한 정보가 타인에게 노출되었습니다.',
      '유산균 제품 효과가 전혀 없었고, 오히려 건강이 나빠진 것 같습니다. 제품 신뢰성이 매우 낮습니다.',
      '제품을 받았는데 제조일자가 가려져 있고, 신뢰할 수 없는 상태입니다. 사용하지 못하고 버렸습니다.'
    ]
  },
  {
    name: '리필드',
    url: 'https://refilled.co.kr/product/detail.html?product_no=285&gad_source=4&gad_campaignid=22681366979&gbraid=0AAAAABYcevjDuN4QKUyFkbRgxSCzzR1c0&gclid=Cj0KCQiA5abIBhCaARIsAM3-zFUPWAHbC6cFEiMyyqF5h3sytoKRJ6b5W7Zs-i2CGWy466nx0kVLVFIaApZJEALw_wcB',
    reportCount: 15,
    rank: 3,
    averageRating: 1.9, // 낮은 평점
    ratingCount: 11,
    type: 'hair_loss', // 탈모치료약
    descriptions: [
      '탈모치료약을 주문했는데 복용 후 심각한 부작용이 발생했습니다. 두통, 어지러움, 성기능 장애까지 발생해 약물을 중단해야 했습니다. 의사 처방 없이 판매하는 것이 불법입니다.',
      '탈모가 개선된다는 광고에 속아 주문했는데, 3개월간 복용해도 전혀 효과가 없었습니다. 오히려 탈모가 더 심해진 것 같습니다.',
      '탈모치료약을 받았는데 포장이 깨져있고 제품이 손상되어 있었습니다. 약품의 안전성이 의심됩니다. 교환을 요청했지만 거부당했습니다.',
      '약품을 복용한 후 심각한 두피 알레르기 반응이 발생했습니다. 두피 가려움증과 발진이 심해서 병원 치료를 받아야 했습니다.',
      '주문한 탈모치료약이 배송되지 않았습니다. 주문 후 3주가 지났는데 고객센터에 문의해도 답변이 없고, 환불도 안 해줍니다.',
      '약품을 받았는데 유통기한이 지난 제품이 왔습니다. 복용하기 두려워 바로 버렸고, 환불을 요청했지만 거부당했습니다.',
      '가짜 리뷰와 조작된 사진에 속아 주문했습니다. 실제로는 전혀 효과가 없었고, 약품 성분도 표시된 것과 다를 가능성이 높습니다.',
      '탈모치료약 가격이 주문 확인 후 갑자기 올라갔고, 추가 비용을 요구합니다. 명백한 사기 행위입니다.',
      '약품 복용 후 무기력증과 우울감이 심해졌습니다. 정신 건강에 악영향을 미치는 성분이 포함된 것으로 의심됩니다.',
      '결제 정보를 입력한 후 계좌에서 추가로 돈이 인출되었습니다. 원인 모를 출금이 계속 발생해 카드사에 신고해야 했습니다.',
      '약품을 주문했는데 정식 의약품이 아닌 건강기능식품이 왔습니다. 광고와 실제 상품이 완전히 다릅니다. 명백한 허위 광고입니다.',
      '약품 복용 중 심각한 복통과 구토가 발생해 응급실에 실려갔습니다. 제품에 부작용에 대한 사전 안내가 전혀 없었습니다.',
      '환불을 요청했는데 환불 수수료를 40%나 받겠다고 합니다. 이는 정상적인 환불 정책이 아닙니다.',
      '고객센터에 전화를 해도 받지 않고, 이메일 문의도 무응답입니다. 사기 사이트로 의심되며 소비자원에 신고하겠습니다.',
      '약품을 받았는데 제조일자와 유통기한이 가려져 있었습니다. 신뢰할 수 없는 제품이어서 사용하지 못했습니다.'
    ]
  },
  {
    name: '의심가는 쇼핑몰 [테스트]',
    url: 'https://suspicious-shop-test.co.kr',
    reportCount: 12,
    rank: 4,
    averageRating: 2.0, // 낮은 평점
    ratingCount: 8,
    type: 'phishing', // 피싱 쇼핑몰 전형적인 문제
    descriptions: [
      '이 사이트에서 결제 정보를 입력했는데 계좌에서 돈이 인출되었습니다. 정상적인 쇼핑몰인 줄 알고 주문했는데 피싱 사이트로 의심됩니다.',
      '로그인 정보를 입력했더니 계정이 해킹되었습니다. 이 사이트는 유명 쇼핑몰을 사칭하는 피싱 사이트로 의심됩니다.',
      '결제를 완료했는데 주문 확인 메일이 오지 않고 연락이 안 됩니다. 사기 사이트로 의심됩니다.',
      '이 사이트에서 구매한 상품이 배송되지 않았고, 고객센터 연락처가 모두 가짜였습니다. 사기 사이트로 의심됩니다.',
      '계정 정보를 입력한 후 개인정보 유출 경고를 받았습니다. 이 사이트는 피싱 사이트로 의심됩니다.',
      '주문한 지 3개월이 지났는데도 배송이 안 됩니다. 고객센터에 문의해도 답변이 없습니다.',
      '배송비를 과도하게 받았는데 상품은 배송되지 않았습니다. 배송 추적도 불가능합니다.',
      '환불을 요청했는데 2개월이 지나도 환불이 안 됩니다. 고객센터는 계속 대기하라고만 합니다.',
      '고객센터에 전화를 해도 받지 않습니다. 이메일 문의도 답변이 없습니다.',
      '이벤트 당첨이라고 해서 개인정보를 요구했습니다. 나중에 확인해보니 사기였습니다.',
      '가격이 주문 후 갑자기 올라갔습니다. 주문 확인서와 다른 가격을 청구합니다.',
      '사이트가 자주 접속이 안 되고, SSL 인증서가 없습니다. 보안이 취약한 피싱 사이트입니다.'
    ]
  },
  {
    name: '아리까리한 쇼핑몰 [테스트]',
    url: 'https://confusing-shop-test.co.kr',
    reportCount: 8,
    rank: 5,
    averageRating: 2.2, // 낮은 평점
    ratingCount: 6,
    type: 'phishing', // 피싱 쇼핑몰 전형적인 문제
    descriptions: [
      '이 사이트에서 결제 정보를 입력했는데 계좌에서 돈이 인출되었습니다. 정상적인 쇼핑몰인 줄 알고 주문했는데 피싱 사이트로 의심됩니다.',
      '결제를 완료했는데 주문 확인 메일이 오지 않고 연락이 안 됩니다. 사기 사이트로 의심됩니다.',
      '주문한 지 3개월이 지났는데도 배송이 안 됩니다. 고객센터에 문의해도 답변이 없습니다.',
      '배송비를 과도하게 받았는데 상품은 배송되지 않았습니다. 배송 추적도 불가능합니다.',
      '환불을 요청했는데 2개월이 지나도 환불이 안 됩니다. 고객센터는 계속 대기하라고만 합니다.',
      '고객센터에 전화를 해도 받지 않습니다. 이메일 문의도 답변이 없습니다.',
      '상품을 받았는데 사진과 완전히 다른 가짜 제품이 왔습니다. 명백한 사기입니다.',
      '사업자 등록번호가 없거나 가짜입니다. 정식 쇼핑몰이 아닌 것으로 확인되었습니다.'
    ]
  }
];

// 랜덤 아이디 생성
function generateRandomId() {
  const prefixes = ['user', 'shopper', 'buyer', 'customer', 'member'];
  const suffixes = ['123', '456', '789', '2024', '2025', '01', '02', '03'];
  const randomNum = Math.floor(Math.random() * 9999) + 1;
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
  return `${prefix}${randomNum}${suffix}`;
}

// 최근 3개월 사이의 랜덤 날짜 생성 (현재 기준)
function generateRandomDate() {
  const now = new Date();
  const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const timeDiff = now.getTime() - threeMonthsAgo.getTime();
  const randomTime = Math.random() * timeDiff;
  const randomDate = new Date(threeMonthsAgo.getTime() + randomTime);
  return randomDate.toISOString();
}

// 랜덤 전화번호 생성
function generateRandomPhone() {
  const prefixes = ['010', '011', '016', '017', '018', '019'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const middle = String(Math.floor(Math.random() * 9000) + 1000);
  const last = String(Math.floor(Math.random() * 9000) + 1000);
  return `${prefix}-${middle}-${last}`;
}

// 사용 가능한 카테고리 목록
const availableCategories = [
  '사기/피싱',
  '배송 문제',
  '상품 불일치',
  '환불 문제',
  '고객 서비스',
  '품질 문제',
  '기타'
];

// 랜덤 카테고리 선택 (사기/피싱이 약간 더 많이 나오도록 가중치 적용)
function selectRandomCategory() {
  // 가중치: 사기/피싱 30%, 나머지 각 10-15%
  const weights = {
    '사기/피싱': 30,
    '배송 문제': 15,
    '상품 불일치': 12,
    '환불 문제': 15,
    '고객 서비스': 12,
    '품질 문제': 10,
    '기타': 6
  };
  
  const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);
  let random = Math.random() * totalWeight;
  
  for (const category of availableCategories) {
    random -= weights[category];
    if (random <= 0) {
      return category;
    }
  }
  
  return availableCategories[0]; // 기본값
}

// 쇼핑몰 생성 또는 업데이트
async function createOrUpdateShop(name, url) {
  const normalizedUrl = normalizeUrl(url);
  console.log(`  → 정규화된 URL: ${normalizedUrl}`);
  
  // 기존 쇼핑몰 조회
  const { data: existingShop, error: fetchError } = await supabase
    .from('shops')
    .select('id, name, url')
    .eq('url', normalizedUrl)
    .single();
  
  let shopId;
  
  if (existingShop) {
    // 기존 쇼핑몰 업데이트
    shopId = existingShop.id;
    console.log(`  → 기존 쇼핑몰 발견 (ID: ${shopId}), 이름 업데이트`);
    
    const { error: updateError } = await supabase
      .from('shops')
      .update({ name: name })
      .eq('id', shopId);
    
    if (updateError) {
      console.error(`  ❌ 쇼핑몰 업데이트 실패: ${updateError.message}`);
    }
  } else {
    // 새 쇼핑몰 생성
    const { data: newShop, error: insertError } = await supabase
      .from('shops')
      .insert({
        url: normalizedUrl,
        name: name,
        search_count: 0
      })
      .select('id')
      .single();
    
    if (insertError) {
      console.error(`  ❌ 쇼핑몰 생성 실패: ${insertError.message}`);
      return null;
    }
    
    shopId = newShop.id;
    console.log(`  ✅ 새 쇼핑몰 생성 완료 (ID: ${shopId})`);
  }
  
  return shopId;
}

// 신고 생성
async function createReport(shopId, description, anonymousUserId, rank) {
  const reporterName = generateRandomId();
  const reporterPhone = generateRandomPhone();
  const createdAt = generateRandomDate();
  const category = selectRandomCategory(); // 랜덤 카테고리 선택
  
  // 이미 신고가 많은 경우 중복 체크 스킵 (성능상 이유)
  const { data: newReport, error } = await supabase
    .from('shop_reports')
    .insert({
      shop_id: shopId,
      user_id: anonymousUserId,
      categories: JSON.stringify([category]),
      description: description,
      reporter_name: reporterName,
      reporter_phone: reporterPhone,
      evidence_files: null,
      evidence_type: 'NONE',
      evidence_verified: false,
      verification_score: 0,
      report_type: 'FRAUD',
      status: 'approved', // 자동 승인
      created_at: createdAt
    })
    .select('id')
    .single();
  
  if (error) {
    console.error(`    ❌ 신고 생성 실패: ${error.message}`);
    return { success: false, error: error.message };
  }
  
  return { success: true, report: newReport, category: category };
}

// 낮은 별점 생성 (평균 평점에 맞춰)
async function createLowRatings(shopId, averageRating, ratingCount, anonymousUserId) {
  if (!ratingCount || ratingCount === 0) return;
  
  // 기존 별점 모두 삭제 (낮은 평점으로 재생성하기 위해)
  const { error: deleteError } = await supabase
    .from('shop_ratings')
    .delete()
    .eq('shop_id', shopId);
  
  if (deleteError) {
    console.error(`    ⚠️ 기존 별점 삭제 실패 (무시): ${deleteError.message}`);
  }
  
  // 평균 평점에 맞는 별점 분포 생성
  // 낮은 평점(1.8~2.2)의 경우 주로 1점과 2점으로 구성
  const ratings = [];
  const totalRatings = ratingCount;
  
  // 낮은 평점을 만들기 위한 분포 계산
  if (averageRating <= 2.2) {
    // 목표 평균에 맞춰 별점 분포 계산
    // 예: 평균 1.8이면 대부분 1점, 일부 2점
    // 예: 평균 2.0이면 1점과 2점 비슷하게
    const targetSum = averageRating * totalRatings;
    let currentSum = 0;
    
    // 먼저 1점과 2점으로 대부분 채우기
    for (let i = 0; i < totalRatings; i++) {
      if (currentSum / (i + 1) < averageRating - 0.3) {
        ratings.push(2);
        currentSum += 2;
      } else {
        ratings.push(1);
        currentSum += 1;
      }
    }
    
    // 평균을 정확히 맞추기 위해 조정
    const currentAverage = currentSum / totalRatings;
    if (Math.abs(currentAverage - averageRating) > 0.1) {
      // 평균이 목표보다 높으면 일부 2점을 1점으로 변경
      // 평균이 목표보다 낮으면 일부 1점을 2점으로 변경
      const diff = Math.round((averageRating - currentAverage) * totalRatings);
      for (let i = 0; i < Math.abs(diff) && i < ratings.length; i++) {
        if (diff > 0 && ratings[i] === 1) {
          ratings[i] = 2;
        } else if (diff < 0 && ratings[i] === 2) {
          ratings[i] = 1;
        }
      }
    }
  }
  
  // 별점 생성
  const ratingsToInsert = ratings.map((rating) => {
    const createdAt = generateRandomDate();
    return {
      shop_id: shopId,
      user_id: anonymousUserId,
      rating: rating,
      comment: null,
      created_at: createdAt
    };
  });
  
  if (ratingsToInsert.length > 0) {
    const { error: ratingError } = await supabase
      .from('shop_ratings')
      .insert(ratingsToInsert);
    
    if (ratingError) {
      console.error(`    ❌ 별점 생성 실패: ${ratingError.message}`);
      return { success: false, error: ratingError.message };
    }
    
    const actualAverage = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
    console.log(`    ✅ 별점 생성 완료: ${ratingsToInsert.length}개 (평균: ${actualAverage.toFixed(1)})`);
  }
  
  return { success: true };
}

// 메인 함수
async function main() {
  console.log('=== 주의가 필요한 쇼핑몰 Top 5 데이터 추가 시작 ===\n');
  
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
    shopsCreated: 0,
    shopsUpdated: 0,
    reportsCreated: 0,
    errors: 0
  };
  
  // 각 쇼핑몰 처리
  for (const shop of dangerousShops) {
    console.log(`\n[${shop.rank}순위] ${shop.name}`);
    console.log(`  URL: ${shop.url}`);
    console.log(`  신고 수: ${shop.reportCount}건`);
    
    // 쇼핑몰 생성 또는 업데이트
    const shopId = await createOrUpdateShop(shop.name, shop.url);
    if (!shopId) {
      stats.errors++;
      continue;
    }
    
    stats.shopsCreated++;
    
    // 기존 신고 수 확인
    const { data: existingReports, error: countError } = await supabase
      .from('shop_reports')
      .select('id', { count: 'exact' })
      .eq('shop_id', shopId);
    
    const currentReportCount = existingReports ? existingReports.length : 0;
    const needToCreate = shop.reportCount - currentReportCount;
    
    if (needToCreate <= 0) {
      console.log(`  ⏭️  이미 충분한 신고가 있습니다 (현재: ${currentReportCount}건, 필요: ${shop.reportCount}건)`);
      continue;
    }
    
    console.log(`  → 신고 생성 예정: ${needToCreate}건 (현재: ${currentReportCount}건)`);
    
    // 신고 생성
    for (let i = 0; i < needToCreate && i < shop.descriptions.length; i++) {
      const description = shop.descriptions[i];
      
      const result = await createReport(shopId, description, anonymousUserId, shop.rank);
      
      if (result.success) {
        stats.reportsCreated++;
        if ((i + 1) % 5 === 0 || i === needToCreate - 1) {
          console.log(`    ✅ 신고 생성 중... (${i + 1}/${needToCreate}, 카테고리: ${result.category})`);
        }
      } else {
        stats.errors++;
      }
      
      // API 레이트 리밋 방지
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    // 낮은 별점 생성 (평균 평점에 맞춰) - 항상 재생성
    if (shop.averageRating && shop.ratingCount) {
      console.log(`  → 별점 생성 예정: ${shop.ratingCount}개 (평균: ${shop.averageRating})`);
      await createLowRatings(shopId, shop.averageRating, shop.ratingCount, anonymousUserId);
    }
    
    console.log(`  ✅ ${shop.name} 처리 완료`);
  }
  
  // 결과 요약
  console.log('\n\n=== 처리 완료 ===');
  console.log(`📊 쇼핑몰:`);
  console.log(`  - 생성/업데이트: ${stats.shopsCreated}개`);
  console.log(`📊 신고:`);
  console.log(`  - 생성: ${stats.reportsCreated}개`);
  console.log(`  - 오류: ${stats.errors}개`);
  console.log('\n✅ 완료!\n');
}

// 스크립트 실행
main().catch(error => {
  console.error('\n❌ 스크립트 실행 중 오류 발생:', error);
  process.exit(1);
});

