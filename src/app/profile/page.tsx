'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import MobileLayout from '@/components/MobileLayout';
import Image from 'next/image';
import { useTranslation } from '@/hooks/useTranslation';

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { t } = useTranslation();
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [brokerage, setBrokerage] = useState('');
  const [saving, setSaving] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user) {
      setUsername(session.user.username || '');
      setFullName(session.user.fullName || session.user.name || '');
      setPhone(session.user.phone || '');
      setBrokerage(session.user.brokerage || '');
    }
  }, [session]);

  useEffect(() => {
    if (session?.user?.username) {
      fetch(`/api/agent-card/get?username=${session.user.username}`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data?.card?.profile_photo) {
            setProfilePhoto(data.card.profile_photo);
          }
        })
        .catch(() => {});
    }
  }, [session?.user?.username]);

  if (status === 'loading') {
    return (
      <MobileLayout title={t('profile.title')} showTabs={true}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center py-12">
            <div className="text-5xl mb-4 animate-pulse">👤</div>
            <div className="text-lg" style={{ color: '#0F172A' }}>
              {t('profile.loading')}
            </div>
          </div>
        </div>
      </MobileLayout>
    );
  }

  if (!session) {
    return null;
  }

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/agent/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          fullName,
          phone,
          brokerage,
        }),
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
    if (confirm(t('profile.confirmLogout'))) {
      signOut({ callbackUrl: '/login' });
    }
  };

  return (
    <MobileLayout title={t('profile.title')} showTabs={true}>
      <div className="px-4 pt-4 pb-6 space-y-4">
        <div 
          className="rounded-2xl p-6 text-center shadow-lg"
          style={{ backgroundColor: '#FFFFFF' }}
        >
           <div 
              className="w-24 h-24 rounded-full mx-auto mb-4 flex items-center justify-center text-4xl shadow-lg overflow-hidden"
              style={{ backgroundColor: '#2563EB' }}
            >
              {profilePhoto ? (
                <Image
                  src={profilePhoto}
                  alt={session?.user?.name || 'Profile'}
                  width={96}
                  height={96}
                  className="object-cover w-full h-full"
                  unoptimized
                />
              ) : (
                <span className="text-white font-bold">
                  {session?.user?.name?.charAt(0).toUpperCase() || '?'}
                </span>
              )}
            </div>
          <h2 className="text-2xl font-bold mb-1" style={{ color: '#0F172A' }}>
            {session.user.name}
          </h2>
          <p className="text-sm opacity-70" style={{ color: '#0F172A' }}>
            {session.user.email}
          </p>
        </div>

        <div 
          className="rounded-2xl p-5 shadow-lg"
          style={{ backgroundColor: '#FFFFFF' }}
        >
          <div className="grid grid-cols-3 gap-4 items-center">
            <div className="text-center">
              <p className="text-xs font-semibold mb-3 opacity-70" style={{ color: '#0F172A' }}>
                {t('profile.yourPlan')}
              </p>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl" style={{ backgroundColor: session.user.plan === 'pro' ? '#2563EB' : '#F5EAD3' }}>
                <span className="text-2xl">{session.user.plan === 'pro' ? '⭐' : '🆓'}</span>
                <div className="text-left">
                  <p className="text-lg font-bold" style={{ color: session.user.plan === 'pro' ? '#FFFFFF' : '#0F172A' }}>
                    {session.user.plan === 'pro' ? t('profile.pro') : t('profile.free')}
                  </p>
                  <p className="text-xs opacity-80" style={{ color: session.user.plan === 'pro' ? '#FFFFFF' : '#0F172A' }}>
                    {session.user.plan === 'pro' ? t('profile.perMonth') : t('profile.total')}
                  </p>
                </div>
              </div>
              {session.user.plan === 'pro' && (
                <p className="text-xs mt-2 opacity-70" style={{ color: '#0F172A' }}>
                  {session.user.properties_this_month}/30 {t('profile.thisMonth')}
                </p>
              )}
            </div>

            <div className="flex justify-center">
              <div className="w-px h-16" style={{ backgroundColor: '#E5E7EB' }} />
            </div>

            <div className="text-center">
              <p className="text-xs font-semibold mb-3 opacity-70" style={{ color: '#0F172A' }}>
                {t('profile.username')}
              </p>
              <p className="text-4xl font-bold mb-2" style={{ color: '#2563EB' }}>
                {username ? '✓' : '○'}
              </p>
              <p className="text-xs opacity-70" style={{ color: '#0F172A' }}>
                {username ? t('profile.configured') : t('profile.notConfigured')}
              </p>
            </div>
          </div>
        </div>

        <div 
          className="rounded-2xl p-5 shadow-lg"
          style={{ backgroundColor: '#FFFFFF' }}
        >
          <h3 className="font-bold mb-4 text-lg" style={{ color: '#0F172A' }}>
            {t('profile.agentInfo')}
          </h3>

          <div className="space-y-4">
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
                style={{ 
                  borderColor: '#E5E7EB',
                  backgroundColor: '#F9FAFB',
                  color: '#0F172A'
                }}
              />
              <p className="text-xs mt-1 opacity-70" style={{ color: '#0F172A' }}>
                {username && `${t('profile.yourPortfolio')}: /agent/${username}`}
              </p>
            </div>

            <div>
              <label className="block text-sm font-bold mb-2" style={{ color: '#0F172A' }}>
                {t('profile.fullName')}
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Juan Pérez"
                className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none transition-colors"
                style={{ 
                  borderColor: '#E5E7EB',
                  backgroundColor: '#F9FAFB',
                  color: '#0F172A'
                }}
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-2" style={{ color: '#0F172A' }}>
                {t('profile.phone')}
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+506 1234-5678"
                className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none transition-colors"
                style={{ 
                  borderColor: '#E5E7EB',
                  backgroundColor: '#F9FAFB',
                  color: '#0F172A'
                }}
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-2" style={{ color: '#0F172A' }}>
                {t('profile.brokerage')}
              </label>
              <input
                type="text"
                value={brokerage}
                onChange={(e) => setBrokerage(e.target.value)}
                placeholder="Century 21"
                className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none transition-colors"
                style={{ 
                  borderColor: '#E5E7EB',
                  backgroundColor: '#F9FAFB',
                  color: '#0F172A'
                }}
              />
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

        {/* 
        <div className="space-y-3">
          {session.user.plan === 'free' && (
            <button
              onClick={() => router.push('/pricing')}
              className="w-full py-3 rounded-xl font-bold shadow-lg active-scale-95 transition-transform flex items-center justify-center gap-2 text-white"
              style={{ backgroundColor: '#2563EB' }}
            >
              <span>⭐</span> {t('profile.upgradeToPro')}
            </button>
          )}
        </div>
        */}

        <button
          onClick={handleLogout}
          className="w-full py-3 rounded-xl font-bold shadow-lg active:scale-95 transition-transform border-2"
          style={{ 
            borderColor: '#DC2626',
            color: '#DC2626',
            backgroundColor: '#FFFFFF'
          }}
        >
          🚪 {t('profile.logout')}
        </button>

        <div className="text-center pt-6 pb-4 opacity-50">
          <p className="text-xs" style={{ color: '#0F172A' }}>
            {t('profile.version')}
          </p>
        </div>
      </div>
    </MobileLayout>
  );
}