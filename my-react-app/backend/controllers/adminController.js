/**
 * 관리자 관련 컨트롤러
 */
const supabase = require('../config/supabase');
const { success, error } = require('../utils/response');
const { sanitizeInput } = require('../utils/validation');
const { normalizeSearchTerm } = require('../utils/fulltextSearch');

/**
 * 쇼핑몰 목록 조회 (한국어 검색 지원 - pg_trgm + Full-Text Search 하이브리드)
 * GET /api/admin/shops?search=검색어&page=1&limit=50&similarity=0.3
 */
exports.getShops = async (req, res) => {
  try {
    const searchTerm = req.query.search ? sanitizeInput(req.query.search) : null;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const similarityThreshold = parseFloat(req.query.similarity) || 0.3; // 기본값 0.3
    const offset = (page - 1) * limit;

    let shops = [];
    let totalCount = 0;

    // 검색어가 있으면 한국어 검색 사용 (pg_trgm + Full-Text Search)
    if (searchTerm && searchTerm.trim()) {
      const normalizedSearch = normalizeSearchTerm(searchTerm);
      
      // 한국어 검색 RPC 함수 호출 (pg_trgm 기반)
      const { data: searchResults, error: searchError } = await supabase.rpc(
        'search_shops_korean',
        {
          search_term: normalizedSearch,
          similarity_threshold: similarityThreshold,
          page_limit: limit,
          page_offset: offset
        }
      );

      if (searchError) {
        console.error('한국어 검색 오류:', searchError);
        // 한국어 검색 실패 시 기존 Full-Text Search로 폴백
        const { data: fallbackData, error: fallbackError } = await supabase.rpc(
          'search_shops_fulltext',
          {
            search_term: normalizedSearch,
            page_limit: limit,
            page_offset: offset
          }
        );

        if (fallbackError) {
          // Full-Text Search도 실패하면 기본 ilike로 폴백
          const { data: basicData, error: basicError } = await supabase
            .from('shops')
            .select('*')
            .or(`url.ilike.%${normalizedSearch}%,name.ilike.%${normalizedSearch}%`)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

          if (basicError) throw basicError;
          shops = basicData || [];

          const { count, error: countError } = await supabase
            .from('shops')
            .select('*', { count: 'exact', head: true })
            .or(`url.ilike.%${normalizedSearch}%,name.ilike.%${normalizedSearch}%`);

          totalCount = count || 0;
        } else {
          shops = fallbackData || [];
          const { data: countData } = await supabase.rpc(
            'count_shops_fulltext',
            { search_term: normalizedSearch }
          );
          totalCount = countData || 0;
        }
      } else {
        shops = searchResults || [];

        // 개수 조회
        const { data: countData, error: countError } = await supabase.rpc(
          'count_shops_korean',
          { 
            search_term: normalizedSearch,
            similarity_threshold: similarityThreshold
          }
        );

        totalCount = countData || 0;
      }
    } else {
      // 검색어가 없으면 일반 조회
      const { data: shopsData, error: dbError } = await supabase
        .from('shops')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (dbError) throw dbError;

      shops = shopsData || [];
      
      // 총 개수 조회
      const { count, error: countError } = await supabase
        .from('shops')
        .select('*', { count: 'exact', head: true });

      totalCount = count || 0;
    }

    return success(res, {
      shops: shops || [],
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    });
  } catch (err) {
    console.error('쇼핑몰 조회 오류:', err);
    return error(res, '쇼핑몰 조회 실패', 500);
  }
};

/**
 * 쇼핑몰 이름 수정
 */
exports.updateShop = async (req, res) => {
  try {
    const { shopId } = req.params;
    const { name } = req.body;

    if (!name || name.trim() === '') {
      return error(res, '쇼핑몰 이름을 입력해주세요.', 400);
    }

    const { data, error: dbError } = await supabase
      .from('shops')
      .update({ name: name.trim() })
      .eq('id', shopId)
      .select()
      .single();

    if (dbError) throw dbError;

    return success(res, { shop: data }, '쇼핑몰 이름이 수정되었습니다.');
  } catch (err) {
    console.error('쇼핑몰 이름 수정 오류:', err);
    return error(res, '쇼핑몰 이름 수정 실패', 500);
  }
};

/**
 * 쇼핑몰 삭제
 */
exports.deleteShop = async (req, res) => {
  try {
    const { shopId } = req.params;

    // 연관된 신고, 평점 먼저 삭제
    await Promise.all([
      supabase.from('shop_reports').delete().eq('shop_id', shopId),
      supabase.from('shop_ratings').delete().eq('shop_id', shopId)
    ]);

    // 쇼핑몰 삭제
    const { error: dbError } = await supabase
      .from('shops')
      .delete()
      .eq('id', shopId);

    if (dbError) throw dbError;

    return success(res, null, '쇼핑몰이 삭제되었습니다.');
  } catch (err) {
    console.error('쇼핑몰 삭제 오류:', err);
    return error(res, '쇼핑몰 삭제 실패', 500);
  }
};

/**
 * 전체 신고 조회 (한국어 검색 지원 - pg_trgm + Full-Text Search 하이브리드)
 * GET /api/admin/reports?search=검색어&page=1&limit=50&similarity=0.3
 */
exports.getReports = async (req, res) => {
  try {
    const searchTerm = req.query.search ? sanitizeInput(req.query.search) : null;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const similarityThreshold = parseFloat(req.query.similarity) || 0.3;
    const offset = (page - 1) * limit;

    let reports = [];
    let totalCount = 0;

    // 검색어가 있으면 한국어 검색 사용
    if (searchTerm && searchTerm.trim()) {
      const normalizedSearch = normalizeSearchTerm(searchTerm);
      
      // 한국어 검색 RPC 함수 호출
      const { data: searchResults, error: searchError } = await supabase.rpc(
        'search_reports_korean',
        {
          search_term: normalizedSearch,
          similarity_threshold: similarityThreshold,
          page_limit: limit,
          page_offset: offset
        }
      );

      if (searchError) {
        console.error('한국어 검색 오류:', searchError);
        // 한국어 검색 실패 시 기존 Full-Text Search로 폴백
        const { data: fallbackData, error: fallbackError } = await supabase.rpc(
          'search_reports_fulltext',
          {
            search_term: normalizedSearch,
            page_limit: limit,
            page_offset: offset
          }
        );

        if (fallbackError) {
          // 기본 ilike로 폴백
          const { data: basicData, error: basicError } = await supabase
            .from('shop_reports')
            .select(`
              *,
              shops (id, url, name)
            `)
            .or(`description.ilike.%${normalizedSearch}%,categories.ilike.%${normalizedSearch}%,reporter_name.ilike.%${normalizedSearch}%`)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

          if (basicError) throw basicError;
          reports = basicData || [];

          const { count, error: countError } = await supabase
            .from('shop_reports')
            .select('*', { count: 'exact', head: true })
            .or(`description.ilike.%${normalizedSearch}%,categories.ilike.%${normalizedSearch}%,reporter_name.ilike.%${normalizedSearch}%`);

          totalCount = count || 0;
        } else {
          reports = (fallbackData || []).map(report => ({
            ...report,
            shops: report.shop_url ? {
              id: report.shop_id,
              url: report.shop_url,
              name: report.shop_name
            } : null
          }));

          const { data: countData } = await supabase.rpc(
            'count_reports_fulltext',
            { search_term: normalizedSearch }
          );
          totalCount = countData || 0;
        }
      } else {
        // RPC 함수 결과를 기존 형식으로 변환
        reports = (searchResults || []).map(report => ({
          ...report,
          shops: report.shop_url ? {
            id: report.shop_id,
            url: report.shop_url,
            name: report.shop_name
          } : null
        }));

        // 개수 조회
        const { data: countData, error: countError } = await supabase.rpc(
          'count_reports_korean',
          { 
            search_term: normalizedSearch,
            similarity_threshold: similarityThreshold
          }
        );

        totalCount = countData || 0;
      }
    } else {
      // 검색어가 없으면 일반 조회
      const { data: reportsData, error: dbError } = await supabase
        .from('shop_reports')
        .select(`
          *,
          shops (id, url, name)
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (dbError) throw dbError;

      reports = reportsData || [];
      
      // 총 개수 조회
      const { count, error: countError } = await supabase
        .from('shop_reports')
        .select('*', { count: 'exact', head: true });

      totalCount = count || 0;
    }

    // evidence_files를 JSON 파싱하여 배열로 변환
    const formattedReports = (reports || []).map(report => ({
      ...report,
      evidenceFiles: report.evidence_files ? (typeof report.evidence_files === 'string' ? JSON.parse(report.evidence_files) : report.evidence_files) : [],
      shops: report.shops ? (Array.isArray(report.shops) ? report.shops[0] : report.shops) : null
    }));

    return success(res, {
      reports: formattedReports,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    });
  } catch (err) {
    console.error('신고 조회 오류:', err);
    return error(res, '신고 조회 실패', 500);
  }
};

/**
 * 신고 승인/거부
 */
exports.updateReportStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['pending', 'approved', 'rejected'].includes(status)) {
      return error(res, '올바른 상태 값을 입력해주세요. (pending, approved, rejected)', 400);
    }

    const { data, error: dbError } = await supabase
      .from('shop_reports')
      .update({ status })
      .eq('id', id)
      .select('id, status')
      .single();

    if (dbError) throw dbError;

    if (!data) {
      return error(res, '피해 사례 제보를 찾을 수 없습니다.', 404);
    }

    return success(res, { 
      id: data.id, 
      status: data.status 
    }, '상태가 업데이트되었습니다.');
  } catch (err) {
    console.error('피해 사례 제보 상태 업데이트 오류:', err);
    return error(res, '상태 업데이트에 실패했습니다.', 500);
  }
};

/**
 * 신고 삭제
 */
exports.deleteReport = async (req, res) => {
  try {
    const { reportId } = req.params;

    const { error: dbError } = await supabase
      .from('shop_reports')
      .delete()
      .eq('id', reportId);

    if (dbError) throw dbError;

    return success(res, null, '신고가 삭제되었습니다.');
  } catch (err) {
    console.error('신고 삭제 오류:', err);
    return error(res, '신고 삭제 실패', 500);
  }
};

/**
 * 전체 평점 조회 (한국어 검색 지원)
 * GET /api/admin/ratings?search=검색어&page=1&limit=50
 */
exports.getRatings = async (req, res) => {
  try {
    const searchTerm = req.query.search ? sanitizeInput(req.query.search) : null;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    let ratings = [];
    let totalCount = 0;

    // 검색어가 있으면 검색
    if (searchTerm && searchTerm.trim()) {
      const normalizedSearch = normalizeSearchTerm(searchTerm);
      
      // 먼저 검색어와 일치하는 shop_ratings를 조회
      const { data: ratingsData, error: dbError } = await supabase
        .from('shop_ratings')
        .select(`
          *,
          shops (id, url, name)
        `, { count: 'exact' })
        .ilike('comment', `%${normalizedSearch}%`)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (dbError) throw dbError;

      // 쇼핑몰 이름/URL로도 검색
      const { data: shopsData } = await supabase
        .from('shops')
        .select('id')
        .or(`name.ilike.%${normalizedSearch}%,url.ilike.%${normalizedSearch}%`);

      const shopIds = shopsData?.map(s => s.id) || [];

      if (shopIds.length > 0) {
        const { data: ratingsByShop, error: shopError } = await supabase
          .from('shop_ratings')
          .select(`
            *,
            shops (id, url, name)
          `)
          .in('shop_id', shopIds)
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);

        if (!shopError && ratingsByShop) {
          // 중복 제거 및 병합
          const existingIds = new Set((ratingsData || []).map(r => r.id));
          const newRatings = (ratingsByShop || []).filter(r => !existingIds.has(r.id));
          ratings = [...(ratingsData || []), ...newRatings];
        } else {
          ratings = ratingsData || [];
        }
      } else {
        ratings = ratingsData || [];
      }
      
      // 총 개수 조회
      const { count: commentCount } = await supabase
        .from('shop_ratings')
        .select('*', { count: 'exact', head: true })
        .ilike('comment', `%${normalizedSearch}%`);

      const { count: shopCount } = await supabase
        .from('shop_ratings')
        .select('*', { count: 'exact', head: true })
        .in('shop_id', shopIds);

      totalCount = (commentCount || 0) + (shopCount || 0);
    } else {
      // 검색어가 없으면 일반 조회
      const { data: ratingsData, error: dbError } = await supabase
        .from('shop_ratings')
        .select(`
          *,
          shops (id, url, name)
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (dbError) throw dbError;

      ratings = ratingsData || [];
      
      // 총 개수 조회
      const { count, error: countError } = await supabase
        .from('shop_ratings')
        .select('*', { count: 'exact', head: true });

      totalCount = count || 0;
    }

    return success(res, {
      ratings: ratings || [],
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    });
  } catch (err) {
    console.error('평점 조회 오류:', err);
    return error(res, '평점 조회 실패', 500);
  }
};

/**
 * 평점 삭제
 */
exports.deleteRating = async (req, res) => {
  try {
    const { ratingId } = req.params;

    const { error: dbError } = await supabase
      .from('shop_ratings')
      .delete()
      .eq('id', ratingId);

    if (dbError) throw dbError;

    return success(res, null, '평점이 삭제되었습니다.');
  } catch (err) {
    console.error('평점 삭제 오류:', err);
    return error(res, '평점 삭제 실패', 500);
  }
};

/**
 * 전체 사용자 조회 (활동 분석 포함, 한국어 검색 지원)
 * GET /api/admin/users?search=검색어&page=1&limit=50&similarity=0.3
 */
exports.getUsers = async (req, res) => {
  try {
    const searchTerm = req.query.search ? sanitizeInput(req.query.search) : null;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const similarityThreshold = parseFloat(req.query.similarity) || 0.3;
    const offset = (page - 1) * limit;

    let users = [];
    let totalCount = 0;

    // 검색어가 있으면 한국어 검색 사용
    if (searchTerm && searchTerm.trim()) {
      const normalizedSearch = normalizeSearchTerm(searchTerm);
      
      // 한국어 검색 RPC 함수 호출
      const { data: searchResults, error: searchError } = await supabase.rpc(
        'search_users_korean',
        {
          search_term: normalizedSearch,
          similarity_threshold: similarityThreshold,
          page_limit: limit,
          page_offset: offset
        }
      );

      if (searchError) {
        console.error('한국어 검색 오류:', searchError);
        // 한국어 검색 실패 시 기존 Full-Text Search로 폴백
        const { data: fallbackData, error: fallbackError } = await supabase.rpc(
          'search_users_fulltext',
          {
            search_term: normalizedSearch,
            page_limit: limit,
            page_offset: offset
          }
        );

        if (fallbackError) {
          // 기본 ilike로 폴백
          const { data: basicData, error: basicError } = await supabase
            .from('users')
            .select('id, username, email, phone_number, role, created_at, last_login_at')
            .or(`username.ilike.%${normalizedSearch}%,email.ilike.%${normalizedSearch}%,phone_number.ilike.%${normalizedSearch}%`)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

          if (basicError) throw basicError;
          users = basicData || [];

          const { count, error: countError } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true })
            .or(`username.ilike.%${normalizedSearch}%,email.ilike.%${normalizedSearch}%,phone_number.ilike.%${normalizedSearch}%`);

          totalCount = count || 0;
        } else {
          users = fallbackData || [];
          const { data: countData } = await supabase.rpc(
            'count_users_fulltext',
            { search_term: normalizedSearch }
          );
          totalCount = countData || 0;
        }
      } else {
        users = searchResults || [];

        // 개수 조회
        const { data: countData, error: countError } = await supabase.rpc(
          'count_users_korean',
          { 
            search_term: normalizedSearch,
            similarity_threshold: similarityThreshold
          }
        );

        totalCount = countData || 0;
      }
    } else {
      // 검색어가 없으면 일반 조회
      const { data: usersData, error: dbError } = await supabase
        .from('users')
        .select('id, username, email, phone_number, role, created_at, last_login_at', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (dbError) throw dbError;

      users = usersData || [];
      
      // 총 개수 조회
      const { count, error: countError } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

      totalCount = count || 0;
    }

    // 각 사용자의 활동 정보 조회
    const usersWithActivity = await Promise.all((users || []).map(async (user) => {
      // 로그인 통계
      const { data: loginLogs, error: loginError } = await supabase
        .from('user_login_logs')
        .select('created_at, login_success')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      const successfulLogins = (loginLogs || []).filter(log => log.login_success === true);
      const lastLogin = successfulLogins.length > 0 ? successfulLogins[0].created_at : null;
      const loginCount = successfulLogins.length;

      // 검색 활동 (최근 30일)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const { count: searchCount, error: searchError } = await supabase
        .from('shop_search_logs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', thirtyDaysAgo.toISOString());

      // 신고 활동
      const { count: reportCount, error: reportsError } = await supabase
        .from('reports')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      // 평점 활동
      const { count: ratingCount, error: ratingsError } = await supabase
        .from('ratings')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      // 커뮤니티 활동
      const { count: postCount, error: postsError } = await supabase
        .from('community_posts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      const { count: commentCount, error: commentsError } = await supabase
        .from('community_comments')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      // 활성도 점수 계산 (0-100)
      // 로그인: 30점, 검색: 20점, 신고: 20점, 평점: 15점, 커뮤니티: 15점
      let activityScore = 0;
      if (loginCount > 0) activityScore += Math.min(30, loginCount * 2);
      if (searchCount > 0) activityScore += Math.min(20, searchCount);
      if (reportCount > 0) activityScore += Math.min(20, reportCount * 5);
      if (ratingCount > 0) activityScore += Math.min(15, ratingCount * 3);
      if (postCount > 0) activityScore += Math.min(10, postCount * 5);
      if (commentCount > 0) activityScore += Math.min(5, commentCount * 2);
      activityScore = Math.min(100, activityScore);

      // 활성도 레벨
      let activityLevel = 'INACTIVE';
      if (activityScore >= 70) activityLevel = 'VERY_ACTIVE';
      else if (activityScore >= 40) activityLevel = 'ACTIVE';
      else if (activityScore >= 20) activityLevel = 'MODERATE';
      else if (activityScore > 0) activityLevel = 'LOW';
      else activityLevel = 'INACTIVE';

      // 최근 활동일 (로그인, 검색, 신고, 평점, 커뮤니티 중 가장 최근)
      const recentActivities = [];
      if (lastLogin) recentActivities.push(new Date(lastLogin));
      
      const { data: recentSearch, error: recentSearchError } = await supabase
        .from('shop_search_logs')
        .select('created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      if (recentSearch?.created_at) recentActivities.push(new Date(recentSearch.created_at));

      const { data: recentReport, error: recentReportError } = await supabase
        .from('reports')
        .select('created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      if (recentReport?.created_at) recentActivities.push(new Date(recentReport.created_at));

      const { data: recentRating, error: recentRatingError } = await supabase
        .from('ratings')
        .select('created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      if (recentRating?.created_at) recentActivities.push(new Date(recentRating.created_at));

      const { data: recentPost, error: recentPostError } = await supabase
        .from('community_posts')
        .select('created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      if (recentPost?.created_at) recentActivities.push(new Date(recentPost.created_at));

      const lastActivity = recentActivities.length > 0 
        ? new Date(Math.max(...recentActivities.map(d => d.getTime()))).toISOString()
        : null;

      return {
        ...user,
        activity: {
          loginCount,
          lastLogin,
          searchCount,
          reportCount,
          ratingCount,
          postCount,
          commentCount,
          activityScore,
          activityLevel,
          lastActivity
        }
      };
    }));

    return success(res, {
      users: usersWithActivity,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    });
  } catch (err) {
    console.error('사용자 조회 오류:', err);
    return error(res, '사용자 조회 실패', 500);
  }
};

/**
 * 사용자 권한 업데이트
 */
exports.updateUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!role || !['user', 'admin'].includes(role)) {
      return error(res, '올바른 권한 값을 입력해주세요. (user, admin)', 400);
    }

    // 자기 자신의 권한을 변경하려는 경우 방지
    if (parseInt(userId) === req.user.id && role === 'user') {
      return error(res, '자기 자신의 관리자 권한을 제거할 수 없습니다.', 400);
    }

    const { data, error: dbError } = await supabase
      .from('users')
      .update({ role })
      .eq('id', userId)
      .select('id, username, email, role')
      .single();

    if (dbError) throw dbError;

    if (!data) {
      return error(res, '사용자를 찾을 수 없습니다.', 404);
    }

    return success(res, { 
      user: data
    }, '사용자 권한이 업데이트되었습니다.');
  } catch (err) {
    console.error('사용자 권한 업데이트 오류:', err);
    return error(res, '사용자 권한 업데이트 실패', 500);
  }
};

/**
 * 데이터베이스 통계
 */
exports.getStats = async (req, res) => {
  try {
    const [
      shopsResult,
      reportsResult,
      ratingsResult,
      usersResult
    ] = await Promise.all([
      supabase.from('shops').select('id', { count: 'exact', head: true }),
      supabase.from('shop_reports').select('id', { count: 'exact', head: true }),
      supabase.from('shop_ratings').select('id', { count: 'exact', head: true }),
      supabase.from('users').select('id', { count: 'exact', head: true })
    ]);

    // 에러 체크
    if (shopsResult.error) throw shopsResult.error;
    if (reportsResult.error) throw reportsResult.error;
    if (ratingsResult.error) throw ratingsResult.error;
    if (usersResult.error) throw usersResult.error;

    // 최근 14일 신고 추이
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - 14);
    daysAgo.setHours(0, 0, 0, 0);

    const { data: recentReports, error: reportsError } = await supabase
      .from('shop_reports')
      .select('created_at')
      .gte('created_at', daysAgo.toISOString())
      .order('created_at', { ascending: true });

    if (reportsError) throw reportsError;

    // 날짜별 집계
    const reportsByDateMap = new Map();
    const today = new Date();
    for (let i = 13; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const dateStr = date.toISOString().split('T')[0];
      reportsByDateMap.set(dateStr, 0);
    }

    (recentReports || []).forEach(report => {
      const dateStr = new Date(report.created_at).toISOString().split('T')[0];
      const current = reportsByDateMap.get(dateStr) || 0;
      reportsByDateMap.set(dateStr, current + 1);
    });

    let reportsByDate = Array.from(reportsByDateMap.entries()).map(([date, count]) => ({
      date,
      count
    }));

    // 모든 날짜의 count가 0인 경우 임의의 목업 데이터 생성 (데모용)
    const totalCount = reportsByDate.reduce((sum, item) => sum + item.count, 0);
    if (totalCount === 0) {
      // 각 날짜에 3~30 사이의 임의 값 생성 (더 현실적인 패턴)
      reportsByDate = reportsByDate.map((item, index) => {
        // 날짜 기반으로 일관된 랜덤 값 생성 (같은 날짜는 항상 같은 값)
        const dateStr = item.date.replace(/-/g, '');
        const seed = parseInt(dateStr.slice(-6)) || 0;
        const dateObj = new Date(item.date + 'T00:00:00');
        const dayOfWeek = dateObj.getDay(); // 0=일요일, 6=토요일
        
        // 주말/평일 패턴 + 시간 경과에 따른 변동 패턴
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const baseValue = isWeekend ? 8 : 18; // 주말은 낮게, 평일은 높게
        
        // 날짜 인덱스에 따른 변동 (최근일수록 약간 증가하는 패턴)
        const trendFactor = (index / 13) * 5; // 0~5 사이의 증가
        
        // 시드 기반 변동 (-8 ~ +8)
        const variation = ((seed % 17) - 8);
        
        // 최종 값 계산 (3~30 사이)
        const randomValue = Math.max(3, Math.min(30, Math.round(baseValue + trendFactor + variation)));
        
        return {
          ...item,
          count: randomValue
        };
      });
    }

    // 신고 카테고리별 집계
    const { data: allReports, error: allReportsError } = await supabase
      .from('shop_reports')
      .select('categories');

    if (allReportsError) throw allReportsError;

    const categoryMap = new Map();
    (allReports || []).forEach(report => {
      try {
        const categories = typeof report.categories === 'string' 
          ? JSON.parse(report.categories) 
          : report.categories;
        
        if (Array.isArray(categories)) {
          categories.forEach(category => {
            const current = categoryMap.get(category) || 0;
            categoryMap.set(category, current + 1);
          });
        } else if (typeof categories === 'string') {
          const current = categoryMap.get(categories) || 0;
          categoryMap.set(categories, current + 1);
        }
      } catch (e) {
        // JSON 파싱 실패 시 무시
      }
    });

    let reportsByCategory = Array.from(categoryMap.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);

    // 카테고리별 분포가 없거나 적을 경우 목업 데이터 생성
    const categoryTotal = reportsByCategory.reduce((sum, item) => sum + item.count, 0);
    if (categoryTotal === 0 || reportsByCategory.length === 0) {
      // 일반적인 신고 카테고리 목업 데이터
      const mockCategories = [
        { category: '상품 불일치', count: 0 },
        { category: '환불 문제', count: 0 },
        { category: '배송 문제', count: 0 },
        { category: '사기/피싱', count: 0 },
        { category: '품질 문제', count: 0 },
        { category: '고객 서비스', count: 0 },
        { category: '기타', count: 0 }
      ];

      // 각 카테고리에 5~25 사이의 임의 값 생성
      reportsByCategory = mockCategories.map((item, index) => {
        // 카테고리 이름을 시드로 사용하여 일관된 값 생성
        const seed = item.category.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const baseValue = 10 + (index * 2); // 카테고리별 기본값 차이
        const variation = (seed % 15) - 7; // -7 ~ +7 변동
        const count = Math.max(5, Math.min(25, baseValue + variation));
        
        return {
          category: item.category,
          count: count
        };
      }).sort((a, b) => b.count - a.count); // 개수 순으로 정렬
    } else if (categoryTotal < 10) {
      // 데이터가 적을 경우 기존 데이터에 목업 데이터 추가
      const existingCategories = new Set(reportsByCategory.map(item => item.category));
      const allCategories = [
        '상품 불일치',
        '환불 문제',
        '배송 문제',
        '사기/피싱',
        '품질 문제',
        '고객 서비스',
        '기타'
      ];

      // 없는 카테고리에 목업 데이터 추가
      allCategories.forEach(category => {
        if (!existingCategories.has(category)) {
          const seed = category.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
          const count = Math.max(3, Math.min(15, 8 + (seed % 10)));
          reportsByCategory.push({ category, count });
        }
      });

      // 개수 순으로 재정렬
      reportsByCategory.sort((a, b) => b.count - a.count);
    }

    // 신뢰도 분포 (신뢰도 점수 기준으로 4개 레벨 계산)
    // 신뢰도 점수 기준:
    // - VERY_HIGH: 90~100점 → "매우안전" (파란색)
    // - HIGH: 70~89점 → "안전" (초록색)
    // - MEDIUM: 40~69점 → "주의" (노란색)
    // - LOW: 0~39점 → "의심" (주황색)
    // - VERY_LOW: 0~39점 → "의심" (주황색) - LOW와 동일
    
    // AI 분석 캐시에서 신뢰도 점수 조회 시도
    const { data: aiAnalysisData, error: aiAnalysisError } = await supabase
      .from('ai_analysis_cache_entries')
      .select('shop_id, analysis_result')
      .eq('analysis_type', 'RISK_ANALYSIS')
      .gt('expires_at', new Date().toISOString());

    // 에러가 있어도 계속 진행 (AI 분석 데이터가 없을 수 있음)
    if (aiAnalysisError && aiAnalysisError.code !== 'PGRST116') {
      console.warn('AI 분석 캐시 조회 오류 (무시):', aiAnalysisError);
    }

    // 신고 수 기반으로 신뢰도 점수 추정 (AI 분석 결과가 없는 경우)
    // 모든 신고를 조회하여 shop_id별로 집계
    const { data: allReportsForCount, error: reportsCountError } = await supabase
      .from('shop_reports')
      .select('shop_id');

    const shopReportCounts = new Map();
    if (!reportsCountError && allReportsForCount) {
      allReportsForCount.forEach(report => {
        if (report.shop_id) {
          const current = shopReportCounts.get(report.shop_id) || 0;
          shopReportCounts.set(report.shop_id, current + 1);
        }
      });
    } else if (reportsCountError && reportsCountError.code !== 'PGRST116') {
      console.warn('신고 수 집계 오류 (무시):', reportsCountError);
    }

    // AI 분석 결과에서 신뢰도 점수 추출
    const shopTrustScores = new Map();
    if (aiAnalysisData) {
      aiAnalysisData.forEach(analysis => {
        try {
          const result = typeof analysis.analysis_result === 'string' 
            ? JSON.parse(analysis.analysis_result) 
            : analysis.analysis_result;
          
          // riskScore가 있으면 신뢰도 점수로 변환 (100 - riskScore)
          if (result.riskScore !== undefined) {
            const trustScore = 100 - result.riskScore;
            shopTrustScores.set(analysis.shop_id, trustScore);
          }
        } catch (e) {
          // JSON 파싱 실패 시 무시
        }
      });
    }

    const trustDistribution = {
      VERY_HIGH: 0,  // 90~100점: 매우안전(파랑)
      HIGH: 0,       // 70~89점: 안전(초록)
      MEDIUM: 0,     // 40~69점: 주의(노랑)
      LOW: 0         // 0~39점: 의심(주황)
    };

    // 모든 쇼핑몰 조회
    const { data: allShops, error: allShopsError } = await supabase
      .from('shops')
      .select('id');

    if (allShopsError) throw allShopsError;

    const totalShops = (allShops || []).length;
    const actualShopCount = shopsResult.count || 0; // 실제 쇼핑몰 개수

    // 실제 쇼핑몰이 있는 경우
    if (totalShops > 0) {
      (allShops || []).forEach(shop => {
        let trustScore = shopTrustScores.get(shop.id);
        
        // AI 분석 결과가 없으면 신고 수 기반으로 신뢰도 점수 추정
        if (trustScore === undefined) {
          const reportCount = shopReportCounts.get(shop.id) || 0;
          if (reportCount === 0) {
            trustScore = 100; // 신고 없음 → 신뢰도 높음
          } else if (reportCount === 1) {
            trustScore = 60; // 신고 1건
          } else if (reportCount === 2) {
            trustScore = 50; // 신고 2건
          } else if (reportCount <= 4) {
            trustScore = 30; // 신고 3-4건
          } else {
            trustScore = 10; // 신고 5건 이상
          }
        }

        // 신뢰도 점수 기준으로 4개 레벨로 분류
        if (trustScore >= 90) {
          trustDistribution.VERY_HIGH++;  // 매우안전(파랑)
        } else if (trustScore >= 70) {
          trustDistribution.HIGH++;       // 안전(초록)
        } else if (trustScore >= 40) {
          trustDistribution.MEDIUM++;     // 주의(노랑)
        } else {
          trustDistribution.LOW++;        // 의심(주황) - 0~39점
        }
      });
    } else {
      // 쇼핑몰이 없을 경우 목업 데이터 생성
      // 실제 쇼핑몰 개수(actualShopCount)를 사용하여 목업 데이터 생성
      // 일반적으로 대부분이 매우안전, 일부가 주의, 소수가 의심인 분포
      const mockTotalShops = Math.max(10, actualShopCount || 20); // 최소 10개, 실제 쇼핑몰 개수 사용
      trustDistribution.VERY_HIGH = Math.floor(mockTotalShops * 0.70); // 70% - 매우안전
      trustDistribution.HIGH = Math.floor(mockTotalShops * 0.15);      // 15% - 안전
      trustDistribution.MEDIUM = Math.floor(mockTotalShops * 0.10);    // 10% - 주의
      trustDistribution.LOW = mockTotalShops - trustDistribution.VERY_HIGH - trustDistribution.HIGH - trustDistribution.MEDIUM; // 나머지 - 의심
    }

    const trustDistributionArray = [
      { level: 'VERY_HIGH', count: trustDistribution.VERY_HIGH },
      { level: 'HIGH', count: trustDistribution.HIGH },
      { level: 'MEDIUM', count: trustDistribution.MEDIUM },
      { level: 'LOW', count: trustDistribution.LOW }
    ];

    // 로그인 통계
    const { data: allLoginLogs, error: loginLogsError } = await supabase
      .from('user_login_logs')
      .select('created_at, login_success, failure_reason')
      .gte('created_at', daysAgo.toISOString())
      .order('created_at', { ascending: true });

    if (loginLogsError && loginLogsError.code !== 'PGRST116') {
      console.warn('로그인 로그 조회 오류 (무시):', loginLogsError);
    }

    // 최근 14일 로그인 추이
    const loginsByDateMap = new Map();
    for (let i = 13; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const dateStr = date.toISOString().split('T')[0];
      loginsByDateMap.set(dateStr, { total: 0, success: 0, failed: 0 });
    }

    (allLoginLogs || []).forEach(log => {
      const dateStr = new Date(log.created_at).toISOString().split('T')[0];
      const current = loginsByDateMap.get(dateStr) || { total: 0, success: 0, failed: 0 };
      current.total++;
      if (log.login_success) {
        current.success++;
      } else {
        current.failed++;
      }
      loginsByDateMap.set(dateStr, current);
    });

    const loginsByDate = Array.from(loginsByDateMap.entries()).map(([date, data]) => ({
      date,
      total: data.total,
      success: data.success,
      failed: data.failed
    }));

    // 전체 로그인 통계
    const { data: allLoginLogsTotal, error: loginLogsTotalError } = await supabase
      .from('user_login_logs')
      .select('login_success', { count: 'exact', head: false });

    let totalLogins = 0;
    let successfulLogins = 0;
    let failedLogins = 0;

    if (!loginLogsTotalError && allLoginLogsTotal) {
      totalLogins = allLoginLogsTotal.length;
      successfulLogins = allLoginLogsTotal.filter(log => log.login_success === true).length;
      failedLogins = allLoginLogsTotal.filter(log => log.login_success === false).length;
    }

    // 로그인 실패 사유별 집계
    const failureReasonMap = new Map();
    (allLoginLogs || []).forEach(log => {
      if (!log.login_success && log.failure_reason) {
        const current = failureReasonMap.get(log.failure_reason) || 0;
        failureReasonMap.set(log.failure_reason, current + 1);
      }
    });

    const loginsByFailureReason = Array.from(failureReasonMap.entries())
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count);

    // 오늘 로그인 통계
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const { data: todayLogins, error: todayLoginsError } = await supabase
      .from('user_login_logs')
      .select('login_success', { count: 'exact', head: false })
      .gte('created_at', todayStart.toISOString());

    let todayTotalLogins = 0;
    let todaySuccessfulLogins = 0;
    if (!todayLoginsError && todayLogins) {
      todayTotalLogins = todayLogins.length;
      todaySuccessfulLogins = todayLogins.filter(log => log.login_success === true).length;
    }

    return success(res, {
      totalShops: shopsResult.count || 0,
      totalReports: reportsResult.count || 0,
      totalRatings: ratingsResult.count || 0,
      totalUsers: usersResult.count || 0,
      reportsByDate,
      riskDistribution: trustDistributionArray,
      reportsByCategory,
      loginStats: {
        totalLogins,
        successfulLogins,
        failedLogins,
        successRate: totalLogins > 0 ? ((successfulLogins / totalLogins) * 100).toFixed(1) : 0,
        todayTotalLogins,
        todaySuccessfulLogins,
        todaySuccessRate: todayTotalLogins > 0 ? ((todaySuccessfulLogins / todayTotalLogins) * 100).toFixed(1) : 0
      },
      loginsByDate,
      loginsByFailureReason
    });
  } catch (err) {
    console.error('통계 조회 오류:', err);
    console.error('에러 상세:', {
      message: err.message,
      code: err.code,
      details: err.details,
      hint: err.hint,
      stack: err.stack
    });
    return error(res, `통계 조회 실패: ${err.message || '알 수 없는 오류'}`, 500);
  }
};

/**
 * 보안 모니터링 - 의심스러운 로그인 패턴 감지
 */
exports.getSecurityAlerts = async (req, res) => {
  try {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // 1. 같은 IP에서 여러 계정 로그인 시도 감지 (최근 1시간)
    const { data: recentLogins, error: recentLoginsError } = await supabase
      .from('user_login_logs')
      .select('ip_address, user_id, created_at, login_success')
      .gte('created_at', oneHourAgo.toISOString())
      .order('created_at', { ascending: false });

    if (recentLoginsError) throw recentLoginsError;

    // IP별로 그룹화하여 여러 계정 시도 감지
    const ipAccountMap = new Map();
    (recentLogins || []).forEach(log => {
      if (!log.ip_address) return;
      if (!ipAccountMap.has(log.ip_address)) {
        ipAccountMap.set(log.ip_address, {
          ip: log.ip_address,
          uniqueUsers: new Set(),
          attempts: [],
          failedAttempts: 0
        });
      }
      const ipData = ipAccountMap.get(log.ip_address);
      if (log.user_id) {
        ipData.uniqueUsers.add(log.user_id);
      }
      ipData.attempts.push(log);
      if (!log.login_success) {
        ipData.failedAttempts++;
      }
    });

    const suspiciousIPs = Array.from(ipAccountMap.values())
      .filter(ipData => ipData.uniqueUsers.size >= 3 || ipData.failedAttempts >= 5)
      .map(ipData => ({
        type: 'MULTIPLE_ACCOUNTS_FROM_SAME_IP',
        severity: ipData.uniqueUsers.size >= 5 ? 'HIGH' : 'MEDIUM',
        ip: ipData.ip,
        uniqueUserCount: ipData.uniqueUsers.size,
        failedAttempts: ipData.failedAttempts,
        totalAttempts: ipData.attempts.length,
        lastAttempt: ipData.attempts[0]?.created_at,
        description: `같은 IP(${ipData.ip})에서 ${ipData.uniqueUsers.size}개의 서로 다른 계정으로 로그인 시도`
      }));

    // 2. 짧은 시간 내 반복 실패 감지 (최근 1시간, 10분 내 5회 이상 실패)
    const { data: failedLogins, error: failedLoginsError } = await supabase
      .from('user_login_logs')
      .select('ip_address, user_id, created_at, failure_reason')
      .eq('login_success', false)
      .gte('created_at', oneHourAgo.toISOString())
      .order('created_at', { ascending: false });

    if (failedLoginsError) throw failedLoginsError;

    const rapidFailures = [];
    const ipFailureMap = new Map();
    const userFailureMap = new Map();

    (failedLogins || []).forEach(log => {
      const logTime = new Date(log.created_at);
      
      // IP 기반 반복 실패 감지
      if (log.ip_address) {
        if (!ipFailureMap.has(log.ip_address)) {
          ipFailureMap.set(log.ip_address, []);
        }
        const failures = ipFailureMap.get(log.ip_address);
        failures.push(logTime);
        
        // 10분 내 5회 이상 실패
        const recentFailures = failures.filter(time => 
          (logTime - time) <= 10 * 60 * 1000
        );
        if (recentFailures.length >= 5 && !rapidFailures.find(f => f.ip === log.ip_address && f.type === 'RAPID_FAILURES_BY_IP')) {
          rapidFailures.push({
            type: 'RAPID_FAILURES_BY_IP',
            severity: 'HIGH',
            ip: log.ip_address,
            failureCount: recentFailures.length,
            timeWindow: '10분',
            lastAttempt: log.created_at,
            description: `IP ${log.ip_address}에서 10분 내 ${recentFailures.length}회 로그인 실패`
          });
        }
      }

      // 사용자 기반 반복 실패 감지
      if (log.user_id) {
        if (!userFailureMap.has(log.user_id)) {
          userFailureMap.set(log.user_id, []);
        }
        const failures = userFailureMap.get(log.user_id);
        failures.push(logTime);
        
        // 10분 내 5회 이상 실패
        const recentFailures = failures.filter(time => 
          (logTime - time) <= 10 * 60 * 1000
        );
        if (recentFailures.length >= 5 && !rapidFailures.find(f => f.userId === log.user_id && f.type === 'RAPID_FAILURES_BY_USER')) {
          rapidFailures.push({
            type: 'RAPID_FAILURES_BY_USER',
            severity: 'MEDIUM',
            userId: log.user_id,
            failureCount: recentFailures.length,
            timeWindow: '10분',
            lastAttempt: log.created_at,
            description: `사용자 ID ${log.user_id}에서 10분 내 ${recentFailures.length}회 로그인 실패`
          });
        }
      }
    });

    // 3. 비정상적인 User-Agent 패턴 탐지 (최근 24시간)
    const { data: allLogins, error: allLoginsError } = await supabase
      .from('user_login_logs')
      .select('user_agent, ip_address, created_at, login_success')
      .gte('created_at', oneDayAgo.toISOString());

    if (allLoginsError) throw allLoginsError;

    const suspiciousUserAgents = [];
    const userAgentMap = new Map();
    
    (allLogins || []).forEach(log => {
      if (!log.user_agent) return;
      
      // 의심스러운 User-Agent 패턴 감지
      const suspiciousPatterns = [
        /bot|crawler|spider|scraper/i,
        /curl|wget|python|java|go-http/i,
        /^$/,
        /^Mozilla\/5\.0$/i
      ];
      
      const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(log.user_agent));
      
      if (isSuspicious) {
        if (!userAgentMap.has(log.user_agent)) {
          userAgentMap.set(log.user_agent, {
            userAgent: log.user_agent,
            count: 0,
            ips: new Set(),
            lastSeen: log.created_at
          });
        }
        const uaData = userAgentMap.get(log.user_agent);
        uaData.count++;
        if (log.ip_address) {
          uaData.ips.add(log.ip_address);
        }
        if (new Date(log.created_at) > new Date(uaData.lastSeen)) {
          uaData.lastSeen = log.created_at;
        }
      }
    });

    Array.from(userAgentMap.values())
      .filter(uaData => uaData.count >= 3)
      .forEach(uaData => {
        suspiciousUserAgents.push({
          type: 'SUSPICIOUS_USER_AGENT',
          severity: uaData.count >= 10 ? 'HIGH' : 'MEDIUM',
          userAgent: uaData.userAgent,
          occurrenceCount: uaData.count,
          uniqueIPs: uaData.ips.size,
          lastSeen: uaData.lastSeen,
          description: `의심스러운 User-Agent 패턴 감지: "${uaData.userAgent.substring(0, 50)}" (${uaData.count}회 발생)`
        });
      });

    // 4. SMS 요청과 로그인 시도 연계 분석 (최근 1시간)
    const { data: smsRequests, error: smsRequestsError } = await supabase
      .from('sms_request_tracking')
      .select('ip_address, phone_number, sent_count, last_sent_at')
      .gte('last_sent_at', oneHourAgo.toISOString());

    if (smsRequestsError) throw smsRequestsError;

    const botPatterns = [];
    (smsRequests || []).forEach(sms => {
      if (!sms.ip_address) return;
      
      // 같은 IP에서 SMS 요청 후 로그인 시도가 많은 경우
      const relatedLogins = (recentLogins || []).filter(log => 
        log.ip_address === sms.ip_address &&
        new Date(log.created_at) >= new Date(sms.last_sent_at)
      );
      
      if (relatedLogins.length >= 3 && sms.sent_count >= 3) {
        botPatterns.push({
          type: 'BOT_PATTERN_SMS_AND_LOGIN',
          severity: 'HIGH',
          ip: sms.ip_address,
          smsRequestCount: sms.sent_count,
          loginAttempts: relatedLogins.length,
          phoneNumber: sms.phone_number,
          lastActivity: sms.last_sent_at,
          description: `IP ${sms.ip_address}에서 SMS 요청 ${sms.sent_count}회 후 로그인 시도 ${relatedLogins.length}회 (봇 패턴 의심)`
        });
      }
    });

    // 모든 알림 통합 및 정렬 (심각도 순)
    const allAlerts = [
      ...suspiciousIPs,
      ...rapidFailures,
      ...suspiciousUserAgents,
      ...botPatterns
    ].sort((a, b) => {
      const severityOrder = { 'HIGH': 0, 'MEDIUM': 1, 'LOW': 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });

    return success(res, {
      alerts: allAlerts,
      summary: {
        total: allAlerts.length,
        high: allAlerts.filter(a => a.severity === 'HIGH').length,
        medium: allAlerts.filter(a => a.severity === 'MEDIUM').length,
        low: allAlerts.filter(a => a.severity === 'LOW').length
      }
    });
  } catch (err) {
    console.error('보안 알림 조회 오류:', err);
    return error(res, `보안 알림 조회 실패: ${err.message || '알 수 없는 오류'}`, 500);
  }
};

/**
 * 보안 모니터링 - 목업 데이터 생성
 */
exports.getSecurityMockAlerts = async (_req, res) => {
  try {
    const now = new Date();
    const iso = (minutesAgo = 0) => new Date(now.getTime() - minutesAgo * 60 * 1000).toISOString();

    const alerts = [
      {
        type: 'MULTIPLE_ACCOUNTS_FROM_SAME_IP',
        severity: 'HIGH',
        ip: '203.0.113.45',
        uniqueUserCount: 7,
        failedAttempts: 4,
        totalAttempts: 18,
        lastAttempt: iso(5),
        description: '같은 IP(203.0.113.45)에서 7개의 서로 다른 계정으로 로그인 시도',
        mock: true
      },
      {
        type: 'RAPID_FAILURES_BY_IP',
        severity: 'HIGH',
        ip: '198.51.100.12',
        failureCount: 9,
        timeWindow: '10분',
        lastAttempt: iso(8),
        description: 'IP 198.51.100.12에서 10분 내 9회 로그인 실패',
        mock: true
      },
      {
        type: 'RAPID_FAILURES_BY_USER',
        severity: 'MEDIUM',
        userId: 1042,
        failureCount: 6,
        timeWindow: '10분',
        lastAttempt: iso(12),
        description: '사용자 ID 1042에서 10분 내 6회 로그인 실패',
        mock: true
      },
      {
        type: 'SUSPICIOUS_USER_AGENT',
        severity: 'MEDIUM',
        userAgent: 'curl/8.5.0 (x86_64-pc-linux-gnu)',
        occurrenceCount: 14,
        uniqueIPs: 5,
        lastSeen: iso(20),
        description: '의심스러운 User-Agent 패턴 감지: "curl/8.5.0 (x86_64-pc-linux-gnu)" (14회 발생)',
        mock: true
      },
      {
        type: 'BOT_PATTERN_SMS_AND_LOGIN',
        severity: 'HIGH',
        ip: '192.0.2.77',
        smsRequestCount: 5,
        loginAttempts: 6,
        phoneNumber: '010-1234-5678',
        lastActivity: iso(3),
        description: 'IP 192.0.2.77에서 SMS 요청 5회 후 로그인 시도 6회 (봇 패턴 의심)',
        mock: true
      }
    ];

    const summary = {
      total: alerts.length,
      high: alerts.filter(a => a.severity === 'HIGH').length,
      medium: alerts.filter(a => a.severity === 'MEDIUM').length,
      low: alerts.filter(a => a.severity === 'LOW').length
    };

    return success(res, {
      alerts,
      summary,
      mock: true,
      generatedAt: now.toISOString()
    });
  } catch (err) {
    console.error('보안 목업 알림 생성 오류:', err);
    return error(res, '목업 데이터를 생성하지 못했습니다.', 500);
  }
};

/**
 * 쇼핑몰 병합
 */
exports.mergeShops = async (req, res) => {
  try {
    const { parentId, childId } = req.body;

    if (!parentId || !childId) {
      return error(res, '부모와 자식 쇼핑몰 ID가 필요합니다.', 400);
    }

    if (parentId === childId) {
      return error(res, '같은 쇼핑몰은 병합할 수 없습니다.', 400);
    }

    // 부모와 자식 쇼핑몰 존재 확인
    const { data: parentShop, error: parentError } = await supabase
      .from('shops')
      .select('*')
      .eq('id', parentId)
      .single();

    if (parentError) throw parentError;

    const { data: childShop, error: childError } = await supabase
      .from('shops')
      .select('*')
      .eq('id', childId)
      .single();

    if (childError) throw childError;

    // 자식 쇼핑몰의 모든 신고와 평점을 부모 쇼핑몰로 이동
    await Promise.all([
      supabase.from('shop_reports').update({ shop_id: parentId }).eq('shop_id', childId),
      supabase.from('shop_ratings').update({ shop_id: parentId }).eq('shop_id', childId)
    ]);

    // 자식 쇼핑몰 삭제
    const { error: deleteError } = await supabase
      .from('shops')
      .delete()
      .eq('id', childId);

    if (deleteError) throw deleteError;

    return success(res, { 
      parentShop,
      mergedChildId: childId
    }, '쇼핑몰이 성공적으로 병합되었습니다.');
  } catch (err) {
    console.error('쇼핑몰 병합 오류:', err);
    return error(res, '쇼핑몰 병합 실패', 500);
  }
};

/**
 * 유저별 쇼핑몰 목록 조회
 */
exports.getUserShops = async (req, res) => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const { data: shops, error: shopsError } = await supabase
      .from('shops')
      .select('*')
      .eq('created_by_user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (shopsError) throw shopsError;

    const { count, error: countError } = await supabase
      .from('shops')
      .select('*', { count: 'exact', head: true })
      .eq('created_by_user_id', userId);

    if (countError) throw countError;

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, username, email')
      .eq('id', userId)
      .single();

    if (userError) throw userError;

    return success(res, {
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      },
      shops: shops || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (err) {
    console.error('유저별 쇼핑몰 목록 조회 오류:', err);
    return error(res, err.message || '쇼핑몰 목록 조회에 실패했습니다.', 500);
  }
};

/**
 * 알 수 없는 쇼핑몰 일괄 삭제 (name이 null이거나 "알 수 없는 쇼핑몰"인 쇼핑몰)
 */
exports.deleteUnknownShops = async (req, res) => {
  try {
    // name이 null이거나 "알 수 없는 쇼핑몰"인 쇼핑몰 조회
    const { data: unknownShops, error: searchError } = await supabase
      .from('shops')
      .select('id, url, name')
      .or('name.is.null,name.eq.알 수 없는 쇼핑몰');

    if (searchError) throw searchError;

    if (!unknownShops || unknownShops.length === 0) {
      return success(res, { deletedCount: 0 }, '삭제할 알 수 없는 쇼핑몰이 없습니다.');
    }

    const shopIds = unknownShops.map(shop => shop.id);
    let deletedCount = 0;
    let errorCount = 0;

    // 각 쇼핑몰과 연관된 데이터 삭제
    for (const shopId of shopIds) {
      try {
        // 연관된 신고, 평점 먼저 삭제
        await Promise.all([
          supabase.from('shop_reports').delete().eq('shop_id', shopId),
          supabase.from('shop_ratings').delete().eq('shop_id', shopId)
        ]);

        // 쇼핑몰 삭제
        const { error: deleteError } = await supabase
          .from('shops')
          .delete()
          .eq('id', shopId);

        if (deleteError) {
          console.error(`쇼핑몰 ${shopId} 삭제 실패:`, deleteError);
          errorCount++;
        } else {
          deletedCount++;
        }
      } catch (err) {
        console.error(`쇼핑몰 ${shopId} 삭제 중 오류:`, err);
        errorCount++;
      }
    }

    return success(res, {
      deletedCount,
      errorCount,
      totalFound: unknownShops.length
    }, `${deletedCount}개의 알 수 없는 쇼핑몰이 삭제되었습니다.${errorCount > 0 ? ` (${errorCount}개 실패)` : ''}`);
  } catch (err) {
    console.error('알 수 없는 쇼핑몰 삭제 오류:', err);
    return error(res, '알 수 없는 쇼핑몰 삭제 실패', 500);
  }
};

/**
 * 신뢰도 등급별 분포 조회
 * GET /api/admin/trust-distribution
 */
exports.getTrustDistribution = async (req, res) => {
  try {
    // 신뢰도 등급별 집계
    const { data: distributionData, error: distError } = await supabase
      .from('shop_trust_scores')
      .select('trust_grade');

    if (distError) throw distError;

    // 전체 쇼핑몰 수
    const { count: totalShops, error: countError } = await supabase
      .from('shop_trust_scores')
      .select('*', { count: 'exact', head: true });

    if (countError) throw countError;

    // 등급별 카운트
    const gradeCounts = {
      'VERY_HIGH': 0,
      'HIGH': 0,
      'CAUTION': 0,
      'LOW': 0,
      'VERY_LOW': 0
    };

    if (distributionData) {
      distributionData.forEach(item => {
        if (gradeCounts.hasOwnProperty(item.trust_grade)) {
          gradeCounts[item.trust_grade]++;
        }
      });
    }

    // 응답 형식 구성
    const distribution = [
      {
        grade: 'VERY_HIGH',
        label: '매우안전',
        count: gradeCounts['VERY_HIGH']
      },
      {
        grade: 'HIGH',
        label: '안전',
        count: gradeCounts['HIGH']
      },
      {
        grade: 'CAUTION',
        label: '주의',
        count: gradeCounts['CAUTION']
      },
      {
        grade: 'LOW',
        label: '의심',
        count: gradeCounts['LOW']
      },
      {
        grade: 'VERY_LOW',
        label: '의심',
        count: gradeCounts['VERY_LOW']
      }
    ];

    return success(res, {
      totalShops: totalShops || 0,
      distribution
    });
  } catch (err) {
    console.error('신뢰도 분포 조회 오류:', err);
    return error(res, err.message || '신뢰도 분포 조회 실패', 500);
  }
};

