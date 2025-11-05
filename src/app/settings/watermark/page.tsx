'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import MobileLayout from '@/components/MobileLayout';
import Image from 'next/image';

export default function WatermarkSettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [position, setPosition] = useState<string>('bottom-right');
  const [size, setSize] = useState<string>('medium');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        setLogoUrl(data.agent.watermark_logo || null);
        setPosition(data.agent.watermark_position || 'bottom-right');
        setSize(data.agent.watermark_size || 'medium');
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
      alert('La imagen es muy grande. Máximo 2MB.');
      return;
    }

    if (!file.type.startsWith('image/')) {
      alert('Solo se permiten imágenes PNG o JPG.');
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('logo', file);

      const response = await fetch('/api/watermark/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al subir logo');
      }

      const data = await response.json();
      setLogoUrl(data.logoUrl);
      await loadSettings();
      alert('✅ Logo subido correctamente');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteLogo = async () => {
    if (!confirm('¿Eliminar logo personalizado? Se usará el texto por defecto.')) return;

    try {
      const response = await fetch('/api/watermark/delete', {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Error al eliminar logo');

      setLogoUrl(null);
      alert('✅ Logo eliminado');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);

    try {
      const response = await fetch('/api/watermark/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ position, size }),
      });

      if (!response.ok) throw new Error('Error al guardar configuración');

      alert('✅ Configuración guardada');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <MobileLayout title="Logo" showBack={true} showTabs={true}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center py-12">
            <div className="text-5xl mb-4 animate-pulse">🎨</div>
            <div className="text-lg" style={{ color: '#0F172A' }}>Cargando...</div>
          </div>
        </div>
      </MobileLayout>
    );
  }

  if (!session) return null;

  return (
    <MobileLayout title="Logo" showBack={true} showTabs={true}>
      <div className="px-4 pt-4 pb-24 space-y-4">
        {/* Info Card */}
        <div 
          className="rounded-2xl p-4 shadow-lg"
          style={{ backgroundColor: '#EFF6FF', borderLeft: '4px solid #2563EB' }}
        >
          <p className="text-sm font-semibold" style={{ color: '#1E40AF' }}>
            💡 <strong>Tip:</strong> Sube un logo para que aparezca automáticamente en todas las fotos de tus propiedades. 
            Si no subes logo, se usará el texto "Flow Estate AI".
          </p>
        </div>

        {/* Logo Actual */}
        <div 
          className="rounded-2xl p-5 shadow-lg"
          style={{ backgroundColor: '#FFFFFF' }}
        >
          <h3 className="font-bold text-lg mb-4" style={{ color: '#0F172A' }}>
            🎨 Tu Logo
          </h3>

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
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg"
                    onChange={handleUploadLogo}
                    disabled={uploading}
                    className="hidden"
                  />
                  <span 
                    className="block w-full py-3 rounded-xl font-bold text-center border-2 active:scale-95 transition-transform"
                    style={{ 
                      borderColor: '#2563EB',
                      color: '#2563EB',
                      backgroundColor: '#FFFFFF'
                    }}
                  >
                    {uploading ? 'Subiendo...' : '🔄 Cambiar Logo'}
                  </span>
                </label>

                <button
                  onClick={handleDeleteLogo}
                  className="px-6 py-3 rounded-xl font-bold text-white shadow-lg active:scale-95 transition-transform"
                  style={{ backgroundColor: '#DC2626' }}
                >
                  🗑️ Eliminar
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div 
                className="w-full py-12 rounded-xl border-2 border-dashed text-center"
                style={{ borderColor: '#E5E7EB', backgroundColor: '#F9FAFB' }}
              >
                <div className="text-5xl mb-3">🎨</div>
                <p className="font-semibold mb-1" style={{ color: '#0F172A' }}>
                  Sin logo personalizado
                </p>
                <p className="text-sm opacity-70" style={{ color: '#0F172A' }}>
                  Se usará el texto "FlowEstate AI" por defecto
                </p>
              </div>

              <label className="block">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg"
                  onChange={handleUploadLogo}
                  disabled={uploading}
                  className="hidden"
                />
                <span 
                  className="block w-full py-3 rounded-xl font-bold text-white text-center shadow-lg active:scale-95 transition-transform"
                  style={{ backgroundColor: uploading ? '#9CA3AF' : '#2563EB' }}
                >
                  {uploading ? 'Subiendo...' : '📤 Subir Logo'}
                </span>
              </label>

              <div 
                className="p-3 rounded-xl text-xs"
                style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}
              >
                <strong>Recomendaciones:</strong>
                <ul className="mt-1 space-y-1 ml-4 list-disc">
                  <li>Tamaño recomendado: 200x200 píxeles</li>
                  <li>Formato: PNG (con fondo transparente) o JPG</li>
                  <li>Tamaño máximo: 2 MB</li>
                  <li>Logo cuadrado funciona mejor</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Configuración */}
        <div 
          className="rounded-2xl p-5 shadow-lg space-y-4"
          style={{ backgroundColor: '#FFFFFF' }}
        >
          <h3 className="font-bold text-lg" style={{ color: '#0F172A' }}>
            ⚙️ Configuración del Logo
          </h3>

          {/* Posición */}
          <div>
            <label className="block text-sm font-bold mb-3" style={{ color: '#0F172A' }}>
              📍 Posición en la Foto
            </label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: 'top-left', label: '↖️ Superior Izq.' },
                { value: 'top-right', label: '↗️ Superior Der.' },
                { value: 'bottom-left', label: '↙️ Inferior Izq.' },
                { value: 'bottom-right', label: '↘️ Inferior Der.' },
              ].map((opt) => (
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
            {!logoUrl && (
              <p className="text-xs mt-2 opacity-70" style={{ color: '#0F172A' }}>
                ℹ️ El texto "FlowEstate AI" siempre aparece en inferior izquierda
              </p>
            )}
          </div>

          {/* Tamaño */}
          <div>
            <label className="block text-sm font-bold mb-3" style={{ color: '#0F172A' }}>
              📏 Tamaño del Logo
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 'small', label: '🔹 Pequeño' },
                { value: 'medium', label: '🔸 Mediano' },
                { value: 'large', label: '🔶 Grande' },
              ].map((opt) => (
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

          {/* Botón Guardar */}
          <button
            onClick={handleSaveSettings}
            disabled={saving}
            className="w-full py-3 rounded-xl font-bold text-white shadow-lg active:scale-95 transition-transform disabled:opacity-50"
            style={{ backgroundColor: '#10B981' }}
          >
            {saving ? 'Guardando...' : '💾 Guardar Configuración'}
          </button>
        </div>

        {/* Preview Example */}
        <div 
          className="rounded-2xl p-5 shadow-lg"
          style={{ backgroundColor: '#FFFFFF' }}
        >
          <h3 className="font-bold text-lg mb-3" style={{ color: '#0F172A' }}>
            👁️ Vista Previa
          </h3>
          <p className="text-sm mb-4 opacity-70" style={{ color: '#0F172A' }}>
            El logo se aplicará automáticamente a todas las fotos que subas
          </p>
          <div 
            className="relative w-full aspect-video rounded-xl overflow-hidden"
            style={{ backgroundColor: '#F3F4F6' }}
          >
            <div className="absolute inset-0 flex items-center justify-center text-gray-400">
              <span className="text-6xl">🏠</span>
            </div>
            {logoUrl ? (
              <div
                className="absolute"
                style={{
                  [position.includes('top') ? 'top' : 'bottom']: '10px',
                  [position.includes('left') ? 'left' : 'right']: '10px',
                  width: size === 'small' ? '40px' : size === 'medium' ? '60px' : '80px',
                  height: size === 'small' ? '40px' : size === 'medium' ? '60px' : '80px',
                }}
              >
                <Image
                  src={logoUrl}
                  alt="Preview"
                  fill
                  className="object-contain"
                />
              </div>
            ) : (
              <div
                className="absolute bottom-2 left-2 px-2 py-1 rounded text-white font-bold"
                style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.6)',
                  fontSize: size === 'small' ? '10px' : size === 'medium' ? '14px' : '18px',
                }}
              >
                FlowEstate AI
              </div>
            )}
          </div>
        </div>
      </div>
    </MobileLayout>
  );
}