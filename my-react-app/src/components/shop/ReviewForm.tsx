import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { createRating } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';

interface ReviewFormProps {
  shopId: number;
  shopUrl: string;
  onReviewSubmitted?: () => void;
}

export function ReviewForm({ shopId, shopUrl, onReviewSubmitted }: ReviewFormProps) {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isAuthenticated) {
      toast.error('리뷰를 작성하려면 로그인이 필요합니다.');
      navigate('/login');
      return;
    }
    
    if (rating === 0) {
      toast.error('평점을 선택해주세요.');
      return;
    }
    
    if (!reviewText.trim()) {
      toast.error('리뷰 내용을 작성해주세요.');
      return;
    }

    if (reviewText.trim().length < 10) {
      toast.error('리뷰는 최소 10자 이상 작성해주세요.');
      return;
    }

    setIsSubmitting(true);

    try {
      console.log('리뷰 등록 시도:', { shopUrl, rating, commentLength: reviewText.trim().length });
      const result = await createRating({
        shopUrl: shopUrl,
        rating: rating,
        comment: reviewText.trim()
      });
      
      console.log('리뷰 등록 성공:', result);

      toast.success('리뷰가 성공적으로 등록되었습니다!');
      
      // 폼 초기화
      setRating(0);
      setReviewText('');
      
      // 부모 컴포넌트에 알림 (약간의 지연을 두어 백엔드에 데이터가 저장될 시간을 줌)
      if (onReviewSubmitted) {
        console.log('리뷰 등록 완료, 목록 새로고침 트리거');
        // 더 긴 지연을 두어 데이터베이스에 확실히 저장되도록 함
        setTimeout(() => {
          console.log('리뷰 목록 새로고침 실행');
          onReviewSubmitted();
        }, 1500);
      }
    } catch (error: any) {
      console.error('리뷰 등록 오류:', error);
      const errorMessage = error?.message || '리뷰 등록 중 오류가 발생했습니다.';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const StarRating = () => (
    <div className="star-rating">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          className={`star ${star <= rating ? 'filled' : ''}`}
          onClick={() => setRating(star)}
          disabled={isSubmitting}
        >
          ⭐
        </button>
      ))}
      <span className="rating-text">
        {rating === 0 ? '평점을 선택하세요' : 
         rating === 1 ? '매우 나쁨' :
         rating === 2 ? '나쁨' :
         rating === 3 ? '보통' :
         rating === 4 ? '좋음' : '매우 좋음'}
      </span>
    </div>
  );

  return (
    <div className="review-form">
      <h3>리뷰 작성하기</h3>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>평점 *</label>
          <StarRating />
        </div>

        <div className="form-group">
          <label htmlFor="reviewText">리뷰 내용 *</label>
          <textarea
            id="reviewText"
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            placeholder="쇼핑몰 이용 경험을 자세히 작성해주세요. 상품 품질, 배송, 고객서비스 등에 대해 솔직한 의견을 남겨주세요."
            className="review-textarea"
            rows={6}
            maxLength={1000}
            disabled={isSubmitting}
            required
          />
          <div className="character-count">
            {reviewText.length}/1000자
          </div>
        </div>

        <div className="form-actions">
          <button 
            type="submit" 
            className="submit-button"
            disabled={isSubmitting || rating === 0 || !reviewText.trim()}
          >
            {isSubmitting ? '등록 중...' : '리뷰 등록하기'}
          </button>
        </div>
      </form>
    </div>
  );
}

