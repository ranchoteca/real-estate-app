'use client';

import { useEffect, useState } from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  propertyId: string;
}

export default function FacebookPublishModal({ isOpen, onClose, propertyId }: Props) {
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('Iniciando...');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [postUrl, setPostUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Reset estados
    setProgress(0);
    setMessage('Iniciando...');
    setError(null);
    setSuccess(false);
    setPostUrl(null);

    // Conectar con SSE
    const eventSource = new EventSource(`/api/facebook/publish?propertyId=${propertyId}`);

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.progress) setProgress(data.progress);
      if (data.message) setMessage(data.message);
      if (data.error) {
        setError(data.error);
        eventSource.close();
      }
      if (data.success) {
        setSuccess(true);
        setPostUrl(data.postUrl);
        eventSource.close();
      }
    };

    eventSource.onerror = () => {
      setError('Error de conexión');
      eventSource.close();
    };

    return () => eventSource.close();
  }, [isOpen, propertyId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
        {!error && !success && (
          <>
            <h3 className="text-xl font-bold mb-4 text-center" style={{ color: '#0F172A' }}>
              📘 Publicando en Facebook
            </h3>

            {/* Barra de progreso */}
            <div className="mb-4">
              <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-center mt-2 text-sm font-semibold" style={{ color: '#1877F2' }}>
                {progress}%
              </p>
            </div>

            <p className="text-center text-sm" style={{ color: '#0F172A' }}>
              {message}
            </p>

            {/* Spinner */}
            <div className="flex justify-center mt-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          </>
        )}

        {error && (
          <div className="text-center">
            <div className="text-5xl mb-3">❌</div>
            <h3 className="text-xl font-bold mb-2" style={{ color: '#DC2626' }}>
              Error al publicar
            </h3>
            <p className="text-sm mb-4" style={{ color: '#0F172A' }}>
              {error}
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-200 rounded-lg font-semibold"
              style={{ color: '#0F172A' }}
            >
              Cerrar
            </button>
          </div>
        )}

        {success && (
          <div className="text-center">
            <div className="text-5xl mb-3">✅</div>
            <h3 className="text-xl font-bold mb-2" style={{ color: '#10B981' }}>
              ¡Publicado exitosamente!
            </h3>
            <p className="text-sm mb-4" style={{ color: '#0F172A' }}>
              Tu propiedad ya está en Facebook
            </p>
            <div className="flex gap-2 justify-center">
              {postUrl && (
                <a
                  href={postUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold"
                >
                  Ver publicación
                </a>
              )}
              <button
                onClick={onClose}
                className="px-6 py-2 bg-gray-200 rounded-lg font-semibold"
                style={{ color: '#0F172A' }}
              >
                Cerrar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
