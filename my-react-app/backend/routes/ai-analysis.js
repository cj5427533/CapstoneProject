const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

// Supabase 클라이언트
const supabaseUrl = process.env.SUPABASE_URL || 'https://tqdvolgachfszomwhlfe.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// OpenRouter API 설정
const OPENROUTER_API_KEY = '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';

// OpenRouter API 호출 함수
const callOpenRouterAPI = async (prompt, model = 'anthropic/claude-3.5-sonnet') => {
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
};

// 텍스트 패턴 분석
const analyzeTextPatterns = async (reviewContent) => {
  const prompt = `
다음 리뷰 텍스트를 분석하여 가짜 리뷰일 가능성을 0-1 사이의 숫자로 평가해주세요.

리뷰: "${reviewContent}"

분석 기준:
1. 과도한 긍정 표현 (0.3점)
2. 반복되는 문구 패턴 (0.3점)
3. 비현실적 표현 (0.2점)
4. 문체의 부자연스러움 (0.2점)

응답 형식: 0.85 (숫자만)
`;

  try {
    const response = await callOpenRouterAPI(prompt);
    const score = parseFloat(response.choices[0].message.content.trim());
    return isNaN(score) ? 0 : Math.min(Math.max(score, 0), 1);
  } catch (error) {
    console.error('Text pattern analysis error:', error);
    return 0;
  }
};

// 시간적 패턴 분석
const analyzeTemporalPatterns = async (reviews) => {
  if (reviews.length < 3) return 0;

  const prompt = `
다음 리뷰들의 시간적 패턴을 분석하여 가짜 리뷰일 가능성을 0-1 사이의 숫자로 평가해주세요.

리뷰 데이터:
${reviews.map((r, i) => `${i + 1}. 평점: ${r.rating}, 작성시간: ${r.created_at}, 내용: ${r.content.substring(0, 50)}...`).join('\n')}

분석 기준:
1. 짧은 시간 내 연속 리뷰 (0.4점)
2. 특정 시간대 집중 (0.3점)
3. 비정상적인 리뷰 밀도 (0.3점)

응답 형식: 0.75 (숫자만)
`;

  try {
    const response = await callOpenRouterAPI(prompt);
    const score = parseFloat(response.choices[0].message.content.trim());
    return isNaN(score) ? 0 : Math.min(Math.max(score, 0), 1);
  } catch (error) {
    console.error('Temporal pattern analysis error:', error);
    return 0;
  }
};

// 행동 패턴 분석
const analyzeBehaviorPatterns = async (reviews) => {
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
    const response = await callOpenRouterAPI(prompt);
    const score = parseFloat(response.choices[0].message.content.trim());
    return isNaN(score) ? 0 : Math.min(Math.max(score, 0), 1);
  } catch (error) {
    console.error('Behavior pattern analysis error:', error);
    return 0;
  }
};

// 가짜 리뷰 이유 생성
const generateFakeReasons = async (analysis) => {
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
    const response = await callOpenRouterAPI(prompt);
    const content = response.choices[0].message.content;
    return content.split('\n')
      .filter(line => line.trim() && !line.match(/^\d+\.$/))
      .map(line => line.replace(/^\d+\.\s*/, '').trim())
      .slice(0, 5);
  } catch (error) {
    console.error('Generate fake reasons error:', error);
    return ['AI 분석 중 오류가 발생했습니다.'];
  }
};

// 가짜 리뷰 탐지 API
router.post('/detect-fake-reviews', async (req, res) => {
  try {
    const { shopUrl, shopType = 'real' } = req.body;
    
    if (!shopUrl) {
      return res.status(400).json({ error: '쇼핑몰 URL이 필요합니다.' });
    }

    // 쇼핑몰 정보 조회
    const { data: shop, error: shopError } = await supabase
      .from('shops')
      .select('*')
      .eq('url', shopUrl)
      .single();

    if (shopError && shopError.code !== 'PGRST116') {
      throw shopError;
    }

    if (!shop) {
      return res.status(404).json({ error: '쇼핑몰을 찾을 수 없습니다.' });
    }

    // 리뷰 데이터 조회
    const { data: reviews, error: reviewsError } = await supabase
      .from('ratings')
      .select('*')
      .eq('shop_id', shop.id)
      .order('created_at', { ascending: false });

    if (reviewsError) {
      throw reviewsError;
    }

    if (!reviews || reviews.length === 0) {
      return res.json({
        success: true,
        fakeReviews: [],
        statistics: {
          fakeCount: 0,
          fakePercentage: 0,
          riskLevel: 'LOW'
        }
      });
    }

    // AI 분석 수행
    const fakeReviews = [];
    const batchSize = 3; // API 호출 제한을 위해 배치 처리

    for (let i = 0; i < reviews.length; i += batchSize) {
      const batch = reviews.slice(i, i + batchSize);
      
      for (const review of batch) {
        try {
          // 1. 텍스트 패턴 분석
          const textPattern = await analyzeTextPatterns(review.content || '');
          
          // 2. 시간적 패턴 분석
          const temporalPattern = await analyzeTemporalPatterns(reviews);
          
          // 3. 행동 패턴 분석
          const behaviorPattern = await analyzeBehaviorPatterns(reviews);
          
          // 4. 종합 점수 계산
          const weights = { textPattern: 0.4, temporalPattern: 0.3, behaviorPattern: 0.3 };
          const baseScore = textPattern * weights.textPattern + temporalPattern * weights.temporalPattern + behaviorPattern * weights.behaviorPattern;
          const multiplier = shopType === 'mock' ? 1.2 : 1.0;
          const fakeScore = Math.min(baseScore * multiplier, 1.0);
          
          if (fakeScore > 0.7) {
            // 5. 이유 생성
            const reasons = await generateFakeReasons({
              fakeScore,
              patterns: { textPattern, temporalPattern, behaviorPattern }
            });
            
            fakeReviews.push({
              review,
              fakeScore,
              reasons,
              patterns: { textPattern, temporalPattern, behaviorPattern }
            });
          }
        } catch (error) {
          console.error(`Error analyzing review ${review.id}:`, error);
        }
      }
      
      // API 호출 간격 조절
      if (i + batchSize < reviews.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // 통계 생성
    const fakeCount = fakeReviews.length;
    const fakePercentage = reviews.length > 0 ? (fakeCount / reviews.length) * 100 : 0;
    
    let riskLevel = 'LOW';
    if (fakePercentage >= 50) riskLevel = 'CRITICAL';
    else if (fakePercentage >= 25) riskLevel = 'HIGH';
    else if (fakePercentage >= 10) riskLevel = 'MEDIUM';

    res.json({
      success: true,
      fakeReviews,
      statistics: {
        fakeCount,
        fakePercentage: Math.round(fakePercentage * 10) / 10,
        riskLevel,
        totalReviews: reviews.length
      }
    });

  } catch (error) {
    console.error('Fake review detection error:', error);
    res.status(500).json({ 
      error: `가짜 리뷰 탐지 중 오류가 발생했습니다. ${error.message}` 
    });
  }
});

// AI 기반 쇼핑몰 위험도 분석 API
router.post('/analyze-shop-risk', async (req, res) => {
  try {
    const { shopUrl, shopType = 'real' } = req.body;
    
    if (!shopUrl) {
      return res.status(400).json({ error: '쇼핑몰 URL이 필요합니다.' });
    }

    // 쇼핑몰 정보 조회
    const { data: shop, error: shopError } = await supabase
      .from('shops')
      .select('*')
      .eq('url', shopUrl)
      .single();

    if (shopError && shopError.code !== 'PGRST116') {
      throw shopError;
    }

    if (!shop) {
      return res.status(404).json({ error: '쇼핑몰을 찾을 수 없습니다.' });
    }

    // 신고 데이터 조회
    const { data: reports, error: reportsError } = await supabase
      .from('reports')
      .select('*')
      .eq('shop_id', shop.id);

    if (reportsError) {
      throw reportsError;
    }

    // AI 위험도 분석
    const prompt = `
다음 쇼핑몰 정보를 바탕으로 위험도를 분석해주세요.

쇼핑몰 정보:
- URL: ${shopUrl}
- 신고 건수: ${reports ? reports.length : 0}건
- 신고 카테고리: ${reports ? reports.map(r => r.categories).join(', ') : '없음'}

주의사항:
- "위험합니다" 같은 단정적 표현은 사용하지 마세요
- "주의가 필요합니다", "추가 확인이 필요합니다" 같은 신중한 표현을 사용하세요
- 법적 책임을 피하기 위해 참고용임을 명시하세요

다음 형식으로 응답해주세요:
위험도 점수: 0-100 (숫자만)
위험 등급: LOW/MEDIUM/HIGH/CRITICAL
주요 우려사항: 3가지
권장사항: 3가지
`;

    const response = await callOpenRouterAPI(prompt);
    const content = response.choices[0].message.content;
    
    // 응답 파싱
    const lines = content.split('\n').filter(line => line.trim());
    const riskScore = parseInt(lines.find(line => line.includes('위험도 점수'))?.match(/\d+/)?.[0] || '0');
    const riskLevel = lines.find(line => line.includes('위험 등급'))?.split(':')[1]?.trim() || 'LOW';
    const concerns = lines.filter(line => line.includes('우려사항') || line.includes('주의')).slice(0, 3);
    const recommendations = lines.filter(line => line.includes('권장') || line.includes('추천')).slice(0, 3);

    res.json({
      success: true,
      analysis: {
        riskScore,
        riskLevel,
        concerns,
        recommendations,
        disclaimer: 'AI 분석 결과는 참고용이며, 최종 판단은 사용자에게 있습니다.'
      }
    });

  } catch (error) {
    console.error('Shop risk analysis error:', error);
    res.status(500).json({ 
      error: `쇼핑몰 위험도 분석 중 오류가 발생했습니다. ${error.message}` 
    });
  }
});

module.exports = router;
