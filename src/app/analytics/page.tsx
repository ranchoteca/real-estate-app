'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { useTranslation } from '@/hooks/useTranslation';
import { useI18nStore } from '@/lib/i18n-store';

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

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { t } = useTranslation();
  const { language, setLanguage } = useI18nStore();

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status, router]);

  useEffect(() => {
    if (session?.user?.email) {
      fetch('/api/user/language')
        .then(res => res.json())
        .then(data => { if (data.language && data.language !== language) setLanguage(data.language); })
        .catch(err => console.error('Error loading language:', err));
    }
  }, [session]);

  if (status === 'loading') {
    return (
      <AppLayout title={t('settings.title')} showTabs={true}>
        <div className="flex items-center justify-center h-full" style={{ backgroundColor: T.cream }}>
          <div className="text-center py-12">
            <div className="text-5xl mb-4 animate-pulse">⚙️</div>
            <div className="text-base font-medium" style={{ color: T.muted }}>{t('common.loading')}</div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!session) return null;

  const settingsOptions = [
    {
      icon: '🌐',
      title: t('settings.options.language.title'),
      description: t('settings.options.language.description'),
      href: '/settings/language',
      color: '#15803D',
      colorBg: '#F0FDF4',
    },
    {
      icon: '💰',
      title: t('settings.options.currency.title'),
      description: t('settings.options.currency.description'),
      href: '/settings/currency',
      color: '#B45309',
      colorBg: '#FFFBEB',
    },
    {
      icon: '🎨',
      title: t('settings.options.watermark.title'),
      description: t('settings.options.watermark.description'),
      href: '/settings/watermark',
      color: T.navy,
      colorBg: T.goldPale,
      proOnly: true,
    },
    {
      icon: '🖼️',
      title: language === 'en' ? 'Portfolio Template' : 'Plantilla del Portafolio',
      description: language === 'en' ? 'Choose the visual style for your portfolio' : 'Elige el estilo visual de tu portafolio',
      href: '/settings/portfolio-template',
      color: T.navy,
      colorBg: T.goldPale,
    },
    {
      icon: '📇',
      title: t('settings.options.digitalCard.title'),
      description: t('settings.options.digitalCard.description'),
      href: '/settings/digital-card',
      color: '#6D28D9',
      colorBg: '#F5F3FF',
    },
    {
      icon: '🏷️',
      title: t('settings.options.customFields.title'),
      description: t('settings.options.customFields.description'),
      href: '/settings/custom-fields',
      color: T.navy,
      colorBg: '#EEF2FF',
      proOnly: true,
    },
    {
      icon: '📘',
      title: t('settings.options.facebook.title'),
      description: t('settings.options.facebook.description'),
      href: '/settings/facebook',
      color: '#1877F2',
      colorBg: '#EFF6FF',
      proOnly: true,
    },
    {
      icon: '🔑',
      title: t('settings.options.uploadToken.title'),
      description: t('settings.options.uploadToken.description'),
      href: '/settings/upload-token',
      color: '#6D28D9',
      colorBg: '#F5F3FF',
      proOnly: true,
    },
    {
      icon: '🔗',
      title: t('settings.options.portfolio.title'),
      description: t('settings.options.portfolio.description'),
      href: session.user.username ? `/agent/${session.user.username}` : '/profile',
      color: '#15803D',
      colorBg: '#F0FDF4',
      disabled: !session.user.username,
    },
    {
      id: 'flowia',
      icon: '🤖',
      title: language === 'en' ? 'FlowIA Assistant' : 'Asistente FlowIA',
      description: language === 'en' ? 'Configure your WhatsApp bot' : 'Configura tu bot de WhatsApp',
      href: '/settings/flowia',
      color: '#15803D',
      colorBg: '#F0FDF4',
      proOnly: true,
    },
    {
      icon: '📥',
      title: t('settings.options.export.title'),
      description: t('settings.options.export.description'),
      action: 'export',
      color: '#B45309',
      colorBg: '#FFFBEB',
    },
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

  const isProUser = session.user.plan === 'pro' || session.user.role === 'admin';

  const handleOptionClick = (option: typeof settingsOptions[0]) => {
    if (option.proOnly && !isProUser) return;
    if (option.action === 'export') {
      handleExport();
    } else if (option.href) {
      if (option.disabled) {
        alert(t('settings.alerts.configureUsername'));
      } else {
        router.push(option.href);
      }
    }
  };

  return (
    <AppLayout title={t('settings.title')} showTabs={true}>
      <div
        className="px-4 pt-4 pb-24 md:pb-10 md:px-8 md:pt-8 md:max-w-2xl md:mx-auto lg:max-w-4xl"
        style={{ backgroundColor: T.cream }}
      >

        {/* Título estilizado — solo mobile */}
        <div className="flex items-center gap-2 mb-4 md:hidden">
          <div style={{ width: '3px', height: '22px', backgroundColor: T.gold, borderRadius: '2px', flexShrink: 0 }} />
          <h1 className="text-xl font-bold tracking-tight" style={{ color: T.navy }}>
            {t('settings.title')}
          </h1>
        </div>

        {/* Header card — avatar + nombre + plan */}
        <div
          className="rounded-2xl p-4 mb-4 shadow-sm"
          style={{ backgroundColor: T.white, border: `1px solid ${T.border}` }}
        >
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold flex-shrink-0"
              style={{
                background: `linear-gradient(135deg, ${T.gold} 0%, ${T.goldLight} 100%)`,
                color: T.navy,
                boxShadow: '0 2px 8px rgba(201,168,76,0.3)',
              }}
            >
              {session.user.name?.charAt(0).toUpperCase() || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-bold truncate" style={{ color: T.navy }}>
                {session.user.name || 'Usuario'}
              </h2>
              <p className="text-xs truncate mb-1.5" style={{ color: T.muted }}>
                {session.user.email}
              </p>
              <span
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold"
                style={{
                  backgroundColor: session.user.plan === 'pro' ? T.goldPale : T.cream,
                  color: session.user.plan === 'pro' ? T.navy : T.muted,
                  border: `1px solid ${session.user.plan === 'pro' ? 'rgba(201,168,76,0.4)' : T.border}`,
                }}
              >
                {session.user.plan === 'pro' && <span style={{ color: T.gold }}>✦</span>}
                {session.user.plan === 'pro'
                  ? t('settings.userInfo.planPro')
                  : t('settings.userInfo.planFree')}
              </span>
            </div>
          </div>
        </div>

        {/* Opciones:
            mobile + tablet: 1 columna
            desktop:         2 columnas
        */}
        <div className="space-y-2 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-3">
          {settingsOptions.map((option, index) => {
            const locked = !!(option.proOnly && !isProUser);
            return (
              <button
                key={index}
                onClick={() => handleOptionClick(option)}
                className="w-full rounded-xl p-4 shadow-sm text-left transition-all active:scale-[0.98]"
                style={{
                  backgroundColor: T.white,
                  border: `1px solid ${T.border}`,
                  opacity: locked ? 0.45 : 1,
                  cursor: locked ? 'default' : 'pointer',
                  boxShadow: '0 1px 4px rgba(27,45,91,0.05)',
                }}
                disabled={!!option.disabled && !option.proOnly}
              >
                <div className="flex items-center gap-3">
                  {/* Ícono con color propio */}
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                    style={{ backgroundColor: locked ? T.cream : option.colorBg }}
                  >
                    {option.icon}
                  </div>

                  {/* Texto */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-bold" style={{ color: T.navy }}>
                        {option.title}
                      </h3>
                      {option.proOnly && !isProUser && (
                        <span
                          className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                          style={{ backgroundColor: T.goldPale, color: T.navy }}
                        >
                          Pro
                        </span>
                      )}
                      {option.disabled && (
                        <span className="text-[9px] opacity-50" style={{ color: T.muted }}>
                          {t('settings.options.portfolio.requireUsername')}
                        </span>
                      )}
                    </div>
                    <p className="text-xs mt-0.5 line-clamp-1" style={{ color: T.muted }}>
                      {option.description}
                    </p>
                  </div>

                  {/* Chevron */}
                  <svg
                    className="w-4 h-4 flex-shrink-0 opacity-30"
                    fill="none"
                    stroke={T.navy}
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}