import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { sendSMSVerification, verifySMSCode, register, checkUsernameAvailability } from '../utils/api';

export function SignupPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    phoneNumber: '',
    verificationCode: ''
  });
  
  const [verificationSent, setVerificationSent] = useState(false);
  const [verificationVerified, setVerificationVerified] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState(false);
  
  // 사용자명 중복 확인 관련 상태
  const [usernameChecked, setUsernameChecked] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState(false);
  const [usernameMessage, setUsernameMessage] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // 사용자명이 변경되면 중복 확인 상태 초기화
    if (name === 'username') {
      setUsernameChecked(false);
      setUsernameAvailable(false);
      setUsernameMessage('');
      
      // 20자 제한
      if (value.length > 20) {
        return;
      }
    }
    
    setFormData({
      ...formData,
      [name]: value
    });
  };

  // 사용자명 중복 확인
  const checkUsername = async () => {
    const username = formData.username.trim();
    
    if (!username) {
      setUsernameMessage('사용자명을 입력해주세요.');
      setUsernameChecked(false);
      setUsernameAvailable(false);
      return;
    }

    if (username.length < 2) {
      setUsernameMessage('사용자명은 최소 2자 이상이어야 합니다.');
      setUsernameChecked(false);
      setUsernameAvailable(false);
      return;
    }

    if (username.length > 20) {
      setUsernameMessage('사용자명은 최대 20자까지 가능합니다.');
      setUsernameChecked(false);
      setUsernameAvailable(false);
      return;
    }

    try {
      const result = await checkUsernameAvailability(username);
      setUsernameChecked(true);
      setUsernameAvailable(result.available);
      setUsernameMessage(result.message);
    } catch (error) {
      console.error('사용자명 확인 에러:', error);
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
      setUsernameMessage(errorMessage);
      setUsernameChecked(false);
      setUsernameAvailable(false);
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, ''); // 숫자만 허용
    if (value.length > 11) value = value.slice(0, 11); // 최대 11자리
    
    // 하이픈 자동 추가
    if (value.length >= 7) {
      value = value.slice(0, 3) + '-' + value.slice(3, 7) + '-' + value.slice(7);
    } else if (value.length >= 3) {
      value = value.slice(0, 3) + '-' + value.slice(3);
    }
    
    setFormData({
      ...formData,
      phoneNumber: value
    });
  };

  const sendVerificationCode = async () => {
    if (!formData.phoneNumber || formData.phoneNumber.replace(/\D/g, '').length !== 11) {
      toast.error('올바른 휴대폰 번호를 입력해주세요.');
      return;
    }

    try {
      await sendSMSVerification(formData.phoneNumber);
      setVerificationSent(true);
      setCountdown(180); // 3분 타이머
      toast.success('인증번호가 발송되었습니다.');
      
      // 카운트다운 타이머
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
    } catch (error) {
      console.error('SMS 발송 에러:', error);
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
      toast.error('SMS 발송에 실패했습니다: ' + errorMessage);
    }
  };

  const verifyCode = async () => {
    if (!formData.verificationCode) {
      toast.error('인증번호를 입력해주세요.');
      return;
    }

    try {
      await verifySMSCode(formData.phoneNumber, formData.verificationCode);
      setVerificationVerified(true);
      toast.success('인증이 완료되었습니다.');
    } catch (error) {
      console.error('인증 에러:', error);
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
      toast.error('인증번호가 올바르지 않습니다: ' + errorMessage);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (loading) return;
    
    // 필수 필드 검증
    if (!formData.username || formData.username.trim() === '') {
      toast.error('사용자명을 입력해주세요.');
      return;
    }
    
    if (!formData.email || formData.email.trim() === '') {
      toast.error('이메일을 입력해주세요.');
      return;
    }
    
    if (!formData.password || formData.password.trim() === '') {
      toast.error('비밀번호를 입력해주세요.');
      return;
    }
    
    if (!formData.confirmPassword || formData.confirmPassword.trim() === '') {
      toast.error('비밀번호 확인을 입력해주세요.');
      return;
    }
    
    if (!formData.phoneNumber || formData.phoneNumber.trim() === '') {
      toast.error('전화번호를 입력해주세요.');
      return;
    }
    
    if (!formData.verificationCode || formData.verificationCode.trim() === '') {
      toast.error('인증번호를 입력해주세요.');
      return;
    }

    // 사용자명 길이 검증 (2~20자)
    if (formData.username.length < 2) {
      toast.error('사용자명은 최소 2자 이상이어야 합니다.');
      return;
    }
    
    if (formData.username.length > 20) {
      toast.error('사용자명은 최대 20자까지 가능합니다.');
      return;
    }

    // 사용자명 중복 확인 완료 여부 검증
    if (!usernameChecked || !usernameAvailable) {
      toast.error('사용자명 중복 확인을 완료해주세요.');
      return;
    }

    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error('올바른 이메일 형식을 입력해주세요.');
      return;
    }

    // 비밀번호 일치 검증
    if (formData.password !== formData.confirmPassword) {
      toast.error('비밀번호가 일치하지 않습니다.');
      return;
    }

    // 비밀번호 길이 검증
    if (formData.password.length < 6) {
      toast.error('비밀번호는 최소 6자 이상이어야 합니다.');
      return;
    }

    // 전화번호 형식 검증
    const phoneRegex = /^010-?\d{4}-?\d{4}$/;
    if (!phoneRegex.test(formData.phoneNumber.replace(/\s/g, ''))) {
      toast.error('올바른 전화번호 형식을 입력해주세요. (예: 010-1234-5678)');
      return;
    }

    // SMS 인증 완료 확인
    if (!verificationVerified) {
      toast.error('휴대폰 인증을 완료해주세요.');
      return;
    }

    setLoading(true);

    try {
      await register({
        username: formData.username,
        email: formData.email,
        password: formData.password,
        phoneNumber: formData.phoneNumber,
        verificationCode: formData.verificationCode
      });

      toast.success('회원가입이 완료되었습니다!');
      navigate('/login');
    } catch (error) {
      console.error('회원가입 에러:', error);
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
      toast.error('회원가입에 실패했습니다: ' + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-page">
      <div className="signup-container">
        <h1>회원가입</h1>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">사용자명 (2~20자)</label>
            <div className="username-input-group">
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                required
                placeholder="사용자명을 입력하세요 (2~20자)"
                maxLength={20}
                disabled={usernameChecked && usernameAvailable}
              />
              <button
                type="button"
                onClick={checkUsername}
                disabled={!formData.username || (usernameChecked && usernameAvailable)}
                className="verify-btn"
              >
                {usernameChecked && usernameAvailable ? '확인완료' : '중복확인'}
              </button>
            </div>
            {usernameMessage && (
              <div className={`username-message ${usernameAvailable ? 'success' : 'error'}`}>
                {usernameAvailable ? '✅ ' : '❌ '}{usernameMessage}
              </div>
            )}
          </div>

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
              placeholder="비밀번호를 입력하세요 (6자 이상)"
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
              placeholder="비밀번호를 다시 입력하세요"
            />
          </div>

          <div className="form-group">
            <label htmlFor="phoneNumber">휴대폰 번호</label>
            <div className="phone-input-group">
              <input
                type="tel"
                id="phoneNumber"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handlePhoneChange}
                required
                placeholder="010-1234-5678"
                disabled={verificationVerified}
              />
              <button
                type="button"
                onClick={sendVerificationCode}
                disabled={verificationSent || verificationVerified || countdown > 0}
                className="verify-btn"
              >
                {countdown > 0 ? `${Math.floor(countdown / 60)}:${(countdown % 60).toString().padStart(2, '0')}` : '인증번호 발송'}
              </button>
            </div>
          </div>

          {verificationSent && !verificationVerified && (
            <div className="form-group">
              <label htmlFor="verificationCode">인증번호</label>
              <div className="verification-input-group">
                <input
                  type="text"
                  id="verificationCode"
                  name="verificationCode"
                  value={formData.verificationCode}
                  onChange={handleChange}
                  required
                  placeholder="인증번호 6자리를 입력하세요"
                  maxLength={6}
                />
                <button
                  type="button"
                  onClick={verifyCode}
                  className="verify-btn"
                >
                  인증하기
                </button>
              </div>
            </div>
          )}

          {verificationVerified && (
            <div className="verification-success">
              ✅ 휴대폰 인증이 완료되었습니다.
            </div>
          )}

          <button type="submit" className="submit-btn" disabled={loading || !verificationVerified}>
            {loading ? '가입 중...' : '회원가입'}
          </button>
        </form>

        <div className="login-link">
          이미 계정이 있으신가요? <Link to="/login">로그인</Link>
        </div>
      </div>
    </div>
  );
}