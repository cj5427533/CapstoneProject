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
    agreeToTerms: false
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
              agreeToTerms: true
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 로그인 체크
    if (!isAuthenticated) {
      toast.error('신고를 하려면 로그인이 필요합니다.');
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
      toast.error('신고 시 주의사항에 동의해주세요.');
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
        
        toast.success('신고가 수정되었습니다. 검색 결과 페이지에서 확인할 수 있습니다.');
      } else {
        // 신규 신고 모드
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
            '이미 이 쇼핑몰에 대한 신고가 존재합니다.\n기존 신고를 수정하시겠습니까?'
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
                agreeToTerms: true
              });
            }
            return;
          } else {
            return;
          }
        }
        
        toast.success('신고가 제출되었습니다. 검색 결과 페이지에서 확인할 수 있으며, 홈페이지 위험 페이지에 반영됩니다.');
      }
      
      // 폼 초기화
      setFormData({
        shopUrl: '',
        categories: [],
        description: '',
        agreeToTerms: false
      });
      setIsEditMode(false);
      setExistingReportId(null);
      
      // 검색 결과 페이지로 이동
      navigate(`/search?url=${encodeURIComponent(formData.shopUrl)}`);
    } catch (error) {
      console.error('신고 제출/수정 에러:', error);
      toast.error(error instanceof Error ? error.message : '신고 제출에 실패했습니다. 다시 시도해주세요.');
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
              <p>신고를 하려면 로그인이 필요합니다.</p>
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
          <h1>{isEditMode ? '쇼핑몰 신고 수정하기' : '쇼핑몰 신고하기'}</h1>
          <p>
            {isEditMode 
              ? '기존 신고 내용을 수정할 수 있습니다.' 
              : '피해사례를 신고하여 다른 사용자들에게 도움을 주세요.'}
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
              기존 신고를 확인하는 중...
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="report-form">
          <div className="form-section">
            <h3>신고 대상 쇼핑몰</h3>
            <div className="form-group">
              <label htmlFor="shopUrl">쇼핑몰 URL *</label>
              <input
                type="url"
                id="shopUrl"
                name="shopUrl"
                value={formData.shopUrl}
                onChange={handleChange}
                required
                disabled={isEditMode}
                className="form-input"
                placeholder="https://example.com"
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
            <h3>신고 내용</h3>
            <div className="form-group">
              <label>신고 카테고리 * (복수 선택 가능)</label>
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
                  <strong>신고 시 주의사항에 동의합니다 *</strong>
                </span>
              </label>
              <div className="terms-content">
                <p>신고 제출 시 다음 사항에 동의하는 것으로 간주됩니다:</p>
                <ul>
                  <li>허위 신고는 법적 책임을 질 수 있습니다.</li>
                  <li>개인정보는 신고자 본인에게만 노출됩니다.</li>
                  <li>신고 내용은 검토 후 게시됩니다.</li>
                  <li>악의적인 신고는 삭제될 수 있습니다.</li>
                  <li>제출된 신고는 신고자 확인을 위해 저장됩니다.</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="form-actions">
            <Link to="/" className="cancel-button">
              취소
            </Link>
            <button type="submit" className="submit-button">
              {isEditMode ? '신고 수정' : '신고 제출'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
