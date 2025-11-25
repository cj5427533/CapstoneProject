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

// 주의가 필요한 쇼핑몰 Top 5 데이터
const dangerousShops = [
  {
    name: '우아한',
    url: 'https://wooahwan.co.kr/pages/xyMbKB251029?mediaCode=FBIG_05_03A&utm_source=meta&utm_medium=cpc&utm_campaign=wooahwan&utm_term=FBIG_05_03A&utm_id=120235391964000389&utm_content=120235539917910389&fbclid=PAZXh0bgNhZW0BMABhZGlkAasplirnO0UBp-XGSeUnr-GyAXDgfTnOZPVG65aKINE-VguELqXFNYZ7VrKDZi-xXNhEF1po_aem_vJ4coizMcEFL1vfk4d18Cw',
    reportCount: 15,
    rank: 1,
    descriptions: [
      '이 사이트에서 결제 정보를 입력했는데 계좌에서 돈이 인출되었습니다. 정상적인 쇼핑몰인 줄 알고 주문했는데 피싱 사이트로 의심됩니다.',
      '로그인 정보를 입력했더니 계정이 해킹되었습니다. 이 사이트는 유명 쇼핑몰을 사칭하는 피싱 사이트로 의심됩니다.',
      '결제를 완료했는데 주문 확인 메일이 오지 않고 연락이 안 됩니다. 사기 사이트로 의심됩니다.',
      '이 사이트에서 구매한 상품이 배송되지 않았고, 고객센터 연락처가 모두 가짜였습니다. 사기 사이트로 의심됩니다.',
      '계정 정보를 입력한 후 개인정보 유출 경고를 받았습니다. 이 사이트는 피싱 사이트로 의심됩니다.',
      '주문한 지 3개월이 지났는데도 배송이 안 됩니다. 고객센터에 문의해도 답변이 없습니다.',
      '배송비를 3만원이나 받았는데 상품은 배송되지 않았습니다. 배송 추적도 불가능합니다.',
      '환불을 요청했는데 2개월이 지나도 환불이 안 됩니다. 고객센터는 계속 대기하라고만 합니다.',
      '고객센터에 전화를 해도 받지 않습니다. 이메일 문의도 답변이 없습니다.',
      '상품을 받았는데 바로 고장났습니다. 사용 불가능한 상태로 배송되었습니다.',
      '할인 쿠폰을 사용했는데 할인이 적용되지 않았습니다. 환불도 안 해줍니다.',
      '주문 내역이 사라졌습니다. 주문 확인도 안 되고 연락도 안 됩니다.',
      '가격이 주문 후 갑자기 올라갔습니다. 주문 확인서와 다른 가격을 청구합니다.',
      '배송 전 상품 준비 중이라고만 하고 실제 배송은 안 됩니다. 2개월째 같은 상태입니다.',
      '이벤트 당첨이라고 해서 개인정보를 요구했습니다. 나중에 확인해보니 사기였습니다.'
    ]
  },
  {
    name: '리필드',
    url: 'https://refilled.co.kr/product/detail.html?product_no=285&gad_source=4&gad_campaignid=22681366979&gbraid=0AAAAABYcevjDuN4QKUyFkbRgxSCzzR1c0&gclid=Cj0KCQiA5abIBhCaARIsAM3-zFUPWAHbC6cFEiMyyqF5h3sytoKRJ6b5W7Zs-i2CGWy466nx0kVLVFIaApZJEALw_wcB',
    reportCount: 8,
    rank: 2,
    descriptions: [
      '이 사이트에서 결제 정보를 입력했는데 계좌에서 돈이 인출되었습니다. 정상적인 쇼핑몰인 줄 알고 주문했는데 피싱 사이트로 의심됩니다.',
      '결제를 완료했는데 주문 확인 메일이 오지 않고 연락이 안 됩니다. 사기 사이트로 의심됩니다.',
      '주문한 지 3개월이 지났는데도 배송이 안 됩니다. 고객센터에 문의해도 답변이 없습니다.',
      '배송비를 3만원이나 받았는데 상품은 배송되지 않았습니다. 배송 추적도 불가능합니다.',
      '환불을 요청했는데 2개월이 지나도 환불이 안 됩니다. 고객센터는 계속 대기하라고만 합니다.',
      '고객센터에 전화를 해도 받지 않습니다. 이메일 문의도 답변이 없습니다.',
      '상품을 받았는데 바로 고장났습니다. 사용 불가능한 상태로 배송되었습니다.',
      '주문 내역이 사라졌습니다. 주문 확인도 안 되고 연락도 안 됩니다.'
    ]
  },
  {
    name: '프로뉴트리션',
    url: 'https://pronutrition.co.kr/product/detail.html?product_no=52&cafe_mkt=ue_dp_nt_v2703&utm_medium=paid&utm_source=ig&utm_id=120230608167000017_v2_s02&utm_content=120233249084780017&utm_term=120233249084790017&utm_campaign=120230608167000017&fbclid=PAZXh0bgNhZW0BMABhZGlkAaspytjObkFzcnRjBmFwcF9pZA8xMjQwMjQ1NzQyODc0MTQAAafyQBLrLA6pvuylziCSWs7be_hbRk5hSzmQgO1eeytuDUxPCnFg_GpU73GLwg_aem_Uu_J6eR1d8WxeQ8AD_6g7A',
    reportCount: 12,
    rank: 3,
    descriptions: [
      '이 사이트에서 결제 정보를 입력했는데 계좌에서 돈이 인출되었습니다. 정상적인 쇼핑몰인 줄 알고 주문했는데 피싱 사이트로 의심됩니다.',
      '로그인 정보를 입력했더니 계정이 해킹되었습니다. 이 사이트는 유명 쇼핑몰을 사칭하는 피싱 사이트로 의심됩니다.',
      '결제를 완료했는데 주문 확인 메일이 오지 않고 연락이 안 됩니다. 사기 사이트로 의심됩니다.',
      '이 사이트에서 구매한 상품이 배송되지 않았고, 고객센터 연락처가 모두 가짜였습니다. 사기 사이트로 의심됩니다.',
      '주문한 지 3개월이 지났는데도 배송이 안 됩니다. 고객센터에 문의해도 답변이 없습니다.',
      '배송비를 3만원이나 받았는데 상품은 배송되지 않았습니다. 배송 추적도 불가능합니다.',
      '환불을 요청했는데 2개월이 지나도 환불이 안 됩니다. 고객센터는 계속 대기하라고만 합니다.',
      '환불 수수료를 30%나 받겠다고 합니다. 이는 정상적인 환불 정책이 아닙니다.',
      '고객센터에 전화를 해도 받지 않습니다. 이메일 문의도 답변이 없습니다.',
      '상품을 받았는데 바로 고장났습니다. 사용 불가능한 상태로 배송되었습니다.',
      '품질이 너무 낮습니다. 사진과 달리 매우 저렴한 재질로 만들어졌습니다.',
      '주문 취소를 요청했는데 취소가 안 되고 배송이 시작되었습니다. 취소 정책을 지키지 않습니다.'
    ]
  },
  {
    name: '의심가는 쇼핑몰 [테스트]',
    url: 'https://suspicious-shop-test.co.kr',
    reportCount: 7,
    rank: 4,
    descriptions: [
      '이 사이트에서 결제 정보를 입력했는데 계좌에서 돈이 인출되었습니다. 정상적인 쇼핑몰인 줄 알고 주문했는데 피싱 사이트로 의심됩니다.',
      '결제를 완료했는데 주문 확인 메일이 오지 않고 연락이 안 됩니다. 사기 사이트로 의심됩니다.',
      '주문한 지 3개월이 지났는데도 배송이 안 됩니다. 고객센터에 문의해도 답변이 없습니다.',
      '배송비를 3만원이나 받았는데 상품은 배송되지 않았습니다. 배송 추적도 불가능합니다.',
      '환불을 요청했는데 2개월이 지나도 환불이 안 됩니다. 고객센터는 계속 대기하라고만 합니다.',
      '고객센터에 전화를 해도 받지 않습니다. 이메일 문의도 답변이 없습니다.',
      '상품을 받았는데 바로 고장났습니다. 사용 불가능한 상태로 배송되었습니다.'
    ]
  },
  {
    name: '아리까리한 쇼핑몰 [테스트]',
    url: 'https://confusing-shop-test.co.kr',
    reportCount: 6,
    rank: 5,
    descriptions: [
      '이 사이트에서 결제 정보를 입력했는데 계좌에서 돈이 인출되었습니다. 정상적인 쇼핑몰인 줄 알고 주문했는데 피싱 사이트로 의심됩니다.',
      '결제를 완료했는데 주문 확인 메일이 오지 않고 연락이 안 됩니다. 사기 사이트로 의심됩니다.',
      '주문한 지 3개월이 지났는데도 배송이 안 됩니다. 고객센터에 문의해도 답변이 없습니다.',
      '배송비를 3만원이나 받았는데 상품은 배송되지 않았습니다. 배송 추적도 불가능합니다.',
      '환불을 요청했는데 2개월이 지나도 환불이 안 됩니다. 고객센터는 계속 대기하라고만 합니다.',
      '고객센터에 전화를 해도 받지 않습니다. 이메일 문의도 답변이 없습니다.'
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
  
  // 이미 신고가 많은 경우 중복 체크 스킵 (성능상 이유)
  const { data: newReport, error } = await supabase
    .from('shop_reports')
    .insert({
      shop_id: shopId,
      user_id: anonymousUserId,
      categories: JSON.stringify(['사기/피싱']),
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
  
  return { success: true, report: newReport };
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
          console.log(`    ✅ 신고 생성 중... (${i + 1}/${needToCreate})`);
        }
      } else {
        stats.errors++;
      }
      
      // API 레이트 리밋 방지
      await new Promise(resolve => setTimeout(resolve, 200));
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

