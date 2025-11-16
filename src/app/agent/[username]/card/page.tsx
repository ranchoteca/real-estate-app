'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';

interface AgentCard {
  display_name: string;
  brokerage: string | null;
  bio: string | null;
  profile_photo: string | null;
  cover_photo: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
}

interface Agent {
  username: string;
  email: string;
  phone: string | null;
}

export default function AgentCardPage() {
  const params = useParams();
  const username = params.username as string;

  const [card, setCard] = useState<AgentCard | null>(null);
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (username) {
      loadCard();
    }
  }, [username]);

  const loadCard = async () => {
    try {
      const response = await fetch(`/api/agent-card/get?username=${username}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('Agente no encontrado');
        } else {
          setError('Error al cargar la tarjeta');
        }
        return;
      }

      const data = await response.json();
      setCard(data.card);
      setAgent(data.agent);

      if (!data.card) {
        setError('Este agente aún no ha configurado su tarjeta digital');
      }
    } catch (err) {
      console.error('Error loading card:', err);
      setError('Error al cargar la tarjeta');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    const text = `Tarjeta digital de ${card?.display_name || 'agente inmobiliario'}`;

    // Intentar usar la API nativa de compartir (móvil)
    if (navigator.share) {
      try {
        await navigator.share({
          title: text,
          url: url
        });
        return;
      } catch (err) {
        // Si el usuario cancela, no hacer nada
        if ((err as Error).name !== 'AbortError') {
          console.log('Error sharing:', err);
        }
      }
    }

    // Fallback: copiar al portapapeles
    try {
      await navigator.clipboard.writeText(url);
      alert('✅ Enlace copiado al portapapeles');
    } catch (err) {
      console.error('Error copying:', err);
      alert('❌ No se pudo copiar el enlace');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F8FAFC' }}>
        <div className="text-center">
          <div className="text-7xl mb-4 animate-pulse">📇</div>
          <p className="text-lg" style={{ color: '#0F172A' }}>Cargando...</p>
        </div>
      </div>
    );
  }

  if (error || !card || !agent) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F8FAFC' }}>
        <div className="text-center px-6">
          <div className="text-5xl mb-4">❌</div>
          <h1 className="text-2xl font-bold mb-2" style={{ color: '#0F172A' }}>
            {error || 'Tarjeta no disponible'}
          </h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F8FAFC' }}>
      {/* Card Container */}
      <div className="max-w-2xl mx-auto">
        <div className="overflow-hidden">
          {/* Cover Photo */}
          <div className="relative h-48 bg-gradient-to-br from-blue-500 to-purple-600">
            {card.cover_photo && (
              <Image
                src={card.cover_photo}
                alt="Cover"
                fill
                className="object-cover"
                priority
              />
            )}
          </div>

          {/* Profile Section */}
          <div className="px-6 pb-6" style={{ backgroundColor: '#FFFFFF' }}>
            <div className="flex flex-col items-center" style={{ marginTop: '-64px' }}>
              {/* Profile Photo - Con z-index para que esté encima */}
              <div className="w-32 h-32 rounded-full border-4 border-white bg-gray-200 overflow-hidden shadow-xl mb-4" style={{ position: 'relative', zIndex: 10 }}>
                {card.profile_photo ? (
                  <Image
                    src={card.profile_photo}
                    alt={card.display_name}
                    width={128}
                    height={128}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-6xl">
                    👤
                  </div>
                )}
              </div>

              {/* Name and Brokerage */}
              <h1 className="text-3xl font-bold text-center mb-1" style={{ color: '#0F172A' }}>
                {card.display_name}
              </h1>
              
              {card.brokerage && (
                <p className="text-lg opacity-70 text-center mb-4" style={{ color: '#0F172A' }}>
                  {card.brokerage}
                </p>
              )}

              {/* Bio */}
              {card.bio && (
                <p className="text-center opacity-80 leading-relaxed mb-6" style={{ color: '#0F172A' }}>
                  {card.bio}
                </p>
              )}
            </div>

            {/* Contact Buttons */}
            <div className="space-y-3">
              {agent.phone && (
                <>
                  <a
                    href={`tel:${agent.phone}`}
                    className="block w-full py-4 rounded-xl font-bold text-white text-center shadow-lg active:scale-95 transition-transform text-lg"
                    style={{ backgroundColor: '#2563EB' }}
                  >
                    📞 Llamar
                  </a>

                  <a
                    href={`https://wa.me/${agent.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola ${card.display_name}, vi tu tarjeta digital y me gustaría contactarte`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full py-4 rounded-xl font-bold text-white text-center shadow-lg active:scale-95 transition-transform text-lg"
                    style={{ backgroundColor: '#25D366' }}
                  >
                    💬 WhatsApp
                  </a>
                </>
              )}

              <a
                href={`mailto:${agent.email}?subject=${encodeURIComponent(`Contacto desde tarjeta digital`)}`}
                className="block w-full py-4 rounded-xl font-bold text-white text-center shadow-lg active:scale-95 transition-transform text-lg"
                style={{ backgroundColor: '#EA4335' }}
              >
                ✉️ Email
              </a>

              <a
                href={`/agent/${agent.username}`}
                className="block w-full py-4 rounded-xl font-bold text-center border-2 shadow-lg active:scale-95 transition-transform text-lg"
                style={{
                  borderColor: '#2563EB',
                  color: '#2563EB',
                  backgroundColor: '#FFFFFF'
                }}
              >
                🏠 Ver Portafolio
              </a>

              {/* Botón de Compartir */}
              <button
                onClick={handleShare}
                className="w-full py-4 rounded-xl font-bold text-center border-2 shadow-lg active:scale-95 transition-transform text-lg"
                style={{
                  borderColor: '#10B981',
                  color: '#10B981',
                  backgroundColor: '#FFFFFF'
                }}
              >
                🔗 Compartir enlace
              </button>
            </div>

            {/* Social Media */}
            {(card.facebook_url || card.instagram_url) && (
              <div className="mt-6 pt-6 border-t" style={{ borderColor: '#E5E7EB' }}>
                <p className="text-sm font-semibold mb-3 text-center opacity-70" style={{ color: '#0F172A' }}>
                  Sígueme en redes
                </p>
                <div className="flex justify-center gap-4">
                  {card.facebook_url && (
                    <a
                      href={card.facebook_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-12 h-12 rounded-full flex items-center justify-center text-2xl shadow-lg active:scale-90 transition-transform"
                      style={{ backgroundColor: '#1877F2' }}
                    >
                      <span className="text-white">f</span>
                    </a>
                  )}
                  {card.instagram_url && (
                    <a
                      href={card.instagram_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-12 h-12 rounded-full flex items-center justify-center text-2xl shadow-lg active:scale-90 transition-transform"
                      style={{ background: 'linear-gradient(45deg, #f09433 0%,#e6683c 25%,#dc2743 50%,#cc2366 75%,#bc1888 100%)' }}
                    >
                      <span className="text-white">📷</span>
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Branding Footer */}
            <div className="text-center mt-8 pt-6 border-t" style={{ borderColor: '#E5E7EB' }}>
              <p className="text-sm opacity-50" style={{ color: '#0F172A' }}>
                Creado con ❤️ por Flow Estate AI
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}