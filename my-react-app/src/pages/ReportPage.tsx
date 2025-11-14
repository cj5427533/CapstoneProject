import { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { updateReport, getUserShopReport } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { normalizeUrl } from '../utils/url';

export function ReportPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [existingReportId, setExistingReportId] = useState<number | null>(null);
  const [isLoadingExisting, setIsLoadingExisting] = useState(false);
  
  // 신고 방법별 상태
  const [_selectedMethod, _setSelectedMethod] = useState<'screenshot' | 'text' | 'email' | null>(null);
  const [screenshotFiles, setScreenshotFiles] = useState<File[]>([]);
  const [messageText, setMessageText] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [errors, setErrors] = useState({
    screenshot: '',
    text: ''
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const [formData, setFormData] = useState({
    shopUrl: searchParams.get('url') || '',
    categories: [] as string[],
    description: '',
    agreeToTerms: false,
    evidenceFiles: [] as File[],
    reportType: 'VERIFIED_COMPLAINT' as 'GENERAL_REVIEW' | 'VERIFIED_COMPLAINT'
  });

  // 기존 신고 확인
  useEffect(() => {
    const checkExistingReport = async () => {
      if (isAuthenticated && user && formData.shopUrl) {
        setIsLoadingExisting(true);
        try {
          const existingReport = await getUserShopReport(user.username, formData.shopUrl);
          
          if (existingReport) {
            setIsEditMode(true);
            setExistingReportId(existingReport.id);
            setFormData({
              shopUrl: formData.shopUrl,
              categories: JSON.parse(existingReport.categories),
              description: existingReport.description,
              agreeToTerms: true,
              evidenceFiles: [],
              reportType: 'VERIFIED_COMPLAINT'
            });
          }
        } catch (error) {
          console.error('기존 신고 확인 오류:', error);
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

  // 드래그 앤 드롭 핸들러
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    
    const validFiles = files.filter(file => {
      if (file.size > maxSize) {
        toast.error(`${file.name}은(는) 10MB를 초과합니다.`);
        return false;
      }
      if (!allowedTypes.includes(file.type)) {
        toast.error(`${file.name}은(는) 지원되지 않는 파일 형식입니다. PNG 또는 JPG만 가능합니다.`);
        return false;
      }
      return true;
    });
    
    if (validFiles.length === 0) {
      return;
    }
    
    // 상태 업데이트만 하고 자동 제출하지 않음
    setScreenshotFiles(prev => [...prev, ...validFiles]);
    setFormData(prev => ({
      ...prev,
      evidenceFiles: [...prev.evidenceFiles, ...validFiles]
    }));
    setErrors({ ...errors, screenshot: '' });
  };

  // 파일 업로드 핸들러
  const _handleFileUpload = async (files: File[] | FileList): Promise<void> => {
    const fileArray = Array.from(files);
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    
    const validFiles = fileArray.filter(file => {
      if (file.size > maxSize) {
        toast.error(`${file.name}은(는) 10MB를 초과합니다.`);
        return false;
      }
      if (!allowedTypes.includes(file.type)) {
        toast.error(`${file.name}은(는) 지원되지 않는 파일 형식입니다. PNG 또는 JPG만 가능합니다.`);
        return false;
      }
      return true;
    });
    
    if (validFiles.length === 0) {
      return;
    }
    
    setScreenshotFiles(prev => [...prev, ...validFiles]);
    setFormData(prev => ({
      ...prev,
      evidenceFiles: [...prev.evidenceFiles, ...validFiles]
    }));
    setErrors({ ...errors, screenshot: '' });
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const fileArray = Array.from(e.target.files);
      const maxSize = 10 * 1024 * 1024; // 10MB
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
      
      const validFiles = fileArray.filter(file => {
        if (file.size > maxSize) {
          toast.error(`${file.name}은(는) 10MB를 초과합니다.`);
          return false;
        }
        if (!allowedTypes.includes(file.type)) {
          toast.error(`${file.name}은(는) 지원되지 않는 파일 형식입니다. PNG 또는 JPG만 가능합니다.`);
          return false;
        }
        return true;
      });
      
      if (validFiles.length === 0) {
        e.target.value = ''; // 파일 입력 초기화
        return;
      }
      
      // 상태 업데이트만 하고 자동 제출하지 않음
      setScreenshotFiles(prev => [...prev, ...validFiles]);
      setFormData(prev => ({
        ...prev,
        evidenceFiles: [...prev.evidenceFiles, ...validFiles]
      }));
      setErrors({ ...errors, screenshot: '' });
      
      // 파일 입력 초기화 (같은 파일을 다시 선택할 수 있도록)
      e.target.value = '';
    }
  };

  const removeScreenshotFile = (index: number) => {
    const newFiles = screenshotFiles.filter((_, i) => i !== index);
    setScreenshotFiles(newFiles);
    setFormData({
      ...formData,
      evidenceFiles: formData.evidenceFiles.filter((_, i) => i !== index)
    });
  };

  // 메시지 붙여넣기 핸들러
  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessageText(e.target.value);
    if (e.target.value.trim()) {
      setErrors({ ...errors, text: '' });
      setFormData({
        ...formData,
        description: e.target.value
      });
    }
  };

  // URL 정규화 함수는 utils/url.ts에서 import

  // 스크린샷 제출
  const _handleScreenshotSubmit = async () => {
    if (screenshotFiles.length === 0) {
      setErrors({ ...errors, screenshot: '최소 하나의 이미지를 업로드해주세요.' });
      return;
    }
    await handleSubmit('screenshot');
  };

  // 텍스트 제출
  const handleTextSubmit = async () => {
    if (!messageText.trim()) {
      setErrors({ ...errors, text: '사기 내용을 입력한 후 제출해주세요.' });
      return;
    }
    await handleSubmit('text');
  };

  // 파일을 직접 받아서 제출하는 함수
  const _handleSubmitWithFiles = async (_files: File[], evidenceFiles: File[]) => {
    // URL 정규화
    const normalizedUrl = normalizeUrl(formData.shopUrl);
    const currentFormData = { ...formData, shopUrl: normalizedUrl, evidenceFiles };

    // 로그인 체크
    if (!isAuthenticated) {
      toast.error('피해 사례를 제보하려면 로그인이 필요합니다.');
      setShowLoginModal(true);
      return;
    }

    // 증빙 자료 필수 체크
    if (evidenceFiles.length === 0 && !messageText.trim()) {
      toast.error('증빙 자료를 첨부해주세요.');
      return;
    }

    if (currentFormData.categories.length === 0) {
      toast.error('최소 하나의 카테고리를 선택해주세요.');
      return;
    }

    if (!currentFormData.description.trim()) {
      toast.error('상세 설명을 입력해주세요.');
      return;
    }

    if (!currentFormData.agreeToTerms) {
      toast.error('피해 사례 제보 시 주의사항에 동의해주세요.');
      return;
    }

    await submitReport(currentFormData);
  };

  const submitReport = async (dataToSubmit: typeof formData) => {
    try {
      if (isEditMode && existingReportId) {
        await updateReport(existingReportId, {
          categories: dataToSubmit.categories,
          description: dataToSubmit.description,
          reporterName: user?.username || ''
        });
        
        toast.success('피해 사례 제보가 수정되었으며 검토 결과를 기다려주세요.');
      } else {
        // FormData를 사용하여 파일과 함께 전송
        const formDataToSend = new FormData();
        formDataToSend.append('shopUrl', dataToSubmit.shopUrl);
        formDataToSend.append('categories', JSON.stringify(dataToSubmit.categories));
        formDataToSend.append('description', dataToSubmit.description);
        formDataToSend.append('reporterName', user?.username || '익명');
        formDataToSend.append('reporterPhone', user?.phoneNumber || '');
        
        // 스크린샷 파일 추가
        dataToSubmit.evidenceFiles.forEach((file) => {
          formDataToSend.append('evidenceFiles', file);
        });
        
        // 파일 업로드를 위해 직접 fetch 호출
        const token = localStorage.getItem('token');
        // API URL 설정 (api.ts와 동일한 방식)
        let apiUrl = 'http://localhost:3001/api';
        if (typeof window !== 'undefined') {
          const hostname = window.location.hostname;
          const protocol = window.location.protocol;
          if (hostname === 'localhost' || hostname === '127.0.0.1') {
            apiUrl = 'http://localhost:3001/api';
          } else {
            const envApiUrl = import.meta.env.VITE_API_URL;
            apiUrl = envApiUrl || `${protocol}//${hostname}:3001/api`;
          }
        }
        
        const response = await fetch(`${apiUrl}/reports`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            // FormData를 사용할 때는 Content-Type을 설정하지 않음
          },
          body: formDataToSend
        });

        let responseData;
        try {
          const text = await response.text();
          responseData = text ? JSON.parse(text) : {};
        } catch (parseError) {
          console.error('응답 파싱 오류:', parseError);
          throw new Error('서버 응답을 읽을 수 없습니다.');
        }

        if (!response.ok) {
          console.error('서버 응답 오류:', response.status, responseData);
          
          if (response.status === 409 && responseData.isDuplicate) {
            const confirmEdit = confirm(
              '해당 쇼핑몰에 대한 피해 사례 제보가 존재합니다.\n기존 제보를 수정하시겠습니까?'
            );
            
            if (confirmEdit) {
              const existingReport = await getUserShopReport(user?.username || '', dataToSubmit.shopUrl);
              if (existingReport) {
                setIsEditMode(true);
                setExistingReportId(existingReport.id);
                setFormData({
                  shopUrl: dataToSubmit.shopUrl,
                  categories: JSON.parse(existingReport.categories),
                  description: existingReport.description,
                  agreeToTerms: true,
                  evidenceFiles: [],
                  reportType: 'VERIFIED_COMPLAINT'
                });
              }
              return;
            } else {
              return;
            }
          }
          throw new Error(responseData.message || responseData.error || `서버 오류 (${response.status}): ${response.statusText}`);
        }

        toast.success('피해 사례 제보가 접수되었습니다. 검토 결과를 기다려주세요. 검토 후 쇼핑몰 목록에 반영됩니다.');
      }
      
      // 폼 초기화
      setFormData({
        shopUrl: '',
        categories: [],
        description: '',
        agreeToTerms: false,
        evidenceFiles: [],
        reportType: 'VERIFIED_COMPLAINT'
      });
      setScreenshotFiles([]);
      setMessageText('');
      setIsEditMode(false);
      setExistingReportId(null);
      
      navigate(`/search?url=${encodeURIComponent(normalizeUrl(dataToSubmit.shopUrl))}`);
    } catch (error) {
      console.error('신고 제출/수정 오류:', error);
      toast.error('피해 사례 제보에 실패했습니다. 다시 시도해주세요.');
    }
  };

  const handleSubmit = async (_method?: string) => {
    // URL 정규화
    const normalizedUrl = normalizeUrl(formData.shopUrl);
    setFormData(prev => ({ ...prev, shopUrl: normalizedUrl }));

    // 로그인 체크
    if (!isAuthenticated) {
      toast.error('피해 사례를 제보하려면 로그인이 필요합니다.');
      setShowLoginModal(true);
      return;
    }

    // 증빙 자료 필수 체크
    if (formData.evidenceFiles.length === 0 && !messageText.trim()) {
      toast.error('증빙 자료를 첨부해주세요.');
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
         await updateReport(existingReportId, {
           categories: formData.categories,
           description: formData.description,
           reporterName: user?.username || ''
         });
         
         toast.success('피해 사례 제보가 수정되었으며 검토 결과를 기다려주세요.');
               } else {
          // FormData를 사용하여 파일과 함께 전송
          const formDataToSend = new FormData();
          formDataToSend.append('shopUrl', formData.shopUrl);
          formDataToSend.append('categories', JSON.stringify(formData.categories));
          formDataToSend.append('description', formData.description);
          formDataToSend.append('reporterName', user?.username || '익명');
          formDataToSend.append('reporterPhone', user?.phoneNumber || '');
          
          // 스크린샷 파일 추가
          formData.evidenceFiles.forEach((file) => {
            formDataToSend.append('evidenceFiles', file);
          });
          
                     // 파일 업로드를 위해 직접 fetch 호출
           const token = localStorage.getItem('token');
           // API URL 설정 (api.ts와 동일한 방식)
           let apiUrl = 'http://localhost:3001/api';
           if (typeof window !== 'undefined') {
             const hostname = window.location.hostname;
             const protocol = window.location.protocol;
             if (hostname === 'localhost' || hostname === '127.0.0.1') {
               apiUrl = 'http://localhost:3001/api';
             } else {
               const envApiUrl = import.meta.env.VITE_API_URL;
               apiUrl = envApiUrl || `${protocol}//${hostname}:3001/api`;
             }
           }
           
           const response = await fetch(`${apiUrl}/reports`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              // FormData를 사용할 때는 Content-Type을 설정하지 않음
            },
            body: formDataToSend
          });

          let responseData;
          try {
            const text = await response.text();
            responseData = text ? JSON.parse(text) : {};
          } catch (parseError) {
            console.error('응답 파싱 오류:', parseError);
            throw new Error('서버 응답을 읽을 수 없습니다.');
          }

          if (!response.ok) {
            if (response.status === 409 && responseData.isDuplicate) {
              const confirmEdit = confirm(
                '해당 쇼핑몰에 대한 피해 사례 제보가 존재합니다.\n기존 제보를 수정하시겠습니까?'
              );
              
              if (confirmEdit) {
                const existingReport = await getUserShopReport(user?.username || '', formData.shopUrl);
                if (existingReport) {
                  setIsEditMode(true);
                  setExistingReportId(existingReport.id);
                  setFormData({
                    shopUrl: formData.shopUrl,
                    categories: JSON.parse(existingReport.categories),
                    description: existingReport.description,
                    agreeToTerms: true,
                    evidenceFiles: [],
                    reportType: 'VERIFIED_COMPLAINT'
                  });
                }
                return;
              } else {
                return;
              }
            }
            throw new Error(responseData.message || '신고 제출에 실패했습니다.');
          }

          
        
        toast.success('피해 사례 제보가 접수되었습니다. 검토 결과를 기다려주세요. 검토 후 쇼핑몰 목록에 반영됩니다.');
      }
      
      // 폼 초기화
      setFormData({
        shopUrl: '',
        categories: [],
        description: '',
        agreeToTerms: false,
        evidenceFiles: [],
        reportType: 'VERIFIED_COMPLAINT'
      });
      setScreenshotFiles([]);
      setMessageText('');
      setIsEditMode(false);
      setExistingReportId(null);
      
      navigate(`/search?url=${encodeURIComponent(normalizedUrl)}`);
    } catch (error) {
      console.error('신고 제출/수정 오류:', error);
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
      toast.error(`피해 사례 제보에 실패했습니다: ${errorMessage}`);
      console.error('상세 오류 정보:', {
        error,
        formData,
        evidenceFilesCount: formData.evidenceFiles.length
      });
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
    '스캠/피싱',
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
          <h1>사기 신고</h1>
        </div>

                 <form onSubmit={(e) => e.preventDefault()} className="report-form">
           {/* 쇼핑몰 URL 입력 */}
           <div className="form-section">
             <div className="method-header">
               <span className="method-number">1</span>
               <h3>피해 사례를 제보할 쇼핑몰</h3>
             </div>
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
               />
             </div>

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
           </div>

           {/* 신고 방법 카드들 */}
           {/* 방법 2: 스크린샷 업로드 */}
           <div className="report-method-card">
             <div className="method-header">
               <span className="method-number">2</span>
               <h3>스크린샷 업로드</h3>
             </div>
            <p className="method-description">PNG 또는 JPG 파일을 사용하세요.</p>
            
            <div
              className={`file-upload-area ${isDragging ? 'dragging' : ''}`}
              onDragEnter={handleDragEnter}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/png,image/jpeg,image/jpg"
                onChange={handleFileInputChange}
                className="file-input-hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="file-select-button"
                style={{
                  background: '#6495ED',
                  color: 'white',
                  border: 'none',
                  padding: '0.75rem 2rem',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  fontWeight: '500',
                  cursor: 'pointer',
                  marginBottom: '1rem',
                  boxShadow: '0 2px 4px rgba(100, 149, 237, 0.4)'
                }}
              >
                📁 내 컴퓨터에서 파일 찾기
              </button>
              <p className="upload-text">또는 여기로 드래그하세요</p>
            </div>

            {errors.screenshot && (
              <p className="error-message">{errors.screenshot}</p>
            )}

            {screenshotFiles.length > 0 && (
              <div className="uploaded-screenshots">
                {screenshotFiles.map((file, index) => (
                  <div key={index} className="screenshot-preview">
                    <img 
                      src={URL.createObjectURL(file)} 
                      alt={`Screenshot ${index + 1}`}
                      className="preview-image"
                    />
                    <button
                      type="button"
                      onClick={() => removeScreenshotFile(index)}
                      className="remove-screenshot-btn"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            {screenshotFiles.length > 0 && (
              <button
                type="button"
                onClick={() => handleSubmit('screenshot')}
                className="submit-method-btn"
                style={{ marginTop: '1rem' }}
              >
                신고 제출
              </button>
            )}
          </div>

                     {/* 방법 3: 사기 내용 설명 */}
           <div className="report-method-card">
             <div className="method-header">
               <span className="method-number">3</span>
               <h3>사기 내용 상세 설명</h3>
             </div>
            <p className="method-description">사기당한 내용을 자세히 설명해주세요. 사기 메시지나 이메일이 있다면 함께 붙여넣어 주시면 더욱 도움이 됩니다.</p>
            
            <textarea
              ref={textareaRef}
              value={messageText}
              onChange={handleMessageChange}
              className="message-textarea"
              placeholder="사기당한 내용을 자세히 설명해주세요. (예: 날짜, 금액, 사기 방법, 대화 내용 등)"
              rows={8}
            />

            {errors.text && (
              <p className="error-message">{errors.text}</p>
            )}


          </div>

                     {/* 주의사항 동의 */}
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
                   <strong>피해 사례 제보 시 주의사항에 동의합니다. *</strong>
                 </span>
               </label>
               <div className="terms-content">
                 <p>피해 사례 제보 시 다음 항목에 동의하는 것으로 간주됩니다:</p>
                 <ul>
                   <li>제출한 제보에 대한 법적 책임을 질 수 있습니다.</li>
                   <li>개인정보는 제고자의 본인에게만 제출됩니다.</li>
                   <li>제보 내용은 검토 후 게시됩니다.</li>
                   <li>허위인 제보는 삭제됩니다.</li>
                   <li>제출한 제보는 제보자의 동의 없이 변경됩니다.</li>
                 </ul>
                <p style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #ddd' }}>
                  <strong>⚠️ 안내사항:</strong> 게시 전 제출 내용은 익명화되며, 증빙 자료를 관리자가 직접 검수하기 때문에 시간이 소요될 수 있습니다.
                </p>
               </div>
             </div>
           </div>

          <div className="form-actions">
            <button
              type="button"
              onClick={handleTextSubmit}
              className="submit-method-btn"
            >
              신고 제출
            </button>
            <Link to="/" className="cancel-button">
              취소
            </Link>
          </div>
        </form>

        <div className="thank-you-message">
          다른 사람들의 안전에 도움을 주셔서 감사합니다.
        </div>
      </div>

      <style>{`
        .report-page {
          min-height: 100vh;
          background: #f5f5f5;
          padding: 2rem 1rem;
        }

        .report-container {
          max-width: 900px;
          margin: 0 auto;
          background: white;
          border-radius: 12px;
          padding: 2.5rem;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

                                   .report-header {
            text-align: center;
            margin-bottom: 3rem;
            background: #E0F2F7;
            padding: 2rem;
            border-radius: 12px;
          }

                  .report-header h1 {
            font-size: 2.5rem;
            font-weight: bold;
            color: #000000;
            margin-bottom: 0;
          }

        .subtitle {
          font-size: 1.1rem;
          color: #666;
          margin-top: 0.5rem;
        }

                 .form-section {
           margin-bottom: 2.5rem;
           padding: 2rem;
           background: #fafafa;
           border-radius: 12px;
           border: 1px solid #e0e0e0;
         }

         .form-section h3 {
           font-size: 1.2rem;
           color: #6495ED;
           margin-bottom: 1rem;
         }

        .form-group {
          margin-bottom: 1.5rem;
        }

        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 500;
          color: #333;
        }

        .form-input {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #ddd;
          border-radius: 8px;
          font-size: 1rem;
          box-sizing: border-box;
        }

                                                                         .form-input:focus {
             outline: none;
             border-color: #6495ED;
             box-shadow: 0 0 0 3px rgba(100, 149, 237, 0.2);
           }

        .checkbox-group {
          display: flex;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          cursor: pointer;
        }

        .checkbox-label input[type="checkbox"] {
          margin-right: 0.5rem;
        }

                           .checkbox-text {
            user-select: none;
          }

          .report-method-card {
            background: #fafafa;
            border-radius: 12px;
            padding: 2rem;
            border: 1px solid #e0e0e0;
            margin-bottom: 2rem;
            transition: all 0.3s ease;
          }

          .report-method-card:hover {
            border-color: #a5d6a7;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          }

                  .method-header {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            margin-bottom: 0.5rem;
          }

                                       .method-header h3 {
             margin: 0;
             font-size: 1.3rem;
             color: #6495ED;
           }

          .method-number {
            background: #6495ED;
            color: white;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 1.1rem;
          }

        .method-description {
          color: #666;
          margin-bottom: 1.5rem;
        }

        .file-upload-area {
          border: 2px dashed #ccc;
          border-radius: 8px;
          padding: 3rem 2rem;
          text-align: center;
          cursor: pointer;
          transition: all 0.3s ease;
          background: white;
          margin-bottom: 1rem;
        }

                                                                         .file-upload-area:hover,
           .file-upload-area.dragging {
             border-color: #6495ED;
             background: #E0F2F7;
           }

        .file-input-hidden {
          display: none;
        }

        .upload-text {
          color: #666;
          font-size: 1rem;
          margin: 0;
        }

        .uploaded-screenshots {
          display: flex;
          flex-wrap: wrap;
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .screenshot-preview {
          position: relative;
          width: 150px;
          height: 150px;
          border-radius: 8px;
          overflow: hidden;
          border: 2px solid #ddd;
        }

        .preview-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .remove-screenshot-btn {
          position: absolute;
          top: 5px;
          right: 5px;
          background: rgba(220, 53, 69, 0.9);
          color: white;
          border: none;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          cursor: pointer;
          font-size: 1.2rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .message-textarea {
          width: 100%;
          padding: 1rem;
          border: 1px solid #ddd;
          border-radius: 8px;
          font-size: 1rem;
          font-family: inherit;
          resize: vertical;
          min-height: 150px;
          box-sizing: border-box;
          margin-bottom: 1rem;
        }

                                                                         .message-textarea:focus {
             outline: none;
             border-color: #6495ED;
             box-shadow: 0 0 0 3px rgba(100, 149, 237, 0.2);
           }

        .error-message {
          color: #dc3545;
          font-size: 0.9rem;
          margin-top: -0.5rem;
          margin-bottom: 1rem;
        }

                                                                         .submit-method-btn {
             background: #6495ED;
             color: white;
             border: none;
             padding: 0.75rem 2rem;
             border-radius: 6px;
             font-size: 1rem;
             font-weight: 500;
             cursor: pointer;
             transition: all 0.3s ease;
             box-shadow: 0 2px 4px rgba(100, 149, 237, 0.4);
           }

           .submit-method-btn:hover {
             background: #4169E1;
             box-shadow: 0 4px 8px rgba(100, 149, 237, 0.5);
             transform: translateY(-1px);
           }

        .contact-info {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .contact-item {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .contact-item label {
          font-weight: 500;
          color: #333;
        }

        .contact-input-group {
          position: relative;
          display: flex;
          align-items: center;
        }

        .contact-input {
          flex: 1;
          padding: 0.75rem;
          border: 1px solid #ddd;
          border-radius: 8px;
          font-size: 1rem;
          background: white;
          padding-right: 2.5rem;
        }

                 .contact-icon {
           position: absolute;
           right: 0.75rem;
           font-size: 1.2rem;
         }

         .form-notice {
           margin: 2rem 0;
           padding: 1.5rem;
           background: #f8f9fa;
           border-radius: 8px;
         }

        .terms-checkbox {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .terms-content {
          margin-left: 1.5rem;
          padding: 1rem;
          background: white;
          border-radius: 6px;
          border: 1px solid #ddd;
        }

        .terms-content p {
          margin: 0 0 0.5rem 0;
          color: #666;
        }

        .terms-content ul {
          margin: 0.5rem 0;
          padding-left: 1.5rem;
          color: #666;
        }

        .terms-content li {
          margin: 0.25rem 0;
        }

        .form-actions {
          display: flex;
          justify-content: center;
          gap: 1rem;
          margin-top: 2rem;
        }

        .cancel-button {
          padding: 0.75rem 2rem;
          background: #f5f5f5;
          color: #333;
          text-decoration: none;
          border-radius: 6px;
          transition: background 0.3s ease;
        }

        .cancel-button:hover {
          background: #e0e0e0;
        }

        .thank-you-message {
          text-align: center;
          margin-top: 3rem;
          padding-top: 2rem;
          border-top: 1px solid #e0e0e0;
          color: #666;
          font-size: 1.1rem;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-content {
          background: white;
          border-radius: 12px;
          padding: 2rem;
          max-width: 500px;
          width: 90%;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .modal-header h2 {
          margin: 0;
        }

        .modal-close {
          background: none;
          border: none;
          font-size: 2rem;
          cursor: pointer;
          color: #666;
        }

        .modal-body {
          margin-bottom: 1.5rem;
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 0.5rem;
        }

        .modal-button {
          padding: 0.5rem 1.5rem;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 1rem;
        }

        .modal-button.secondary {
          background: #f5f5f5;
          color: #333;
        }

                                                                         .modal-button.primary {
             background: #6495ED;
             color: white;
           }

           .modal-button.primary:hover {
             background: #4169E1;
           }

                           @media (max-width: 768px) {
           .report-container {
             padding: 1.5rem;
           }

           .report-header h1 {
             font-size: 2rem;
           }

           .report-method-card {
             padding: 1.5rem;
           }

           .contact-info {
             gap: 1.5rem;
           }
         }
      `}</style>
    </div>
  );
}
