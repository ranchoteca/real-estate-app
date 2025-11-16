'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import MobileLayout from '@/components/MobileLayout';
import Image from 'next/image';

interface AgentCard {
  display_name: string;
  brokerage: string;
  bio: string;
  facebook_url: string;
  instagram_url: string;
  profile_photo: string | null;
  cover_photo: string | null;
}

export default function DigitalCardSettings() {
  const router = useRouter();
  const { data: session, status } = useSession();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [username, setUsername] = useState('');
  
  const [formData, setFormData] = useState<AgentCard>({
    display_name: '',
    brokerage: '',
    bio: '',
    facebook_url: '',
    instagram_url: '',
    profile_photo: null,
    cover_photo: null
  });

  const [uploadingProfile, setUploadingProfile] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  // Referencias para los inputs de archivos
  const profileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      loadCardData();
    }
  }, [status]);

  const loadCardData = async () => {
    try {
      const response = await fetch('/api/agent-card/get');
      if (response.ok) {
        const data = await response.json();
        setUsername(data.agent.username);
        
        if (data.card) {
          setFormData({
            display_name: data.card.display_name || '',
            brokerage: data.card.brokerage || '',
            bio: data.card.bio || '',
            facebook_url: data.card.facebook_url || '',
            instagram_url: data.card.instagram_url || '',
            profile_photo: data.card.profile_photo || null,
            cover_photo: data.card.cover_photo || null
          });
        } else {
          setFormData(prev => ({
            ...prev,
            display_name: session?.user?.name || ''
          }));
        }
      }
    } catch (error) {
      console.error('Error loading card:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'profile' | 'cover') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (type === 'profile') setUploadingProfile(true);
    else setUploadingCover(true);

    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);
      formDataUpload.append('type', type);

      const response = await fetch('/api/agent-card/upload-photo', {
        method: 'POST',
        body: formDataUpload
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
      }

      const data = await response.json();
      
      setFormData(prev => ({
        ...prev,
        [type === 'profile' ? 'profile_photo' : 'cover_photo']: data.url
      }));

      alert(`✅ ${type === 'profile' ? 'Foto de perfil' : 'Foto de portada'} subida exitosamente`);
    } catch (error: any) {
      alert(`❌ Error: ${error.message}`);
    } finally {
      if (type === 'profile') setUploadingProfile(false);
      else setUploadingCover(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.display_name.trim()) {
      alert('El nombre es requerido');
      return;
    }

    setSaving(true);

    try {
      const response = await fetch('/api/agent-card/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
      }

      alert('✅ Tarjeta actualizada correctamente');
    } catch (error: any) {
      alert(`❌ Error: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = () => {
    if (username) {
      window.open(`/agent/${username}/card`, '_blank');
    }
  };

  if (loading) {
    return (
      <MobileLayout title="Tarjeta Digital" showBack={true} showTabs={true}>
        <div className="flex flex-col items-center justify-center h-full">
          <div className="text-8xl mb-4 animate-pulse">📇</div>
          <p className="text-lg" style={{ color: '#0F172A' }}>Cargando...</p>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout title="Tarjeta Digital" showBack={true} showTabs={true}>
      <form onSubmit={handleSubmit} className="p-4 space-y-6" style={{ paddingBottom: '220px' }}>
        
        {/* Preview Card */}
        <div className="rounded-2xl overflow-hidden shadow-lg" style={{ backgroundColor: '#FFFFFF' }}>
          {/* Cover Photo */}
          <div className="relative h-32 bg-gradient-to-br from-blue-500 to-purple-600">
            {formData.cover_photo && (
              <Image
                src={formData.cover_photo}
                alt="Cover"
                fill
                className="object-cover"
              />
            )}
            
            {/* Input oculto para portada */}
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              disabled={uploadingCover}
              onChange={(e) => {
                console.log('onChange portada activado');
                console.log('Archivo seleccionado:', e.target.files?.[0]?.name);
                handlePhotoUpload(e, 'cover');
              }}
            />
            
            {/* Botón de portada - MÁS GRANDE Y VISIBLE */}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Click en botón portada');
                console.log('coverInputRef:', coverInputRef.current);
                if (coverInputRef.current) {
                  coverInputRef.current.click();
                }
              }}
              disabled={uploadingCover}
              className="absolute bottom-2 right-2 px-4 py-2 rounded-lg text-sm font-bold text-white cursor-pointer shadow-lg"
              style={{ backgroundColor: 'rgba(0,0,0,0.7)', touchAction: 'manipulation' }}
            >
              {uploadingCover ? '⏳ Subiendo...' : '📷 ' + (formData.cover_photo ? 'Cambiar portada' : 'Subir portada')}
            </button>
            
            {/* Dimensiones recomendadas portada */}
            <div 
              className="absolute top-2 right-2 px-2 py-1 rounded text-xs font-semibold"
              style={{ backgroundColor: 'rgba(255,255,255,0.95)', color: '#2563EB' }}
            >
              📐 1200px × 400px
            </div>
          </div>

          {/* Profile Section */}
          <div className="relative px-4 pb-4">
            <div className="flex items-end gap-4 -mt-12">
              {/* Profile Photo */}
              <div className="relative">
                <div className="w-24 h-24 rounded-full border-4 border-white bg-gray-200 overflow-hidden shadow-lg">
                  {formData.profile_photo ? (
                    <Image
                      src={formData.profile_photo}
                      alt="Profile"
                      width={96}
                      height={96}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl">
                      👤
                    </div>
                  )}
                </div>
                
                {/* Input oculto para perfil */}
                <input
                  ref={profileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploadingProfile}
                  onChange={(e) => handlePhotoUpload(e, 'profile')}
                />
                
                {/* Botón de perfil */}
                <button
                  type="button"
                  onClick={() => profileInputRef.current?.click()}
                  disabled={uploadingProfile}
                  className="absolute bottom-0 right-0 w-8 h-8 rounded-full flex items-center justify-center cursor-pointer shadow-lg"
                  style={{ backgroundColor: '#2563EB' }}
                >
                  <span className="text-white text-sm">{uploadingProfile ? '⏳' : '📷'}</span>
                </button>
                
                {/* Dimensiones recomendadas perfil */}
                <div 
                  className="absolute -top-1 -left-1 px-1.5 py-0.5 rounded text-xs font-bold shadow-md"
                  style={{ backgroundColor: '#FFFFFF', color: '#2563EB', fontSize: '9px' }}
                >
                  400px × 400px
                </div>
              </div>

              {/* Info Preview */}
              <div className="flex-1 mt-2">
                <h2 className="text-xl font-bold" style={{ color: '#0F172A' }}>
                  {formData.display_name || 'Tu Nombre'}
                </h2>
                {formData.brokerage && (
                  <p className="text-sm opacity-70" style={{ color: '#0F172A' }}>
                    {formData.brokerage}
                  </p>
                )}
              </div>
            </div>

            {formData.bio && (
              <p className="mt-3 text-sm opacity-80" style={{ color: '#0F172A' }}>
                {formData.bio}
              </p>
            )}

            {/* Social Media Preview */}
            {(formData.facebook_url || formData.instagram_url) && (
              <div className="mt-4 pt-4 border-t" style={{ borderColor: '#E5E7EB' }}>
                <div className="flex justify-center gap-3">
                  {formData.facebook_url && (
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg shadow-md"
                      style={{ backgroundColor: '#1877F2' }}>
                      <span className="text-white">f</span>
                    </div>
                  )}
                  {formData.instagram_url && (
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg shadow-md"
                      style={{ background: 'linear-gradient(45deg, #f09433 0%,#e6683c 25%,#dc2743 50%,#cc2366 75%,#bc1888 100%)' }}>
                      <span className="text-white">📷</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Form Title */}
        <h2 className="text-xl font-bold pt-2" style={{ color: '#0F172A' }}>
          Ingresa la información de tu tarjeta
        </h2>

        {/* Form Fields */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: '#0F172A' }}>
              Nombre *
            </label>
            <input
              type="text"
              value={formData.display_name}
              onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-gray-900"
              style={{ borderColor: 'rgb(229, 231, 235)', backgroundColor: 'rgb(249, 250, 251)' }}
              placeholder="Ej: Juan Pérez"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: '#0F172A' }}>
              Broker / Agencia
            </label>
            <input
              type="text"
              value={formData.brokerage}
              onChange={(e) => setFormData({ ...formData, brokerage: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-gray-900"
              style={{ borderColor: 'rgb(229, 231, 235)', backgroundColor: 'rgb(249, 250, 251)' }}
              placeholder="Ej: RE/MAX Costa Rica"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: '#0F172A' }}>
              Biografía
            </label>
            <textarea
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-gray-900 resize-none"
              style={{ borderColor: 'rgb(229, 231, 235)', backgroundColor: 'rgb(249, 250, 251)' }}
              placeholder="Ej: Agente inmobiliario con 10 años de experiencia en Guanacaste..."
              rows={4}
              maxLength={500}
            />
            <p className="text-xs mt-1 opacity-60" style={{ color: '#0F172A' }}>
              {formData.bio.length}/500 caracteres
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: '#0F172A' }}>
              Facebook (opcional)
            </label>
            <input
              type="url"
              value={formData.facebook_url}
              onChange={(e) => setFormData({ ...formData, facebook_url: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-gray-900"
              style={{ borderColor: 'rgb(229, 231, 235)', backgroundColor: 'rgb(249, 250, 251)' }}
              placeholder="https://facebook.com/tu-perfil"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: '#0F172A' }}>
              Instagram (opcional)
            </label>
            <input
              type="url"
              value={formData.instagram_url}
              onChange={(e) => setFormData({ ...formData, instagram_url: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-gray-900"
              style={{ borderColor: 'rgb(229, 231, 235)', backgroundColor: 'rgb(249, 250, 251)' }}
              placeholder="https://instagram.com/tu-usuario"
            />
          </div>
        </div>

        {/* Actions - Botones fijos abajo */}
        <div className="fixed bottom-0 left-0 right-0 p-4 space-y-2 shadow-2xl" style={{ backgroundColor: '#F9FAFB', borderTop: '1px solid #E5E7EB', zIndex: 50 }}>
          <button
            type="button"
            onClick={handlePreview}
            disabled={!username}
            className="w-full py-4 rounded-xl font-bold border-2 active:scale-95 transition-transform text-base"
            style={{
              borderColor: '#2563EB',
              color: '#2563EB',
              backgroundColor: '#FFFFFF'
            }}
          >
            👁️ Vista Previa
          </button>
          
          <button
            type="submit"
            disabled={saving}
            className="w-full py-4 rounded-xl font-bold text-white shadow-lg active:scale-95 transition-transform text-base"
            style={{ backgroundColor: '#2563EB' }}
          >
            {saving ? '⏳ Guardando...' : '💾 Guardar Cambios'}
          </button>
        </div>

        {/* CSS para placeholder gris */}
        <style jsx>{`
          input::placeholder,
          textarea::placeholder {
            color: rgb(156, 163, 175);
          }
        `}</style>
      </form>
    </MobileLayout>
  );
}