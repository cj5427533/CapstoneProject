// 공유 타입 정의
export interface User {
  id: number;
  username: string;
  email: string;
  phone_number: string;
  created_at: string;
}

export interface Shop {
  id: number;
  url: string;
  name?: string;
  parent_shop_id?: number;
  created_at: string;
}

export interface Report {
  id: number;
  shop_id: number;
  user_id?: number; // 개선: 사용자 추적
  categories: string;
  description: string;
  reporter_name?: string;
  reporter_phone?: string;
  created_at: string;
}

export interface Rating {
  id: number;
  shop_id: number;
  user_id?: number; // 개선: 사용자 추적
  rating: number;
  created_at: string;
}

export interface SMSVerification {
  id: number;
  phone_number: string;
  verification_code: string;
  is_verified: boolean;
  expires_at: string; // 개선: 만료 시간
  created_at: string;
}

export interface SMSRateLimit {
  id: number;
  phone_number: string;
  ip_address: string;
  sent_count: number;
  last_sent_at: string;
}

// API 응답 타입들
export interface AuthResponse {
  success: boolean;
  message: string;
  token?: string;
  user?: User;
}

export interface ShopSearchResponse {
  shop: Shop;
  isNew: boolean;
}

export interface RatingResponse {
  averageRating: number;
  totalRatings: number;
  ratingDistribution: { [key: number]: number };
}

// 요청 데이터 타입들
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
