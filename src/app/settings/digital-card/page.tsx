'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import AppLayout from '@/components/AppLayout';
import Image from 'next/image';
import { useTranslation } from '@/hooks/useTranslation';

const T = {
  navy:      '#1B2D5B',
  navyMid:   '#243770',
  gold:      '#C9A84C',
  goldLight: '#E8C96A',
  goldPale:  '#F5EDD8',
  cream:     '#F8F6F2',
  white:     '#FFFFFF',
  charcoal:  '#1A1A2E',
  muted:     '#6B7280',
  border:    '#E8E4DC',
  green:     '#15803D',
  greenBg:   '#F0FDF4',
  greenBorder:'#BBF7D0',
  red:       '#DC2626',
};

interface AgentCard {
  display_name: string;
  brokerage: string;
  bio: string;
  display_name_en: string;
  brokerage_en: string;
  bio_en: string;
  facebook_url: string;
  instagram_url: string;
  profile_photo: string | null;
  cover_photo: string | null;
}

export default function DigitalCardSettings() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { t } = useTranslation();

  const phone = session?.user?.phone || '';
  const phone2 = session?.user?.phone_2 || '';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [username, setUsername] = useState('');

  const [formData, setFormData] = useState<AgentCard>({
    display_name: '',
    brokerage: '',
    bio: '',
    display_name_en: '',
    brokerage_en: '',
    bio_en: '',
    facebook_url: '',
    instagram_url: '',
    profile_photo: null,
    cover_photo: null,
  });

  const [uploadingProfile, setUploadingProfile] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  const profileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
    else if (status === 'authenticated') loadCardData();
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
            display_name_en: data.card.display_name_en || '',
            brokerage_en: data.card.brokerage_en || '',
            bio_en: data.card.bio_en || '',
            facebook_url: data.card.facebook_url || '',
            instagram_url: data.card.instagram_url || '',
            profile_photo: data.card.profile_photo || null,
            cover_photo: data.card.cover_photo || null,
          });
        } else {
          setFormData(prev => ({ ...prev, display_name: session?.user?.name || '' }));
        }
      }
    } catch (error) { console.error('Error loading card:', error); }
    finally { setLoading(false); }
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
      const response = await fetch('/api/agent-card/upload-photo', { method: 'POST', body: formDataUpload });
      if (!response.ok) { const error = await response.json(); throw new Error(error.error); }
      const data = await response.json();
      setFormData(prev => ({ ...prev, [type === 'profile' ? 'profile_photo' : 'cover_photo']: data.url }));
      const photoType = type === 'profile' ? t('digitalCard.profilePhoto') : t('digitalCard.coverPhoto');
      alert(`✅ ${photoType} ${t('digitalCard.photoUploaded')}`);
    } catch (error: any) { alert(`❌ ${t('common.error')}: ${error.message}`); }
    finally {
      if (type === 'profile') setUploadingProfile(false);
      else setUploadingCover(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.display_name.trim()) { alert(t('digitalCard.nameRequired')); return; }
    setSaving(true);
    try {
      const response = await fetch('/api/agent-card/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!response.ok) { const error = await response.json(); throw new Error(error.error); }
      alert(t('digitalCard.cardUpdated'));
    } catch (error: any) { alert(`❌ ${t('common.error')}: ${error.message}`); }
    finally { setSaving(false); }
  };

  const buildPhoneText = (lang: 'es' | 'en') => {
    const phones = [phone, phone2].filter(Boolean);
    if (phones.length === 0) return null;
    const lines = phones.map(p => `📱 ${p}`).join('\n');
    return lang === 'es'
      ? `\n\n**Puedes contactarnos a los teléfonos:**\n${lines}`
      : `\n\n**Call us:**\n${lines}`;
  };

  const handleInsertPhones = (lang: 'es' | 'en') => {
    const phones = [phone, phone2].filter(Boolean);
    if (phones.length === 0) { alert('⚠️ No tienes teléfonos configurados. Ve a tu perfil y agrégalos primero.'); return; }
    const text = buildPhoneText(lang)!;
    if (lang === 'es') {
      setFormData(prev => ({ ...prev, bio: (prev.bio + text).slice(0, 500) }));
      alert('✅ Teléfonos insertados al final de la biografía.');
    } else {
      setFormData(prev => ({ ...prev, bio_en: (prev.bio_en + text).slice(0, 500) }));
      alert('✅ Phone numbers inserted at the end of the bio.');
    }
  };

  const handlePreview = () => {
    if (username) window.open(`/agent/${username}/card`, '_blank');
  };

  const isProActivo = session?.user?.plan === 'pro' || session?.user?.role === 'admin';

  // ── Subcomponentes ────────────────────────────────────────────────────────

  const FieldLabel = ({ label, tip }: { label: string; tip?: string }) => (
    <div className="mb-1.5">
      <label className="block text-xs font-bold uppercase tracking-wider" style={{ color: T.muted }}>{label}</label>
      {tip && <p className="text-xs mt-0.5" style={{ color: T.muted }}>{tip}</p>}
    </div>
  );

  const StyledInput = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input
      {...props}
      className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none transition-colors"
      style={{ border: `1.5px solid ${T.border}`, backgroundColor: T.cream, color: T.charcoal }}
    />
  );

  const StyledTextarea = (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
    <textarea
      {...props}
      className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none resize-none"
      style={{ border: `1.5px solid ${T.border}`, backgroundColor: T.cream, color: T.charcoal }}
    />
  );

  const SectionCard = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
    <div className={`rounded-2xl p-5 shadow-sm ${className}`} style={{ backgroundColor: T.white, border: `1px solid ${T.border}` }}>
      {children}
    </div>
  );

  // ── Preview de la tarjeta (reutilizado en mobile y desktop) ───────────────
  const CardPreview = () => (
    <div className="rounded-2xl overflow-hidden shadow-sm" style={{ border: `1px solid ${T.border}` }}>
      {/* Cover Photo */}
      <div
        className="relative h-28"
        style={{ background: formData.cover_photo ? 'transparent' : `linear-gradient(135deg, ${T.navy} 0%, ${T.navyMid} 100%)` }}
      >
        {formData.cover_photo && (
          <Image src={formData.cover_photo} alt="Cover" fill className="object-cover" />
        )}
        <input ref={coverInputRef} type="file" accept="image/*" className="hidden" disabled={uploadingCover} onChange={(e) => handlePhotoUpload(e, 'cover')} />
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); coverInputRef.current?.click(); }}
          disabled={uploadingCover}
          className="absolute bottom-2 left-2 px-2.5 py-1 rounded-lg text-xs font-bold text-white"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 10 }}
        >
          {uploadingCover ? `⏳ ${t('digitalCard.uploading')}` : `📷 ${formData.cover_photo ? t('digitalCard.changeCover') : t('digitalCard.uploadCover')}`}
        </button>
        <div
          className="absolute top-2 right-2 px-2 py-0.5 rounded text-[10px] font-semibold"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', color: T.white, zIndex: 10 }}
        >
          1200×400px
        </div>
      </div>

      {/* Profile section */}
      <div className="relative px-4 pb-4" style={{ backgroundColor: T.white }}>
        <div className="flex items-end gap-3 -mt-10">
          {/* Foto de perfil */}
          <div className="relative flex-shrink-0">
            <div
              className="w-20 h-20 rounded-full border-4 overflow-hidden flex items-center justify-center"
              style={{ borderColor: T.white, backgroundColor: T.cream, boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}
            >
              {formData.profile_photo ? (
                <Image src={formData.profile_photo} alt="Profile" width={80} height={80} className="object-cover w-full h-full" />
              ) : (
                <span className="text-3xl">👤</span>
              )}
            </div>
            <input ref={profileInputRef} type="file" accept="image/*" className="hidden" disabled={uploadingProfile} onChange={(e) => handlePhotoUpload(e, 'profile')} />
            <button
              type="button"
              onClick={() => profileInputRef.current?.click()}
              disabled={uploadingProfile}
              className="absolute bottom-0 right-0 w-7 h-7 rounded-full flex items-center justify-center text-xs"
              style={{ backgroundColor: T.gold, color: T.navy, boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }}
            >
              {uploadingProfile ? '⏳' : '📷'}
            </button>
            <div
              className="absolute -top-1 -left-1 px-1.5 py-0.5 rounded shadow-md"
              style={{ backgroundColor: T.white, color: T.navy, fontSize: '8px', fontWeight: 700 }}
            >
              400×400px
            </div>
          </div>

          {/* Nombre y empresa */}
          <div className="flex-1 mt-2 min-w-0">
            <h2 className="text-base font-bold truncate" style={{ color: T.navy }}>
              {formData.display_name || t('digitalCard.yourName')}
            </h2>
            {formData.brokerage && (
              <p className="text-xs truncate" style={{ color: T.muted }}>{formData.brokerage}</p>
            )}
          </div>
        </div>

        {/* Bio */}
        {formData.bio && (
          <div className="mt-3 text-xs leading-relaxed" style={{ color: T.charcoal }}>
            {formData.bio.split('\n').map((line, i) => {
              const parts = line.split(/\*\*(.*?)\*\*/g);
              return (
                <p key={i} className={line === '' ? 'mt-1' : ''}>
                  {parts.map((part, j) => j % 2 === 1 ? <strong key={j}>{part}</strong> : part)}
                </p>
              );
            })}
          </div>
        )}

        {/* Redes sociales */}
        {(formData.facebook_url || formData.instagram_url) && (
          <div className="mt-3 pt-3 flex gap-2" style={{ borderTop: `1px solid ${T.border}` }}>
            {formData.facebook_url && (
              <div className="w-8 h-8 rounded-full flex items-center justify-center shadow-sm" style={{ backgroundColor: '#1877F2' }}>
                <span className="text-white text-xs font-bold">f</span>
              </div>
            )}
            {formData.instagram_url && (
              <div className="w-8 h-8 rounded-full flex items-center justify-center shadow-sm" style={{ background: 'linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)' }}>
                <span className="text-white text-xs">📷</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <AppLayout title={t('digitalCard.title')} showBack={true} showTabs={true}>
        <div className="flex items-center justify-center h-full" style={{ backgroundColor: T.cream }}>
          <div className="text-center py-12">
            <div className="text-5xl mb-4 animate-pulse">📇</div>
            <div className="text-base font-medium" style={{ color: T.muted }}>{t('digitalCard.loading')}</div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!session) return null;

  return (
    <AppLayout title={t('digitalCard.title')} showBack={true} showTabs={true}>
      <form onSubmit={handleSubmit}>
        {/*
          mobile:  1 columna — preview arriba, form abajo
          tablet+: 2 columnas — izquierda form, derecha preview sticky + botones
        */}
        <div
          className="px-4 pt-4 pb-24 md:pb-8 md:px-6 md:pt-6 md:grid md:grid-cols-2 md:gap-6 md:items-start lg:grid-cols-[1fr_380px]"
          style={{ backgroundColor: T.cream }}
        >

          {/* ── COLUMNA IZQUIERDA — formulario ── */}
          <div className="space-y-4">

            {/* Título mobile */}
            <div className="flex items-center gap-2 md:hidden">
              <div style={{ width: '3px', height: '22px', backgroundColor: T.gold, borderRadius: '2px', flexShrink: 0 }} />
              <h1 className="text-xl font-bold tracking-tight" style={{ color: T.navy }}>{t('digitalCard.title')}</h1>
            </div>

            {/* Preview — solo mobile */}
            <div className="md:hidden">
              <CardPreview />
            </div>

            {/* Info de la tarjeta */}
            <SectionCard>
              <p className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: T.muted }}>
                {t('digitalCard.cardInfo')}
              </p>

              {/* Campos en Español */}
              <div className="space-y-4">
                <div>
                  <FieldLabel label={`${t('digitalCard.name')} (Español) *`} />
                  <StyledInput
                    type="text"
                    value={formData.display_name}
                    onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                    placeholder={t('digitalCard.namePlaceholder')}
                    required
                  />
                </div>

                <div>
                  <FieldLabel label={`${t('digitalCard.brokerAgency')} (Español)`} />
                  <StyledInput
                    type="text"
                    value={formData.brokerage}
                    onChange={(e) => setFormData({ ...formData, brokerage: e.target.value })}
                    placeholder={t('digitalCard.brokerPlaceholder')}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider" style={{ color: T.muted }}>
                      {t('digitalCard.bio')} (Español)
                    </label>
                    <button
                      type="button"
                      onClick={() => handleInsertPhones('es')}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold active:scale-95 transition-transform"
                      style={{ backgroundColor: T.goldPale, color: T.navy, border: `1px solid rgba(201,168,76,0.35)` }}
                    >
                      📲 Insertar tel.
                    </button>
                  </div>
                  <StyledTextarea
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    placeholder={t('digitalCard.bioPlaceholder')}
                    rows={4}
                    maxLength={500}
                  />
                  <p className="text-xs mt-1" style={{ color: T.muted }}>{formData.bio.length}/500 {t('digitalCard.characters')}</p>
                </div>
              </div>
            </SectionCard>

            {/* Sección bilingüe */}
            {isProActivo ? (
              <SectionCard>
                <div
                  className="flex items-center gap-2 mb-4 pb-3"
                  style={{ borderBottom: `1px solid ${T.border}` }}
                >
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
                    style={{ backgroundColor: T.goldPale, border: `1px solid rgba(201,168,76,0.35)` }}
                  >
                    🌐
                  </div>
                  <div>
                    <p className="text-xs font-bold" style={{ color: T.navy }}>{t('digitalCard.bilingualSection')}</p>
                    <p className="text-[10px]" style={{ color: T.muted }}>{t('digitalCard.bilingualNote')}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <FieldLabel label={t('digitalCard.nameEnglish')} />
                    <StyledInput
                      type="text"
                      value={formData.display_name_en}
                      onChange={(e) => setFormData({ ...formData, display_name_en: e.target.value })}
                      placeholder="Ex: John Smith"
                    />
                  </div>
                  <div>
                    <FieldLabel label={t('digitalCard.brokerEnglish')} />
                    <StyledInput
                      type="text"
                      value={formData.brokerage_en}
                      onChange={(e) => setFormData({ ...formData, brokerage_en: e.target.value })}
                      placeholder="Ex: RE/MAX Costa Rica"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider" style={{ color: T.muted }}>
                        {t('digitalCard.bioEnglish')}
                      </label>
                      <button
                        type="button"
                        onClick={() => handleInsertPhones('en')}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold active:scale-95 transition-transform"
                        style={{ backgroundColor: T.goldPale, color: T.navy, border: `1px solid rgba(201,168,76,0.35)` }}
                      >
                        📲 Insert phones
                      </button>
                    </div>
                    <StyledTextarea
                      value={formData.bio_en}
                      onChange={(e) => setFormData({ ...formData, bio_en: e.target.value })}
                      placeholder={t('digitalCard.bioEnglishPlaceholder')}
                      rows={4}
                      maxLength={500}
                    />
                    <p className="text-xs mt-1" style={{ color: T.muted }}>{formData.bio_en.length}/500 {t('digitalCard.characters')}</p>
                  </div>
                </div>
              </SectionCard>
            ) : (
              <div
                className="rounded-2xl p-4 flex items-center gap-3"
                style={{ backgroundColor: T.goldPale, border: `1px solid rgba(201,168,76,0.35)` }}
              >
                <span className="text-2xl flex-shrink-0">🌐</span>
                <div>
                  <p className="text-sm font-bold" style={{ color: T.navy }}>
                    {t('digitalCard.bilingualSection')} — Pro
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: T.navy, opacity: 0.7 }}>
                    Upgrade to Pro to enable the bilingual version of your digital card.
                  </p>
                </div>
              </div>
            )}

            {/* Redes sociales */}
            <SectionCard>
              <p className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: T.muted }}>
                Redes Sociales
              </p>
              <div className="space-y-4">
                <div>
                  <FieldLabel label={t('digitalCard.facebook')} />
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2">
                      <svg width="16" height="16" fill="#1877F2" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                    </div>
                    <input
                      type="url"
                      value={formData.facebook_url}
                      onChange={(e) => setFormData({ ...formData, facebook_url: e.target.value })}
                      placeholder={t('digitalCard.facebookPlaceholder')}
                      className="w-full pl-10 pr-4 py-3 rounded-xl text-sm focus:outline-none"
                      style={{ border: `1.5px solid ${T.border}`, backgroundColor: T.cream, color: T.charcoal }}
                    />
                  </div>
                </div>
                <div>
                  <FieldLabel label={t('digitalCard.instagram')} />
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-base">📷</div>
                    <input
                      type="url"
                      value={formData.instagram_url}
                      onChange={(e) => setFormData({ ...formData, instagram_url: e.target.value })}
                      placeholder={t('digitalCard.instagramPlaceholder')}
                      className="w-full pl-10 pr-4 py-3 rounded-xl text-sm focus:outline-none"
                      style={{ border: `1.5px solid ${T.border}`, backgroundColor: T.cream, color: T.charcoal }}
                    />
                  </div>
                </div>
              </div>
            </SectionCard>

            {/* Botones — solo mobile */}
            <div className="md:hidden space-y-2 pb-4">
              <button
                type="button"
                onClick={handlePreview}
                disabled={!username}
                className="w-full py-3.5 rounded-xl font-bold text-sm active:scale-95 transition-transform disabled:opacity-40"
                style={{ border: `1.5px solid ${T.navy}`, color: T.navy, backgroundColor: T.white }}
              >
                👁️ {t('digitalCard.preview')}
              </button>
              <button
                type="submit"
                disabled={saving}
                className="w-full py-3.5 rounded-xl font-bold text-sm active:scale-95 transition-transform disabled:opacity-50"
                style={{
                  background: `linear-gradient(135deg, ${T.gold} 0%, ${T.goldLight} 100%)`,
                  color: T.navy,
                  boxShadow: '0 2px 8px rgba(201,168,76,0.3)',
                }}
              >
                {saving ? `⏳ ${t('digitalCard.saving')}` : `💾 ${t('digitalCard.saveChanges')}`}
              </button>
            </div>

          </div>{/* fin columna izquierda */}

          {/* ── COLUMNA DERECHA — preview sticky + botones (solo tablet+) ── */}
          <div className="hidden md:block md:sticky md:top-4 space-y-4">

            <p className="text-xs font-bold uppercase tracking-wider px-1" style={{ color: T.muted }}>
              👁️ {t('digitalCard.preview')}
            </p>

            <CardPreview />

            <button
              type="button"
              onClick={handlePreview}
              disabled={!username}
              className="w-full py-3.5 rounded-xl font-bold text-sm active:scale-95 transition-transform disabled:opacity-40"
              style={{ border: `1.5px solid ${T.navy}`, color: T.navy, backgroundColor: T.white }}
            >
              👁️ {t('digitalCard.preview')}
            </button>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-3.5 rounded-xl font-bold text-sm active:scale-95 transition-transform disabled:opacity-50"
              style={{
                background: `linear-gradient(135deg, ${T.gold} 0%, ${T.goldLight} 100%)`,
                color: T.navy,
                boxShadow: '0 2px 8px rgba(201,168,76,0.3)',
              }}
            >
              {saving ? `⏳ ${t('digitalCard.saving')}` : `💾 ${t('digitalCard.saveChanges')}`}
            </button>

          </div>

        </div>
      </form>
    </AppLayout>
  );
}