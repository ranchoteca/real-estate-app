'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { ReactNode } from 'react';

interface MobileLayoutProps {
  children: ReactNode;
  title?: string;
  showBack?: boolean;
  showTabs?: boolean;
}

export default function MobileLayout({ 
  children, 
  title, 
  showBack = false,
  showTabs = true 
}: MobileLayoutProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

  return (
    <div className="flex flex-col h-screen" style={{ backgroundColor: '#F5EAD3' }}>
      {/* Top Header - Mobile Native Style */}
      <header 
        className="flex-shrink-0 shadow-lg relative z-50"
        style={{ backgroundColor: '#0F172A' }}
      >
        <div className="safe-top">
          <div className="flex items-center justify-between h-14 px-4">
            {/* Left Side */}
            <div className="flex items-center gap-3 min-w-0">
              {showBack ? (
                <button
                  onClick={() => router.back()}
                  className="text-white p-2 -ml-2 active:opacity-70 transition-opacity"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              ) : (
                <span className="text-2xl">🏠</span>
              )}
              
              {title && (
                <h1 className="text-lg font-bold text-white truncate">
                  {title}
                </h1>
              )}
            </div>

            {/* Right Side */}
            <div className="flex items-center gap-3">
              {session && (
                <>
                  <div 
                    className="px-3 py-1.5 rounded-full text-sm font-semibold text-white"
                    style={{ backgroundColor: '#2563EB' }}
                  >
                    {session.user.plan === 'pro' ? 'Pro' : 'Free'}
                  </div>
                  {session.user.plan === 'free' && (
                    <button
                      onClick={() => router.push('/pricing')}
                      className="text-white text-sm font-semibold hover:opacity-80 transition-opacity"
                    >
                      Upgrade
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Scrollable */}
      <main className="flex-1 overflow-y-auto overscroll-contain">
        <div className="pb-28">
          {children}
        </div>
      </main>

      {/* Bottom Tab Bar - Only on main screens */}
      {showTabs && session && (
        <nav 
          className="fixed bottom-0 left-0 right-0 border-t safe-bottom shadow-2xl z-50"
          style={{ 
            backgroundColor: '#FFFFFF',
            borderTopColor: '#E5E7EB'
          }}
        >
          <div className="flex justify-around items-center h-16">
            {/* Home Tab */}
            <button
              onClick={() => router.push('/dashboard')}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 transition-all active:scale-95 ${
                isActive('/dashboard') ? 'opacity-100' : 'opacity-50'
              }`}
            >
              <svg className="w-6 h-6" fill={isActive('/dashboard') ? '#2563EB' : '#0F172A'} viewBox="0 0 24 24">
                <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
              </svg>
              <span 
                className="text-xs font-semibold"
                style={{ color: isActive('/dashboard') ? '#2563EB' : '#0F172A' }}
              >
                Inicio
              </span>
            </button>

            {/* Create Tab - Center with FAB style */}
            <button
              onClick={() => router.push('/create-property')}
              disabled={!session.user || (session.user.plan === 'free')}
              className="flex-1 flex flex-col items-center justify-center -mt-8 transition-all active:scale-95 disabled:opacity-50"
            >
              <div 
                className="w-14 h-14 rounded-full shadow-2xl flex items-center justify-center mb-1"
                style={{ backgroundColor: '#2563EB' }}
              >
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <span className="text-xs font-semibold" style={{ color: '#0F172A' }}>
                Nueva
              </span>
            </button>

            {/* Profile Tab */}
            <button
              onClick={() => router.push('/profile')}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 transition-all active:scale-95 ${
                isActive('/profile') ? 'opacity-100' : 'opacity-50'
              }`}
            >
              <svg className="w-6 h-6" fill={isActive('/profile') ? '#2563EB' : '#0F172A'} viewBox="0 0 24 24">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
              </svg>
              <span 
                className="text-xs font-semibold"
                style={{ color: isActive('/profile') ? '#2563EB' : '#0F172A' }}
              >
                Perfil
              </span>
            </button>
          </div>
        </nav>
      )}

      {/* Safe area styles */}
      <style jsx global>{`
        .safe-top {
          padding-top: env(safe-area-inset-top);
        }
        .safe-bottom {
          padding-bottom: env(safe-area-inset-bottom);
        }
        
        /* Smooth scrolling */
        .overscroll-contain {
          overscroll-behavior: contain;
        }
        
        /* Disable bounce on iOS */
        body {
          overscroll-behavior-y: none;
        }

        /* Hide scrollbar but keep functionality */
        .overflow-y-auto::-webkit-scrollbar {
          display: none;
        }
        .overflow-y-auto {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}