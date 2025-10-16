import { useState } from 'react';

interface RatingProps {
  initialRating?: number;
  onRatingChange?: (rating: number) => void;
  readonly?: boolean;
  disabled?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export function Rating({ initialRating = 0, onRatingChange, readonly = false, disabled = false, size = 'medium' }: RatingProps) {
  const [rating, setRating] = useState(initialRating);
  const [hoverRating, setHoverRating] = useState(0);

  const handleClick = (value: number) => {
    if (!readonly && !disabled) {
      setRating(value);
      onRatingChange?.(value);
    }
  };

  const handleMouseEnter = (value: number) => {
    if (!readonly && !disabled) {
      setHoverRating(value);
    }
  };

  const handleMouseLeave = () => {
    if (!readonly && !disabled) {
      setHoverRating(0);
    }
  };

  const getStarSize = () => {
    switch (size) {
      case 'small': return '1rem';
      case 'large': return '2rem';
      default: return '1.5rem';
    }
  };

  const stars = [];
  for (let i = 1; i <= 5; i++) {
    const isActive = i <= (hoverRating || rating);
    stars.push(
      <span
        key={i}
        className={`star ${isActive ? 'active' : ''} ${readonly ? 'readonly' : disabled ? 'disabled' : 'clickable'}`}
        onClick={() => handleClick(i)}
        onMouseEnter={() => handleMouseEnter(i)}
        onMouseLeave={handleMouseLeave}
        style={{ fontSize: getStarSize(), opacity: disabled ? 0.3 : 1 }}
      >
        ★
      </span>
    );
  }

  return (
    <div className="rating-container">
      <div className="stars">
        {stars}
      </div>
      {rating > 0 && (
        <span className="rating-text">
          {rating}점
        </span>
      )}
    </div>
  );
}
