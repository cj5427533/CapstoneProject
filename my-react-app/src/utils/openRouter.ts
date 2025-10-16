// OpenRouter API 클라이언트
const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;

export interface OpenRouterResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export interface FakeReviewAnalysis {
  fakeScore: number; // 0-1 (1에 가까울수록 가짜)
  reasons: string[];
  patterns: {
    textPattern: number;
    temporalPattern: number;
    behaviorPattern: number;
  };
}

export interface Review {
  id: string;
  content: string;
  rating: number;
  createdAt: string;
  author?: string;
}

export const openRouterAPI = {
  async generate(prompt: string, model = 'anthropic/claude-3.5-sonnet'): Promise<OpenRouterResponse> {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 1000,
          temperature: 0.7
        })
      });
      
      if (!response.ok) {
        throw new Error(`OpenRouter API error: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('OpenRouter API error:', error);
      throw error;
    }
  },

  async analyzeTextPatterns(review: string): Promise<number> {
    const prompt = `
다음 리뷰 텍스트를 분석하여 가짜 리뷰일 가능성을 0-1 사이의 숫자로 평가해주세요.

리뷰: "${review}"

분석 기준:
1. 과도한 긍정 표현 (0.3점)
2. 반복되는 문구 패턴 (0.3점)
3. 비현실적 표현 (0.2점)
4. 문체의 부자연스러움 (0.2점)

응답 형식: 0.85 (숫자만)
`;

    try {
      const response = await this.generate(prompt);
      const score = parseFloat(response.choices[0].message.content.trim());
      return isNaN(score) ? 0 : Math.min(Math.max(score, 0), 1);
    } catch (error) {
      console.error('Text pattern analysis error:', error);
      return 0;
    }
  },

  async analyzeTemporalPatterns(reviews: Review[]): Promise<number> {
    if (reviews.length < 3) return 0;

    const prompt = `
다음 리뷰들의 시간적 패턴을 분석하여 가짜 리뷰일 가능성을 0-1 사이의 숫자로 평가해주세요.

리뷰 데이터:
${reviews.map((r, i) => `${i + 1}. 평점: ${r.rating}, 작성시간: ${r.createdAt}, 내용: ${r.content.substring(0, 50)}...`).join('\n')}

분석 기준:
1. 짧은 시간 내 연속 리뷰 (0.4점)
2. 특정 시간대 집중 (0.3점)
3. 비정상적인 리뷰 밀도 (0.3점)

응답 형식: 0.75 (숫자만)
`;

    try {
      const response = await this.generate(prompt);
      const score = parseFloat(response.choices[0].message.content.trim());
      return isNaN(score) ? 0 : Math.min(Math.max(score, 0), 1);
    } catch (error) {
      console.error('Temporal pattern analysis error:', error);
      return 0;
    }
  },

  async analyzeBehaviorPatterns(reviews: Review[]): Promise<number> {
    if (reviews.length < 3) return 0;

    const prompt = `
다음 리뷰들의 행동 패턴을 분석하여 가짜 리뷰일 가능성을 0-1 사이의 숫자로 평가해주세요.

리뷰 데이터:
${reviews.map((r, i) => `${i + 1}. 평점: ${r.rating}, 내용: ${r.content}`).join('\n')}

분석 기준:
1. 평점 분포의 비정상성 (0.4점)
2. 리뷰 길이 패턴 (0.3점)
3. 사용자 행동 패턴 (0.3점)

응답 형식: 0.65 (숫자만)
`;

    try {
      const response = await this.generate(prompt);
      const score = parseFloat(response.choices[0].message.content.trim());
      return isNaN(score) ? 0 : Math.min(Math.max(score, 0), 1);
    } catch (error) {
      console.error('Behavior pattern analysis error:', error);
      return 0;
    }
  },

  async generateFakeReasons(analysis: FakeReviewAnalysis): Promise<string[]> {
    const prompt = `
다음 가짜 리뷰 분석 결과를 바탕으로 사용자에게 보여줄 이유를 생성해주세요.

분석 결과:
- 텍스트 패턴 점수: ${analysis.patterns.textPattern}
- 시간적 패턴 점수: ${analysis.patterns.temporalPattern}
- 행동 패턴 점수: ${analysis.patterns.behaviorPattern}
- 종합 점수: ${analysis.fakeScore}

다음 형식으로 3-5개의 이유를 생성해주세요:
1. 비슷한 문체의 리뷰가 다수 발견됨
2. 짧은 시간 내 연속 작성된 리뷰
3. 과도하게 긍정적인 표현 패턴
4. 비현실적인 배송/서비스 표현
5. 평점 분포가 비정상적임

각 이유는 한 줄로 간결하게 작성해주세요.
`;

    try {
      const response = await this.generate(prompt);
      const content = response.choices[0].message.content;
      return content.split('\n')
        .filter(line => line.trim() && !line.match(/^\d+\.$/))
        .map(line => line.replace(/^\d+\.\s*/, '').trim())
        .slice(0, 5);
    } catch (error) {
      console.error('Generate fake reasons error:', error);
      return ['AI 분석 중 오류가 발생했습니다.'];
    }
  }
};
