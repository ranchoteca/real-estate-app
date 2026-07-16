// ============================================================
// components/FacebookReelPublishModal.tsx
// ============================================================
'use client';

import { useEffect, useState } from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  propertyId: string;
  videoUrls: string[];
  language: 'es' | 'en';
}

interface VideoMeta {
  width: number;
  height: number;
  isHorizontal: boolean;
}

type Step = 'loading' | 'select' | 'horizontal-warning' | 'publishing' | 'success' | 'error';

function getVideoMeta(url: string): Promise<VideoMeta | null> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      resolve({
        width: video.videoWidth,
        height: video.videoHeight,
        isHorizontal: video.videoWidth > video.videoHeight,
      });
    };
    video.onerror = () => resolve(null);
    video.src = url;
  });
}

export default function FacebookReelPublishModal({ isOpen, onClose, propertyId, videoUrls, language }: Props) {
  const [step, setStep] = useState<Step>('loading');
  const [videoMeta, setVideoMeta] = useState<Record<string, VideoMeta | null>>({});
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  const t = (es: string, en: string) => (language === 'en' ? en : es);

  useEffect(() => {
    if (!isOpen) return;

    setStep('loading');
    setError(null);
    setProgress(0);
    setSelectedVideo(videoUrls.length === 1 ? videoUrls[0] : null);

    (async () => {
      const entries = await Promise.all(
        videoUrls.map(async (url) => [url, await getVideoMeta(url)] as const)
      );
      setVideoMeta(Object.fromEntries(entries));
      setStep('select');
    })();
  }, [isOpen, videoUrls]);

  if (!isOpen) return null;

  const startPublish = (videoUrl: string) => {
    setStep('publishing');
    setProgress(0);
    setMessage(t('Iniciando...', 'Starting...'));

    const params = new URLSearchParams({ propertyId, videoUrl });
    const eventSource = new EventSource(`/api/facebook/publish-reel?${params.toString()}`);

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.progress) setProgress(data.progress);
      if (data.message) setMessage(data.message);
      if (data.error) {
        setError(data.error);
        setStep('error');
        eventSource.close();
      }
      if (data.success) {
        setStep('success');
        eventSource.close();
      }
    };

    eventSource.onerror = () => {
      setError(t('Error de conexión', 'Connection error'));
      setStep('error');
      eventSource.close();
    };
  };

  const handlePublishClick = () => {
    if (!selectedVideo) return;
    const meta = videoMeta[selectedVideo];
    if (meta?.isHorizontal) {
      setStep('horizontal-warning');
    } else {
      startPublish(selectedVideo);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto">

        {(step === 'loading') && (
          <div className="text-center py-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3" />
            <p className="text-sm" style={{ color: '#0F172A' }}>
              {t('Analizando videos...', 'Analyzing videos...')}
            </p>
          </div>
        )}

        {step === 'select' && (
          <>
            <h3 className="text-xl font-bold mb-4 text-center" style={{ color: '#0F172A' }}>
              🎬 {t('Publicar Reel en Facebook', 'Publish Reel to Facebook')}
            </h3>

            {videoUrls.length > 1 && (
              <p className="text-sm mb-3 text-center opacity-70" style={{ color: '#0F172A' }}>
                {t('Elige el video que quieres publicar como Reel:', 'Choose the video you want to publish as a Reel:')}
              </p>
            )}

            <div className="space-y-3 mb-4">
              {videoUrls.map((url) => {
                const meta = videoMeta[url];
                const isSelected = selectedVideo === url;
                return (
                  <button
                    key={url}
                    onClick={() => setSelectedVideo(url)}
                    className="w-full text-left rounded-xl overflow-hidden border-2 transition-all"
                    style={{ borderColor: isSelected ? '#2563EB' : '#E5E7EB' }}
                  >
                    <video src={url} className="w-full aspect-video object-cover bg-black" muted preload="metadata" />
                    <div className="px-3 py-2 flex items-center justify-between">
                      <span className="text-xs font-semibold" style={{ color: '#0F172A' }}>
                        {meta
                          ? (meta.isHorizontal
                              ? `↔️ ${t('Horizontal', 'Horizontal')}`
                              : `↕️ ${t('Vertical (recomendado)', 'Vertical (recommended)')}`)
                          : t('Analizando...', 'Analyzing...')}
                      </span>
                      {isSelected && <span style={{ color: '#2563EB' }}>✓</span>}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-3 rounded-xl font-bold border-2"
                style={{ borderColor: '#E5E7EB', color: '#0F172A' }}
              >
                {t('Cancelar', 'Cancel')}
              </button>
              <button
                onClick={handlePublishClick}
                disabled={!selectedVideo}
                className="flex-1 py-3 rounded-xl font-bold text-white shadow-lg disabled:opacity-50"
                style={{ backgroundColor: '#2563EB' }}
              >
                🎬 {t('Publicar Reel', 'Publish Reel')}
              </button>
            </div>
          </>
        )}

        {step === 'horizontal-warning' && (
          <div className="text-center">
            <div className="text-5xl mb-3">⚠️</div>
            <h3 className="text-lg font-bold mb-2" style={{ color: '#92400E' }}>
              {t('Video horizontal', 'Horizontal video')}
            </h3>
            <p className="text-sm mb-5" style={{ color: '#0F172A' }}>
              {t(
                'Este video se verá con franjas negras en el Reel, ya que Facebook lo optimiza para formato vertical. Se recomienda usar un video vertical (9:16).',
                'This video will show with black bars in the Reel, since Facebook optimizes Reels for vertical format. A vertical video (9:16) is recommended.'
              )}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setStep('select')}
                className="flex-1 py-3 rounded-xl font-bold border-2"
                style={{ borderColor: '#E5E7EB', color: '#0F172A' }}
              >
                {t('Elegir otro video', 'Choose another video')}
              </button>
              <button
                onClick={() => selectedVideo && startPublish(selectedVideo)}
                className="flex-1 py-3 rounded-xl font-bold text-white shadow-lg"
                style={{ backgroundColor: '#2563EB' }}
              >
                {t('Publicar igual', 'Publish anyway')}
              </button>
            </div>
          </div>
        )}

        {step === 'publishing' && (
          <>
            <h3 className="text-xl font-bold mb-4 text-center" style={{ color: '#0F172A' }}>
              🎬 {t('Publicando Reel...', 'Publishing Reel...')}
            </h3>
            <div className="mb-4">
              <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-blue-600 transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
              <p className="text-center mt-2 text-sm font-semibold" style={{ color: '#1877F2' }}>
                {progress}%
              </p>
            </div>
            <p className="text-center text-sm" style={{ color: '#0F172A' }}>{message}</p>
            <div className="flex justify-center mt-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          </>
        )}

        {step === 'error' && (
          <div className="text-center">
            <div className="text-5xl mb-3">❌</div>
            <h3 className="text-xl font-bold mb-2" style={{ color: '#DC2626' }}>
              {t('Error al publicar', 'Publish error')}
            </h3>
            <p className="text-sm mb-4" style={{ color: '#0F172A' }}>{error}</p>
            <button onClick={onClose} className="px-6 py-2 bg-gray-200 rounded-lg font-semibold" style={{ color: '#0F172A' }}>
              {t('Cerrar', 'Close')}
            </button>
          </div>
        )}

        {step === 'success' && (
          <div className="text-center">
            <div className="text-5xl mb-3">✅</div>
            <h3 className="text-xl font-bold mb-2" style={{ color: '#10B981' }}>
              {t('¡Reel publicado!', 'Reel published!')}
            </h3>
            <p className="text-sm mb-4" style={{ color: '#0F172A' }}>
              {t('Tu Reel ya está publicado en Facebook.', 'Your Reel is now live on Facebook.')}
            </p>
            <button onClick={onClose} className="px-6 py-2 bg-gray-200 rounded-lg font-semibold" style={{ color: '#0F172A' }}>
              {t('Cerrar', 'Close')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}