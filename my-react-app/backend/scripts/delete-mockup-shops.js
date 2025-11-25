/**
 * 목업 쇼핑몰 데이터 삭제 스크립트
 * 
 * 사용법:
 * node scripts/delete-mockup-shops.js
 * 
 * "[목업 쇼핑몰]" 또는 "목업쇼핑몰"이 이름에 포함된 쇼핑몰의 신고와 쇼핑몰 데이터를 삭제합니다.
 * "[테스트]"가 포함된 쇼핑몰은 유지합니다.
 */

const supabase = require('../config/supabase');

// 메인 함수
async function main() {
  console.log('=== 목업 쇼핑몰 데이터 삭제 시작 ===\n');
  
  try {
    // "[목업 쇼핑몰]", "[목업쇼핑몰]", "목업쇼핑몰" 등 다양한 패턴 검색
    // 모든 shops를 조회한 후 필터링
    const { data: allShopsData, error: fetchError } = await supabase
      .from('shops')
      .select('id, name, url');
    
    if (fetchError) {
      console.error('❌ 쇼핑몰 조회 실패:', fetchError.message);
      throw fetchError;
    }
    
    // 이름에 "목업"이 포함된 쇼핑몰 필터링
    const mockupShops = (allShopsData || []).filter(shop => 
      shop.name && (
        shop.name.includes('목업') || 
        shop.name.includes('[목업') ||
        shop.name.includes('목업]')
      )
    );
    
    if (!mockupShops || mockupShops.length === 0) {
      console.log('✅ 삭제할 목업 쇼핑몰이 없습니다.\n');
      return;
    }
    
    console.log(`📋 발견된 목업 쇼핑몰: ${mockupShops.length}개\n`);
    
    let stats = {
      shopsDeleted: 0,
      reportsDeleted: 0,
      ratingsDeleted: 0,
      errors: 0
    };
    
    // 각 목업 쇼핑몰 처리
    for (const shop of mockupShops) {
      console.log(`[삭제 중] ${shop.name} (ID: ${shop.id})`);
      console.log(`  URL: ${shop.url}`);
      
      try {
        // 1. 신고 삭제 (reports 또는 shop_reports 테이블 시도)
        let reports = [];
        let reportsError = null;
        
        // 먼저 reports 테이블 시도
        const reportsResult = await supabase
          .from('reports')
          .select('id')
          .eq('shop_id', shop.id);
        
        if (reportsResult.error) {
          // reports 테이블이 없으면 shop_reports 시도
          const shopReportsResult = await supabase
            .from('shop_reports')
            .select('id')
            .eq('shop_id', shop.id);
          
          if (shopReportsResult.error) {
            console.error(`  ❌ 신고 조회 실패: ${shopReportsResult.error.message}`);
            stats.errors++;
          } else {
            reports = shopReportsResult.data || [];
            if (reports.length > 0) {
              const { error: deleteError } = await supabase
                .from('shop_reports')
                .delete()
                .eq('shop_id', shop.id);
              
              if (deleteError) {
                console.error(`  ❌ 신고 삭제 실패: ${deleteError.message}`);
                stats.errors++;
              } else {
                stats.reportsDeleted += reports.length;
                console.log(`  ✅ 신고 삭제 완료: ${reports.length}건`);
              }
            }
          }
        } else {
          reports = reportsResult.data || [];
          if (reports.length > 0) {
            const { error: deleteError } = await supabase
              .from('reports')
              .delete()
              .eq('shop_id', shop.id);
            
            if (deleteError) {
              console.error(`  ❌ 신고 삭제 실패: ${deleteError.message}`);
              stats.errors++;
            } else {
              stats.reportsDeleted += reports.length;
              console.log(`  ✅ 신고 삭제 완료: ${reports.length}건`);
            }
          }
        }
        
        // 2. 평점 삭제 (ratings 또는 shop_ratings 테이블 시도)
        let ratings = [];
        
        // 먼저 ratings 테이블 시도
        const ratingsResult = await supabase
          .from('ratings')
          .select('id')
          .eq('shop_id', shop.id);
        
        if (ratingsResult.error) {
          // ratings 테이블이 없으면 shop_ratings 시도
          const shopRatingsResult = await supabase
            .from('shop_ratings')
            .select('id')
            .eq('shop_id', shop.id);
          
          if (shopRatingsResult.error) {
            console.error(`  ❌ 평점 조회 실패: ${shopRatingsResult.error.message}`);
          } else {
            ratings = shopRatingsResult.data || [];
            if (ratings.length > 0) {
              const { error: deleteError } = await supabase
                .from('shop_ratings')
                .delete()
                .eq('shop_id', shop.id);
              
              if (deleteError) {
                console.error(`  ❌ 평점 삭제 실패: ${deleteError.message}`);
              } else {
                stats.ratingsDeleted += ratings.length;
                console.log(`  ✅ 평점 삭제 완료: ${ratings.length}건`);
              }
            }
          }
        } else {
          ratings = ratingsResult.data || [];
          if (ratings.length > 0) {
            const { error: deleteError } = await supabase
              .from('ratings')
              .delete()
              .eq('shop_id', shop.id);
            
            if (deleteError) {
              console.error(`  ❌ 평점 삭제 실패: ${deleteError.message}`);
            } else {
              stats.ratingsDeleted += ratings.length;
              console.log(`  ✅ 평점 삭제 완료: ${ratings.length}건`);
            }
          }
        }
        
        // 3. 쇼핑몰 삭제
        const { error: deleteShopError } = await supabase
          .from('shops')
          .delete()
          .eq('id', shop.id);
        
        if (deleteShopError) {
          console.error(`  ❌ 쇼핑몰 삭제 실패: ${deleteShopError.message}`);
          stats.errors++;
        } else {
          stats.shopsDeleted++;
          console.log(`  ✅ 쇼핑몰 삭제 완료`);
        }
        
        console.log('');
        
        // API 레이트 리밋 방지
        await new Promise(resolve => setTimeout(resolve, 300));
        
      } catch (error) {
        console.error(`  ❌ 처리 중 오류 발생: ${error.message}`);
        stats.errors++;
        console.log('');
      }
    }
    
    // 결과 요약
    console.log('\n=== 처리 완료 ===');
    console.log(`📊 쇼핑몰:`);
    console.log(`  - 삭제 완료: ${stats.shopsDeleted}개`);
    console.log(`📊 신고:`);
    console.log(`  - 삭제 완료: ${stats.reportsDeleted}건`);
    console.log(`📊 평점:`);
    console.log(`  - 삭제 완료: ${stats.ratingsDeleted}건`);
    console.log(`📊 오류:`);
    console.log(`  - 발생: ${stats.errors}개`);
    console.log('\n✅ 완료!\n');
    
  } catch (error) {
    console.error('\n❌ 스크립트 실행 중 오류 발생:', error);
    process.exit(1);
  }
}

// 스크립트 실행
main();

