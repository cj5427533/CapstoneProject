/**
 * 주의가 필요한 쇼핑몰 순위 조정 스크립트
 * 
 * 사용법:
 * node scripts/fix-dangerous-shops-ranking.js
 * 
 * 신고 수를 조정하여 확실히 상위 5위에 오르도록 합니다.
 */

const supabase = require('../config/supabase');
const { normalizeUrl } = require('../utils/url');
const { getAnonymousUserId } = require('../utils/anonymousUser');

// 목표 순위별 신고 수 (다른 쇼핑몰들보다 확실히 많도록 설정)
const targetShops = [
  {
    name: '매우 의심가는 쇼핑몰 [테스트]',
    url: null, // 이름으로 찾기
    targetReportCount: 35, // 1순위 - 가장 많게
    descriptions: [
      '이 사이트에서 결제 정보를 입력했는데 계좌에서 돈이 인출되었습니다. 정상적인 쇼핑몰인 줄 알고 주문했는데 피싱 사이트로 의심됩니다.',
      '로그인 정보를 입력했더니 계정이 해킹되었습니다. 이 사이트는 유명 쇼핑몰을 사칭하는 피싱 사이트로 의심됩니다.',
      '결제를 완료했는데 주문 확인 메일이 오지 않고 연락이 안 됩니다. 사기 사이트로 의심됩니다.',
      '이 사이트에서 구매한 상품이 배송되지 않았고, 고객센터 연락처가 모두 가짜였습니다. 사기 사이트로 의심됩니다.',
      '계정 정보를 입력한 후 개인정보 유출 경고를 받았습니다. 이 사이트는 피싱 사이트로 의심됩니다.',
      '주문한 지 3개월이 지났는데도 배송이 안 됩니다. 고객센터에 문의해도 답변이 없습니다.',
      '배송비를 과도하게 받았는데 상품은 배송되지 않았습니다. 배송 추적도 불가능합니다.',
      '이벤트 당첨이라고 해서 개인정보를 요구했습니다. 나중에 확인해보니 사기였습니다.',
      '가격이 주문 후 갑자기 올라갔습니다. 주문 확인서와 다른 가격을 청구합니다.',
      '사이트가 자주 접속이 안 되고, SSL 인증서가 없습니다. 보안이 취약한 피싱 사이트입니다.'
    ]
  },
  {
    name: '의심가는 쇼핑몰 [테스트]',
    url: null, // 이름으로만 찾기 (URL이 중복될 수 있으므로)
    targetReportCount: 33, // 2순위 (1등보다 적고, 우아한 30건보다 많게) - 19건에서 33건으로 증가
    descriptions: [
      '이 사이트에서 결제 정보를 입력했는데 계좌에서 돈이 인출되었습니다. 정상적인 쇼핑몰인 줄 알고 주문했는데 피싱 사이트로 의심됩니다.',
      '로그인 정보를 입력했더니 계정이 해킹되었습니다. 이 사이트는 유명 쇼핑몰을 사칭하는 피싱 사이트로 의심됩니다.',
      '결제를 완료했는데 주문 확인 메일이 오지 않고 연락이 안 됩니다. 사기 사이트로 의심됩니다.',
      '이 사이트에서 구매한 상품이 배송되지 않았고, 고객센터 연락처가 모두 가짜였습니다. 사기 사이트로 의심됩니다.',
      '계정 정보를 입력한 후 개인정보 유출 경고를 받았습니다. 이 사이트는 피싱 사이트로 의심됩니다.',
      '주문한 지 3개월이 지났는데도 배송이 안 됩니다. 고객센터에 문의해도 답변이 없습니다.',
      '배송비를 과도하게 받았는데 상품은 배송되지 않았습니다. 배송 추적도 불가능합니다.',
      '이벤트 당첨이라고 해서 개인정보를 요구했습니다. 나중에 확인해보니 사기였습니다.'
    ]
  },
  {
    name: '우아한',
    url: 'https://wooahwan.co.kr/pages/xyMbKB251029?mediaCode=FBIG_05_03A&utm_source=meta&utm_medium=cpc&utm_campaign=wooahwan&utm_term=FBIG_05_03A&utm_id=120235391964000389&utm_content=120235539917910389&fbclid=PAZXh0bgNhZW0BMABhZGlkAasplirnO0UBp-XGSeUnr-GyAXDgfTnOZPVG65aKINE-VguELqXFNYZ7VrKDZi-xXNhEF1po_aem_vJ4coizMcEFL1vfk4d18Cw',
    targetReportCount: 30, // 3순위
    descriptions: [
      '다이어트 약품을 주문했는데 복용 후 심각한 부작용이 발생했습니다. 구토와 어지러움, 두통이 지속되어 병원에 입원해야 했습니다.',
      '1주일 만에 10kg 감량이라는 광고에 속아 주문했는데, 약품을 복용한 후 부작용만 심각하고 체중 감량 효과는 전혀 없었습니다.',
      '약품을 받았는데 포장이 깨져있고 유통기한이 지난 제품이 왔습니다. 복용하기 두려워 바로 버렸습니다.',
      '가짜 리뷰와 조작된 전후 사진에 속아 주문했습니다. 실제로는 전혀 효과가 없었고, 약품 성분도 표시된 것과 다릅니다.',
      '약품 복용 후 설사와 복통이 심각하게 발생했습니다. 영업일 이내에 배송된다는 약속을 지키지 않았습니다.',
      '결제 정보를 입력한 후 계좌에서 추가로 돈이 인출되었습니다. 원인 모를 출금이 계속 발생했습니다.',
      '약품을 주문했는데 정식 의약품이 아닌 건강기능식품이 왔습니다. 광고와 실제 상품이 완전히 다릅니다.',
      '약품 복용 중 심각한 알레르기 반응이 발생해 응급실에 실려갔습니다. 제품에 알레르기 유발 성분이 표시되지 않았습니다.'
    ]
  },
  {
    name: '프로뉴트리션',
    url: 'https://pronutrition.co.kr/product/detail.html?product_no=52&cafe_mkt=ue_dp_nt_v2703&utm_medium=paid&utm_source=ig&utm_id=120230608167000017_v2_s02&utm_content=120233249084780017&utm_term=120233249084790017&utm_campaign=120230608167000017&fbclid=PAZXh0bgNhZW0BMABhZGlkAaspytjObkFzcnRjBmFwcF9pZA8xMjQwMjQ1NzQyODc0MTQAAafyQBLrLA6pvuylziCSWs7be_hbRk5hSzmQgO1eeytuDUxPCnFg_GpU73GLwg_aem_Uu_J6eR1d8WxeQ8AD_6g7A',
    targetReportCount: 25, // 4순위
    descriptions: [
      '다이어트 유산균을 3개월간 복용했는데 전혀 효과가 없었습니다. 광고에서 말한 복부 지방 감소나 배변 개선 효과가 전혀 없습니다.',
      '유산균 제품을 주문했는데 배송이 1개월이 넘게 지연되었습니다. 고객센터에 문의해도 답변이 없습니다.',
      '유산균 캡슐을 받았는데 포장이 깨져있고 제품이 손상되어 있었습니다. 교환을 요청했지만 거부당했습니다.',
      '제품을 복용한 후 복통과 설사가 심각하게 발생했습니다. 제품에 표시된 유산균 함량과 실제 함량이 다를 가능성이 높습니다.',
      '가짜 리뷰와 조작된 후기를 보고 주문했는데, 실제로는 전혀 효과가 없었습니다. 광고 내용이 모두 과장되었습니다.',
      '유산균 제품을 받았는데 유통기한이 얼마 남지 않았습니다. 신선한 제품을 약속했지만 실제로는 유통기한이 임박한 제품을 보냈습니다.',
      '결제를 완료했는데 주문 확인 메일이 오지 않고, 배송 추적도 불가능합니다. 연락이 전혀 안 됩니다.',
      '제품 성분표에 표시되지 않은 첨가물이 포함되어 있을 가능성이 있습니다. 알레르기 반응이 발생했습니다.'
    ]
  },
  {
    name: '리필드',
    url: 'https://refilled.co.kr/product/detail.html?product_no=285&gad_source=4&gad_campaignid=22681366979&gbraid=0AAAAABYcevjDuN4QKUyFkbRgxSCzzR1c0&gclid=Cj0KCQiA5abIBhCaARIsAM3-zFUPWAHbC6cFEiMyyqF5h3sytoKRJ6b5W7Zs-i2CGWy466nx0kVLVFIaApZJEALw_wcB',
    targetReportCount: 22, // 5순위
    descriptions: [
      '탈모치료약을 주문했는데 복용 후 심각한 부작용이 발생했습니다. 두통, 어지러움, 성기능 장애까지 발생해 약물을 중단해야 했습니다.',
      '탈모가 개선된다는 광고에 속아 주문했는데, 3개월간 복용해도 전혀 효과가 없었습니다. 오히려 탈모가 더 심해진 것 같습니다.',
      '탈모치료약을 받았는데 포장이 깨져있고 제품이 손상되어 있었습니다. 약품의 안전성이 의심됩니다.',
      '약품을 복용한 후 심각한 두피 알레르기 반응이 발생했습니다. 두피 가려움증과 발진이 심해서 병원 치료를 받아야 했습니다.',
      '주문한 탈모치료약이 배송되지 않았습니다. 주문 후 3주가 지났는데 고객센터에 문의해도 답변이 없습니다.',
      '약품을 받았는데 유통기한이 지난 제품이 왔습니다. 복용하기 두려워 바로 버렸습니다.',
      '가짜 리뷰와 조작된 사진에 속아 주문했습니다. 실제로는 전혀 효과가 없었습니다.',
      '약품 가격이 주문 확인 후 갑자기 올라갔고, 추가 비용을 요구합니다. 명백한 사기 행위입니다.'
    ]
  },
  {
    name: '아리까리한 쇼핑몰 [테스트]',
    url: 'https://confusing-shop-test.co.kr',
    targetReportCount: 19, // 5순위 (다른 18건 쇼핑몰보다 많게)
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
  const suffixes = ['123', '456', '789', '2024', '2025'];
  const randomNum = Math.floor(Math.random() * 9999) + 1;
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
  return `${prefix}${randomNum}${suffix}`;
}

// 랜덤 날짜 생성
function generateRandomDate() {
  const now = new Date();
  const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const timeDiff = now.getTime() - threeMonthsAgo.getTime();
  const randomTime = Math.random() * timeDiff;
  return new Date(threeMonthsAgo.getTime() + randomTime).toISOString();
}

// 랜덤 전화번호 생성
function generateRandomPhone() {
  const prefixes = ['010', '011', '016', '017', '018', '019'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const middle = String(Math.floor(Math.random() * 9000) + 1000);
  const last = String(Math.floor(Math.random() * 9000) + 1000);
  return `${prefix}-${middle}-${last}`;
}

// 쇼핑몰 ID 조회 (URL 또는 이름으로)
async function getShopId(normalizedUrl, shopName) {
  // 이름과 URL이 모두 제공된 경우, 이름 우선으로 찾기 (URL이 중복될 수 있음)
  if (shopName) {
    const { data: shopsByName, error: nameError } = await supabase
      .from('shops')
      .select('id, name, url')
      .eq('name', shopName);
    
    if (!nameError && shopsByName && shopsByName.length > 0) {
      // 여러 개가 있으면 첫 번째 것 사용
      const shop = shopsByName[0];
      console.log(`  → 이름으로 쇼핑몰 찾음: ${shop.name} (ID: ${shop.id}, URL: ${shop.url})`);
      if (shopsByName.length > 1) {
        console.log(`  ⚠️  같은 이름의 쇼핑몰이 ${shopsByName.length}개 있습니다. 첫 번째 것을 사용합니다.`);
      }
      return shop.id;
    }
  }
  
  // 이름으로 찾지 못했고 URL이 제공된 경우, URL로 찾기
  if (normalizedUrl) {
    const { data: shops, error } = await supabase
      .from('shops')
      .select('id, name')
      .eq('url', normalizedUrl);
    
    if (error || !shops || shops.length === 0) {
      console.error(`  ❌ 쇼핑몰을 찾을 수 없습니다: URL=${normalizedUrl}`);
      return null;
    }
    
    // 여러 개가 있으면 첫 번째 것 사용
    if (shops.length > 1) {
      console.log(`  ⚠️  같은 URL의 쇼핑몰이 ${shops.length}개 있습니다. 첫 번째 것을 사용합니다.`);
    }
    
    return shops[0].id;
  }
  
  console.error(`  ❌ 쇼핑몰을 찾을 수 없습니다: 이름=${shopName}, URL=${normalizedUrl}`);
  return null;
}

// 신고 생성
async function createReport(shopId, description, anonymousUserId) {
  const reporterName = generateRandomId();
  const reporterPhone = generateRandomPhone();
  const createdAt = generateRandomDate();
  
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
      status: 'approved',
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
  console.log('=== 주의가 필요한 쇼핑몰 순위 조정 시작 ===\n');
  
  // 익명 사용자 ID 가져오기
  let anonymousUserId;
  try {
    anonymousUserId = await getAnonymousUserId();
    console.log(`✅ 익명 사용자 ID: ${anonymousUserId}\n`);
  } catch (error) {
    console.error('❌ 익명 사용자 ID를 가져올 수 없습니다:', error.message);
    process.exit(1);
  }
  
  let stats = {
    shopsProcessed: 0,
    reportsCreated: 0,
    errors: 0
  };
  
  // 각 쇼핑몰 처리
  for (const shop of targetShops) {
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
    
    // 현재 신고 수 확인
    const { data: existingReports, error: countError } = await supabase
      .from('shop_reports')
      .select('id')
      .eq('shop_id', shopId)
      .eq('status', 'approved');
    
    const currentReportCount = existingReports ? existingReports.length : 0;
    const needToCreate = shop.targetReportCount - currentReportCount;
    
    console.log(`  → 현재 신고 수: ${currentReportCount}건`);
    console.log(`  → 목표 신고 수: ${shop.targetReportCount}건`);
    console.log(`  → 추가 생성 필요: ${needToCreate > 0 ? needToCreate : 0}건`);
    console.log(`  → 삭제 필요: ${needToCreate < 0 ? Math.abs(needToCreate) : 0}건`);
    
    // 신고 수가 목표보다 많으면 삭제
    if (needToCreate < 0) {
      const reportsToDelete = existingReports.slice(0, Math.abs(needToCreate));
      for (const report of reportsToDelete) {
        const { error: deleteError } = await supabase
          .from('shop_reports')
          .delete()
          .eq('id', report.id);
        
        if (deleteError) {
          console.error(`    ❌ 신고 삭제 실패: ${deleteError.message}`);
          stats.errors++;
        } else {
          console.log(`    ✅ 신고 삭제 완료 (ID: ${report.id})`);
        }
        
        // API 레이트 리밋 방지
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      console.log(`  ✅ 신고 삭제 완료: ${Math.abs(needToCreate)}건`);
      stats.shopsProcessed++;
      continue;
    }
    
    if (needToCreate <= 0) {
      console.log(`  ✅ 이미 목표 신고 수에 도달했습니다.`);
      stats.shopsProcessed++;
      continue;
    }
    
    // 신고 생성
    for (let i = 0; i < needToCreate; i++) {
      const description = shop.descriptions[i % shop.descriptions.length];
      
      const result = await createReport(shopId, description, anonymousUserId);
      
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
    
    stats.shopsProcessed++;
    console.log(`  ✅ ${shop.name} 처리 완료`);
  }
  
  // 결과 요약
  console.log('\n\n=== 처리 완료 ===');
  console.log(`📊 쇼핑몰:`);
  console.log(`  - 처리 완료: ${stats.shopsProcessed}개`);
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

