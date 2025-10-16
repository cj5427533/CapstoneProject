// 에러 처리 미들웨어
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (err: any, req: any, res: any, next: any) => {
  let error = { ...err };
  error.message = err.message;

  // Supabase 에러 처리
  if (err.code) {
    switch (err.code) {
      case 'PGRST116':
        error = new AppError('요청한 데이터를 찾을 수 없습니다.', 404);
        break;
      case '23505':
        error = new AppError('중복된 데이터입니다.', 409);
        break;
      case '23503':
        error = new AppError('관련 데이터가 존재하지 않습니다.', 400);
        break;
      default:
        error = new AppError('데이터베이스 오류가 발생했습니다.', 500);
    }
  }

  // JWT 에러 처리
  if (err.name === 'JsonWebTokenError') {
    error = new AppError('유효하지 않은 토큰입니다.', 401);
  }
  if (err.name === 'TokenExpiredError') {
    error = new AppError('토큰이 만료되었습니다.', 401);
  }

  // 입력 검증 에러
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map((val: any) => val.message).join(', ');
    error = new AppError(message, 400);
  }

  res.status(error.statusCode || 500).json({
    success: false,
    error: error.message || '서버 오류가 발생했습니다.',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

export const asyncHandler = (fn: Function) => {
  return (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
