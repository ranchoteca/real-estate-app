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
  language: 'es' | 'en'; // ⬅️ IMPORTANTE: idioma de la propiedad
  latitude: number | null;
  longitude: number | null;
  show_map: boolean;
  custom_fields_data: Record<string, string> | null;
  agent: {
    name: string | null;
    full_name: string | null;
    phone: string | null;
    email: string;
    brokerage: string | null;
    profile_photo: string | null;
    username: string;
  };
}

interface CustomField {
  id: string;
  field_key: string;   
  field_name: string;
  field_name_en: string | null; // ⬅️ Agregado para bilingüe
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

export default function PropertyPage() {
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

  return (
    <MobileLayout title={property.city || (interfaceLang === 'en' ? 'Property' : 'Propiedad')} showBack={true} showTabs={false}>
      {/* DESKTOP: Two Column Layout */}
      <div className="lg:max-w-7xl lg:mx-auto lg:px-6 lg:py-8">
        <div className="lg:grid lg:grid-cols-2 lg:gap-8">
          
          {/* LEFT COLUMN - Gallery (Desktop) / Full Width (Mobile) */}
          <div className="lg:sticky lg:top-8 lg:self-start">
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
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN - Content */}
          <div className="px-4 lg:px-0 pt-4 pb-24 lg:pb-8 space-y-4">
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