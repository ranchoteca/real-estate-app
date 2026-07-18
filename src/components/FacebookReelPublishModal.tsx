// ============================================================
// components/FacebookReelPublishModal.tsx
// ============================================================
'use client';

import { useEffect, useRef, useState } from 'react';

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

interface MusicTrack {
  id: string;
  name: string;
  genre: string;
  cloudinary_public_id: string;
  preview_url: string;
  duration_seconds: number;
}

type Step = 'loading' | 'customize' | 'publishing' | 'success' | 'error';

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

  const [musicCatalog, setMusicCatalog] = useState<MusicTrack[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [selectedTrack, setSelectedTrack] = useState<MusicTrack | null>(null);
  const [keepOriginalAudio, setKeepOriginalAudio] = useState(false);
  const [volumeSlider, setVolumeSlider] = useState(50); // 0-100, escala intuitiva de volumen
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);

  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const previewAudioRef = useRef<HTMLAudioElement>(null);

  const t = (es: string, en: string) => (language === 'en' ? en : es);

  useEffect(() => {
    if (!isOpen) return;

    setStep('loading');
    setError(null);
    setProgress(0);
    setSelectedVideo(videoUrls.length === 1 ? videoUrls[0] : null);
    setSelectedGenre(null);
    setSelectedTrack(null);
    setKeepOriginalAudio(false);
    setVolumeSlider(50);
    setIsPreviewPlaying(false);

    (async () => {
      const [metaEntries, catalogRes] = await Promise.all([
        Promise.all(videoUrls.map(async (url) => [url, await getVideoMeta(url)] as const)),
        fetch('/api/music/catalog').then(r => (r.ok ? r.json() : { tracks: [] })).catch(() => ({ tracks: [] })),
      ]);
      setVideoMeta(Object.fromEntries(metaEntries));
      setMusicCatalog(catalogRes.tracks || []);
      setStep('customize');
    })();
  }, [isOpen, videoUrls]);

  // Detiene el preview si cambia el video, la pista, o el toggle de narración
  useEffect(() => {
    setIsPreviewPlaying(false);
    previewVideoRef.current?.pause();
    previewAudioRef.current?.pause();
  }, [selectedVideo, selectedTrack, keepOriginalAudio]);

  // Ajusta el volumen en vivo mientras suena el preview
  useEffect(() => {
    if (previewAudioRef.current) {
      previewAudioRef.current.volume = volumeSlider / 100;
    }
  }, [volumeSlider]);

  if (!isOpen) return null;

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const togglePreview = async () => {
    const video = previewVideoRef.current;
    const audio = previewAudioRef.current;
    if (!video) return;

    if (isPreviewPlaying) {
      video.pause();
      audio?.pause();
      setIsPreviewPlaying(false);
      return;
    }

    video.muted = !keepOriginalAudio;
    video.currentTime = 0;
    if (audio) {
      audio.currentTime = 0;
      audio.volume = volumeSlider / 100;
    }

    try {
      await Promise.all([video.play(), audio ? audio.play() : Promise.resolve()]);
      setIsPreviewPlaying(true);
    } catch (err) {
      console.error('Error reproduciendo preview:', err);
    }
  };

  const handlePreviewEnded = () => {
    setIsPreviewPlaying(false);
    previewAudioRef.current?.pause();
  };

  const startPublish = (videoUrl: string, musicPublicId: string | null) => {
    setStep('publishing');
    setProgress(0);
    setMessage(t('Iniciando...', 'Starting...'));

    const params = new URLSearchParams({ propertyId, videoUrl });
    if (musicPublicId) {
      params.set('musicPublicId', musicPublicId);
      params.set('keepOriginalAudio', String(keepOriginalAudio));
      // Convertimos el slider 0-100 (intuitivo) al parámetro que espera
      // Cloudinary: 100 = pista a su volumen original (0), 0 = casi silencio (-100)
      params.set('musicVolume', String(volumeSlider - 100));
    }

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

  const genres = Array.from(new Set(musicCatalog.map(tr => tr.genre)));
  const selectedMeta = selectedVideo ? videoMeta[selectedVideo] : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(6px)' }}
    >
      <div className="bg-white rounded-2xl p-5 max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto">

        {step === 'loading' && (
          <div className="text-center py-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3" />
            <p className="text-sm" style={{ color: '#0F172A' }}>
              {t('Preparando...', 'Preparing...')}
            </p>
          </div>
        )}

        {step === 'customize' && (
          <>
            <h3 className="text-lg font-bold mb-3 text-center" style={{ color: '#0F172A' }}>
              🎬 {t('Publicar Reel en Facebook', 'Publish Reel to Facebook')}
            </h3>

            {/* Selector de video — miniaturas pequeñas en fila */}
            {videoUrls.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1 mb-2">
                {videoUrls.map((url) => {
                  const isSelected = selectedVideo === url;
                  return (
                    <button
                      key={url}
                      onClick={() => setSelectedVideo(url)}
                      className="flex-shrink-0 rounded-lg overflow-hidden border-2"
                      style={{ borderColor: isSelected ? '#2563EB' : '#E5E7EB', width: '64px', height: '96px' }}
                    >
                      <video src={url} className="w-full h-full object-cover bg-black" muted preload="metadata" />
                    </button>
                  );
                })}
              </div>
            )}

            {/* Aviso inline si el video elegido es horizontal — ya no es una pantalla aparte */}
            {selectedMeta?.isHorizontal && (
              <div className="rounded-lg p-2.5 mb-3 text-xs flex items-start gap-1.5" style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}>
                <span>⚠️</span>
                <span>{t('Este video es horizontal — se verá con franjas negras en el Reel.', 'This video is horizontal — it will show with black bars in the Reel.')}</span>
              </div>
            )}

            {/* Toggle de narración */}
            <div className="rounded-xl p-3 mb-3" style={{ backgroundColor: '#F9FAFB', border: '1.5px solid #E5E7EB' }}>
              <p className="text-xs font-semibold mb-2" style={{ color: '#0F172A' }}>
                🎙️ {t('¿Conservar el audio/narración de este video?', 'Keep this video\'s audio/narration?')}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setKeepOriginalAudio(false)}
                  className="flex-1 py-1.5 rounded-lg text-xs font-bold"
                  style={{
                    backgroundColor: !keepOriginalAudio ? '#2563EB' : '#FFFFFF',
                    color: !keepOriginalAudio ? '#FFFFFF' : '#0F172A',
                    border: '1.5px solid #E5E7EB',
                  }}
                >
                  {t('No', 'No')}
                </button>
                <button
                  onClick={() => { setKeepOriginalAudio(true); setVolumeSlider(20); }}
                  className="flex-1 py-1.5 rounded-lg text-xs font-bold"
                  style={{
                    backgroundColor: keepOriginalAudio ? '#2563EB' : '#FFFFFF',
                    color: keepOriginalAudio ? '#FFFFFF' : '#0F172A',
                    border: '1.5px solid #E5E7EB',
                  }}
                >
                  {t('Sí, es mi voz', 'Yes, it\'s my voice')}
                </button>
              </div>
            </div>

            {/* Música */}
            {genres.length > 0 && (
              <>
                <p className="text-xs font-semibold mb-1.5" style={{ color: '#0F172A' }}>
                  🎵 {t('Música (opcional)', 'Music (optional)')}
                </p>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {genres.map((genre) => (
                    <button
                      key={genre}
                      onClick={() => setSelectedGenre(genre)}
                      className="px-2.5 py-1 rounded-full text-xs font-bold capitalize"
                      style={{
                        backgroundColor: selectedGenre === genre ? '#2563EB' : '#F3F4F6',
                        color: selectedGenre === genre ? '#FFFFFF' : '#0F172A',
                      }}
                    >
                      {genre}
                    </button>
                  ))}
                </div>

                {selectedGenre && (
                  <div className="space-y-1.5 mb-3 max-h-32 overflow-y-auto">
                    {musicCatalog.filter(track => track.genre === selectedGenre).map((track) => (
                      <button
                        key={track.id}
                        onClick={() => setSelectedTrack(track)}
                        className="w-full text-left rounded-lg border-2 px-3 py-2 flex items-center justify-between"
                        style={{ borderColor: selectedTrack?.id === track.id ? '#2563EB' : '#E5E7EB' }}
                      >
                        <span className="text-xs font-semibold" style={{ color: '#0F172A' }}>{track.name}</span>
                        <span className="text-xs opacity-60" style={{ color: '#0F172A' }}>{formatDuration(track.duration_seconds)}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Volumen + preview real con audio */}
                {selectedTrack && selectedVideo && (
                  <div className="rounded-xl p-3 mb-3" style={{ backgroundColor: '#F9FAFB', border: '1.5px solid #E5E7EB' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <button
                        onClick={togglePreview}
                        className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-white"
                        style={{ backgroundColor: '#2563EB' }}
                      >
                        {isPreviewPlaying ? '⏸️' : '▶️'}
                      </button>
                      <div className="flex-1">
                        <p className="text-xs font-semibold" style={{ color: '#0F172A' }}>
                          {t('Escuchar cómo sonará', 'Preview how it will sound')}
                        </p>
                        <p className="text-[11px] opacity-60" style={{ color: '#0F172A' }}>
                          {t('Ajusta el volumen mientras suena', 'Adjust volume while it plays')}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs">🔈</span>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={volumeSlider}
                        onChange={(e) => setVolumeSlider(Number(e.target.value))}
                        className="flex-1"
                      />
                      <span className="text-xs">🔊</span>
                    </div>

                    {/* Elementos ocultos que reproducen el preview real */}
                    <video
                      ref={previewVideoRef}
                      src={selectedVideo}
                      playsInline
                      onEnded={handlePreviewEnded}
                      className="hidden"
                    />
                    <audio ref={previewAudioRef} src={selectedTrack.preview_url} className="hidden" />
                  </div>
                )}
              </>
            )}

            <div className="flex gap-2 mt-2">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl font-bold border-2 text-sm"
                style={{ borderColor: '#E5E7EB', color: '#0F172A' }}
              >
                {t('Cancelar', 'Cancel')}
              </button>
              <button
                onClick={() => selectedVideo && startPublish(selectedVideo, null)}
                disabled={!selectedVideo}
                className="flex-1 py-2.5 rounded-xl font-bold border-2 text-sm disabled:opacity-50"
                style={{ borderColor: '#E5E7EB', color: '#0F172A' }}
              >
                {t('Sin música', 'No music')}
              </button>
              <button
                onClick={() => selectedVideo && startPublish(selectedVideo, selectedTrack?.cloudinary_public_id || null)}
                disabled={!selectedVideo || !selectedTrack}
                className="flex-1 py-2.5 rounded-xl font-bold text-white shadow-lg text-sm disabled:opacity-50"
                style={{ backgroundColor: '#2563EB' }}
              >
                🎬 {t('Publicar', 'Publish')}
              </button>
            </div>
          </>
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