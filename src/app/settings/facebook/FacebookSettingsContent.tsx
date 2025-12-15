'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import MobileLayout from '@/components/MobileLayout';
import { useTranslation } from '@/hooks/useTranslation';

export default function FacebookSettingsContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [facebookData, setFacebookData] = useState<{
    connected: boolean;
    pageName: string | null;
    connectedAt: string | null;
  }>({ connected: false, pageName: null, connectedAt: null });

  const [aiSettings, setAiSettings] = useState({
    enabled: false,
    colorPrimary: '#1877F2',
    colorSecondary: '#FFFFFF',
    template: 'moderna'
  });
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (session) {
      loadFacebookData();
      loadAISettings();
    }
  }, [session]);

  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');

    if (success === 'true') {
      alert(t('facebook.connectedSuccess'));
      loadFacebookData();
      router.replace('/settings/facebook');
    } else if (error) {
      const errorMessages: Record<string, string> = {
        denied: t('facebook.errorDenied'),
        invalid: t('facebook.errorAuth'),
        no_pages: t('facebook.errorNoPages'),
        server: t('facebook.errorServer'),
      };
      alert(`❌ ${errorMessages[error] || t('common.error')}`);
      router.replace('/settings/facebook');
    }
  }, [searchParams, t, router]);

  const loadFacebookData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/agent/profile');
      if (response.ok) {
        const data = await response.json();
        setFacebookData({
          connected: !!data.agent.facebook_page_id,
          pageName: data.agent.facebook_page_name,
          connectedAt: data.agent.facebook_connected_at,
        });
      }
    } catch (err) {
      console.error('Error loading Facebook data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadAISettings = async () => {
    try {
      const response = await fetch('/api/agent/profile');
      if (response.ok) {
        const data = await response.json();
        setAiSettings({
          enabled: data.agent.fb_ai_enabled || false,
          colorPrimary: data.agent.fb_brand_color_primary || '#1877F2',
          colorSecondary: data.agent.fb_brand_color_secondary || '#FFFFFF',
          template: data.agent.fb_template || 'moderna'
        });
      }
    } catch (err) {
      console.error('Error loading AI settings:', err);
    }
  };

  const handleFacebookConnect = async () => {
    try {
      setConnecting(true);

      const width = 600;
      const height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;
      
      const popup = window.open(
        'about:blank',
        'facebook-auth',
        `width=${width},height=${height},left=${left},top=${top},toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes`
      );

      if (!popup) {
        alert(t('facebook.allowPopups'));
        setConnecting(false);
        return;
      }

      popup.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
            <title>${t('facebook.connecting')}</title>
            <style>
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
              }
              html, body {
                width: 100%;
                height: 100%;
                overflow: hidden;
              }
              body {
                display: flex;
                align-items: center;
                justify-content: center;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                font-size: 16px;
              }
              .container { 
                text-align: center;
                padding: 20px;
              }
              .spinner {
                width: 50px;
                height: 50px;
                margin: 0 auto 1rem;
                border: 4px solid rgba(255,255,255,0.3);
                border-top-color: white;
                border-radius: 50%;
                animation: spin 1s linear infinite;
              }
              @keyframes spin { to { transform: rotate(360deg); } }
              h2 {
                font-size: 1.5rem;
                margin-bottom: 0.5rem;
              }
              p {
                font-size: 1rem;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div style="font-size: 4rem; margin-bottom: 1rem;">📘</div>
              <div class="spinner"></div>
              <h2>${t('facebook.connecting')}</h2>
              <p>${t('common.loading')}</p>
            </div>
          </body>
        </html>
      `);

      const response = await fetch('/api/facebook/auth');
      const data = await response.json();
      
      if (!response.ok || !data.authUrl) {
        popup.close();
        throw new Error(t('facebook.errorAuth'));
      }

      popup.location.href = data.authUrl;

      const checkPopup = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkPopup);
          setConnecting(false);
          setTimeout(() => {
            loadFacebookData();
          }, 1000);
        }
      }, 500);

    } catch (error: any) {
      console.error('Error connecting to Facebook:', error);
      alert(`❌ ${t('common.error')}: ${error.message}`);
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm(t('facebook.confirmDisconnect'))) return;

    setDisconnecting(true);
    try {
      const response = await fetch('/api/facebook/disconnect', {
        method: 'POST',
      });

      if (!response.ok) throw new Error(t('common.error'));

      alert(t('facebook.disconnectedSuccess'));
      loadFacebookData();
    } catch (err: any) {
      alert(`❌ ${err.message}`);
    } finally {
      setDisconnecting(false);
    }
  };

  const handleSaveAISettings = async () => {
    setSavingSettings(true);
    try {
      const response = await fetch('/api/facebook/ai-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(aiSettings)
      });

      if (response.ok) {
        alert(t('facebook.configSaved'));
      } else {
        throw new Error(t('common.error'));
      }
    } catch (err: any) {
      alert(`❌ ${err.message}`);
    } finally {
      setSavingSettings(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <MobileLayout title={t('facebook.title')} showBack={true} showTabs={true}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center py-12">
            <div className="text-5xl mb-4 animate-pulse">📘</div>
            <div className="text-lg" style={{ color: '#0F172A' }}>
              {t('facebook.loading')}
            </div>
          </div>
        </div>
      </MobileLayout>
    );
  }

  if (!session) return null;

  const templateOptions = [
    { value: 'moderna', label: t('facebook.modern') },
    { value: 'elegante', label: t('facebook.elegant') },
    { value: 'minimalista', label: t('facebook.minimalist') },
    { value: 'vibrante', label: t('facebook.vibrant') }
  ];

  return (
    <MobileLayout title={t('facebook.title')} showBack={true} showTabs={true}>
      <div className="px-4 pt-4 pb-24 space-y-4">
        {/* Info Card */}
        <div 
          className="rounded-2xl p-4 shadow-lg"
          style={{ backgroundColor: '#EFF6FF', borderLeft: '4px solid #1877F2' }}
        >
          <p className="text-sm font-semibold" style={{ color: '#1E40AF' }}>
            🎯<strong>{t('currency.important')}:</strong> {t('facebook.importantNote')}
          </p>
        </div>

        {/* Status Card */}
        <div 
          className="rounded-2xl p-5 shadow-lg"
          style={{ backgroundColor: '#FFFFFF' }}
        >
          <h3 className="font-bold text-lg mb-4" style={{ color: '#0F172A' }}>
            📘 {t('facebook.connectionStatus')}
          </h3>

          {facebookData.connected ? (
            <div className="space-y-4">
              {/* Connected Status */}
              <div 
                className="p-4 rounded-xl border-2"
                style={{ backgroundColor: '#D1FAE5', borderColor: '#10B981' }}
              >
                <div className="flex items-start gap-3">
                  <span className="text-3xl">✅</span>
                  <div className="flex-1">
                    <p className="font-bold mb-1" style={{ color: '#065F46' }}>
                      {t('facebook.connected')}
                    </p>
                    <p className="text-sm font-semibold" style={{ color: '#065F46' }}>
                      {t('facebook.page')}: {facebookData.pageName}
                    </p>
                    {facebookData.connectedAt && (
                      <p className="text-xs mt-1 opacity-70" style={{ color: '#065F46' }}>
                        {t('facebook.connectedOn')} {new Date(facebookData.connectedAt).toLocaleDateString('es-ES', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Info sobre publicación */}
              <div 
                className="p-3 rounded-xl text-sm"
                style={{ backgroundColor: '#F0F9FF', color: '#0369A1' }}
              >
                <p className="font-semibold mb-1">📌 {t('facebook.howToPublish')}:</p>
                <ul className="space-y-1 text-xs ml-4 list-disc">
                  <li>{t('facebook.step1')}</li>
                  <li>{t('facebook.step2')}</li>
                  <li>{t('facebook.step3')}</li>
                </ul>
              </div>

              {/* Disconnect Button */}
              <button
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="w-full py-3 rounded-xl font-bold border-2 active:scale-95 transition-transform disabled:opacity-50"
                style={{ 
                  borderColor: '#DC2626',
                  color: '#DC2626',
                  backgroundColor: '#FFFFFF'
                }}
              >
                {disconnecting ? t('facebook.disconnecting') : `🔌 ${t('facebook.disconnect')}`}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Not Connected Status */}
              <div 
                className="p-4 rounded-xl border-2 text-center"
                style={{ backgroundColor: '#FEF3C7', borderColor: '#F59E0B' }}
              >
                <div className="text-5xl mb-3">📘</div>
                <p className="font-bold mb-1" style={{ color: '#92400E' }}>
                  {t('facebook.notConnected')}
                </p>
                <p className="text-sm opacity-80" style={{ color: '#92400E' }}>
                  {t('facebook.notConnectedDesc')}
                </p>
              </div>

              {/* Requirements */}
              <div 
                className="p-3 rounded-xl text-sm"
                style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}
              >
                <p className="font-semibold mb-2">📋 {t('facebook.requirements')}:</p>
                <ul className="space-y-1 text-xs ml-4 list-disc">
                  <li>{t('facebook.req1')}</li>
                  <li>{t('facebook.req2')}</li>
                  <li>{t('facebook.req3')}</li>
                </ul>
              </div>

              {/* Connect Button */}
              <button
                onClick={handleFacebookConnect}
                disabled={connecting}
                className="w-full py-3 rounded-xl font-bold text-white shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ backgroundColor: '#1877F2' }}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                {connecting ? t('facebook.connecting') : t('facebook.connectButton')}
              </button>
            </div>
          )}
        </div>

        {/* ========================================
            FUNCIONALIDAD TEMPORALMENTE DESHABILITADA
            "Enhance your posts with AI"
            Se volverá a habilitar después del MVP
        ======================================== */}
        {/* {facebookData.connected && (
          <div 
            className="rounded-2xl p-5 shadow-lg"
            style={{ backgroundColor: '#FFFFFF' }}
          >
            <h3 className="font-bold text-lg mb-4" style={{ color: '#0F172A' }}>
              ✨ {t('facebook.aiTitle')}
            </h3>

            <div className="mb-4 p-4 rounded-xl" style={{ backgroundColor: '#F0F9FF' }}>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={aiSettings.enabled}
                  onChange={(e) => setAiSettings({ ...aiSettings, enabled: e.target.checked })}
                  className="w-5 h-5 rounded accent-blue-600"
                />
                <div>
                  <p className="font-semibold" style={{ color: '#0F172A' }}>
                    {t('facebook.aiToggleTitle')}
                  </p>
                  <p className="text-xs opacity-70" style={{ color: '#0F172A' }}>
                    {t('facebook.aiToggleDesc')}
                  </p>
                </div>
              </label>
            </div>

            {aiSettings.enabled && (
              <div className="space-y-4 mb-4">
                <div>
                  <p className="font-semibold mb-2" style={{ color: '#0F172A' }}>
                    🎨 {t('facebook.brandColors')}
                  </p>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="text-xs opacity-70 block mb-1" style={{ color: '#0F172A' }}>
                        {t('facebook.primaryColor')}
                      </label>
                      <input
                        type="color"
                        value={aiSettings.colorPrimary}
                        onChange={(e) => setAiSettings({ ...aiSettings, colorPrimary: e.target.value })}
                        className="w-full h-12 rounded-lg border-2 cursor-pointer"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs opacity-70 block mb-1" style={{ color: '#0F172A' }}>
                        {t('facebook.secondaryColor')}
                      </label>
                      <input
                        type="color"
                        value={aiSettings.colorSecondary}
                        onChange={(e) => setAiSettings({ ...aiSettings, colorSecondary: e.target.value })}
                        className="w-full h-12 rounded-lg border-2 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <p className="font-semibold mb-2" style={{ color: '#0F172A' }}>
                    📐 {t('facebook.designStyle')}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {templateOptions.map((template) => (
                      <button
                        key={template.value}
                        onClick={() => setAiSettings({ ...aiSettings, template: template.value })}
                        className={`p-3 rounded-lg border-2 text-sm font-semibold transition-all ${
                          aiSettings.template === template.value
                            ? 'border-blue-600 bg-blue-50'
                            : 'border-gray-200 bg-white'
                        }`}
                        style={{
                          color: aiSettings.template === template.value ? '#1E40AF' : '#0F172A'
                        }}
                      >
                        {template.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={handleSaveAISettings}
              disabled={savingSettings}
              className="w-full py-3 rounded-xl font-bold text-white shadow-lg active:scale-95 transition-transform disabled:opacity-50"
              style={{ backgroundColor: '#10B981' }}
            >
              {savingSettings ? t('watermark.saving') : `💾 ${t('facebook.saveConfig')}`}
            </button>
          </div>
        )} */}

        {/* Help Card */}
        <div 
          className="rounded-2xl p-5 shadow-lg"
          style={{ backgroundColor: '#FFFFFF' }}
        >
          <h3 className="font-bold text-lg mb-3" style={{ color: '#0F172A' }}>
            ❓ {t('facebook.faqTitle')}
          </h3>

          <div className="space-y-3 text-sm">
            <div>
              <p className="font-semibold mb-1" style={{ color: '#0F172A' }}>
                {t('facebook.faqQ1')}
              </p>
              <p className="text-xs opacity-70" style={{ color: '#0F172A' }}>
                {t('facebook.faqA1')}
              </p>
            </div>

            <div>
              <p className="font-semibold mb-1" style={{ color: '#0F172A' }}>
                {t('facebook.faqQ2')}
              </p>
              <p className="text-xs opacity-70" style={{ color: '#0F172A' }}>
                {t('facebook.faqA2')}
              </p>
            </div>

            <div>
              <p className="font-semibold mb-1" style={{ color: '#0F172A' }}>
                {t('facebook.faqQ3')}
              </p>
              <p className="text-xs opacity-70" style={{ color: '#0F172A' }}>
                {t('facebook.faqA3')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </MobileLayout>
  );
}