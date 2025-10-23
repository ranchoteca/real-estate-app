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
      maxSizeMB: 0.8,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
      fileType: 'image/jpeg',
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
      return file;
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    
    if (files.length + selectedFiles.length > maxPhotos) {
      alert(`Máximo ${maxPhotos} fotos permitidas`);
      return;
    }

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
      // Comprimir todas las imágenes de forma secuencial para evitar race conditions
      const compressedFiles: File[] = [];
      
      for (const file of validFiles) {
        const compressed = await compressImage(file);
        compressedFiles.push(compressed);
      }

      // Crear previews después de que todas estén comprimidas
      const newPreviews = compressedFiles.map(file => {
        try {
          return URL.createObjectURL(file);
        } catch (err) {
          console.error('Error creando preview:', err);
          return ''; // Preview vacío en caso de error
        }
      }).filter(url => url !== ''); // Filtrar previews fallidos
      
      const updatedFiles = [...files, ...compressedFiles];
      const updatedPreviews = [...previews, ...newPreviews];
      
      setFiles(updatedFiles);
      setPreviews(updatedPreviews);
      onPhotosChange(updatedFiles);
    } catch (error) {
      console.error('Error procesando imágenes:', error);
      alert('Error al procesar las imágenes. Intenta subirlas de nuevo.');
    } finally {
      setCompressing(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removePhoto = (index: number) => {
    URL.revokeObjectURL(previews[index]);
    
    const updatedFiles = files.filter((_, i) => i !== index);
    const updatedPreviews = previews.filter((_, i) => i !== index);
    
    setFiles(updatedFiles);
    setPreviews(updatedPreviews);
    onPhotosChange(updatedFiles);
  };

  return (
    <div className="w-full">
      {/* Contador y botón */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-gray-900">
          Fotos ({files.length}/{maxPhotos})
        </h3>
        <label className="cursor-pointer">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            disabled={files.length >= maxPhotos || compressing}
            className="hidden"
          />
          <span 
            className={`px-4 py-2 rounded-xl font-semibold text-white shadow-lg active:scale-95 transition-transform inline-block ${
              files.length >= maxPhotos || compressing ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600'
            }`}
          >
            {compressing ? '⏳ Comprimiendo...' : '➕ Agregar'}
          </span>
        </label>
      </div>

      {/* Preview Grid */}
      {previews.length > 0 ? (
        <div>
          <p className="text-xs mb-2 opacity-70 text-gray-900">
            Fotos nuevas:
          </p>
          <div className="grid grid-cols-3 gap-2">
            {previews.map((preview, index) => (
              <div key={index} className="relative aspect-square rounded-xl overflow-hidden">
                <Image
                  src={preview}
                  alt={`Photo ${index + 1}`}
                  fill
                  className="object-cover"
                  unoptimized
                />
                
                {/* Botón eliminar */}
                <button
                  type="button"
                  onClick={() => removePhoto(index)}
                  className="absolute top-1 right-1 w-6 h-6 rounded-full flex items-center justify-center bg-red-500 text-white shadow-lg active:scale-90 transition-transform"
                >
                  ✕
                </button>
                
                {/* Badge Principal (primera foto) o Nueva (resto) */}
                {index === 0 ? (
                  <div 
                    className="absolute bottom-1 left-1 px-2 py-0.5 rounded text-xs font-bold text-white"
                    style={{ backgroundColor: '#2563EB' }}
                  >
                    Principal
                  </div>
                ) : (
                  <div className="absolute bottom-1 right-1 px-2 py-0.5 rounded text-xs font-bold text-white bg-green-500">
                    Nueva
                  </div>
                )}
              </div>
            ))}
          </div>
          
          {/* Advertencia si no hay suficientes fotos */}
          {files.length < minPhotos && (
            <p className="text-xs mt-2 text-red-600">
              ⚠️ Mínimo {minPhotos} fotos requeridas
            </p>
          )}
        </div>
      ) : (
        /* Estado vacío */
        <div 
          className="w-full py-12 px-6 border-2 border-dashed rounded-xl cursor-pointer hover:border-blue-500 transition-colors"
          style={{ borderColor: '#E5E7EB' }}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="flex flex-col items-center gap-2">
            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-sm text-gray-600 font-semibold">
              Click para subir fotos
            </p>
            <p className="text-xs text-gray-400">
              Mínimo {minPhotos} fotos • Máximo {maxPhotos} fotos
            </p>
            <p className="text-xs text-gray-400">
              Se comprimen automáticamente
            </p>
          </div>
        </div>
      )}
    </div>
  );
}