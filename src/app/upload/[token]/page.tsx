'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import MobileLayout from '@/components/MobileLayout';

export default function UploadWithTokenPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [validating, setValidating] = useState(true);
  const [valid, setValid] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agentName, setAgentName] = useState('');

  useEffect(() => {
    validateToken();
  }, [token]);

  const validateToken = async () => {
    try {
      const response = await fetch('/api/upload-token/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (!response.ok || !data.valid) {
        setError(data.error || 'Token inválido');
        setValid(false);
      } else {
        setValid(true);
        setAgentName(data.agentName);
        
        // Guardar token en sessionStorage
        sessionStorage.setItem('upload_token', token);
      }
    } catch (err) {
      setError('Error al validar token');
      setValid(false);
    } finally {
      setValidating(false);
    }
  };

  if (validating) {
    return (
      <MobileLayout title="Validando..." showBack={false} showTabs={false}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="text-6xl mb-4 animate-pulse">🔐</div>
            <p className="text-lg font-semibold text-gray-900">Validando acceso...</p>
          </div>
        </div>
      </MobileLayout>
    );
  }

  if (!valid) {
    return (
      <MobileLayout title="Acceso Denegado" showBack={false} showTabs={false}>
        <div className="flex items-center justify-center h-full p-4">
          <div className="text-center max-w-md">
            <div className="text-6xl mb-4">❌</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Acceso Denegado</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <p className="text-sm text-gray-500">
              El enlace puede estar expirado, revocado o ser inválido.
            </p>
          </div>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout title={`Subir para ${agentName}`} showBack={false} showTabs={false}>
      <div className="p-4">
        <div className="bg-green-50 border-2 border-green-300 rounded-2xl p-4 mb-6">
          <h3 className="font-bold text-green-900 mb-2 flex items-center gap-2">
            <span>✅</span> Acceso Autorizado
          </h3>
          <p className="text-sm text-green-800">
            Puedes subir propiedades en nombre de <strong>{agentName}</strong>
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => router.push(`/upload/${token}/create`)}
            className="flex-1 py-4 rounded-xl font-bold text-white shadow-lg"
            style={{ backgroundColor: '#2563EB' }}
          >
            📝 Crear Propiedad
          </button>
        </div>
      </div>
    </MobileLayout>
  );
}