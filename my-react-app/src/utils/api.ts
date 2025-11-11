// 동적 API URL 설정 (윈도우 객체 이용)
let API_BASE_URL = '/api';

// 브라우저 환경에서 동적으로 API URL 설정
if (typeof window !== 'undefined') {
  const hostname = window.location.hostname;
  const protocol = window.location.protocol; // http: 또는 https:
  
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    API_BASE_URL = '/api';
  } else if (hostname.includes('ygmk.app')) {
    // ✅ 같은 도메인에서 /api 사용 (Nginx 프록시)
    API_BASE_URL = '/api';
  } else {
    // 다른 프로덕션 환경: 동일 호스트 사용 (포트 3001)
    // 또는 환경 변수로 지정된 API URL 사용
    const envApiUrl = import.meta.env.VITE_API_URL;
    if (envApiUrl) {
      API_BASE_URL = envApiUrl;
    } else {
      // 기본값: 동일 호스트의 API 서브도메인 또는 포트 사용
      API_BASE_URL = `${protocol}//${hostname}:3001/api`;
    }
  }
}

console.log('API Base URL:', API_BASE_URL);

// JWT 토큰 관리 함수들
export const getAuthToken = (): string | null => {
  return localStorage.getItem('authToken');
};

export const setAuthToken = (token: string): void => {
  localStorage.setItem('authToken', token);
};

export const removeAuthToken = (): void => {
  localStorage.removeItem('authToken');
};

// AI 분석 관련 타입 정의
export interface FakeReviewResult {
  review: {
    id: string;
    content: string;
    rating: number;
    created_at: string;
  };
  fakeScore: number;
  reasons: string[];
  patterns: {
    textPattern: number;
    temporalPattern: number;
    behaviorPattern: number;
  };
}

export interface AIAnalysisStatistics {
  fakeCount: number;
  fakePercentage: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  totalReviews: number;
}

export interface ShopRiskAnalysis {
  riskScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  concerns: string[];
  recommendations: string[];
  disclaimer: string;
}

// API 요청 시 자동으로 토큰을 헤더에 추가하는 함수
const getAuthHeaders = () => {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
};

export interface Shop {
  id: number;
  url: string;
  name?: string;
  created_at: string;
}

export interface Report {
  id: number;
  shop_id: number;
  categories: string;
  description: string;
  reporter_name?: string;
  created_at: string;
  shop_url?: string;
  shops?: {
    id: number;
    url: string;
    name: string | null;
  };
}

export interface Rating {
  averageRating: number;
  totalRatings: number;
  ratingDistribution: { [key: number]: number };
}

export interface CreateReportData {
  shopUrl: string;
  categories: string[];
  description: string;
  reporterName?: string;
  reporterPhone?: string;
}

export interface CreateRatingData {
  shopUrl: string;
  rating: number;
}

export interface DangerousShop {
  id: number;
  url: string;
  name: string;
  reportCount: number;
}

export interface TopRatedShop {
  id: number;
  url: string;
  name: string;
  averageRating: number;
  totalRatings: number;
}

export interface User {
  id: number;
  username: string;
  email: string;
  phoneNumber: string;
  isPhoneVerified: boolean;
  createdAt?: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  phoneNumber: string;
  verificationCode: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthResponse {
  message: string;
  token?: string;
  user?: User;
  userId?: number;
  username?: string;
}

// 쇼핑몰 검색 또는 생성
export async function searchOrCreateShop(url: string): Promise<{ shop: Shop; isNew: boolean }> {
  try {
    console.log('API 호출:', `${API_BASE_URL}/shops/search`, { url });
    
    const response = await fetch(`${API_BASE_URL}/shops/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
    });

    console.log('응답 상태:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API 에러:', errorText);
      throw new Error(`Failed to search shop: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    console.log('응답 데이터:', data);
    return data;
  } catch (error) {
    console.error('API 호출 에러:', error);
    // 네트워크 에러나 서버 에러 시에도 기본 쇼핑몰 객체 반환
    return {
      shop: {
        id: 0,
        url: url,
        name: undefined,
        created_at: new Date().toISOString()
      },
      isNew: true
    };
  }
}

// 쇼핑몰 피해 사례 제보 목록 조회
export async function getShopReports(shopId: number): Promise<Report[]> {
  try {
    console.log('피해 사례 제보 목록 조회:', `${API_BASE_URL}/shops/${shopId}/reports`);
    
    const response = await fetch(`${API_BASE_URL}/shops/${shopId}/reports`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('피해 사례 제보 목록 조회 에러:', errorText);
      throw new Error(`Failed to fetch reports: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    console.log('피해 사례 제보 목록 데이터:', data);
    return data;
  } catch (error) {
    console.error('피해 사례 제보 목록 조회 에러:', error);
    // 에러 시 빈 배열 반환
    return [];
  }
}

// 특정 사용자의 모든 피해 사례 제보 조회
export async function getUserReports(reporterName: string): Promise<Report[]> {
  try {
    const encodedName = encodeURIComponent(reporterName);
    
    const response = await fetch(`${API_BASE_URL}/reports/user/${encodedName}`);

    if (!response.ok) {
      throw new Error('Failed to fetch user reports');
    }

    const data = await response.json();
    return data.reports || [];
  } catch (error) {
    console.error('사용자 피해 사례 제보 목록 조회 에러:', error);
    return [];
  }
}

// 특정 사용자의 특정 쇼핑몰 피해 사례 제보 조회
export async function getUserShopReport(reporterName: string, shopUrl: string): Promise<Report | null> {
  try {
    const encodedName = encodeURIComponent(reporterName);
    const encodedUrl = encodeURIComponent(shopUrl);
    
    const response = await fetch(`${API_BASE_URL}/reports/user/${encodedName}/shop/${encodedUrl}`);

    if (!response.ok) {
      throw new Error('Failed to fetch user report');
    }

    const data = await response.json();
    return data.report;
  } catch (error) {
    console.error('사용자 피해 사례 제보 조회 에러:', error);
    return null;
  }
}

// 사용자 피해 사례 제보 삭제 (본인만 가능)
export async function deleteUserReport(reportId: number, reporterName: string): Promise<{ success: boolean; message: string }> {
  try {
    const encodedName = encodeURIComponent(reporterName);
    
    const response = await fetch(`${API_BASE_URL}/reports/${reportId}/user/${encodedName}`, {
      method: 'DELETE',
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to delete report');
    }

    return data;
  } catch (error) {
    console.error('피해 사례 제보 삭제 에러:', error);
    throw error;
  }
}

// 피해 사례 제보 생성
export async function createReport(data: CreateReportData): Promise<{ id: number; message: string; isDuplicate?: boolean; existingReportId?: number }> {
  const response = await fetch(`${API_BASE_URL}/reports`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });

  const responseData = await response.json();

  if (!response.ok) {
    // 중복 피해 사례 제보인 경우
    if (response.status === 409 && responseData.isDuplicate) {
      return {
        id: responseData.existingReportId,
        message: responseData.message,
        isDuplicate: true,
        existingReportId: responseData.existingReportId
      };
    }
    throw new Error(responseData.message || '신고 제출에 실패했습니다.');
  }

  return responseData;
}

// 리뷰 관련 API 함수들

export const getReports = async (): Promise<Report[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/reports`);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || '피해사례 목록을 불러오는데 실패했습니다.');
    }
    
    return data.reports || [];
  } catch (error) {
    console.error('피해사례 목록 로드 오류:', error);
    throw error;
  }
};

// 피해 사례 제보 수정
export async function updateReport(reportId: number, data: { categories: string[]; description: string; reporterName: string }): Promise<{ success: boolean; report: Report }> {
  const response = await fetch(`${API_BASE_URL}/reports/${reportId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to update report');
  }

  return response.json();
}

// 평점 조회
export async function getShopRatings(shopId: number): Promise<Rating> {
  try {
    const response = await fetch(`${API_BASE_URL}/shops/${shopId}/ratings`);

    if (!response.ok) {
      throw new Error('Failed to fetch ratings');
    }

    return response.json();
  } catch (error) {
    console.error('평점 조회 에러:', error);
    // 에러 시 기본 평점 데이터 반환
    return {
      averageRating: 0,
      totalRatings: 0,
      ratingDistribution: {}
    };
  }
}

// 리뷰 목록 조회
export interface ReviewItem {
  id: number;
  rating: number;
  comment: string | null;
  created_at: string;
  user_id: number | null;
  username?: string;
}

export async function getShopReviews(shopId: number): Promise<ReviewItem[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/shops/${shopId}/reviews`);

    if (!response.ok) {
      throw new Error('Failed to fetch reviews');
    }

    const data = await response.json();
    return data.reviews || [];
  } catch (error) {
    console.error('리뷰 목록 조회 에러:', error);
    return [];
  }
}

// 평점 생성
export async function createRating(data: CreateRatingData): Promise<{ id: number; message: string }> {
  const response = await fetch(`${API_BASE_URL}/ratings`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error('Failed to create rating');
  }

  return response.json();
}

// SMS 인증번호 발송
export async function sendSMSVerification(phoneNumber: string): Promise<{ message: string }> {
  try {
    // 하이픈 제거하여 숫자만 전송
    const cleanPhoneNumber = phoneNumber.replace(/[-\s]/g, '');
    
    const response = await fetch(`${API_BASE_URL}/auth/send-sms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ phoneNumber: cleanPhoneNumber }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'SMS 발송에 실패했습니다.');
    }

    return response.json();
  } catch (error) {
    console.error('SMS 발송 에러:', error);
    throw error;
  }
}

// SMS 인증번호 검증
export async function verifySMSCode(phoneNumber: string, verificationCode: string): Promise<{ message: string }> {
  try {
    // 하이픈 제거하여 숫자만 전송
    const cleanPhoneNumber = phoneNumber.replace(/[-\s]/g, '');
    
    const response = await fetch(`${API_BASE_URL}/auth/verify-sms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ phoneNumber: cleanPhoneNumber, verificationCode }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || '인증번호 검증에 실패했습니다.');
    }

    return response.json();
  } catch (error) {
    console.error('SMS 인증 에러:', error);
    throw error;
  }
}

// 회원가입
export async function register(data: RegisterData): Promise<AuthResponse> {
  try {
    const registerData = {
      ...data,
      phoneNumber: data.phoneNumber.replace(/[-\s]/g, '') // 하이픈 제거
    };
    
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(registerData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || '회원가입에 실패했습니다.');
    }

    return response.json();
  } catch (error) {
    console.error('회원가입 에러:', error);
    throw error;
  }
}

// 로그인
export async function login(data: LoginData): Promise<AuthResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || '로그인에 실패했습니다.');
    }

    const result = await response.json();
    
    // JWT 토큰이 있으면 저장
    if (result.token) {
      setAuthToken(result.token);
    }

    return result;
  } catch (error) {
    console.error('로그인 에러:', error);
    throw error;
  }
}

// 비밀번호 재설정 요청
export async function requestPasswordReset(email: string): Promise<{ success: boolean; message: string; resetLink?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/request-password-reset`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || '비밀번호 재설정 요청에 실패했습니다.');
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('비밀번호 재설정 요청 에러:', error);
    throw error;
  }
}

// 비밀번호 재설정 (토큰으로)
export async function resetPassword(token: string, newPassword: string): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token, newPassword }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || '비밀번호 재설정에 실패했습니다.');
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('비밀번호 재설정 에러:', error);
    throw error;
  }
}

// 주의가 필요한 페이지 Top 10 조회
export async function getDangerousPages(): Promise<DangerousShop[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/dangerous-pages`);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || '주의가 필요한 페이지 조회에 실패했습니다.');
    }

    const realData = await response.json();
    
    // 목업 데이터 추가 (교육용)
    const mockDangerousShops: DangerousShop[] = [
      { id: 1001, url: 'fake-shop-example.com', name: '🎓 가짜 쇼핑몰 예시 (교육용)', reportCount: 15 },
      { id: 1002, url: 'suspicious-store.com', name: '🎓 의심스러운 스토어 (교육용)', reportCount: 8 },
      { id: 1003, url: 'scam-mall.net', name: '🎓 사기쇼핑몰 (교육용)', reportCount: 12 }
    ];
    
    // 실제 데이터와 목업 데이터 합치기
    return [...mockDangerousShops, ...realData];
  } catch (error) {
    console.error('주의가 필요한 페이지 조회 에러:', error);
    // 에러 시에도 목업 데이터는 반환
    return [
      { id: 1001, url: 'fake-shop-example.com', name: '🎓 가짜 쇼핑몰 예시 (교육용)', reportCount: 15 },
      { id: 1002, url: 'suspicious-store.com', name: '🎓 의심스러운 스토어 (교육용)', reportCount: 8 },
      { id: 1003, url: 'scam-mall.net', name: '🎓 사기쇼핑몰 (교육용)', reportCount: 12 }
    ];
  }
}

// 고평점 페이지 Top 10 조회
export async function getTopRatedPages(): Promise<TopRatedShop[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/top-rated-pages`);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || '고평점 페이지 조회에 실패했습니다.');
    }

    const realData = await response.json();
    
    // 목업 데이터 추가 (교육용)
    const mockTopRatedShops: TopRatedShop[] = [
      { id: 2001, url: 'trusted-mall.co.kr', name: '🎓 신뢰쇼핑몰 (교육용)', averageRating: 4.8, totalRatings: 25 },
      { id: 2002, url: 'reliable-store.com', name: '🎓 안전한스토어 (교육용)', averageRating: 4.5, totalRatings: 18 },
      { id: 2003, url: 'caution-mall.com', name: '🎓 주의쇼핑몰 (교육용)', averageRating: 3.2, totalRatings: 12 },
      { id: 2004, url: 'mixed-reviews.co.kr', name: '🎓 혼재리뷰몰 (교육용)', averageRating: 3.0, totalRatings: 8 }
    ];
    
    // 실제 데이터와 목업 데이터 합치기
    return [...mockTopRatedShops, ...realData];
  } catch (error) {
    console.error('고평점 페이지 조회 에러:', error);
    // 에러 시에도 목업 데이터는 반환
    return [
      { id: 2001, url: 'trusted-mall.co.kr', name: '🎓 신뢰쇼핑몰 (교육용)', averageRating: 4.8, totalRatings: 25 },
      { id: 2002, url: 'reliable-store.com', name: '🎓 안전한스토어 (교육용)', averageRating: 4.5, totalRatings: 18 },
      { id: 2003, url: 'caution-mall.com', name: '🎓 주의쇼핑몰 (교육용)', averageRating: 3.2, totalRatings: 12 },
      { id: 2004, url: 'mixed-reviews.co.kr', name: '🎓 혼재리뷰몰 (교육용)', averageRating: 3.0, totalRatings: 8 }
    ];
  }
}

// 사용자 정보 조회
export async function getCurrentUser(userId: number): Promise<{ user: User }> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'user-id': userId.toString(),
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || '사용자 정보 조회에 실패했습니다.');
    }

    return response.json();
  } catch (error) {
    console.error('사용자 정보 조회 에러:', error);
    throw error;
  }
}

// 사용자명 중복 확인
export async function checkUsernameAvailability(username: string): Promise<{ available: boolean; message: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/check-username`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || '사용자명 확인에 실패했습니다.');
    }

    return data;
  } catch (error) {
    console.error('사용자명 중복 확인 에러:', error);
    throw error;
  }
}

// ==================== 관리자 API ====================

// 전체 쇼핑몰 조회
export async function getAdminShops() {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/shops`);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || '쇼핑몰 조회에 실패했습니다.');
    }
    
    return data.shops;
  } catch (error) {
    console.error('쇼핑몰 조회 에러:', error);
    throw error;
  }
}

// 쇼핑몰 이름 수정
export async function updateShopName(shopId: number, name: string) {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/shops/${shopId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name }),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || '쇼핑몰 이름 수정에 실패했습니다.');
    }
    
    return data;
  } catch (error) {
    console.error('쇼핑몰 이름 수정 에러:', error);
    throw error;
  }
}

// 쇼핑몰 삭제
export async function deleteShop(shopId: number) {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/shops/${shopId}`, {
      method: 'DELETE',
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || '쇼핑몰 삭제에 실패했습니다.');
    }
    
    return data;
  } catch (error) {
    console.error('쇼핑몰 삭제 에러:', error);
    throw error;
  }
}

// 전체 피해 사례 제보 조회
export async function getAdminReports() {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/reports`);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || '피해 사례 제보 조회에 실패했습니다.');
    }
    
    // 백엔드가 배열을 직접 반환하므로 data를 그대로 반환
    return Array.isArray(data) ? data : (data.reports || []);
  } catch (error) {
    console.error('피해 사례 제보 조회 에러:', error);
    throw error;
  }
}

// 피해 사례 제보 삭제
export async function deleteReport(reportId: number) {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/reports/${reportId}`, {
      method: 'DELETE',
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || '피해 사례 제보 삭제에 실패했습니다.');
    }
    
    return data;
  } catch (error) {
    console.error('피해 사례 제보 삭제 에러:', error);
    throw error;
  }
}

// 파일 업로드
export async function uploadEvidenceFiles(
  reportId: number, 
  files: File[]
): Promise<{ success: boolean; fileIds: number[]; message: string }> {
  try {
    const formData = new FormData();
    
    files.forEach((file) => {
      formData.append(`files`, file);
    });
    
    formData.append('reportId', reportId.toString());

    const response = await fetch(`${API_BASE_URL}/reports/${reportId}/files`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: formData
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || '파일 업로드에 실패했습니다.');
    }
    
    return data;
  } catch (error) {
    console.error('파일 업로드 에러:', error);
    throw error;
  }
}

// 파일 삭제
export async function deleteEvidenceFile(fileId: number): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/files/${fileId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || '파일 삭제에 실패했습니다.');
    }
    
    return data;
  } catch (error) {
    console.error('파일 삭제 에러:', error);
    throw error;
  }
}

// 사업자 등록 정보 조회/생성
export async function getOrCreateBusinessRegistration(
  shopId: number,
  businessData?: {
    businessNumber?: string;
    businessName?: string;
    representativeName?: string;
    businessAddress?: string;
    phoneNumber?: string;
    email?: string;
  }
): Promise<{ businessRegistration: any; isNew: boolean }> {
  try {
    const response = await fetch(`${API_BASE_URL}/business-registrations/${shopId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(businessData || {})
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || '사업자 등록 정보 처리에 실패했습니다.');
    }
    
    return data;
  } catch (error) {
    console.error('사업자 등록 정보 에러:', error);
    throw error;
  }
}

// 웹 분석 결과 저장
export async function storeWebAnalysis(
  shopId: number,
  webAnalysis: any
): Promise<{ success: boolean; analysisId: number }> {
  try {
    const response = await fetch(`${API_BASE_URL}/web-analysis/${shopId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(webAnalysis)
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || '웹 분석 결과 저장에 실패했습니다.');
    }
    
    return data;
  } catch (error) {
    console.error('웹 분석 결과 저장 에러:', error);
    throw error;
  }
}

// AI 분석 캐시 조회
export async function getAIAnalysisCache(
  shopId: number,
  analysisType: string
): Promise<{ analysisResult: any; isExpired: boolean } | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/ai-analysis-cache/${shopId}/${analysisType}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });

    if (response.status === 404) {
      return null; // 캐시 없음
    }

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'AI 분석 캐시 조회에 실패했습니다.');
    }
    
    return data;
  } catch (error) {
    console.error('AI 분석 캐시 조회 에러:', error);
    return null;
  }
}

// AI 분석 캐시 저장
export async function storeAIAnalysisCache(
  shopId: number,
  analysisType: string,
  analysisResult: any,
  expiresInHours: number = 24
): Promise<{ success: boolean; cacheId: number }> {
  try {
    const response = await fetch(`${API_BASE_URL}/ai-analysis-cache`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        shopId,
        analysisType,
        analysisResult,
        expiresInHours
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'AI 분석 캐시 저장에 실패했습니다.');
    }
    
    return data;
  } catch (error) {
    console.error('AI 분석 캐시 저장 에러:', error);
    throw error;
  }
}

// 전체 평점 조회
export async function getAdminRatings() {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/ratings`);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || '평점 조회에 실패했습니다.');
    }
    
    return data.ratings;
  } catch (error) {
    console.error('평점 조회 에러:', error);
    throw error;
  }
}

// 평점 삭제
export async function deleteRating(ratingId: number) {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/ratings/${ratingId}`, {
      method: 'DELETE',
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || '평점 삭제에 실패했습니다.');
    }
    
    return data;
  } catch (error) {
    console.error('평점 삭제 에러:', error);
    throw error;
  }
}

// 목업 리뷰 데이터 생성
export async function generateMockRatings(): Promise<{ success: boolean; message: string; created?: Array<{ shop: string; count: number; ratings: any[] }> }> {
  try {
    const response = await fetch(`${API_BASE_URL}/mock/ratings/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || '목업 리뷰 생성에 실패했습니다.');
    }
    
    return data;
  } catch (error) {
    console.error('목업 리뷰 생성 에러:', error);
    throw error;
  }
}

// 전체 사용자 조회
export async function getAdminUsers() {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/users`);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || '사용자 조회에 실패했습니다.');
    }
    
    return data.users;
  } catch (error) {
    console.error('사용자 조회 에러:', error);
    throw error;
  }
}

// 데이터베이스 통계
export async function getAdminStats() {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/stats`);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || '통계 조회에 실패했습니다.');
    }
    
    return data.stats;
  } catch (error) {
    console.error('통계 조회 에러:', error);
    throw error;
  }
}

// 쇼핑몰 병합
export async function mergeShops(parentId: number, childId: number) {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/shops/merge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ parentId, childId }),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || '쇼핑몰 병합에 실패했습니다.');
    }
    
    return data;
  } catch (error) {
    console.error('쇼핑몰 병합 에러:', error);
    throw error;
  }
}

// AI 분석 API 함수들
export const detectFakeReviews = async (shopUrl: string, shopType: 'real' | 'mock' = 'real'): Promise<{
  success: boolean;
  fakeReviews: FakeReviewResult[];
  statistics: AIAnalysisStatistics;
}> => {
  try {
    const response = await fetch(`${API_BASE_URL}/ai/detect-fake-reviews`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ shopUrl, shopType })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('가짜 리뷰 탐지 에러:', error);
    throw error;
  }
};

export const analyzeShopRisk = async (shopUrl: string, shopType: 'real' | 'mock' = 'real'): Promise<{
  success: boolean;
  analysis: ShopRiskAnalysis;
}> => {
  try {
    const response = await fetch(`${API_BASE_URL}/ai/analyze-shop-risk`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ shopUrl, shopType })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('쇼핑몰 신뢰도 분석 에러:', error);
    throw error;
  }
};

// ==================== 커뮤니티 API ====================

export interface CommunityPost {
  id: number;
  title: string;
  content: string;
  author: string;
  created_at: string;
  views: number;
  likes: number;
  comments_count: number;
}

export interface CommunityComment {
  id: number;
  post_id: number;
  content: string;
  author: string;
  created_at: string;
}

// 게시글 목록 조회
export const getCommunityPosts = async (): Promise<CommunityPost[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/community/posts`, {
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.posts || [];
  } catch (error) {
    console.error('게시글 목록 조회 에러:', error);
    throw error;
  }
};

// 게시글 상세 조회
export const getCommunityPost = async (postId: number): Promise<CommunityPost> => {
  try {
    const response = await fetch(`${API_BASE_URL}/community/posts/${postId}`, {
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.post;
  } catch (error) {
    console.error('게시글 조회 에러:', error);
    throw error;
  }
};

// 게시글 작성
export const createCommunityPost = async (userId: number, title: string, content: string): Promise<CommunityPost> => {
  try {
    const response = await fetch(`${API_BASE_URL}/community/posts`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ userId, title, content })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || '게시글 작성에 실패했습니다.');
    }

    const data = await response.json();
    return data.post;
  } catch (error) {
    console.error('게시글 작성 에러:', error);
    throw error;
  }
};

// 게시글 수정
export const updateCommunityPost = async (postId: number, userId: number, title: string, content: string): Promise<CommunityPost> => {
  try {
    const response = await fetch(`${API_BASE_URL}/community/posts/${postId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ userId, title, content })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || '게시글 수정에 실패했습니다.');
    }

    const data = await response.json();
    return data.post;
  } catch (error) {
    console.error('게시글 수정 에러:', error);
    throw error;
  }
};

// 게시글 삭제
export const deleteCommunityPost = async (postId: number, userId: number): Promise<void> => {
  try {
    const response = await fetch(`${API_BASE_URL}/community/posts/${postId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      body: JSON.stringify({ userId })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || '게시글 삭제에 실패했습니다.');
    }
  } catch (error) {
    console.error('게시글 삭제 에러:', error);
    throw error;
  }
};

// 게시글 좋아요
export const likeCommunityPost = async (postId: number, userId: number): Promise<number> => {
  try {
    const response = await fetch(`${API_BASE_URL}/community/posts/${postId}/like`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ userId })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || '좋아요 처리에 실패했습니다.');
    }

    const data = await response.json();
    return data.likes;
  } catch (error) {
    console.error('좋아요 에러:', error);
    throw error;
  }
};

// 댓글 목록 조회
export const getCommunityComments = async (postId: number): Promise<CommunityComment[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/community/posts/${postId}/comments`, {
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.comments || [];
  } catch (error) {
    console.error('댓글 목록 조회 에러:', error);
    throw error;
  }
};

// 댓글 작성
export const createCommunityComment = async (postId: number, userId: number, content: string): Promise<CommunityComment> => {
  try {
    const response = await fetch(`${API_BASE_URL}/community/posts/${postId}/comments`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ userId, content })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || '댓글 작성에 실패했습니다.');
    }

    const data = await response.json();
    return data.comment;
  } catch (error) {
    console.error('댓글 작성 에러:', error);
    throw error;
  }
};

// 댓글 삭제
export const deleteCommunityComment = async (commentId: number, userId: number): Promise<void> => {
  try {
    const response = await fetch(`${API_BASE_URL}/community/comments/${commentId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      body: JSON.stringify({ userId })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || '댓글 삭제에 실패했습니다.');
    }
  } catch (error) {
    console.error('댓글 삭제 에러:', error);
    throw error;
  }
};

// ==================== 관리자 커뮤니티 API ====================

// 관리자: 모든 게시글 조회
export const getAdminCommunityPosts = async (): Promise<any[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/community/admin/posts`, {
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.posts || [];
  } catch (error) {
    console.error('관리자 게시글 목록 조회 에러:', error);
    throw error;
  }
};

// 관리자: 게시글 삭제
export const deleteAdminCommunityPost = async (postId: number): Promise<void> => {
  try {
    const response = await fetch(`${API_BASE_URL}/community/admin/posts/${postId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || '게시글 삭제에 실패했습니다.');
    }
  } catch (error) {
    console.error('관리자 게시글 삭제 에러:', error);
    throw error;
  }
};

// 관리자: 모든 댓글 조회
export const getAdminCommunityComments = async (): Promise<any[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/community/admin/comments`, {
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.comments || [];
  } catch (error) {
    console.error('관리자 댓글 목록 조회 에러:', error);
    throw error;
  }
};

// 관리자: 댓글 삭제
export const deleteAdminCommunityComment = async (commentId: number): Promise<void> => {
  try {
    const response = await fetch(`${API_BASE_URL}/community/admin/comments/${commentId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || '댓글 삭제에 실패했습니다.');
    }
  } catch (error) {
    console.error('관리자 댓글 삭제 에러:', error);
    throw error;
  }
};