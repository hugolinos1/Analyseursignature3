
import React from 'react';

interface SpinnerProps {
  inline?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const Spinner: React.FC<SpinnerProps> = ({ inline = false, size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-[3px]',
    lg: 'w-8 h-8 border-4',
  };
  const spinnerClass = `animate-spin rounded-full border-sky-400 border-t-transparent ${sizeClasses[size]}`;
  
  if (inline) {
    return <div className={`${spinnerClass} inline-block`} role="status" aria-label="chargement"></div>;
  }
  
  return (
    <div className="flex justify-center items-center" role="status" aria-label="chargement">
      <div className={spinnerClass}></div>
    </div>
  );
};
    