import { useState } from 'react';
import { toast } from 'react-toastify';
import { createRating } from '../utils/api';

interface ReviewFormProps {
  shopId: number;
  shopUrl: string;
  onReviewSubmitted?: () => void;
}

export function ReviewForm({ onReviewSubmitted }: ReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
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
      await createRating({
        shopUrl: '', // shopUrl은 필요하지 않음
        rating: rating
      });

      toast.success('리뷰가 성공적으로 등록되었습니다!');
      
      // 폼 초기화
      setRating(0);
      setReviewText('');
      
      // 부모 컴포넌트에 알림
      if (onReviewSubmitted) {
        onReviewSubmitted();
      }
    } catch (error) {
      console.error('리뷰 등록 오류:', error);
      toast.error('리뷰 등록 중 오류가 발생했습니다.');
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
