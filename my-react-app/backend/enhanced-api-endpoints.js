// 개선된 API 엔드포인트들 - 증빙 기반 리뷰 시스템

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Supabase 클라이언트
const supabaseUrl = process.env.SUPABASE_URL || 'https://tqdvolgachfszomwhlfe.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// 파일 업로드 설정
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/evidence';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 5 // 최대 5개 파일
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/jpg',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('지원되지 않는 파일 형식입니다.'), false);
    }
  }
});

// 파일 업로드 엔드포인트
const uploadEvidenceFiles = async (req, res) => {
  try {
    const { reportId } = req.params;
    const files = req.files;

    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        message: '업로드할 파일이 없습니다.'
      });
    }

    const fileIds = [];

    // 각 파일을 데이터베이스에 저장
    for (const file of files) {
      const { data, error } = await supabase
        .from('uploaded_files')
        .insert({
          report_id: parseInt(reportId),
          file_name: file.originalname,
          file_path: file.path,
          file_size: file.size,
          file_type: file.mimetype,
          upload_date: new Date().toISOString(),
          verification_status: 'PENDING'
        })
        .select();

      if (error) {
        console.error('파일 저장 에러:', error);
        continue;
      }

      fileIds.push(data[0].id);
    }

    // 관련 리포트의 증빙 상태 업데이트
    if (fileIds.length > 0) {
      await supabase
        .from('reports')
        .update({
          evidence_verified: true,
          verification_score: Math.min(100, fileIds.length * 25) // 파일 개수에 따른 점수
        })
        .eq('id', reportId);
    }

    res.json({
      success: true,
      fileIds: fileIds,
      message: `${fileIds.length}개 파일이 업로드되었습니다.`
    });

  } catch (error) {
    console.error('파일 업로드 에러:', error);
    res.status(500).json({
      success: false,
      message: '파일 업로드에 실패했습니다.'
    });
  }
};

// 파일 삭제 엔드포인트
const deleteEvidenceFile = async (req, res) => {
  try {
    const { fileId } = req.params;

    // 파일 정보 조회
    const { data: fileData, error: fetchError } = await supabase
      .from('uploaded_files')
      .select('*')
      .eq('id', fileId)
      .single();

    if (fetchError || !fileData) {
      return res.status(404).json({
        success: false,
        message: '파일을 찾을 수 없습니다.'
      });
    }

    // 파일 시스템에서 파일 삭제
    if (fs.existsSync(fileData.file_path)) {
      fs.unlinkSync(fileData.file_path);
    }

    // 데이터베이스에서 파일 정보 삭제
    const { error: deleteError } = await supabase
      .from('uploaded_files')
      .delete()
      .eq('id', fileId);

    if (deleteError) {
      throw deleteError;
    }

    res.json({
      success: true,
      message: '파일이 삭제되었습니다.'
    });

  } catch (error) {
    console.error('파일 삭제 에러:', error);
    res.status(500).json({
      success: false,
      message: '파일 삭제에 실패했습니다.'
    });
  }
};

// 사업자 등록 정보 조회/생성 엔드포인트
const getOrCreateBusinessRegistration = async (req, res) => {
  try {
    const { shopId } = req.params;
    const businessData = req.body;

    // 기존 사업자 등록 정보 조회
    const { data: existingData, error: fetchError } = await supabase
      .from('business_registrations')
      .select('*')
      .eq('shop_id', shopId)
      .single();

    if (existingData && !fetchError) {
      return res.json({
        success: true,
        businessRegistration: existingData,
        isNew: false
      });
    }

    // 새로운 사업자 등록 정보 생성
    const { data: newData, error: createError } = await supabase
      .from('business_registrations')
      .insert({
        shop_id: parseInt(shopId),
        business_number: businessData.businessNumber || null,
        business_type: businessData.businessType || null,
        representative_name: businessData.representativeName || null,
        business_address: businessData.businessAddress || null,
        phone_number: businessData.phoneNumber || null,
        email: businessData.email || null,
        business_status: 'UNKNOWN',
        verification_source: 'MANUAL',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (createError) {
      throw createError;
    }

    res.json({
      success: true,
      businessRegistration: newData,
      isNew: true
    });

  } catch (error) {
    console.error('사업자 등록 정보 처리 에러:', error);
    res.status(500).json({
      success: false,
      message: '사업자 등록 정보 처리에 실패했습니다.'
    });
  }
};

// 웹 분석 결과 저장 엔드포인트
const storeWebAnalysis = async (req, res) => {
  try {
    const { shopId } = req.params;
    const webAnalysis = req.body;

    const { data, error } = await supabase
      .from('web_analysis')
      .insert({
        shop_id: parseInt(shopId),
        suspicious_keywords: JSON.stringify(webAnalysis.suspiciousKeywords || []),
        price_analysis: JSON.stringify(webAnalysis.priceAnalysis || {}),
        technical_analysis: JSON.stringify(webAnalysis.technicalAnalysis || {}),
        domain_analysis: JSON.stringify(webAnalysis.domainAnalysis || {}),
        analysis_date: new Date().toISOString(),
        analysis_source: 'AUTO',
        confidence_score: webAnalysis.confidenceScore || 0
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      analysisId: data.id
    });

  } catch (error) {
    console.error('웹 분석 결과 저장 에러:', error);
    res.status(500).json({
      success: false,
      message: '웹 분석 결과 저장에 실패했습니다.'
    });
  }
};

// AI 분석 캐시 조회 엔드포인트
const getAIAnalysisCache = async (req, res) => {
  try {
    const { shopId, analysisType } = req.params;

    const { data, error } = await supabase
      .from('ai_analysis_cache')
      .select('*')
      .eq('shop_id', shopId)
      .eq('analysis_type', analysisType)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return res.status(404).json({
        success: false,
        message: '캐시를 찾을 수 없습니다.'
      });
    }

    res.json({
      success: true,
      analysisResult: JSON.parse(data.analysis_result),
      isExpired: new Date(data.expires_at) < new Date()
    });

  } catch (error) {
    console.error('AI 분석 캐시 조회 에러:', error);
    res.status(500).json({
      success: false,
      message: 'AI 분석 캐시 조회에 실패했습니다.'
    });
  }
};

// AI 분석 캐시 저장 엔드포인트
const storeAIAnalysisCache = async (req, res) => {
  try {
    const { shopId, analysisType, analysisResult, expiresInHours } = req.body;

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + (expiresInHours || 24));

    const { data, error } = await supabase
      .from('ai_analysis_cache')
      .insert({
        shop_id: parseInt(shopId),
        analysis_type: analysisType,
        analysis_result: JSON.stringify(analysisResult),
        analysis_date: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      cacheId: data.id
    });

  } catch (error) {
    console.error('AI 분석 캐시 저장 에러:', error);
    res.status(500).json({
      success: false,
      message: 'AI 분석 캐시 저장에 실패했습니다.'
    });
  }
};

// 증빙 파일 검증 엔드포인트
const verifyEvidenceFile = async (req, res) => {
  try {
    const { fileId } = req.params;
    const { verificationStatus } = req.body;

    if (!['PENDING', 'VERIFIED', 'REJECTED'].includes(verificationStatus)) {
      return res.status(400).json({
        success: false,
        message: '유효하지 않은 검증 상태입니다.'
      });
    }

    const { data, error } = await supabase
      .from('uploaded_files')
      .update({ verification_status: verificationStatus })
      .eq('id', fileId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    // 관련 리포트의 검증 점수 업데이트
    const verificationScore = verificationStatus === 'VERIFIED' ? 100 : 
                             verificationStatus === 'REJECTED' ? 0 : 50;

    await supabase
      .from('reports')
      .update({
        evidence_verified: verificationStatus === 'VERIFIED',
        verification_score: verificationScore
      })
      .eq('id', data.report_id);

    res.json({
      success: true,
      message: '파일 검증 상태가 업데이트되었습니다.'
    });

  } catch (error) {
    console.error('파일 검증 에러:', error);
    res.status(500).json({
      success: false,
      message: '파일 검증에 실패했습니다.'
    });
  }
};

module.exports = {
  upload,
  uploadEvidenceFiles,
  deleteEvidenceFile,
  getOrCreateBusinessRegistration,
  storeWebAnalysis,
  getAIAnalysisCache,
  storeAIAnalysisCache,
  verifyEvidenceFile
};
