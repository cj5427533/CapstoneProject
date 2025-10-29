import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { createReport, updateReport, getUserShopReport } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';

export function ReportPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [existingReportId, setExistingReportId] = useState<number | null>(null);
  const [isLoadingExisting, setIsLoadingExisting] = useState(false);
  
  const [formData, setFormData] = useState({
    shopUrl: searchParams.get('url') || '',
    categories: [] as string[],
    description: '',
    agreeToTerms: false,
    // 증빙 관련 필드 추가
    evidenceType: 'NONE' as 'NONE' | 'RECEIPT' | 'CONTRACT' | 'PAYMENT_RECORD' | 'COMMUNICATION',
    evidenceFiles: [] as File[],
    reportType: 'GENERAL_REVIEW' as 'GENERAL_REVIEW' | 'VERIFIED_COMPLAINT'
  });

  // 기존 신고 확인
  useEffect(() => {
    const checkExistingReport = async () => {
      if (isAuthenticated && user && formData.shopUrl) {
        setIsLoadingExisting(true);
        try {
          const existingReport = await getUserShopReport(user.username, formData.shopUrl);
          
          if (existingReport) {
            // 기존 신고가 있으면 수정 모드로 전환
            setIsEditMode(true);
            setExistingReportId(existingReport.id);
            setFormData({
              shopUrl: formData.shopUrl,
              categories: JSON.parse(existingReport.categories),
              description: existingReport.description,
              agreeToTerms: true,
              evidenceType: 'NONE',
              evidenceFiles: [],
              reportType: 'GENERAL_REVIEW'
            });
          }
        } catch (error) {
          console.error('기존 신고 확인 에러:', error);
        } finally {
          setIsLoadingExisting(false);
        }
      }
    };

    checkExistingReport();
  }, [isAuthenticated, user?.username, formData.shopUrl]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    });
  };

  const handleCategoryChange = (category: string) => {
    setFormData({
      ...formData,
      categories: formData.categories.includes(category)
        ? formData.categories.filter(c => c !== category)
        : [...formData.categories, category]
    });
  };

  // 증빙 파일 업로드 핸들러
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    
    const validFiles = files.filter(file => {
      if (file.size > maxSize) {
        toast.error(`${file.name}은(는) 10MB를 초과합니다.`);
        return false;
      }
      if (!allowedTypes.includes(file.type)) {
        toast.error(`${file.name}은(는) 지원되지 않는 파일 형식입니다.`);
        return false;
      }
      return true;
    });
    
    setFormData({
      ...formData,
      evidenceFiles: [...formData.evidenceFiles, ...validFiles]
    });
  };

  // 증빙 파일 삭제 핸들러
  const removeEvidenceFile = (index: number) => {
    setFormData({
      ...formData,
      evidenceFiles: formData.evidenceFiles.filter((_, i) => i !== index)
    });
  };

  // 증빙 유형 변경 핸들러
  const handleEvidenceTypeChange = (evidenceType: 'NONE' | 'RECEIPT' | 'CONTRACT' | 'PAYMENT_RECORD' | 'COMMUNICATION') => {
    const reportType = evidenceType === 'NONE' ? 'GENERAL_REVIEW' : 'VERIFIED_COMPLAINT';
    setFormData({
      ...formData,
      evidenceType,
      reportType
    });
  };

  // URL 정규화 함수 (개선된 버전)
  const normalizeUrl = (url: string): string => {
    if (!url) return url;
    
    // 공백 제거 및 정리
    url = url.trim().replace(/\s+/g, '');
    
    // 빈 문자열 체크
    if (!url) return url;
    
    // 일반적인 오타 수정
    url = url.replace(/^htps:\/\//, 'https://');
    url = url.replace(/^http:\/\//, 'http://');
    
    // 프로토콜이 없으면 https:// 추가
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    
    // 이중 점 제거
    url = url.replace(/\.{2,}/g, '.');
    
    // 잘못된 슬래시 정리
    url = url.replace(/\/{2,}/g, '/');
    
    return url;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // URL 정규화
    const normalizedUrl = normalizeUrl(formData.shopUrl);
    setFormData(prev => ({ ...prev, shopUrl: normalizedUrl }));
    
    // 로그인 체크
    if (!isAuthenticated) {
      toast.error('피해 사례를 제보하려면 로그인해야 합니다.');
      setShowLoginModal(true);
      return;
    }
    
    if (formData.categories.length === 0) {
      toast.error('최소 하나의 카테고리를 선택해주세요.');
      return;
    }
    
    if (!formData.description.trim()) {
      toast.error('상세 설명을 입력해주세요.');
      return;
    }
    
    if (!formData.agreeToTerms) {
      toast.error('피해 사례 제보 시 주의사항에 동의해주세요.');
      return;
    }
    
    try {
      if (isEditMode && existingReportId) {
        // 수정 모드
        await updateReport(existingReportId, {
          categories: formData.categories,
          description: formData.description,
          reporterName: user?.username || ''
        });
        
        toast.success('피해 사례 제보가 수정되었습니다. 검색 결과에서 확인할 수 있습니다.');
      } else {
        // 신규 피해 사례 제보 모드 (증빙 정보 포함)
        const result = await createReport({
          shopUrl: formData.shopUrl,
          categories: formData.categories,
          description: formData.description,
          reporterName: user?.username || '익명',
          reporterPhone: user?.phoneNumber || ''
        });

        // 중복 신고인 경우
        if (result.isDuplicate) {
          const confirmEdit = confirm(
            '이미 이 쇼핑몰에 대한 피해 사례 제보가 존재합니다.\n기존 제보를 수정하시겠습니까?'
          );
          
          if (confirmEdit) {
            // 기존 신고를 불러와서 수정 모드로 전환
            const existingReport = await getUserShopReport(user?.username || '', formData.shopUrl);
            if (existingReport) {
              setIsEditMode(true);
              setExistingReportId(existingReport.id);
              setFormData({
                shopUrl: formData.shopUrl,
                categories: JSON.parse(existingReport.categories),
                description: existingReport.description,
                agreeToTerms: true,
                evidenceType: 'NONE',
                evidenceFiles: [],
                reportType: 'GENERAL_REVIEW'
              });
            }
            return;
          } else {
            return;
          }
        }
        
        toast.success('피해 사례 제보가 제출되었습니다. 검색 결과에서 확인할 수 있으며, 홈페이지의 주의가 필요한 쇼핑몰 목록에 반영됩니다.');
      }
      
      // 폼 초기화
      setFormData({
        shopUrl: '',
        categories: [],
        description: '',
        agreeToTerms: false,
        evidenceType: 'NONE',
        evidenceFiles: [],
        reportType: 'GENERAL_REVIEW'
      });
      setIsEditMode(false);
      setExistingReportId(null);
      
      // 검색 결과 페이지로 이동
      navigate(`/search?url=${encodeURIComponent(formData.shopUrl)}`);
    } catch (error) {
      console.error('신고 제출/수정 에러:', error);
      toast.error('피해 사례 제보에 실패했습니다. 잠시 후 다시 시도해주세요.');
    }
  };

  const handleLoginClick = () => {
    setShowLoginModal(false);
    navigate('/login');
  };

  const handleSignupClick = () => {
    setShowLoginModal(false);
    navigate('/signup');
  };

  const categories = [
    '배송 문제',
    '상품 불일치',
    '환불 문제',
    '고객 서비스',
    '사기/피싱',
    '품질 문제',
    '기타'
  ];

  return (
    <div className="report-page">
      {/* 로그인 모달 */}
      {showLoginModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>로그인이 필요합니다</h2>
              <button 
                className="modal-close"
                onClick={() => setShowLoginModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <p>피해 사례를 제보하려면 로그인이 필요합니다.</p>
              <p>계정이 없으시다면 회원가입을 진행해주세요.</p>
            </div>
            <div className="modal-footer">
              <button 
                className="modal-button secondary"
                onClick={() => setShowLoginModal(false)}
              >
                취소
              </button>
              <button 
                className="modal-button primary"
                onClick={handleSignupClick}
              >
                회원가입
              </button>
              <button 
                className="modal-button primary"
                onClick={handleLoginClick}
              >
                로그인
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="report-container">
        <div className="report-header">
          <h1>{isEditMode ? '쇼핑몰 피해 사례 제보 수정하기' : '쇼핑몰 피해 사례 제보하기'}</h1>
            <p>
              {isEditMode 
                ? '기존 피해 사례 제보 내용을 수정할 수 있습니다.' 
                : '피해사례를 제보하여 다른 사용자들에게 도움을 주세요. 구체적인 정보를 제공하면 더욱 도움이 됩니다.'}
            </p>
          {isAuthenticated && (
            <div className="user-info">
              <span>로그인된 사용자: {user?.username}</span>
              {isEditMode && (
                <span style={{ marginLeft: '10px', color: '#ff8c00', fontWeight: 'bold' }}>
                  [수정 모드]
                </span>
              )}
            </div>
          )}
          {isLoadingExisting && (
            <div style={{ marginTop: '10px', color: '#666' }}>
              기존 피해 사례 제보를 확인하는 중...
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="report-form">
          <div className="form-section">
            <h3>피해 사례 제보 대상 쇼핑몰</h3>
            <div className="form-group">
              <label htmlFor="shopUrl">쇼핑몰 URL *</label>
              <input
                type="text"
                id="shopUrl"
                name="shopUrl"
                value={formData.shopUrl}
                onChange={handleChange}
                required
                disabled={isEditMode}
                className="form-input"
                placeholder="example.com, www.example.com, https://example.com"
                style={isEditMode ? { backgroundColor: '#f0f0f0', cursor: 'not-allowed' } : {}}
              />
              {isEditMode && (
                <small style={{ color: '#666', fontSize: '0.85em' }}>
                  수정 모드에서는 URL을 변경할 수 없습니다.
                </small>
              )}
            </div>
          </div>

          <div className="form-section">
            <h3>피해 사례 제보 내용</h3>
            <div className="form-group">
              <label>피해 사례 카테고리 * (복수 선택 가능)</label>
              <div className="checkbox-group">
                {categories.map((category) => (
                  <label key={category} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.categories.includes(category)}
                      onChange={() => handleCategoryChange(category)}
                    />
                    <span className="checkbox-text">{category}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="description">상세 설명 *</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
                className="form-textarea"
                rows={6}
                placeholder="피해사례를 자세히 설명해주세요. 구체적인 날짜, 금액, 연락처 등을 포함하면 도움이 됩니다."
              />
            </div>
          </div>

          {/* 증빙 자료 섹션 */}
          <div className="form-section">
            <h3>증빙 자료 첨부 (선택사항)</h3>
            <div className="evidence-notice">
              <p>📋 증빙 자료를 첨부하면 피해 사례 제보의 신뢰도가 크게 향상됩니다</p>
              <div className="evidence-benefits">
                <span>✅ 증빙된 제보는 높은 신뢰도로 평가됩니다</span>
                <span>✅ 다른 사용자들에게 더욱 신뢰할 수 있는 정보 제공</span>
                <span>✅ 쇼핑몰 신뢰도 평가에 중요한 역할</span>
              </div>
            </div>
            
            <div className="form-group">
              <label>증빙 자료 유형</label>
              <select 
                value={formData.evidenceType} 
                onChange={(e) => handleEvidenceTypeChange(e.target.value as any)}
                className="form-select"
              >
                <option value="NONE">증빙 자료 없음</option>
                <option value="RECEIPT">구매 영수증</option>
                <option value="CONTRACT">계약서</option>
                <option value="PAYMENT_RECORD">입금 내역</option>
                <option value="COMMUNICATION">고객센터 대화 기록</option>
              </select>
            </div>

            {formData.evidenceType !== 'NONE' && (
              <div className="form-group">
                <label htmlFor="evidenceFiles">증빙 파일 업로드</label>
                <div className="file-upload-container">
                  <input
                    type="file"
                    id="evidenceFiles"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    onChange={handleFileUpload}
                    className="file-input"
                  />
                  <div className="file-upload-info">
                    <p>📎 PDF, 이미지, 문서 파일만 업로드 가능 (최대 10MB)</p>
                    <p>🔒 업로드된 파일은 안전하게 보관되며 개인정보는 보호됩니다</p>
                    <p>⚡ 검증 후 신뢰도 평가에 반영됩니다</p>
                  </div>
                </div>
                
                {formData.evidenceFiles.length > 0 && (
                  <div className="uploaded-files">
                    <h4>첨부된 파일 ({formData.evidenceFiles.length}개):</h4>
                    <div className="file-list">
                      {formData.evidenceFiles.map((file, index) => (
                        <div key={index} className="file-item">
                          <div className="file-info">
                            <span className="file-name">{file.name}</span>
                            <span className="file-size">({(file.size / 1024 / 1024).toFixed(2)}MB)</span>
                          </div>
                          <button 
                            type="button"
                            onClick={() => removeEvidenceFile(index)}
                            className="remove-file-btn"
                          >
                            삭제
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {formData.evidenceType !== 'NONE' && formData.evidenceFiles.length > 0 && (
              <div className="evidence-type-info">
                <div className="info-box">
                  <h4>증빙 유형별 신뢰도 평가:</h4>
                  <ul>
                    <li>📄 구매 영수증: 높은 신뢰도</li>
                    <li>📋 계약서: 매우 높은 신뢰도</li>
                    <li>💰 입금 내역: 최고 신뢰도</li>
                    <li>💬 고객센터 대화: 높은 신뢰도</li>
                  </ul>
                </div>
              </div>
            )}
          </div>

          <div className="form-notice">
            <div className="terms-checkbox">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="agreeToTerms"
                  checked={formData.agreeToTerms}
                  onChange={handleChange}
                  required
                />
                <span className="checkbox-text">
                  <strong>피해 사례 제보 시 주의사항에 동의합니다 *</strong>
                </span>
              </label>
              <div className="terms-content">
                <p>피해 사례 제보 시 다음 사항에 동의하는 것으로 간주됩니다:</p>
                <ul>
                  <li>허위 제보는 법적 책임을 질 수 있습니다.</li>
                  <li>개인정보는 신고자 본인에게만 노출됩니다.</li>
                  <li>제보 내용은 검토 후 게시됩니다.</li>
                  <li>악의적인 제보는 삭제될 수 있습니다.</li>
                  <li>제출된 제보는 제보자 확인을 위해 저장됩니다.</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="form-actions">
            <Link to="/" className="cancel-button">
              취소
            </Link>
            <button type="submit" className="submit-button">
              {isEditMode ? '피해 사례 제보 수정' : '피해 사례 제보 제출'}
            </button>
          </div>
        </form>
      </div>

      {/* 증빙 관련 스타일 */}
      <style>{`
        .evidence-section {
          background: #f8f9fa;
          border: 2px solid #e3f2fd;
          border-radius: 8px;
          padding: 1.5rem;
          margin: 1.5rem 0;
        }

        .evidence-section h3 {
          color: #1976d2;
          margin-bottom: 1rem;
          font-size: 1.2rem;
        }

        .evidence-notice {
          background: #e3f2fd;
          padding: 1rem;
          border-radius: 6px;
          margin-bottom: 1.5rem;
        }

        .evidence-notice p {
          margin: 0.5rem 0;
          color: #1976d2;
          font-size: 0.9rem;
        }

        .evidence-type-selector select {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 1rem;
          background: white;
        }

        .file-upload-container {
          border: 2px dashed #1976d2;
          border-radius: 8px;
          padding: 2rem;
          text-align: center;
          background: #f8f9fa;
          transition: all 0.3s ease;
        }

        .file-upload-container:hover {
          background: #e3f2fd;
          border-color: #1565c0;
        }

        .file-input {
          display: none;
        }

        .file-upload-label {
          display: inline-block;
          padding: 0.75rem 1.5rem;
          background: #1976d2;
          color: white;
          border-radius: 4px;
          cursor: pointer;
          font-size: 1rem;
          transition: background 0.3s ease;
        }

        .file-upload-label:hover {
          background: #1565c0;
        }

        .file-notice {
          margin-top: 0.5rem;
          color: #666;
          font-size: 0.85rem;
        }

        .uploaded-files {
          margin-top: 1rem;
          padding: 1rem;
          background: white;
          border-radius: 6px;
          border: 1px solid #ddd;
        }

        .uploaded-files h4 {
          margin: 0 0 1rem 0;
          color: #333;
          font-size: 1rem;
        }

        .file-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem;
          background: #f8f9fa;
          border-radius: 4px;
          margin-bottom: 0.5rem;
        }

        .file-name {
          font-weight: 500;
          color: #333;
        }

        .file-size {
          color: #666;
          font-size: 0.85rem;
        }

        .file-remove-btn {
          background: #dc3545;
          color: white;
          border: none;
          padding: 0.25rem 0.75rem;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.85rem;
          transition: background 0.3s ease;
        }

        .file-remove-btn:hover {
          background: #c82333;
        }

        .evidence-benefits {
          margin-top: 1rem;
          padding: 1rem;
          background: #e8f5e8;
          border-radius: 6px;
          border-left: 4px solid #28a745;
        }

        .evidence-benefits h4 {
          margin: 0 0 0.75rem 0;
          color: #155724;
          font-size: 1rem;
        }

        .evidence-benefits ul {
          margin: 0;
          padding-left: 1.5rem;
        }

        .evidence-benefits li {
          margin: 0.5rem 0;
          color: #155724;
          font-size: 0.9rem;
        }

        @media (max-width: 768px) {
          .evidence-section {
            padding: 1rem;
          }

          .file-upload-container {
            padding: 1.5rem;
          }

          .file-item {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.5rem;
          }

          .file-remove-btn {
            align-self: flex-end;
          }
        }
      `}</style>
    </div>
  );
}
