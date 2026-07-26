// components/SocialReelPublishModal.tsx
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
  durationSeconds: number;
}

interface MusicTrack {
  id: string;
  name: string;
  genre: string;
  cloudinary_public_id: string;
  preview_url: string;
  duration_seconds: number;
}

type PlatformStatus = 'idle' | 'publishing' | 'processing' | 'success' | 'error' | 'timeout';
type Step = 'loading' | 'select-video' | 'select-platforms' | 'copy' | 'music' | 'publishing' | 'done';

function getVideoMeta(url: string): Promise<VideoMeta | null> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => resolve({
      width: video.videoWidth,
      height: video.videoHeight,
      isHorizontal: video.videoWidth > video.videoHeight,
      durationSeconds: video.duration,
    });
    video.onerror = () => resolve(null);
    video.src = url;
  });
}

export default function SocialReelPublishModal({ isOpen, onClose, propertyId, videoUrls, language }: Props) {
  const t = (es: string, en: string) => language === 'en' ? en : es;

  // ── Estado ────────────────────────────────────────────────────────────────
  const [step, setStep] = useState<Step>('loading');
  const [videoMeta, setVideoMeta] = useState<Record<string, VideoMeta | null>>({});
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);

  const [publishFb, setPublishFb] = useState(true);
  const [publishTk, setPublishTk] = useState(false);

  const [captionFb, setCaptionFb] = useState('');
  const [captionTk, setCaptionTk] = useState('');
  const [generatingCopy, setGeneratingCopy] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);

  const [musicCatalog, setMusicCatalog] = useState<MusicTrack[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [selectedTrack, setSelectedTrack] = useState<MusicTrack | null>(null);
  const [keepOriginalAudio, setKeepOriginalAudio] = useState(false);
  const [volumeSlider, setVolumeSlider] = useState(50);
  const [includeMusicTiktok, setIncludeMusicTiktok] = useState(false);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);

  const [statusMessage, setStatusMessage] = useState('');
  const [fbStatus, setFbStatus] = useState<PlatformStatus>('idle');
  const [tkStatus, setTkStatus] = useState<PlatformStatus>('idle');
  const [fbError, setFbError] = useState<string | null>(null);
  const [tkError, setTkError] = useState<string | null>(null);
  const [agentId, setAgentId] = useState<string | null>(null);

  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const previewAudioRef = useRef<HTMLAudioElement>(null);
  const pollIntervalsRef = useRef<Record<string, ReturnType<typeof setInterval>>>({});
  const pollTimeoutsRef  = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // ── Reset al abrir ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    setStep('loading');
    setSelectedVideo(videoUrls.length === 1 ? videoUrls[0] : null);
    setPublishFb(true); setPublishTk(false);
    setCaptionFb(''); setCaptionTk('');
    setCopyError(null);
    setSelectedGenre(null); setSelectedTrack(null);
    setKeepOriginalAudio(false); setVolumeSlider(50);
    setIncludeMusicTiktok(false); setIsPreviewPlaying(false);
    setStatusMessage('');
    setFbStatus('idle'); setTkStatus('idle');
    setFbError(null); setTkError(null);

    (async () => {
      const [metaEntries, catalogRes] = await Promise.all([
        Promise.all(videoUrls.map(async (url) => [url, await getVideoMeta(url)] as const)),
        fetch('/api/music/catalog').then(r => r.ok ? r.json() : { tracks: [] }).catch(() => ({ tracks: [] })),
      ]);
      setVideoMeta(Object.fromEntries(metaEntries));
      setMusicCatalog(catalogRes.tracks || []);
      setStep(videoUrls.length > 1 ? 'select-video' : 'select-platforms');
    })();
  }, [isOpen, videoUrls]);

  // Limpiar polling al desmontar
  useEffect(() => {
    return () => {
      Object.values(pollIntervalsRef.current).forEach(clearInterval);
      Object.values(pollTimeoutsRef.current).forEach(clearTimeout);
    };
  }, []);

  useEffect(() => {
    setIsPreviewPlaying(false);
    previewVideoRef.current?.pause();
    previewAudioRef.current?.pause();
  }, [selectedVideo, selectedTrack, keepOriginalAudio]);

  useEffect(() => {
    if (previewAudioRef.current) previewAudioRef.current.volume = volumeSlider / 100;
  }, [volumeSlider]);

  if (!isOpen) return null;

  const selectedMeta = selectedVideo ? videoMeta[selectedVideo] : null;
  const genres = Array.from(new Set(musicCatalog.map(tr => tr.genre)));
  const formatDuration = (s: number) => `${Math.floor(s / 60)}:${Math.round(s % 60).toString().padStart(2, '0')}`;

  // ── Generar copys ─────────────────────────────────────────────────────────
  const generateCopys = async () => {
    setGeneratingCopy(true);
    setCopyError(null);
    try {
      const res = await fetch('/api/social/generate-reel-copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId }),
      });
      if (!res.ok) throw new Error(t('Error generando copys', 'Error generating copies'));
      const data = await res.json();
      setCaptionFb(data.facebook || '');
      setCaptionTk(data.tiktok || '');
    } catch (err: any) {
      setCopyError(err.message);
    } finally {
      setGeneratingCopy(false);
    }
  };

  // ── Preview audio+video ───────────────────────────────────────────────────
  const togglePreview = async () => {
    const video = previewVideoRef.current;
    const audio = previewAudioRef.current;
    if (!video) return;
    if (isPreviewPlaying) {
      video.pause(); audio?.pause();
      setIsPreviewPlaying(false);
      return;
    }
    video.muted = !keepOriginalAudio;
    video.currentTime = 0;
    if (audio) { audio.currentTime = 0; audio.volume = volumeSlider / 100; }
    try {
      await Promise.all([video.play(), audio ? audio.play() : Promise.resolve()]);
      setIsPreviewPlaying(true);
    } catch {}
  };

  // ── Polling desde el cliente ──────────────────────────────────────────────
  const startPolling = (
    postId: string,
    platform: 'facebook' | 'tiktok',
    currentAgentId: string,
    setStatus: (s: PlatformStatus) => void,
    setError: (e: string) => void
  ) => {
    const TIMEOUT_MS = 90_000;
    const INTERVAL_MS = 3_000;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(
          `/api/social/poll-result?postId=${postId}&platform=${platform}&agentId=${currentAgentId}&propertyId=${propertyId}`
        );
        const data = await res.json();

        if (data.status === 'success') {
          clearInterval(pollIntervalsRef.current[postId]);
          clearTimeout(pollTimeoutsRef.current[postId]);
          delete pollIntervalsRef.current[postId];
          delete pollTimeoutsRef.current[postId];
          setStatus('success');
          checkAllDone();
        } else if (data.status === 'error') {
          clearInterval(pollIntervalsRef.current[postId]);
          clearTimeout(pollTimeoutsRef.current[postId]);
          delete pollIntervalsRef.current[postId];
          delete pollTimeoutsRef.current[postId];
          setStatus('error');
          setError(data.error || t('Error desconocido', 'Unknown error'));
          checkAllDone();
        }
        // Si 'processing' → seguir esperando
      } catch {
        // Error de red puntual → continuar
      }
    }, INTERVAL_MS);

    pollIntervalsRef.current[postId] = interval;

    // Timeout de seguridad
    const timeout = setTimeout(() => {
      clearInterval(pollIntervalsRef.current[postId]);
      delete pollIntervalsRef.current[postId];
      delete pollTimeoutsRef.current[postId];
      setStatus('timeout');
      checkAllDone();
    }, TIMEOUT_MS);

    pollTimeoutsRef.current[postId] = timeout;
  };

  // Revisa si ambas plataformas terminaron para pasar a 'done'
  const checkAllDone = () => {
    // Usamos setTimeout para que React haya actualizado los estados
    setTimeout(() => {
      setFbStatus(prev => {
        setTkStatus(prev2 => {
          const fbDone = !publishFb || ['success', 'error', 'timeout'].includes(prev);
          const tkDone = !publishTk || ['success', 'error', 'timeout'].includes(prev2);
          if (fbDone && tkDone) setStep('done');
          return prev2;
        });
        return prev;
      });
    }, 100);
  };

  // ── Publicar ──────────────────────────────────────────────────────────────
  const startPublish = async (withMusic: boolean) => {
    if (!selectedVideo) return;

    setStep('publishing');
    setStatusMessage(t('Publicando...', 'Publishing...'));
    if (publishFb) setFbStatus('publishing');
    if (publishTk) setTkStatus('publishing');

    const platforms = publishFb && publishTk ? 'both' : publishFb ? 'facebook' : 'tiktok';

    try {
      const res = await fetch('/api/social/publish-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId,
          videoUrl: selectedVideo,
          platforms,
          captionFb,
          captionTk,
          keepOriginalAudio,
          includeMusicTiktok,
          musicPublicId: withMusic && selectedTrack ? selectedTrack.cloudinary_public_id : null,
          musicVolume: volumeSlider - 100,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatusMessage(data.error || t('Error al publicar', 'Publish error'));
        if (publishFb) setFbStatus('error');
        if (publishTk) setTkStatus('error');
        setStep('done');
        return;
      }

      const currentAgentId = data.agentId;
      setAgentId(currentAgentId);

      // Errores inmediatos (no llegó a crear el post)
      if (data.fbError) { setFbStatus('error'); setFbError(data.fbError); }
      if (data.tkError) { setTkStatus('error'); setTkError(data.tkError); }

      // Arrancar polling por plataforma
      if (publishFb && data.fbPostId) {
        setFbStatus('processing');
        startPolling(data.fbPostId, 'facebook', currentAgentId, setFbStatus, setFbError);
      } else if (publishFb && !data.fbError) {
        setFbStatus('error');
        setFbError(t('No se recibió ID de publicación', 'No post ID received'));
      }

      if (publishTk && data.tkPostId) {
        setTkStatus('processing');
        startPolling(data.tkPostId, 'tiktok', currentAgentId, setTkStatus, setTkError);
      } else if (publishTk && !data.tkError) {
        setTkStatus('error');
        setTkError(t('No se recibió ID de publicación', 'No post ID received'));
      }

      // Si ambas fallaron inmediatamente, ir a done
      if (
        (!publishFb || data.fbError) &&
        (!publishTk || data.tkError)
      ) {
        setStep('done');
      }

      setStatusMessage(t('Esperando confirmación de las plataformas...', 'Waiting for platform confirmation...'));

    } catch (err: any) {
      setStatusMessage(err.message || t('Error de conexión', 'Connection error'));
      if (publishFb) setFbStatus('error');
      if (publishTk) setTkStatus('error');
      setStep('done');
    }
  };

  // ── Helpers UI ────────────────────────────────────────────────────────────
  const platformIcon = (status: PlatformStatus) => ({
    idle: '⬜', publishing: '📤', processing: '⏳',
    success: '✅', timeout: '⚠️', error: '❌',
  }[status] || '⬜');

  const hasAnySuccess = () =>
    (publishFb && fbStatus === 'success') || (publishTk && tkStatus === 'success');

  const canProceedToPlatforms = !!selectedVideo &&
    !(selectedMeta?.durationSeconds !== undefined && selectedMeta.durationSeconds < 3);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(6px)' }}>
      <div className="bg-white rounded-2xl p-5 max-w-md w-full shadow-2xl max-h-[92vh] overflow-y-auto">

        {/* ── LOADING ── */}
        {step === 'loading' && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3" />
            <p className="text-sm" style={{ color: '#0F172A' }}>{t('Preparando...', 'Preparing...')}</p>
          </div>
        )}

        {/* ── SELECCIONAR VIDEO ── */}
        {step === 'select-video' && (
          <>
            <h3 className="text-lg font-bold mb-3 text-center" style={{ color: '#0F172A' }}>
              🎬 {t('Selecciona el video', 'Select video')}
            </h3>
            <div className="flex gap-2 overflow-x-auto pb-1 mb-4">
              {videoUrls.map((url) => {
                const meta = videoMeta[url];
                const isSelected = selectedVideo === url;
                const tooShort = meta?.durationSeconds !== undefined && meta.durationSeconds < 3;
                return (
                  <button key={url} onClick={() => !tooShort && setSelectedVideo(url)} disabled={tooShort}
                    className="flex-shrink-0 rounded-xl overflow-hidden border-2 relative"
                    style={{ borderColor: isSelected ? '#2563EB' : '#E5E7EB', width: '80px', height: '120px', opacity: tooShort ? 0.4 : 1 }}>
                    <video src={url} className="w-full h-full object-cover bg-black" muted preload="metadata" />
                    {meta && (
                      <span className="absolute bottom-1 left-0 right-0 text-center text-[10px] font-bold text-white"
                        style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
                        {formatDuration(meta.durationSeconds)}
                      </span>
                    )}
                    {tooShort && (
                      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white bg-black bg-opacity-50 text-center px-1">
                        {t('Muy corto', 'Too short')}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 py-2.5 rounded-xl font-bold border-2 text-sm" style={{ borderColor: '#E5E7EB', color: '#0F172A' }}>
                {t('Cancelar', 'Cancel')}
              </button>
              <button onClick={() => setStep('select-platforms')} disabled={!canProceedToPlatforms}
                className="flex-1 py-2.5 rounded-xl font-bold text-white text-sm disabled:opacity-40" style={{ backgroundColor: '#2563EB' }}>
                {t('Continuar →', 'Continue →')}
              </button>
            </div>
          </>
        )}

        {/* ── SELECCIONAR PLATAFORMAS ── */}
        {step === 'select-platforms' && (
          <>
            <h3 className="text-lg font-bold mb-1 text-center" style={{ color: '#0F172A' }}>
              📱 {t('¿Dónde publicar?', 'Where to publish?')}
            </h3>
            <p className="text-xs text-center mb-4" style={{ color: '#6B7280' }}>
              {t('Selecciona una o ambas plataformas', 'Select one or both platforms')}
            </p>

            {selectedMeta?.isHorizontal && (
              <div className="rounded-lg p-2.5 mb-3 text-xs flex items-start gap-1.5" style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}>
                <span>⚠️</span>
                <span>{t('Video horizontal — se verá con franjas negras en ambas plataformas.', 'Horizontal video — will show with black bars on both platforms.')}</span>
              </div>
            )}

            <div className="space-y-2 mb-4">
              <label className="flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer"
                style={{ borderColor: publishFb ? '#1877F2' : '#E5E7EB', backgroundColor: publishFb ? '#EFF6FF' : '#FAFAFA' }}>
                <input type="checkbox" checked={publishFb} onChange={e => setPublishFb(e.target.checked)} className="w-5 h-5 rounded accent-blue-600" />
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#1877F2' }}>
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </div>
                <div>
                  <p className="font-bold text-sm" style={{ color: '#0F172A' }}>Facebook Reels</p>
                  <p className="text-xs" style={{ color: '#6B7280' }}>{t('Con música y copy largo', 'With music and long copy')}</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer"
                style={{ borderColor: publishTk ? '#010101' : '#E5E7EB', backgroundColor: publishTk ? '#F9FAFB' : '#FAFAFA' }}>
                <input type="checkbox" checked={publishTk} onChange={e => setPublishTk(e.target.checked)} className="w-5 h-5 rounded" />
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#010101' }}>
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.19 8.19 0 004.79 1.52V6.75a4.85 4.85 0 01-1.02-.06z"/>
                  </svg>
                </div>
                <div>
                  <p className="font-bold text-sm" style={{ color: '#0F172A' }}>TikTok</p>
                  <p className="text-xs" style={{ color: '#6B7280' }}>{t('Copy corto y energético', 'Short and energetic copy')}</p>
                </div>
              </label>
            </div>

            {!publishFb && !publishTk && (
              <p className="text-xs text-center mb-3" style={{ color: '#DC2626' }}>
                {t('Selecciona al menos una plataforma', 'Select at least one platform')}
              </p>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => videoUrls.length > 1 ? setStep('select-video') : onClose()}
                className="flex-1 py-2.5 rounded-xl font-bold border-2 text-sm" style={{ borderColor: '#E5E7EB', color: '#0F172A' }}>
                {videoUrls.length > 1 ? `← ${t('Atrás', 'Back')}` : t('Cancelar', 'Cancel')}
              </button>
              <button
                onClick={async () => { setStep('copy'); await generateCopys(); }}
                disabled={!publishFb && !publishTk}
                className="flex-1 py-2.5 rounded-xl font-bold text-white text-sm disabled:opacity-40" style={{ backgroundColor: '#2563EB' }}>
                {t('Continuar →', 'Continue →')}
              </button>
            </div>
          </>
        )}

        {/* ── COPYS ── */}
        {step === 'copy' && (
          <>
            <h3 className="text-lg font-bold mb-1 text-center" style={{ color: '#0F172A' }}>
              ✍️ {t('Revisa los copys', 'Review copies')}
            </h3>
            <p className="text-xs text-center mb-4" style={{ color: '#6B7280' }}>
              {t('Generados con IA — edita si lo necesitas', 'AI-generated — edit if needed')}
            </p>

            {generatingCopy && (
              <div className="text-center py-6">
                <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-blue-600 mx-auto mb-2" />
                <p className="text-sm" style={{ color: '#6B7280' }}>{t('Generando con IA...', 'Generating with AI...')}</p>
              </div>
            )}

            {copyError && (
              <div className="rounded-lg p-3 mb-3 text-xs" style={{ backgroundColor: '#FEF2F2', color: '#DC2626' }}>
                {copyError}
                <button onClick={generateCopys} className="ml-2 underline font-bold">{t('Reintentar', 'Retry')}</button>
              </div>
            )}

            {!generatingCopy && (
              <div className="space-y-3 mb-4">
                {publishFb && (
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#1877F2' }}>
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                        </svg>
                      </div>
                      <p className="text-xs font-bold" style={{ color: '#0F172A' }}>Facebook Reels</p>
                    </div>
                    <textarea value={captionFb} onChange={e => setCaptionFb(e.target.value)} rows={6}
                      className="w-full rounded-xl border-2 px-3 py-2 text-xs resize-none focus:outline-none"
                      style={{ borderColor: '#E5E7EB', color: '#0F172A', lineHeight: '1.5' }} />
                    <p className="text-right text-[10px] mt-0.5" style={{ color: '#9CA3AF' }}>
                      {captionFb.length} {t('caracteres', 'characters')}
                    </p>
                  </div>
                )}
                {publishTk && (
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#010101' }}>
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.19 8.19 0 004.79 1.52V6.75a4.85 4.85 0 01-1.02-.06z"/>
                        </svg>
                      </div>
                      <p className="text-xs font-bold" style={{ color: '#0F172A' }}>TikTok</p>
                    </div>
                    <textarea value={captionTk} onChange={e => setCaptionTk(e.target.value)} rows={4}
                      className="w-full rounded-xl border-2 px-3 py-2 text-xs resize-none focus:outline-none"
                      style={{ borderColor: '#E5E7EB', color: '#0F172A', lineHeight: '1.5' }} />
                    <p className="text-right text-[10px] mt-0.5"
                      style={{ color: captionTk.length > 150 ? '#F59E0B' : '#9CA3AF' }}>
                      {captionTk.length}/150 {t('caracteres recomendados', 'recommended characters')}
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <button onClick={() => setStep('select-platforms')} className="flex-1 py-2.5 rounded-xl font-bold border-2 text-sm" style={{ borderColor: '#E5E7EB', color: '#0F172A' }}>
                ← {t('Atrás', 'Back')}
              </button>
              <button onClick={() => setStep('music')}
                disabled={generatingCopy || (publishFb && !captionFb) || (publishTk && !captionTk)}
                className="flex-1 py-2.5 rounded-xl font-bold text-white text-sm disabled:opacity-40" style={{ backgroundColor: '#2563EB' }}>
                {t('Continuar →', 'Continue →')}
              </button>
            </div>
          </>
        )}

        {/* ── MÚSICA ── */}
        {step === 'music' && (
          <>
            <h3 className="text-lg font-bold mb-1 text-center" style={{ color: '#0F172A' }}>
              🎵 {t('Música (opcional)', 'Music (optional)')}
            </h3>
            <p className="text-xs text-center mb-3" style={{ color: '#6B7280' }}>
              {t('Elige una pista o publica sin música', 'Choose a track or publish without music')}
            </p>

            <div className="rounded-xl p-3 mb-3" style={{ backgroundColor: '#F9FAFB', border: '1.5px solid #E5E7EB' }}>
              <p className="text-xs font-semibold mb-2" style={{ color: '#0F172A' }}>
                🎙️ {t('¿El video tiene tu voz/narración?', 'Does the video have your voice/narration?')}
              </p>
              <div className="flex gap-2">
                <button onClick={() => setKeepOriginalAudio(false)} className="flex-1 py-1.5 rounded-lg text-xs font-bold border-2"
                  style={{ backgroundColor: !keepOriginalAudio ? '#2563EB' : '#fff', color: !keepOriginalAudio ? '#fff' : '#0F172A', borderColor: '#E5E7EB' }}>
                  {t('No', 'No')}
                </button>
                <button onClick={() => { setKeepOriginalAudio(true); setVolumeSlider(20); }} className="flex-1 py-1.5 rounded-lg text-xs font-bold border-2"
                  style={{ backgroundColor: keepOriginalAudio ? '#2563EB' : '#fff', color: keepOriginalAudio ? '#fff' : '#0F172A', borderColor: '#E5E7EB' }}>
                  {t('Sí, conservarla', "Yes, keep it")}
                </button>
              </div>
            </div>

            {genres.length > 0 && (
              <>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {genres.map(genre => (
                    <button key={genre} onClick={() => setSelectedGenre(selectedGenre === genre ? null : genre)}
                      className="px-2.5 py-1 rounded-full text-xs font-bold capitalize"
                      style={{ backgroundColor: selectedGenre === genre ? '#2563EB' : '#F3F4F6', color: selectedGenre === genre ? '#fff' : '#0F172A' }}>
                      {genre}
                    </button>
                  ))}
                </div>
                {selectedGenre && (
                  <div className="space-y-1.5 mb-3 max-h-28 overflow-y-auto">
                    {musicCatalog.filter(tr => tr.genre === selectedGenre).map(track => (
                      <button key={track.id} onClick={() => setSelectedTrack(selectedTrack?.id === track.id ? null : track)}
                        className="w-full text-left rounded-lg border-2 px-3 py-2 flex items-center justify-between"
                        style={{ borderColor: selectedTrack?.id === track.id ? '#2563EB' : '#E5E7EB' }}>
                        <span className="text-xs font-semibold" style={{ color: '#0F172A' }}>{track.name}</span>
                        <span className="text-xs opacity-60" style={{ color: '#0F172A' }}>{formatDuration(track.duration_seconds)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}

            {selectedTrack && selectedVideo && (
              <div className="rounded-xl p-3 mb-3" style={{ backgroundColor: '#F9FAFB', border: '1.5px solid #E5E7EB' }}>
                <div className="flex items-center gap-3 mb-2">
                  <video ref={previewVideoRef} src={selectedVideo} playsInline
                    onEnded={() => { setIsPreviewPlaying(false); previewAudioRef.current?.pause(); }}
                    className="rounded-lg object-cover bg-black flex-shrink-0" style={{ width: '52px', height: '80px' }} />
                  <button onClick={togglePreview} className="w-9 h-9 rounded-full flex items-center justify-center text-white flex-shrink-0"
                    style={{ backgroundColor: '#2563EB' }}>
                    {isPreviewPlaying ? '⏸️' : '▶️'}
                  </button>
                  <div className="flex-1">
                    <p className="text-xs font-semibold" style={{ color: '#0F172A' }}>{t('Vista previa', 'Preview')}</p>
                    <p className="text-[11px] opacity-60" style={{ color: '#0F172A' }}>{selectedTrack.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs">🔈</span>
                  <input type="range" min={0} max={100} value={volumeSlider}
                    onChange={e => setVolumeSlider(Number(e.target.value))} className="flex-1" />
                  <span className="text-xs">🔊</span>
                </div>
                <audio ref={previewAudioRef} src={selectedTrack.preview_url} className="hidden" />
              </div>
            )}

            {publishTk && selectedTrack && (
              <div className="rounded-xl p-3 mb-3" style={{ backgroundColor: '#FEF3C7', border: '1.5px solid #FCD34D' }}>
                <p className="text-xs font-semibold mb-1" style={{ color: '#92400E' }}>
                  ⚠️ {t('Música en TikTok', 'Music on TikTok')}
                </p>
                <p className="text-xs mb-2" style={{ color: '#92400E' }}>
                  {t('TikTok puede restringir contenido con música de terceros. Incluirla es bajo tu responsabilidad.',
                    'TikTok may restrict third-party music. Including it is at your own risk.')}
                </p>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={includeMusicTiktok} onChange={e => setIncludeMusicTiktok(e.target.checked)} className="w-4 h-4 rounded" />
                  <span className="text-xs font-semibold" style={{ color: '#92400E' }}>
                    {t('Incluir música en TikTok de todas formas', 'Include music in TikTok anyway')}
                  </span>
                </label>
              </div>
            )}

            <div className="flex gap-2">
              <button onClick={() => setStep('copy')} className="flex-1 py-2.5 rounded-xl font-bold border-2 text-sm" style={{ borderColor: '#E5E7EB', color: '#0F172A' }}>
                ← {t('Atrás', 'Back')}
              </button>
              <button onClick={() => startPublish(false)}
                className="flex-1 py-2.5 rounded-xl font-bold border-2 text-sm"
                style={{ borderColor: '#E5E7EB', color: '#0F172A' }}>
                {t('Sin música', 'No music')}
              </button>
              <button onClick={() => startPublish(true)} disabled={!selectedTrack}
                className="flex-1 py-2.5 rounded-xl font-bold text-white text-sm disabled:opacity-40"
                style={{ backgroundColor: '#2563EB' }}>
                🎬 {t('Publicar', 'Publish')}
              </button>
            </div>
          </>
        )}

        {/* ── PUBLICANDO ── */}
        {step === 'publishing' && (
          <>
            <h3 className="text-xl font-bold mb-3 text-center" style={{ color: '#0F172A' }}>
              🚀 {t('Publicando...', 'Publishing...')}
            </h3>
            <p className="text-center text-sm mb-4" style={{ color: '#6B7280' }}>{statusMessage}</p>

            <div className="space-y-2 mb-4">
              {publishFb && (
                <div className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: '#F8FAFC' }}>
                  <span className="text-lg">{platformIcon(fbStatus)}</span>
                  <div>
                    <p className="text-sm font-bold" style={{ color: '#0F172A' }}>Facebook Reels</p>
                    <p className="text-xs" style={{ color: '#6B7280' }}>
                      {fbStatus === 'idle'       && t('En espera...', 'Waiting...')}
                      {fbStatus === 'publishing' && t('Enviando a Facebook...', 'Sending to Facebook...')}
                      {fbStatus === 'processing' && t('Facebook procesando el video...', 'Facebook processing video...')}
                      {fbStatus === 'success'    && t('¡Publicado!', 'Published!')}
                      {fbStatus === 'timeout'    && t('Tardando más de lo esperado', 'Taking longer than expected')}
                      {fbStatus === 'error'      && (fbError || t('Error al publicar', 'Publish error'))}
                    </p>
                  </div>
                </div>
              )}
              {publishTk && (
                <div className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: '#F8FAFC' }}>
                  <span className="text-lg">{platformIcon(tkStatus)}</span>
                  <div>
                    <p className="text-sm font-bold" style={{ color: '#0F172A' }}>TikTok</p>
                    <p className="text-xs" style={{ color: '#6B7280' }}>
                      {tkStatus === 'idle'       && t('En espera...', 'Waiting...')}
                      {tkStatus === 'publishing' && t('Enviando a TikTok...', 'Sending to TikTok...')}
                      {tkStatus === 'processing' && t('TikTok procesando el video...', 'TikTok processing video...')}
                      {tkStatus === 'success'    && t('¡Publicado!', 'Published!')}
                      {tkStatus === 'timeout'    && t('Tardando más de lo esperado', 'Taking longer than expected')}
                      {tkStatus === 'error'      && (tkError || t('Error al publicar', 'Publish error'))}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
            </div>
          </>
        )}

        {/* ── DONE ── */}
        {step === 'done' && (
          <>
            <div className="text-center mb-4">
              <div className="text-5xl mb-3">{hasAnySuccess() ? '🎉' : '⚠️'}</div>
              <h3 className="text-xl font-bold" style={{ color: hasAnySuccess() ? '#10B981' : '#F59E0B' }}>
                {hasAnySuccess()
                  ? t('¡Publicación completada!', 'Publishing complete!')
                  : t('Publicación finalizada con problemas', 'Publishing finished with issues')}
              </h3>
            </div>

            <div className="space-y-2 mb-5">
              {publishFb && (
                <div className="flex items-center gap-3 p-3 rounded-xl border-2"
                  style={{
                    borderColor: fbStatus === 'success' ? '#10B981' : fbStatus === 'timeout' ? '#F59E0B' : '#DC2626',
                    backgroundColor: fbStatus === 'success' ? '#F0FDF4' : fbStatus === 'timeout' ? '#FFFBEB' : '#FEF2F2',
                  }}>
                  <span className="text-xl">{platformIcon(fbStatus)}</span>
                  <div>
                    <p className="text-sm font-bold" style={{ color: '#0F172A' }}>Facebook Reels</p>
                    <p className="text-xs" style={{ color: '#6B7280' }}>
                      {fbStatus === 'success' && t('Video publicado en tu página de Facebook', 'Video published to your Facebook page')}
                      {fbStatus === 'timeout' && t('No se pudo confirmar — revisa tu página de Facebook', "Couldn't confirm — check your Facebook page")}
                      {fbStatus === 'error'   && (fbError || t('No se pudo publicar', 'Could not publish'))}
                    </p>
                  </div>
                </div>
              )}
              {publishTk && (
                <div className="flex items-center gap-3 p-3 rounded-xl border-2"
                  style={{
                    borderColor: tkStatus === 'success' ? '#10B981' : tkStatus === 'timeout' ? '#F59E0B' : '#DC2626',
                    backgroundColor: tkStatus === 'success' ? '#F0FDF4' : tkStatus === 'timeout' ? '#FFFBEB' : '#FEF2F2',
                  }}>
                  <span className="text-xl">{platformIcon(tkStatus)}</span>
                  <div>
                    <p className="text-sm font-bold" style={{ color: '#0F172A' }}>TikTok</p>
                    <p className="text-xs" style={{ color: '#6B7280' }}>
                      {tkStatus === 'success' && t('Video publicado en tu cuenta de TikTok', 'Video published to your TikTok account')}
                      {tkStatus === 'timeout' && t('No se pudo confirmar — revisa tu cuenta de TikTok', "Couldn't confirm — check your TikTok account")}
                      {tkStatus === 'error'   && (tkError || t('No se pudo publicar', 'Could not publish'))}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <button onClick={onClose} className="w-full py-3 rounded-xl font-bold text-white" style={{ backgroundColor: '#2563EB' }}>
              {t('Cerrar', 'Close')}
            </button>
          </>
        )}

      </div>
    </div>
  );
}