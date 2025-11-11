import React from 'react';
import './ProgressBar.css';

interface ProgressBarProps {
  value: number; // 0-100
  className?: string;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  size?: 'small' | 'medium' | 'large';
  label?: string;
  showValue?: boolean;
  maxValue?: number;
  animated?: boolean;
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  className = '',
  variant = 'primary',
  size = 'medium',
  label,
  showValue = false,
  maxValue = 0,
  animated = false
}) => {
  const clampedValue = Math.min(Math.max(value, 0), 1);
  const progressClasses = `progress-bar progress-bar-${variant} progress-bar-${size} ${animated ? 'progress-bar-animated' : ''} ${className}`;
  const currentValue = Math.round(clampedValue * maxValue);

  return (
    <div className="progress-container">
      {(label || showValue) && (
        <div className="progress-header">
          {label && <span className="progress-label">{label}</span>}
          {showValue && <span className="progress-value">{Math.round(clampedValue * 100)}% ({currentValue}/{maxValue})</span>}
        </div>
      )}
      <div className={progressClasses}>
        <div className="progress-track">
          <div
            className="progress-fill"
            style={{ width: `${clampedValue * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default ProgressBar;
