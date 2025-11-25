/**
 * 주요 쇼핑몰 사업자 등록 정보 추가 스크립트
 * 
 * 사용법:
 * node scripts/add-business-registrations.js
 */

const supabase = require('../config/supabase');
const { normalizeUrl } = require('../utils/url');

// 주요 쇼핑몰 사업자 등록 정보
const businessRegistrations = [
  {
    url: '11st.co.kr',
    businessData: {
      business_number: '104-81-45690',
      registration_date: '2008-01-01', // 대략적인 등록일
      business_status: 'ACTIVE',
      business_type: '통신판매중개업',
      capital_amount: 100000000000, // 1000억원 (대략)
      representative_name: '이상호', // 대표자명 (변경 가능)
      business_address: '서울특별시 중구 을지로 65',
      phone_number: '1588-1111',
      email: 'help@11st.co.kr',
      verification_source: 'MANUAL'
    }
  },
  // 다른 주요 쇼핑몰도 추가 가능
  {
    url: 'coupang.com',
    businessData: {
      business_number: '120-88-00767',
      registration_date: '2010-01-01',
      business_status: 'ACTIVE',
      business_type: '통신판매중개업',
      capital_amount: 500000000000, // 5000억원
      representative_name: '김범석',
      business_address: '서울특별시 송파구 송파대로 570',
      phone_number: '1577-7011',
      email: 'help@coupang.com',
      verification_source: 'MANUAL'
    }
  },
  {
    url: 'gmarket.co.kr',
    businessData: {
      business_number: '120-81-47521',
      registration_date: '2000-01-01',
      business_status: 'ACTIVE',
      business_type: '통신판매중개업',
      capital_amount: 200000000000, // 2000억원
      representative_name: '이진수',
      business_address: '서울특별시 강남구 테헤란로 152',
      phone_number: '1588-7700',
      email: 'help@gmarket.co.kr',
      verification_source: 'MANUAL'
    }
  }
];

async function addBusinessRegistrations() {
  try {
    console.log('사업자 등록 정보 추가 시작...\n');

    for (const item of businessRegistrations) {
      try {
        // 1. URL 정규화
        const normalizedUrl = normalizeUrl(item.url);
        
        // 2. URL로 shop 찾기 (여러 패턴 시도)
        let shops = null;
        let shopError = null;
        
        // 정규화된 URL로 먼저 시도
        const { data: shops1, error: error1 } = await supabase
          .from('shops')
          .select('id, url, parent_shop_id, name')
          .eq('url', normalizedUrl)
          .limit(1);
        
        if (!error1 && shops1 && shops1.length > 0) {
          shops = shops1;
        } else {
          // 원본 URL로도 시도
          const { data: shops2, error: error2 } = await supabase
            .from('shops')
            .select('id, url, parent_shop_id, name')
            .ilike('url', `%${item.url}%`)
            .limit(1);
          
          if (!error2 && shops2 && shops2.length > 0) {
            shops = shops2;
          } else {
            shopError = error2 || error1;
          }
        }

        let shopId;
        
        if (!shops || shops.length === 0) {
          // 쇼핑몰이 없으면 생성
          console.log(`📝 ${item.url} 쇼핑몰이 없어 새로 생성합니다...`);
          
          const shopName = item.url.includes('11st') ? '11번가' :
                          item.url.includes('coupang') ? '쿠팡' :
                          item.url.includes('gmarket') ? '지마켓' : null;
          
          const { data: newShop, error: createError } = await supabase
            .from('shops')
            .insert({
              url: normalizedUrl,
              name: shopName,
              created_via: 'script'
            })
            .select('id, url, name')
            .single();
          
          if (createError) {
            console.error(`❌ ${item.url} 쇼핑몰 생성 오류:`, createError);
            continue;
          }
          
          shopId = newShop.id;
          console.log(`✅ ${item.url} 쇼핑몰 생성 완료 (ID: ${shopId})`);
        } else {
          const shop = shops[0];
          shopId = shop.parent_shop_id || shop.id;
          console.log(`✅ ${item.url} 쇼핑몰 찾음 (ID: ${shopId}, 이름: ${shop.name || '(없음)'})`);
        }

        // 2. 기존 사업자 등록 정보 확인
        const { data: existing, error: checkError } = await supabase
          .from('business_registrations')
          .select('id')
          .eq('shop_id', shopId)
          .single();

        if (checkError && checkError.code !== 'PGRST116') {
          console.error(`❌ ${item.url} 사업자 등록 정보 확인 오류:`, checkError);
          continue;
        }

        // 3. 사업자 등록 정보 추가 또는 업데이트
        const businessData = {
          shop_id: shopId,
          ...item.businessData,
          last_verified: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        if (existing) {
          // 업데이트
          const { error: updateError } = await supabase
            .from('business_registrations')
            .update(businessData)
            .eq('shop_id', shopId);

          if (updateError) {
            console.error(`❌ ${item.url} 사업자 등록 정보 업데이트 오류:`, updateError);
            continue;
          }

          console.log(`✅ ${item.url} 사업자 등록 정보 업데이트 완료 (shop_id: ${shopId})`);
        } else {
          // 추가
          const { error: insertError } = await supabase
            .from('business_registrations')
            .insert([businessData]);

          if (insertError) {
            console.error(`❌ ${item.url} 사업자 등록 정보 추가 오류:`, insertError);
            continue;
          }

          console.log(`✅ ${item.url} 사업자 등록 정보 추가 완료 (shop_id: ${shopId})`);
        }

        console.log(`   - 사업자등록번호: ${item.businessData.business_number}`);
        console.log(`   - 사업 상태: ${item.businessData.business_status}`);
        console.log(`   - 사업 유형: ${item.businessData.business_type}\n`);

      } catch (err) {
        console.error(`❌ ${item.url} 처리 중 오류:`, err.message);
        continue;
      }
    }

    console.log('✅ 사업자 등록 정보 추가 완료!');
    process.exit(0);

  } catch (error) {
    console.error('❌ 스크립트 실행 오류:', error);
    process.exit(1);
  }
}

// 스크립트 실행
addBusinessRegistrations();

