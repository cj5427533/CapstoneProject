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
 * 전체 신고 조회
 */
exports.getReports = async (req, res) => {
  try {
    const { data: reports, error: dbError } = await supabase
      .from('shop_reports')
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
 * 전체 평점 조회
 */
exports.getRatings = async (req, res) => {
  try {
    const { data: ratings, error: dbError } = await supabase
      .from('shop_ratings')
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
 * 전체 사용자 조회
 */
exports.getUsers = async (req, res) => {
  try {
    const { data: users, error: dbError } = await supabase
      .from('users')
      .select('id, username, email, phone_number, role, created_at')
      .order('created_at', { ascending: false });

    if (dbError) throw dbError;

    return success(res, { users: users || [] });
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

    const reportsByDate = Array.from(reportsByDateMap.entries()).map(([date, count]) => ({
      date,
      count
    }));

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

    const reportsByCategory = Array.from(categoryMap.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);

    // 위험도 분포 (신고 수 기반으로 임시 계산)
    // 실제로는 쇼핑몰의 신뢰도 점수 기반으로 계산해야 하지만, 
    // 현재는 신고 수가 많은 쇼핑몰을 위험도가 높다고 가정
    const { data: shopsWithReports, error: shopsError } = await supabase
      .from('shops')
      .select(`
        id,
        shop_reports!inner(id)
      `);

    if (shopsError && shopsError.code !== 'PGRST116') throw shopsError;

    // 신고 수 기반으로 위험도 계산
    const shopReportCounts = new Map();
    if (shopsWithReports) {
      shopsWithReports.forEach(shop => {
        const count = Array.isArray(shop.shop_reports) ? shop.shop_reports.length : 1;
        shopReportCounts.set(shop.id, count);
      });
    }

    const riskDistribution = {
      SAFE: 0,
      CAUTION: 0,
      DANGEROUS: 0,
      CRITICAL: 0
    };

    // 모든 쇼핑몰 조회
    const { data: allShops, error: allShopsError } = await supabase
      .from('shops')
      .select('id');

    if (allShopsError) throw allShopsError;

    (allShops || []).forEach(shop => {
      const reportCount = shopReportCounts.get(shop.id) || 0;
      if (reportCount === 0) {
        riskDistribution.SAFE++;
      } else if (reportCount <= 2) {
        riskDistribution.CAUTION++;
      } else if (reportCount <= 5) {
        riskDistribution.DANGEROUS++;
      } else {
        riskDistribution.CRITICAL++;
      }
    });

    const riskDistributionArray = [
      { level: 'SAFE', count: riskDistribution.SAFE },
      { level: 'CAUTION', count: riskDistribution.CAUTION },
      { level: 'DANGEROUS', count: riskDistribution.DANGEROUS },
      { level: 'CRITICAL', count: riskDistribution.CRITICAL }
    ];

    return success(res, {
      totalShops: shopsResult.count || 0,
      totalReports: reportsResult.count || 0,
      totalRatings: ratingsResult.count || 0,
      totalUsers: usersResult.count || 0,
      reportsByDate,
      riskDistribution: riskDistributionArray,
      reportsByCategory
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

