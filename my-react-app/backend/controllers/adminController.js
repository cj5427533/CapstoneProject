/**
 * 관리자 관련 컨트롤러
 */
const supabase = require('../config/supabase');
const { success, error } = require('../utils/response');
const { sanitizeInput } = require('../utils/validation');

/**
 * 쇼핑몰 목록 조회
 */
exports.getShops = async (req, res) => {
  try {
    const { data: shops, error: dbError } = await supabase
      .from('shops')
      .select('*')
      .order('created_at', { ascending: false });

    if (dbError) throw dbError;

    return success(res, { shops: shops || [] });
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
      supabase.from('reports').delete().eq('shop_id', shopId),
      supabase.from('ratings').delete().eq('shop_id', shopId)
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
 * 전체 신고 조회
 */
exports.getReports = async (req, res) => {
  try {
    const { data: reports, error: dbError } = await supabase
      .from('reports')
      .select(`
        *,
        shops (id, url, name)
      `)
      .order('created_at', { ascending: false });

    if (dbError) throw dbError;

    // evidence_files를 JSON 파싱하여 배열로 변환
    const formattedReports = (reports || []).map(report => ({
      ...report,
      evidenceFiles: report.evidence_files ? (typeof report.evidence_files === 'string' ? JSON.parse(report.evidence_files) : report.evidence_files) : [],
      shops: report.shops ? (Array.isArray(report.shops) ? report.shops[0] : report.shops) : null
    }));

    return success(res, formattedReports);
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
      .from('reports')
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
      .from('reports')
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
 * 전체 평점 조회
 */
exports.getRatings = async (req, res) => {
  try {
    const { data: ratings, error: dbError } = await supabase
      .from('ratings')
      .select(`
        *,
        shops (id, url, name)
      `)
      .order('created_at', { ascending: false });

    if (dbError) throw dbError;

    return success(res, { ratings: ratings || [] });
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
      .from('ratings')
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
 * 전체 사용자 조회
 */
exports.getUsers = async (req, res) => {
  try {
    const { data: users, error: dbError } = await supabase
      .from('users')
      .select('id, username, email, phone_number, created_at')
      .order('created_at', { ascending: false });

    if (dbError) throw dbError;

    return success(res, { users: users || [] });
  } catch (err) {
    console.error('사용자 조회 오류:', err);
    return error(res, '사용자 조회 실패', 500);
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
      supabase.from('reports').select('id', { count: 'exact', head: true }),
      supabase.from('ratings').select('id', { count: 'exact', head: true }),
      supabase.from('users').select('id', { count: 'exact', head: true })
    ]);

    return success(res, {
      totalShops: shopsResult.count || 0,
      totalReports: reportsResult.count || 0,
      totalRatings: ratingsResult.count || 0,
      totalUsers: usersResult.count || 0
    });
  } catch (err) {
    console.error('통계 조회 오류:', err);
    return error(res, '통계 조회 실패', 500);
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
      supabase.from('reports').update({ shop_id: parentId }).eq('shop_id', childId),
      supabase.from('ratings').update({ shop_id: parentId }).eq('shop_id', childId)
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

