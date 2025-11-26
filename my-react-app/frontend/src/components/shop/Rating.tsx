import { useState, useEffect } from 'react';

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

  // initialRating이 변경되면 rating 상태 업데이트
  useEffect(() => {
    setRating(initialRating);
  }, [initialRating]);

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
      case 'small': return '0.875rem';
      case 'large': return '1.5rem';
      default: return '1.125rem';
    }
  };

  const getStarGap = () => {
    switch (size) {
      case 'small': return '0.125rem';
      case 'large': return '0.3rem';
      default: return '0.2rem';
    }
  };

  const displayRating = hoverRating || rating;
  const stars = [];
  
  for (let i = 1; i <= 5; i++) {
    const isActive = i <= Math.floor(displayRating);
    const isPartial = i === Math.ceil(displayRating) && displayRating % 1 !== 0 && displayRating % 1 > 0;
    const fillPercentage = isPartial ? (displayRating % 1) * 100 : (isActive ? 100 : 0);

    stars.push(
      <span
        key={i}
        className={`star ${isActive || isPartial ? 'active' : ''} ${readonly ? 'readonly' : disabled ? 'disabled' : 'clickable'}`}
        onClick={() => handleClick(i)}
        onMouseEnter={() => handleMouseEnter(i)}
        onMouseLeave={handleMouseLeave}
        style={{ 
          fontSize: getStarSize(), 
          opacity: disabled ? 0.3 : 1,
          position: 'relative',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: getStarSize(),
          height: getStarSize(),
          lineHeight: 1,
          color: '#d1d5db',
          overflow: 'visible'
        }}
      >
        <span style={{ 
          position: 'absolute',
          left: 0,
          top: 0,
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#d1d5db',
          zIndex: 1
        }}>
          ★
        </span>
        {(isActive || isPartial) && (
          <span style={{ 
            position: 'absolute',
            left: 0,
            top: 0,
            width: `${fillPercentage}%`,
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            color: '#fbbf24',
            zIndex: 2
          }}>
            ★
          </span>
        )}
      </span>
    );
  }

  return (
    <div className="rating-container" style={{ gap: getStarGap(), display: 'flex', alignItems: 'center' }}>
      <div className="stars" style={{ gap: getStarGap(), display: 'flex', alignItems: 'center', height: '100%' }}>
        {stars}
      </div>
      {readonly && rating > 0 && (
        <span className="rating-text" style={{ fontSize: size === 'large' ? '0.875rem' : size === 'small' ? '0.75rem' : '0.875rem' }}>
          {rating}점
        </span>
      )}
    </div>
  );
}

