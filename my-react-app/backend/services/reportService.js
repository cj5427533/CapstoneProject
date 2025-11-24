/**
 * 신고 관련 서비스
 */
const supabase = require('../config/supabase');
const { normalizeUrl } = require('../utils/url');
const shopService = require('./shopService');

/**
 * 신고 생성
 */
async function createReport(reportData, userId) {
  const { shopUrl, categories, description, reporterName, reporterPhone, evidenceFiles } = reportData;
  
  // userId는 필수
  if (!userId) {
    throw new Error('로그인이 필요합니다.');
  }
  
  const normalizedUrl = normalizeUrl(shopUrl);
  
  // 쇼핑몰 생성 또는 조회
  const { shop, error: shopError } = await shopService.createShopIfNotExists(
    normalizedUrl,
    userId,
    'report',
    null
  );

  if (shopError) {
    throw new Error(shopError);
  }

  if (!shop) {
    throw new Error('쇼핑몰 정보를 가져올 수 없습니다.');
  }

  // parent_shop_id가 있으면 부모 ID를 사용
  const shopId = shop.parent_shop_id || shop.id;

  // 중복 신고 체크
  if (reporterName) {
    const { data: existingReports, error: checkError } = await supabase
      .from('shop_reports')
      .select('id')
      .eq('shop_id', shopId)
      .eq('reporter_name', reporterName);

    if (checkError) throw checkError;

    if (existingReports && existingReports.length > 0) {
      throw new Error('이미 이 쇼핑몰에 대한 신고가 존재합니다.');
    }
  }

  // 업로드된 파일 경로 생성
  const evidenceFilePaths = evidenceFiles ? evidenceFiles.map(file => `/uploads/${file.filename}`) : [];
  
  const { data: newReport, error: reportError } = await supabase
    .from('shop_reports')
    .insert({
      shop_id: shopId,
      user_id: userId,
      categories: JSON.stringify(categories),
      description: description,
      reporter_name: reporterName,
      reporter_phone: reporterPhone,
      evidence_files: evidenceFilePaths.length > 0 ? JSON.stringify(evidenceFilePaths) : null
    })
    .select('*')
    .single();

  if (reportError) throw reportError;

  return {
    report: newReport,
    uploadedFiles: evidenceFilePaths
  };
}

/**
 * 사용자의 모든 신고 조회
 */
async function getUserReports(reporterName) {
  const { data: reports, error } = await supabase
    .from('shop_reports')
    .select(`
      *,
      shops (id, url, name)
    `)
    .eq('reporter_name', reporterName)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return reports || [];
}

/**
 * 사용자의 특정 쇼핑몰 신고 조회
 */
async function getUserShopReport(reporterName, shopUrl) {
  const normalizedUrl = normalizeUrl(shopUrl);
  
  const { data: shops, error: searchError } = await supabase
    .from('shops')
    .select('*')
    .eq('url', normalizedUrl)
    .single();

  if (searchError && searchError.code === 'PGRST116') {
    return null;
  } else if (searchError) {
    throw searchError;
  }

  const shopId = shops.parent_shop_id || shops.id;

  const { data: reports, error: reportError } = await supabase
    .from('shop_reports')
    .select('*')
    .eq('shop_id', shopId)
    .eq('reporter_name', reporterName)
    .order('created_at', { ascending: false })
    .limit(1);

  if (reportError) throw reportError;

  return reports && reports.length > 0 ? reports[0] : null;
}

/**
 * 신고 삭제
 */
async function deleteReport(reportId, reporterName) {
  // 기존 신고 확인 및 권한 체크
  const { data: existingReport, error: checkError } = await supabase
    .from('shop_reports')
    .select('*')
    .eq('id', reportId)
    .single();

  if (checkError) throw checkError;

  if (!existingReport) {
    throw new Error('신고를 찾을 수 없습니다.');
  }

  if (existingReport.reporter_name !== reporterName) {
    throw new Error('본인의 신고만 삭제할 수 있습니다.');
  }

  const { error: deleteError } = await supabase
    .from('shop_reports')
    .delete()
    .eq('id', reportId);

  if (deleteError) throw deleteError;
}

/**
 * 신고 수정
 */
async function updateReport(reportId, updateData, reporterName) {
  const { categories, description } = updateData;
  
  // 기존 신고 확인 및 권한 체크
  const { data: existingReport, error: checkError } = await supabase
    .from('shop_reports')
    .select('*')
    .eq('id', reportId)
    .single();

  if (checkError) throw checkError;

  if (!existingReport) {
    throw new Error('신고를 찾을 수 없습니다.');
  }

  if (existingReport.reporter_name !== reporterName) {
    throw new Error('본인의 신고만 수정할 수 있습니다.');
  }

  const { data: updatedReport, error: updateError } = await supabase
    .from('shop_reports')
    .update({
      categories: JSON.stringify(categories),
      description: description
    })
    .eq('id', reportId)
    .select('*')
    .single();

  if (updateError) throw updateError;

  return updatedReport;
}

/**
 * 모든 신고 조회 (승인된 것만)
 */
async function getAllReports() {
  const { data, error } = await supabase
    .from('shop_reports')
    .select(`*, shops (id, url, name)`)
    .eq('status', 'approved')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

module.exports = {
  createReport,
  getUserReports,
  getUserShopReport,
  deleteReport,
  updateReport,
  getAllReports
};

