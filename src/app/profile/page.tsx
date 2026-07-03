'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import Image from 'next/image';
import { useTranslation } from '@/hooks/useTranslation';

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
        .then(data => {
          if (data?.card?.profile_photo) setProfilePhoto(data.card.profile_photo);
        })
        .catch(() => {});
    }
  }, [session?.user?.username]);

  if (status === 'loading') {
    return (
      <AppLayout title={t('profile.title')} showTabs={true}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center py-12">
            <div className="text-5xl mb-4 animate-pulse">👤</div>
            <div className="text-lg" style={{ color: '#0F172A' }}>{t('profile.loading')}</div>
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

  return (
    <AppLayout title={t('profile.title')} showTabs={true}>
      {/*
        mobile:  1 columna, space-y-4 — idéntico al original
        tablet+: 2 columnas — izquierda: avatar + plan + stats
                              derecha: formulario + logout
      */}
      <div className="px-4 pt-4 pb-6 md:px-6 md:pt-6 md:pb-8 md:grid md:grid-cols-[340px_1fr] md:gap-6 md:items-start">

        {/* ── COLUMNA IZQUIERDA ─────────────────────────────────── */}
        <div className="space-y-4">

          {/* Avatar y datos básicos */}
          <div className="rounded-2xl p-6 text-center shadow-lg" style={{ backgroundColor: '#FFFFFF' }}>
            <div className="w-24 h-24 rounded-full mx-auto mb-4 flex items-center justify-center text-4xl shadow-lg overflow-hidden" style={{ backgroundColor: '#2563EB' }}>
              {profilePhoto ? (
                <Image src={profilePhoto} alt={session?.user?.name || 'Profile'} width={96} height={96} className="object-cover w-full h-full" />
              ) : (
                <span className="text-white font-bold">{session?.user?.name?.charAt(0).toUpperCase() || '?'}</span>
              )}
            </div>
            <h2 className="text-2xl font-bold mb-1" style={{ color: '#0F172A' }}>{session.user.name}</h2>
            <p className="text-sm opacity-70" style={{ color: '#0F172A' }}>{session.user.email}</p>
          </div>

          {/* Licencia Pro */}
          {isPro && (
            <div className="rounded-2xl p-4 shadow-lg flex items-center gap-3" style={{ backgroundColor: '#F0FDF4', border: '1.5px solid #BBF7D0' }}>
              <span className="text-2xl">⭐</span>
              <div>
                <p className="text-xs font-semibold opacity-70 mb-0.5" style={{ color: '#166534' }}>{t('profile.licenseExpires')}</p>
                <p className="text-sm font-bold" style={{ color: '#15803D' }}>
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
            <div className="rounded-2xl p-5 shadow-lg" style={{ backgroundColor: '#0F172A' }}>
              <div className="flex items-start gap-3 mb-4">
                <span className="text-2xl flex-shrink-0">🚀</span>
                <div>
                  <p className="font-bold text-white mb-1">
                    {session.user.language === 'en' ? 'You are on the Free plan' : 'Estás en el plan Free'}
                  </p>
                  <p className="text-xs" style={{ color: '#94A3B8' }}>
                    {session.user.language === 'en'
                      ? 'Upgrade to Pro and unlock 150 properties, Facebook publishing, AI translations and your custom logo on photos.'
                      : 'Pásate a Pro y desbloquea 150 propiedades, publicación en Facebook, traducciones con IA y tu logo en las fotos.'}
                  </p>
                </div>
              </div>
              <a
                href="/pro"
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-bold text-white active:scale-95 transition-transform text-sm"
                style={{ backgroundColor: '#2563EB' }}
              >
                🚀 {session.user.language === 'en' ? 'See Pro plan · ₡14,803/mo' : 'Ver plan Pro · ₡14,803/mes'}
              </a>
            </div>
          )}

          {/* Stats de plan y username */}
          <div className="rounded-2xl p-5 shadow-lg" style={{ backgroundColor: '#FFFFFF' }}>
            <div className="grid grid-cols-3 gap-4 items-center">
              <div className="text-center">
                <p className="text-xs font-semibold mb-3 opacity-70" style={{ color: '#0F172A' }}>{t('profile.yourPlan')}</p>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl" style={{ backgroundColor: session.user.plan === 'pro' ? '#2563EB' : '#F5EAD3' }}>
                  <span className="text-2xl">{session.user.plan === 'pro' ? '⭐' : '🆓'}</span>
                  <div className="text-left">
                    <p className="text-lg font-bold" style={{ color: session.user.plan === 'pro' ? '#FFFFFF' : '#0F172A' }}>
                      {session.user.plan === 'pro' ? t('profile.pro') : t('profile.free')}
                    </p>
                    <p className="text-xs opacity-80" style={{ color: session.user.plan === 'pro' ? '#FFFFFF' : '#0F172A' }}>
                      {session.user.plan === 'pro' ? '150 props' : '5 props'}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex justify-center">
                <div className="w-px h-16" style={{ backgroundColor: '#E5E7EB' }} />
              </div>
              <div className="text-center">
                <p className="text-xs font-semibold mb-3 opacity-70" style={{ color: '#0F172A' }}>{t('profile.username')}</p>
                <p className="text-4xl font-bold mb-2" style={{ color: '#2563EB' }}>{username ? '✓' : '○'}</p>
                <p className="text-xs opacity-70" style={{ color: '#0F172A' }}>
                  {username ? t('profile.configured') : t('profile.notConfigured')}
                </p>
              </div>
            </div>
          </div>

          {/* Logout — solo visible en desktop en la columna izquierda */}
          <button
            onClick={handleLogout}
            className="hidden md:block w-full py-3 rounded-xl font-bold shadow-lg active:scale-95 transition-transform border-2"
            style={{ borderColor: '#DC2626', color: '#DC2626', backgroundColor: '#FFFFFF' }}
          >
            🚪 {t('profile.logout')}
          </button>

          <div className="hidden md:block text-center pt-2 pb-4 opacity-50">
            <p className="text-xs" style={{ color: '#0F172A' }}>{t('profile.version')}</p>
          </div>
        </div>

        {/* ── COLUMNA DERECHA (formulario) ──────────────────────── */}
        <div className="space-y-4 mt-4 md:mt-0">
          <div className="rounded-2xl p-5 shadow-lg" style={{ backgroundColor: '#FFFFFF' }}>
            <h3 className="font-bold mb-4 text-lg" style={{ color: '#0F172A' }}>{t('profile.agentInfo')}</h3>

            <div className="space-y-4">

              {/* Username */}
              <div>
                <label className="block text-sm font-bold mb-2" style={{ color: '#0F172A' }}>
                  {t('profile.uniqueUsername')}
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  placeholder="tu-username"
                  className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none transition-colors"
                  style={{ borderColor: '#E5E7EB', backgroundColor: '#F9FAFB', color: '#0F172A' }}
                />
                {username && (
                  <p className="text-xs mt-1 opacity-60" style={{ color: '#0F172A' }}>
                    {t('profile.yourPortfolio')}: /agent/{username}
                  </p>
                )}
                <div className="mt-3 rounded-xl p-4" style={{ backgroundColor: '#FFF7ED', border: '1.5px solid #FED7AA' }}>
                  <div className="flex items-start gap-2">
                    <span className="text-lg flex-shrink-0">⚠️</span>
                    <div>
                      <p className="text-xs font-bold mb-1" style={{ color: '#9A3412' }}>
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

              <div>
                <label className="block text-sm font-bold mb-2" style={{ color: '#0F172A' }}>{t('profile.fullName')}</label>
                <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Juan Pérez" className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none transition-colors" style={{ borderColor: '#E5E7EB', backgroundColor: '#F9FAFB', color: '#0F172A' }} />
              </div>

              <div>
                <label className="block text-sm font-bold mb-2" style={{ color: '#0F172A' }}>{t('profile.phone1')}</label>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+506 1234-5678" className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none transition-colors" style={{ borderColor: '#E5E7EB', backgroundColor: '#F9FAFB', color: '#0F172A' }} />
              </div>

              <div>
                <label className="block text-sm font-bold mb-2" style={{ color: '#0F172A' }}>{t('profile.phone2')}</label>
                <input type="tel" value={phone2} onChange={(e) => setPhone2(e.target.value)} placeholder="+506 8888-8888" className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none transition-colors" style={{ borderColor: '#E5E7EB', backgroundColor: '#F9FAFB', color: '#0F172A' }} />
              </div>

              <div>
                <label className="block text-sm font-bold mb-2" style={{ color: '#0F172A' }}>{t('profile.brokerage')}</label>
                <input type="text" value={brokerage} onChange={(e) => setBrokerage(e.target.value)} placeholder="Century 21" className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none transition-colors" style={{ borderColor: '#E5E7EB', backgroundColor: '#F9FAFB', color: '#0F172A' }} />
              </div>

              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full py-3 rounded-xl font-bold text-white shadow-lg active:scale-95 transition-transform disabled:opacity-50"
                style={{ backgroundColor: '#2563EB' }}
              >
                {saving ? t('profile.saving') : `💾 ${t('profile.saveChanges')}`}
              </button>
            </div>
          </div>

          {/* Logout — solo visible en mobile en la columna derecha */}
          <button
            onClick={handleLogout}
            className="md:hidden w-full py-3 rounded-xl font-bold shadow-lg active:scale-95 transition-transform border-2"
            style={{ borderColor: '#DC2626', color: '#DC2626', backgroundColor: '#FFFFFF' }}
          >
            🚪 {t('profile.logout')}
          </button>

          <div className="md:hidden text-center pt-6 pb-4 opacity-50">
            <p className="text-xs" style={{ color: '#0F172A' }}>{t('profile.version')}</p>
          </div>
        </div>

      </div>
    </AppLayout>
  );
}