// 목업 쇼핑몰 데이터
export const mockShops = [
  // 안전한 쇼핑몰 (낮은 리스크)
  {
    id: 'safe-shop-1',
    url: 'trusted-mall.co.kr',
    name: '신뢰쇼핑몰',
    type: 'mock' as const,
    riskLevel: 'LOW' as const,
    riskScore: 15
  },
  {
    id: 'safe-shop-2',
    url: 'reliable-store.com',
    name: '안전한스토어',
    type: 'mock' as const,
    riskLevel: 'LOW' as const,
    riskScore: 20
  },
  
  // 주의 필요한 쇼핑몰 (중간 리스크)
  {
    id: 'warning-shop-1',
    url: 'caution-mall.com',
    name: '주의쇼핑몰',
    type: 'mock' as const,
    riskLevel: 'MEDIUM' as const,
    riskScore: 55
  },
  {
    id: 'warning-shop-2',
    url: 'mixed-reviews.co.kr',
    name: '혼재리뷰몰',
    type: 'mock' as const,
    riskLevel: 'MEDIUM' as const,
    riskScore: 60
  },
  
  // 신뢰도가 낮은 쇼핑몰
  {
    id: 'dangerous-shop-1',
    url: 'fake-shop-example.com',
    name: '가짜 쇼핑몰 예시',
    type: 'mock' as const,
    riskLevel: 'HIGH' as const,
    riskScore: 85
  },
  {
    id: 'dangerous-shop-2',
    url: 'suspicious-store.com',
    name: '의심스러운 스토어',
    type: 'mock' as const,
    riskLevel: 'HIGH' as const,
    riskScore: 90
  },
  {
    id: 'dangerous-shop-3',
    url: 'scam-mall.net',
    name: '사기쇼핑몰',
    type: 'mock' as const,
    riskLevel: 'HIGH' as const,
    riskScore: 95
  }
];

// 목업 리뷰 데이터 (쇼핑몰별로 분류)
export const mockReviews = {
  // 안전한 쇼핑몰 리뷰 (정상적인 패턴)
  'safe-shop-1': [
    {
      id: 'safe-review-1',
      content: '상품 품질이 좋고 배송도 빠릅니다. 가격도 합리적이에요.',
      rating: 4,
      createdAt: '2024-01-15T10:30:00Z',
      author: '김고객'
    },
    {
      id: 'safe-review-2',
      content: '포장이 깔끔하고 상품 설명과 일치합니다. 만족해요.',
      rating: 5,
      createdAt: '2024-01-16T14:20:00Z',
      author: '이구매자'
    },
    {
      id: 'safe-review-3',
      content: '배송이 조금 늦었지만 상품은 만족스럽습니다.',
      rating: 3,
      createdAt: '2024-01-17T09:15:00Z',
      author: '박소비자'
    },
    {
      id: 'safe-review-4',
      content: '고객서비스가 친절하고 문의 응답이 빨라요.',
      rating: 4,
      createdAt: '2024-01-18T16:45:00Z',
      author: '최이용자'
    }
  ],
  
  'safe-shop-2': [
    {
      id: 'safe2-review-1',
      content: '오랫동안 이용하고 있는 쇼핑몰입니다. 신뢰할 수 있어요.',
      rating: 5,
      createdAt: '2024-01-10T11:00:00Z',
      author: '정단골'
    },
    {
      id: 'safe2-review-2',
      content: '상품 다양성이 좋고 가격 경쟁력도 있어요.',
      rating: 4,
      createdAt: '2024-01-12T13:30:00Z',
      author: '한구매자'
    },
    {
      id: 'safe2-review-3',
      content: '배송비가 무료라서 좋습니다. 상품도 괜찮아요.',
      rating: 4,
      createdAt: '2024-01-14T15:20:00Z',
      author: '윤고객'
    }
  ],
  
  // 주의 필요한 쇼핑몰 리뷰 (혼재된 패턴)
  'warning-shop-1': [
    {
      id: 'warning-review-1',
      content: '상품은 괜찮은데 배송이 너무 늦어요. 2주나 걸렸습니다.',
      rating: 2,
      createdAt: '2024-01-05T10:00:00Z',
      author: '김불만'
    },
    {
      id: 'warning-review-2',
      content: '정말 좋은 상품이에요! 추천합니다!',
      rating: 5,
      createdAt: '2024-01-05T10:01:00Z',
      author: '이추천'
    },
    {
      id: 'warning-review-3',
      content: '완벽한 상품입니다! 최고예요!',
      rating: 5,
      createdAt: '2024-01-05T10:02:00Z',
      author: '박완벽'
    },
    {
      id: 'warning-review-4',
      content: '고객서비스 연락이 안 됩니다. 환불 요청했는데 답변이 없어요.',
      rating: 1,
      createdAt: '2024-01-08T14:30:00Z',
      author: '최환불'
    },
    {
      id: 'warning-review-5',
      content: '상품이 설명과 다릅니다. 실망스러워요.',
      rating: 2,
      createdAt: '2024-01-10T16:45:00Z',
      author: '정실망'
    }
  ],
  
  'warning-shop-2': [
    {
      id: 'warning2-review-1',
      content: '가격이 저렴해서 주문했는데 품질이 의심스러워요.',
      rating: 3,
      createdAt: '2024-01-06T09:00:00Z',
      author: '김의심'
    },
    {
      id: 'warning2-review-2',
      content: '정말 좋습니다! 배송도 빠르고 상품도 완벽해요!',
      rating: 5,
      createdAt: '2024-01-06T09:01:00Z',
      author: '이완벽'
    },
    {
      id: 'warning2-review-3',
      content: '최고의 쇼핑몰입니다! 모든 것이 완벽해요!',
      rating: 5,
      createdAt: '2024-01-06T09:02:00Z',
      author: '박최고'
    },
    {
      id: 'warning2-review-4',
      content: '배송 지연이 심하고 연락도 안 됩니다.',
      rating: 1,
      createdAt: '2024-01-09T11:20:00Z',
      author: '최지연'
    }
  ],
  
  // 신뢰도가 낮은 쇼핑몰 리뷰 (명백한 페이크 패턴)
  'dangerous-shop-1': [
    {
      id: 'danger-review-1',
      content: '정말정말정말 최고최고최고 완벽완벽완벽합니다!!! 배송도 1시간만에 왔어요!',
      rating: 5,
      createdAt: '2024-01-01T09:00:00Z',
      author: '김최고'
    },
    {
      id: 'danger-review-2',
      content: '세상에서 가장 좋은 쇼핑몰입니다! 가격도 너무 저렴해서 의심스러웠는데 정말 좋네요!',
      rating: 5,
      createdAt: '2024-01-01T09:01:00Z',
      author: '이세상'
    },
    {
      id: 'danger-review-3',
      content: '5점 만점에 5점! 완전 만족합니다! 추천합니다!',
      rating: 5,
      createdAt: '2024-01-01T09:02:00Z',
      author: '박만점'
    },
    {
      id: 'danger-review-4',
      content: '상품이 좋습니다. 추천합니다.',
      rating: 5,
      createdAt: '2024-01-01T10:00:00Z',
      author: '최추천'
    },
    {
      id: 'danger-review-5',
      content: '상품이 훌륭합니다. 추천드립니다.',
      rating: 5,
      createdAt: '2024-01-01T10:01:00Z',
      author: '정훌륭'
    },
    {
      id: 'danger-review-6',
      content: '상품이 만족스럽습니다. 추천해요.',
      rating: 5,
      createdAt: '2024-01-01T10:02:00Z',
      author: '한만족'
    }
  ],
  
  'dangerous-shop-2': [
    {
      id: 'danger2-review-1',
      content: '배송이 정말 빠르고 상품도 완벽합니다! 고객서비스도 최고예요!',
      rating: 5,
      createdAt: '2024-01-01T11:00:00Z',
      author: '김빠름'
    },
    {
      id: 'danger2-review-2',
      content: '가격이 너무 저렴해서 의심스러웠는데 정말 좋은 상품이네요!',
      rating: 5,
      createdAt: '2024-01-01T11:01:00Z',
      author: '이저렴'
    },
    {
      id: 'danger2-review-3',
      content: '완벽한 쇼핑몰입니다! 모든 것이 최고예요!',
      rating: 5,
      createdAt: '2024-01-01T11:02:00Z',
      author: '박완벽'
    },
    {
      id: 'danger2-review-4',
      content: '정말 좋습니다! 추천합니다!',
      rating: 5,
      createdAt: '2024-01-01T11:03:00Z',
      author: '최좋음'
    }
  ],
  
  'dangerous-shop-3': [
    {
      id: 'danger3-review-1',
      content: '세상 최고의 쇼핑몰! 모든 상품이 완벽해요!',
      rating: 5,
      createdAt: '2024-01-02T08:00:00Z',
      author: '김세상'
    },
    {
      id: 'danger3-review-2',
      content: '정말정말 좋습니다! 배송도 초고속이에요!',
      rating: 5,
      createdAt: '2024-01-02T08:01:00Z',
      author: '이초고속'
    },
    {
      id: 'danger3-review-3',
      content: '완벽완벽합니다! 추천추천해요!',
      rating: 5,
      createdAt: '2024-01-02T08:02:00Z',
      author: '박완벽'
    },
    {
      id: 'danger3-review-4',
      content: '최고최고의 쇼핑몰입니다!',
      rating: 5,
      createdAt: '2024-01-02T08:03:00Z',
      author: '최최고'
    },
    {
      id: 'danger3-review-5',
      content: '정말 좋습니다. 추천합니다.',
      rating: 5,
      createdAt: '2024-01-02T08:04:00Z',
      author: '정추천'
    }
  ]
};

// 목업 신고 데이터 (쇼핑몰별로 분류)
export const mockReports = {
  // 안전한 쇼핑몰 신고 (적은 수의 신고)
  'safe-shop-1': [
    {
      id: 'safe-report-1',
      categories: ['배송 지연'],
      description: '배송이 예상보다 늦었지만 상품은 만족스러웠습니다.',
      reporter_name: '김고객',
      created_at: '2024-01-20T10:00:00Z',
      shop_id: 'safe-shop-1'
    }
  ],
  
  'safe-shop-2': [
    {
      id: 'safe2-report-1',
      categories: ['기타'],
      description: '웹사이트 로딩이 가끔 느려요.',
      reporter_name: '이사용자',
      created_at: '2024-01-18T14:30:00Z',
      shop_id: 'safe-shop-2'
    }
  ],
  
  // 주의 필요한 쇼핑몰 신고 (중간 수준의 신고)
  'warning-shop-1': [
    {
      id: 'warning-report-1',
      categories: ['배송 지연', '고객 서비스'],
      description: '주문 후 2주가 지났는데 배송이 안 되고 연락도 안 됩니다.',
      reporter_name: '김불만',
      created_at: '2024-01-12T10:00:00Z',
      shop_id: 'warning-shop-1'
    },
    {
      id: 'warning-report-2',
      categories: ['상품 불일치'],
      description: '상품 설명과 실제 상품이 다릅니다.',
      reporter_name: '박실망',
      created_at: '2024-01-15T16:45:00Z',
      shop_id: 'warning-shop-1'
    },
    {
      id: 'warning-report-3',
      categories: ['환불 문제'],
      description: '환불 요청했는데 처리되지 않습니다.',
      reporter_name: '최환불',
      created_at: '2024-01-18T11:20:00Z',
      shop_id: 'warning-shop-1'
    }
  ],
  
  'warning-shop-2': [
    {
      id: 'warning2-report-1',
      categories: ['품질 문제'],
      description: '상품 품질이 기대에 못 미칩니다.',
      reporter_name: '김의심',
      created_at: '2024-01-10T09:00:00Z',
      shop_id: 'warning-shop-2'
    },
    {
      id: 'warning2-report-2',
      categories: ['배송 지연'],
      description: '배송이 너무 늦어요. 연락도 안 됩니다.',
      reporter_name: '최지연',
      created_at: '2024-01-14T15:30:00Z',
      shop_id: 'warning-shop-2'
    }
  ],
  
  // 신뢰도가 낮은 쇼핑몰 신고 (많은 수의 주의한 신고)
  'dangerous-shop-1': [
    {
      id: 'danger-report-1',
      categories: ['가격 조작', '가짜 리뷰'],
      description: '가격이 비정상적으로 저렴하고 리뷰가 모두 5점으로 의심스럽습니다.',
      reporter_name: '익명',
      created_at: '2024-01-05T12:00:00Z',
      shop_id: 'dangerous-shop-1'
    },
    {
      id: 'danger-report-2',
      categories: ['사기/피싱'],
      description: '결제 후 상품이 배송되지 않고 연락이 안 됩니다.',
      reporter_name: '김피해',
      created_at: '2024-01-08T14:20:00Z',
      shop_id: 'dangerous-shop-1'
    },
    {
      id: 'danger-report-3',
      categories: ['가짜 리뷰', '품질 문제'],
      description: '리뷰가 모두 비슷하고 상품 품질이 매우 나쁩니다.',
      reporter_name: '박의심',
      created_at: '2024-01-10T16:30:00Z',
      shop_id: 'dangerous-shop-1'
    },
    {
      id: 'danger-report-4',
      categories: ['환불 문제', '고객 서비스'],
      description: '환불 요청했는데 완전히 무시당했습니다.',
      reporter_name: '최환불',
      created_at: '2024-01-12T11:45:00Z',
      shop_id: 'dangerous-shop-1'
    }
  ],
  
  'dangerous-shop-2': [
    {
      id: 'danger2-report-1',
      categories: ['사기/피싱'],
      description: '개인정보가 유출된 것 같습니다. 신용카드 정보도 털렸어요.',
      reporter_name: '김피해',
      created_at: '2024-01-06T09:15:00Z',
      shop_id: 'dangerous-shop-2'
    },
    {
      id: 'danger2-report-2',
      categories: ['가짜 리뷰', '상품 불일치'],
      description: '리뷰가 모두 가짜 같고 실제 상품과 완전히 다릅니다.',
      reporter_name: '이의심',
      created_at: '2024-01-09T13:20:00Z',
      shop_id: 'dangerous-shop-2'
    },
    {
      id: 'danger2-report-3',
      categories: ['배송 문제', '환불 문제'],
      description: '상품이 아예 배송되지 않고 환불도 안 됩니다.',
      reporter_name: '박배송',
      created_at: '2024-01-11T15:30:00Z',
      shop_id: 'dangerous-shop-2'
    }
  ],
  
  'dangerous-shop-3': [
    {
      id: 'danger3-report-1',
      categories: ['사기/피싱', '가짜 리뷰'],
      description: '완전한 사기 쇼핑몰입니다. 리뷰도 모두 가짜예요.',
      reporter_name: '김사기',
      created_at: '2024-01-03T10:00:00Z',
      shop_id: 'dangerous-shop-3'
    },
    {
      id: 'danger3-report-2',
      categories: ['개인정보 유출'],
      description: '결제 후 개인정보가 유출되었습니다.',
      reporter_name: '이유출',
      created_at: '2024-01-05T14:30:00Z',
      shop_id: 'dangerous-shop-3'
    },
    {
      id: 'danger3-report-3',
      categories: ['품질 문제', '환불 문제'],
      description: '상품이 완전히 다르고 환불도 절대 안 됩니다.',
      reporter_name: '박품질',
      created_at: '2024-01-07T16:45:00Z',
      shop_id: 'dangerous-shop-3'
    },
    {
      id: 'danger3-report-4',
      categories: ['고객 서비스'],
      description: '고객센터가 아예 없습니다. 연락할 방법이 없어요.',
      reporter_name: '최연락',
      created_at: '2024-01-09T12:15:00Z',
      shop_id: 'dangerous-shop-3'
    },
    {
      id: 'danger3-report-5',
      categories: ['사기/피싱'],
      description: '돈만 받고 상품은 절대 안 보내는 사기업체입니다.',
      reporter_name: '정사기',
      created_at: '2024-01-11T18:20:00Z',
      shop_id: 'dangerous-shop-3'
    }
  ]
};

// 목업 쇼핑몰 신뢰도 분석 결과 (쇼핑몰별로 분류)
export const mockRiskAnalysis = {
  // 안전한 쇼핑몰 분석 결과
  'safe-shop-1': {
    riskScore: 15,
    riskLevel: 'LOW' as const,
    concerns: [
      '일부 배송 지연 신고가 있으나 전반적으로 안정적',
      '리뷰 패턴이 자연스럽고 다양한 평점 분포'
    ],
    recommendations: [
      '안전한 쇼핑몰으로 판단됩니다',
      '일반적인 주의사항만 지켜주시면 됩니다',
      '배송 지연 시 고객센터 문의를 권장합니다'
    ],
    disclaimer: 'AI 분석 결과는 참고용이며, 최종 판단은 사용자에게 있습니다.'
  },
  
  'safe-shop-2': {
    riskScore: 20,
    riskLevel: 'LOW' as const,
    concerns: [
      '웹사이트 성능 관련 소소한 문제만 발견됨',
      '전반적으로 신뢰할 수 있는 쇼핑몰'
    ],
    recommendations: [
      '안전한 쇼핑몰으로 추천합니다',
      '오랫동안 운영되어 신뢰도가 높습니다',
      '일반적인 온라인 쇼핑 주의사항만 준수하세요'
    ],
    disclaimer: 'AI 분석 결과는 참고용이며, 최종 판단은 사용자에게 있습니다.'
  },
  
  // 주의 필요한 쇼핑몰 분석 결과
  'warning-shop-1': {
    riskScore: 55,
    riskLevel: 'MEDIUM' as const,
    concerns: [
      '배송 지연과 고객 서비스 문제가 다수 발견됨',
      '일부 의심스러운 리뷰 패턴 존재',
      '환불 처리 관련 신고가 있음'
    ],
    recommendations: [
      '구매 전 신중한 검토가 필요합니다',
      '고객센터 연락 가능 여부를 확인하세요',
      '신용카드 결제보다는 안전한 결제 수단을 권장합니다',
      '소액 구매부터 시작해보시기 바랍니다'
    ],
    disclaimer: 'AI 분석 결과는 참고용이며, 최종 판단은 사용자에게 있습니다.'
  },
  
  'warning-shop-2': {
    riskScore: 60,
    riskLevel: 'MEDIUM' as const,
    concerns: [
      '품질 문제와 배송 지연 신고가 있음',
      '일부 과도하게 긍정적인 리뷰 패턴 발견',
      '가격 대비 품질에 대한 의문 제기'
    ],
    recommendations: [
      '구매 전 충분한 검토가 필요합니다',
      '상품 설명과 실제 상품의 일치 여부를 확인하세요',
      '배송 추적 시스템이 있는지 확인하세요',
      '소액 구매로 테스트해보시기 바랍니다'
    ],
    disclaimer: 'AI 분석 결과는 참고용이며, 최종 판단은 사용자에게 있습니다.'
  },
  
  // 신뢰도가 낮은 쇼핑몰 분석 결과
  'dangerous-shop-1': {
    riskScore: 85,
    riskLevel: 'HIGH' as const,
    concerns: [
      '과도하게 긍정적인 리뷰 패턴이 다수 발견됨',
      '짧은 시간 내 연속으로 작성된 5점 리뷰',
      '비현실적인 배송 시간과 가격 표현',
      '가짜 리뷰와 사기 관련 신고 다수'
    ],
    recommendations: [
      '이 쇼핑몰 이용을 강력히 권하지 않습니다',
      '추가적인 사업자 정보 확인이 필요합니다',
      '실제 구매 후기를 더 찾아보시기 바랍니다',
      '신용카드 결제 시 보안에 주의하세요',
      '다른 신뢰할 수 있는 쇼핑몰 이용을 권장합니다'
    ],
    disclaimer: 'AI 분석 결과는 참고용이며, 최종 판단은 사용자에게 있습니다.'
  },
  
  'dangerous-shop-2': {
    riskScore: 90,
    riskLevel: 'HIGH' as const,
    concerns: [
      '개인정보 유출 관련 주의한 신고 다수',
      '사기/피싱 관련 신고가 빈번함',
      '가짜 리뷰 패턴이 명확하게 발견됨',
      '환불 및 배송 문제가 주의함'
    ],
    recommendations: [
      '이 쇼핑몰 이용을 절대 권하지 않습니다',
      '개인정보 보호를 위해 이용을 중단하세요',
      '이미 이용했다면 개인정보 변경을 권장합니다',
      '신용카드 사용 내역을 확인하세요',
      '다른 안전한 쇼핑몰을 이용하시기 바랍니다'
    ],
    disclaimer: 'AI 분석 결과는 참고용이며, 최종 판단은 사용자에게 있습니다.'
  },
  
  'dangerous-shop-3': {
    riskScore: 95,
    riskLevel: 'HIGH' as const,
    concerns: [
      '완전한 사기 쇼핑몰으로 판단됨',
      '개인정보 유출과 사기 관련 신고가 매우 주의함',
      '고객센터가 존재하지 않음',
      '모든 리뷰가 가짜로 추정됨',
      '환불 시스템이 전혀 작동하지 않음'
    ],
    recommendations: [
      '이 쇼핑몰 이용을 절대 금지합니다',
      '이미 이용했다면 즉시 신용카드 차단을 권장합니다',
      '개인정보 유출 가능성이 높으니 비밀번호 변경하세요',
      '사기 피해 신고를 권장합니다',
      '절대 이 사이트에 개인정보를 입력하지 마세요'
    ],
    disclaimer: 'AI 분석 결과는 참고용이며, 최종 판단은 사용자에게 있습니다.'
  }
};
