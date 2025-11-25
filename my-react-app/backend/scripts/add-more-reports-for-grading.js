/**
 * 주의가 필요한 쇼핑몰 등급 기준에 맞게 신고 추가 스크립트
 * 
 * 사용법:
 * node scripts/add-more-reports-for-grading.js
 * 
 * 각 등급별로 쇼핑몰이 분류되도록 신고를 추가합니다.
 */

const supabase = require('../config/supabase');
const { normalizeUrl } = require('../utils/url');
const { getAnonymousUserId } = require('../utils/anonymousUser');

// 등급별로 신고를 추가할 피싱 URL 목록
const phishingUrlsForGrading = [
  // 피싱 의심 (신고 15개 이상 또는 신고 10개 이상 + 평점 2.0 이하)
  { url: 'https://booking.provides-truth40095.com/J8RGX2XM', targetReports: 15, targetRating: 1.5 },
  { url: 'https://www.accout-helpz.sbs', targetReports: 16, targetRating: 1.8 },
  { url: 'https://booking.confirmation-id914131.com/N5EPOXLZ', targetReports: 18, targetRating: 1.2 },
  
  // 주의 (신고 10개 이상 또는 신고 5개 이상 + 평점 3.0 이하)
  { url: 'https://bookingverifycenter.com/177486843880', targetReports: 12, targetRating: 2.5 },
  { url: 'https://portal-faq-ldger.typedream.app', targetReports: 8, targetRating: 2.8 },
  { url: 'https://web-ledgerliv--wallet.typedream.app', targetReports: 10, targetRating: 2.9 },
  { url: 'https://meta-support-formid.pages.dev', targetReports: 7, targetRating: 3.0 },
  
  // 약간 주의 (신고 5개 이상 또는 신고 3개 이상 + 평점 3.5 이하)
  { url: 'https://meta-support-directory.pages.dev', targetReports: 6, targetRating: 3.2 },
  { url: 'https://rbfcu-star.azurewebsites.net/(S(1bqzezdr54mnvjmxnczjrkmk))/Main/Login', targetReports: 5, targetRating: 3.4 },
  { url: 'https://marilynnoad.com/DocuSign_Docs', targetReports: 4, targetRating: 3.5 },
  { url: 'https://meta-support-dataprofile.pages.dev', targetReports: 5, targetRating: 3.3 }
];

// 신고 템플릿
const reportTemplates = [
  '이 사이트에서 결제 정보를 입력했는데 계좌에서 돈이 인출되었습니다. 피싱 사이트로 의심됩니다.',
  '로그인 정보를 입력했더니 계정이 해킹되었습니다. 피싱 사이트로 의심됩니다.',
  '결제를 완료했는데 주문 확인 메일이 오지 않고 연락이 안 됩니다. 사기 사이트로 의심됩니다.',
  '이 사이트에서 구매한 상품이 배송되지 않았습니다. 사기 사이트로 의심됩니다.',
  '계정 정보를 입력한 후 개인정보 유출 경고를 받았습니다. 피싱 사이트로 의심됩니다.',
  '고객센터 연락처가 모두 가짜였습니다. 사기 사이트로 의심됩니다.',
  '사기 사이트로 의심됩니다.',
  '피싱 사이트로 의심됩니다.',
  '정상적인 쇼핑몰인 줄 알고 주문했는데 피싱 사이트로 의심됩니다.',
  '유명 쇼핑몰을 사칭하는 피싱 사이트로 의심됩니다.'
];

// 랜덤 아이디 생성
function generateRandomId() {
  const prefixes = ['user', 'shopper', 'buyer', 'customer', 'member'];
  const randomNum = Math.floor(Math.random() * 9999) + 1;
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  return `${prefix}${randomNum}`;
}

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
  
  return shop.parent_shop_id || shop.id;
}

// 현재 신고 수 조회
async function getCurrentReportCount(shopId) {
  const { count, error } = await supabase
    .from('shop_reports')
    .select('id', { count: 'exact', head: true })
    .eq('shop_id', shopId);
  
  if (error) {
    console.error(`  ❌ 신고 수 조회 실패: ${error.message}`);
    return 0;
  }
  
  return count || 0;
}

// 신고 생성
async function createReport(shopId, anonymousUserId, customDate = null) {
  const createdAt = customDate || generateRandomDate();
  const reporterName = generateRandomId();
  const description = reportTemplates[Math.floor(Math.random() * reportTemplates.length)];
  
  const { data: newReport, error } = await supabase
    .from('shop_reports')
    .insert({
      shop_id: shopId,
      user_id: anonymousUserId,
      categories: JSON.stringify(['사기/피싱']),
      description: description,
      reporter_name: reporterName,
      reporter_phone: `010-${String(Math.floor(Math.random() * 9000) + 1000)}-${String(Math.floor(Math.random() * 9000) + 1000)}`,
      evidence_files: null,
      evidence_type: 'NONE',
      evidence_verified: false,
      verification_score: 0,
      report_type: 'GENERAL_REVIEW',
      status: 'approved',
      created_at: createdAt
    })
    .select('id')
    .single();
  
  if (error) {
    console.error(`  ❌ 신고 생성 실패: ${error.message}`);
    return { success: false, error: error.message };
  }
  
  return { success: true, report: newReport };
}

// 평점 생성
async function createRating(shopId, rating, anonymousUserId, customDate = null) {
  const createdAt = customDate || generateRandomDate();
  
  const { data: newRating, error } = await supabase
    .from('shop_ratings')
    .insert({
      shop_id: shopId,
      user_id: anonymousUserId,
      rating: rating,
      comment: null,
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

// 현재 평점 조회
async function getCurrentRating(shopId) {
  const { data: ratings, error } = await supabase
    .from('shop_ratings')
    .select('rating')
    .eq('shop_id', shopId);
  
  if (error) {
    return { average: 0, count: 0 };
  }
  
  if (!ratings || ratings.length === 0) {
    return { average: 0, count: 0 };
  }
  
  const total = ratings.reduce((sum, r) => sum + r.rating, 0);
  return { average: total / ratings.length, count: ratings.length };
}

// 메인 함수
async function main() {
  console.log('=== 주의가 필요한 쇼핑몰 등급 기준에 맞게 신고 추가 시작 ===\n');
  
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
    total: 0,
    reportsCreated: 0,
    ratingsCreated: 0,
    errors: 0
  };
  
  for (const item of phishingUrlsForGrading) {
    const normalizedUrl = normalizeUrl(item.url);
    console.log(`\n[${phishingUrlsForGrading.indexOf(item) + 1}/${phishingUrlsForGrading.length}] ${item.url}`);
    console.log(`  → 정규화: ${normalizedUrl}`);
    console.log(`  → 목표: 신고 ${item.targetReports}개, 평점 ${item.targetRating}점`);
    
    const shopId = await getShopId(normalizedUrl);
    if (!shopId) {
      stats.errors++;
      continue;
    }
    
    // 현재 신고 수 확인
    const currentReportCount = await getCurrentReportCount(shopId);
    const neededReports = Math.max(0, item.targetReports - currentReportCount);
    
    console.log(`  → 현재 신고: ${currentReportCount}개, 추가 필요: ${neededReports}개`);
    
    // 신고 추가
    for (let i = 0; i < neededReports; i++) {
      stats.total++;
      const result = await createReport(shopId, anonymousUserId);
      if (result.success) {
        stats.reportsCreated++;
        console.log(`    ✅ 신고 생성 성공 (ID: ${result.report.id})`);
      } else {
        stats.errors++;
      }
      await new Promise(resolve => setTimeout(resolve, 150));
    }
    
    // 현재 평점 확인
    const currentRating = await getCurrentRating(shopId);
    console.log(`  → 현재 평점: ${currentRating.average.toFixed(1)}점 (${currentRating.count}개)`);
    
    // 목표 평점에 맞게 평점 추가
    if (currentRating.count === 0 || currentRating.average > item.targetRating) {
      // 낮은 평점 추가 (1-2점)
      const ratingCount = Math.max(3, Math.ceil((currentRating.average * currentRating.count - item.targetRating * (currentRating.count + 3)) / (item.targetRating - 1.5)));
      const ratingCountToAdd = Math.max(0, ratingCount);
      
      if (ratingCountToAdd > 0) {
        console.log(`  → 낮은 평점 추가 예정: ${ratingCountToAdd}개`);
        for (let i = 0; i < ratingCountToAdd; i++) {
          const rating = Math.random() < 0.7 ? 1 : 2; // 70% 확률로 1점
          const result = await createRating(shopId, rating, anonymousUserId);
          if (result.success) {
            stats.ratingsCreated++;
            console.log(`    ✅ 평점 생성 성공 (${rating}점, ID: ${result.rating.id})`);
          }
          await new Promise(resolve => setTimeout(resolve, 150));
        }
      }
    }
  }
  
  // 결과 요약
  console.log('\n\n=== 처리 완료 ===');
  console.log(`📊 신고: ${stats.reportsCreated}개 생성`);
  console.log(`📊 평점: ${stats.ratingsCreated}개 생성`);
  console.log(`📊 오류: ${stats.errors}개`);
  console.log('\n✅ 완료!\n');
}

// 스크립트 실행
main().catch(error => {
  console.error('\n❌ 스크립트 실행 중 오류 발생:', error);
  process.exit(1);
});

