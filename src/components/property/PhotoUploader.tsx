// components/property/PhotoUploader.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { useTranslation } from '@/hooks/useTranslation';
import { useI18nStore } from '@/lib/i18n-store';

interface PhotoUploaderProps {
  onPhotosChange: (files: File[]) => void;
  maxPhotos?: number;
  minPhotos?: number;
}

export default function PhotoUploader({ 
  onPhotosChange, 
  maxPhotos = 15, // Actualizado a 15 según tu requerimiento
  minPhotos = 2,
}: PhotoUploaderProps) {
  const [previews, setPreviews] = useState<string[]>([]);
  const { t } = useTranslation();
  const { language } = useI18nStore();
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Diccionario local para "Toque aquí"
  const touchHereText = language === 'es' ? 'Toque aquí' : 'Touch here';

  useEffect(() => {
    return () => {
      previews.forEach(url => URL.revokeObjectURL(url));
    };
  }, [previews]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;

    const selectedFiles = Array.from(e.target.files);
    // Control estricto de máximo 15 fotos
    const remainingSlots = maxPhotos - files.length;
    if (remainingSlots <= 0) return;

    const validFiles = selectedFiles.slice(0, remainingSlots);
    const newPreviews = validFiles.map(file => URL.createObjectURL(file));
    
    const updatedPreviews = [...previews, ...newPreviews];
    const updatedFiles = [...files, ...validFiles];

    setPreviews(updatedPreviews);
    setFiles(updatedFiles);
    onPhotosChange(updatedFiles);
  };

  const removePhoto = (indexToRemove: number) => {
    URL.revokeObjectURL(previews[indexToRemove]);
    const updatedPreviews = previews.filter((_, index) => index !== indexToRemove);
    const updatedFiles = files.filter((_, index) => index !== indexToRemove);
    
    setPreviews(updatedPreviews);
    setFiles(updatedFiles);
    onPhotosChange(updatedFiles);
  };

  return (
    <div className="w-full space-y-4">
      {/* Contador de fotos con estilo elegante */}
      <div className="flex justify-between items-center px-1">
        <span className="text-sm font-medium text-gray-700">
          {t('photos')} ({files.length}/{maxPhotos})
        </span>
        {files.length < minPhotos && (
          <span className="text-xs text-amber-600 font-normal">
            {language === 'es' ? `Mínimo ${minPhotos}` : `Min ${minPhotos} required`}
          </span>
        )}
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        multiple
        accept="image/jpeg, image/png, image/webp"
        className="hidden"
      />

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
        {previews.map((preview, index) => (
          <div key={preview} className="relative aspect-square rounded-lg overflow-hidden shadow-sm border border-gray-200 group bg-gray-100">
            <Image 
              src={preview} 
              alt={`Preview ${index}`} 
              fill 
              className="object-cover transition-transform group-hover:scale-105" 
            />
            
            {/* Badge de Principal (Solo para la primera imagen) */}
            {index === 0 && (
              <div className="absolute top-1 left-1 bg-blue-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm z-10 uppercase">
                {language === 'es' ? 'Principal' : 'Main'}
              </div>
            )}

            <button
              onClick={(e) => {
                e.preventDefault();
                removePhoto(index);
              }}
              className="absolute top-1 right-1 bg-red-500/90 text-white p-1 rounded-full shadow-md hover:bg-red-600 transition-colors z-20"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}

        {/* Botón "+" compacto cuando ya hay fotos */}
        {previews.length > 0 && previews.length < maxPhotos && (
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="aspect-square border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all bg-gray-50"
          >
            <span className="text-xl text-gray-400 font-light">+</span>
            <span className="text-[10px] text-gray-500 font-medium uppercase">{language === 'es' ? 'Subir' : 'Add'}</span>
          </div>
        )}
      </div>

      {/* Dropzone inicial (cuando no hay fotos) */}
      {previews.length === 0 && (
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="w-full py-10 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 flex flex-col items-center gap-3 transition-colors bg-gray-50"
        >
          <div className="p-3 bg-white rounded-full shadow-sm">
            <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-gray-700 font-semibold">{touchHereText}</p>
            <p className="text-xs text-gray-400 mt-1 uppercase tracking-wider">Max {maxPhotos} {t('photos')}</p>
          </div>
        </div>
      )}
    </div>
  );
}