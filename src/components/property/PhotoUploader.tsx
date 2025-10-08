'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import imageCompression from 'browser-image-compression';

interface PhotoUploaderProps {
  onPhotosChange: (files: File[]) => void;
  maxPhotos?: number;
  minPhotos?: number;
}

export default function PhotoUploader({ 
  onPhotosChange, 
  maxPhotos = 20,
  minPhotos = 2 
}: PhotoUploaderProps) {
  const [previews, setPreviews] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [compressing, setCompressing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const compressImage = async (file: File): Promise<File> => {
    const options = {
      maxSizeMB: 1, // Máximo 1MB por foto
      maxWidthOrHeight: 1920, // Max dimensión 1920px
      useWebWorker: true,
      fileType: 'image/jpeg', // Convertir todo a JPEG
    };

    try {
      console.log(`📦 Comprimiendo ${file.name}...`);
      console.log(`   Tamaño original: ${(file.size / 1024 / 1024).toFixed(2)} MB`);
      
      const compressedFile = await imageCompression(file, options);
      
      console.log(`   Tamaño comprimido: ${(compressedFile.size / 1024 / 1024).toFixed(2)} MB`);
      console.log(`   ✅ Reducción: ${((1 - compressedFile.size / file.size) * 100).toFixed(1)}%`);
      
      return compressedFile;
    } catch (error) {
      console.error('Error comprimiendo imagen:', error);
      return file; // Si falla, usar original
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    
    // Validar número máximo
    if (files.length + selectedFiles.length > maxPhotos) {
      alert(`Máximo ${maxPhotos} fotos permitidas`);
      return;
    }

    // Validar tipo
    const validFiles = selectedFiles.filter(file => {
      const isImage = file.type.startsWith('image/');
      
      if (!isImage) {
        alert(`${file.name} no es una imagen válida`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    setCompressing(true);

    try {
      // Comprimir todas las imágenes
      const compressedFiles = await Promise.all(
        validFiles.map(file => compressImage(file))
      );

      // Crear previews
      const newPreviews = compressedFiles.map(file => URL.createObjectURL(file));
      
      const updatedFiles = [...files, ...compressedFiles];
      const updatedPreviews = [...previews, ...newPreviews];
      
      setFiles(updatedFiles);
      setPreviews(updatedPreviews);
      onPhotosChange(updatedFiles);
    } catch (error) {
      console.error('Error procesando imágenes:', error);
      alert('Error al procesar las imágenes');
    } finally {
      setCompressing(false);
    }
  };

  const removePhoto = (index: number) => {
    // Revocar URL para liberar memoria
    URL.revokeObjectURL(previews[index]);
    
    const updatedFiles = files.filter((_, i) => i !== index);
    const updatedPreviews = previews.filter((_, i) => i !== index);
    
    setFiles(updatedFiles);
    setPreviews(updatedPreviews);
    onPhotosChange(updatedFiles);
  };

  const movePhoto = (fromIndex: number, toIndex: number) => {
    const newFiles = [...files];
    const newPreviews = [...previews];
    
    [newFiles[fromIndex], newFiles[toIndex]] = [newFiles[toIndex], newFiles[fromIndex]];
    [newPreviews[fromIndex], newPreviews[toIndex]] = [newPreviews[toIndex], newPreviews[fromIndex]];
    
    setFiles(newFiles);
    setPreviews(newPreviews);
    onPhotosChange(newFiles);
  };

  return (
    <div className="w-full">
      {/* Upload Button */}
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={files.length >= maxPhotos}
        className="w-full py-4 px-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <div className="flex flex-col items-center gap-2">
          <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-sm text-gray-600">
            Click para subir fotos ({files.length}/{maxPhotos})
          </p>
          <p className="text-xs text-gray-400">
            Mínimo {minPhotos} fotos • Máximo 5MB cada una
          </p>
        </div>
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Preview Grid */}
      {previews.length > 0 && (
        <div className="mt-6">
          <p className="text-sm font-medium text-gray-700 mb-3">
            Fotos seleccionadas ({files.length})
            {files.length > 0 && <span className="text-xs text-gray-500 ml-2">La primera será la foto principal</span>}
          </p>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {previews.map((preview, index) => (
              <div key={index} className="relative group">
                {/* Image */}
                <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                  <Image
                    src={preview}
                    alt={`Preview ${index + 1}`}
                    fill
                    className="object-cover"
                  />
                  
                  {/* Badge de foto principal */}
                  {index === 0 && (
                    <div className="absolute top-2 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded">
                      Principal
                    </div>
                  )}
                </div>

                {/* Controles */}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-center justify-center gap-2">
                  {/* Mover a la izquierda */}
                  {index > 0 && (
                    <button
                      type="button"
                      onClick={() => movePhoto(index, index - 1)}
                      className="opacity-0 group-hover:opacity-100 bg-white p-2 rounded-full hover:bg-gray-100 transition-all"
                      title="Mover izquierda"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                  )}

                  {/* Eliminar */}
                  <button
                    type="button"
                    onClick={() => removePhoto(index)}
                    className="opacity-0 group-hover:opacity-100 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-all"
                    title="Eliminar"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>

                  {/* Mover a la derecha */}
                  {index < previews.length - 1 && (
                    <button
                      type="button"
                      onClick={() => movePhoto(index, index + 1)}
                      className="opacity-0 group-hover:opacity-100 bg-white p-2 rounded-full hover:bg-gray-100 transition-all"
                      title="Mover derecha"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Advertencia si no hay suficientes fotos */}
          {files.length < minPhotos && (
            <p className="mt-3 text-sm text-amber-600">
              ⚠️ Necesitas al menos {minPhotos} fotos para continuar
            </p>
          )}
        </div>
      )}
    </div>
  );
}