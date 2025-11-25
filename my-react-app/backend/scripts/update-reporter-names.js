/**
 * 기존 신고들의 제보자 이름을 아이디로 변경하는 스크립트
 * 
 * 사용법:
 * node scripts/update-reporter-names.js
 */

const supabase = require('../config/supabase');

// 랜덤 아이디 생성
function generateRandomId() {
  const prefixes = ['user', 'shopper', 'buyer', 'customer', 'member', 'shopper', 'user'];
  const suffixes = ['123', '456', '789', '2024', '2025', '01', '02', '03', '04', '05', '10', '20', '30', '99'];
  const randomNum = Math.floor(Math.random() * 9999) + 1;
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
  return `${prefix}${randomNum}${suffix}`;
}

// 메인 함수
async function main() {
  console.log('=== 제보자 이름을 아이디로 변경 시작 ===\n');
  
  // 모든 신고 조회 (이름이 있는 것만)
  const { data: reports, error: fetchError } = await supabase
    .from('shop_reports')
    .select('id, reporter_name')
    .not('reporter_name', 'is', null)
    .order('id', { ascending: false });
  
  if (fetchError) {
    console.error('❌ 신고 조회 실패:', fetchError.message);
    process.exit(1);
  }
  
  if (!reports || reports.length === 0) {
    console.log('업데이트할 신고가 없습니다.');
    return;
  }
  
  console.log(`총 ${reports.length}개의 신고를 업데이트합니다.\n`);
  
  let stats = {
    total: 0,
    updated: 0,
    errors: 0
  };
  
  // 각 신고의 이름을 아이디로 변경
  for (const report of reports) {
    stats.total++;
    
    // 이미 아이디 형식인지 확인 (한글 이름이 아닌 경우)
    const currentName = report.reporter_name;
    const isKoreanName = /[가-힣]/.test(currentName);
    
    if (!isKoreanName) {
      // 이미 아이디 형식이면 스킵
      continue;
    }
    
    const newId = generateRandomId();
    
    const { error: updateError } = await supabase
      .from('shop_reports')
      .update({ reporter_name: newId })
      .eq('id', report.id);
    
    if (updateError) {
      console.error(`  ❌ 신고 ID ${report.id} 업데이트 실패: ${updateError.message}`);
      stats.errors++;
    } else {
      stats.updated++;
      if (stats.updated % 10 === 0) {
        console.log(`  ✅ ${stats.updated}개 업데이트 완료...`);
      }
    }
    
    // API 레이트 리밋 방지
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // 결과 요약
  console.log('\n\n=== 처리 완료 ===');
  console.log(`📊 전체: ${stats.total}개`);
  console.log(`  - 업데이트: ${stats.updated}개`);
  console.log(`  - 오류: ${stats.errors}개`);
  console.log('\n✅ 완료!\n');
}

// 스크립트 실행
main().catch(error => {
  console.error('\n❌ 스크립트 실행 중 오류 발생:', error);
  process.exit(1);
});

