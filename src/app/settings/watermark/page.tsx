'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import AppLayout from '@/components/AppLayout';
import Image from 'next/image';
import { useTranslation } from '@/hooks/useTranslation';

const T = {
  navy:       '#1B2D5B',
  gold:       '#C9A84C',
  goldLight:  '#E8C96A',
  goldPale:   '#F5EDD8',
  cream:      '#F8F6F2',
  white:      '#FFFFFF',
  charcoal:   '#1A1A2E',
  muted:      '#6B7280',
  border:     '#E8E4DC',
  green:      '#15803D',
  greenBg:    '#F0FDF4',
  greenBorder:'#BBF7D0',
  red:        '#DC2626',
  redBg:      '#FEF2F2',
};

export default function WatermarkSettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { t } = useTranslation();

  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [position, setPosition] = useState<string>('bottom-right');
  const [size, setSize] = useState<string>('medium');
  const [useCornerLogo, setUseCornerLogo] = useState<boolean>(true);

  const [watermarkUrl, setWatermarkUrl] = useState<string | null>(null);
  const [opacity, setOpacity] = useState<number>(30);
  const [scale, setScale] = useState<number>(50);
  const [useWatermark, setUseWatermark] = useState<boolean>(false);

  const [loading, setLoading] = useState(true);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingWatermark, setUploadingWatermark] = useState(false);
  const [saving, setSaving] = useState(false);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const watermarkInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status, router]);

  useEffect(() => {
    if (session) loadSettings();
  }, [session]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/agent/profile');
      if (response.ok) {
        const data = await response.json();
        setLogoUrl(data.agent.watermark_logo || null);
        setPosition(data.agent.watermark_position || 'bottom-right');
        setSize(data.agent.watermark_size || 'medium');
        setUseCornerLogo(data.agent.use_corner_logo ?? true);
        setWatermarkUrl(data.agent.watermark_image || null);
        setOpacity(data.agent.watermark_opacity || 30);
        setScale(data.agent.watermark_scale || 50);
        setUseWatermark(data.agent.use_watermark ?? false);
      }
    } catch (err) { console.error('Error loading settings:', err); }
    finally { setLoading(false); }
  };

  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert(t('watermark.imageTooLarge')); return; }
    if (!file.type.startsWith('image/')) { alert(t('watermark.onlyImages')); return; }
    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append('logo', file);
      const response = await fetch('/api/watermark/upload', { method: 'POST', body: formData });
      if (!response.ok) { const data = await response.json(); throw new Error(data.error || t('watermark.errorUpload')); }
      const data = await response.json();
      setLogoUrl(data.logoUrl);
      await loadSettings();
      alert(t('watermark.logoUploaded'));
    } catch (err: any) { alert(err.message); }
    finally { setUploadingLogo(false); if (logoInputRef.current) logoInputRef.current.value = ''; }
  };

  const handleUploadWatermark = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'image/png') { alert('Solo se permiten imágenes PNG con fondo transparente'); return; }
    if (file.size > 2 * 1024 * 1024) { alert(t('watermark.imageTooLarge')); return; }
    setUploadingWatermark(true);
    try {
      const formData = new FormData();
      formData.append('watermark', file);
      const response = await fetch('/api/watermark/upload-transparent', { method: 'POST', body: formData });
      if (!response.ok) { const data = await response.json(); throw new Error(data.error || 'Error al subir marca de agua'); }
      const data = await response.json();
      setWatermarkUrl(data.watermarkUrl);
      await loadSettings();
      alert('Marca de agua subida correctamente');
    } catch (err: any) { alert(err.message); }
    finally { setUploadingWatermark(false); if (watermarkInputRef.current) watermarkInputRef.current.value = ''; }
  };

  const handleDeleteLogo = async () => {
    if (!confirm(t('watermark.confirmDelete'))) return;
    try {
      const response = await fetch('/api/watermark/delete', { method: 'DELETE' });
      if (!response.ok) throw new Error(t('watermark.errorDelete'));
      setLogoUrl(null);
      alert(t('watermark.logoDeleted'));
    } catch (err: any) { alert(err.message); }
  };

  const handleDeleteWatermark = async () => {
    if (!confirm('¿Eliminar marca de agua?')) return;
    try {
      const response = await fetch('/api/watermark/delete-transparent', { method: 'DELETE' });
      if (!response.ok) throw new Error('Error al eliminar marca de agua');
      setWatermarkUrl(null);
      setUseWatermark(false);
      alert('Marca de agua eliminada');
    } catch (err: any) { alert(err.message); }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/watermark/update-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ position, size, useCornerLogo, opacity, scale, useWatermark }),
      });
      if (!response.ok) throw new Error(t('watermark.errorSave'));
      alert(t('watermark.settingsSaved'));
    } catch (err: any) { alert(err.message); }
    finally { setSaving(false); }
  };

  if (status === 'loading' || loading) {
    return (
      <AppLayout title={t('watermark.title')} showBack={true} showTabs={true}>
        <div className="flex items-center justify-center h-full" style={{ backgroundColor: T.cream }}>
          <div className="text-center py-12">
            <div className="text-5xl mb-4 animate-pulse">🎨</div>
            <div className="text-base font-medium" style={{ color: T.muted }}>{t('watermark.loading')}</div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!session) return null;

  const positionOptions = [
    { value: 'top-left',     label: '↖️', title: t('watermark.topLeft') },
    { value: 'top-right',    label: '↗️', title: t('watermark.topRight') },
    { value: 'bottom-left',  label: '↙️', title: t('watermark.bottomLeft') },
    { value: 'bottom-right', label: '↘️', title: t('watermark.bottomRight') },
  ];

  const sizeOptions = [
    { value: 'small',  label: t('watermark.small') },
    { value: 'medium', label: t('watermark.medium') },
    { value: 'large',  label: t('watermark.large') },
  ];

  // ── Preview visual de la foto con marca de agua ───────────────────────────
  const PhotoPreview = () => (
    <div
      className="relative w-full aspect-video rounded-xl overflow-hidden"
      style={{ backgroundColor: '#E5E7EB' }}
    >
      {/* Foto simulada */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-6xl opacity-30">🏠</span>
      </div>

      {/* Watermark centrado */}
      {useWatermark && watermarkUrl && (
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{ opacity: opacity / 100 }}
        >
          <div style={{ width: `${scale}%`, height: `${scale}%`, position: 'relative' }}>
            <Image src={watermarkUrl} alt="Watermark Preview" fill className="object-contain" />
          </div>
        </div>
      )}

      {/* Logo esquina */}
      {useCornerLogo && logoUrl && (
        <div
          className="absolute"
          style={{
            [position.includes('top') ? 'top' : 'bottom']: '10px',
            [position.includes('left') ? 'left' : 'right']: '10px',
            width: size === 'small' ? '36px' : size === 'medium' ? '52px' : '72px',
            height: size === 'small' ? '36px' : size === 'medium' ? '52px' : '72px',
          }}
        >
          <Image src={logoUrl} alt="Logo Preview" fill className="object-contain" />
        </div>
      )}

      {/* Label */}
      <div
        className="absolute bottom-2 left-2 px-2 py-0.5 rounded text-[10px] font-bold"
        style={{ backgroundColor: 'rgba(0,0,0,0.5)', color: T.white }}
      >
        Preview
      </div>
    </div>
  );

  return (
    <AppLayout title={t('watermark.title')} showBack={true} showTabs={true}>
      {/*
        mobile:  1 columna
        tablet+: 2 columnas — izquierda config, derecha preview sticky + guardar
      */}
      <div
        className="px-4 pt-4 pb-24 md:pb-8 md:px-6 md:pt-6 md:grid md:grid-cols-2 md:gap-6 md:items-start lg:grid-cols-[1fr_380px]"
        style={{ backgroundColor: T.cream }}
      >

        {/* ── COLUMNA IZQUIERDA ── */}
        <div className="space-y-4">

          {/* Título mobile */}
          <div className="flex items-center gap-2 md:hidden">
            <div style={{ width: '3px', height: '22px', backgroundColor: T.gold, borderRadius: '2px', flexShrink: 0 }} />
            <h1 className="text-xl font-bold tracking-tight" style={{ color: T.navy }}>{t('watermark.title')}</h1>
          </div>

          {/* Tip */}
          <div
            className="rounded-2xl p-4 flex items-start gap-3"
            style={{ backgroundColor: T.goldPale, border: `1px solid rgba(201,168,76,0.35)` }}
          >
            <span className="text-lg flex-shrink-0">💡</span>
            <p className="text-xs leading-relaxed" style={{ color: T.navy, opacity: 0.8 }}>
              Puedes usar <strong>logo en esquina</strong> y <strong>marca de agua centrada</strong> al mismo tiempo en las fotos de tus propiedades.
            </p>
          </div>

          {/* ── SECCIÓN 1: Logo en Esquina ── */}
          <div
            className="rounded-2xl p-5 shadow-sm"
            style={{ backgroundColor: T.white, border: `1px solid ${T.border}` }}
          >
            {/* Header sección */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-base"
                  style={{ backgroundColor: T.goldPale, border: `1px solid rgba(201,168,76,0.35)` }}
                >
                  🏷️
                </div>
                <h3 className="font-bold text-sm" style={{ color: T.navy }}>Logo en Esquina</h3>
              </div>
              {/* Toggle */}
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-xs font-semibold" style={{ color: T.muted }}>Usar en fotos</span>
                <button
                  onClick={() => setUseCornerLogo(!useCornerLogo)}
                  className="relative flex-shrink-0 transition-colors duration-200"
                  style={{
                    width: '40px', height: '22px', borderRadius: '100px',
                    backgroundColor: useCornerLogo ? T.navy : T.border,
                    border: 'none', cursor: 'pointer', padding: 0,
                  }}
                >
                  <span
                    className="absolute transition-transform duration-200"
                    style={{
                      top: '3px', left: '3px', width: '16px', height: '16px',
                      borderRadius: '50%', backgroundColor: useCornerLogo ? T.gold : T.white,
                      boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                      transform: useCornerLogo ? 'translateX(18px)' : 'translateX(0px)',
                      display: 'block',
                    }}
                  />
                </button>
              </label>
            </div>

            <p className="text-xs mb-4" style={{ color: T.muted }}>
              Este logo se usará en las esquinas de las fotos y en los PDFs generados
            </p>

            {logoUrl ? (
              <div className="space-y-4">
                {/* Imagen actual */}
                <div
                  className="relative w-36 h-36 mx-auto rounded-2xl overflow-hidden"
                  style={{ border: `1px solid ${T.border}`, backgroundColor: T.cream }}
                >
                  <Image src={logoUrl} alt="Logo" fill className="object-contain p-4" />
                </div>

                {/* Acciones */}
                <div className="flex gap-2">
                  <label className="flex-1 cursor-pointer">
                    <input ref={logoInputRef} type="file" accept="image/png,image/jpeg,image/jpg" onChange={handleUploadLogo} disabled={uploadingLogo} className="hidden" />
                    <span
                      className="block w-full py-2.5 rounded-xl font-bold text-sm text-center active:scale-95 transition-transform"
                      style={{ border: `1.5px solid ${T.navy}`, color: T.navy, backgroundColor: T.white }}
                    >
                      {uploadingLogo ? t('watermark.uploading') : `🔄 ${t('watermark.changeLogo')}`}
                    </span>
                  </label>
                  <button
                    onClick={handleDeleteLogo}
                    className="px-4 py-2.5 rounded-xl font-bold text-sm text-white active:scale-95 transition-transform"
                    style={{ backgroundColor: T.red }}
                  >
                    🗑️
                  </button>
                </div>

                {/* Posición y tamaño — solo si está activo */}
                {useCornerLogo && (
                  <div className="pt-4 space-y-4" style={{ borderTop: `1px solid ${T.border}` }}>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: T.muted }}>
                        📍 {t('watermark.position')}
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {positionOptions.map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => setPosition(opt.value)}
                            className="py-2.5 px-3 rounded-xl font-semibold text-sm flex items-center gap-2 transition-all active:scale-95"
                            style={{
                              backgroundColor: position === opt.value ? T.navy : T.cream,
                              color: position === opt.value ? T.white : T.charcoal,
                              border: `1.5px solid ${position === opt.value ? T.navy : T.border}`,
                            }}
                          >
                            <span>{opt.label}</span>
                            <span className="text-xs">{opt.title}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: T.muted }}>
                        📏 {t('watermark.size')}
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        {sizeOptions.map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => setSize(opt.value)}
                            className="py-2.5 rounded-xl font-semibold text-sm transition-all active:scale-95"
                            style={{
                              backgroundColor: size === opt.value ? T.navy : T.cream,
                              color: size === opt.value ? T.white : T.charcoal,
                              border: `1.5px solid ${size === opt.value ? T.navy : T.border}`,
                            }}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div
                  className="w-full py-10 rounded-xl border-2 border-dashed text-center"
                  style={{ borderColor: T.border, backgroundColor: T.cream }}
                >
                  <div className="text-4xl mb-2">🏷️</div>
                  <p className="text-sm font-semibold" style={{ color: T.muted }}>{t('watermark.noCustomLogo')}</p>
                </div>
                <label className="block cursor-pointer">
                  <input ref={logoInputRef} type="file" accept="image/png,image/jpeg,image/jpg" onChange={handleUploadLogo} disabled={uploadingLogo} className="hidden" />
                  <span
                    className="block w-full py-3 rounded-xl font-bold text-sm text-center active:scale-95 transition-transform"
                    style={{
                      background: `linear-gradient(135deg, ${T.gold} 0%, ${T.goldLight} 100%)`,
                      color: T.navy,
                      boxShadow: '0 2px 8px rgba(201,168,76,0.3)',
                    }}
                  >
                    {uploadingLogo ? t('watermark.uploading') : '📤 Subir Logo (PNG/JPG)'}
                  </span>
                </label>
              </div>
            )}
          </div>

          {/* ── SECCIÓN 2: Marca de Agua Centrada ── */}
          <div
            className="rounded-2xl p-5 shadow-sm"
            style={{ backgroundColor: T.white, border: `1px solid ${T.border}` }}
          >
            {/* Header sección */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-base"
                  style={{ backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE' }}
                >
                  💧
                </div>
                <h3 className="font-bold text-sm" style={{ color: T.navy }}>Marca de Agua Centrada</h3>
              </div>
              {/* Toggle */}
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-xs font-semibold" style={{ color: T.muted }}>Usar en fotos</span>
                <button
                  onClick={() => setUseWatermark(!useWatermark)}
                  className="relative flex-shrink-0 transition-colors duration-200"
                  style={{
                    width: '40px', height: '22px', borderRadius: '100px',
                    backgroundColor: useWatermark ? T.navy : T.border,
                    border: 'none', cursor: 'pointer', padding: 0,
                  }}
                >
                  <span
                    className="absolute transition-transform duration-200"
                    style={{
                      top: '3px', left: '3px', width: '16px', height: '16px',
                      borderRadius: '50%', backgroundColor: useWatermark ? T.gold : T.white,
                      boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                      transform: useWatermark ? 'translateX(18px)' : 'translateX(0px)',
                      display: 'block',
                    }}
                  />
                </button>
              </label>
            </div>

            <p className="text-xs mb-4" style={{ color: T.muted }}>
              Logo grande y semitransparente en el centro de las fotos (solo para propiedades)
            </p>

            {/* Aviso remove.bg */}
            <div
              className="rounded-xl p-3 mb-4"
              style={{ backgroundColor: '#FFFBEB', border: '1.5px solid #FDE68A' }}
            >
              <p className="text-xs font-bold mb-1" style={{ color: '#B45309' }}>
                ⚠️ Paso 1: Preparar tu logo
              </p>
              <p className="text-xs mb-2" style={{ color: '#B45309' }}>
                Usa <strong>remove.bg</strong> para eliminar el fondo antes de subir
              </p>
              <a
                href="https://www.remove.bg/es"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full py-2 px-3 rounded-lg font-bold text-center text-white text-xs active:scale-95 transition-transform"
                style={{ backgroundColor: '#F59E0B' }}
              >
                🔗 Ir a remove.bg
              </a>
            </div>

            {watermarkUrl ? (
              <div className="space-y-4">
                {/* Imagen actual con fondo ajedrez */}
                <div
                  className="relative w-36 h-36 mx-auto rounded-2xl overflow-hidden"
                  style={{
                    background: 'repeating-conic-gradient(#F3F4F6 0% 25%, #FFFFFF 0% 50%) 50% / 20px 20px',
                    border: `1px solid ${T.border}`,
                  }}
                >
                  <Image src={watermarkUrl} alt="Watermark" fill className="object-contain p-4" />
                </div>

                {/* Acciones */}
                <div className="flex gap-2">
                  <label className="flex-1 cursor-pointer">
                    <input ref={watermarkInputRef} type="file" accept="image/png" onChange={handleUploadWatermark} disabled={uploadingWatermark} className="hidden" />
                    <span
                      className="block w-full py-2.5 rounded-xl font-bold text-sm text-center active:scale-95 transition-transform"
                      style={{ border: `1.5px solid ${T.navy}`, color: T.navy, backgroundColor: T.white }}
                    >
                      {uploadingWatermark ? 'Subiendo...' : '🔄 Cambiar'}
                    </span>
                  </label>
                  <button
                    onClick={handleDeleteWatermark}
                    className="px-4 py-2.5 rounded-xl font-bold text-sm text-white active:scale-95 transition-transform"
                    style={{ backgroundColor: T.red }}
                  >
                    🗑️
                  </button>
                </div>

                {/* Controles tamaño/opacidad — solo si activo */}
                {useWatermark && (
                  <div className="pt-4 space-y-4" style={{ borderTop: `1px solid ${T.border}` }}>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-bold uppercase tracking-wider" style={{ color: T.muted }}>🔍 Tamaño</p>
                        <span className="text-xs font-bold" style={{ color: T.navy }}>{scale}%</span>
                      </div>
                      <input
                        type="range" min="30" max="70" value={scale}
                        onChange={(e) => setScale(Number(e.target.value))}
                        className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        style={{ backgroundColor: T.border }}
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-bold uppercase tracking-wider" style={{ color: T.muted }}>💎 Opacidad</p>
                        <span className="text-xs font-bold" style={{ color: T.navy }}>{opacity}%</span>
                      </div>
                      <input
                        type="range" min="10" max="60" value={opacity}
                        onChange={(e) => setOpacity(Number(e.target.value))}
                        className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        style={{ backgroundColor: T.border }}
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div
                  className="w-full py-10 rounded-xl border-2 border-dashed text-center"
                  style={{ borderColor: T.border, backgroundColor: T.cream }}
                >
                  <div className="text-4xl mb-2">💧</div>
                  <p className="text-sm font-semibold" style={{ color: T.muted }}>No hay marca de agua</p>
                </div>
                <label className="block cursor-pointer">
                  <input ref={watermarkInputRef} type="file" accept="image/png" onChange={handleUploadWatermark} disabled={uploadingWatermark} className="hidden" />
                  <span
                    className="block w-full py-3 rounded-xl font-bold text-sm text-center active:scale-95 transition-transform"
                    style={{
                      background: `linear-gradient(135deg, ${T.navy} 0%, #243770 100%)`,
                      color: T.white,
                    }}
                  >
                    {uploadingWatermark ? 'Subiendo...' : '📤 Subir PNG Transparente'}
                  </span>
                </label>
              </div>
            )}
          </div>

        </div>{/* fin columna izquierda */}

        {/* ── COLUMNA DERECHA — preview sticky + guardar ── */}
        <div className="space-y-4 mt-4 md:mt-0 md:sticky md:top-4">

          {/* Preview */}
          <div
            className="rounded-2xl p-5 shadow-sm"
            style={{ backgroundColor: T.white, border: `1px solid ${T.border}` }}
          >
            <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: T.muted }}>
              👁️ {t('watermark.preview')}
            </p>
            <PhotoPreview />
            <p className="text-xs mt-2 text-center" style={{ color: T.muted }}>
              Vista previa aproximada de cómo se verá en las fotos
            </p>
          </div>

          {/* Estado actual */}
          <div
            className="rounded-2xl p-4 shadow-sm"
            style={{ backgroundColor: T.white, border: `1px solid ${T.border}` }}
          >
            <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: T.muted }}>
              Estado actual
            </p>
            <div className="space-y-2">
              {[
                { label: 'Logo en esquina', active: useCornerLogo && !!logoUrl, missing: !logoUrl },
                { label: 'Marca de agua', active: useWatermark && !!watermarkUrl, missing: !watermarkUrl },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-sm" style={{ color: T.charcoal }}>{item.label}</span>
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: item.active ? T.greenBg : item.missing ? T.cream : '#FEF2F2',
                      color: item.active ? T.green : item.missing ? T.muted : T.red,
                      border: `1px solid ${item.active ? T.greenBorder : item.missing ? T.border : '#FECACA'}`,
                    }}
                  >
                    {item.active ? '● Activo' : item.missing ? '○ Sin imagen' : '○ Inactivo'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Botón guardar */}
          <button
            onClick={handleSaveSettings}
            disabled={saving}
            className="w-full py-4 rounded-xl font-bold text-sm shadow-sm active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            style={{
              background: `linear-gradient(135deg, ${T.gold} 0%, ${T.goldLight} 100%)`,
              color: T.navy,
              boxShadow: '0 2px 8px rgba(201,168,76,0.3)',
            }}
          >
            {saving ? t('watermark.saving') : `💾 ${t('watermark.saveSettings')}`}
          </button>
        </div>

      </div>
    </AppLayout>
  );
}