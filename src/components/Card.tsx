import React from 'react';
import './Card.css';

interface CardProps {
  children?: React.ReactNode;
  className?: string;
  variant?: 'default' | 'highlight' | 'danger' | 'success';
  onClick?: () => void;
}

const Card: React.FC<CardProps> = ({
  children,
  className = '',
  variant = 'default',
  onClick
}) => {
  const cardClasses = `card card-${variant} ${className}`;

  return (
    <div
      className={cardClasses}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="card-content">
        {children}
      </div>
    </div>
  );
};

export default Card;
