
import React, { useRef } from 'react';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  isLoading: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, isLoading }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex flex-col items-center space-y-4 p-6 border-2 border-dashed border-sky-500 rounded-xl bg-slate-700/50 hover:border-sky-400 transition-colors duration-200">
      <i className="fas fa-file-pdf text-5xl text-sky-400"></i>
      <p className="text-slate-300 text-center">Glissez-déposez un fichier PDF ici, ou cliquez pour sélectionner.</p>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="application/pdf"
        className="hidden"
        disabled={isLoading}
      />
      <button
        onClick={handleButtonClick}
        disabled={isLoading}
        className="bg-sky-600 hover:bg-sky-700 text-white font-semibold py-2 px-6 rounded-lg shadow-md hover:shadow-lg transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
      >
        <i className="fas fa-upload mr-2"></i>
        {isLoading ? 'Chargement...' : 'Choisir un fichier PDF'}
      </button>
    </div>
  );
};
    