'use client';

import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { ReactNode } from 'react';
import { useTranslation } from '@/hooks/useTranslation';

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
  showBack?: boolean;
  showTabs?: boolean;
  currentPropertyCount?: number;
  onCreateLimitReached?: () => void;
}

const NAV_ITEMS = [
  { path: '/dashboard', labelKey: 'inicio', icon: '🏘️' },
  { path: '/analytics', labelKey: 'analiticas', icon: '📊' },
  { path: '/settings', labelKey: 'ajustes', icon: '⚙️' },
  { path: '/profile', labelKey: 'perfil', icon: '👤' },
] as const;

export default function AppLayout({
  children,
  title,
  showBack = false,
  showTabs = true,
  currentPropertyCount,
  onCreateLimitReached,
}: AppLayoutProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useTranslation();

  const isActive = (path: string) => pathname === path;

  const handleCreateClick = () => {
    const isFreeAndAtLimit =
      session?.user?.plan === 'free' &&
      (currentPropertyCount !== undefined
        ? currentPropertyCount >= 5
        : (session?.user?.totalProperties || 0) >= 5);

    if (isFreeAndAtLimit) {
      onCreateLimitReached?.();
    } else {
      router.push('/create-property');
    }
  };

  return (
    <div className="app-shell" style={{ backgroundColor: '#F5EAD3' }}>
      {/* ════════════════════════════════════════════════════════════════
          MOBILE SHELL (< 768px)
         ════════════════════════════════════════════════════════════════ */}
      <div className="shell-mobile flex flex-col h-screen">
        <header className="flex-shrink-0 shadow-lg relative z-50" style={{ backgroundColor: '#0F172A' }}>
          <div className="safe-top">
            <div className="flex items-center justify-between h-14 px-4">
              <div className="flex items-center gap-3 min-w-0">
                {showBack ? (
                  <button onClick={() => router.back()} className="text-white p-2 -ml-2 active:opacity-70 transition-opacity">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                ) : (
                  <span className="text-2xl">🏠</span>
                )}
                {title && <h1 className="text-lg font-bold text-white truncate">{title}</h1>}
              </div>

              <div className="flex items-center gap-3">
                {session && (
                  <>
                    <div className="px-3 py-1.5 rounded-full text-sm font-semibold text-white" style={{ backgroundColor: '#2563EB' }}>
                      {session.user.plan === 'pro' ? t('mobileLayout.pro') : t('mobileLayout.free')}
                    </div>
                    {session.user.plan === 'free' && (
                      <button onClick={() => router.push('/pricing')} className="text-white text-sm font-semibold hover:opacity-80 transition-opacity">
                        {t('mobileLayout.upgrade')}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto overscroll-contain">
          <div className="pb-28">{children}</div>
        </main>

        {showTabs && session && (
          <nav className="fixed bottom-0 left-0 right-0 border-t safe-bottom shadow-2xl z-50" style={{ backgroundColor: '#FFFFFF', borderTopColor: '#E5E7EB' }}>
            <div className="flex justify-around items-center h-16">
              <button
                onClick={() => router.push('/dashboard')}
                className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 transition-all active:scale-95 ${isActive('/dashboard') ? 'opacity-100' : 'opacity-50'}`}
              >
                <svg className="w-6 h-6" fill={isActive('/dashboard') ? '#2563EB' : '#0F172A'} viewBox="0 0 24 24">
                  <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
                </svg>
                <span className="text-xs font-semibold" style={{ color: isActive('/dashboard') ? '#2563EB' : '#0F172A' }}>
                  {t('mobileLayout.inicio')}
                </span>
              </button>

              <button
                onClick={() => router.push('/analytics')}
                className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 transition-all active:scale-95 ${pathname === '/analytics' ? '' : 'opacity-50'}`}
              >
                <svg className="w-6 h-6" fill={pathname === '/analytics' ? '#2563EB' : '#0F172A'} viewBox="0 0 24 24">
                  <path d="M3 13h2v8H3v-8zm4-6h2v14H7V7zm4-4h2v18h-2V3zm4 9h2v9h-2v-9zm4-3h2v12h-2V9z" />
                </svg>
                <span className="text-xs font-semibold" style={{ color: pathname === '/analytics' ? '#2563EB' : '#0F172A' }}>
                  {t('mobileLayout.analiticas')}
                </span>
              </button>

              <button onClick={handleCreateClick} className="flex-1 flex flex-col items-center justify-center transition-all active:scale-95">
                <div className="w-14 h-14 rounded-full shadow-2xl flex items-center justify-center" style={{ backgroundColor: '#2563EB' }}>
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
              </button>

              <button
                onClick={() => router.push('/settings')}
                className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 transition-all active:scale-95 ${isActive('/settings') ? 'opacity-100' : 'opacity-50'}`}
              >
                <svg className="w-6 h-6" fill={isActive('/settings') ? '#2563EB' : '#0F172A'} viewBox="0 0 24 24">
                  <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
                </svg>
                <span className="text-xs font-semibold" style={{ color: isActive('/settings') ? '#2563EB' : '#0F172A' }}>
                  {t('mobileLayout.ajustes')}
                </span>
              </button>

              <button
                onClick={() => router.push('/profile')}
                className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 transition-all active:scale-95 ${isActive('/profile') ? 'opacity-100' : 'opacity-50'}`}
              >
                <svg className="w-6 h-6" fill={isActive('/profile') ? '#2563EB' : '#0F172A'} viewBox="0 0 24 24">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
                <span className="text-xs font-semibold" style={{ color: isActive('/profile') ? '#2563EB' : '#0F172A' }}>
                  {t('mobileLayout.perfil')}
                </span>
              </button>
            </div>
          </nav>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════════════
          TABLET + DESKTOP SHELL (≥ 768px) — sidebar fijo
         ════════════════════════════════════════════════════════════════ */}
      <div className="shell-desktop" style={{ display: 'none' }}>
        {/* Wrapper: altura fija 100vh, sin scroll en este nivel */}
        <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>

          {/* Sidebar: sticky, no se mueve con el scroll del contenido */}
          <aside className="sidebar" style={{
            flexShrink: 0,
            backgroundColor: '#0F172A',
            display: 'flex',
            flexDirection: 'column',
            padding: '20px 0',
            position: 'sticky',
            top: 0,
            height: '100vh',
            overflowY: 'auto',
          }}>
            <div className="sidebar-brand" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0 20px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: '16px' }}>
              {/* Tablet colapsado: solo icono de casita */}
              <span className="sidebar-brand-icon" style={{ fontSize: '22px', flexShrink: 0 }}>🏠</span>
              {/* Desktop full: logo imagen */}
              <Image
                src="/logo_header.png"
                alt="FlowEstateAI"
                width={410}
                height={184}
                className="sidebar-brand-logo"
                style={{ width: '120px', height: 'auto' }}
                priority
              />
            </div>

            <nav style={{ display: 'flex', flexDirection: 'column', gap: '2px', padding: '0 12px' }}>
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.path}
                  onClick={() => router.push(item.path)}
                  className="sidebar-nav-item"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    background: isActive(item.path) ? 'rgba(37,99,235,0.18)' : 'transparent',
                    color: isActive(item.path) ? '#ffffff' : 'rgba(255,255,255,0.55)',
                    fontWeight: 600,
                    fontSize: '13.5px',
                    border: 'none',
                    cursor: 'pointer',
                    width: '100%',
                    textAlign: 'left',
                  }}
                >
                  <span style={{ fontSize: '16px', flexShrink: 0 }}>{item.icon}</span>
                  <span className="sidebar-nav-text" style={{ whiteSpace: 'nowrap' }}>{t(`mobileLayout.${item.labelKey}`)}</span>
                </button>
              ))}
            </nav>

            <div className="sidebar-create-box" style={{ marginTop: 'auto', padding: '0 20px' }}>
              <button
                onClick={handleCreateClick}
                style={{
                  width: '100%',
                  background: 'rgba(37,99,235,0.15)',
                  border: '1px solid rgba(37,99,235,0.3)',
                  borderRadius: '10px',
                  padding: '12px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  color: 'white',
                }}
              >
                <p className="sidebar-create-title" style={{ margin: '0 0 4px', fontSize: '12px', fontWeight: 600 }}>➕ {t('mobileLayout.crearPropiedad')}</p>
                <p className="sidebar-create-hint" style={{ margin: 0, fontSize: '10.5px', color: 'rgba(255,255,255,0.55)', lineHeight: 1.4 }}>
                  {t('mobileLayout.crearPropiedadHintVoz')}
                </p>
              </button>
            </div>
          </aside>

          {/* Área de contenido: flex column, header fijo arriba, main con scroll */}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <header style={{
              backgroundColor: 'white',
              borderBottom: '1px solid #E5E7EB',
              padding: '14px 28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexShrink: 0,
              position: 'sticky',
              top: 0,
              zIndex: 10,
            }}>
              <h1 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#0F172A' }}>{title || ''}</h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {session && (
                  <>
                    <span style={{ background: '#2563EB', color: 'white', fontSize: '11.5px', fontWeight: 700, padding: '5px 12px', borderRadius: '100px' }}>
                      {session.user.plan === 'pro' ? t('mobileLayout.pro') : t('mobileLayout.free')}
                    </span>
                    {session.user.plan === 'free' && (
                      <button onClick={() => router.push('/pricing')} style={{ background: 'none', border: 'none', color: '#2563EB', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                        {t('mobileLayout.upgrade')}
                      </button>
                    )}
                  </>
                )}
              </div>
            </header>

            {/* Main: único elemento con scroll */}
            <main style={{ flex: 1, overflowY: 'auto' }}>{children}</main>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .safe-top { padding-top: env(safe-area-inset-top); }
        .safe-bottom { padding-bottom: env(safe-area-inset-bottom); }
        .overscroll-contain { overscroll-behavior: contain; }
        body { overscroll-behavior-y: none; }
        .overflow-y-auto::-webkit-scrollbar { display: none; }
        .overflow-y-auto { -ms-overflow-style: none; scrollbar-width: none; }

        .shell-desktop { display: none; }

        @media (min-width: 768px) {
          .shell-mobile { display: none !important; }
          .shell-desktop { display: block !important; }

          .sidebar { width: 72px; }
          .sidebar-brand-text,
          .sidebar-nav-text,
          .sidebar-create-title,
          .sidebar-create-hint { display: none; }
          .sidebar-brand { justify-content: center; padding: 0 0 24px; }
          .sidebar-nav-item { justify-content: center; padding: 10px 0; }
          .sidebar-create-box button { padding: 10px 0; }

          /* Tablet: mostrar solo el icono, ocultar logo */
          .sidebar-brand-logo { display: none; }
          .sidebar-brand-icon { display: inline; }
        }

        @media (min-width: 1200px) {
          .sidebar { width: 220px; }
          .sidebar-brand-text,
          .sidebar-nav-text,
          .sidebar-create-title,
          .sidebar-create-hint { display: block; }
          .sidebar-brand { justify-content: flex-start; padding: 0 20px 24px; }
          .sidebar-nav-item { justify-content: flex-start; padding: 10px 12px; }
          .sidebar-create-box button { padding: 12px; }

          /* Desktop: mostrar logo, ocultar icono */
          .sidebar-brand-logo { display: block; }
          .sidebar-brand-icon { display: none; }
        }

        /* Dashboard property cards — photo responsive */
        .photo-container {
          width: 130px;
          min-height: 130px;
          flex-shrink: 0;
        }

        @media (min-width: 768px) {
          .photo-container {
            width: 100%;
            height: 180px;
            min-height: 180px;
            flex-shrink: 0;
          }
        }
      `}</style>
    </div>
  );
}