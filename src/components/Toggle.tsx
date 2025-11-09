import React from 'react';
import './Toggle.css';

interface ToggleProps {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  className?: string;
  variant?: 'primary' | 'secondary' | 'success';
  disabled?: boolean;
  label?: string;
}

const Toggle: React.FC<ToggleProps> = ({
  checked = false,
  onChange,
  className = '',
  variant = 'primary',
  disabled = false,
  label
}) => {
  const toggleClasses = `toggle toggle-${variant} ${className}`;

  const handleToggle = () => {
    if (!disabled && onChange) {
      onChange(!checked);
    }
  };

  return (
    <div className="toggle-container">
      {label && <label className="toggle-label">{label}</label>}
      <div
        className={toggleClasses}
        onClick={handleToggle}
        role="switch"
        aria-checked={checked}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleToggle();
          }
        }}
      >
        <div className={`toggle-track ${checked ? 'toggle-track-checked' : ''}`}>
          <div className={`toggle-thumb ${checked ? 'toggle-thumb-checked' : ''}`} />
        </div>
      </div>
    </div>
  );
};

export default Toggle;
