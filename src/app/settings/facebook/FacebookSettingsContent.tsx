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
  const [facebookData, setFacebookData] = useState<{
    connected: boolean;
    pageName: string | null;
    connectedAt: string | null;
  }>({ connected: false, pageName: null, connectedAt: null });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (session) {
      loadFacebookData();
    }
  }, [session]);

  useEffect(() => {
    // Manejar callbacks de OAuth
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

  if (status === 'loading' || loading) {
    return (
      <MobileLayout title="Facebook" showBack={true} showTabs={false}>
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
    <MobileLayout title="Facebook" showBack={true} showTabs={false}>
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
              <a 
                href="/api/facebook/auth"
                onClick={(e) => {
                  e.preventDefault();
                  window.location.assign('/api/facebook/auth');
                }}
                className="w-full py-3 rounded-xl font-bold text-white shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2 no-underline block text-center"
                style={{ backgroundColor: '#1877F2' }}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                Conectar con Facebook
              </a>
            </div>
          )}
        </div>

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