'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useTranslation } from '@/hooks/useTranslation';
import { useI18nStore } from '@/lib/i18n-store';

// ─── Design tokens ────────────────────────────────────────────────────────────
const T = {
  navy:      '#1B2D5B',
  navyMid:   '#243770',
  navyDark:  '#141F3F',
  gold:      '#C9A84C',
  goldLight: '#E8C96A',
  goldPale:  '#F5EDD8',
  cream:     '#F8F6F2',
  white:     '#FFFFFF',
  charcoal:  '#1A1A2E',
  muted:     '#6B7280',
  border:    '#E8E4DC',
  sidebar:   '#111827',   // casi negro para sidebar — contraste máximo
  sidebarHover: 'rgba(201,168,76,0.10)',
  sidebarActive: 'rgba(201,168,76,0.18)',
};

interface AppLayoutProps {
  children: React.ReactNode;
  title?: string;
  showBack?: boolean;
  showTabs?: boolean;
  currentPropertyCount?: number;
  onCreateLimitReached?: () => void;
}

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
  const { language } = useI18nStore();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [planInfo, setPlanInfo] = useState<{ plan: string; role: string; maxProperties: number } | null>(null);

  useEffect(() => {
    const loadPlan = async () => {
      try {
        const res = await fetch('/api/agent/current-plan');
        if (res.ok) setPlanInfo(await res.json());
      } catch {}
    };
    if (session) loadPlan();
  }, [session]);

  const isProActivo = planInfo?.role === 'admin' || planInfo?.plan === 'pro';
  const propertyLimit = isProActivo ? 150 : 5;
  const isAtLimit = currentPropertyCount !== undefined && currentPropertyCount >= propertyLimit;

  const handleCreateProperty = () => {
    if (isAtLimit && onCreateLimitReached) {
      onCreateLimitReached();
      return;
    }
    router.push('/create-property');
  };

  // ── Nav items ─────────────────────────────────────────────────────────────
  const navItems = [
    {
      href: '/dashboard',
      label: language === 'en' ? 'Properties' : 'Propiedades',
      icon: (active: boolean) => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
          stroke={active ? T.gold : 'rgba(255,255,255,0.5)'}
          strokeWidth={active ? 2 : 1.5} strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
      ),
    },
    {
      href: '/analytics',
      label: language === 'en' ? 'Analytics' : 'Analíticas',
      icon: (active: boolean) => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
          stroke={active ? T.gold : 'rgba(255,255,255,0.5)'}
          strokeWidth={active ? 2 : 1.5} strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="20" x2="18" y2="10"/>
          <line x1="12" y1="20" x2="12" y2="4"/>
          <line x1="6" y1="20" x2="6" y2="14"/>
        </svg>
      ),
    },
    {
      href: '/profile',
      label: language === 'en' ? 'Profile' : 'Perfil',
      icon: (active: boolean) => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
          stroke={active ? T.gold : 'rgba(255,255,255,0.5)'}
          strokeWidth={active ? 2 : 1.5} strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
      ),
    },
    {
      href: '/settings',
      label: language === 'en' ? 'Settings' : 'Ajustes',
      icon: (active: boolean) => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
          stroke={active ? T.gold : 'rgba(255,255,255,0.5)'}
          strokeWidth={active ? 2 : 1.5} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
        </svg>
      ),
    },
  ];

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  // ── Botón crear propiedad ─────────────────────────────────────────────────
  const CreateButton = ({ collapsed }: { collapsed: boolean }) => (
    <button
      onClick={handleCreateProperty}
      className="flex items-center gap-3 w-full px-4 py-3 rounded-xl font-bold text-sm transition-all active:scale-95"
      style={{
        background: `linear-gradient(135deg, ${T.gold} 0%, ${T.goldLight} 100%)`,
        color: T.navy,
        boxShadow: '0 2px 8px rgba(201,168,76,0.35)',
        justifyContent: collapsed ? 'center' : 'flex-start',
      }}
      title={collapsed ? (language === 'en' ? 'Create Property' : 'Crear Propiedad') : undefined}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.navy} strokeWidth="2.5" strokeLinecap="round">
        <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
      {!collapsed && (
        <span>{language === 'en' ? 'New Property' : 'Nueva Propiedad'}</span>
      )}
    </button>
  );

  // ── Plan badge ────────────────────────────────────────────────────────────
  const PlanBadge = ({ collapsed }: { collapsed: boolean }) => (
    <div
      className="flex items-center gap-2 px-3 py-2 rounded-lg"
      style={{
        backgroundColor: isProActivo ? 'rgba(201,168,76,0.12)' : 'rgba(255,255,255,0.06)',
        border: `1px solid ${isProActivo ? 'rgba(201,168,76,0.3)' : 'rgba(255,255,255,0.1)'}`,
        justifyContent: collapsed ? 'center' : 'flex-start',
      }}
      title={collapsed ? (isProActivo ? 'Pro' : 'Free') : undefined}
    >
      <span style={{ color: isProActivo ? T.gold : 'rgba(255,255,255,0.4)', fontSize: '11px' }}>
        {isProActivo ? '✦' : '○'}
      </span>
      {!collapsed && (
        <span className="text-xs font-semibold" style={{ color: isProActivo ? T.gold : 'rgba(255,255,255,0.4)' }}>
          {isProActivo ? 'Plan Pro' : 'Plan Free'}
        </span>
      )}
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: T.cream }}>

      {/* ══════════════════════════════════════════════════════════════════════
          SIDEBAR DESKTOP (≥1200px)
      ══════════════════════════════════════════════════════════════════════ */}
      <aside
        className="hidden lg:flex flex-col transition-all duration-300 flex-shrink-0"
        style={{
          width: sidebarCollapsed ? '68px' : '220px',
          backgroundColor: T.sidebar,
          borderRight: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {/* Logo */}
        <div
          className="flex items-center px-4 flex-shrink-0"
          style={{
            height: '57px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            justifyContent: sidebarCollapsed ? 'center' : 'space-between',
          }}
        >
          {!sidebarCollapsed && (
            <Image src="/logo_header.png" alt="FlowEstateAI" width={320} height={144} className="h-7 w-auto" priority />
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="flex items-center justify-center rounded-lg transition-colors"
            style={{ width: '28px', height: '28px', color: 'rgba(255,255,255,0.35)', flexShrink: 0 }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = T.gold; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.35)'; }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              {sidebarCollapsed
                ? <><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>
                : <><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>
              }
            </svg>
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">

          {/* Crear propiedad */}
          <div className={`mb-4 ${sidebarCollapsed ? 'px-0' : 'px-1'}`}>
            <CreateButton collapsed={sidebarCollapsed} />
          </div>

          {/* Items de menú */}
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group relative"
                style={{
                  backgroundColor: active ? T.sidebarActive : 'transparent',
                  borderLeft: active ? `3px solid ${T.gold}` : '3px solid transparent',
                  justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                  textDecoration: 'none',
                }}
                onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.backgroundColor = T.sidebarHover; }}
                onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <span className="flex-shrink-0">{item.icon(active)}</span>
                {!sidebarCollapsed && (
                  <span
                    className="text-sm font-medium transition-colors"
                    style={{ color: active ? T.gold : 'rgba(255,255,255,0.65)' }}
                  >
                    {item.label}
                  </span>
                )}
                {/* Tooltip cuando colapsado */}
                {sidebarCollapsed && (
                  <div
                    className="absolute left-full ml-3 px-2.5 py-1 rounded-lg text-xs font-semibold pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap"
                    style={{ backgroundColor: T.navyMid, color: T.white, boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}
                  >
                    {item.label}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer sidebar */}
        <div className="px-2 pb-4 pt-2 flex flex-col gap-2 flex-shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <PlanBadge collapsed={sidebarCollapsed} />

          {/* Avatar + nombre */}
          {!sidebarCollapsed && session?.user && (
            <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}>
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                style={{ backgroundColor: T.gold, color: T.navy }}
              >
                {session.user.name?.charAt(0).toUpperCase() || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate" style={{ color: 'rgba(255,255,255,0.85)' }}>
                  {session.user.name}
                </p>
              </div>
            </div>
          )}

          {/* Logout */}
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl transition-colors w-full"
            style={{
              color: 'rgba(255,255,255,0.3)',
              justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(220,38,38,0.1)';
              (e.currentTarget as HTMLElement).style.color = '#FCA5A5';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
              (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.3)';
            }}
            title={sidebarCollapsed ? (language === 'en' ? 'Log out' : 'Cerrar sesión') : undefined}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            {!sidebarCollapsed && (
              <span className="text-xs font-medium">
                {language === 'en' ? 'Log out' : 'Cerrar sesión'}
              </span>
            )}
          </button>
        </div>
      </aside>

      {/* ══════════════════════════════════════════════════════════════════════
          SIDEBAR TABLET (768px–1199px) — iconos + tooltip
      ══════════════════════════════════════════════════════════════════════ */}
      <aside
        className="hidden md:flex lg:hidden flex-col flex-shrink-0"
        style={{
          width: '60px',
          backgroundColor: T.sidebar,
          borderRight: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {/* Logo compacto */}
        <div
          className="flex items-center justify-center flex-shrink-0"
          style={{ height: '57px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm"
            style={{ backgroundColor: T.gold, color: T.navy }}
          >
            F
          </div>
        </div>

        {/* Nav tablet */}
        <nav className="flex-1 py-4 flex flex-col items-center gap-1">

          {/* Botón crear — icono solo */}
          <button
            onClick={handleCreateProperty}
            className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-all active:scale-90 group relative"
            style={{
              background: `linear-gradient(135deg, ${T.gold} 0%, ${T.goldLight} 100%)`,
              boxShadow: '0 2px 8px rgba(201,168,76,0.35)',
            }}
            title={language === 'en' ? 'New Property' : 'Nueva Propiedad'}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={T.navy} strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            <div className="absolute left-full ml-3 px-2.5 py-1 rounded-lg text-xs font-semibold pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap" style={{ backgroundColor: T.navyMid, color: T.white, boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
              {language === 'en' ? 'New Property' : 'Nueva Propiedad'}
            </div>
          </button>

          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className="relative w-10 h-10 rounded-xl flex items-center justify-center transition-all group"
                style={{
                  backgroundColor: active ? T.sidebarActive : 'transparent',
                  borderLeft: active ? `2px solid ${T.gold}` : '2px solid transparent',
                  textDecoration: 'none',
                }}
                onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.backgroundColor = T.sidebarHover; }}
                onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
                title={item.label}
              >
                {item.icon(active)}
                <div className="absolute left-full ml-3 px-2.5 py-1 rounded-lg text-xs font-semibold pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap" style={{ backgroundColor: T.navyMid, color: T.white, boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
                  {item.label}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Footer tablet */}
        <div className="flex flex-col items-center gap-2 py-4 flex-shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {/* Plan badge */}
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{
              backgroundColor: isProActivo ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.06)',
              border: `1px solid ${isProActivo ? 'rgba(201,168,76,0.3)' : 'rgba(255,255,255,0.1)'}`,
            }}
            title={isProActivo ? 'Pro' : 'Free'}
          >
            <span style={{ color: isProActivo ? T.gold : 'rgba(255,255,255,0.3)', fontSize: '12px' }}>
              {isProActivo ? '✦' : '○'}
            </span>
          </div>

          {/* Avatar */}
          {session?.user && (
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
              style={{ backgroundColor: T.navyMid, color: T.gold, border: `1px solid rgba(201,168,76,0.3)` }}
              title={session.user.name || ''}
            >
              {session.user.name?.charAt(0).toUpperCase() || '?'}
            </div>
          )}

          {/* Logout */}
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors group relative"
            style={{ color: 'rgba(255,255,255,0.25)' }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(220,38,38,0.1)';
              (e.currentTarget as HTMLElement).style.color = '#FCA5A5';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
              (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.25)';
            }}
            title={language === 'en' ? 'Log out' : 'Cerrar sesión'}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>
      </aside>

      {/* ══════════════════════════════════════════════════════════════════════
          ÁREA DE CONTENIDO
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Header mobile/tablet */}
        <header
          className="flex-shrink-0 flex items-center justify-between px-4 md:px-5"
          style={{
            height: '57px',
            backgroundColor: T.sidebar,
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          {/* Izquierda */}
          <div className="flex items-center gap-3">
            {showBack ? (
              <button
                onClick={() => router.back()}
                className="flex items-center justify-center rounded-lg transition-colors"
                style={{ width: '32px', height: '32px', color: 'rgba(255,255,255,0.5)' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = T.gold; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.5)'; }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5M12 5l-7 7 7 7"/>
                </svg>
              </button>
            ) : (
              <div className="md:hidden">
                <Image src="/logo_header.png" alt="FlowEstateAI" width={320} height={144} className="h-7 w-auto" priority />
              </div>
            )}
            {title && (
              <h1 className="text-sm font-semibold truncate" style={{ color: 'rgba(255,255,255,0.85)' }}>
                {title}
              </h1>
            )}
          </div>

          {/* Derecha — crear propiedad */}
          <button
            onClick={handleCreateProperty}
            className="flex items-center justify-center rounded-xl active:scale-90 transition-all"
            style={{
              width: '34px',
              height: '34px',
              background: `linear-gradient(135deg, ${T.gold} 0%, ${T.goldLight} 100%)`,
              boxShadow: '0 2px 6px rgba(201,168,76,0.35)',
            }}
            title={language === 'en' ? 'New Property' : 'Nueva Propiedad'}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={T.navy} strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>
        </header>

        {/* Contenido */}
        <main className="flex-1 overflow-y-auto" style={{ backgroundColor: T.cream }}>
          {children}
        </main>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          BOTTOM NAV MOBILE — navy con iconos dorados
      ══════════════════════════════════════════════════════════════════════ */}
      {showTabs && (
        <nav
          className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex items-center"
          style={{
            backgroundColor: T.navy,
            borderTop: `1px solid rgba(201,168,76,0.2)`,
            height: '60px',
            paddingBottom: 'env(safe-area-inset-bottom)',
          }}
        >
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex-1 flex flex-col items-center justify-center gap-0.5 h-full transition-all"
                style={{ textDecoration: 'none' }}
              >
                {/* Indicador activo superior */}
                <div
                  className="transition-all duration-200"
                  style={{
                    height: '2px',
                    width: active ? '24px' : '0px',
                    backgroundColor: T.gold,
                    borderRadius: '0 0 2px 2px',
                    position: 'absolute',
                    top: '0',
                  }}
                />
                {item.icon(active)}
                <span
                  className="text-[9px] font-semibold uppercase tracking-wider"
                  style={{ color: active ? T.gold : 'rgba(255,255,255,0.35)' }}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>
      )}

      <style jsx global>{`
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