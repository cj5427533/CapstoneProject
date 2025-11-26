/**
 * 특정 쇼핑몰의 신뢰도 점수 조정 스크립트
 * 
 * 사용법:
 * node scripts/adjust-trust-scores.js
 * 
 * 판단 기준은 변경하지 않고, shop_trust_scores 테이블의 final_trust 값만 직접 업데이트합니다.
 */

const supabase = require('../config/supabase');

// 조정할 쇼핑몰 목록
const targetShops = [
  {
    name: '매우 의심가는 쇼핑몰 [테스트]',
    targetTrustScore: 15, // 10점대 (10~19)
    url: null // 이름으로 찾기
  },
  {
    name: '의심가는 쇼핑몰 [테스트]',
    targetTrustScore: 35, // 30점대 (30~39)
    url: null // 이름으로 찾기
  },
  {
    name: '우아한',
    targetTrustScore: 15, // 10점대 (10~19)
    url: null // 이름으로 찾기
  }
];

// 쇼핑몰 ID 조회
async function getShopId(shopName) {
  const { data: shops, error } = await supabase
    .from('shops')
    .select('id, name, url')
    .eq('name', shopName);
  
  if (error) {
    console.error(`  ❌ 쇼핑몰 조회 오류: ${error.message}`);
    return null;
  }
  
  if (!shops || shops.length === 0) {
    console.error(`  ❌ 쇼핑몰을 찾을 수 없습니다: ${shopName}`);
    return null;
  }
  
  if (shops.length > 1) {
    console.log(`  ⚠️  같은 이름의 쇼핑몰이 ${shops.length}개 있습니다. 첫 번째 것을 사용합니다.`);
  }
  
  const shop = shops[0];
  console.log(`  → 쇼핑몰 찾음: ${shop.name} (ID: ${shop.id}, URL: ${shop.url})`);
  return shop.id;
}

// 신뢰도 등급 계산
function calculateTrustGrade(finalTrust) {
  if (finalTrust >= 90) return 'VERY_HIGH';
  if (finalTrust >= 70) return 'HIGH';
  if (finalTrust >= 40) return 'CAUTION';
  return 'LOW';
}

// 신뢰도 점수 업데이트
async function updateTrustScore(shopId, targetScore) {
  const trustGrade = calculateTrustGrade(targetScore);
  
  // 기존 신뢰도 점수 조회
  const { data: existingScore, error: getError } = await supabase
    .from('shop_trust_scores')
    .select('*')
    .eq('shop_id', shopId)
    .single();
  
  if (getError && getError.code !== 'PGRST116') {
    console.error(`  ❌ 신뢰도 점수 조회 오류: ${getError.message}`);
    return false;
  }
  
  // 기존 값이 있으면 업데이트, 없으면 생성
  const updateData = {
    shop_id: shopId,
    final_trust: targetScore,
    trust_grade: trustGrade,
    analyzed_at: new Date().toISOString()
  };
  
  // 기존 값이 있으면 기존 tech_risk, review_risk, report_penalty 유지
  if (existingScore) {
    updateData.tech_risk = existingScore.tech_risk;
    updateData.review_risk = existingScore.review_risk;
    updateData.report_penalty = existingScore.report_penalty;
    updateData.model_version = existingScore.model_version || 'v1.0';
    console.log(`  → 기존 신뢰도 점수: ${existingScore.final_trust} → ${targetScore}로 변경`);
  } else {
    // 기존 값이 없으면 기본값 설정
    updateData.tech_risk = 0.5;
    updateData.review_risk = 0.3;
    updateData.report_penalty = 15;
    updateData.model_version = 'v1.0';
    console.log(`  → 신뢰도 점수 생성: ${targetScore}`);
  }
  
  const { data, error } = await supabase
    .from('shop_trust_scores')
    .upsert(updateData, {
      onConflict: 'shop_id'
    })
    .select()
    .single();
  
  if (error) {
    console.error(`  ❌ 신뢰도 점수 업데이트 오류: ${error.message}`);
    return false;
  }
  
  console.log(`  ✅ 신뢰도 점수 업데이트 완료: ${targetScore}점 (등급: ${trustGrade})`);
  
  // AI 분석 캐시도 삭제하여 재계산되도록 함
  const { error: deleteCacheError } = await supabase
    .from('ai_analysis_cache')
    .delete()
    .eq('shop_id', shopId);
  
  if (deleteCacheError) {
    console.log(`  ⚠️  AI 분석 캐시 삭제 실패 (무시 가능): ${deleteCacheError.message}`);
  } else {
    console.log(`  ✅ AI 분석 캐시 삭제 완료 (재계산 시 새로운 값 사용)`);
  }
  
  return true;
}

// 메인 함수
async function main() {
  console.log('=== 신뢰도 점수 조정 시작 ===\n');
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const shop of targetShops) {
    console.log(`\n[${shop.name}]`);
    console.log(`  목표 신뢰도 점수: ${shop.targetTrustScore}점`);
    
    const shopId = await getShopId(shop.name);
    if (!shopId) {
      errorCount++;
      continue;
    }
    
    const success = await updateTrustScore(shopId, shop.targetTrustScore);
    if (success) {
      successCount++;
    } else {
      errorCount++;
    }
  }
  
  console.log('\n\n=== 처리 완료 ===');
  console.log(`✅ 성공: ${successCount}개`);
  console.log(`❌ 실패: ${errorCount}개`);
  console.log('\n✅ 완료!\n');
}

// 스크립트 실행
main().catch(error => {
  console.error('\n❌ 스크립트 실행 중 오류 발생:', error);
  process.exit(1);
});

