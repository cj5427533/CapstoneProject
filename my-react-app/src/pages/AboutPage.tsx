export function AboutPage() {
  return (
    <div className="about-page">
      <div className="about-content">
        <div className="about-hero">
          <h1 className="about-title">여기몰까란?</h1>
          <p className="about-subtitle">
            쇼핑몰의 신뢰성을 검증하고 안전한 쇼핑을 도와주는 플랫폼입니다
          </p>
        </div>

        <div className="features">
          <div className="feature-card">
            <h3>신뢰성 검증</h3>
            <p>다른 사용자들의 신고를 통해 쇼핑몰의 신뢰성을 확인하세요</p>
          </div>
          <div className="feature-card">
            <h3>실시간 정보</h3>
            <p>최신 신고 정보를 실시간으로 확인할 수 있습니다</p>
          </div>
          <div className="feature-card">
            <h3>커뮤니티</h3>
            <p>다른 사용자들과 정보를 공유하고 안전한 쇼핑을 즐기세요</p>
          </div>
        </div>
        
        <div className="how-it-works">
          <h2>어떻게 작동하나요?</h2>
          <div className="steps">
            <div className="step">
              <div className="step-number">1</div>
              <h3>쇼핑몰 URL 입력</h3>
              <p>검증하고 싶은 쇼핑몰의 URL을 입력하세요</p>
            </div>
            <div className="step">
              <div className="step-number">2</div>
              <h3>신고 및 평점 확인</h3>
              <p>다른 사용자들의 신고와 평점을 확인하세요</p>
            </div>
            <div className="step">
              <div className="step-number">3</div>
              <h3>신고 작성</h3>
              <p>피해사례가 있다면 신고를 작성해주세요</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
