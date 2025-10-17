import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';
import { useState } from 'react';

export function Header() {
  const {isAuthenticated, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    toast.success('로그아웃되었습니다.');
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <header className="header">
      <div className="header-container">
        {/* 메인 네비게이션 메뉴 */}
        <nav className="main-nav">
          <Link to="/" className="nav-link">
            홈
          </Link>
          <Link to="/about" className="nav-link">
            설명
          </Link>
          <Link to="/community" className="nav-link">
            커뮤니티
          </Link>
          <Link to="/dangerous-shops" className="nav-link">
            위험 쇼핑몰
          </Link>
          <Link to="/recommended-shops" className="nav-link">
            추천 쇼핑몰
          </Link>
        </nav>

        {/* 사용자 메뉴 */}
        <nav className="user-nav">
          {isAuthenticated ? (
            <div className="user-menu">
              <Link to="/mypage" className="nav-button mypage">
                마이페이지
              </Link>
              
              <button onClick={handleLogout} className="nav-button logout">
                로그아웃
              </button>
            </div>
          ) : (
            <>
              <Link to="/login" className="nav-button">
                로그인
              </Link>
              <Link to="/signup" className="nav-button signup">
                회원가입
              </Link>
            </>
          )}
        </nav>

        {/* 모바일 메뉴 버튼 */}
        <button className="mobile-menu-button" onClick={toggleMenu}>
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>

      {/* 모바일 메뉴 */}
      {isMenuOpen && (
        <div className="mobile-menu">
          <Link to="/" className="mobile-nav-link" onClick={() => setIsMenuOpen(false)}>
            홈
          </Link>
          <Link to="/about" className="mobile-nav-link" onClick={() => setIsMenuOpen(false)}>
            설명
          </Link>
          <Link to="/community" className="mobile-nav-link" onClick={() => setIsMenuOpen(false)}>
            커뮤니티
          </Link>
          <Link to="/dangerous" className="mobile-nav-link" onClick={() => setIsMenuOpen(false)}>
            위험 쇼핑몰
          </Link>
          <Link to="/top-rated" className="mobile-nav-link" onClick={() => setIsMenuOpen(false)}>
            추천 쇼핑몰
          </Link>
          {isAuthenticated ? (
            <>
              <Link to="/mypage" className="mobile-nav-link" onClick={() => setIsMenuOpen(false)}>
                마이페이지
              </Link>
              <button onClick={() => { handleLogout(); setIsMenuOpen(false); }} className="mobile-nav-link" style={{ width: '100%', textAlign: 'left' }}>
                로그아웃
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="mobile-nav-link" onClick={() => setIsMenuOpen(false)}>
                로그인
              </Link>
              <Link to="/signup" className="mobile-nav-link" onClick={() => setIsMenuOpen(false)}>
                회원가입
              </Link>
            </>
          )}
        </div>
      )}
    </header>
  );
}
