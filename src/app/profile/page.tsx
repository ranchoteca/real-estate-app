'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import Image from 'next/image';
import { useTranslation } from '@/hooks/useTranslation';

const T = {
  navy:      '#1B2D5B',
  gold:      '#C9A84C',
  goldLight: '#E8C96A',
  goldPale:  '#F5EDD8',
  cream:     '#F8F6F2',
  white:     '#FFFFFF',
  charcoal:  '#1A1A2E',
  muted:     '#6B7280',
  border:    '#E8E4DC',
};

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { t } = useTranslation();
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [phone2, setPhone2] = useState('');
  const [brokerage, setBrokerage] = useState('');
  const [saving, setSaving] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status, router]);

  useEffect(() => {
    if (session?.user) {
      setUsername(session.user.username || '');
      setFullName(session.user.fullName || session.user.name || '');
      setPhone(session.user.phone || '');
      setPhone2(session.user.phone_2 || '');
      setBrokerage(session.user.brokerage || '');
    }
  }, [session]);

  useEffect(() => {
    if (session?.user?.username) {
      fetch(`/api/agent-card/get?username=${session.user.username}`)
        .then(res => res.ok ? res.json() : null)
        .then(data => { if (data?.card?.profile_photo) setProfilePhoto(data.card.profile_photo); })
        .catch(() => {});
    }
  }, [session?.user?.username]);

  if (status === 'loading') {
    return (
      <AppLayout title={t('profile.title')} showTabs={true}>
        <div className="flex items-center justify-center h-full" style={{ backgroundColor: T.cream }}>
          <div className="text-center py-12">
            <div className="text-5xl mb-4 animate-pulse">👤</div>
            <div className="text-base font-medium" style={{ color: T.muted }}>{t('profile.loading')}</div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!session) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/agent/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, fullName, phone, phone_2: phone2, brokerage }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || t('common.error'));
      }
      alert(t('profile.profileUpdated'));
      window.location.reload();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    if (confirm(t('profile.confirmLogout'))) signOut({ callbackUrl: '/login' });
  };

  const isFree = session.user.plan === 'free';
  const isPro = session.user.plan === 'pro' && session.user.expires_at;
  const initials = fullName ? fullName.charAt(0).toUpperCase() : (session.user.name?.charAt(0).toUpperCase() || '?');

  return (
    <AppLayout title={t('profile.title')} showTabs={true}>
      {/*
        mobile:   1 columna
        tablet+:  2 columnas — izquierda avatar+plan, derecha formulario
      */}
      <div className="px-4 pt-4 pb-24 md:pb-8 md:px-6 md:pt-6 md:grid md:grid-cols-[340px_1fr] md:gap-6 md:items-start" style={{ backgroundColor: T.cream }}>

        {/* ── Título estilizado — solo mobile ── */}
        <div className="flex items-center gap-2 mb-4 md:hidden">
          <div style={{ width: '3px', height: '22px', backgroundColor: T.gold, borderRadius: '2px', flexShrink: 0 }} />
          <h1 className="text-xl font-bold tracking-tight" style={{ color: T.navy }}>
            {t('profile.title')}
          </h1>
        </div>

        {/* ── COLUMNA IZQUIERDA ── */}
        <div className="space-y-3">

          {/* Avatar card */}
          <div
            className="rounded-2xl p-5 shadow-sm"
            style={{ backgroundColor: T.white, border: `1px solid ${T.border}` }}
          >
            <div className="flex items-center gap-4">
              {/* Foto circular */}
              <div
                className="w-20 h-20 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center font-bold text-3xl"
                style={{
                  backgroundColor: T.gold,
                  color: T.navy,
                  border: `2px solid ${T.gold}`,
                  boxShadow: '0 2px 12px rgba(201,168,76,0.3)',
                }}
              >
                {profilePhoto ? (
                  <Image src={profilePhoto} alt={fullName || session.user.name || 'Profile'} width={80} height={80} className="object-cover w-full h-full" />
                ) : (
                  <span>{initials}</span>
                )}
              </div>
              {/* Nombre y email */}
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold truncate" style={{ color: T.navy }}>
                  {fullName || session.user.name}
                </h2>
                <p className="text-sm truncate" style={{ color: T.muted }}>{session.user.email}</p>
                <div className="mt-2">
                  <span
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold"
                    style={{
                      backgroundColor: session.user.plan === 'pro' ? T.goldPale : T.cream,
                      color: session.user.plan === 'pro' ? T.navy : T.muted,
                      border: `1px solid ${session.user.plan === 'pro' ? 'rgba(201,168,76,0.4)' : T.border}`,
                    }}
                  >
                    {session.user.plan === 'pro' && <span style={{ color: T.gold }}>✦</span>}
                    {session.user.plan === 'pro' ? t('profile.pro') : t('profile.free')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Vencimiento Pro */}
          {isPro && (
            <div
              className="rounded-2xl p-4 shadow-sm flex items-center gap-3"
              style={{ backgroundColor: T.goldPale, border: `1px solid rgba(201,168,76,0.35)` }}
            >
              <span style={{ color: T.gold, fontSize: '18px', flexShrink: 0 }}>✦</span>
              <div>
                <p className="text-xs font-semibold mb-0.5" style={{ color: T.muted }}>{t('profile.licenseExpires')}</p>
                <p className="text-sm font-bold" style={{ color: T.navy }}>
                  {new Date(session.user.expires_at!).toLocaleDateString(
                    session.user.language === 'en' ? 'en-US' : 'es-ES',
                    { day: 'numeric', month: 'long', year: 'numeric' }
                  )}
                </p>
              </div>
            </div>
          )}

          {/* Banner Free */}
          {isFree && (
            <div
              className="rounded-2xl p-5 shadow-sm"
              style={{ backgroundColor: T.navy }}
            >
              <div className="flex items-start gap-3 mb-4">
                <span className="text-2xl flex-shrink-0">🚀</span>
                <div>
                  <p className="font-bold text-white mb-1">
                    {session.user.language === 'en' ? 'You are on the Free plan' : 'Estás en el plan Free'}
                  </p>
                  <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
                    {session.user.language === 'en'
                      ? 'Upgrade to Pro and unlock 150 properties, Facebook publishing, AI translations and your logo on photos.'
                      : 'Pásate a Pro y desbloquea 150 propiedades, publicación en Facebook, traducciones con IA y tu logo en las fotos.'}
                  </p>
                </div>
              </div>
              <a
                href="/pro"
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-bold text-sm active:scale-95 transition-transform"
                style={{ background: `linear-gradient(135deg, ${T.gold} 0%, ${T.goldLight} 100%)`, color: T.navy }}
              >
                🚀 {session.user.language === 'en' ? 'See Pro plan · ~$28/mo' : 'Ver plan Pro · ₡14,803/mes'}
              </a>
            </div>
          )}

          {/* Plan + username stats */}
          <div
            className="rounded-2xl p-4 shadow-sm"
            style={{ backgroundColor: T.white, border: `1px solid ${T.border}` }}
          >
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: T.muted }}>{t('profile.yourPlan')}</p>
                <div
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl"
                  style={{
                    backgroundColor: session.user.plan === 'pro' ? T.navy : T.goldPale,
                    border: `1px solid ${session.user.plan === 'pro' ? 'rgba(201,168,76,0.2)' : 'rgba(201,168,76,0.35)'}`,
                  }}
                >
                  <span>{session.user.plan === 'pro' ? '⭐' : '🆓'}</span>
                  <div className="text-left">
                    <p className="text-sm font-bold" style={{ color: session.user.plan === 'pro' ? T.gold : T.navy }}>
                      {session.user.plan === 'pro' ? t('profile.pro') : t('profile.free')}
                    </p>
                    <p className="text-[10px]" style={{ color: session.user.plan === 'pro' ? 'rgba(255,255,255,0.5)' : T.muted }}>
                      {session.user.plan === 'pro' ? '150 props' : '5 props'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="text-center">
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: T.muted }}>{t('profile.username')}</p>
                <div
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl"
                  style={{
                    backgroundColor: username ? '#F0FDF4' : T.cream,
                    border: `1px solid ${username ? '#BBF7D0' : T.border}`,
                  }}
                >
                  <span style={{ fontSize: '18px' }}>{username ? '✓' : '○'}</span>
                  <p className="text-xs font-semibold" style={{ color: username ? '#15803D' : T.muted }}>
                    {username ? t('profile.configured') : t('profile.notConfigured')}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Logout — desktop en columna izquierda */}
          <button
            onClick={handleLogout}
            className="hidden md:flex w-full items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all active:scale-95 border-2"
            style={{ borderColor: '#DC2626', color: '#DC2626', backgroundColor: T.white }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            🚪 {t('profile.logout')}
          </button>

          <div className="hidden md:block text-center pb-2 opacity-40">
            <p className="text-xs" style={{ color: T.muted }}>{t('profile.version')}</p>
          </div>
        </div>

        {/* ── COLUMNA DERECHA — formulario ── */}
        <div className="space-y-4 mt-4 md:mt-0">
          <div
            className="rounded-2xl p-5 shadow-sm"
            style={{ backgroundColor: T.white, border: `1px solid ${T.border}` }}
          >
            {/* Título desktop */}
            <h3 className="font-bold text-base mb-5" style={{ color: T.navy }}>{t('profile.agentInfo')}</h3>

            <div className="space-y-4">

              {/* Username */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: T.muted }}>
                  {t('profile.uniqueUsername')}
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  placeholder="tu-username"
                  className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none transition-colors"
                  style={{ border: `1.5px solid ${T.border}`, backgroundColor: T.cream, color: T.charcoal }}
                />
                {username && (
                  <p className="text-xs mt-1.5" style={{ color: T.muted }}>
                    {t('profile.yourPortfolio')}: /agent/{username}
                  </p>
                )}
                <div className="mt-3 rounded-xl p-3" style={{ backgroundColor: '#FFF7ED', border: `1.5px solid #FED7AA` }}>
                  <div className="flex items-start gap-2">
                    <span className="text-base flex-shrink-0">⚠️</span>
                    <div>
                      <p className="text-xs font-bold mb-0.5" style={{ color: '#9A3412' }}>
                        {session.user.language === 'en' ? 'Important: choose it carefully' : 'Importante: elige bien tu username'}
                      </p>
                      <p className="text-xs leading-relaxed" style={{ color: '#92400E' }}>
                        {session.user.language === 'en'
                          ? 'Your username is the link you share with clients. Once set, changing it will break any links you have already shared.'
                          : 'Tu username es el link que compartes con tus clientes. Una vez configurado, cambiarlo romperá los links que ya hayas compartido.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Nombre completo */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: T.muted }}>
                  {t('profile.fullName')}
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Juan Pérez"
                  className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none transition-colors"
                  style={{ border: `1.5px solid ${T.border}`, backgroundColor: T.cream, color: T.charcoal }}
                />
              </div>

              {/* Teléfono 1 */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: T.muted }}>
                  {t('profile.phone1')}
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+506 1234-5678"
                  className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none transition-colors"
                  style={{ border: `1.5px solid ${T.border}`, backgroundColor: T.cream, color: T.charcoal }}
                />
              </div>

              {/* Teléfono 2 */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: T.muted }}>
                  {t('profile.phone2')}
                </label>
                <input
                  type="tel"
                  value={phone2}
                  onChange={(e) => setPhone2(e.target.value)}
                  placeholder="+506 8888-8888"
                  className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none transition-colors"
                  style={{ border: `1.5px solid ${T.border}`, backgroundColor: T.cream, color: T.charcoal }}
                />
              </div>

              {/* Agencia */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: T.muted }}>
                  {t('profile.brokerage')}
                </label>
                <input
                  type="text"
                  value={brokerage}
                  onChange={(e) => setBrokerage(e.target.value)}
                  placeholder="Century 21"
                  className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none transition-colors"
                  style={{ border: `1.5px solid ${T.border}`, backgroundColor: T.cream, color: T.charcoal }}
                />
              </div>

              {/* Botón guardar */}
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full py-3.5 rounded-xl font-bold text-sm shadow-sm active:scale-95 transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
                style={{
                  background: `linear-gradient(135deg, ${T.gold} 0%, ${T.goldLight} 100%)`,
                  color: T.navy,
                  boxShadow: '0 2px 8px rgba(201,168,76,0.3)',
                }}
              >
                {saving ? `⏳ ${t('profile.saving')}` : `💾 ${t('profile.saveChanges')}`}
              </button>
            </div>
          </div>

          {/* Logout — mobile al final */}
          <button
            onClick={handleLogout}
            className="md:hidden w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm transition-all active:scale-95 border-2"
            style={{ borderColor: '#DC2626', color: '#DC2626', backgroundColor: T.white }}
          >
            🚪 {t('profile.logout')}
          </button>

          <div className="md:hidden text-center py-2 opacity-40">
            <p className="text-xs" style={{ color: T.muted }}>{t('profile.version')}</p>
          </div>
        </div>

      </div>
    </AppLayout>
  );
}