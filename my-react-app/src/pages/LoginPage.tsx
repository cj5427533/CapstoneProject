import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { login } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';

export function LoginPage() {
  const navigate = useNavigate();
  const { login: authLogin } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (loading) return;
    
    if (!formData.email || !formData.password) {
      toast.error('이메일과 비밀번호를 입력해주세요.');
      return;
    }

    setLoading(true);

    try {
      const result = await login({
        email: formData.email,
        password: formData.password
      });

      // AuthContext를 통해 즉시 로그인 상태 업데이트
      if (result.user) {
        authLogin(result.user);
        toast.success('로그인되었습니다!');
      }
      
      // 로그인 성공 시 홈페이지로 이동
      navigate('/');
    } catch (error) {
      console.error('로그인 에러:', error);
      // 로그인 실패 시에만 경고창 표시
      toast.error('이메일 또는 비밀번호가 틀렸습니다. 다시 입력해주세요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <h1>로그인</h1>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">이메일</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="이메일을 입력하세요"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">비밀번호</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="비밀번호를 입력하세요"
            />
          </div>

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <div className="signup-link">
          계정이 없으신가요? <Link to="/signup">회원가입</Link>
        </div>
        
        <div className="forgot-password-link">
          비밀번호를 잊으셨나요? <Link to="/forgot-password">비밀번호 찾기</Link>
        </div>
      </div>
    </div>
  );
}