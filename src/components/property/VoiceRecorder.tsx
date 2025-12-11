'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { useI18nStore } from '@/lib/i18n-store';

interface VoiceRecorderProps {
  onRecordingComplete: (audioBlob: Blob) => void;
  minDuration?: number; // segundos
  maxDuration?: number; // segundos
}

export default function VoiceRecorder({ 
  onRecordingComplete,
  minDuration = 10,
  maxDuration = 120 
}: VoiceRecorderProps) {
  const { t } = useTranslation();
  const { language } = useI18nStore();
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Limpiar timer al desmontar
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Auto-detener al llegar al máximo
  useEffect(() => {
    if (recordingTime >= maxDuration && isRecording) {
      stopRecording();
    }
  }, [recordingTime, maxDuration, isRecording]);

  const startRecording = async () => {
    try {
      setError(null);
      
      // Solicitar permiso de micrófono
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });

      // Configurar MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') 
        ? 'audio/webm' 
        : 'audio/mp4';
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(audioBlob);
        setAudioURL(url);
        onRecordingComplete(audioBlob);
        
        // Detener stream
        stream.getTracks().forEach(track => track.stop());
      };

      // Iniciar grabación
      mediaRecorder.start(100); // Recolectar datos cada 100ms
      setIsRecording(true);
      setRecordingTime(0);

      // Iniciar timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error('Error al acceder al micrófono:', err);
      setError(t('voiceRecorder.microphoneError'));
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current?.state === 'paused') {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const deleteRecording = () => {
    if (audioURL) {
      URL.revokeObjectURL(audioURL);
    }
    setAudioURL(null);
    setRecordingTime(0);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgressPercentage = () => {
    return Math.min((recordingTime / maxDuration) * 100, 100);
  };

  return (
    <div className="w-full">
      {/* Descripción unificada arriba */}
      <div className="mb-4 p-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
        <div className="flex items-start gap-3">
          <span className="text-2xl">💡</span>
          <div>
            <h4 className="font-bold text-blue-900 mb-1">
              {t('voiceRecorder.instructionsTitle')}
            </h4>
            <p className="text-sm text-blue-700">
              {t('voiceRecorder.instructionsText')}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Estado: No grabado aún */}
        {!isRecording && !audioURL && (
          <div className="flex flex-col items-center gap-4">
            <div className="w-24 h-24 bg-red-500 rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors cursor-pointer"
                 onClick={startRecording}>
              <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
              </svg>
            </div>
            <p className="text-gray-600 font-medium">{t('voiceRecorder.tapToRecord')}</p>
            <p className="text-sm text-gray-400">
              {language === 'en' 
                ? `Minimum ${minDuration}s • Maximum ${maxDuration}s`
                : `Mínimo ${minDuration}s • Máximo ${maxDuration}s`
              }
            </p>
          </div>
        )}

        {/* Estado: Grabando */}
        {isRecording && (
          <div className="flex flex-col items-center gap-4">
            {/* Animación de onda */}
            <div className="relative w-24 h-24">
              <div className={`absolute inset-0 bg-red-500 rounded-full ${!isPaused ? 'animate-ping' : ''} opacity-75`}></div>
              <div className="relative w-24 h-24 bg-red-500 rounded-full flex items-center justify-center shadow-lg">
                <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                  <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                </svg>
              </div>
            </div>

            {/* Timer */}
            <div className="text-3xl font-mono font-bold text-gray-800">
              {formatTime(recordingTime)}
            </div>

            {/* Progress bar */}
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-red-500 h-full transition-all duration-1000"
                style={{ width: `${getProgressPercentage()}%` }}
              />
            </div>

            {/* Controles */}
            <div className="flex gap-4">
              {!isPaused ? (
                <button
                  onClick={pauseRecording}
                  className="px-6 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors font-semibold"
                >
                  ⏸ {t('voiceRecorder.pause')}
                </button>
              ) : (
                <button
                  onClick={resumeRecording}
                  className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-semibold"
                >
                  ▶ {t('voiceRecorder.continue')}
                </button>
              )}
              
              <button
                onClick={stopRecording}
                disabled={recordingTime < minDuration}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
              >
                ⏹ {t('voiceRecorder.stop')}
              </button>
            </div>

            {recordingTime < minDuration && (
              <p className="text-sm text-amber-600 font-semibold">
                {language === 'en'
                  ? `Record at least ${minDuration} seconds`
                  : `Graba al menos ${minDuration} segundos`
                }
              </p>
            )}
          </div>
        )}

        {/* Estado: Audio grabado */}
        {audioURL && !isRecording && (
          <div className="flex flex-col items-center gap-4">
            <div className="w-full">
              <audio controls src={audioURL} className="w-full" />
            </div>
            
            <div className="text-sm text-gray-600 font-semibold">
              {t('voiceRecorder.duration')}: {formatTime(recordingTime)}
            </div>

            <div className="flex gap-3">
              <button
                onClick={deleteRecording}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-semibold"
              >
                🗑️ {t('voiceRecorder.delete')}
              </button>
              <button
                onClick={startRecording}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-semibold"
              >
                🔄 {t('voiceRecorder.recordAgain')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}