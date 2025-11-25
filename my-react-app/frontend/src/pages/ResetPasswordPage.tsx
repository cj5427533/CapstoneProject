import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { resetPassword } from '../utils/api';

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [token, setToken] = useState<string>('');
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const tokenFromUrl = searchParams.get('token');
    if (!tokenFromUrl) {
      toast.error('유효하지 않은 재설정 링크입니다.');
      navigate('/forgot-password');
    } else {
      setToken(tokenFromUrl);
    }
  }, [searchParams, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (loading) return;
    
    if (!formData.newPassword || !formData.confirmPassword) {
      toast.error('모든 필드를 입력해주세요.');
      return;
    }

    if (formData.newPassword.length < 6) {
      toast.error('비밀번호는 최소 6자 이상이어야 합니다.');
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      toast.error('비밀번호가 일치하지 않습니다.');
      return;
    }

    setLoading(true);

    try {
      const result = await resetPassword(token, formData.newPassword);

      if (result.success) {
        toast.success('비밀번호가 변경되었습니다! 로그인해주세요.');
        navigate('/login');
      }
    } catch (error: any) {
      console.error('비밀번호 재설정 에러:', error);
      toast.error(error.message || '비밀번호 재설정에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="reset-password-page">
      <div className="reset-password-container">
        <h1>비밀번호 재설정</h1>
        
        <p className="description">
          새로운 비밀번호를 입력해주세요.
        </p>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="newPassword">새 비밀번호</label>
            <input
              type="password"
              id="newPassword"
              name="newPassword"
              value={formData.newPassword}
              onChange={handleChange}
              required
              placeholder="새 비밀번호 (최소 6자)"
              minLength={6}
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">비밀번호 확인</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              placeholder="비밀번호 확인"
            />
          </div>

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? '변경 중...' : '비밀번호 변경'}
          </button>
        </form>
      </div>

      <style>{`
        .reset-password-page {
          min-height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
          background-color: var(--background-color);
          padding: 2rem;
        }

        .reset-password-container {
          background: var(--card-background);
          padding: 3rem;
          border-radius: 0.5rem;
          box-shadow: var(--shadow-lg);
          max-width: 450px;
          width: 100%;
        }

        .reset-password-container h1 {
          text-align: center;
          color: #333;
          margin-bottom: 1rem;
          font-size: 2rem;
        }

        .description {
          text-align: center;
          color: #666;
          margin-bottom: 2rem;
          line-height: 1.6;
        }

        .form-group {
          margin-bottom: 1.5rem;
        }

        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          color: #333;
          font-weight: 500;
        }

        .form-group input {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #ddd;
          border-radius: 8px;
          font-size: 1rem;
          transition: border-color 0.3s;
        }

        .form-group input:focus {
          outline: none;
          border-color: var(--primary-color);
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }

        .submit-btn {
          width: 100%;
          padding: 1rem;
          background: var(--primary-color);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.3s;
        }

        .submit-btn:hover:not(:disabled) {
          background: var(--primary-hover);
        }

        .submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        @media (max-width: 768px) {
          .reset-password-page {
            padding: 1rem;
          }

          .reset-password-container {
            padding: 2rem;
          }

          .reset-password-container h1 {
            font-size: 1.5rem;
          }
        }
      `}</style>
    </div>
  );
}

