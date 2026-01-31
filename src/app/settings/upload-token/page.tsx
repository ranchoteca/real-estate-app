'use client';

import { useEffect, useState } from 'react';
import MobileLayout from '@/components/MobileLayout';
import { useRouter } from 'next/navigation';

export default function UploadTokenPage() {
  const router = useRouter();
  const [tokens, setTokens] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadTokens();
  }, []);

  const loadTokens = async () => {
    try {
      const response = await fetch('/api/upload-token/list');
      const data = await response.json();
      setTokens(data.tokens || []);
    } catch (err) {
      console.error('Error cargando tokens:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const response = await fetch('/api/upload-token/generate', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      // Copiar URL al portapapeles
      await navigator.clipboard.writeText(data.url);

      alert(`✅ Enlace copiado al portapapeles!\n\nEnvíalo por WhatsApp y expira en 7 días.`);

      loadTokens();
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleRevoke = async (tokenId: string) => {
    if (!confirm('¿Revocar este enlace? Ya no funcionará.')) return;

    try {
      await fetch('/api/upload-token/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokenId }),
      });

      loadTokens();
    } catch (err) {
      alert('Error al revocar');
    }
  };

  const copyUrl = async (token: string) => {
    const url = `${window.location.origin}/upload/${token}`;
    await navigator.clipboard.writeText(url);
    alert('✅ Enlace copiado al portapapeles!');
  };

  return (
    <MobileLayout title="Enlace de Carga" showBack={true} showTabs={true}>
      <div className="p-4 space-y-4">
        <div className="bg-blue-50 border-2 border-blue-300 rounded-2xl p-4">
          <h3 className="font-bold text-blue-900 mb-2">
            🔗 ¿Qué es esto?
          </h3>
          <p className="text-sm text-blue-800">
            Genera un enlace temporal para que alguien pueda subir propiedades en tu nombre.
            Útil si necesitas ayuda para cargar tu portafolio.
          </p>
        </div>

        <button
          onClick={handleGenerate}
          disabled={generating}
          className="w-full py-4 rounded-xl font-bold text-white shadow-lg disabled:opacity-50"
          style={{ backgroundColor: '#8B5CF6' }}
        >
          {generating ? '⏳ Generando...' : '➕ Generar Nuevo Enlace'}
        </button>

        {loading ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-2 animate-pulse">🔐</div>
            <p className="text-gray-600">Cargando enlaces...</p>
          </div>
        ) : tokens.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-5xl mb-3">📭</div>
            <p className="font-semibold text-gray-900">No tienes enlaces activos</p>
            <p className="text-sm text-gray-600 mt-1">Genera uno cuando necesites ayuda</p>
          </div>
        ) : (
          <div className="space-y-3">
            <h3 className="font-bold text-gray-900">Enlaces Activos ({tokens.length})</h3>
            
            {tokens.map(token => (
              <div key={token.id} className="bg-white border-2 rounded-xl p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500 mb-1">
                      Creado: {new Date(token.created_at).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-gray-500">
                      Expira: {new Date(token.expires_at).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      Usado {token.used_count} veces
                    </p>
                  </div>
                  <button
                    onClick={() => handleRevoke(token.id)}
                    className="px-3 py-1 rounded-lg text-xs font-semibold bg-red-100 text-red-700"
                  >
                    Revocar
                  </button>
                </div>
                
                <button
                  onClick={() => copyUrl(token.token)}
                  className="w-full py-2 rounded-lg font-semibold bg-blue-500 text-white text-sm"
                >
                  📋 Copiar Enlace
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </MobileLayout>
  );
}