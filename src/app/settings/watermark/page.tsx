'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import MobileLayout from '@/components/MobileLayout';
import Image from 'next/image';
import { useTranslation } from '@/hooks/useTranslation';

export default function WatermarkSettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { t } = useTranslation();

  // Logo original (para esquina + PDFs)
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [position, setPosition] = useState<string>('bottom-right');
  const [size, setSize] = useState<string>('medium');
  const [useCornerLogo, setUseCornerLogo] = useState<boolean>(true);

  // Watermark centrado (solo para fotos)
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
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (session) {
      loadSettings();
    }
  }, [session]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/agent/profile');
      if (response.ok) {
        const data = await response.json();
        
        // Logo en esquina
        setLogoUrl(data.agent.watermark_logo || null);
        setPosition(data.agent.watermark_position || 'bottom-right');
        setSize(data.agent.watermark_size || 'medium');
        setUseCornerLogo(data.agent.use_corner_logo ?? true);
        
        // Watermark centrado
        setWatermarkUrl(data.agent.watermark_image || null);
        setOpacity(data.agent.watermark_opacity || 30);
        setScale(data.agent.watermark_scale || 50);
        setUseWatermark(data.agent.use_watermark ?? false);
      }
    } catch (err) {
      console.error('Error loading settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert(t('watermark.imageTooLarge'));
      return;
    }

    if (!file.type.startsWith('image/')) {
      alert(t('watermark.onlyImages'));
      return;
    }

    setUploadingLogo(true);

    try {
      const formData = new FormData();
      formData.append('logo', file);

      const response = await fetch('/api/watermark/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || t('watermark.errorUpload'));
      }

      const data = await response.json();
      setLogoUrl(data.logoUrl);
      await loadSettings();
      alert(t('watermark.logoUploaded'));
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUploadingLogo(false);
      if (logoInputRef.current) {
        logoInputRef.current.value = '';
      }
    }
  };

  const handleUploadWatermark = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'image/png') {
      alert('Solo se permiten imágenes PNG con fondo transparente');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert(t('watermark.imageTooLarge'));
      return;
    }

    setUploadingWatermark(true);

    try {
      const formData = new FormData();
      formData.append('watermark', file);

      const response = await fetch('/api/watermark/upload-transparent', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al subir marca de agua');
      }

      const data = await response.json();
      setWatermarkUrl(data.watermarkUrl);
      await loadSettings();
      alert('Marca de agua subida correctamente');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUploadingWatermark(false);
      if (watermarkInputRef.current) {
        watermarkInputRef.current.value = '';
      }
    }
  };

  const handleDeleteLogo = async () => {
    if (!confirm(t('watermark.confirmDelete'))) return;

    try {
      const response = await fetch('/api/watermark/delete', {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error(t('watermark.errorDelete'));

      setLogoUrl(null);
      alert(t('watermark.logoDeleted'));
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteWatermark = async () => {
    if (!confirm('¿Eliminar marca de agua?')) return;

    try {
      const response = await fetch('/api/watermark/delete-transparent', {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Error al eliminar marca de agua');

      setWatermarkUrl(null);
      setUseWatermark(false);
      alert('Marca de agua eliminada');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);

    try {
      const response = await fetch('/api/watermark/update-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          position,
          size,
          useCornerLogo,
          opacity,
          scale,
          useWatermark,
        }),
      });

      if (!response.ok) throw new Error(t('watermark.errorSave'));

      alert(t('watermark.settingsSaved'));
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <MobileLayout title={t('watermark.title')} showBack={true} showTabs={true}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center py-12">
            <div className="text-5xl mb-4 animate-pulse">🎨</div>
            <div className="text-lg" style={{ color: '#0F172A' }}>
              {t('watermark.loading')}
            </div>
          </div>
        </div>
      </MobileLayout>
    );
  }

  if (!session) return null;

  const positionOptions = [
    { value: 'top-left', label: `↖️ ${t('watermark.topLeft')}` },
    { value: 'top-right', label: `↗️ ${t('watermark.topRight')}` },
    { value: 'bottom-left', label: `↙️ ${t('watermark.bottomLeft')}` },
    { value: 'bottom-right', label: `↘️ ${t('watermark.bottomRight')}` },
  ];

  const sizeOptions = [
    { value: 'small', label: `🔹 ${t('watermark.small')}` },
    { value: 'medium', label: `🔸 ${t('watermark.medium')}` },
    { value: 'large', label: `🔶 ${t('watermark.large')}` },
  ];

  return (
    <MobileLayout title={t('watermark.title')} showBack={true} showTabs={true}>
      <div className="px-4 pt-4 pb-24 space-y-4">
        {/* Info Card */}
        <div 
          className="rounded-2xl p-4 shadow-lg"
          style={{ backgroundColor: '#EFF6FF', borderLeft: '4px solid #2563EB' }}
        >
          <p className="text-sm font-semibold" style={{ color: '#1E40AF' }}>
            💡 <strong>Tip:</strong> Puedes usar logo en esquina Y marca de agua centrada al mismo tiempo en las fotos de tus propiedades.
          </p>
        </div>

        {/* SECCIÓN 1: Logo en Esquina */}
        <div className="rounded-2xl p-5 shadow-lg" style={{ backgroundColor: '#FFFFFF' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg" style={{ color: '#0F172A' }}>
              🏷️ Logo en Esquina
            </h3>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={useCornerLogo}
                onChange={(e) => setUseCornerLogo(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-semibold" style={{ color: '#0F172A' }}>
                Usar en fotos
              </span>
            </label>
          </div>

          <p className="text-xs mb-4 opacity-70" style={{ color: '#0F172A' }}>
            Este logo se usará en las esquinas de las fotos y en los PDFs generados
          </p>

          {logoUrl ? (
            <div className="space-y-4">
              <div className="relative w-48 h-48 mx-auto rounded-xl overflow-hidden border-2" style={{ borderColor: '#E5E7EB' }}>
                <Image
                  src={logoUrl}
                  alt="Logo"
                  fill
                  className="object-contain p-4"
                  style={{ backgroundColor: '#F9FAFB' }}
                />
              </div>

              <div className="flex gap-3">
                <label className="flex-1">
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg"
                    onChange={handleUploadLogo}
                    disabled={uploadingLogo}
                    className="hidden"
                  />
                  <span 
                    className="block w-full py-3 rounded-xl font-bold text-center border-2 active:scale-95 transition-transform"
                    style={{ borderColor: '#2563EB', color: '#2563EB', backgroundColor: '#FFFFFF' }}
                  >
                    {uploadingLogo ? t('watermark.uploading') : `🔄 ${t('watermark.changeLogo')}`}
                  </span>
                </label>
                <button
                  onClick={handleDeleteLogo}
                  className="px-6 py-3 rounded-xl font-bold text-white shadow-lg active:scale-95 transition-transform"
                  style={{ backgroundColor: '#DC2626' }}
                >
                  🗑️
                </button>
              </div>

              {useCornerLogo && (
                <div className="pt-4 border-t space-y-4" style={{ borderColor: '#E5E7EB' }}>
                  <div>
                    <label className="block text-sm font-bold mb-3" style={{ color: '#0F172A' }}>
                      📍 {t('watermark.position')}
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {positionOptions.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => setPosition(opt.value)}
                          className="py-3 px-4 rounded-xl font-semibold transition-all active:scale-95"
                          style={{
                            backgroundColor: position === opt.value ? '#2563EB' : '#F3F4F6',
                            color: position === opt.value ? '#FFFFFF' : '#0F172A',
                          }}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-3" style={{ color: '#0F172A' }}>
                      📏 {t('watermark.size')}
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {sizeOptions.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => setSize(opt.value)}
                          className="py-3 px-4 rounded-xl font-semibold transition-all active:scale-95"
                          style={{
                            backgroundColor: size === opt.value ? '#2563EB' : '#F3F4F6',
                            color: size === opt.value ? '#FFFFFF' : '#0F172A',
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
            <div className="space-y-4">
              <div className="w-full py-12 rounded-xl border-2 border-dashed text-center" style={{ borderColor: '#E5E7EB', backgroundColor: '#F9FAFB' }}>
                <div className="text-5xl mb-3">🏷️</div>
                <p className="font-semibold mb-1" style={{ color: '#0F172A' }}>
                  {t('watermark.noCustomLogo')}
                </p>
              </div>
              <label className="block">
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg"
                  onChange={handleUploadLogo}
                  disabled={uploadingLogo}
                  className="hidden"
                />
                <span 
                  className="block w-full py-3 rounded-xl font-bold text-white text-center shadow-lg active:scale-95 transition-transform"
                  style={{ backgroundColor: uploadingLogo ? '#9CA3AF' : '#2563EB' }}
                >
                  {uploadingLogo ? t('watermark.uploading') : `📤 Subir Logo (PNG/JPG)`}
                </span>
              </label>
            </div>
          )}
        </div>

        {/* SECCIÓN 2: Marca de Agua Centrada */}
        <div className="rounded-2xl p-5 shadow-lg" style={{ backgroundColor: '#FFFFFF' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg" style={{ color: '#0F172A' }}>
              💧 Marca de Agua Centrada
            </h3>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={useWatermark}
                onChange={(e) => setUseWatermark(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-semibold" style={{ color: '#0F172A' }}>
                Usar en fotos
              </span>
            </label>
          </div>

          <p className="text-xs mb-4 opacity-70" style={{ color: '#0F172A' }}>
            Logo grande y semitransparente en el centro de las fotos (solo para propiedades)
          </p>

          <div className="rounded-xl p-4 mb-4" style={{ backgroundColor: '#FEF3C7', border: '2px solid #F59E0B' }}>
            <p className="text-sm font-bold mb-2" style={{ color: '#92400E' }}>
              ⚠️ Paso 1: Preparar tu logo
            </p>
            <p className="text-xs mb-3" style={{ color: '#92400E' }}>
              Usa <strong>remove.bg</strong> para eliminar el fondo de tu logo antes de subirlo aquí
            </p>
            <a 
              href="https://www.remove.bg/es" 
              target="_blank" 
              rel="noopener noreferrer"
              className="block w-full py-2 px-4 rounded-lg font-bold text-center text-white shadow-lg active:scale-95 transition-transform"
              style={{ backgroundColor: '#F59E0B' }}
            >
              🔗 Ir a remove.bg
            </a>
          </div>

          {watermarkUrl ? (
            <div className="space-y-4">
              <div 
                className="relative w-48 h-48 mx-auto rounded-xl overflow-hidden border-2"
                style={{ 
                  borderColor: '#E5E7EB',
                  background: 'repeating-conic-gradient(#F3F4F6 0% 25%, #FFFFFF 0% 50%) 50% / 20px 20px'
                }}
              >
                <Image src={watermarkUrl} alt="Watermark" fill className="object-contain p-4" />
              </div>
              <div className="flex gap-3">
                <label className="flex-1">
                  <input
                    ref={watermarkInputRef}
                    type="file"
                    accept="image/png"
                    onChange={handleUploadWatermark}
                    disabled={uploadingWatermark}
                    className="hidden"
                  />
                  <span 
                    className="block w-full py-3 rounded-xl font-bold text-center border-2 active:scale-95 transition-transform"
                    style={{ borderColor: '#2563EB', color: '#2563EB', backgroundColor: '#FFFFFF' }}
                  >
                    {uploadingWatermark ? 'Subiendo...' : '🔄 Cambiar'}
                  </span>
                </label>
                <button
                  onClick={handleDeleteWatermark}
                  className="px-6 py-3 rounded-xl font-bold text-white shadow-lg active:scale-95 transition-transform"
                  style={{ backgroundColor: '#DC2626' }}
                >
                  🗑️
                </button>
              </div>

              {useWatermark && (
                <div className="pt-4 border-t space-y-4" style={{ borderColor: '#E5E7EB' }}>
                  <div>
                    <label className="block text-sm font-bold mb-3 flex items-center justify-between" style={{ color: '#0F172A' }}>
                      <span>🔍 Tamaño</span>
                      <span className="text-blue-600">{scale}%</span>
                    </label>
                    <input
                      type="range"
                      min="30"
                      max="70"
                      value={scale}
                      onChange={(e) => setScale(Number(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-3 flex items-center justify-between" style={{ color: '#0F172A' }}>
                      <span>💎 Opacidad</span>
                      <span className="text-blue-600">{opacity}%</span>
                    </label>
                    <input
                      type="range"
                      min="10"
                      max="60"
                      value={opacity}
                      onChange={(e) => setOpacity(Number(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="w-full py-12 rounded-xl border-2 border-dashed text-center" style={{ borderColor: '#E5E7EB', backgroundColor: '#F9FAFB' }}>
                <div className="text-5xl mb-3">💧</div>
                <p className="font-semibold mb-1" style={{ color: '#0F172A' }}>
                  No hay marca de agua
                </p>
              </div>
              <label className="block">
                <input
                  ref={watermarkInputRef}
                  type="file"
                  accept="image/png"
                  onChange={handleUploadWatermark}
                  disabled={uploadingWatermark}
                  className="hidden"
                />
                <span 
                  className="block w-full py-3 rounded-xl font-bold text-white text-center shadow-lg active:scale-95 transition-transform"
                  style={{ backgroundColor: uploadingWatermark ? '#9CA3AF' : '#10B981' }}
                >
                  {uploadingWatermark ? 'Subiendo...' : '📤 Subir PNG Transparente'}
                </span>
              </label>
            </div>
          )}
        </div>

        <button
          onClick={handleSaveSettings}
          disabled={saving}
          className="w-full py-4 rounded-xl font-bold text-white shadow-lg active:scale-95 transition-transform disabled:opacity-50"
          style={{ backgroundColor: '#10B981' }}
        >
          {saving ? t('watermark.saving') : `💾 ${t('watermark.saveSettings')}`}
        </button>

        {/* Preview */}
        <div className="rounded-2xl p-5 shadow-lg" style={{ backgroundColor: '#FFFFFF' }}>
          <h3 className="font-bold text-lg mb-3" style={{ color: '#0F172A' }}>
            👁️ {t('watermark.preview')}
          </h3>
          <div className="relative w-full aspect-video rounded-xl overflow-hidden" style={{ backgroundColor: '#F3F4F6' }}>
            <div className="absolute inset-0 flex items-center justify-center text-gray-400">
              <span className="text-6xl">🏠</span>
            </div>
            
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

            {useCornerLogo && logoUrl && (
              <div
                className="absolute"
                style={{
                  [position.includes('top') ? 'top' : 'bottom']: '10px',
                  [position.includes('left') ? 'left' : 'right']: '10px',
                  width: size === 'small' ? '40px' : size === 'medium' ? '60px' : '80px',
                  height: size === 'small' ? '40px' : size === 'medium' ? '60px' : '80px',
                }}
              >
                <Image src={logoUrl} alt="Preview" fill className="object-contain" />
              </div>
            )}
          </div>
        </div>
      </div>
    </MobileLayout>
  );
}