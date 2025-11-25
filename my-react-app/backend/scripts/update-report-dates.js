/**
 * 기존 신고들의 날짜를 10~11월 사이의 랜덤 날짜로 업데이트하는 스크립트
 * 
 * 사용법:
 * node scripts/update-report-dates.js
 */

const supabase = require('../config/supabase');

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

// 메인 함수
async function main() {
  console.log('=== 신고 날짜 업데이트 시작 ===\n');
  
  // 모든 신고 조회
  const { data: reports, error: fetchError } = await supabase
    .from('shop_reports')
    .select('id, created_at')
    .order('created_at', { ascending: false });
  
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
  
  // 각 신고의 날짜를 랜덤하게 업데이트
  for (const report of reports) {
    stats.total++;
    const newDate = generateRandomDate();
    
    const { error: updateError } = await supabase
      .from('shop_reports')
      .update({ created_at: newDate })
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

