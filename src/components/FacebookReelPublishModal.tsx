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

interface MusicTrack {
  id: string;
  name: string;
  genre: string;
  cloudinary_public_id: string;
  preview_url: string;
  duration_seconds: number;
}

type Step = 'loading' | 'select-video' | 'horizontal-warning' | 'select-music' | 'publishing' | 'success' | 'error';

const VOLUME_PRESETS = [
  { label: 'Suave', labelEn: 'Soft', db: -35 },
  { label: 'Media', labelEn: 'Medium', db: -20 },
  { label: 'Fuerte', labelEn: 'Strong', db: -10 },
];

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
  const [volumeDb, setVolumeDb] = useState(-20);

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
    setVolumeDb(-20);

    (async () => {
      const [metaEntries, catalogRes] = await Promise.all([
        Promise.all(videoUrls.map(async (url) => [url, await getVideoMeta(url)] as const)),
        fetch('/api/music/catalog').then(r => (r.ok ? r.json() : { tracks: [] })).catch(() => ({ tracks: [] })),
      ]);
      setVideoMeta(Object.fromEntries(metaEntries));
      setMusicCatalog(catalogRes.tracks || []);
      setStep('select-video');
    })();
  }, [isOpen, videoUrls]);

  if (!isOpen) return null;

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const startPublish = (videoUrl: string, musicPublicId: string | null) => {
    setStep('publishing');
    setProgress(0);
    setMessage(t('Iniciando...', 'Starting...'));

    const params = new URLSearchParams({ propertyId, videoUrl });
    if (musicPublicId) {
      params.set('musicPublicId', musicPublicId);
      params.set('keepOriginalAudio', String(keepOriginalAudio));
      params.set('musicVolume', String(volumeDb));
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

  const handleVideoPublishClick = () => {
    if (!selectedVideo) return;
    const meta = videoMeta[selectedVideo];
    if (meta?.isHorizontal) {
      setStep('horizontal-warning');
    } else {
      setStep('select-music');
    }
  };

  const genres = Array.from(new Set(musicCatalog.map(tr => tr.genre)));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto">

        {step === 'loading' && (
          <div className="text-center py-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3" />
            <p className="text-sm" style={{ color: '#0F172A' }}>
              {t('Analizando videos...', 'Analyzing videos...')}
            </p>
          </div>
        )}

        {step === 'select-video' && (
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
                onClick={handleVideoPublishClick}
                disabled={!selectedVideo}
                className="flex-1 py-3 rounded-xl font-bold text-white shadow-lg disabled:opacity-50"
                style={{ backgroundColor: '#2563EB' }}
              >
                {t('Continuar', 'Continue')}
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
                onClick={() => setStep('select-video')}
                className="flex-1 py-3 rounded-xl font-bold border-2"
                style={{ borderColor: '#E5E7EB', color: '#0F172A' }}
              >
                {t('Elegir otro video', 'Choose another video')}
              </button>
              <button
                onClick={() => setStep('select-music')}
                className="flex-1 py-3 rounded-xl font-bold text-white shadow-lg"
                style={{ backgroundColor: '#2563EB' }}
              >
                {t('Publicar igual', 'Publish anyway')}
              </button>
            </div>
          </div>
        )}

        {step === 'select-music' && (
          <>
            <h3 className="text-xl font-bold mb-4 text-center" style={{ color: '#0F172A' }}>
              🎵 {t('Agregar música (opcional)', 'Add music (optional)')}
            </h3>

            {/* Toggle: ¿el video ya tiene audio/narración? */}
            <div className="rounded-xl p-3 mb-4" style={{ backgroundColor: '#F9FAFB', border: '1.5px solid #E5E7EB' }}>
              <p className="text-sm font-semibold mb-2" style={{ color: '#0F172A' }}>
                🎙️ {t('¿Este video ya tiene audio o narración tuya que quieres conservar?', 'Does this video already have audio or narration you want to keep?')}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setKeepOriginalAudio(false)}
                  className="flex-1 py-2 rounded-lg text-xs font-bold"
                  style={{
                    backgroundColor: !keepOriginalAudio ? '#2563EB' : '#FFFFFF',
                    color: !keepOriginalAudio ? '#FFFFFF' : '#0F172A',
                    border: '1.5px solid #E5E7EB',
                  }}
                >
                  {t('No, reemplazar todo', 'No, replace it all')}
                </button>
                <button
                  onClick={() => { setKeepOriginalAudio(true); setVolumeDb(-35); }}
                  className="flex-1 py-2 rounded-lg text-xs font-bold"
                  style={{
                    backgroundColor: keepOriginalAudio ? '#2563EB' : '#FFFFFF',
                    color: keepOriginalAudio ? '#FFFFFF' : '#0F172A',
                    border: '1.5px solid #E5E7EB',
                  }}
                >
                  {t('Sí, conservar mi voz', 'Yes, keep my voice')}
                </button>
              </div>
              {keepOriginalAudio && (
                <p className="text-xs mt-2 opacity-70" style={{ color: '#0F172A' }}>
                  {t('La música sonará muy baja, de fondo, para no tapar tu narración.', 'The music will play very low, in the background, so it doesn\'t cover your narration.')}
                </p>
              )}
            </div>

            {genres.length === 0 && (
              <p className="text-sm text-center opacity-70 mb-4" style={{ color: '#0F172A' }}>
                {t('No hay pistas disponibles todavía.', 'No tracks available yet.')}
              </p>
            )}

            {genres.length > 0 && (
              <>
                <div className="flex flex-wrap gap-2 mb-4 justify-center">
                  {genres.map((genre) => (
                    <button
                      key={genre}
                      onClick={() => setSelectedGenre(genre)}
                      className="px-3 py-1.5 rounded-full text-xs font-bold capitalize"
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
                  <div className="space-y-2 mb-4">
                    {musicCatalog.filter(track => track.genre === selectedGenre).map((track) => (
                      <div
                        key={track.id}
                        onClick={() => setSelectedTrack(track)}
                        className="w-full rounded-xl border-2 p-3 cursor-pointer"
                        style={{ borderColor: selectedTrack?.id === track.id ? '#2563EB' : '#E5E7EB' }}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm font-semibold" style={{ color: '#0F172A' }}>
                            {track.name}
                          </span>
                          <span className="text-xs opacity-60" style={{ color: '#0F172A' }}>
                            {formatDuration(track.duration_seconds)}
                          </span>
                        </div>
                        <audio controls src={track.preview_url} className="w-full h-8" onClick={(e) => e.stopPropagation()} />
                      </div>
                    ))}
                  </div>
                )}

                {/* Control de volumen — solo si ya eligió una pista */}
                {selectedTrack && (
                  <div className="mb-4">
                    <p className="text-xs font-semibold mb-2" style={{ color: '#0F172A' }}>
                      🔊 {t('Volumen de la música', 'Music volume')}
                    </p>
                    <div className="flex gap-2">
                      {VOLUME_PRESETS.map((preset) => (
                        <button
                          key={preset.db}
                          onClick={() => setVolumeDb(preset.db)}
                          className="flex-1 py-2 rounded-lg text-xs font-bold"
                          style={{
                            backgroundColor: volumeDb === preset.db ? '#2563EB' : '#F3F4F6',
                            color: volumeDb === preset.db ? '#FFFFFF' : '#0F172A',
                          }}
                        >
                          {t(preset.label, preset.labelEn)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => startPublish(selectedVideo!, null)}
                className="flex-1 py-3 rounded-xl font-bold border-2"
                style={{ borderColor: '#E5E7EB', color: '#0F172A' }}
              >
                {t('Publicar sin música', 'Publish without music')}
              </button>
              <button
                onClick={() => startPublish(selectedVideo!, selectedTrack?.cloudinary_public_id || null)}
                disabled={!selectedTrack}
                className="flex-1 py-3 rounded-xl font-bold text-white shadow-lg disabled:opacity-50"
                style={{ backgroundColor: '#2563EB' }}
              >
                🎬 {t('Publicar Reel', 'Publish Reel')}
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