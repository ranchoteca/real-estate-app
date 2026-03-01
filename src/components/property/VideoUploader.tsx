'use client';

import { useState, useRef } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { useI18nStore } from '@/lib/i18n-store';

interface VideoUploaderProps {
  onVideosChange: (files: File[]) => void;
  maxVideos?: number;
  maxDurationSeconds?: number;
}

export default function VideoUploader({ 
  onVideosChange, 
  maxVideos = 4,
  maxDurationSeconds = 60
}: VideoUploaderProps) {
  const [videos, setVideos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [durations, setDurations] = useState<number[]>([]);
  const [totalDuration, setTotalDuration] = useState(0);
  const { t } = useTranslation();
  const { language } = useI18nStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getVideoDuration = (file: File): Promise<number> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      
      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        resolve(video.duration);
      };
      
      video.src = URL.createObjectURL(file);
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    
    if (videos.length + selectedFiles.length > maxVideos) {
      alert(language === 'en' 
        ? `Maximum ${maxVideos} videos allowed` 
        : `Máximo ${maxVideos} videos permitidos`
      );
      return;
    }

    const validFiles: File[] = [];
    const newPreviews: string[] = [];
    const newDurations: number[] = [];
    let newTotalDuration = totalDuration;

    for (const file of selectedFiles) {
      if (!file.type.startsWith('video/')) {
        alert(language === 'en'
          ? `${file.name} is not a valid video`
          : `${file.name} no es un video válido`
        );
        continue;
      }

      const duration = await getVideoDuration(file);
      
      if (newTotalDuration + duration > maxDurationSeconds) {
        alert(language === 'en' 
          ? `Total duration cannot exceed ${Math.floor(maxDurationSeconds)} seconds. This video would exceed the limit.`
          : `La duración total no puede exceder ${Math.floor(maxDurationSeconds)} segundos. Este video excedería el límite.`
        );
        break;
      }

      validFiles.push(file);
      newPreviews.push(URL.createObjectURL(file));
      newDurations.push(duration);
      newTotalDuration += duration;
    }

    const updatedVideos = [...videos, ...validFiles];
    const updatedPreviews = [...previews, ...newPreviews];
    const updatedDurations = [...durations, ...newDurations];

    setVideos(updatedVideos);
    setPreviews(updatedPreviews);
    setDurations(updatedDurations);
    setTotalDuration(newTotalDuration);
    onVideosChange(updatedVideos);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeVideo = (index: number) => {
    URL.revokeObjectURL(previews[index]);
    
    const updatedVideos = videos.filter((_, i) => i !== index);
    const updatedPreviews = previews.filter((_, i) => i !== index);
    const updatedDurations = durations.filter((_, i) => i !== index);
    const newTotalDuration = updatedDurations.reduce((sum, d) => sum + d, 0);
    
    setVideos(updatedVideos);
    setPreviews(updatedPreviews);
    setDurations(updatedDurations);
    setTotalDuration(newTotalDuration);
    onVideosChange(updatedVideos);
  };

  const formatDuration = (seconds: number) => {
    return `${Math.floor(seconds)}s`;
  };

  const formatMaxDuration = (seconds: number) => {
    return `${Math.floor(seconds)}s`;
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-gray-900">
          🎬 {language === 'en' ? 'Videos' : 'Videos'} ({videos.length}/{maxVideos})
        </h3>
        <label className="cursor-pointer">
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            multiple
            onChange={handleFileSelect}
            disabled={totalDuration >= maxDurationSeconds}
            className="hidden"
          />
          <span 
            className={`px-4 py-2 rounded-xl font-semibold text-white shadow-lg active:scale-95 transition-transform inline-block ${
              totalDuration >= maxDurationSeconds ? 'bg-gray-400 cursor-not-allowed' : 'bg-purple-600'
            }`}
          >
            ➕ {language === 'en' ? 'Add Video' : 'Agregar Video'}
          </span>
        </label>
      </div>

      {/* Duration indicator */}
      <div className="mb-3 px-3 py-2 rounded-lg" style={{ backgroundColor: totalDuration > maxDurationSeconds ? '#FEE2E2' : '#EFF6FF' }}>
        <p className="text-sm font-semibold" style={{ color: totalDuration > maxDurationSeconds ? '#DC2626' : '#1E40AF' }}>
          ⏱️ {language === 'en' ? 'Total duration:' : 'Duración total:'} {formatDuration(totalDuration)} / {formatMaxDuration(maxDurationSeconds)}
        </p>
      </div>

      {/* Video Grid */}
      {videos.length > 0 ? (
        <div className="grid grid-cols-2 gap-2">
          {previews.map((preview, index) => (
            <div key={index} className="relative aspect-video rounded-xl overflow-hidden bg-black">
              <video
                src={preview}
                className="w-full h-full object-cover"
              />
              
              <button
                type="button"
                onClick={() => removeVideo(index)}
                className="absolute top-1 right-1 w-6 h-6 rounded-full flex items-center justify-center bg-red-500 text-white shadow-lg active:scale-90 transition-transform"
              >
                ✕
              </button>
              
              <div className="absolute bottom-1 left-1 px-2 py-0.5 rounded text-xs font-bold text-white bg-black bg-opacity-70">
                {formatDuration(durations[index])}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div 
          className="w-full py-12 px-6 border-2 border-dashed rounded-xl cursor-pointer hover:border-purple-500 transition-colors"
          style={{ borderColor: '#E5E7EB' }}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="flex flex-col items-center gap-2">
            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <p className="text-sm text-gray-600 font-semibold text-center">
              {language === 'en' ? 'Click to upload videos' : 'Click para subir videos'}
            </p>
            <p className="text-xs text-gray-400 text-center">
              {language === 'en' 
                ? `Up to ${maxVideos} videos • Max ${formatMaxDuration(maxDurationSeconds)} total` 
                : `Hasta ${maxVideos} videos • Máx ${formatMaxDuration(maxDurationSeconds)} total`
              }
            </p>
          </div>
        </div>
      )}
    </div>
  );
}