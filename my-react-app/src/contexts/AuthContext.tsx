import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, removeAuthToken, getMe, getAuthToken } from '../utils/api';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (user: User) => void;
  logout: () => void;
  updateUser: (userData: User) => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 초기 사용자 정보 로드
    const loadUser = async () => {
      try {
        // localStorage에서 사용자 정보 복원 (빠른 표시를 위해)
        const savedUser = localStorage.getItem('user');
        if (savedUser) {
          try {
            const parsedUser = JSON.parse(savedUser);
            setUser(parsedUser);
          } catch (error) {
            console.error('사용자 정보 복원 실패:', error);
            localStorage.removeItem('user');
            localStorage.removeItem('userId');
          }
        }

        // 토큰이 있으면 서버에서 최신 사용자 정보 가져오기 (role 포함)
        const token = getAuthToken();
        if (token) {
          try {
            const { user: currentUser } = await getMe();
            if (currentUser) {
              setUser(currentUser);
              localStorage.setItem('user', JSON.stringify(currentUser));
              localStorage.setItem('userId', currentUser.id.toString());
            }
          } catch (error) {
            console.error('최신 사용자 정보 조회 실패:', error);
            // 토큰이 유효하지 않으면 로그아웃 처리
            if (error instanceof Error && error.message.includes('401')) {
              removeAuthToken();
              localStorage.removeItem('user');
              localStorage.removeItem('userId');
              setUser(null);
            }
          }
        }
      } catch (error) {
        console.error('사용자 정보 로드 오류:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  const login = (userData: User) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('userId', userData.id.toString());
    // 즉시 리렌더링 강제
    window.dispatchEvent(new Event('storage'));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('userId');
    removeAuthToken(); // JWT 토큰도 제거
  };

  const updateUser = (userData: User) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('userId', userData.id.toString());
    // 즉시 리렌더링 강제
    window.dispatchEvent(new Event('storage'));
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    login,
    logout,
    updateUser,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
