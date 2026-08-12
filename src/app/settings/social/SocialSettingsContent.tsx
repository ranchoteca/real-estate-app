'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { useI18nStore } from '@/lib/i18n-store';

type PlatformData = {
  connected: boolean;
  username: string | null;
  connectedAt: string | null;
};

type SocialData = {
  facebook: PlatformData;
  tiktok: PlatformData;
};

export default function SocialSettingsContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { language } = useI18nStore();

  const [loading, setLoading] = useState(true);
  const [socialData, setSocialData] = useState<SocialData>({
    facebook: { connected: false, username: null, connectedAt: null },
    tiktok: { connected: false, username: null, connectedAt: null },
  });

  const [connectingFb, setConnectingFb] = useState(false);
  const [connectingTk, setConnectingTk] = useState(false);
  const [disconnectingFb, setDisconnectingFb] = useState(false);
  const [disconnectingTk, setDisconnectingTk] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status, router]);

  useEffect(() => {
    if (session) loadSocialData();
  }, [session]);

  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');
    const platform = searchParams.get('platform');

    if (success === 'true' && platform) {
      window.history.replaceState(null, '', '/settings/social');
      loadSocialData();
      const platformName = platform === 'tiktok' ? 'TikTok' : 'Facebook';
      alert(`✅ ${platformName} ${language === 'en' ? 'connected successfully!' : 'conectado con éxito!'}`);

    } else if (error && platform) {
      window.history.replaceState(null, '', '/settings/social');
      const platformName = platform === 'tiktok' ? 'TikTok' : 'Facebook';
      const errorMessages: Record<string, string> = {
        denied: language === 'en'
          ? `You denied access to ${platformName}.`
          : `Denegaste el acceso a ${platformName}.`,
        server: language === 'en'
          ? `Server error connecting ${platformName}. Try again.`
          : `Error de servidor al conectar ${platformName}. Intenta de nuevo.`,
        invalid: language === 'en'
          ? 'Invalid authentication.'
          : 'Autenticación inválida.',
      };
      alert(`❌ ${errorMessages[error] || (language === 'en' ? 'Unknown error' : 'Error desconocido')}`);
    }
  }, [searchParams, language]);

  const loadSocialData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/agent/profile');
      if (response.ok) {
        const data = await response.json();
        const agent = data.agent;
        setSocialData({
          facebook: {
            connected: !!agent.facebook_account_id,
            username: agent.facebook_username,
            connectedAt: agent.facebook_connected_at,
          },
          tiktok: {
            connected: !!agent.tiktok_account_id,
            username: agent.tiktok_username,
            connectedAt: agent.tiktok_connected_at,
          },
        });
      }
    } catch (err) {
      console.error('Error loading social data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (platform: 'facebook' | 'tiktok') => {
    const setConnecting = platform === 'facebook' ? setConnectingFb : setConnectingTk;
    const authEndpoint = platform === 'facebook' ? '/api/facebook/auth' : '/api/tiktok/auth';
    const platformName = platform === 'tiktok' ? 'TikTok' : 'Facebook';
    const platformEmoji = platform === 'tiktok' ? '🎵' : '📘';

    try {
      setConnecting(true);

      const width = 600;
      const height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;

      const popup = window.open(
        'about:blank',
        `${platform}-auth`,
        `width=${width},height=${height},left=${left},top=${top},toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes`
      );

      if (!popup) {
        alert(language === 'en'
          ? 'Allow popups to connect your account.'
          : 'Permite las ventanas emergentes para conectar tu cuenta.');
        setConnecting(false);
        return;
      }

      popup.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
            <title>${language === 'en' ? `Connecting ${platformName}` : `Conectando ${platformName}`}</title>
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              html, body { width: 100%; height: 100%; overflow: hidden; }
              body {
                display: flex; align-items: center; justify-content: center;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
              }
              .container { text-align: center; padding: 20px; }
              .spinner {
                width: 50px; height: 50px; margin: 0 auto 1rem;
                border: 4px solid rgba(255,255,255,0.3);
                border-top-color: white; border-radius: 50%;
                animation: spin 1s linear infinite;
              }
              @keyframes spin { to { transform: rotate(360deg); } }
              h2 { font-size: 1.5rem; margin-bottom: 0.5rem; }
            </style>
          </head>
          <body>
            <div class="container">
              <div style="font-size: 4rem; margin-bottom: 1rem;">${platformEmoji}</div>
              <div class="spinner"></div>
              <h2>${language === 'en' ? `Connecting ${platformName}` : `Conectando ${platformName}`}</h2>
              <p>${language === 'en' ? 'Please wait...' : 'Por favor espera...'}</p>
            </div>
          </body>
        </html>
      `);

      const response = await fetch(authEndpoint);
      const data = await response.json();

      if (!response.ok || !data.authUrl) {
        popup.close();
        throw new Error(language === 'en'
          ? 'Error generating auth URL'
          : 'Error al generar URL de autenticación');
      }

      popup.location.href = data.authUrl;

      const checkPopup = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkPopup);
          setConnecting(false);
          setTimeout(() => loadSocialData(), 1000);
        }
      }, 500);

    } catch (error: any) {
      console.error(`Error connecting ${platform}:`, error);
      alert(`❌ ${error.message}`);
      setConnecting(false);
    }
  };

  const handleDisconnect = async (platform: 'facebook' | 'tiktok') => {
    const platformName = platform === 'tiktok' ? 'TikTok' : 'Facebook';
    const confirmMsg = language === 'en'
      ? `Disconnect ${platformName}? You won't be able to post until you reconnect.`
      : `¿Desconectar ${platformName}? No podrás publicar hasta que vuelvas a conectar.`;

    if (!confirm(confirmMsg)) return;

    const setDisconnecting = platform === 'facebook' ? setDisconnectingFb : setDisconnectingTk;
    const endpoint = platform === 'facebook' ? '/api/facebook/disconnect' : '/api/tiktok/disconnect';

    setDisconnecting(true);
    try {
      const response = await fetch(endpoint, { method: 'POST' });
      if (!response.ok) throw new Error(language === 'en' ? 'Error disconnecting' : 'Error al desconectar');
      alert(`✅ ${platformName} ${language === 'en' ? 'disconnected.' : 'desconectado.'}`);
      loadSocialData();
    } catch (err: any) {
      alert(`❌ ${err.message}`);
    } finally {
      setDisconnecting(false);
    }
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString(language === 'en' ? 'en-US' : 'es-ES', {
      day: 'numeric', month: 'long', year: 'numeric',
    });

  if (status === 'loading' || loading) {
    return (
      <AppLayout
        title={language === 'en' ? 'Social Networks' : 'Redes Sociales'}
        showBack={true}
        showTabs={true}
      >
        <div className="flex items-center justify-center h-full" style={{ backgroundColor: '#F8F6F2' }}>
          <div className="text-center py-12">
            <div className="text-5xl mb-4 animate-pulse">📱</div>
            <div className="text-base font-medium" style={{ color: '#6B7280' }}>
              {language === 'en' ? 'Loading...' : 'Cargando...'}
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!session) return null;

  const renderPlatformCard = (platform: 'facebook' | 'tiktok') => {
    const isFacebook = platform === 'facebook';
    const data = socialData[platform];
    const connecting = isFacebook ? connectingFb : connectingTk;
    const disconnecting = isFacebook ? disconnectingFb : disconnectingTk;

    const config = isFacebook
      ? {
          name: 'Facebook',
          emoji: '📘',
          color: '#1877F2',
          icon: (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
          ),
          connectLabel: language === 'en' ? 'Connect Facebook Page' : 'Conectar página de Facebook',
          requirements: language === 'en'
            ? ['Facebook Business or personal account', 'Admin access to a Facebook Page', 'Authorize the requested permissions']
            : ['Cuenta de Facebook Business o personal', 'Acceso de administrador a una página de Facebook', 'Autorizar los permisos solicitados'],
          howTo: language === 'en'
            ? [
                'Go to the Dashboard and tap the three dots on the property card',
                'Choose whether to publish a "Facebook Post" or a "Post video to Social Networks"',
                'Your content will publish automatically',
              ]
            : [
                'Ve al Dashboard y toca los tres puntitos en la esquina de la ficha de la propiedad',
                'Elige si deseas "Publicar post de Facebook" o "Publicar video en redes sociales"',
                'Tu contenido se publicará automáticamente',
              ],
        }
      : {
          name: 'TikTok',
          emoji: '🎵',
          color: '#010101',
          icon: (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.19 8.19 0 004.79 1.52V6.75a4.85 4.85 0 01-1.02-.06z" />
            </svg>
          ),
          connectLabel: language === 'en' ? 'Connect TikTok Account' : 'Conectar cuenta de TikTok',
          requirements: language === 'en'
            ? ['Active TikTok account', 'Allow video upload permissions', 'Public or private account accepted']
            : ['Cuenta de TikTok activa', 'Permitir permisos de subida de videos', 'Se acepta cuenta pública o privada'],
          howTo: language === 'en'
            ? [
                'Go to the Dashboard and tap the three dots on the property card',
                'Choose the "Post video to Social Networks" option',
                'Your video will publish automatically',
              ]
            : [
                'Ve al Dashboard y toca los tres puntitos en la esquina de la ficha de la propiedad',
                'Elige la opción "Publicar video en redes sociales"',
                'Tu video se publicará automáticamente',
              ],
        };

    return (
      <div className="rounded-2xl p-5 shadow-sm" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E4DC' }}>
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0"
            style={{ backgroundColor: config.color }}
          >
            {config.icon}
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-base leading-tight" style={{ color: '#1B2D5B' }}>
              {config.name}
            </h3>
            <p className="text-xs" style={{ color: '#6B7280' }}>
              {data.connected
                ? (language === 'en' ? 'Account connected' : 'Cuenta conectada')
                : (language === 'en' ? 'Not connected' : 'Sin conectar')}
            </p>
          </div>
          <div
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: data.connected ? '#15803D' : '#D1D5DB' }}
          />
        </div>

        {data.connected ? (
          <div className="space-y-3">
            <div
              className="p-3 rounded-xl"
              style={{ backgroundColor: '#F0FDF4', border: '1.5px solid #BBF7D0' }}
            >
              <div className="flex items-center gap-2">
                <span className="text-xl">✅</span>
                <div>
                  <p className="font-bold text-sm" style={{ color: '#15803D' }}>
                    {data.username}
                  </p>
                  {data.connectedAt && (
                    <p className="text-xs opacity-70" style={{ color: '#15803D' }}>
                      {language === 'en' ? 'Connected on' : 'Conectado el'} {formatDate(data.connectedAt)}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl" style={{ backgroundColor: '#F8F6F2', border: '1px solid #E8E4DC' }}>
              <p className="font-semibold mb-1 text-xs" style={{ color: '#1B2D5B' }}>
                📌 {language === 'en' ? 'How to publish:' : 'Cómo publicar:'}
              </p>
              <ul className="space-y-0.5 text-xs ml-3 list-disc" style={{ color: '#6B7280' }}>
                {config.howTo.map((step, i) => <li key={i}>{step}</li>)}
              </ul>
            </div>

            <button
              onClick={() => handleDisconnect(platform)}
              disabled={disconnecting}
              className="w-full py-2.5 rounded-xl font-bold border-2 active:scale-95 transition-transform disabled:opacity-50 text-sm"
              style={{ borderColor: '#DC2626', color: '#DC2626', backgroundColor: '#FFFFFF' }}
            >
              {disconnecting
                ? (language === 'en' ? 'Disconnecting...' : 'Desconectando...')
                : `🔌 ${language === 'en' ? 'Disconnect' : 'Desconectar'}`}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="p-3 rounded-xl" style={{ backgroundColor: '#FFFBEB', border: '1px solid #FDE68A' }}>
              <p className="font-semibold text-xs mb-1.5" style={{ color: '#92400E' }}>
                📋 {language === 'en' ? 'Requirements:' : 'Requisitos:'}
              </p>
              <ul className="space-y-0.5 text-xs ml-3 list-disc" style={{ color: '#92400E' }}>
                {config.requirements.map((req, i) => <li key={i}>{req}</li>)}
              </ul>
            </div>

            <button
              onClick={() => handleConnect(platform)}
              disabled={connecting}
              className="w-full py-3 rounded-xl font-bold text-white shadow-sm active:scale-95 transition-transform flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ backgroundColor: config.color }}
            >
              {config.icon}
              {connecting
                ? (language === 'en' ? 'Connecting...' : 'Conectando...')
                : config.connectLabel}
            </button>
          </div>
        )}
      </div>
    );
  };

  const connectedCount = [socialData.facebook.connected, socialData.tiktok.connected].filter(Boolean).length;

  return (
    <AppLayout
      title={language === 'en' ? 'Social Networks' : 'Redes Sociales'}
      showBack={true}
      showTabs={true}
    >
      <div className="px-4 pt-4 pb-24 md:px-6 md:pt-6 md:pb-12 md:max-w-5xl md:mx-auto md:grid md:grid-cols-2 md:gap-6 md:items-start lg:grid-cols-[1fr_420px] space-y-4 md:space-y-0" style={{ backgroundColor: '#F8F6F2' }}>

        {/* ── Columna izquierda ── */}
        <div className="space-y-4">

          {/* Título estilizado — mobile */}
          <div className="flex items-center gap-2 md:hidden">
            <div style={{ width: '3px', height: '22px', backgroundColor: '#C9A84C', borderRadius: '2px', flexShrink: 0 }} />
            <h1 className="text-xl font-bold tracking-tight" style={{ color: '#1B2D5B' }}>
              {language === 'en' ? 'Social Networks' : 'Redes Sociales'}
            </h1>
          </div>

          {/* Summary banner */}
          <div
            className="rounded-2xl p-4 shadow-sm"
            style={{
              backgroundColor: connectedCount > 0 ? '#F0FDF4' : '#F5EDD8',
              border: `1px solid ${connectedCount > 0 ? '#BBF7D0' : 'rgba(201,168,76,0.35)'}`,
            }}
          >
            <p className="text-sm font-semibold" style={{ color: connectedCount > 0 ? '#15803D' : '#1B2D5B' }}>
              {connectedCount === 0
                ? (language === 'en'
                    ? '⚠️ No social networks connected. Connect at least one to start publishing.'
                    : '⚠️ Sin redes sociales conectadas. Conecta al menos una para empezar a publicar.')
                : connectedCount === 1
                ? (language === 'en'
                    ? '✅ 1 network connected. Connect more to reach a wider audience.'
                    : '✅ 1 red conectada. Conecta más para llegar a más personas.')
                : (language === 'en'
                    ? `🚀 ${connectedCount} networks connected. You're ready to publish everywhere!`
                    : `🚀 ${connectedCount} redes conectadas. ¡Listo para publicar en todas partes!`)}
            </p>
          </div>

          {renderPlatformCard('facebook')}
          {renderPlatformCard('tiktok')}

          {/* Instagram — próximamente */}
          <div
            className="rounded-2xl p-5 shadow-sm opacity-60"
            style={{ backgroundColor: '#FFFFFF', border: '1.5px dashed #E8E4DC' }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #833AB4, #FD1D1D, #F77737)' }}
              >
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </div>
              <div>
                <p className="font-bold text-sm" style={{ color: '#1B2D5B' }}>Instagram</p>
                <p className="text-xs" style={{ color: '#6B7280' }}>
                  {language === 'en' ? 'Coming soon' : 'Próximamente'}
                </p>
              </div>
              <span
                className="ml-auto text-[10px] font-bold px-2.5 py-1 rounded-full"
                style={{ backgroundColor: '#F5EDD8', color: '#1B2D5B', border: '1px solid rgba(201,168,76,0.35)' }}
              >
                {language === 'en' ? 'Soon' : 'Pronto'}
              </span>
            </div>
          </div>

        </div>

        {/* ── Columna derecha: FAQ (sticky en desktop) ── */}
        <div className="space-y-4 md:sticky md:top-4">
          <div className="rounded-2xl p-5 shadow-sm" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E4DC' }}>
            <h3 className="font-bold text-base mb-4" style={{ color: '#1B2D5B' }}>
              ❓ {language === 'en' ? 'Frequently Asked Questions' : 'Preguntas frecuentes'}
            </h3>

            <div className="space-y-4 text-sm">
              <div>
                <p className="font-semibold mb-1 text-sm" style={{ color: '#1B2D5B' }}>
                  {language === 'en'
                    ? 'Can I connect multiple accounts per platform?'
                    : '¿Puedo conectar varias cuentas por plataforma?'}
                </p>
                <p className="text-xs" style={{ color: '#6B7280' }}>
                  {language === 'en'
                    ? 'Currently one account per platform. Disconnect the current one to connect a different account.'
                    : 'Por ahora una cuenta por plataforma. Desconecta la actual para conectar una diferente.'}
                </p>
              </div>

              <div>
                <p className="font-semibold mb-1 text-sm" style={{ color: '#1B2D5B' }}>
                  {language === 'en' ? 'Is my account data secure?' : '¿Mis datos de cuenta están seguros?'}
                </p>
                <p className="text-xs" style={{ color: '#6B7280' }}>
                  {language === 'en'
                    ? 'We use a secure intermediary. We never store your social network passwords.'
                    : 'Usamos un intermediario seguro. Nunca almacenamos tus contraseñas de redes sociales.'}
                </p>
              </div>

              <div>
                <p className="font-semibold mb-1 text-sm" style={{ color: '#1B2D5B' }}>
                  {language === 'en' ? 'What happens if I disconnect?' : '¿Qué pasa si desconecto?'}
                </p>
                <p className="text-xs" style={{ color: '#6B7280' }}>
                  {language === 'en'
                    ? 'Your existing posts stay published. You just lose the ability to publish new content until you reconnect.'
                    : 'Tus publicaciones existentes se mantienen. Solo pierdes la capacidad de publicar contenido nuevo hasta que vuelvas a conectar.'}
                </p>
              </div>

              <div>
                <p className="font-semibold mb-1 text-sm" style={{ color: '#1B2D5B' }}>
                  {language === 'en' ? 'What type of content can I publish?' : '¿Qué tipo de contenido puedo publicar?'}
                </p>
                <p className="text-xs" style={{ color: '#6B7280' }}>
                  {language === 'en'
                    ? 'Facebook: image posts and Reels. TikTok: short videos. All directly from a property.'
                    : 'Facebook: posts con imágenes y Reels. TikTok: videos cortos. Todo directamente desde una propiedad.'}
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </AppLayout>
  );
}