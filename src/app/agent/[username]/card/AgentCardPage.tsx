'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import es from '@/locales/es.json';
import en from '@/locales/en.json';

interface AgentCard {
  display_name: string;
  brokerage: string | null;
  bio: string | null;
  display_name_en: string | null;
  brokerage_en: string | null;
  bio_en: string | null;
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

type Language = 'es' | 'en';

const translations = { es, en };

export default function AgentCardPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const username = params.username as string;

  const [card, setCard] = useState<AgentCard | null>(null);
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const urlLang = searchParams.get('lang') as Language | null;
  const browserLang = typeof navigator !== 'undefined' 
    ? (navigator.language.split('-')[0] === 'en' ? 'en' : 'es') 
    : 'es';
  const [language, setLanguage] = useState<Language>(urlLang || browserLang);

  const t = (key: string): string => {
    const keys = key.split('.');
    let value: any = translations[language];
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return key;
      }
    }
    return typeof value === 'string' ? value : key;
  };

  // Detectar si es el agente viendo su propia tarjeta
  const isOwnCard = session?.user?.email === agent?.email;

  useEffect(() => {
    if (username) {
      loadCard();
    }
  }, [username]);

  useEffect(() => {
    if (!loading && card) {
      const url = new URL(window.location.href);
      url.searchParams.set('lang', language);
      window.history.replaceState({}, '', url.toString());
    }
  }, [language, loading, card]);

  const loadCard = async () => {
    try {
      const response = await fetch(`/api/agent-card/get?username=${username}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          setError(t('agentCard.notFound'));
        } else {
          setError(t('agentCard.errorLoading'));
        }
        return;
      }

      const data = await response.json();
      setCard(data.card);
      setAgent(data.agent);

      if (!data.card) {
        setError(t('agentCard.notConfigured'));
      }
    } catch (err) {
      console.error('Error loading card:', err);
      setError(t('agentCard.errorLoading'));
    } finally {
      setLoading(false);
    }
  };

  const handleCopyFullInfo = async () => {
    if (!card || !agent) return;

    const displayName = language === 'en' && card.display_name_en 
      ? card.display_name_en 
      : card.display_name;
    
    const brokerage = language === 'en' && card.brokerage_en 
      ? card.brokerage_en 
      : card.brokerage;
    
    const bio = language === 'en' && card.bio_en 
      ? card.bio_en 
      : card.bio;

    const cardUrl = `${window.location.origin}/agent/${agent.username}/card?lang=${language}`;

    // Construir texto formateado
    let fullText = `👤 ${displayName}\n`;
    
    if (brokerage) {
      fullText += `🏢 ${brokerage}\n`;
    }
    
    if (agent.phone) {
      fullText += `📱 ${agent.phone}\n`;
    }
    
    fullText += '\n';
    
    if (bio) {
      // Limitar bio a 150 caracteres si es muy larga
      const shortBio = bio.length > 150 ? bio.substring(0, 150) + '...' : bio;
      fullText += `${shortBio}\n\n`;
    }
    
    fullText += `📇 ${t('agentCard.myDigitalCard')}:\n${cardUrl}`;

    try {
      await navigator.clipboard.writeText(fullText);
      alert(t('agentCard.infoCopied'));
    } catch (err) {
      console.error('Error copying:', err);
      alert(t('agentCard.linkCopyError'));
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    const displayName = language === 'en' && card?.display_name_en 
      ? card.display_name_en 
      : card?.display_name || '';
    const text = language === 'en' 
      ? `Digital card of ${displayName}` 
      : `Tarjeta digital de ${displayName}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: text, url });
        return;
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.log('Error sharing:', err);
        }
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      alert(t('agentCard.linkCopied'));
    } catch (err) {
      console.error('Error copying:', err);
      alert(t('agentCard.linkCopyError'));
    }
  };

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'es' ? 'en' : 'es');
  };

  const getDisplayName = () => {
    if (language === 'en' && card?.display_name_en) {
      return card.display_name_en;
    }
    return card?.display_name || '';
  };

  const getBrokerage = () => {
    if (language === 'en' && card?.brokerage_en) {
      return card.brokerage_en;
    }
    return card?.brokerage || null;
  };

  const getBio = () => {
    if (language === 'en' && card?.bio_en) {
      return card.bio_en;
    }
    return card?.bio || null;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F8FAFC' }}>
        <div className="text-center">
          <div className="text-7xl mb-4 animate-pulse">📇</div>
          <p className="text-lg" style={{ color: '#0F172A' }}>{t('agentCard.loading')}</p>
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
            {error || t('agentCard.cardNotAvailable')}
          </h1>
        </div>
      </div>
    );
  }

  const displayName = getDisplayName();
  const brokerage = getBrokerage();
  const bio = getBio();

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F8FAFC' }}>
      <button
        onClick={toggleLanguage}
        className="fixed top-4 right-4 z-50 px-4 py-2 rounded-full shadow-lg font-bold flex items-center gap-2 active:scale-95 transition-transform"
        style={{ backgroundColor: '#FFFFFF', color: '#2563EB' }}
      >
        <span className="text-lg">{language === 'es' ? '🇪🇸' : '🇺🇸'}</span>
        <span className="text-sm">{language === 'es' ? 'ES' : 'EN'}</span>
      </button>

      <div className="max-w-2xl mx-auto">
        <div className="overflow-hidden">
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

          <div className="px-6 pb-6" style={{ backgroundColor: '#FFFFFF' }}>
            <div className="flex flex-col items-center" style={{ marginTop: '-64px' }}>
              <div className="w-32 h-32 rounded-full border-4 border-white bg-gray-200 overflow-hidden shadow-xl mb-4" style={{ position: 'relative', zIndex: 10 }}>
                {card.profile_photo ? (
                  <Image
                    src={card.profile_photo}
                    alt={displayName}
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

              <h1 className="text-3xl font-bold text-center mb-1" style={{ color: '#0F172A' }}>
                {displayName}
              </h1>
              
              {brokerage && (
                <p className="text-lg opacity-70 text-center mb-4" style={{ color: '#0F172A' }}>
                  {brokerage}
                </p>
              )}

              {bio && (
                <p className="text-center opacity-80 leading-relaxed mb-6" style={{ color: '#0F172A' }}>
                  {bio}
                </p>
              )}
            </div>

            <div className="space-y-3">
              {agent.phone && (
                <>
                  <a
                    href={`tel:${agent.phone}`}
                    className="block w-full py-4 rounded-xl font-bold text-white text-center shadow-lg active:scale-95 transition-transform text-lg"
                    style={{ backgroundColor: '#2563EB' }}
                  >
                    📞 {t('agentCard.call')}
                  </a>

                  <a
                    href={`https://wa.me/${agent.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
                      t('agentCard.whatsappMessage').replace('{name}', displayName)
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full py-4 rounded-xl font-bold text-white text-center shadow-lg active:scale-95 transition-transform text-lg"
                    style={{ backgroundColor: '#25D366' }}
                  >
                    💬 {t('agentCard.whatsapp')}
                  </a>
                </>
              )}

              <a
                href={`mailto:${agent.email}?subject=${encodeURIComponent(t('agentCard.contactSubject'))}`}
                className="block w-full py-4 rounded-xl font-bold text-white text-center shadow-lg active:scale-95 transition-transform text-lg"
                style={{ backgroundColor: '#EA4335' }}
              >
                ✉️ {t('agentCard.email')}
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
                🏠 {t('agentCard.viewPortfolio')}
              </a>

              {/* NUEVO: Botón Copiar Info Completa - Solo visible para el agente */}
              {isOwnCard && (
                <button
                  onClick={handleCopyFullInfo}
                  className="w-full py-4 rounded-xl font-bold text-center shadow-lg active:scale-95 transition-transform text-lg text-white"
                  style={{ backgroundColor: '#F59E0B' }}
                >
                  📋 {t('agentCard.copyFullInfo')}
                </button>
              )}

              <button
                onClick={handleShare}
                className="w-full py-4 rounded-xl font-bold text-center border-2 shadow-lg active:scale-95 transition-transform text-lg"
                style={{
                  borderColor: '#10B981',
                  color: '#10B981',
                  backgroundColor: '#FFFFFF'
                }}
              >
                🔗 {t('agentCard.shareLink')}
              </button>
            </div>

            {(card.facebook_url || card.instagram_url) && (
              <div className="mt-6 pt-6 border-t" style={{ borderColor: '#E5E7EB' }}>
                <p className="text-sm font-semibold mb-3 text-center opacity-70" style={{ color: '#0F172A' }}>
                  {t('agentCard.followMe')}
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

            <div className="text-center mt-8 pt-6 border-t" style={{ borderColor: '#E5E7EB' }}>
              <p className="text-sm opacity-50" style={{ color: '#0F172A' }}>
                {t('agentCard.createdWith')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}