/**
 * 우아한, 프로뉴트리션, 리필드 쇼핑몰 관련 커뮤니티 게시글 생성 스크립트
 * 
 * 사용법:
 * node scripts/create-shop-community-posts.js
 * 
 * 각 쇼핑몰마다 2~3개의 게시글을 생성합니다.
 */

const supabase = require('../config/supabase');

// 랜덤 날짜 생성 (최근 3개월)
function generateRandomDate() {
  const startDate = new Date('2024-11-01');
  const endDate = new Date('2025-01-31');
  const timeDiff = endDate.getTime() - startDate.getTime();
  const randomTime = Math.random() * timeDiff;
  const randomDate = new Date(startDate.getTime() + randomTime);
  return randomDate.toISOString();
}

// 우아한 쇼핑몰 관련 게시글
const wooahanPosts = [
  {
    title: '우아한 쇼핑몰에서 피해 본 경험 공유',
    content: '우아한 쇼핑몰에서 주문한 상품이 한 달이 넘도록 배송되지 않았어요. 고객센터에 문의했는데 답변이 없고, 결국 환불 신청을 했는데도 처리되지 않았습니다. 다른 분들도 주의하시기 바랍니다. 여기몰까에서 확인해보니 신뢰도 점수가 낮더라고요. 앞으로는 쇼핑 전에 꼭 확인하고 구매하겠습니다.'
  },
  {
    title: '우아한 쇼핑몰 주문 취소 불가능한 사례',
    content: '우아한 쇼핑몰에서 상품을 주문했는데, 주문 후 바로 취소를 요청했어요. 그런데 취소가 안 된다고 하더라고요. 이미 배송 준비 중이라고 하는데, 주문한 지 10분도 안 됐는데 말이죠. 결국 상품을 받았는데 사진과 완전히 달랐어요. 환불도 어렵고 정말 답답한 경험이었습니다. 여러분도 우아한 쇼핑몰 이용 시 주의하세요.'
  },
  {
    title: '우아한 쇼핑몰 배송 지연 및 연락 두절',
    content: '우아한 쇼핑몰에서 선물용으로 상품을 주문했는데, 배송 예정일이 지나도 오지 않았어요. 고객센터 전화는 통화 중이거나 받지 않고, 이메일 답변도 없었습니다. 결국 선물 시기를 놓쳤고, 한 달 후에야 상품이 도착했어요. 하지만 포장도 엉망이고 상품 상태도 좋지 않았습니다. 이런 쇼핑몰은 피하는 게 좋을 것 같아요.'
  }
];

// 프로뉴트리션 쇼핑몰 관련 게시글
const pronutritionPosts = [
  {
    title: '프로뉴트리션 쇼핑몰 환불 거부 사례',
    content: '프로뉴트리션에서 건강식품을 구매했는데, 상품 설명과 다르게 왔어요. 유통기한도 임박했고, 포장도 훼손되어 있었습니다. 환불을 요청했는데 "이미 개봉했다"는 이유로 거부당했어요. 하지만 저는 개봉하지 않았고, 배송 오자마자 그 상태였습니다. 증빙 사진도 보냈는데 무시당했어요. 정말 화가 나는 경험이었습니다.'
  },
  {
    title: '프로뉴트리션 쇼핑몰 가품 의심 사례',
    content: '프로뉴트리션에서 유명 브랜드 건강식품을 구매했는데, 정품인지 의심스러워요. 포장이 다르고, 맛과 질감도 평소 먹던 것과 달랐습니다. 고객센터에 문의했는데 "정품 맞다"고만 하고 구체적인 설명은 없었어요. 다른 쇼핑몰과 비교해보니 가격이 너무 저렴했던 것 같아요. 가품일 가능성이 높다고 생각합니다. 여러분도 프로뉴트리션에서 구매할 때는 신중하게 결정하세요.'
  },
  {
    title: '프로뉴트리션 쇼핑몰 배송 누락 및 책임 회피',
    content: '프로뉴트리션에서 여러 개의 상품을 주문했는데, 일부만 배송되었어요. 누락된 상품에 대해 문의했는데, 배송사 문제라고 하며 책임을 회피하더라고요. 배송 추적을 확인해보니 모든 상품이 배송 완료로 표시되어 있었어요. 결국 환불도 안 되고, 상품도 못 받았습니다. 이런 식으로 고객을 대하는 쇼핑몰은 신뢰할 수 없어요.'
  }
];

// 리필드 쇼핑몰 관련 게시글
const refilldPosts = [
  {
    title: '리필드 쇼핑몰 상품 불량 및 교환 거부',
    content: '리필드에서 주문한 상품이 도착했는데 불량품이었어요. 상품에 흠집이 있고, 일부 부품이 빠져있었습니다. 교환을 요청했는데 "배송 중 손상"이라고 하며 교환을 거부했어요. 하지만 포장은 멀쩡했고, 상품 자체의 문제였습니다. 사진을 보내도 인정하지 않고, 결국 환불도 어려웠어요. 정말 답답한 경험이었습니다.'
  },
  {
    title: '리필드 쇼핑몰 개인정보 유출 우려',
    content: '리필드 쇼핑몰에서 주문한 후, 이상한 광고 문자와 전화가 계속 와요. 다른 쇼핑몰에서는 이런 일이 없었는데, 리필드에서만 주문한 후부터 시작되었어요. 개인정보가 유출된 것 같아서 불안합니다. 고객센터에 문의했는데 명확한 답변을 받지 못했어요. 개인정보 보호가 제대로 되지 않는 쇼핑몰인 것 같습니다. 주의하시기 바랍니다.'
  },
  {
    title: '리필드 쇼핑몰 할인 가격 사기 의심',
    content: '리필드 쇼핑몰에서 대폭 할인된 상품을 구매했어요. 원래 가격의 50% 할인이라고 해서 구매했는데, 다른 쇼핑몰에서는 그게 정가더라고요. 할인 가격을 사기적으로 표시한 것 같아요. 주문 후 취소하려고 했는데 취소 수수료를 내야 한다고 하더라고요. 이런 가격 사기는 정말 화가 나요. 여러분도 리필드 쇼핑몰에서 구매할 때 가격을 꼼꼼히 비교해보세요.'
  }
];

// 사용자 ID 가져오기
async function getOrCreateUserIds(count) {
  const { data: existingUsers, error: fetchError } = await supabase
    .from('users')
    .select('id')
    .neq('email', 'anonymous@system.local')
    .limit(count);
  
  if (fetchError) {
    console.error('사용자 조회 오류:', fetchError);
    throw fetchError;
  }
  
  const userIds = existingUsers?.map(u => u.id) || [];
  
  if (userIds.length < count) {
    console.log(`⚠️  사용 가능한 사용자가 ${userIds.length}명입니다. (필요: ${count}명)`);
  }
  
  return userIds.slice(0, count);
}

// 게시글 생성
async function createPost(userId, title, content) {
  const createdAt = generateRandomDate();
  
  const { data: newPost, error } = await supabase
    .from('community_posts')
    .insert({
      user_id: userId,
      title: title,
      content: content,
      views: Math.floor(Math.random() * 150) + 10, // 10-159 랜덤 조회수
      likes: Math.floor(Math.random() * 25), // 0-24 랜덤 좋아요
      created_at: createdAt
    })
    .select('id')
    .single();
  
  if (error) {
    console.error(`  ❌ 게시글 생성 실패: ${error.message}`);
    return { success: false, error: error.message };
  }
  
  return { success: true, postId: newPost.id };
}

// 메인 함수
async function main() {
  console.log('=== 우아한, 프로뉴트리션, 리필드 쇼핑몰 관련 게시글 생성 시작 ===\n');
  
  // 사용자 ID 가져오기 (최소 9명 필요)
  let userIds;
  try {
    userIds = await getOrCreateUserIds(9);
    console.log(`✅ 사용 가능한 사용자 ID: ${userIds.length}개\n`);
  } catch (error) {
    console.error('❌ 사용자 ID를 가져올 수 없습니다:', error.message);
    process.exit(1);
  }
  
  if (userIds.length < 3) {
    console.error('❌ 최소 3명의 사용자가 필요합니다.');
    process.exit(1);
  }
  
  let stats = {
    total: 0,
    created: 0,
    errors: 0
  };
  
  const allPosts = [
    ...wooahanPosts.map(p => ({ ...p, shop: '우아한' })),
    ...pronutritionPosts.map(p => ({ ...p, shop: '프로뉴트리션' })),
    ...refilldPosts.map(p => ({ ...p, shop: '리필드' }))
  ];
  
  // 게시글 생성
  for (let i = 0; i < allPosts.length; i++) {
    const post = allPosts[i];
    const userId = userIds[Math.floor(Math.random() * userIds.length)];
    
    stats.total++;
    console.log(`[${i + 1}/${allPosts.length}] [${post.shop}] ${post.title}`);
    
    const result = await createPost(userId, post.title, post.content);
    
    if (result.success) {
      stats.created++;
      console.log(`  ✅ 게시글 생성 성공 (ID: ${result.postId})`);
    } else {
      stats.errors++;
    }
    
    // API 레이트 리밋 방지
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  // 결과 요약
  console.log('\n\n=== 처리 완료 ===');
  console.log(`📊 총 게시글: ${stats.total}개`);
  console.log(`  - 생성: ${stats.created}개`);
  console.log(`  - 오류: ${stats.errors}개`);
  console.log(`\n📝 쇼핑몰별 게시글 수:`);
  console.log(`  - 우아한: ${wooahanPosts.length}개`);
  console.log(`  - 프로뉴트리션: ${pronutritionPosts.length}개`);
  console.log(`  - 리필드: ${refilldPosts.length}개`);
  console.log('\n✅ 완료!\n');
}

// 스크립트 실행
main().catch(error => {
  console.error('\n❌ 스크립트 실행 중 오류 발생:', error);
  process.exit(1);
});

