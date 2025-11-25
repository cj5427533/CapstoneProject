import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { requestPasswordReset } from '../utils/api';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (loading) return;
    
    if (!email) {
      toast.error('이메일을 입력해주세요.');
      return;
    }

    setLoading(true);

    try {
      const result = await requestPasswordReset(email);

      if (result.success) {
        setEmailSent(true);
        toast.success('비밀번호 재설정 링크가 이메일로 전송되었습니다!');
      }
    } catch (error: any) {
      console.error('비밀번호 재설정 요청 에러:', error);
      toast.error(error.message || '요청에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot-password-page">
      <div className="forgot-password-container">
        <h1>비밀번호 찾기</h1>
        
        {!emailSent ? (
          <>
            <p className="description">
              가입 시 등록한 이메일을 입력하시면<br />
              비밀번호 재설정 링크를 이메일로 보내드립니다.
            </p>
            
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="email">이메일</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="가입 시 사용한 이메일을 입력하세요"
                />
              </div>

              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? '전송 중...' : '재설정 링크 받기'}
              </button>
            </form>
          </>
        ) : (
          <div className="email-sent-result">
            <div className="success-icon">✓</div>
            <h2>이메일을 확인해주세요!</h2>
            <p className="success-message">
              비밀번호 재설정 링크가 <strong>{email}</strong>로 전송되었습니다.
            </p>
            <p className="info-text">
              이메일에서 링크를 클릭하여 비밀번호를 재설정해주세요.<br />
              링크는 1시간 동안 유효합니다.
            </p>
            
            <p className="warning-note">
              ⚠️ 이메일이 스팸함에 있을 수 있으니 확인해주세요.
            </p>
            
            <p className="resend-text">
              이메일을 받지 못하셨나요?{' '}
              <button 
                onClick={() => {
                  setEmailSent(false);
                  setEmail('');
                }}
                className="resend-btn"
              >
                다시 시도
              </button>
            </p>
          </div>
        )}

        <div className="back-link">
          <Link to="/login">로그인으로 돌아가기</Link>
        </div>
      </div>

      <style>{`
        .forgot-password-page {
          min-height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
          background-color: var(--background-color);
          padding: 2rem;
        }

        .forgot-password-container {
          background: var(--card-background);
          padding: 3rem;
          border-radius: 0.5rem;
          box-shadow: var(--shadow-lg);
          max-width: 450px;
          width: 100%;
        }

        .forgot-password-container h1 {
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
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .submit-btn {
          width: 100%;
          padding: 0.875rem;
          background-color: var(--primary-color);
          color: white;
          border: none;
          border-radius: 0.375rem;
          font-size: 1rem;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .submit-btn:hover:not(:disabled) {
          background-color: var(--primary-hover);
        }

        .submit-btn:disabled {
          background-color: var(--secondary-color);
          cursor: not-allowed;
        }

        .email-sent-result {
          text-align: center;
        }

        .success-icon {
          width: 80px;
          height: 80px;
          background: #4CAF50;
          color: white;
          font-size: 3rem;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 1.5rem;
        }

        .email-sent-result h2 {
          color: #333;
          margin-bottom: 1rem;
          font-size: 1.5rem;
        }

        .success-message {
          color: #333;
          margin-bottom: 1rem;
          font-size: 1rem;
        }

        .success-message strong {
          color: var(--primary-color);
        }

        .info-text {
          color: #666;
          font-size: 0.9rem;
          margin-bottom: 2rem;
          line-height: 1.8;
        }

        .warning-note {
          background: #fff3cd;
          border: 1px solid #ffc107;
          border-radius: 8px;
          padding: 1rem;
          margin: 1.5rem 0;
          color: #856404;
          font-size: 0.9rem;
          text-align: center;
        }

        .resend-text {
          color: #666;
          font-size: 0.9rem;
          margin-top: 2rem;
        }

        .resend-btn {
          background: none;
          border: none;
          color: var(--primary-color);
          cursor: pointer;
          text-decoration: underline;
          font-size: 0.9rem;
          padding: 0;
        }

        .resend-btn:hover {
          color: var(--primary-hover);
        }

        .back-link {
          text-align: center;
          margin-top: 1.5rem;
        }

        .back-link a {
          color: #667eea;
          text-decoration: none;
          font-weight: 500;
        }

        .back-link a:hover {
          text-decoration: underline;
        }

        @media (max-width: 768px) {
          .forgot-password-page {
            padding: 1rem;
          }

          .forgot-password-container {
            padding: 2rem;
          }

          .forgot-password-container h1 {
            font-size: 1.5rem;
          }
        }
      `}</style>
    </div>
  );
}

