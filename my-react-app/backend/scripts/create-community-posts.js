/**
 * 커뮤니티 게시글 및 댓글 생성 스크립트
 * 
 * 사용법:
 * node scripts/create-community-posts.js
 * 
 * DB에 존재하는 쇼핑몰 관련 글과 피싱 사이트 신종 수법 공유 글을 생성합니다.
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

// 10월~11월 사이의 랜덤 날짜 생성
function generateRandomDate() {
  const startDate = new Date('2024-10-01');
  const endDate = new Date('2024-11-30');
  const timeDiff = endDate.getTime() - startDate.getTime();
  const randomTime = Math.random() * timeDiff;
  const randomDate = new Date(startDate.getTime() + randomTime);
  return randomDate.toISOString();
}

// 쇼핑몰 관련 게시글 템플릿
const shopRelatedPosts = [
  {
    title: '쿠팡에서 구매한 상품 후기',
    content: '쿠팡에서 최근에 구매한 상품이 정말 만족스럽네요. 배송도 빠르고 포장도 깔끔했습니다. 특히 로켓배송 덕분에 당일 배송이 가능해서 좋았어요. 다른 분들도 안심하고 이용하셔도 될 것 같습니다.'
  },
  {
    title: '11번가 쇼핑 경험 공유',
    content: '11번가에서 여러 번 구매했는데 항상 만족스럽습니다. 가격도 합리적이고 할인 혜택도 많아서 자주 이용하고 있어요. 특히 이벤트 기간에 구매하면 더욱 저렴하게 살 수 있어서 좋습니다.'
  },
  {
    title: '지마켓에서 피해 본 경험',
    content: '지마켓에서 구매한 상품이 사진과 달랐어요. 환불 신청했는데 처리까지 시간이 오래 걸렸습니다. 그래도 결국 환불은 받았지만, 처음부터 정확한 상품 설명이 있었으면 좋았을 것 같아요.'
  },
  {
    title: 'SSG에서 구매한 식품 후기',
    content: 'SSG에서 신선식품을 주문했는데 정말 신선하게 도착했어요. 포장도 잘 되어있고 냉장 배송도 제대로 되어서 만족합니다. 다음에도 계속 이용할 예정입니다.'
  },
  {
    title: '롯데온 쇼핑몰 추천',
    content: '롯데온에서 여러 번 구매했는데 배송이 빠르고 상품 품질도 좋아요. 특히 회원 등급에 따라 할인 혜택이 달라지는 시스템이 마음에 듭니다. 안전한 쇼핑몰이라고 생각해요.'
  },
  {
    title: '인터파크 티켓 구매 후기',
    content: '인터파크에서 콘서트 티켓을 구매했는데 정말 빠르게 배송되었어요. 티켓도 정품이고 문제없이 입장했습니다. 다음에도 인터파크를 이용할 예정입니다.'
  },
  {
    title: '무신사에서 옷 구매한 경험',
    content: '무신사에서 옷을 여러 벌 구매했는데 사이즈가 정확하고 품질도 좋았어요. 특히 리뷰가 많아서 구매 결정에 도움이 되었습니다. 배송도 빠르고 포장도 깔끔했어요.'
  },
  {
    title: '예스24에서 책 구매 후기',
    content: '예스24에서 책을 주문했는데 빠르게 배송되었어요. 책 상태도 좋고 포장도 잘 되어있었습니다. 특히 할인 혜택이 많아서 자주 이용하고 있어요.'
  },
  {
    title: '알라딘 중고서적 구매 경험',
    content: '알라딘에서 중고서적을 구매했는데 상태가 정말 좋았어요. 설명과 일치하고 가격도 합리적이었습니다. 다음에도 중고서적은 알라딘에서 구매할 예정입니다.'
  },
  {
    title: '코스트코 온라인 쇼핑 후기',
    content: '코스트코 온라인에서 대량 구매했는데 정말 만족스러웠어요. 가격도 저렴하고 상품 품질도 우수합니다. 특히 식품류가 신선하고 맛있어서 자주 주문하고 있어요.'
  }
];

// 피싱 사이트 신종 수법 공유 게시글 템플릿
const phishingPosts = [
  {
    title: '최근 유행하는 피싱 사이트 수법 주의하세요',
    content: '최근에 유명 쇼핑몰을 사칭하는 피싱 사이트가 많이 발견되고 있어요. URL이 비슷하지만 조금 다르게 만들어져 있어서 주의가 필요합니다. 예를 들어 "coupang" 대신 "coupang-shop" 같은 식으로요. 항상 URL을 꼼꼼히 확인하시기 바랍니다.'
  },
  {
    title: '카카오톡으로 온 쇼핑몰 링크 조심하세요',
    content: '카카오톡으로 온 쇼핑몰 할인 링크를 클릭했다가 피싱 사이트로 연결된 경험이 있어요. 너무 좋은 할인 혜택은 의심해봐야 합니다. 특히 개인정보나 결제 정보를 요구하는 사이트는 절대 이용하지 마세요.'
  },
  {
    title: '이메일로 온 주문 확인서 피싱 주의',
    content: '최근에 이메일로 온 주문 확인서를 클릭했다가 피싱 사이트로 연결된 적이 있어요. 이메일의 링크를 클릭하기 전에 항상 발신자를 확인하고, 의심스러우면 직접 쇼핑몰 사이트에 접속해서 확인하세요.'
  },
  {
    title: 'SNS 광고 링크 조심하세요',
    content: 'SNS에 올라온 쇼핑몰 광고 링크를 클릭했다가 피싱 사이트로 연결된 경험이 있어요. 특히 인스타그램이나 페이스북 광고는 주의가 필요합니다. 항상 공식 쇼핑몰 사이트로 직접 접속하는 것이 안전합니다.'
  },
  {
    title: '가짜 배송 알림 문자 주의',
    content: '최근에 가짜 배송 알림 문자가 많이 발송되고 있어요. 링크를 클릭하면 피싱 사이트로 연결됩니다. 배송 조회는 항상 공식 배송사 사이트나 쇼핑몰 사이트에서 직접 확인하세요.'
  },
  {
    title: '할인 쿠폰 사칭 피싱 사이트',
    content: '유명 쇼핑몰의 할인 쿠폰을 사칭하는 피싱 사이트가 발견되었어요. 쿠폰을 받기 위해 개인정보를 입력하라고 하는데, 실제로는 피싱 사이트입니다. 할인 쿠폰은 항상 공식 쇼핑몰에서만 받으세요.'
  },
  {
    title: '가짜 고객센터 전화 주의',
    content: '최근에 가짜 고객센터에서 전화가 와서 개인정보를 요구하는 사기 전화가 늘고 있어요. 실제 쇼핑몰 고객센터는 먼저 개인정보를 요구하지 않습니다. 의심스러운 전화는 바로 끊고 공식 고객센터로 직접 문의하세요.'
  },
  {
    title: '모바일 앱 사칭 피싱',
    content: '유명 쇼핑몰 앱을 사칭하는 가짜 앱이 발견되었어요. 앱스토어가 아닌 다른 곳에서 다운로드하는 앱은 절대 설치하지 마세요. 항상 공식 앱스토어에서만 다운로드하시기 바랍니다.'
  },
  {
    title: '피싱 사이트 판별 방법',
    content: '피싱 사이트를 판별하는 방법을 공유합니다. 1) URL을 꼼꼼히 확인하세요. 2) HTTPS 인증서를 확인하세요. 3) 너무 좋은 할인 혜택은 의심하세요. 4) 개인정보를 요구하는 사이트는 피하세요. 5) 여기몰까에서 쇼핑몰을 검색해서 확인하세요.'
  },
  {
    title: '최신 피싱 수법 정리',
    content: '최근에 발견된 피싱 수법들을 정리했습니다. 1) 유명 쇼핑몰 사칭 2) 할인 쿠폰 사칭 3) 배송 알림 문자 사칭 4) 고객센터 전화 사칭 5) SNS 광고 링크 등이 있습니다. 항상 주의하시고 의심스러우면 여기몰까에서 확인하세요.'
  }
];

// 댓글 템플릿
const commentTemplates = [
  '좋은 정보 감사합니다!',
  '저도 비슷한 경험이 있어요.',
  '정말 도움이 되었어요.',
  '다음에 주의하겠습니다.',
  '좋은 글 감사합니다.',
  '저도 확인해봐야겠어요.',
  '유용한 정보네요.',
  '공유해주셔서 감사합니다.',
  '저도 같은 생각이에요.',
  '도움이 많이 되었습니다.',
  '좋은 경험 공유 감사합니다.',
  '다른 분들도 참고하시면 좋을 것 같아요.',
  '정말 중요한 정보네요.',
  '저도 주의하겠습니다.',
  '좋은 팁 감사합니다.'
];

// 사용자 ID 가져오기 또는 생성
async function getOrCreateUserIds(count) {
  // 기존 사용자 조회
  const { data: existingUsers, error: fetchError } = await supabase
    .from('users')
    .select('id')
    .neq('email', 'anonymous@system.local')
    .neq('status', 'anonymous')
    .limit(count);
  
  if (fetchError) {
    console.error('사용자 조회 오류:', fetchError);
    throw fetchError;
  }
  
  const userIds = existingUsers?.map(u => u.id) || [];
  
  // 부족한 만큼 사용자 생성
  if (userIds.length < count) {
    const needed = count - userIds.length;
    console.log(`기존 사용자 ${userIds.length}명, ${needed}명 추가 생성 필요`);
    
    for (let i = 0; i < needed; i++) {
      const username = generateRandomId();
      const email = `${username}@example.com`;
      const phone = `010-${String(Math.floor(Math.random() * 9000) + 1000)}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
      
      // 간단한 비밀번호 해시 (실제로는 bcrypt 사용해야 함)
      const password = 'hashed_password_' + Math.random().toString(36).substring(7);
      
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          username: username,
          email: email,
          password: password,
          phone_number: phone,
          status: 'active'
        })
        .select('id')
        .single();
      
      if (createError) {
        console.error(`사용자 생성 오류 (${i + 1}/${needed}):`, createError);
        continue;
      }
      
      if (newUser) {
        userIds.push(newUser.id);
      }
      
      // API 레이트 리밋 방지
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
  
  return userIds.slice(0, count);
}

// 게시글 생성
async function createPost(userId, title, content, customDate = null) {
  const createdAt = customDate || generateRandomDate();
  
  const { data: newPost, error } = await supabase
    .from('community_posts')
    .insert({
      user_id: userId,
      title: title,
      content: content,
      views: Math.floor(Math.random() * 100) + 1, // 1-100 랜덤 조회수
      likes: Math.floor(Math.random() * 20), // 0-19 랜덤 좋아요
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

// 댓글 생성
async function createComment(postId, userId, content, customDate = null) {
  const createdAt = customDate || generateRandomDate();
  
  const { data: newComment, error } = await supabase
    .from('community_comments')
    .insert({
      post_id: postId,
      user_id: userId,
      content: content,
      created_at: createdAt
    })
    .select('id')
    .single();
  
  if (error) {
    console.error(`  ❌ 댓글 생성 실패: ${error.message}`);
    return { success: false, error: error.message };
  }
  
  return { success: true, commentId: newComment.id };
}

// 메인 함수
async function main() {
  console.log('=== 커뮤니티 게시글 및 댓글 생성 시작 ===\n');
  
  // 사용자 ID 가져오기 (최소 30명 필요: 게시글 20개 + 댓글 여러 개)
  let userIds;
  try {
    userIds = await getOrCreateUserIds(30);
    console.log(`✅ 사용 가능한 사용자 ID: ${userIds.length}개\n`);
  } catch (error) {
    console.error('❌ 사용자 ID를 가져올 수 없습니다:', error.message);
    process.exit(1);
  }
  
  if (userIds.length < 5) {
    console.error('❌ 최소 5명의 사용자가 필요합니다.');
    process.exit(1);
  }
  
  let stats = {
    posts: { total: 0, created: 0, errors: 0 },
    comments: { total: 0, created: 0, errors: 0 }
  };
  
  const allPosts = [...shopRelatedPosts, ...phishingPosts];
  const selectedPosts = allPosts.slice(0, 20); // 20개 선택
  
  // 게시글 생성
  for (let i = 0; i < selectedPosts.length; i++) {
    const post = selectedPosts[i];
    const userId = userIds[Math.floor(Math.random() * userIds.length)];
    
    stats.posts.total++;
    console.log(`[${i + 1}/${selectedPosts.length}] ${post.title}`);
    
    const result = await createPost(userId, post.title, post.content);
    
    if (result.success) {
      stats.posts.created++;
      console.log(`  ✅ 게시글 생성 성공 (ID: ${result.postId})`);
      
      // 댓글 생성 (1-3개)
      const commentCount = Math.floor(Math.random() * 3) + 1;
      console.log(`  → 댓글 생성 예정: ${commentCount}개`);
      
      for (let j = 0; j < commentCount; j++) {
        stats.comments.total++;
        const commentUserId = userIds[Math.floor(Math.random() * userIds.length)];
        const commentContent = commentTemplates[Math.floor(Math.random() * commentTemplates.length)];
        
        const commentResult = await createComment(result.postId, commentUserId, commentContent);
        
        if (commentResult.success) {
          stats.comments.created++;
          console.log(`    ✅ 댓글 생성 성공 (ID: ${commentResult.commentId})`);
        } else {
          stats.comments.errors++;
        }
        
        // API 레이트 리밋 방지
        await new Promise(resolve => setTimeout(resolve, 150));
      }
    } else {
      stats.posts.errors++;
    }
    
    // API 레이트 리밋 방지
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  // 결과 요약
  console.log('\n\n=== 처리 완료 ===');
  console.log(`📊 게시글: ${stats.posts.total}개`);
  console.log(`  - 생성: ${stats.posts.created}개`);
  console.log(`  - 오류: ${stats.posts.errors}개`);
  console.log(`\n📊 댓글: ${stats.comments.total}개`);
  console.log(`  - 생성: ${stats.comments.created}개`);
  console.log(`  - 오류: ${stats.comments.errors}개`);
  console.log('\n✅ 완료!\n');
}

// 스크립트 실행
main().catch(error => {
  console.error('\n❌ 스크립트 실행 중 오류 발생:', error);
  process.exit(1);
});

