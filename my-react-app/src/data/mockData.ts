// 목업 쇼핑몰 데이터
export const mockShops = [
  {
    id: 'mock-1',
    url: 'fake-shop-example.com',
    name: '가짜 쇼핑몰 예시',
    type: 'mock' as const
  },
  {
    id: 'mock-2', 
    url: 'suspicious-store.com',
    name: '의심스러운 스토어',
    type: 'mock' as const
  }
];

// 목업 리뷰 데이터 (가짜 패턴 포함)
export const mockReviews = [
  // 과도하게 긍정적인 리뷰들
  {
    id: 'review-1',
    content: '정말정말정말 최고최고최고 완벽완벽완벽합니다!!! 배송도 1시간만에 왔어요!',
    rating: 5,
    createdAt: '2024-01-01T09:00:00Z'
  },
  {
    id: 'review-2',
    content: '세상에서 가장 좋은 쇼핑몰입니다! 가격도 너무 저렴해서 의심스러웠는데 정말 좋네요!',
    rating: 5,
    createdAt: '2024-01-01T09:01:00Z'
  },
  {
    id: 'review-3',
    content: '5점 만점에 5점! 완전 만족합니다! 추천합니다!',
    rating: 5,
    createdAt: '2024-01-01T09:02:00Z'
  },
  
  // 비슷한 문체의 연속 리뷰들
  {
    id: 'review-4',
    content: '상품이 좋습니다. 추천합니다.',
    rating: 5,
    createdAt: '2024-01-01T10:00:00Z'
  },
  {
    id: 'review-5',
    content: '상품이 훌륭합니다. 추천드립니다.',
    rating: 5,
    createdAt: '2024-01-01T10:01:00Z'
  },
  {
    id: 'review-6',
    content: '상품이 만족스럽습니다. 추천해요.',
    rating: 5,
    createdAt: '2024-01-01T10:02:00Z'
  },
  
  // 비현실적인 배송/서비스 표현
  {
    id: 'review-7',
    content: '배송이 정말 빠르고 상품도 완벽합니다! 고객서비스도 최고예요!',
    rating: 5,
    createdAt: '2024-01-01T11:00:00Z'
  },
  {
    id: 'review-8',
    content: '가격이 너무 저렴해서 의심스러웠는데 정말 좋은 상품이네요!',
    rating: 5,
    createdAt: '2024-01-01T11:01:00Z'
  },
  
  // 정상적인 리뷰 (대조군)
  {
    id: 'review-9',
    content: '상품은 괜찮은데 배송이 조금 늦었어요. 그래도 만족합니다.',
    rating: 4,
    createdAt: '2024-01-02T14:30:00Z'
  },
  {
    id: 'review-10',
    content: '예상보다는 좋았습니다. 다음에도 주문할 의향이 있어요.',
    rating: 3,
    createdAt: '2024-01-03T16:45:00Z'
  }
];

// 목업 신고 데이터
export const mockReports = [
  {
    id: 'report-1',
    categories: ['가격 조작', '가짜 리뷰'],
    description: '가격이 비정상적으로 저렴하고 리뷰가 모두 5점으로 의심스럽습니다.',
    reporter_name: '익명',
    created_at: '2024-01-01T12:00:00Z'
  },
  {
    id: 'report-2',
    categories: ['배송 지연', '고객 서비스'],
    description: '주문 후 2주가 지났는데 배송이 안 되고 연락도 안 됩니다.',
    reporter_name: '김고객',
    created_at: '2024-01-02T10:00:00Z'
  }
];

// 목업 쇼핑몰 위험도 분석 결과
export const mockRiskAnalysis = {
  riskScore: 85,
  riskLevel: 'HIGH' as const,
  concerns: [
    '과도하게 긍정적인 리뷰 패턴이 다수 발견됨',
    '짧은 시간 내 연속으로 작성된 5점 리뷰',
    '비현실적인 배송 시간과 가격 표현'
  ],
  recommendations: [
    '추가적인 사업자 정보 확인이 필요합니다',
    '실제 구매 후기를 더 찾아보시기 바랍니다',
    '신용카드 결제 시 보안에 주의하세요'
  ],
  disclaimer: 'AI 분석 결과는 참고용이며, 최종 판단은 사용자에게 있습니다.'
};
