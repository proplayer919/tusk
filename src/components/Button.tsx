import React from 'react';
import './Button.css';

interface ButtonProps {
  children?: React.ReactNode;
  onClick?: () => void;
  className?: string;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';
  disabled?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  children = "Press Me!",
  onClick,
  variant = "primary",
  className = "",
  disabled = false
}) => {
  // Extract text content for the animation effect
  const getTextContent = (node: React.ReactNode): string => {
    if (typeof node === 'string') return node
    if (typeof node === 'number') return node.toString()
    if (React.isValidElement(node)) {
      const props = node.props as { children?: React.ReactNode }
      if (props.children) {
        return getTextContent(props.children)
      }
    }
    if (Array.isArray(node)) {
      return node.map(getTextContent).join('')
    }
    return ''
  }

  const text = getTextContent(children) || 'Button'

  return (
    <button
      type="button"
      className={`btn btn-${variant} ${className}`}
      onClick={onClick}
      disabled={disabled}
      data-text={text}
    >
      {children}
    </button>
  );
};

export default Button;
