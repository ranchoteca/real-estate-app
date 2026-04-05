// components/property/PhotoUploader.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { useTranslation } from '@/hooks/useTranslation';
import { useI18nStore } from '@/lib/i18n-store';
// ❌ ELIMINADO: import imageCompression from 'browser-image-compression';

interface PhotoUploaderProps {
  onPhotosChange: (files: File[]) => void;
  maxPhotos?: number;
  minPhotos?: number;
  // Ya no usamos watermarkConfig aquí porque lo hará la Edge Function
}

export default function PhotoUploader({ 
  onPhotosChange, 
  maxPhotos = 10,
  minPhotos = 2,
}: PhotoUploaderProps) {
  const [previews, setPreviews] = useState<string[]>([]);
  const { t } = useTranslation();
  const { language } = useI18nStore();
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Limpiar memoria cuando el componente se desmonta
  useEffect(() => {
    return () => {
      previews.forEach(url => URL.revokeObjectURL(url));
    };
  }, [previews]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;

    const selectedFiles = Array.from(e.target.files);
    const validFiles = selectedFiles.slice(0, maxPhotos - files.length);

    // 1. Generar URLs locales ultraligeras para el navegador (Magia pura para la RAM)
    const newPreviews = validFiles.map(file => URL.createObjectURL(file));
    
    setPreviews(prev => [...prev, ...newPreviews]);
    
    // 2. Actualizar estado y pasar los archivos CRUDOS al padre
    const updatedFiles = [...files, ...validFiles];
    setFiles(updatedFiles);
    onPhotosChange(updatedFiles);
  };

  const removePhoto = (indexToRemove: number) => {
    URL.revokeObjectURL(previews[indexToRemove]); // Liberar memoria
    const updatedPreviews = previews.filter((_, index) => index !== indexToRemove);
    const updatedFiles = files.filter((_, index) => index !== indexToRemove);
    
    setPreviews(updatedPreviews);
    setFiles(updatedFiles);
    onPhotosChange(updatedFiles);
  };

  return (
    <div className="w-full">
      {/* Input oculto */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        multiple
        accept="image/jpeg, image/png, image/webp"
        className="hidden"
      />

      {previews.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {previews.map((preview, index) => (
            <div key={index} className="relative aspect-square rounded-xl overflow-hidden shadow-sm group">
              <Image src={preview} alt={`Preview ${index}`} fill className="object-cover" />
              <button
                onClick={(e) => {
                  e.preventDefault();
                  removePhoto(index);
                }}
                className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full shadow-md hover:bg-red-600 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
          {previews.length < maxPhotos && (
             <div 
               onClick={() => fileInputRef.current?.click()}
               className="aspect-square border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center cursor-pointer hover:border-blue-500 bg-gray-50"
             >
               <span className="text-2xl text-gray-400">+</span>
             </div>
          )}
        </div>
      ) : (
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="w-full py-12 px-6 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-500 flex flex-col items-center gap-2"
        >
          <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-gray-600 font-medium">{t('uploadPhotos')}</span>
        </div>
      )}
    </div>
  );
}