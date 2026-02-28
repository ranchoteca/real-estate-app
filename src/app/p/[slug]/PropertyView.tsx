'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import GeneratingPDFModal from '@/components/GeneratingPDFModal';
import MobileLayout from '@/components/MobileLayout';
import dynamic from 'next/dynamic';
import { useI18nStore } from '@/lib/i18n-store';

const GoogleMapEditor = dynamic(() => import('@/components/property/GoogleMapEditor'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-64 bg-gray-100 rounded-xl flex items-center justify-center">
      <div className="text-sm text-gray-600">Cargando mapa...</div>
    </div>
  ),
});

interface Property {
  id: string;
  title: string;
  description: string;
  price: number | null;
  currency_id: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  property_type: string | null;
  photos: string[] | null;
  status: string;
  views: number;
  created_at: string;
  listing_type: 'rent' | 'sale';
  language: 'es' | 'en'; // IMPORTANTE: idioma de la propiedad
  latitude: number | null;
  longitude: number | null;
  show_map: boolean;
  custom_fields_data: Record<string, string> | null;
  video_url: string | null;
  video_urls: string[] | null;
  agent: {
    name: string | null;
    full_name: string | null;
    phone: string | null;
    email: string;
    brokerage: string | null;
    profile_photo: string | null;
    username: string;
    watermark_logo: string | null;
  };
}

interface CustomField {
  id: string;
  field_key: string;   
  field_name: string;
  field_name_en: string | null;
  field_type: 'text' | 'number';
  icon: string;
}

// Detectar idioma del navegador del visitante
const detectBrowserLanguage = (): 'es' | 'en' => {
  if (typeof window === 'undefined') return 'es';
  const browserLang = navigator.language.toLowerCase();
  return browserLang.startsWith('es') ? 'es' : 'en';
};

const translatePropertyType = (type: string | null, lang: 'es' | 'en'): string => {
  const translations: Record<string, Record<'es' | 'en', string>> = {
    house: { es: 'Casa', en: 'House' },
    condo: { es: 'Condominio', en: 'Condo' },
    apartment: { es: 'Apartamento', en: 'Apartment' },
    land: { es: 'Terreno', en: 'Land' },
    commercial: { es: 'Comercial', en: 'Commercial' },
  };
  return type ? (translations[type]?.[lang] || type) : (lang === 'en' ? 'Property' : 'Propiedad');
};

export default function PropertyView() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const { language: pwaLanguage } = useI18nStore();
  const [interfaceLang, setInterfaceLang] = useState<'es' | 'en'>('es');
  const [isInPWA, setIsInPWA] = useState(false);
  const [property, setProperty] = useState<Property | null>(null);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [currency, setCurrency] = useState<any>(null);

  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [tikTokMode, setTikTokMode] = useState(false);
  const tikTokVideoRef = useRef<HTMLVideoElement>(null);
  const [tikTokPaused, setTikTokPaused] = useState(false);
  const [showSwipeHint, setShowSwipeHint] = useState(false);
  const tikTokContainerRef = useRef<HTMLDivElement>(null);

  const thumbnailRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    // Detectar si es PWA instalada
    const isPWA = window.matchMedia('(display-mode: standalone)').matches || 
                  (window.navigator as any).standalone === true;
    
    setIsInPWA(isPWA);
    
    if (isPWA) {
      // Si es PWA, usar el idioma configurado en la interfaz
      setInterfaceLang(pwaLanguage);
    } else {
      // Si es navegador, detectar idioma del navegador
      setInterfaceLang(detectBrowserLanguage());
    }
  }, [pwaLanguage]);

  useEffect(() => {
    if (slug) {
      loadProperty();
    }
  }, [slug]);

  useEffect(() => {
    const thumbnail = thumbnailRefs.current[selectedPhotoIndex];
    if (thumbnail) {
      thumbnail.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }, [selectedPhotoIndex]);

  const loadProperty = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/property/${slug}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          setError(interfaceLang === 'en' ? 'Property not found' : 'Propiedad no encontrada');
        } else {
          setError(interfaceLang === 'en' ? 'Error loading property' : 'Error al cargar la propiedad');
        }
        return;
      }
      
      const data = await response.json();
      setProperty(data.property);

      if (data.property.currency_id) {
        loadCurrency(data.property.currency_id);
      }

      if (data.property.property_type && data.property.listing_type && data.property.agent?.username) {
        loadCustomFields(
          data.property.property_type, 
          data.property.listing_type,
          data.property.agent.username
        );
      }
    } catch (err) {
      console.error('Error loading property:', err);
      setError(interfaceLang === 'en' ? 'Error loading property' : 'Error al cargar la propiedad');
    } finally {
      setLoading(false);
    }
  };

  const loadCurrency = async (currencyId: string) => {
    try {
      const response = await fetch('/api/currencies/list');
      if (response.ok) {
        const data = await response.json();
        const foundCurrency = data.currencies.find((c: any) => c.id === currencyId);
        setCurrency(foundCurrency);
      }
    } catch (error) {
      console.error('Error loading currency:', error);
    }
  };

  const loadCustomFields = async (propertyType: string, listingType: string, agentUsername: string) => {
    try {
      const response = await fetch(
        `/api/custom-fields/list?property_type=${propertyType}&listing_type=${listingType}&username=${agentUsername}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          cache: 'no-store',
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        const fields = data.fields || [];
        setCustomFields(fields);
      } else {
        setCustomFields([]);
      }
    } catch (err) {
      setCustomFields([]);
    }
  };

  const getCustomFieldValue = (fieldKey: string): string | null => {
    if (!property?.custom_fields_data) return null;
    return property.custom_fields_data[fieldKey] || null;
  };

  const getCustomFieldName = (field: CustomField): string => {
    // Los campos personalizados se muestran según el idioma de la PROPIEDAD
    if (property?.language === 'en' && field.field_name_en) {
      return field.field_name_en;
    }
    return field.field_name;
  };

  const formatPrice = (price: number | null) => {
    if (!price) {
      return interfaceLang === 'en' ? 'Price upon request' : 'Precio a consultar';
    }
    
    const symbol = currency?.symbol || '$';
    
    return `${symbol}${new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price)}`;
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    alert(interfaceLang === 'en' ? 'Link copied!' : '¡Link copiado!');
    setShowShareMenu(false);
  };

  const copyPropertyInfo = () => {
    if (!property) return;

    // Construir el texto formateado
    const listingTypeText = property.listing_type === 'rent' 
      ? (interfaceLang === 'en' ? '🏠 FOR RENT' : '🏠 PARA ALQUILER')
      : (interfaceLang === 'en' ? '💰 FOR SALE' : '💰 EN VENTA');

    const propertyTypeText = property.property_type 
      ? `🏡 ${translatePropertyType(property.property_type, interfaceLang)}`
      : '';

    // Descripción truncada (primeros 200-300 caracteres)
    const truncatedDescription = property.description.length > 250 
      ? property.description.substring(0, 250) + '...'
      : property.description;

    // Características especiales
    let featuresText = '';
    if (filledCustomFields.length > 0) {
      const featuresList = filledCustomFields
        .slice(0, 5) // Máximo 5 características para no hacer el texto muy largo
        .map(field => {
          const value = getCustomFieldValue(field.field_key);
          const name = getCustomFieldName(field);
          const icon = field.icon || '🏷️'; // Usar el icono del campo o un default
          return `  ${icon} ${name}: ${value}`;
        })
        .join('\n');
      
      featuresText = `\n\n${interfaceLang === 'en' ? '✨ SPECIAL FEATURES' : '✨ CARACTERÍSTICAS ESPECIALES'}\n${featuresList}`;
    }

    // Ubicación
    const locationParts = [property.address, property.city, property.state, property.zip_code]
      .filter(Boolean);
    const locationText = locationParts.length > 0 
      ? `📍 ${locationParts.join(', ')}`
      : '';

    // Información del agente
    const agentName = property.agent.full_name || property.agent.name || (interfaceLang === 'en' ? 'Agent' : 'Agente');
    const agentInfo = [
      `\n\n${interfaceLang === 'en' ? '👤 CONTACT AGENT' : '👤 CONTACTAR AGENTE'}`,
      agentName,
      property.agent.brokerage || '',
      property.agent.phone ? `📞 ${property.agent.phone}` : '',
      `✉️ ${property.agent.email}`
    ].filter(Boolean).join('\n');

    // Texto completo
    const fullText = `
  ${listingTypeText}${propertyTypeText ? ' | ' + propertyTypeText : ''}

  ${property.title}

  💵 ${formatPrice(property.price)}

  ${locationText}

  ${interfaceLang === 'en' ? '📝 DESCRIPTION' : '📝 DESCRIPCIÓN'}
  ${truncatedDescription}${featuresText}${agentInfo}

  🔗 ${interfaceLang === 'en' ? 'View full details:' : 'Ver detalles completos:'}
    ${window.location.href}
      `.trim();

      // Copiar al portapapeles
      navigator.clipboard.writeText(fullText)
        .then(() => {
          alert(interfaceLang === 'en' 
            ? '✅ Property info copied! Now you can paste it on Facebook or any social network.'
            : '✅ ¡Información copiada! Ahora puedes pegarla en Facebook o cualquier red social.');
          setShowShareMenu(false);
        })
        .catch(err => {
          console.error('Error copying to clipboard:', err);
          alert(interfaceLang === 'en' 
            ? '❌ Error copying info'
            : '❌ Error al copiar la información');
        });
  };

  const shareWhatsApp = () => {
    const text = `${property?.title} - ${formatPrice(property?.price)}`;
    const url = window.location.href;
    window.open(`https://wa.me/?text=${encodeURIComponent(text + '\n' + url)}`, '_blank');
    setShowShareMenu(false);
  };

  const shareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: property?.title,
          text: `${property?.title} - ${formatPrice(property?.price)}`,
          url: window.location.href,
        });
        setShowShareMenu(false);
      } catch (err) {
        console.log('Share cancelled');
      }
    }
  };

  if (loading) {
    return (
      <MobileLayout 
        title={interfaceLang === 'en' ? 'Loading...' : 'Cargando...'} 
        showBack={true} 
        showTabs={false}
      >
        <div className="flex items-center justify-center h-full">
          <div className="text-center py-12">
            <div className="text-5xl mb-4 animate-pulse">🏠</div>
            <div className="text-lg" style={{ color: '#0F172A' }}>
              {interfaceLang === 'en' ? 'Loading property...' : 'Cargando propiedad...'}
            </div>
          </div>
        </div>
      </MobileLayout>
    );
  }

  if (error || !property) {
    return (
      <MobileLayout title="Error" showBack={true} showTabs={false}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center px-6">
            <div className="text-5xl mb-4">❌</div>
            <h1 className="text-2xl font-bold mb-2" style={{ color: '#0F172A' }}>
              {error || (interfaceLang === 'en' ? 'Property not found' : 'Propiedad no encontrada')}
            </h1>
            <button
              onClick={() => router.push('/')}
              className="mt-6 px-6 py-3 rounded-xl font-bold text-white shadow-lg active:scale-95 transition-transform"
              style={{ backgroundColor: '#2563EB' }}
            >
              ← {interfaceLang === 'en' ? 'Back to home' : 'Volver al inicio'}
            </button>
          </div>
        </div>
      </MobileLayout>
    );
  }

  const photos = property.photos && property.photos.length > 0 
    ? property.photos 
    : ['https://via.placeholder.com/800x600?text=No+Image'];

  const filledCustomFields = customFields.filter(field => {
    const value = getCustomFieldValue(field.field_key);
    return value !== null && value !== '';
  });

  // Modo TikTok - pantalla completa
  if (tikTokMode && property.video_urls && property.video_urls.length > 0) {
    return (
      <div className="fixed inset-0 bg-black z-50">
        {/* Botón cerrar — siempre visible */}
        <button
          onClick={() => {
            setTikTokMode(false);
            setTikTokPaused(false);
            setShowSwipeHint(false);
            setCurrentVideoIndex(0);
          }}
          className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center z-30"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
        >
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Contenedor scroll snap */}
        <div
          ref={tikTokContainerRef}
          className="w-full h-full overflow-y-scroll"
          style={{
            scrollSnapType: 'y mandatory',
            scrollBehavior: 'smooth',
            WebkitOverflowScrolling: 'touch',
          }}
          onScroll={() => {
            if (!tikTokContainerRef.current) return;
            const scrollTop = tikTokContainerRef.current.scrollTop;
            const height = tikTokContainerRef.current.clientHeight;
            const newIndex = Math.round(scrollTop / height);
            if (newIndex !== currentVideoIndex) {
              setCurrentVideoIndex(newIndex);
              setTikTokPaused(false);
              setShowSwipeHint(false);
            }
          }}
        >
          {property.video_urls.map((url, index) => (
            <div
              key={index}
              className="relative w-full flex-shrink-0"
              style={{
                height: '100dvh',
                scrollSnapAlign: 'start',
              }}
              onClick={() => {
                if (index !== currentVideoIndex) return;
                const vid = document.getElementById(`tiktok-video-${index}`) as HTMLVideoElement;
                if (!vid) return;
                if (vid.paused) {
                  vid.play().catch(() => {});
                  setTikTokPaused(false);
                } else {
                  vid.pause();
                  setTikTokPaused(true);
                }
              }}
            >
              <video
                id={`tiktok-video-${index}`}
                src={url}
                className="w-full h-full object-cover"
                autoPlay={index === 0}
                playsInline
                loop={property.video_urls!.length === 1}
                onCanPlay={() => {
                  if (index === currentVideoIndex) {
                    const vid = document.getElementById(`tiktok-video-${index}`) as HTMLVideoElement;
                    vid?.play().catch(() => {});
                    setTikTokPaused(false);
                  }
                }}
                onEnded={() => {
                  if (index === currentVideoIndex) {
                    if (index < property.video_urls!.length - 1) {
                      setShowSwipeHint(true);
                    } else {
                      setTimeout(() => {
                        if (tikTokContainerRef.current) {
                          tikTokContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
                        }
                        setCurrentVideoIndex(0);
                        setShowSwipeHint(false);
                      }, 1500);
                    }
                  }
                }}
              />

              {/* Overlay oscuro */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 40%, transparent 70%, rgba(0,0,0,0.3) 100%)'
                }}
              />

              {/* Icono pausa */}
              {tikTokPaused && index === currentVideoIndex && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                  </div>
                </div>
              )}

              {/* Hint swipe al terminar video */}
              {showSwipeHint && index === currentVideoIndex && index < property.video_urls!.length - 1 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div
                    className="px-6 py-4 rounded-2xl flex flex-col items-center gap-2"
                    style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
                  >
                    <svg className="w-8 h-8 text-white animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                    <p className="text-white text-sm font-bold text-center">
                      {interfaceLang === 'en' ? 'Swipe up for next video' : 'Desliza arriba para el siguiente video'}
                    </p>
                  </div>
                </div>
              )}

              {/* Header info */}
              <div className="absolute top-0 left-0 right-0 px-4 pt-14 pb-4 pointer-events-none">
                <h2 className="text-white font-bold text-lg leading-tight drop-shadow-lg">
                  {property.title}
                </h2>
                <p className="font-bold text-xl drop-shadow-lg" style={{ color: '#25D366' }}>
                  {formatPrice(property.price)}
                </p>
                {property.city && (
                  <p className="text-white text-sm opacity-80 drop-shadow-lg">📍 {property.city}</p>
                )}
              </div>

              {/* Iconos laterales */}
              <div className="absolute right-3 bottom-32 flex flex-col items-center gap-6 z-20">
                <div className="w-12 h-12 rounded-full border-2 border-white overflow-hidden shadow-lg">
                  {property.agent.profile_photo ? (
                    <img src={property.agent.profile_photo} alt="Agent" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white font-bold text-lg" style={{ backgroundColor: '#2563EB' }}>
                      {property.agent.name?.charAt(0).toUpperCase() || '?'}
                    </div>
                  )}
                </div>

                {property.agent.phone && (
                  <div className="flex flex-col items-center gap-1">
                    <a
                      href={`https://wa.me/${property.agent.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
                        interfaceLang === 'en'
                          ? `Hi, I'm interested in: ${property.title}`
                          : `Hola, me interesa: ${property.title}`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg"
                      style={{ backgroundColor: '#25D366' }}
                    >
                      <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                    </a>
                    <span className="text-white text-xs font-semibold drop-shadow">WhatsApp</span>
                  </div>
                )}

                {property.agent.phone && (
                  <div className="flex flex-col items-center gap-1">
                    <a
                      href={`tel:${property.agent.phone}`}
                      onClick={(e) => e.stopPropagation()}
                      className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg"
                      style={{ backgroundColor: '#2563EB' }}
                    >
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.948V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 7V5z" />
                      </svg>
                    </a>
                    <span className="text-white text-xs font-semibold drop-shadow">{interfaceLang === 'en' ? 'Call' : 'Llamar'}</span>
                  </div>
                )}

                <div className="flex flex-col items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      shareWhatsApp();
                    }}
                    className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg"
                    style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
                  >
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                  </button>
                  <span className="text-white text-xs font-semibold drop-shadow">{interfaceLang === 'en' ? 'Share' : 'Compartir'}</span>
                </div>
              </div>

              {/* Bottom info */}
              <div className="absolute bottom-8 left-0 right-16 px-4 z-20">
                <p className="text-white text-sm font-semibold mb-2 drop-shadow-lg">
                  @{property.agent.username} · {property.agent.brokerage || ''}
                </p>
                {property.video_urls!.length > 1 && (
                  <div className="flex gap-1.5 mb-2">
                    {property.video_urls!.map((_, i) => (
                      <div
                        key={i}
                        className="h-1 rounded-full transition-all duration-300"
                        style={{
                          backgroundColor: i === currentVideoIndex ? '#FFFFFF' : 'rgba(255,255,255,0.4)',
                          width: i === currentVideoIndex ? '24px' : '8px',
                        }}
                      />
                    ))}
                  </div>
                )}
                <p className="text-white text-xs opacity-80 drop-shadow line-clamp-2">
                  {property.description.substring(0, 100)}...
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <MobileLayout title={property.city || (interfaceLang === 'en' ? 'Property' : 'Propiedad')} showBack={true} showTabs={false}>
      {/* DESKTOP: Two Column Layout */}
      <div className="lg:max-w-7xl lg:mx-auto lg:px-6 lg:py-8">
        <div className="lg:grid lg:grid-cols-2 lg:gap-8">
          
          {/* LEFT COLUMN - Gallery (Desktop) / Full Width (Mobile) */}
          <div className="lg:sticky lg:top-8 lg:self-start lg:max-h-screen lg:overflow-hidden">
            {/* Photo Gallery */}
            <div className="relative">
              <div className="relative aspect-[4/3] lg:aspect-square bg-gray-200 lg:rounded-2xl lg:overflow-hidden">
                <Image
                  src={photos[selectedPhotoIndex]}
                  alt={property.title}
                  fill
                  className="object-contain bg-black"
                  priority
                />
                
                {/* Photo Counter */}
                {photos.length > 1 && (
                  <div 
                    className="absolute bottom-4 right-4 px-3 py-1.5 rounded-full text-sm font-bold shadow-lg"
                    style={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', color: 'white' }}
                  >
                    {selectedPhotoIndex + 1} / {photos.length}
                  </div>
                )}

                {/* Navigation Arrows */}
                {photos.length > 1 && (
                  <>
                    <button
                      onClick={() => setSelectedPhotoIndex(prev => prev > 0 ? prev - 1 : photos.length - 1)}
                      className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 lg:w-12 lg:h-12 rounded-full flex items-center justify-center shadow-xl active:scale-90 transition-transform hover:scale-110"
                      style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)' }}
                    >
                      <svg className="w-6 h-6" fill="none" stroke="#0F172A" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setSelectedPhotoIndex(prev => prev < photos.length - 1 ? prev + 1 : 0)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 lg:w-12 lg:h-12 rounded-full flex items-center justify-center shadow-xl active:scale-90 transition-transform hover:scale-110"
                      style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)' }}
                    >
                      <svg className="w-6 h-6" fill="none" stroke="#0F172A" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </>
                )}
              </div>

              {/* Thumbnail Scroll */}
              {photos.length > 1 && (
                <div className="flex gap-2 overflow-x-auto px-4 lg:px-0 py-3 bg-white lg:bg-transparent lg:mt-4">
                  {photos.map((photo, index) => (
                    <button
                      key={index}
                      ref={(el) => { thumbnailRefs.current[index] = el; }}
                      onClick={() => setSelectedPhotoIndex(index)}
                      className={`relative flex-shrink-0 w-16 h-16 lg:w-20 lg:h-20 rounded-lg overflow-hidden border-2 transition-all active:scale-95 hover:scale-105 ${
                        index === selectedPhotoIndex 
                          ? 'scale-110 shadow-lg' 
                          : ''
                      }`}
                      style={{ borderColor: index === selectedPhotoIndex ? '#2563EB' : '#E5E7EB' }}
                    >
                      <Image
                        src={photo}
                        alt={`Photo ${index + 1}`}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN - Content */}
          <div className="px-4 lg:px-0 pt-4 pb-24 lg:pb-8 space-y-4">
            {/* Video Player */}
            {property.video_urls && property.video_urls.length > 0 && (
              <div className="mx-1 lg:mx-0 mt-4 lg:mt-0 rounded-2xl overflow-hidden shadow-lg bg-black">
                
                {/* Contenedor del video con overlay */}
                <div className="relative aspect-video">
                  <video
                    ref={videoRef}
                    key={currentVideoIndex}
                    src={property.video_urls[currentVideoIndex]}
                    controls
                    controlsList="nofullscreen"
                    autoPlay
                    playsInline
                    className="w-full h-full"
                    onEnded={() => {
                      if (currentVideoIndex < property.video_urls!.length - 1) {
                        setCurrentVideoIndex(prev => prev + 1);
                      }
                    }}
                  >
                    {interfaceLang === 'en'
                      ? 'Your browser does not support video playback.'
                      : 'Tu navegador no soporta reproducción de video.'
                    }
                  </video>
                </div>

                {/* Barra inferior del reproductor */}
                <div className="bg-white px-4 py-3">
                  <div className="flex items-center justify-between">
                    {/* Título e info */}
                    <div className="flex-1 min-w-0 mr-3">
                      <p className="text-sm font-bold truncate" style={{ color: '#0F172A' }}>
                        🎬 {interfaceLang === 'en' ? 'Property Video' : 'Video de la Propiedad'}
                      </p>
                      {property.video_urls.length > 1 && (
                        <p className="text-xs opacity-60" style={{ color: '#0F172A' }}>
                          {interfaceLang === 'en' ? 'Clip' : 'Clip'} {currentVideoIndex + 1} {interfaceLang === 'en' ? 'of' : 'de'} {property.video_urls.length}
                        </p>
                      )}
                    </div>

                    {/* Botón Vista Completa — solo móvil */}
                    <button
                      onClick={() => {
                        setTikTokMode(true);
                        setCurrentVideoIndex(0);
                      }}
                      className="lg:hidden flex items-center gap-1.5 px-3 py-2 rounded-full font-bold text-xs text-white shadow-lg active:scale-95 transition-transform"
                      style={{ backgroundColor: '#0F172A', flexShrink: 0 }}
                    >
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
                      </svg>
                      {interfaceLang === 'en' ? 'Full View' : 'Vista Completa'}
                    </button>
                  </div>

                  {/* Indicadores de clips — estilo app móvil */}
                  {property.video_urls.length > 1 && (
                    <div className="flex gap-1.5 mt-2">
                      {property.video_urls.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => setCurrentVideoIndex(index)}
                          className="flex-1 h-1 rounded-full transition-all duration-300"
                          style={{
                            backgroundColor: index === currentVideoIndex ? '#0F172A' : '#E5E7EB',
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Price Card */}
            <div 
              className="rounded-2xl p-5 lg:p-6 shadow-lg"
              style={{ backgroundColor: '#FFFFFF' }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h1 className="text-2xl lg:text-3xl font-bold mb-2" style={{ color: '#0F172A' }}>
                    {property.title}
                  </h1>
                  <p className="text-sm lg:text-base opacity-70 flex items-center gap-1 mb-1" style={{ color: '#0F172A' }}>
                    <span>📍</span>
                    {property.address}
                  </p>
                  {(property.city || property.state || property.zip_code) && (
                    <p className="text-sm lg:text-base opacity-70" style={{ color: '#0F172A' }}>
                      {[property.city, property.state, property.zip_code].filter(Boolean).join(', ')}
                    </p>
                  )}
                </div>
              </div>

              <div className="text-3xl lg:text-4xl font-bold mb-4" style={{ color: '#2563EB' }}>
                {formatPrice(property.price)}
              </div>

              <div className="flex items-center gap-2 mb-4 flex-wrap">
                <div className="text-sm font-semibold px-3 py-1 rounded-full" style={{ 
                  backgroundColor: property.listing_type === 'rent' ? '#F59E0B' : '#10B981',
                  color: '#FFFFFF'
                }}>
                  {property.listing_type === 'rent' 
                    ? (interfaceLang === 'en' ? '🏠 For Rent' : '🏠 Para Alquiler')
                    : (interfaceLang === 'en' ? '💰 For Sale' : '💰 En Venta')
                  }
                </div>
                
                {property.property_type && (
                  <div className="text-sm font-semibold px-3 py-1 rounded-full" style={{
                    backgroundColor: '#F5EAD3',
                    color: '#0F172A'
                  }}>
                    🏡 {translatePropertyType(property.property_type, interfaceLang)}
                  </div>
                )}

                {/* Badge de idioma de la propiedad */}
                <div className="text-sm font-semibold px-3 py-1 rounded-full" style={{
                  backgroundColor: '#DBEAFE',
                  color: '#1E40AF'
                }}>
                  {property.language === 'es' ? '🇪🇸 Español' : '🇺🇸 English'}
                </div>
              </div>
            </div>

            {/* Custom Fields */}
            {filledCustomFields.length > 0 && (
              <div 
                className="rounded-2xl p-5 lg:p-6 shadow-lg"
                style={{ backgroundColor: '#FFFFFF' }}
              >
                <h2 className="text-lg lg:text-xl font-bold mb-4 flex items-center gap-2" style={{ color: '#0F172A' }}>
                  <span>✨</span>
                  {interfaceLang === 'en' ? 'Special Features' : 'Características Especiales'}
                </h2>
                
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                  {filledCustomFields.map((field) => {
                    const value = getCustomFieldValue(field.field_key);
                    if (!value) return null;

                    return (
                      <div
                        key={field.id}
                        className="rounded-xl p-4 shadow-md"
                        style={{
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        }}
                      >
                        <div className="text-3xl mb-2">{field.icon || '🏷️'}</div>
                        <div className="text-xs font-semibold mb-1 opacity-90" style={{ color: '#FFFFFF' }}>
                          {getCustomFieldName(field)}
                        </div>
                        <div className="text-sm font-bold" style={{ color: '#FFFFFF' }}>
                          {value}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Description */}
            <div 
              className="rounded-2xl p-5 lg:p-6 shadow-lg"
              style={{ backgroundColor: '#FFFFFF' }}
            >
              <h2 className="text-lg lg:text-xl font-bold mb-3" style={{ color: '#0F172A' }}>
                {interfaceLang === 'en' ? 'Description' : 'Descripción'}
              </h2>
              <p className="whitespace-pre-line leading-relaxed opacity-90 text-sm lg:text-base" style={{ color: '#0F172A' }}>
                {property.description}
              </p>
              
              <div className="mt-4 pt-4 border-t text-sm opacity-60" style={{ color: '#0F172A', borderTopColor: '#E5E7EB' }}>
                👁️ {property.views} {interfaceLang === 'en' 
                  ? (property.views === 1 ? 'person viewed this property' : 'people viewed this property')
                  : (property.views === 1 ? 'persona vio esta propiedad' : 'personas vieron esta propiedad')
                }
              </div>
            </div>

            {/* Map */}
            {property.show_map && property.latitude && property.longitude && (
              <div 
                className="rounded-2xl p-5 lg:p-6 shadow-lg"
                style={{ backgroundColor: '#FFFFFF' }}
              >
                <h2 className="text-lg lg:text-xl font-bold mb-3" style={{ color: '#0F172A' }}>
                  📍 {interfaceLang === 'en' ? 'Location' : 'Ubicación'}
                </h2>
                <GoogleMapEditor
                  address={property.address || ''}
                  city={property.city || ''}
                  state={property.state || ''}
                  selectedCountry="CR"
                  initialLat={property.latitude}
                  initialLng={property.longitude}
                  onLocationChange={() => {}}
                  editable={false}
                />
                <p className="text-xs mt-3 opacity-60" style={{ color: '#0F172A' }}>
                  {property.address}
                  {(property.city || property.state || property.zip_code) && (
                    <span>
                      {', '}
                      {[property.city, property.state, property.zip_code].filter(Boolean).join(', ')}
                    </span>
                  )}
                </p>
              </div>
            )}

            <button
              onClick={async () => {
                setIsGeneratingPDF(true);
                try {
                  const currencyInfo = currency ? { symbol: currency.symbol, code: currency.code } : { symbol: '$', code: 'USD' };
                  const { exportPropertyToPDF } = await import('@/lib/exportPDF');
                  await exportPropertyToPDF(
                    property,
                    property.agent,
                    customFields,
                    property.language,
                    currencyInfo
                  );
                } catch (error) {
                  console.error('Error generando PDF:', error);
                  alert(interfaceLang === 'en' ? 'Error generating PDF' : 'Error al generar el PDF');
                } finally {
                  setIsGeneratingPDF(false);
                }
              }}
              className="w-full py-3 rounded-xl font-bold border-2 shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2 hover:bg-gray-50"
              style={{ 
                borderColor: '#2563EB',
                color: '#2563EB',
                backgroundColor: '#FFFFFF'
              }}
            >
              <span>📄</span> {interfaceLang === 'en' ? 'Download as PDF' : 'Descargar como PDF'}
            </button>

            {/* Agent Card */}
            <div 
              className="rounded-2xl p-5 lg:p-6 shadow-lg"
              style={{ backgroundColor: '#FFFFFF' }}
            >
              <h3 className="text-lg lg:text-xl font-bold mb-4" style={{ color: '#0F172A' }}>
                {interfaceLang === 'en' ? 'Agent' : 'Agente'}
              </h3>

              <div className="flex items-center gap-4 mb-5">
                <div 
                  className="w-16 h-16 lg:w-20 lg:h-20 rounded-full flex items-center justify-center text-2xl lg:text-3xl font-bold text-white shadow-lg"
                  style={{ backgroundColor: '#2563EB' }}
                >
                  {property.agent.profile_photo ? (
                    <Image
                      src={property.agent.profile_photo}
                      alt={property.agent.name || 'Agent'}
                      width={80}
                      height={80}
                      className="rounded-full"
                    />
                  ) : (
                    property.agent.name?.charAt(0).toUpperCase() || '?'
                  )}
                </div>
                <div>
                  <div className="font-bold text-lg lg:text-xl" style={{ color: '#0F172A' }}>
                    {property.agent.full_name || property.agent.name || (interfaceLang === 'en' ? 'Agent' : 'Agente')}
                  </div>
                  {property.agent.brokerage && (
                    <div className="text-sm lg:text-base opacity-70" style={{ color: '#0F172A' }}>
                      {property.agent.brokerage}
                    </div>
                  )}
                </div>
              </div>

              {/* Contact Buttons */}
              <div className="space-y-2">
                {property.agent.phone && (
                  <>
                    <a
                      href={`tel:${property.agent.phone}`}
                      className="block w-full py-3 rounded-xl font-bold text-white text-center shadow-lg active:scale-95 transition-transform hover:opacity-90"
                      style={{ backgroundColor: '#2563EB' }}
                    >
                      📞 {interfaceLang === 'en' ? 'Call' : 'Llamar'}
                    </a>
                    
                    <a
                      href={`https://wa.me/${property.agent.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
                        interfaceLang === 'en' 
                          ? `Hi, I'm interested in: ${property.title}`
                          : `Hola, me interesa: ${property.title}`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full py-3 rounded-xl font-bold text-white text-center shadow-lg active:scale-95 transition-transform hover:opacity-90"
                      style={{ backgroundColor: '#25D366' }}
                    >
                      💬 WhatsApp
                    </a>
                  </>
                )}

                <a
                  href={`mailto:${property.agent.email}?subject=${encodeURIComponent(
                    interfaceLang === 'en'
                      ? `Inquiry: ${property.title}`
                      : `Consulta: ${property.title}`
                  )}`}
                  className="block w-full py-3 rounded-xl font-bold text-center border-2 shadow-lg active:scale-95 transition-transform hover:bg-gray-50"
                  style={{ 
                    borderColor: '#2563EB',
                    color: '#2563EB',
                    backgroundColor: '#FFFFFF'
                  }}
                >
                  ✉️ Email
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Share Button */}
      <div className="fixed bottom-6 right-4 z-50">
        <button
          onClick={() => setShowShareMenu(!showShareMenu)}
          className="w-14 h-14 lg:w-16 lg:h-16 rounded-full flex items-center justify-center shadow-2xl active:scale-90 transition-transform hover:scale-110"
          style={{ backgroundColor: '#2563EB' }}
        >
          <svg className="w-6 h-6 lg:w-7 lg:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
        </button>

        {/* Share Menu */}
        {showShareMenu && (
          <div 
            className="absolute bottom-16 lg:bottom-20 right-0 rounded-2xl shadow-2xl p-3 min-w-[180px] lg:min-w-[200px]"
            style={{ backgroundColor: '#FFFFFF' }}
          >
            {/* Copiar información completa */}
            <button
                onClick={copyPropertyInfo}
                className="w-full px-4 py-3 text-left font-semibold rounded-xl hover:bg-gray-100 active:bg-gray-100 transition-colors flex items-center gap-3"
                style={{ color: '#0F172A' }}
              >
                <span>📋</span> {interfaceLang === 'en' ? 'Copy full info' : 'Copiar info completa'}
            </button>
            {navigator.share && (
              <button
                onClick={shareNative}
                className="w-full px-4 py-3 text-left font-semibold rounded-xl hover:bg-gray-100 active:bg-gray-100 transition-colors flex items-center gap-3"
                style={{ color: '#0F172A' }}
              >
                <span>📱</span> {interfaceLang === 'en' ? 'Share' : 'Compartir'}
              </button>
            )}
            <button
              onClick={shareWhatsApp}
              className="w-full px-4 py-3 text-left font-semibold rounded-xl hover:bg-gray-100 active:bg-gray-100 transition-colors flex items-center gap-3"
              style={{ color: '#0F172A' }}
            >
              <span>💬</span> WhatsApp
            </button>
            <button
              onClick={copyLink}
              className="w-full px-4 py-3 text-left font-semibold rounded-xl hover:bg-gray-100 active:bg-gray-100 transition-colors flex items-center gap-3"
              style={{ color: '#0F172A' }}
            >
              <span>🔗</span> {interfaceLang === 'en' ? 'Copy link' : 'Copiar link'}
            </button>
          </div>
        )}
      </div>

      {/* Overlay */}
      {showShareMenu && (
        <div 
          className="fixed inset-0 z-40"
          onClick={() => setShowShareMenu(false)}
        />
      )}

      <GeneratingPDFModal isOpen={isGeneratingPDF} />
    </MobileLayout>
  );
}