/**
 * 이메일 발송 서비스
 */
const nodemailer = require('nodemailer');
require('dotenv').config();

// Gmail SMTP 설정
const emailTransporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD
  }
});

// 이메일 전송 확인 (서버 시작 시)
if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
  console.log('=== Gmail SMTP 설정 ===');
  console.log('Gmail 계정:', process.env.GMAIL_USER);
  console.log('앱 비밀번호:', process.env.GMAIL_APP_PASSWORD ? '설정됨 ✓' : '미설정');
  console.log('====================');
  
  // Gmail 연결 테스트
  emailTransporter.verify(function(error, success) {
    if (error) {
      console.error('❌ Gmail SMTP 연결 실패:', error.message);
    } else {
      console.log('✅ Gmail SMTP 서버 연결 성공!');
    }
  });
} else {
  console.warn('⚠️  Gmail SMTP 설정이 완료되지 않았습니다. .env 파일을 확인하세요.');
}

/**
 * 비밀번호 재설정 이메일 발송
 */
async function sendPasswordResetEmail(email, resetLink) {
  const mailOptions = {
    from: `"여기몰까 - 안전한 쇼핑몰 검증" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: '[여기몰까] 비밀번호 재설정 요청',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            background-color: #f5f5f5;
            margin: 0;
            padding: 0;
          }
          .email-container { 
            max-width: 600px; 
            margin: 20px auto; 
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          }
          .header { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
            color: white; 
            padding: 40px 30px; 
            text-align: center;
          }
          .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 600;
          }
          .header p {
            margin: 10px 0 0 0;
            opacity: 0.9;
            font-size: 14px;
          }
          .content { 
            padding: 40px 30px;
            background: white;
          }
          .content p {
            margin: 0 0 20px 0;
            color: #555;
          }
          .button-container {
            text-align: center;
            margin: 35px 0;
          }
          .button { 
            display: inline-block; 
            padding: 16px 40px; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white !important; 
            text-decoration: none; 
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
            transition: transform 0.2s;
          }
          .button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
          }
          .link-box {
            background: #f9f9f9;
            padding: 15px;
            border-radius: 6px;
            border-left: 4px solid #667eea;
            margin: 20px 0;
            word-break: break-all;
            font-size: 13px;
            color: #666;
          }
          .warning-box {
            background: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            border-radius: 6px;
            margin: 25px 0;
          }
          .warning-box p {
            margin: 0;
            color: #856404;
          }
          .warning-box strong {
            color: #d39e00;
          }
          .footer { 
            text-align: center; 
            padding: 30px;
            background: #f9f9f9;
            color: #999;
            font-size: 13px;
            border-top: 1px solid #eee;
          }
          .footer p {
            margin: 5px 0;
          }
          .divider {
            height: 1px;
            background: linear-gradient(to right, transparent, #ddd, transparent);
            margin: 30px 0;
          }
          .icon {
            font-size: 48px;
            margin-bottom: 10px;
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="header">
            <div class="icon">🔐</div>
            <h1>비밀번호 재설정</h1>
            <p>여기몰까 - 안전한 쇼핑을 위한 첫걸음</p>
          </div>
          
          <div class="content">
            <p>안녕하세요,</p>
            <p>고객님의 계정에 대한 비밀번호 재설정 요청을 받았습니다.</p>
            <p>아래 버튼을 클릭하여 새로운 비밀번호를 설정하세요:</p>
            
            <div class="button-container">
              <a href="${resetLink}" class="button">비밀번호 재설정하기</a>
            </div>
            
            <div class="divider"></div>
            
            <p style="font-size: 14px; color: #777;">버튼이 작동하지 않는다면, 아래 링크를 복사하여 브라우저 주소창에 붙여넣으세요:</p>
            <div class="link-box">
              ${resetLink}
            </div>
            
            <div class="warning-box">
              <p>⚠️ 이 링크는 <strong>1시간 동안만 유효</strong>합니다.</p>
              <p style="margin-top: 8px;">⏱️ 만료 후에는 다시 요청해주세요.</p>
            </div>
            
            <div class="divider"></div>
            
            <p style="color: #999; font-size: 13px; line-height: 1.8;">
              💡 <strong>보안 안내</strong><br>
              • 본인이 요청하지 않았다면 이 이메일을 무시하세요.<br>
              • 비밀번호를 타인과 절대 공유하지 마세요.<br>
              • 의심스러운 활동이 있다면 즉시 고객센터로 연락주세요.
            </p>
          </div>
          
          <div class="footer">
            <p><strong>여기몰까</strong> - 안전한 쇼핑몰 검증 서비스</p>
            <p>이 이메일에 회신하지 마세요. 자동 발송된 메일입니다.</p>
            <p style="margin-top: 15px; color: #ccc;">© 2024 여기몰까. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    const info = await emailTransporter.sendMail(mailOptions);
    console.log('✅ 이메일 전송 성공!');
    console.log('   메시지 ID:', info.messageId);
    console.log('   받는 사람:', email);
    return true;
  } catch (error) {
    console.error('❌ 이메일 전송 실패:', error.message);
    throw error;
  }
}

module.exports = {
  sendPasswordResetEmail
};

