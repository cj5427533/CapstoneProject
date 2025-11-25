/**
 * 기존 신고들의 확정적인 표현을 의심 표현으로 변경하는 스크립트
 * 
 * 사용법:
 * node scripts/update-report-descriptions.js
 */

const supabase = require('../config/supabase');

// 변경할 패턴들
const replacements = [
  { from: /피싱 사이트로 확인되었습니다/gi, to: '피싱 사이트로 의심됩니다' },
  { from: /확인되었습니다/gi, to: '의심됩니다' },
  { from: /명백한 사기 사이트입니다/gi, to: '사기 사이트로 의심됩니다' },
  { from: /피싱 사이트였습니다/gi, to: '피싱 사이트로 의심됩니다' },
  { from: /피싱 사이트입니다/gi, to: '피싱 사이트로 의심됩니다' },
  { from: /사기 사이트였습니다/gi, to: '사기 사이트로 의심됩니다' },
  { from: /사기 사이트입니다/gi, to: '사기 사이트로 의심됩니다' }
];

// 메인 함수
async function main() {
  console.log('=== 신고 내용의 확정적 표현을 의심 표현으로 변경 시작 ===\n');
  
  // 모든 신고 조회
  const { data: reports, error: fetchError } = await supabase
    .from('shop_reports')
    .select('id, description')
    .not('description', 'is', null);
  
  if (fetchError) {
    console.error('❌ 신고 조회 실패:', fetchError.message);
    process.exit(1);
  }
  
  if (!reports || reports.length === 0) {
    console.log('업데이트할 신고가 없습니다.');
    return;
  }
  
  console.log(`총 ${reports.length}개의 신고를 확인합니다.\n`);
  
  let stats = {
    total: 0,
    updated: 0,
    skipped: 0,
    errors: 0
  };
  
  // 각 신고의 내용 확인 및 업데이트
  for (const report of reports) {
    stats.total++;
    let updatedDescription = report.description;
    let hasChanges = false;
    
    // 패턴 매칭 및 교체
    for (const replacement of replacements) {
      if (replacement.from.test(updatedDescription)) {
        updatedDescription = updatedDescription.replace(replacement.from, replacement.to);
        hasChanges = true;
      }
    }
    
    // 변경사항이 있으면 업데이트
    if (hasChanges) {
      const { error: updateError } = await supabase
        .from('shop_reports')
        .update({ description: updatedDescription })
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
    } else {
      stats.skipped++;
    }
    
    // API 레이트 리밋 방지
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // 결과 요약
  console.log('\n\n=== 처리 완료 ===');
  console.log(`📊 전체: ${stats.total}개`);
  console.log(`  - 업데이트: ${stats.updated}개`);
  console.log(`  - 변경 없음: ${stats.skipped}개`);
  console.log(`  - 오류: ${stats.errors}개`);
  console.log('\n✅ 완료!\n');
}

// 스크립트 실행
main().catch(error => {
  console.error('\n❌ 스크립트 실행 중 오류 발생:', error);
  process.exit(1);
});

