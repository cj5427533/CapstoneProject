/**
 * 신고 관련 컨트롤러
 */
const reportService = require('../services/reportService');
const { success, error } = require('../utils/response');
const { sanitizeInput } = require('../utils/validation');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

/**
 * 신고 생성
 */
exports.createReport = async (req, res) => {
  try {
    let { shopUrl, categories, description, reporterName, reporterPhone } = req.body;
    
    const uploadedFiles = req.files || [];
    
    // categories가 문자열이면 JSON 파싱
    if (typeof categories === 'string') {
      try {
        categories = JSON.parse(categories);
      } catch (parseError) {
        return error(res, '카테고리 형식이 올바르지 않습니다.', 400);
      }
    }
    
    if (!shopUrl || !categories || !description) {
      return error(res, '필수 필드가 누락되었습니다.', 400);
    }

    // 현재 로그인한 유저 ID 가져오기 (필수)
    // verifyTokenMiddleware를 통해 req.user에 사용자 정보가 설정됨
    if (!req.user || !req.user.id) {
      return error(res, '로그인이 필요합니다.', 401);
    }

    const userId = req.user.id;

    const result = await reportService.createReport({
      shopUrl,
      categories,
      description,
      reporterName,
      reporterPhone,
      evidenceFiles: uploadedFiles
    }, userId);

    return success(res, result, '신고가 성공적으로 등록되었습니다.', 201);
  } catch (err) {
    console.error('신고 등록 오류:', err);
    
    // 업로드된 파일이 있으면 삭제
    if (req.files && req.files.length > 0) {
      const uploadsDir = path.join(__dirname, '../uploads');
      req.files.forEach(file => {
        const filePath = path.join(uploadsDir, file.filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      });
    }
    
    // multer 에러 처리
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return error(res, '파일 크기가 10MB를 초과합니다.', 400);
      }
      return error(res, err.message, 400);
    }
    
    if (err.message.includes('이미 이 쇼핑몰에 대한 신고가 존재합니다')) {
      return error(res, err.message, 409);
    }
    
    return error(res, err.message || '신고 등록 실패', 500);
  }
};

/**
 * 사용자의 모든 신고 조회
 */
exports.getUserReports = async (req, res) => {
  try {
    const { reporterName } = req.params;
    
    if (!reporterName) {
      return error(res, '사용자명이 필요합니다.', 400);
    }

    const reports = await reportService.getUserReports(reporterName);

    return success(res, { reports });
  } catch (err) {
    console.error('사용자 신고 목록 조회 오류:', err);
    return error(res, '신고 목록 조회 실패', 500);
  }
};

/**
 * 사용자의 특정 쇼핑몰 신고 조회
 */
exports.getUserShopReport = async (req, res) => {
  try {
    const { reporterName, shopUrl } = req.params;
    
    if (!reporterName || !shopUrl) {
      return error(res, '필수 파라미터가 누락되었습니다.', 400);
    }

    const report = await reportService.getUserShopReport(reporterName, shopUrl);

    return success(res, { report });
  } catch (err) {
    console.error('신고 조회 오류:', err);
    return error(res, '신고 조회 실패', 500);
  }
};

/**
 * 신고 삭제
 */
exports.deleteReport = async (req, res) => {
  try {
    const { reportId, reporterName } = req.params;

    await reportService.deleteReport(reportId, reporterName);

    return success(res, { message: '신고가 삭제되었습니다.' });
  } catch (err) {
    console.error('신고 삭제 오류:', err);
    
    if (err.message.includes('찾을 수 없습니다')) {
      return error(res, err.message, 404);
    }
    if (err.message.includes('본인의 신고만')) {
      return error(res, err.message, 403);
    }
    
    return error(res, '신고 삭제 실패', 500);
  }
};

/**
 * 신고 수정
 */
exports.updateReport = async (req, res) => {
  try {
    const { reportId } = req.params;
    const { categories, description, reporterName } = req.body;
    
    if (!categories || !description) {
      return error(res, '필수 필드가 누락되었습니다.', 400);
    }

    const updatedReport = await reportService.updateReport(reportId, {
      categories,
      description
    }, reporterName);

    return success(res, { report: updatedReport });
  } catch (err) {
    console.error('신고 수정 오류:', err);
    
    if (err.message.includes('찾을 수 없습니다')) {
      return error(res, err.message, 404);
    }
    if (err.message.includes('본인의 신고만')) {
      return error(res, err.message, 403);
    }
    
    return error(res, '신고 수정 실패', 500);
  }
};

/**
 * 모든 신고 조회 (승인된 것만)
 */
exports.getAllReports = async (req, res) => {
  try {
    const reports = await reportService.getAllReports();
    return success(res, { reports });
  } catch (err) {
    console.error('피해사례 목록 조회 오류:', err);
    return error(res, '피해사례 목록 조회에 실패했습니다.', 500);
  }
};

