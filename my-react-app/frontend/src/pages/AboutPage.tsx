// 이미지 import
import teamLeaderImage from '../assets/team-leader.jpg';
import teamMember1Image from '../assets/team-member-1.jpg';
import teamMember2Image from '../assets/team-member-2.jpg';
import teamMember3Image from '../assets/team-member-3.jpg';

export function AboutPage() {
  // Placeholder 이미지 (이미지가 없을 경우)
  const placeholderImage = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2U1ZTdlYiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTgiIGZpbGw9IiM5Y2EzYWYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj7slYzslYzslYzslYzslYzslYw8L3RleHQ+PC9zdmc+';
  const placeholderImageSmall = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgZmlsbD0iI2U1ZTdlYiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5Y2EzYWYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj7slYzslYzslYzslYzslYzslYw8L3RleHQ+PC9zdmc+';
  
  // 팀장 이미지 사용
  const teamLeaderImg = teamLeaderImage || placeholderImage;

  return (
    <div className="page-sky-background">
      <div className="about-page">
        <div className="about-content">
          {/* 팀 소개 섹션 */}
          <div className="team-section">
            <h2 className="team-section-title">로켓단 팀 소개</h2>
            
            {/* 팀장 카드 */}
            <div className="team-leader-card">
              <div className="team-leader-image-wrapper">
                <img 
                  src={teamLeaderImg}
                  alt="팀장" 
                  className="team-leader-image"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = placeholderImage;
                  }}
                />
              </div>
              <div className="team-leader-info">
                <h3 className="team-leader-name">천규진</h3>
                <p className="team-leader-role">Team Leader</p>
                <p className="team-leader-description">
                  여기몰까 프로젝트에서 프론트엔드·백엔드·AI 스코어링 모델 개발까지
                  전체 기술 구조를 직접 설계하고 구현했습니다.
                  DB 구조화, 보안 설계, UI/UX 디자인 등 핵심 기술 요소를 총괄하며
                  기획·문서작성·발표까지 팀 전체의 방향을 이끌어 왔습니다.
                  프로젝트 전반의 품질과 완성도를 책임지는 풀스택 팀장입니다.
                </p>
              </div>
            </div>

            {/* 팀원 카드들 */}
            <div className="team-members-grid">
              <div className="team-member-card">
                <div className="team-member-image-wrapper">
                  <img 
                    src={teamMember1Image || placeholderImageSmall}
                    alt="유승민" 
                    className="team-member-image"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = placeholderImageSmall;
                    }}
                  />
                </div>
                <h4 className="team-member-name">유승민</h4>
                <p className="team-member-role">Developer</p>
                <p className="team-member-description">
                  초기 프론트엔드·백엔드 개발과 DB 설계, 배포 작업을 맡아
                  프로젝트의 기반 구조를 구축하고 전반적인 디버깅과 기획에 기여했습니다.
                </p>
              </div>

              <div className="team-member-card">
                <div className="team-member-image-wrapper">
                  <img 
                    src={teamMember2Image || placeholderImageSmall}
                    alt="이다영" 
                    className="team-member-image"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = placeholderImageSmall;
                    }}
                  />
                </div>
                <h4 className="team-member-name">이다영</h4>
                <p className="team-member-role">Planner & Designer</p>
                <p className="team-member-description">
                  자료 조사와 디자인 작업을 맡아 서비스 방향성에 기여했으며,
                  발표와 아이디어 도출에서도 프로젝트 완성도를 높여주었습니다.
                </p>
              </div>

              <div className="team-member-card">
                <div className="team-member-image-wrapper">
                  <img 
                    src={teamMember3Image || placeholderImageSmall}
                    alt="전성민" 
                    className="team-member-image"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = placeholderImageSmall;
                    }}
                  />
                </div>
                <h4 className="team-member-name">전성민</h4>
                <p className="team-member-role">Planner & Designer</p>
                <p className="team-member-description">
                  피그잼을 활용한 구조 기획과 문서 작성, 자료조사 등을 맡았으며
                  목업 사이트 개발로 서비스 초기 형태를 구현하는 데 기여했습니다.
                </p>
              </div>
            </div>
          </div>

          <div className="about-hero">
            <div className="about-hero-content">
              <h1 className="about-title">여기몰까란?</h1>
              <p className="about-subtitle">
                <span className="highlight-text">AI 기반 쇼핑몰 신뢰도 분석 플랫폼</span>으로<br />
                온라인 쇼핑의 안전성을 한눈에 확인하세요.
              </p>
              <p className="about-description">
                여기몰까는 사용자 제보와 AI 분석을 결합하여 쇼핑몰의 신뢰도를 종합적으로 평가합니다.
                피싱 사이트 탐지, 피해 사례 공유, 커뮤니티 기반 정보 교환을 통해
                더 안전하고 신뢰할 수 있는 온라인 쇼핑 환경을 만들어갑니다.
              </p>
            </div>
          </div>

          <div className="features">
            <div className="feature-card feature-card-primary">
              <div className="feature-icon">🤖</div>
              <h3>AI 기반 신뢰도 분석</h3>
              <p>자체적으로 학습한 YGMK_AI 모델을 활용하여 리뷰분석 및 신뢰도 스코어링으로 피싱 사이트를 판별하는데 도움을 줍니다.</p>
            </div>
            <div className="feature-card feature-card-secondary">
              <div className="feature-icon">📊</div>
              <h3>종합 신뢰도 평가</h3>
              <p>도메인 나이, SSL 인증, 리다이렉트 체인, 의심 키워드, 사업자등록 정보 존재 여부를 종합하여 쇼핑몰의 신뢰도를 다각도로 평가합니다.</p>
            </div>
            <div className="feature-card feature-card-accent">
              <div className="feature-icon">👥</div>
              <h3>커뮤니티 기반 정보 공유</h3>
              <p>실제 사용자들의 피해 사례와 경험을 공유하고, 안전한 쇼핑몰을 추천받을 수 있습니다.</p>
            </div>
            <div className="feature-card feature-card-success">
              <div className="feature-icon">⚡</div>
              <h3>실시간 업데이트</h3>
              <p>최신 피해 사례 제보와 평점 정보를 실시간으로 확인하여 항상 최신 정보를 제공합니다.</p>
            </div>
          </div>
          
          <div className="how-it-works">
            <h2 className="how-it-works-title">어떻게 작동하나요?</h2>
            <p className="how-it-works-subtitle">간단한 3단계로 쇼핑몰의 신뢰도를 확인하세요.</p>
            <div className="steps">
              <div className="step">
                <div className="step-number">1</div>
                <div className="step-content">
                  <h3>쇼핑몰 URL 검색</h3>
                  <p>검증하고 싶은 쇼핑몰의 URL을 입력하면 AI가 자동으로 신뢰도를 분석하고 신뢰도 점수를 제공합니다.</p>
                </div>
              </div>
              <div className="step">
                <div className="step-number">2</div>
                <div className="step-content">
                  <h3>종합 정보 확인</h3>
                  <p>피해 사례 제보, 사용자 평점, AI 분석 결과, 추천/주의 쇼핑몰 분류 등 종합적인 정보를 한눈에 확인하세요.</p>
                </div>
              </div>
              <div className="step">
                <div className="step-number">3</div>
                <div className="step-content">
                  <h3>정보 공유 및 제보</h3>
                  <p>피해 사례가 있다면 증빙 자료와 함께 제보하고, 커뮤니티에서 다른 사용자들과 정보를 공유하세요.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
