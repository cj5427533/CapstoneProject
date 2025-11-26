/**
 * 주의가 필요한 페이지 Top 5 쇼핑몰의 피해사례 카테고리 다양화 스크립트
 * 
 * 사용법:
 * node scripts/update-top5-categories.js
 * 
 * Top 5 쇼핑몰의 피해사례 중 '사기/피싱' 카테고리만 있는 것들을
 * 다른 카테고리로 랜덤하게 변경하여 다양성을 높입니다.
 */

const supabase = require('../config/supabase');
const shopService = require('../services/shopService');

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

// 카테고리 파싱
function parseCategories(categoriesString) {
  try {
    if (!categoriesString) return [];
    const parsed = JSON.parse(categoriesString);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// 메인 함수
async function main() {
  console.log('=== Top 5 쇼핑몰 피해사례 카테고리 다양화 시작 ===\n');
  
  try {
    // 주의가 필요한 쇼핑몰 목록 조회 (Top 5)
    const dangerousShops = await shopService.getDangerousShops();
    const top5Shops = dangerousShops.slice(0, 5);
    
    if (top5Shops.length === 0) {
      console.log('⚠️  주의가 필요한 쇼핑몰이 없습니다.');
      return;
    }
    
    console.log(`📊 Top 5 쇼핑몰 발견: ${top5Shops.length}개\n`);
    
    let stats = {
      shopsProcessed: 0,
      reportsUpdated: 0,
      reportsSkipped: 0,
      errors: 0
    };
    
    // 각 쇼핑몰 처리
    for (const shop of top5Shops) {
      console.log(`\n[${shop.name || shop.url}]`);
      console.log(`  신고 수: ${shop.reportCount}건`);
      
      // 해당 쇼핑몰의 모든 피해사례 조회
      const { data: reports, error: reportsError } = await supabase
        .from('shop_reports')
        .select('id, categories')
        .eq('shop_id', shop.id)
        .eq('status', 'approved');
      
      if (reportsError) {
        console.error(`  ❌ 피해사례 조회 실패: ${reportsError.message}`);
        stats.errors++;
        continue;
      }
      
      if (!reports || reports.length === 0) {
        console.log(`  ⏭️  피해사례가 없습니다.`);
        continue;
      }
      
      // '사기/피싱'만 있는 피해사례 찾기
      const reportsToUpdate = reports.filter(report => {
        const categories = parseCategories(report.categories);
        // '사기/피싱'만 있고 다른 카테고리가 없는 경우
        return categories.length === 1 && categories[0] === '사기/피싱';
      });
      
      console.log(`  → 전체 피해사례: ${reports.length}건`);
      console.log(`  → 업데이트 대상: ${reportsToUpdate.length}건`);
      
      if (reportsToUpdate.length === 0) {
        console.log(`  ✅ 이미 다양한 카테고리가 있습니다.`);
        stats.shopsProcessed++;
        continue;
      }
      
      // 일부만 업데이트 (전체의 60-70% 정도를 다른 카테고리로 변경)
      // 최소 1개는 '사기/피싱'으로 유지
      const updateCount = Math.max(1, Math.floor(reportsToUpdate.length * 0.65));
      const reportsToChange = reportsToUpdate.slice(0, updateCount);
      
      console.log(`  → 변경 예정: ${reportsToChange.length}건 (${reportsToUpdate.length - reportsToChange.length}건은 '사기/피싱' 유지)`);
      
      // 카테고리 업데이트
      for (const report of reportsToChange) {
        const newCategory = selectRandomCategory();
        
        const { error: updateError } = await supabase
          .from('shop_reports')
          .update({
            categories: JSON.stringify([newCategory])
          })
          .eq('id', report.id);
        
        if (updateError) {
          console.error(`    ❌ 업데이트 실패 (ID: ${report.id}): ${updateError.message}`);
          stats.errors++;
        } else {
          stats.reportsUpdated++;
          if (stats.reportsUpdated % 5 === 0 || stats.reportsUpdated === reportsToChange.length) {
            console.log(`    ✅ 업데이트 중... (${stats.reportsUpdated}/${reportsToChange.length})`);
          }
        }
        
        // API 레이트 리밋 방지
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      stats.shopsProcessed++;
      console.log(`  ✅ ${shop.name || shop.url} 처리 완료`);
    }
    
    // 결과 요약
    console.log('\n\n=== 처리 완료 ===');
    console.log(`📊 쇼핑몰:`);
    console.log(`  - 처리 완료: ${stats.shopsProcessed}개`);
    console.log(`📊 피해사례:`);
    console.log(`  - 업데이트: ${stats.reportsUpdated}개`);
    console.log(`  - 건너뜀: ${stats.reportsSkipped}개`);
    console.log(`  - 오류: ${stats.errors}개`);
    console.log('\n✅ 완료!\n');
    
  } catch (error) {
    console.error('\n❌ 스크립트 실행 중 오류 발생:', error);
    process.exit(1);
  }
}

// 스크립트 실행
main().catch(error => {
  console.error('\n❌ 스크립트 실행 중 오류 발생:', error);
  process.exit(1);
});

