'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { useI18nStore } from '@/lib/i18n-store';

const T = {
  navy:       '#1B2D5B',
  navyMid:    '#243770',
  gold:       '#C9A84C',
  goldLight:  '#E8C96A',
  goldPale:   '#F5EDD8',
  cream:      '#F8F6F2',
  white:      '#FFFFFF',
  charcoal:   '#1A1A2E',
  muted:      '#6B7280',
  border:     '#E8E4DC',
  green:      '#15803D',
  greenBg:    '#F0FDF4',
  greenBorder:'#BBF7D0',
  red:        '#DC2626',
};

interface FacebookConfig {
  page_id: string;
  page_name: string;
  access_token: string;
  token_expires_at: string | null;
  is_connected: boolean;
}

export default function SocialSettingsContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { language } = useI18nStore();

  const [loading, setLoading] = useState(true);
  const [facebookConfig, setFacebookConfig] = useState<FacebookConfig | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const copy = {
    title:           language === 'en' ? 'Social Networks' : 'Redes Sociales',
    subtitle:        language === 'en' ? 'Connect your accounts to publish directly from FlowEstateAI' : 'Conecta tus cuentas para publicar directamente desde FlowEstateAI',
    fbTitle:         language === 'en' ? 'Facebook' : 'Facebook',
    fbDesc:          language === 'en' ? 'Publish your properties directly to your Facebook page' : 'Publica tus propiedades directamente en tu página de Facebook',
    fbConnected:     language === 'en' ? 'Connected' : 'Conectado',
    fbNotConnected:  language === 'en' ? 'Not connected' : 'No conectado',
    fbConnect:       language === 'en' ? 'Connect with Facebook' : 'Conectar con Facebook',
    fbDisconnect:    language === 'en' ? 'Disconnect' : 'Desconectar',
    fbConnecting:    language === 'en' ? 'Connecting...' : 'Conectando...',
    fbDisconnecting: language === 'en' ? 'Disconnecting...' : 'Desconectando...',
    fbPage:          language === 'en' ? 'Page' : 'Página',
    fbExpires:       language === 'en' ? 'Token expires' : 'Token vence',
    fbTip:           language === 'en'
      ? 'You need a Facebook page (not a personal profile) to connect. Publish your listings with one tap from the dashboard.'
      : 'Necesitas una página de Facebook (no un perfil personal) para conectar. Publica tus propiedades con un toque desde el dashboard.',
    proRequired:     language === 'en' ? 'This feature requires a Pro plan.' : 'Esta función requiere el plan Pro.',
    proUpgrade:      language === 'en' ? 'Upgrade to Pro' : 'Actualizar a Pro',
    confirmDisconnect: language === 'en'
      ? 'Are you sure you want to disconnect your Facebook account?'
      : '¿Estás seguro de que deseas desconectar tu cuenta de Facebook?',
  };

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
    else if (status === 'authenticated') loadConfig();
  }, [status, router]);

  useEffect(() => {
    const successParam = searchParams.get('success');
    const errorParam = searchParams.get('error');
    if (successParam === 'facebook_connected') {
      setSuccess(language === 'en' ? '✅ Facebook connected successfully!' : '✅ ¡Facebook conectado exitosamente!');
      setTimeout(() => setSuccess(null), 5000);
    }
    if (errorParam) {
      setError(language === 'en' ? `❌ Error connecting Facebook: ${errorParam}` : `❌ Error al conectar Facebook: ${errorParam}`);
      setTimeout(() => setError(null), 5000);
    }
  }, [searchParams, language]);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/facebook/config');
      if (response.ok) {
        const data = await response.json();
        setFacebookConfig(data.config);
      }
    } catch (err) { console.error('Error loading social config:', err); }
    finally { setLoading(false); }
  };

  const handleConnectFacebook = async () => {
    setConnecting(true);
    try {
      const response = await fetch('/api/facebook/auth-url');
      if (!response.ok) throw new Error('Error al obtener URL de autenticación');
      const data = await response.json();
      window.location.href = data.url;
    } catch (err: any) {
      setError(err.message);
      setConnecting(false);
    }
  };

  const handleDisconnectFacebook = async () => {
    if (!confirm(copy.confirmDisconnect)) return;
    setDisconnecting(true);
    try {
      const response = await fetch('/api/facebook/disconnect', { method: 'POST' });
      if (!response.ok) throw new Error('Error al desconectar');
      setFacebookConfig(null);
      setSuccess(language === 'en' ? '✅ Facebook disconnected' : '✅ Facebook desconectado');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally { setDisconnecting(false); }
  };

  const isProActivo = session?.user?.plan === 'pro' || session?.user?.role === 'admin';

  const formatExpiryDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString(
      language === 'en' ? 'en-US' : 'es-CR',
      { day: 'numeric', month: 'long', year: 'numeric' }
    );
  };

  const isTokenExpiringSoon = (dateStr: string | null) => {
    if (!dateStr) return false;
    const expiry = new Date(dateStr);
    const daysLeft = (expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return daysLeft < 7;
  };

  if (loading) {
    return (
      <AppLayout title={copy.title} showBack={true} showTabs={true}>
        <div className="flex items-center justify-center h-full" style={{ backgroundColor: T.cream }}>
          <div className="text-center py-12">
            <div className="text-5xl mb-4 animate-pulse">📱</div>
            <div className="text-base font-medium" style={{ color: T.muted }}>
              {language === 'en' ? 'Loading...' : 'Cargando...'}
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={copy.title} showBack={true} showTabs={true}>
      <div
        className="px-4 py-6 pb-24 md:px-8 md:py-8 md:pb-10 md:max-w-xl md:mx-auto space-y-5"
        style={{ backgroundColor: T.cream }}
      >

        {/* Título estilizado — mobile */}
        <div className="flex items-center gap-2 md:hidden">
          <div style={{ width: '3px', height: '22px', backgroundColor: T.gold, borderRadius: '2px', flexShrink: 0 }} />
          <h1 className="text-xl font-bold tracking-tight" style={{ color: T.navy }}>{copy.title}</h1>
        </div>

        {/* Descripción */}
        <div
          className="rounded-2xl p-4 flex items-start gap-3"
          style={{ backgroundColor: T.goldPale, border: `1px solid rgba(201,168,76,0.35)` }}
        >
          <span className="text-lg flex-shrink-0">💡</span>
          <p className="text-xs leading-relaxed" style={{ color: T.navy, opacity: 0.8 }}>
            {copy.subtitle}
          </p>
        </div>

        {/* Alertas */}
        {error && (
          <div
            className="rounded-xl p-4 text-sm font-medium"
            style={{ backgroundColor: '#FEF2F2', color: T.red, border: '1px solid #FECACA' }}
          >
            {error}
          </div>
        )}
        {success && (
          <div
            className="rounded-xl p-4 text-sm font-medium"
            style={{ backgroundColor: T.greenBg, color: T.green, border: `1px solid ${T.greenBorder}` }}
          >
            {success}
          </div>
        )}

        {/* ── FACEBOOK ── */}
        <div
          className="rounded-2xl overflow-hidden shadow-sm"
          style={{ backgroundColor: T.white, border: `1px solid ${T.border}` }}
        >
          {/* Header de la sección */}
          <div
            className="flex items-center justify-between px-5 py-4"
            style={{ borderBottom: `1px solid ${T.border}` }}
          >
            <div className="flex items-center gap-3">
              {/* Logo Facebook */}
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: '#1877F2' }}
              >
                <svg width="18" height="18" fill="white" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-sm" style={{ color: T.navy }}>{copy.fbTitle}</h3>
                <p className="text-xs" style={{ color: T.muted }}>{copy.fbDesc}</p>
              </div>
            </div>

            {/* Badge estado */}
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold flex-shrink-0"
              style={{
                backgroundColor: facebookConfig?.is_connected ? T.greenBg : T.cream,
                color: facebookConfig?.is_connected ? T.green : T.muted,
                border: `1px solid ${facebookConfig?.is_connected ? T.greenBorder : T.border}`,
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: facebookConfig?.is_connected ? T.green : T.muted }}
              />
              {facebookConfig?.is_connected ? copy.fbConnected : copy.fbNotConnected}
            </span>
          </div>

          {/* Contenido */}
          <div className="px-5 py-4 space-y-4">

            {/* Info de la página conectada */}
            {facebookConfig?.is_connected && (
              <div className="space-y-2">
                <div
                  className="flex items-center gap-3 p-3 rounded-xl"
                  style={{ backgroundColor: T.greenBg, border: `1px solid ${T.greenBorder}` }}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: '#1877F2' }}
                  >
                    <span className="text-white text-xs font-bold">f</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold truncate" style={{ color: T.navy }}>
                      {copy.fbPage}: {facebookConfig.page_name || facebookConfig.page_id}
                    </p>
                    {facebookConfig.token_expires_at && (
                      <p
                        className="text-[10px] mt-0.5"
                        style={{
                          color: isTokenExpiringSoon(facebookConfig.token_expires_at) ? T.red : T.muted,
                        }}
                      >
                        {copy.fbExpires}: {formatExpiryDate(facebookConfig.token_expires_at)}
                        {isTokenExpiringSoon(facebookConfig.token_expires_at) && ' ⚠️'}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Tip */}
            {!facebookConfig?.is_connected && (
              <p className="text-xs leading-relaxed" style={{ color: T.muted }}>
                {copy.fbTip}
              </p>
            )}

            {/* Botones */}
            {!isProActivo ? (
              <div
                className="rounded-xl p-4 flex items-start gap-3"
                style={{ backgroundColor: T.goldPale, border: `1px solid rgba(201,168,76,0.35)` }}
              >
                <span className="text-lg flex-shrink-0">🔒</span>
                <div className="flex-1">
                  <p className="text-sm font-bold mb-1" style={{ color: T.navy }}>{copy.proRequired}</p>
                  <a
                    href="/pro"
                    className="inline-block px-4 py-2 rounded-xl font-bold text-sm active:scale-95 transition-transform"
                    style={{
                      background: `linear-gradient(135deg, ${T.gold} 0%, ${T.goldLight} 100%)`,
                      color: T.navy,
                    }}
                  >
                    🚀 {copy.proUpgrade}
                  </a>
                </div>
              </div>
            ) : facebookConfig?.is_connected ? (
              <div className="flex gap-3">
                <button
                  onClick={handleConnectFacebook}
                  disabled={connecting}
                  className="flex-1 py-3 rounded-xl font-bold text-sm active:scale-95 transition-transform disabled:opacity-50"
                  style={{ border: `1.5px solid ${T.navy}`, color: T.navy, backgroundColor: T.white }}
                >
                  {connecting ? copy.fbConnecting : `🔄 ${language === 'en' ? 'Reconnect' : 'Reconectar'}`}
                </button>
                <button
                  onClick={handleDisconnectFacebook}
                  disabled={disconnecting}
                  className="flex-1 py-3 rounded-xl font-bold text-sm text-white active:scale-95 transition-transform disabled:opacity-50"
                  style={{ backgroundColor: T.red }}
                >
                  {disconnecting ? copy.fbDisconnecting : `🔌 ${copy.fbDisconnect}`}
                </button>
              </div>
            ) : (
              <button
                onClick={handleConnectFacebook}
                disabled={connecting}
                className="w-full py-3.5 rounded-xl font-bold text-sm text-white active:scale-95 transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ backgroundColor: '#1877F2', boxShadow: '0 2px 8px rgba(24,119,242,0.3)' }}
              >
                {connecting ? (
                  <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>{copy.fbConnecting}</>
                ) : (
                  <><svg width="16" height="16" fill="white" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>{copy.fbConnect}</>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Placeholder otras redes — futuro */}
        <div
          className="rounded-2xl p-5 shadow-sm"
          style={{ backgroundColor: T.white, border: `1px solid ${T.border}`, opacity: 0.5 }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
              style={{ backgroundColor: T.cream, border: `1px solid ${T.border}` }}
            >
              📷
            </div>
            <div>
              <h3 className="font-bold text-sm" style={{ color: T.navy }}>Instagram</h3>
              <p className="text-xs" style={{ color: T.muted }}>
                {language === 'en' ? 'Coming soon' : 'Próximamente'}
              </p>
            </div>
            <span
              className="ml-auto text-[10px] font-bold px-2.5 py-1 rounded-full flex-shrink-0"
              style={{ backgroundColor: T.goldPale, color: T.navy, border: `1px solid rgba(201,168,76,0.35)` }}
            >
              {language === 'en' ? 'Soon' : 'Pronto'}
            </span>
          </div>
        </div>

      </div>
    </AppLayout>
  );
}