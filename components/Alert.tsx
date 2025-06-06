
import React from 'react';
import type { AlertMessage } from '../types';

interface AlertProps extends AlertMessage {
  onClose?: () => void;
}

export const Alert: React.FC<AlertProps> = ({ type, message, onClose }) => {
  const baseClasses = "p-4 mb-4 rounded-lg shadow-md flex items-center justify-between";
  const typeClasses = {
    success: "bg-green-600/80 border border-green-500 text-green-100",
    error: "bg-red-600/80 border border-red-500 text-red-100",
    warning: "bg-yellow-600/80 border border-yellow-500 text-yellow-100",
    info: "bg-sky-600/80 border border-sky-500 text-sky-100",
  };

  const iconClasses = {
    success: "fas fa-check-circle",
    error: "fas fa-exclamation-triangle",
    warning: "fas fa-exclamation-circle",
    info: "fas fa-info-circle",
  }

  return (
    <div className={`${baseClasses} ${typeClasses[type]} w-full max-w-2xl`} role="alert">
      <div className="flex items-center">
        <i className={`${iconClasses[type]} mr-3 text-xl`}></i>
        <span>{message}</span>
      </div>
      {onClose && (
        <button onClick={onClose} className="ml-4 text-xl hover:opacity-75 transition-opacity" aria-label="Fermer">
          <i className="fas fa-times"></i>
        </button>
      )}
    </div>
  );
};
    