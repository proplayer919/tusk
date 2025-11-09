import React from 'react';
import './Badge.css';

interface BadgeProps {
  children?: React.ReactNode;
  className?: string;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';
}

const Badge: React.FC<BadgeProps> = ({
  children,
  className = '',
  variant = 'primary'
}) => {
  const badgeClasses = `badge badge-${variant} ${className}`;

  return (
    <span className={badgeClasses}>
      {children}
    </span>
  );
};

export default Badge;
