'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import MobileLayout from '@/components/MobileLayout';

export default function FacebookSettingsContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

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
      alert('✅ Facebook conectado exitosamente');
      loadFacebookData();
      router.replace('/settings/facebook');
    } else if (error) {
      const errorMessages: Record<string, string> = {
        denied: 'Acceso denegado. Por favor acepta los permisos.',
        invalid: 'Error de autenticación. Intenta de nuevo.',
        no_pages: 'No tienes páginas de Facebook. Crea una página primero.',
        server: 'Error del servidor. Intenta más tarde.',
      };
      alert(`❌ ${errorMessages[error] || 'Error desconocido'}`);
      router.replace('/settings/facebook');
    }
  }, [searchParams]);

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
        alert('⚠️ Por favor permite ventanas emergentes para conectar con Facebook');
        setConnecting(false);
        return;
      }

      popup.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
            <title>Conectando...</title>
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
              <h2>Conectando con Facebook...</h2>
              <p>Por favor espera</p>
            </div>
          </body>
        </html>
      `);

      const response = await fetch('/api/facebook/auth');
      const data = await response.json();
      
      if (!response.ok || !data.authUrl) {
        popup.close();
        throw new Error('Error al obtener URL de autenticación');
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
      alert(`❌ Error: ${error.message}`);
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('¿Desvincular tu página de Facebook?')) return;

    setDisconnecting(true);
    try {
      const response = await fetch('/api/facebook/disconnect', {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Error al desvincular');

      alert('✅ Página desvinculada');
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
        alert('✅ Configuración guardada');
      } else {
        throw new Error('Error al guardar');
      }
    } catch (err: any) {
      alert(`❌ ${err.message}`);
    } finally {
      setSavingSettings(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <MobileLayout title="Facebook" showBack={true} showTabs={true}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center py-12">
            <div className="text-5xl mb-4 animate-pulse">📘</div>
            <div className="text-lg" style={{ color: '#0F172A' }}>Cargando...</div>
          </div>
        </div>
      </MobileLayout>
    );
  }

  if (!session) return null;

  return (
    <MobileLayout title="Facebook" showBack={true} showTabs={true}>
      <div className="px-4 pt-4 pb-24 space-y-4">
        {/* Info Card */}
        <div 
          className="rounded-2xl p-4 shadow-lg"
          style={{ backgroundColor: '#EFF6FF', borderLeft: '4px solid #1877F2' }}
        >
          <p className="text-sm font-semibold" style={{ color: '#1E40AF' }}>
            💡 <strong>Tip:</strong> Conecta tu página de Facebook para publicar tus propiedades 
            automáticamente con un solo click desde el dashboard.
          </p>
        </div>

        {/* Status Card */}
        <div 
          className="rounded-2xl p-5 shadow-lg"
          style={{ backgroundColor: '#FFFFFF' }}
        >
          <h3 className="font-bold text-lg mb-4" style={{ color: '#0F172A' }}>
            📘 Estado de Conexión
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
                      Conectado
                    </p>
                    <p className="text-sm font-semibold" style={{ color: '#065F46' }}>
                      Página: {facebookData.pageName}
                    </p>
                    {facebookData.connectedAt && (
                      <p className="text-xs mt-1 opacity-70" style={{ color: '#065F46' }}>
                        Conectado el {new Date(facebookData.connectedAt).toLocaleDateString('es-ES', {
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
                <p className="font-semibold mb-1">📌 Cómo publicar:</p>
                <ul className="space-y-1 text-xs ml-4 list-disc">
                  <li>Ve al Dashboard</li>
                  <li>Click en el botón de Facebook en cualquier propiedad</li>
                  <li>¡Tu propiedad se publicará automáticamente!</li>
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
                {disconnecting ? 'Desvinculando...' : '🔌 Desvincular Facebook'}
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
                  No conectado
                </p>
                <p className="text-sm opacity-80" style={{ color: '#92400E' }}>
                  Conecta tu página de Facebook para empezar a publicar
                </p>
              </div>

              {/* Requirements */}
              <div 
                className="p-3 rounded-xl text-sm"
                style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}
              >
                <p className="font-semibold mb-2">📋 Requisitos:</p>
                <ul className="space-y-1 text-xs ml-4 list-disc">
                  <li>Tener una Página de Facebook (no perfil personal)</li>
                  <li>Ser administrador de la página</li>
                  <li>Aceptar los permisos solicitados</li>
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
                {connecting ? 'Abriendo Facebook...' : 'Conectar con Facebook'}
              </button>
            </div>
          )}
        </div>

        {facebookData.connected && (
          <div 
            className="rounded-2xl p-5 shadow-lg"
            style={{ backgroundColor: '#FFFFFF' }}
          >
            <h3 className="font-bold text-lg mb-4" style={{ color: '#0F172A' }}>
              ✨ Mejora tus Publicaciones con IA
            </h3>

            {/* Toggle para activar IA */}
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
                    Generar diseños automáticos
                  </p>
                  <p className="text-xs opacity-70" style={{ color: '#0F172A' }}>
                    La primera imagen se convertirá en un flyer profesional con tu marca
                  </p>
                </div>
              </label>
            </div>

            {/* Opciones de configuración (solo visible si está habilitado) */}
            {aiSettings.enabled && (
              <div className="space-y-4 mb-4">
                {/* Selector de colores */}
                <div>
                  <p className="font-semibold mb-2" style={{ color: '#0F172A' }}>
                    🎨 Colores de tu marca
                  </p>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="text-xs opacity-70 block mb-1" style={{ color: '#0F172A' }}>
                        Color principal
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
                        Color secundario
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

                {/* Selector de plantilla */}
                <div>
                  <p className="font-semibold mb-2" style={{ color: '#0F172A' }}>
                    📐 Estilo de diseño
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {['moderna', 'elegante', 'minimalista', 'vibrante'].map((template) => (
                      <button
                        key={template}
                        onClick={() => setAiSettings({ ...aiSettings, template })}
                        className={`p-3 rounded-lg border-2 text-sm font-semibold transition-all ${
                          aiSettings.template === template
                            ? 'border-blue-600 bg-blue-50'
                            : 'border-gray-200 bg-white'
                        }`}
                        style={{
                          color: aiSettings.template === template ? '#1E40AF' : '#0F172A'
                        }}
                      >
                        {template.charAt(0).toUpperCase() + template.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ✅ BOTÓN GUARDAR MOVIDO AQUÍ - SIEMPRE VISIBLE */}
            <button
              onClick={handleSaveAISettings}
              disabled={savingSettings}
              className="w-full py-3 rounded-xl font-bold text-white shadow-lg active:scale-95 transition-transform disabled:opacity-50"
              style={{ backgroundColor: '#10B981' }}
            >
              {savingSettings ? 'Guardando...' : '💾 Guardar Configuración'}
            </button>
          </div>
        )}

        {/* Help Card */}
        <div 
          className="rounded-2xl p-5 shadow-lg"
          style={{ backgroundColor: '#FFFFFF' }}
        >
          <h3 className="font-bold text-lg mb-3" style={{ color: '#0F172A' }}>
            ❓ Preguntas Frecuentes
          </h3>

          <div className="space-y-3 text-sm">
            <div>
              <p className="font-semibold mb-1" style={{ color: '#0F172A' }}>
                ¿Qué tipo de cuenta necesito?
              </p>
              <p className="text-xs opacity-70" style={{ color: '#0F172A' }}>
                Necesitas una <strong>Página de Facebook</strong>, no un perfil personal. 
                Las páginas son para negocios y profesionales.
              </p>
            </div>

            <div>
              <p className="font-semibold mb-1" style={{ color: '#0F172A' }}>
                ¿Es seguro conectar mi página?
              </p>
              <p className="text-xs opacity-70" style={{ color: '#0F172A' }}>
                Sí, solo solicitamos permisos para publicar. No podemos ver mensajes 
                privados ni información personal.
              </p>
            </div>

            <div>
              <p className="font-semibold mb-1" style={{ color: '#0F172A' }}>
                ¿Puedo cambiar de página?
              </p>
              <p className="text-xs opacity-70" style={{ color: '#0F172A' }}>
                Sí, desvincula la actual y conecta otra página cuando quieras.
              </p>
            </div>
          </div>
        </div>
      </div>
    </MobileLayout>
  );
}