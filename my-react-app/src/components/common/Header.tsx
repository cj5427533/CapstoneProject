import { Link, NavLink } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';
import { useState, useEffect, useRef } from 'react';
import logoMark from '@/ygmk_logo.png';

export function Header() {
  const {isAuthenticated, logout, user } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAdminDropdownOpen, setIsAdminDropdownOpen] = useState(false);
  const adminDropdownRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => {
    logout();
    toast.success('로그아웃되었습니다.');
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (adminDropdownRef.current && !adminDropdownRef.current.contains(event.target as Node)) {
        setIsAdminDropdownOpen(false);
      }
    };

    if (isAdminDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isAdminDropdownOpen]);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-white/90 backdrop-blur shadow-sm">
      <div className="container-custom flex h-16 items-center justify-between">
        <div className="flex items-center gap-6">
          <Link
            to="/"
            className="flex items-center gap-2 text-lg font-semibold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
          >
            <img src={logoMark} alt="여기몰까 로고" className="h-9 w-9 object-contain" />
            <span>여기몰까</span>
          </Link>
          <nav aria-label="Primary" className="hidden md:flex items-center gap-4 text-sm">
            <NavLinkItem to="/" label="홈" />
            <NavLinkItem to="/about" label="설명" />
            <NavLinkItem to="/reports" label="피해사례" />
            <NavLinkItem to="/dangerous-shops" label="주의가 필요한 쇼핑몰" />
            <NavLinkItem to="/recommended-shops" label="추천 쇼핑몰" />
            <NavLinkItem to="/community" label="커뮤니티" />
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-5">
            {isAuthenticated ? (
              <>
                {user?.role === 'admin' ? (
                  <div 
                    ref={adminDropdownRef}
                    className="relative"
                  >
                    <div className="flex items-center gap-1">
                      <Link
                        to="/admin"
                        className="text-sm text-black hover:text-black transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
                      >
                        관리자 페이지
                      </Link>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setIsAdminDropdownOpen(!isAdminDropdownOpen);
                        }}
                        className="flex items-center justify-center p-0.5 hover:bg-gray-100 rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
                        aria-label="메뉴 토글"
                      >
                        <svg 
                          width="12" 
                          height="12" 
                          viewBox="0 0 12 12" 
                          fill="none" 
                          stroke="currentColor" 
                          strokeWidth="2" 
                          strokeLinecap="round" 
                          strokeLinejoin="round"
                          className={`transition-transform ${isAdminDropdownOpen ? 'rotate-180' : ''}`}
                        >
                          <polyline points="3 4 6 7 9 4"></polyline>
                        </svg>
                      </button>
                    </div>
                    {isAdminDropdownOpen && (
                      <div 
                        className="absolute right-0 mt-2 w-48 rounded-md border bg-white shadow-lg z-50"
                      >
                        <Link
                          to="/admin"
                          className="block px-4 py-2 text-sm text-black hover:bg-gray-100 transition-colors"
                          onClick={() => setIsAdminDropdownOpen(false)}
                        >
                          관리자 페이지
                        </Link>
                        <Link
                          to="/mypage"
                          className="block px-4 py-2 text-sm text-black hover:bg-gray-100 transition-colors"
                          onClick={() => setIsAdminDropdownOpen(false)}
                        >
                          마이페이지
                        </Link>
                      </div>
                    )}
                  </div>
                ) : (
                  <Link
                    to="/mypage"
                    className="text-sm text-black hover:text-black transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
                  >
                    마이페이지
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  className="text-sm text-black hover:text-black transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
                >
                  로그아웃
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-sm text-black hover:text-black transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
                >
                  로그인
                </Link>
                <Link
                  to="/signup"
                  className="text-sm text-black hover:text-black transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
                >
                  회원가입
                </Link>
              </>
            )}
          </div>

          <div className="relative md:hidden">
            <button
              type="button"
              onClick={toggleMenu}
              aria-haspopup="menu"
              aria-expanded={isMenuOpen}
              aria-label="메뉴 열기"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border bg-background text-foreground shadow-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
            >
              <span className="sr-only">메뉴</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            </button>
            {isMenuOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-56 rounded-md border bg-popover text-popover-foreground shadow focus:outline-none"
              >
                <div className="p-1 text-sm">
                  <MobileMenuLink to="/" label="홈" onClick={() => setIsMenuOpen(false)} />
                  <MobileMenuLink to="/about" label="설명" onClick={() => setIsMenuOpen(false)} />
                  <MobileMenuLink to="/reports" label="피해사례" onClick={() => setIsMenuOpen(false)} />
                  <MobileMenuLink to="/dangerous-shops" label="주의가 필요한 쇼핑몰" onClick={() => setIsMenuOpen(false)} />
                  <MobileMenuLink to="/recommended-shops" label="추천 쇼핑몰" onClick={() => setIsMenuOpen(false)} />
                  {isAuthenticated && (
                    <>
                      {user?.role === 'admin' && (
                        <>
                          <MobileMenuLink to="/admin" label="관리자 페이지" onClick={() => setIsMenuOpen(false)} />
                          <MobileMenuLink to="/mypage" label="마이페이지" onClick={() => setIsMenuOpen(false)} />
                        </>
                      )}
                      {user?.role !== 'admin' && (
                        <MobileMenuLink to="/mypage" label="마이페이지" onClick={() => setIsMenuOpen(false)} />
                      )}
                    </>
                  )}
                  <div className="my-1 h-px bg-border" />
                  {isAuthenticated ? (
                    <button
                      onClick={() => {
                        handleLogout();
                        setIsMenuOpen(false);
                      }}
                      className="w-full rounded-sm px-3 py-2 text-left text-black hover:bg-muted hover:text-black"
                    >
                      로그아웃
                    </button>
                  ) : (
                    <>
                      <MobileMenuLink to="/login" label="로그인" onClick={() => setIsMenuOpen(false)} />
                      <MobileMenuLink to="/signup" label="회원가입" onClick={() => setIsMenuOpen(false)} />
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

// 내부 컴포넌트: NavLinkItem

function NavLinkItem({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }: { isActive: boolean }) =>
        [
          'text-black transition-colors hover:text-black',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background',
          isActive ? 'underline underline-offset-4 decoration-muted' : ''
        ].join(' ')
      }
    >
      {label}
    </NavLink>
  );
}

function MobileMenuLink({ to, label, onClick }: { to: string; label: string; onClick?: () => void }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="block rounded-sm px-3 py-2 text-black hover:bg-muted hover:text-black"
    >
      {label}
    </Link>
  );
}

