import * as React from 'react';
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '@/contexts/AuthContext';
import { updateReport, getUserShopReport } from '@/utils/api';
import { StepIndicator } from '@/components/report/StepIndicator';
import { FileDropzone } from '@/components/report/FileDropzone';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

export function ReportFormPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  const [step, setStep] = useState(1);
  const totalSteps = 3;

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    category: '',
    description: '',
    files: [] as File[],
    agree: false,
  });

  const shopUrl = searchParams.get('url') || '';

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
    }
  };

  const nextDisabled = () => {
    if (step === 1) return !(formData.name && formData.phone && formData.category);
    if (step === 2) return !(formData.description || formData.files.length > 0);
    return false;
  };

  const normalizeUrl = (url: string): string => {
    if (!url) return url;
    url = url.trim().replace(/\s+/g, '');
    if (!url) return url;
    url = url.replace(/^htps:\/\//, 'https://');
    url = url.replace(/^http:\/\//, 'http://');
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    url = url.replace(/\.{2,}/g, '.');
    url = url.replace(/\/{2,}/g, '/');
    return url;
  };

  const handleSubmit = async () => {
    const normalizedUrl = normalizeUrl(shopUrl);

    if (!isAuthenticated) {
      toast.error('피해 사례를 제보하려면 로그인이 필요합니다.', { position: 'bottom-center', autoClose: 2500, className: 'border-l-4 border-red-500' });
      navigate('/login');
      return;
    }

    if (!(formData.files.length > 0 || formData.description.trim())) {
      toast.error('증빙 자료를 첨부하거나 상세 설명을 입력해주세요.', { position: 'bottom-center', autoClose: 2500, className: 'border-l-4 border-red-500' });
      return;
    }

    if (!formData.category) {
      toast.error('피해 유형을 선택해주세요.', { position: 'bottom-center', autoClose: 2500, className: 'border-l-4 border-red-500' });
      return;
    }

    if (!formData.description.trim()) {
      toast.error('상세 설명을 입력해주세요.', { position: 'bottom-center', autoClose: 2500, className: 'border-l-4 border-red-500' });
      return;
    }

    if (!formData.agree) {
      toast.error('피해 사례 제보 시 주의사항에 동의해주세요.', { position: 'bottom-center', autoClose: 2500, className: 'border-l-4 border-red-500' });
      return;
    }

    try {
      // 기존 페이지와 동일한 전송 포맷 유지
      const formDataToSend = new FormData();
      formDataToSend.append('shopUrl', normalizedUrl);
      formDataToSend.append('categories', JSON.stringify([formData.category]));
      formDataToSend.append('description', formData.description);
      formDataToSend.append('reporterName', user?.username || '익명');
      formDataToSend.append('reporterPhone', user?.phoneNumber || '');
      formData.files.forEach((file) => formDataToSend.append('evidenceFiles', file));

      const token = localStorage.getItem('token');
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
          Authorization: `Bearer ${token}`,
        },
        body: formDataToSend,
      });

      let responseData: any = {};
      try {
        const text = await response.text();
        responseData = text ? JSON.parse(text) : {};
      } catch (err) {
        throw new Error('서버 응답을 읽을 수 없습니다.');
      }

      if (!response.ok) {
        if (response.status === 409 && responseData.isDuplicate) {
          const confirmEdit = confirm('해당 쇼핑몰에 대한 피해 사례 제보가 존재합니다.\n기존 제보를 수정하시겠습니까?');
          if (confirmEdit) {
            const existingReport = await getUserShopReport(user?.username || '', normalizedUrl);
            if (existingReport) {
              await updateReport(existingReport.id, {
                categories: JSON.parse(existingReport.categories),
                description: existingReport.description,
                reporterName: user?.username || '',
              });
              toast.success('기존 제보가 수정되었습니다.', { position: 'bottom-center', autoClose: 2500 });
              navigate(`/search?url=${encodeURIComponent(normalizedUrl)}`);
              return;
            }
          }
          return;
        }
        throw new Error(responseData.message || '신고 제출에 실패했습니다.');
      }

      toast.success('제보가 접수되었습니다.', { position: 'bottom-center', autoClose: 2500 });
      navigate(`/search?url=${encodeURIComponent(normalizedUrl)}`);
    } catch (error: any) {
      toast.error(error?.message || '피해 사례 제보에 실패했습니다. 다시 시도해주세요.', { position: 'bottom-center', autoClose: 2500, className: 'border-l-4 border-red-500' });
    }
  };

  return (
    <div className="page-sky-background">
      <div className="page-header">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 page-header-content">
          <div className="text-center space-y-3">
            <h1 className="text-4xl font-bold">피해사례 제보</h1>
            <p className="text-lg text-slate-600">
              피해를 경험한 쇼핑몰 정보를 공유해 주세요. 여러 이용자의 제보가 모일수록 위험 쇼핑몰을 더 빠르게 찾아낼 수 있습니다.
            </p>
            <p className="text-base text-slate-500">
              기본 정보 입력 → 증빙 자료 업로드 → 제출 순으로 간단하게 제보할 수 있으며, 모든 정보는 안전하게 관리됩니다.
            </p>
          </div>
        </div>
      </div>
      <div className="report-form-page max-w-[720px] mx-auto px-4 sm:px-6 pb-16" onKeyDown={onKeyDown}>
        <StepIndicator currentStep={step} totalSteps={totalSteps} />

        {/* Step 1 */}
        {step === 1 && (
          <Card className="mt-8 p-4 sm:p-6 md:p-8 rounded-2xl shadow-md bg-card text-card-foreground transition-all duration-300 animate-fade-in animate-slide-up">
            <CardContent className="pt-6 space-y-6">
              <h2 aria-level={2} className="text-xl font-semibold">기본 정보</h2>
              <div>
                <Label htmlFor="shop-url">신고 대상 쇼핑몰</Label>
                <Input id="shop-url" value={shopUrl} readOnly className="mt-2" />
              </div>
              <div>
                <Label htmlFor="name">이름 *</Label>
                <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="mt-2" required />
              </div>
              <div>
                <Label htmlFor="phone">연락처 *</Label>
                <Input id="phone" placeholder="010-1234-5678" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="mt-2" required />
              </div>
              <div>
                <Label htmlFor="category">피해 유형 *</Label>
                <select
                  id="category"
                  className="mt-2 w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary placeholder:text-muted-foreground/70"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  <option value="" disabled>선택하세요</option>
                  <option value="가품 구매">가품 구매</option>
                  <option value="환불 거부">환불 거부</option>
                  <option value="배송 미완료">배송 미완료</option>
                  <option value="기타">기타</option>
                </select>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <Card className="mt-8 p-4 sm:p-6 md:p-8 rounded-2xl shadow-md bg-card text-card-foreground transition-all duration-300 animate-fade-in animate-slide-up">
            <CardContent className="pt-6 space-y-6">
              <h2 aria-level={2} className="text-xl font-semibold">증빙 자료</h2>
              <div>
                <Label>증빙 첨부</Label>
                <div className="mt-2">
                  <FileDropzone files={formData.files} setFiles={(files) => setFormData({ ...formData, files })} />
                </div>
              </div>
              <div>
                <Label htmlFor="description">상세 설명 *</Label>
                <Textarea id="description" rows={4} placeholder="어떤 피해가 있었는지 구체적으로..." value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="mt-2" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <Card className="mt-8 p-4 sm:p-6 md:p-8 rounded-2xl shadow-md bg-card text-card-foreground transition-all duration-300 animate-fade-in animate-slide-up">
            <CardContent className="pt-6 space-y-6">
              <h2 aria-level={2} className="text-xl font-semibold">검토 및 제출</h2>
              <div>
                <h3 className="text-lg font-semibold">입력 내용 확인</h3>
                <div className="mt-4 grid gap-3 text-sm">
                  <div className="flex items-center justify-between"><span className="text-muted-foreground">쇼핑몰</span><span className="font-medium break-all">{shopUrl}</span></div>
                  <div className="flex items-center justify-between"><span className="text-muted-foreground">이름</span><span className="font-medium">{formData.name || '-'}</span></div>
                  <div className="flex items-center justify-between"><span className="text-muted-foreground">연락처</span><span className="font-medium">{formData.phone || '-'}</span></div>
                  <div className="flex items-center justify-between"><span className="text-muted-foreground">피해 유형</span><span className="font-medium">{formData.category || '-'}</span></div>
                  <div className="mt-2">
                    <div className="text-muted-foreground">상세 설명</div>
                    <div className="mt-1 whitespace-pre-wrap">{formData.description || '-'}</div>
                  </div>
                  <div className="text-muted-foreground">첨부 파일 {formData.files.length}개</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input id="agree" type="checkbox" className="h-4 w-4" checked={formData.agree} onChange={(e) => setFormData({ ...formData, agree: e.target.checked })} />
                <Label htmlFor="agree">피해 사례 제보 시 주의사항에 동의합니다. *</Label>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex justify-between mt-8 gap-3 flex-wrap flex-col sm:flex-row">
          <Button type="button" className="active:scale-95 transition-transform duration-100 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none" onClick={() => setStep((s) => Math.max(1, s - 1))} disabled={step === 1}>이전 단계</Button>
          {step < totalSteps ? (
            <Button type="button" className="active:scale-95 transition-transform duration-100 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none" onClick={() => setStep((s) => Math.min(totalSteps, s + 1))} disabled={nextDisabled()}>다음 단계</Button>
          ) : (
            <Button type="button" className="active:scale-95 transition-transform duration-100 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none" onClick={handleSubmit}>제출</Button>
          )}
        </div>
      </div>
    </div>
  );
}
