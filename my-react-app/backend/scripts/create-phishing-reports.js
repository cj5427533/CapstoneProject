/**
 * 피싱 사이트에 대한 피해 사례(reports) 생성 스크립트
 * 
 * 사용법:
 * node scripts/create-phishing-reports.js
 * 
 * 피싱 URL 중 20개를 선택하여 다양한 카테고리의 피해 사례를 생성합니다.
 */

const supabase = require('../config/supabase');
const { normalizeUrl } = require('../utils/url');
const { getAnonymousUserId } = require('../utils/anonymousUser');

// 선택된 피싱 URL 20개 (다양한 타입 선택)
const selectedPhishingUrls = [
  'https://booking.provides-truth40095.com/J8RGX2XM',
  'https://www.accout-helpz.sbs',
  'https://booking.confirmation-id914131.com/N5EPOXLZ',
  'https://bookingverifycenter.com/177486843880',
  'https://portal-faq-ldger.typedream.app',
  'https://web-ledgerliv--wallet.typedream.app',
  'https://meta-support-formid.pages.dev',
  'https://meta-support-directory.pages.dev',
  'https://rbfcu-star.azurewebsites.net/(S(1bqzezdr54mnvjmxnczjrkmk))/Main/Login',
  'https://marilynnoad.com/DocuSign_Docs',
  'https://meta-support-dataprofile.pages.dev',
  'https://meta-starlight.pages.dev',
  'https://secure-coinbase-pro-logi.weebly.com',
  'https://www.tiktoksha.com',
  'https://officekeynow.com',
  'https://www.redeembuxnow.com',
  'https://login.fb.aimage.it',
  'https://meta-support-contactid.pages.dev',
  'https://www.matrixbdc.com/public/yh/8a0db4edeb7cdba8dce03cfb09784c0d',
  'https://singh9999496261.github.io/amazon-clone'
];

// 카테고리별 피해 사례 템플릿
const reportTemplates = {
  '사기/피싱': [
    {
      categories: ['사기/피싱'],
      descriptions: [
        '이 사이트에서 결제 정보를 입력했는데 계좌에서 돈이 인출되었습니다. 정상적인 쇼핑몰인 줄 알고 주문했는데 피싱 사이트로 의심됩니다.',
        '로그인 정보를 입력했더니 계정이 해킹되었습니다. 이 사이트는 유명 쇼핑몰을 사칭하는 피싱 사이트로 의심됩니다.',
        '결제를 완료했는데 주문 확인 메일이 오지 않고 연락이 안 됩니다. 사기 사이트로 의심됩니다.',
        '이 사이트에서 구매한 상품이 배송되지 않았고, 고객센터 연락처가 모두 가짜였습니다. 사기 사이트로 의심됩니다.',
        '계정 정보를 입력한 후 개인정보 유출 경고를 받았습니다. 이 사이트는 피싱 사이트로 의심됩니다.'
      ]
    }
  ],
  '배송 문제': [
    {
      categories: ['배송 문제'],
      descriptions: [
        '주문한 지 3개월이 지났는데도 배송이 안 됩니다. 고객센터에 문의해도 답변이 없습니다.',
        '배송비를 3만원이나 받았는데 상품은 배송되지 않았습니다. 배송 추적도 불가능합니다.',
        '배송 예정일이 계속 연기되고 있습니다. 현재까지 2개월이 지났는데 연락이 없습니다.',
        '배송 주소를 확인했는데 다른 곳으로 배송되었습니다. 재배송 요청을 했지만 무응답입니다.',
        '배송 완료로 표시되어 있는데 실제로는 받지 못했습니다. 택배사에도 해당 운송장이 없습니다.'
      ]
    }
  ],
  '상품 불일치': [
    {
      categories: ['상품 불일치'],
      descriptions: [
        '사진과 완전히 다른 상품이 배송되었습니다. 가격은 정품 가격인데 가짜 상품이 왔습니다.',
        '주문한 색상과 다른 색상의 상품이 배송되었습니다. 교환 요청했지만 거부당했습니다.',
        '사이즈가 완전히 다릅니다. 사이트에 명시된 사이즈와 실제 상품의 사이즈가 다릅니다.',
        '브랜드 제품을 주문했는데 무명 브랜드 제품이 왔습니다. 명백한 상품 불일치입니다.',
        '상품 설명과 실제 상품이 전혀 다릅니다. 재질, 기능 모두 다릅니다.'
      ]
    }
  ],
  '환불 문제': [
    {
      categories: ['환불 문제'],
      descriptions: [
        '환불을 요청했는데 2개월이 지나도 환불이 안 됩니다. 고객센터는 계속 대기하라고만 합니다.',
        '환불 수수료를 30%나 받겠다고 합니다. 이는 정상적인 환불 정책이 아닙니다.',
        '환불 신청을 했는데 거부당했습니다. 이유도 제시하지 않습니다.',
        '환불 처리는 되었다고 하는데 계좌에 입금이 안 됩니다. 1개월째 확인 중입니다.',
        '상품을 반품했는데 반품 상품을 받지 못했다고 하며 환불을 거부합니다.'
      ]
    }
  ],
  '고객 서비스': [
    {
      categories: ['고객 서비스'],
      descriptions: [
        '고객센터에 전화를 해도 받지 않습니다. 이메일 문의도 답변이 없습니다.',
        '고객센터 직원이 매우 무례하게 응대했습니다. 문제 해결은커녕 욕설까지 들었습니다.',
        '문의를 했는데 자동 응답만 오고 실제 답변은 없습니다. 1개월째 기다리고 있습니다.',
        '고객센터가 존재하지 않는 것 같습니다. 제공된 모든 연락처가 작동하지 않습니다.',
        '문제를 해결해달라고 했는데 계속 다른 부서로 연결만 시킵니다. 결국 해결되지 않았습니다.'
      ]
    }
  ],
  '품질 문제': [
    {
      categories: ['품질 문제'],
      descriptions: [
        '상품을 받았는데 바로 고장났습니다. 사용 불가능한 상태로 배송되었습니다.',
        '품질이 너무 낮습니다. 사진과 달리 매우 저렴한 재질로 만들어졌습니다.',
        '사용 설명서대로 사용했는데 작동하지 않습니다. 불량품인 것 같습니다.',
        '상품을 받은 지 하루 만에 부품이 떨어졌습니다. 품질이 매우 나쁩니다.',
        '안전 인증 마크가 없는 상품이 배송되었습니다. 품질 검증이 안 된 상품입니다.'
      ]
    }
  ],
  '기타': [
    {
      categories: ['기타'],
      descriptions: [
        '주문 취소를 요청했는데 취소가 안 되고 배송이 시작되었습니다. 취소 정책을 지키지 않습니다.',
        '할인 쿠폰을 사용했는데 할인이 적용되지 않았습니다. 환불도 안 해줍니다.',
        '회원가입 시 과도한 개인정보를 요구합니다. 필요한 정보보다 훨씬 많이 요구합니다.',
        '사이트가 자주 접속이 안 됩니다. 서버 문제가 있는 것 같습니다.',
        '주문 내역이 사라졌습니다. 주문 확인도 안 되고 연락도 안 됩니다.',
        '포인트를 적립했는데 사라졌습니다. 고객센터는 확인이 안 된다고만 합니다.',
        '이벤트 당첨이라고 해서 개인정보를 요구했습니다. 나중에 확인해보니 사기였습니다.',
        '상품 리뷰를 작성했는데 삭제되었습니다. 부정적인 리뷰만 삭제하는 것 같습니다.',
        '가격이 주문 후 갑자기 올라갔습니다. 주문 확인서와 다른 가격을 청구합니다.',
        '배송 전 상품 준비 중이라고만 하고 실제 배송은 안 됩니다. 2개월째 같은 상태입니다.'
      ]
    }
  ]
};

// 카테고리별 가중치 (더 많은 신고를 생성할 카테고리)
const categoryWeights = {
  '사기/피싱': 4,  // 피싱 사이트이므로 사기/피싱 카테고리가 많아야 함
  '배송 문제': 3,
  '상품 불일치': 2,
  '환불 문제': 2,
  '고객 서비스': 2,
  '품질 문제': 1,
  '기타': 3
};

// 가중치 기반으로 카테고리 선택
function selectCategory() {
  const categories = Object.keys(categoryWeights);
  const weights = Object.values(categoryWeights);
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  
  let random = Math.random() * totalWeight;
  for (let i = 0; i < categories.length; i++) {
    random -= weights[i];
    if (random <= 0) {
      return categories[i];
    }
  }
  return categories[categories.length - 1];
}

// 랜덤 아이디 생성
function generateRandomId() {
  const prefixes = ['user', 'shopper', 'buyer', 'customer', 'member', 'shopper', 'user'];
  const suffixes = ['123', '456', '789', '2024', '2025', '01', '02', '03', '04', '05', '10', '20', '30', '99'];
  const randomNum = Math.floor(Math.random() * 9999) + 1;
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
  return `${prefix}${randomNum}${suffix}`;
}

// 10월~11월 사이의 랜덤 날짜 생성
function generateRandomDate() {
  // 2024년 10월 1일 ~ 11월 30일
  const startDate = new Date('2024-10-01');
  const endDate = new Date('2024-11-30');
  const timeDiff = endDate.getTime() - startDate.getTime();
  const randomTime = Math.random() * timeDiff;
  const randomDate = new Date(startDate.getTime() + randomTime);
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

// 신고 생성
async function createReport(shopId, category, description, anonymousUserId, customDate = null) {
  const template = reportTemplates[category][0];
  const categories = template.categories;
  
  const reporterName = generateRandomId(); // 아이디 사용
  const reporterPhone = generateRandomPhone();
  const createdAt = customDate || generateRandomDate(); // 랜덤 날짜 또는 지정된 날짜
  
  // 이미 신고가 있는지 확인 (같은 이름으로)
  const { data: existingReports } = await supabase
    .from('shop_reports')
    .select('id')
    .eq('shop_id', shopId)
    .eq('reporter_name', reporterName)
    .limit(1);
  
  if (existingReports && existingReports.length > 0) {
    return { success: false, reason: 'already_exists' };
  }
  
  const { data: newReport, error } = await supabase
    .from('shop_reports')
    .insert({
      shop_id: shopId,
      user_id: anonymousUserId, // 익명 사용자 ID 사용
      categories: JSON.stringify(categories),
      description: description,
      reporter_name: reporterName,
      reporter_phone: reporterPhone,
      evidence_files: null,
      evidence_type: 'NONE',
      evidence_verified: false,
      verification_score: 0,
      report_type: 'GENERAL_REVIEW',
      status: 'approved', // 자동 승인
      created_at: createdAt // 랜덤 날짜 설정
    })
    .select('id')
    .single();
  
  if (error) {
    console.error(`  ❌ 신고 생성 실패: ${error.message}`);
    return { success: false, error: error.message };
  }
  
  return { success: true, report: newReport };
}

// 메인 함수
async function main() {
  console.log('=== 피싱 사이트 피해 사례 생성 시작 ===\n');
  
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
    skipped: 0,
    errors: 0
  };
  
  // 각 URL에 대해 여러 개의 신고 생성 (1-3개)
  for (const url of selectedPhishingUrls) {
    const normalizedUrl = normalizeUrl(url);
    console.log(`\n[${selectedPhishingUrls.indexOf(url) + 1}/${selectedPhishingUrls.length}] ${url}`);
    console.log(`  → 정규화: ${normalizedUrl}`);
    
    const shopId = await getShopId(normalizedUrl);
    if (!shopId) {
      stats.errors++;
      continue;
    }
    
    // 각 쇼핑몰당 1-3개의 신고 생성
    const reportCount = Math.floor(Math.random() * 3) + 1;
    console.log(`  → 신고 생성 예정: ${reportCount}개`);
    
    for (let i = 0; i < reportCount; i++) {
      stats.total++;
      const category = selectCategory();
      const template = reportTemplates[category][0];
      const descriptions = template.descriptions;
      const description = descriptions[Math.floor(Math.random() * descriptions.length)];
      
      console.log(`    [${i + 1}/${reportCount}] 카테고리: ${category}`);
      
      const result = await createReport(shopId, category, description, anonymousUserId);
      
      if (result.success) {
        stats.created++;
        console.log(`      ✅ 신고 생성 성공 (ID: ${result.report.id})`);
      } else if (result.reason === 'already_exists') {
        stats.skipped++;
        console.log(`      ⏭️  이미 존재함`);
      } else {
        stats.errors++;
      }
      
      // API 레이트 리밋 방지
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
  
  // 결과 요약
  console.log('\n\n=== 처리 완료 ===');
  console.log(`📊 전체: ${stats.total}개`);
  console.log(`  - 생성: ${stats.created}개`);
  console.log(`  - 건너뜀: ${stats.skipped}개`);
  console.log(`  - 오류: ${stats.errors}개`);
  console.log('\n✅ 완료!\n');
}

// 스크립트 실행
main().catch(error => {
  console.error('\n❌ 스크립트 실행 중 오류 발생:', error);
  process.exit(1);
});

