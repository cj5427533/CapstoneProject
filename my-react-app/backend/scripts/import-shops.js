/**
 * 쇼핑몰 URL 데이터베이스 삽입 스크립트
 * 
 * 사용법:
 * node scripts/import-shops.js
 * 
 * phishing_urls.txt와 safe_shops_urls_raw.txt 파일의 URL들을
 * shops 테이블에 삽입합니다.
 */

const fs = require('fs');
const path = require('path');
const supabase = require('../config/supabase');
const { normalizeUrl } = require('../utils/url');

// 쇼핑몰 이름 매핑 (도메인 -> 이름)
const shopNameMapping = {
  'coupang.com': '쿠팡',
  'gmarket.co.kr': '지마켓',
  'auction.co.kr': '옥션',
  '11st.co.kr': '11번가',
  'ssg.com': 'SSG',
  'lotteon.com': '롯데온',
  'interpark.com': '인터파크',
  'tmon.co.kr': '티몬',
  'wemakeprice.com': '위메프',
  'musinsa.com': '무신사',
  'yes24.com': '예스24',
  'aladin.co.kr': '알라딘',
  'costco.co.kr': '코스트코',
  'homeplus.co.kr': '홈플러스',
  'amazon.com': '아마존',
  'ebay.com': '이베이',
  'nike.com': '나이키',
  'adidas.com': '아디다스',
  'alibaba.com': '알리바바',
  'aliexpress.com': '알리익스프레스',
  // 추가 매핑이 필요한 경우 여기에 추가
  'sinjimoru.co.kr': '신지모루',
};

/**
 * URL에서 기본 이름 추출
 */
function extractDefaultNameFromUrl(url) {
  try {
    let cleanUrl = url;
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = 'https://' + cleanUrl;
    }
    
    const urlObj = new URL(cleanUrl);
    let hostname = urlObj.hostname.toLowerCase();
    
    // www. 제거
    hostname = hostname.replace(/^www\./, '');
    
    // 도메인에서 기본 이름 추출
    const parts = hostname.split('.');
    let defaultName = parts.length > 2 ? parts[0] : parts[0];
    
    // 특수 문자 제거 및 대문자 변환
    defaultName = defaultName
      .replace(/[_-]/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    
    if (defaultName.length < 2) {
      defaultName = hostname.split('.')[0];
    }
    
    return defaultName || hostname;
  } catch (error) {
    return url.split('/')[0].replace(/^www\./, '').split('.')[0] || url;
  }
}

/**
 * 정규화된 URL에서 도메인 추출
 */
function extractDomain(normalizedUrl) {
  try {
    // normalizedUrl은 프로토콜 없이 저장되므로 직접 사용
    const parts = normalizedUrl.split('/');
    return parts[0].toLowerCase();
  } catch (error) {
    return normalizedUrl;
  }
}

/**
 * 쇼핑몰 이름 결정
 */
function getShopName(normalizedUrl, isSafeShop = false) {
  const domain = extractDomain(normalizedUrl);
  
  // 매핑에 있는 경우
  if (shopNameMapping[domain]) {
    return shopNameMapping[domain];
  }
  
  // 안전한 쇼핑몰인 경우 URL에서 추출
  if (isSafeShop) {
    return extractDefaultNameFromUrl(normalizedUrl);
  }
  
  // 피싱 URL인 경우 null (나중에 웹 크롤링으로 가져올 수 있음)
  return null;
}

/**
 * 파일에서 URL 읽기
 */
function readUrlsFromFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#') && line.length > 0);
    return lines;
  } catch (error) {
    console.error(`파일 읽기 실패 (${filePath}):`, error.message);
    return [];
  }
}

/**
 * 쇼핑몰 삽입 (중복 체크)
 */
async function insertShop(normalizedUrl, name, createdVia = 'import') {
  try {
    // 이미 존재하는지 확인
    const { data: existingShop, error: searchError } = await supabase
      .from('shops')
      .select('id, url, name')
      .eq('url', normalizedUrl)
      .single();
    
    if (searchError && searchError.code !== 'PGRST116') {
      throw searchError;
    }
    
    if (existingShop) {
      // 이미 존재하는 경우 이름 업데이트 (이름이 없거나 더 나은 이름이 있는 경우)
      if (name && (!existingShop.name || existingShop.name.length < name.length)) {
        const { error: updateError } = await supabase
          .from('shops')
          .update({ name: name })
          .eq('id', existingShop.id);
        
        if (updateError) {
          console.error(`  ⚠️  이름 업데이트 실패: ${updateError.message}`);
        } else {
          console.log(`  ✅ 이름 업데이트: ${existingShop.name || '(없음)'} -> ${name}`);
        }
      }
      return { success: false, reason: 'already_exists', shop: existingShop };
    }
    
    // 새 쇼핑몰 삽입
    const { data: newShop, error: insertError } = await supabase
      .from('shops')
      .insert({
        url: normalizedUrl,
        name: name,
        created_via: createdVia
      })
      .select('id, url, name')
      .single();
    
    if (insertError) {
      throw insertError;
    }
    
    return { success: true, shop: newShop };
  } catch (error) {
    console.error(`  ❌ 삽입 실패: ${error.message}`);
    return { success: false, reason: 'error', error: error.message };
  }
}

/**
 * 메인 함수
 */
async function main() {
  console.log('=== 쇼핑몰 URL 데이터베이스 삽입 시작 ===\n');
  
  const projectRoot = path.resolve(__dirname, '../../..');
  const phishingFile = path.join(projectRoot, 'phishing_urls.txt');
  const safeShopsFile = path.join(projectRoot, 'safe_shops_urls_raw.txt');
  
  // 파일 존재 확인
  if (!fs.existsSync(phishingFile)) {
    console.error(`❌ 파일을 찾을 수 없습니다: ${phishingFile}`);
    process.exit(1);
  }
  
  if (!fs.existsSync(safeShopsFile)) {
    console.error(`❌ 파일을 찾을 수 없습니다: ${safeShopsFile}`);
    process.exit(1);
  }
  
  // URL 읽기
  const phishingUrls = readUrlsFromFile(phishingFile);
  const safeShopUrls = readUrlsFromFile(safeShopsFile);
  
  console.log(`📄 피싱 URL: ${phishingUrls.length}개`);
  console.log(`📄 안전한 쇼핑몰 URL: ${safeShopUrls.length}개\n`);
  
  let stats = {
    phishing: { total: 0, inserted: 0, skipped: 0, errors: 0 },
    safe: { total: 0, inserted: 0, skipped: 0, errors: 0 }
  };
  
  // 피싱 URL 처리
  console.log('🔴 피싱 URL 처리 중...');
  for (const url of phishingUrls) {
    stats.phishing.total++;
    const normalizedUrl = normalizeUrl(url);
    const name = getShopName(normalizedUrl, false);
    
    console.log(`\n[${stats.phishing.total}/${phishingUrls.length}] ${url}`);
    console.log(`  → 정규화: ${normalizedUrl}`);
    if (name) {
      console.log(`  → 이름: ${name}`);
    }
    
    const result = await insertShop(normalizedUrl, name, 'import_phishing');
    
    if (result.success) {
      stats.phishing.inserted++;
      console.log(`  ✅ 삽입 성공 (ID: ${result.shop.id})`);
    } else if (result.reason === 'already_exists') {
      stats.phishing.skipped++;
      console.log(`  ⏭️  이미 존재함 (ID: ${result.shop.id})`);
    } else {
      stats.phishing.errors++;
    }
    
    // API 레이트 리밋 방지를 위한 짧은 대기
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log('\n\n🟢 안전한 쇼핑몰 URL 처리 중...');
  for (const url of safeShopUrls) {
    stats.safe.total++;
    const normalizedUrl = normalizeUrl(url);
    const name = getShopName(normalizedUrl, true);
    
    console.log(`\n[${stats.safe.total}/${safeShopUrls.length}] ${url}`);
    console.log(`  → 정규화: ${normalizedUrl}`);
    console.log(`  → 이름: ${name || '(자동 추출 실패)'}`);
    
    const result = await insertShop(normalizedUrl, name, 'import_safe');
    
    if (result.success) {
      stats.safe.inserted++;
      console.log(`  ✅ 삽입 성공 (ID: ${result.shop.id})`);
    } else if (result.reason === 'already_exists') {
      stats.safe.skipped++;
      console.log(`  ⏭️  이미 존재함 (ID: ${result.shop.id})`);
    } else {
      stats.safe.errors++;
    }
    
    // API 레이트 리밋 방지를 위한 짧은 대기
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // 결과 요약
  console.log('\n\n=== 처리 완료 ===');
  console.log('\n📊 피싱 URL:');
  console.log(`  - 전체: ${stats.phishing.total}개`);
  console.log(`  - 삽입: ${stats.phishing.inserted}개`);
  console.log(`  - 건너뜀: ${stats.phishing.skipped}개`);
  console.log(`  - 오류: ${stats.phishing.errors}개`);
  
  console.log('\n📊 안전한 쇼핑몰:');
  console.log(`  - 전체: ${stats.safe.total}개`);
  console.log(`  - 삽입: ${stats.safe.inserted}개`);
  console.log(`  - 건너뜀: ${stats.safe.skipped}개`);
  console.log(`  - 오류: ${stats.safe.errors}개`);
  
  const totalInserted = stats.phishing.inserted + stats.safe.inserted;
  const totalSkipped = stats.phishing.skipped + stats.safe.skipped;
  const totalErrors = stats.phishing.errors + stats.safe.errors;
  
  console.log('\n📈 전체 요약:');
  console.log(`  - 삽입: ${totalInserted}개`);
  console.log(`  - 건너뜀: ${totalSkipped}개`);
  console.log(`  - 오류: ${totalErrors}개`);
  
  console.log('\n✅ 완료!\n');
}

// 스크립트 실행
main().catch(error => {
  console.error('\n❌ 스크립트 실행 중 오류 발생:', error);
  process.exit(1);
});

