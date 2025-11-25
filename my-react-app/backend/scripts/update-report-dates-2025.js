/**
 * 기존 신고들의 날짜를 2025년 11월 사이의 랜덤 날짜로 업데이트하는 스크립트
 * 최신순 정렬을 위해 최신 날짜가 2025년 11월 25일이 되도록 설정
 * 
 * 사용법:
 * node scripts/update-report-dates-2025.js
 */

const supabase = require('../config/supabase');

// 2025년 11월 사이의 랜덤 날짜 생성 (최신순 정렬을 위해 역순으로 생성)
function generateRandomDate2025(index, total) {
  // 2025년 11월 1일 ~ 11월 30일
  const startDate = new Date('2025-11-01');
  const endDate = new Date('2025-11-30');
  const timeDiff = endDate.getTime() - startDate.getTime();
  
  // 최신순으로 정렬하기 위해 역순으로 날짜 생성
  // 첫 번째 항목(index 0)이 가장 최신(11월 25일 근처), 마지막 항목이 가장 오래됨(11월 1일 근처)
  const ratio = index / total; // 0 ~ 1
  const reverseRatio = 1 - ratio; // 1 ~ 0 (역순)
  
  // 최신 날짜를 11월 25일로 설정하고, 그 이전 날짜들로 분산
  const latestDate = new Date('2025-11-25');
  const daysFromLatest = Math.floor(reverseRatio * 24); // 0~24일 전
  const randomDate = new Date(latestDate);
  randomDate.setDate(randomDate.getDate() - daysFromLatest);
  
  // 시간도 랜덤하게 설정 (0시 ~ 23시 59분)
  const randomHours = Math.floor(Math.random() * 24);
  const randomMinutes = Math.floor(Math.random() * 60);
  randomDate.setHours(randomHours, randomMinutes, 0, 0);
  
  return randomDate.toISOString();
}

// 메인 함수
async function main() {
  console.log('=== 신고 날짜를 2025년 11월로 업데이트 시작 ===\n');
  
  // 모든 신고 조회 (최신순)
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
  console.log('최신 신고는 2025년 11월 25일 근처로, 오래된 신고는 11월 1일 근처로 설정됩니다.\n');
  
  let stats = {
    total: 0,
    updated: 0,
    errors: 0
  };
  
  // 각 신고의 날짜를 랜덤하게 업데이트 (최신순 정렬 유지)
  for (let i = 0; i < reports.length; i++) {
    const report = reports[i];
    stats.total++;
    const newDate = generateRandomDate2025(i, reports.length);
    
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
  console.log('\n✅ 완료!');
  console.log('최신 신고 날짜: 2025년 11월 25일 근처');
  console.log('가장 오래된 신고 날짜: 2025년 11월 1일 근처\n');
}

// 스크립트 실행
main().catch(error => {
  console.error('\n❌ 스크립트 실행 중 오류 발생:', error);
  process.exit(1);
});

