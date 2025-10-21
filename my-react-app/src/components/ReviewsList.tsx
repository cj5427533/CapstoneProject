import { useState, useEffect } from 'react';
import { getShopRatings } from '../utils/api';
import { Rating as RatingData } from '../utils/api';

interface ReviewsListProps {
  shopId: number;
  onReviewAdded?: () => void;
}

interface Review {
  id: number;
  rating: number;
  review_text: string;
  created_at: string;
  user_id: number;
  username?: string;
}

export function ReviewsList({ shopId, onReviewAdded }: ReviewsListProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'rating'>('newest');

  useEffect(() => {
    loadReviews();
  }, [shopId]);

  useEffect(() => {
    if (onReviewAdded) {
      loadReviews();
    }
  }, [onReviewAdded]);

  const loadReviews = async () => {
    try {
      setLoading(true);
      const ratingData = await getShopRatings(shopId);
      
      // 리뷰 데이터가 있다면 설정 (실제 API 응답 구조에 따라 조정 필요)
      if (ratingData.reviews) {
        setReviews(ratingData.reviews);
      } else {
        setReviews([]);
      }
    } catch (error) {
      console.error('리뷰 목록 로드 오류:', error);
      setReviews([]);
    } finally {
      setLoading(false);
    }
  };

  const sortReviews = (reviews: Review[]) => {
    switch (sortBy) {
      case 'newest':
        return [...reviews].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      case 'oldest':
        return [...reviews].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      case 'rating':
        return [...reviews].sort((a, b) => b.rating - a.rating);
      default:
        return reviews;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderStars = (rating: number) => {
    return (
      <div className="star-display">
        {[1, 2, 3, 4, 5].map(star => (
          <span key={star} className={`star ${star <= rating ? 'filled' : ''}`}>
            ⭐
          </span>
        ))}
      </div>
    );
  };

  const sortedReviews = sortReviews(reviews);

  if (loading) {
    return (
      <div className="reviews-list">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>리뷰를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="reviews-list">
      <div className="reviews-header">
        <h3>사용자 리뷰 ({reviews.length}개)</h3>
        
        {reviews.length > 0 && (
          <div className="sort-controls">
            <label>정렬:</label>
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest' | 'rating')}
              className="sort-select"
            >
              <option value="newest">최신순</option>
              <option value="oldest">오래된순</option>
              <option value="rating">평점순</option>
            </select>
          </div>
        )}
      </div>

      {reviews.length === 0 ? (
        <div className="empty-reviews">
          <div className="empty-icon">💬</div>
          <h4>아직 작성된 리뷰가 없습니다</h4>
          <p>첫 번째 리뷰를 작성해보세요!</p>
        </div>
      ) : (
        <div className="reviews-container">
          {sortedReviews.map(review => (
            <div key={review.id} className="review-card">
              <div className="review-header">
                <div className="reviewer-info">
                  <span className="username">
                    {review.username || `사용자${review.user_id}`}
                  </span>
                  <span className="review-date">
                    {formatDate(review.created_at)}
                  </span>
                </div>
                <div className="review-rating">
                  {renderStars(review.rating)}
                  <span className="rating-number">{review.rating}/5</span>
                </div>
              </div>
              
              <div className="review-content">
                <p>{review.review_text}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
