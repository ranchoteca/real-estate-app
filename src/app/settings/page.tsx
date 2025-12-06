'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import MobileLayout from '@/components/MobileLayout';
import { useTranslation } from '@/hooks/useTranslation';
import { useI18nStore } from '@/lib/i18n-store';

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { t } = useTranslation();
  const { language, setLanguage } = useI18nStore();
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [savingLanguage, setSavingLanguage] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // Load user's preferred language from Supabase on mount
  useEffect(() => {
    if (session?.user?.email) {
      fetch('/api/user/language')
        .then(res => res.json())
        .then(data => {
          if (data.language && data.language !== language) {
            setLanguage(data.language);
          }
        })
        .catch(err => console.error('Error loading language:', err));
    }
  }, [session]);

  if (status === 'loading') {
    return (
      <MobileLayout title={t('settings.title')} showTabs={true}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center py-12">
            <div className="text-5xl mb-4 animate-pulse">⚙️</div>
            <div className="text-lg" style={{ color: '#0F172A' }}>
              {t('common.loading')}
            </div>
          </div>
        </div>
      </MobileLayout>
    );
  }

  if (!session) {
    return null;
  }

  const settingsOptions = [
    {
      icon: '🌐',
      title: t('settings.options.language.title'),
      description: t('settings.options.language.description'),
      action: 'language',
      color: '#10B981',
    },
    {
      icon: '💰',
      title: t('settings.options.currency.title'),
      description: t('settings.options.currency.description'),
      href: '/settings/currency',
      color: '#F59E0B',
    },
    {
      icon: '🎨',
      title: t('settings.options.watermark.title'),
      description: t('settings.options.watermark.description'),
      href: '/settings/watermark',
      color: '#8B5CF6',
    },
    {
      icon: '📇',
      title: t('settings.options.digitalCard.title'),
      description: t('settings.options.digitalCard.description'),
      href: '/settings/digital-card',
      color: '#6366F1',
    },
    {
      icon: '🏷️',
      title: t('settings.options.customFields.title'),
      description: t('settings.options.customFields.description'),
      href: '/settings/custom-fields',
      color: '#2563EB',
    },
    {
      icon: '📘',
      title: t('settings.options.facebook.title'),
      description: t('settings.options.facebook.description'),
      href: '/settings/facebook',
      color: '#1877F2',
    },
    {
      icon: '🔗',
      title: t('settings.options.portfolio.title'),
      description: t('settings.options.portfolio.description'),
      href: session.user.username ? `/agent/${session.user.username}` : '/profile',
      color: '#10B981',
      disabled: !session.user.username,
    },
    {
      icon: '📥',
      title: t('settings.options.export.title'),
      description: t('settings.options.export.description'),
      action: 'export',
      color: '#F59E0B',
    }
  ];

  const handleExport = async () => {
    try {
      const response = await fetch('/api/agent/export-csv');
      if (!response.ok) throw new Error('Error al exportar');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mis-propiedades-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      alert(t('settings.alerts.exportSuccess'));
    } catch (error) {
      alert(t('settings.alerts.exportError'));
    }
  };

  const handleLanguageChange = async (newLang: 'es' | 'en') => {
    setSavingLanguage(true);
    try {
      // Update locally first for instant feedback
      setLanguage(newLang);
      
      // Save to Supabase
      const response = await fetch('/api/user/language', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: newLang }),
      });

      if (!response.ok) throw new Error('Failed to save language');
      
      setShowLanguageModal(false);
      alert(t('settings.options.language.saved'));
    } catch (error) {
      console.error('Error saving language:', error);
      alert(t('common.error'));
    } finally {
      setSavingLanguage(false);
    }
  };

  const handleOptionClick = (option: typeof settingsOptions[0]) => {
    if (option.action === 'export') {
      handleExport();
    } else if (option.action === 'language') {
      setShowLanguageModal(true);
    } else if (option.href) {
      if (option.disabled) {
        alert(t('settings.alerts.configureUsername'));
      } else {
        router.push(option.href);
      }
    }
  };

  return (
    <MobileLayout title={t('settings.title')} showTabs={true}>
      <div className="px-4 pt-4 pb-6 space-y-4">
        {/* Header Info */}
        <div 
          className="rounded-2xl p-5 shadow-lg"
          style={{ backgroundColor: '#FFFFFF' }}
        >
          <div className="flex items-center gap-4">
            <div 
              className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white shadow-lg"
              style={{ backgroundColor: '#2563EB' }}
            >
              {session.user.name?.charAt(0).toUpperCase() || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold truncate" style={{ color: '#0F172A' }}>
                {session.user.name || 'Usuario'}
              </h2>
              <p className="text-sm opacity-70 truncate" style={{ color: '#0F172A' }}>
                {session.user.email}
              </p>
              <div className="mt-2">
                <span 
                  className="inline-block px-3 py-1 rounded-full text-xs font-bold text-white"
                  style={{ backgroundColor: session.user.plan === 'pro' ? '#10B981' : '#6B7280' }}
                >
                  {session.user.plan === 'pro' 
                    ? t('settings.userInfo.planPro')
                    : t('settings.userInfo.planFree')
                  }
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Settings Options */}
        <div className="space-y-3">
          {settingsOptions.map((option, index) => (
            <button
              key={index}
              onClick={() => handleOptionClick(option)}
              className="w-full rounded-2xl p-5 shadow-lg active:scale-98 transition-transform disabled:opacity-50"
              style={{ backgroundColor: '#FFFFFF' }}
              disabled={option.disabled}
            >
              <div className="flex items-center gap-4">
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-sm"
                  style={{ backgroundColor: `${option.color}20` }}
                >
                  {option.icon}
                </div>
                <div className="flex-1 text-left">
                  <h3 className="font-bold mb-0.5" style={{ color: '#0F172A' }}>
                    {option.title}
                    {option.disabled && (
                      <span className="text-xs ml-2 opacity-50">
                        {t('settings.options.portfolio.requireUsername')}
                      </span>
                    )}
                  </h3>
                  <p className="text-sm opacity-70" style={{ color: '#0F172A' }}>
                    {option.description}
                  </p>
                </div>
                <svg 
                  className="w-6 h-6 opacity-50" 
                  fill="none" 
                  stroke="#0F172A" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M9 5l7 7-7 7" 
                  />
                </svg>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Language Selection Modal */}
      {showLanguageModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => !savingLanguage && setShowLanguageModal(false)}
        >
          <div 
            className="rounded-2xl p-6 max-w-sm w-full shadow-xl"
            style={{ backgroundColor: '#FFFFFF' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold mb-4" style={{ color: '#0F172A' }}>
              {t('settings.options.language.selectTitle')}
            </h3>
            
            <div className="space-y-3">
              <button
                onClick={() => handleLanguageChange('es')}
                disabled={savingLanguage}
                className="w-full p-4 rounded-xl border-2 transition-all disabled:opacity-50"
                style={{
                  borderColor: language === 'es' ? '#10B981' : '#E5E7EB',
                  backgroundColor: language === 'es' ? '#10B98110' : '#FFFFFF',
                }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🇪🇸</span>
                  <div className="flex-1 text-left">
                    <div className="font-bold" style={{ color: '#0F172A' }}>
                      Español
                    </div>
                  </div>
                  {language === 'es' && (
                    <svg className="w-6 h-6" fill="#10B981" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              </button>

              <button
                onClick={() => handleLanguageChange('en')}
                disabled={savingLanguage}
                className="w-full p-4 rounded-xl border-2 transition-all disabled:opacity-50"
                style={{
                  borderColor: language === 'en' ? '#10B981' : '#E5E7EB',
                  backgroundColor: language === 'en' ? '#10B98110' : '#FFFFFF',
                }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🇺🇸</span>
                  <div className="flex-1 text-left">
                    <div className="font-bold" style={{ color: '#0F172A' }}>
                      English
                    </div>
                  </div>
                  {language === 'en' && (
                    <svg className="w-6 h-6" fill="#10B981" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              </button>
            </div>

            {savingLanguage && (
              <div className="mt-4 text-center text-sm" style={{ color: '#6B7280' }}>
                {t('common.loading')}
              </div>
            )}
          </div>
        </div>
      )}
    </MobileLayout>
  );
}