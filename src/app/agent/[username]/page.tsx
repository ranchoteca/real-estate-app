'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { useTranslation } from '@/hooks/useTranslation';

interface Agent {
  id: string;
  name: string | null;
  full_name: string | null;
  username: string;
  email: string;
  phone: string | null;
  brokerage: string | null;
  bio: string | null;
  profile_photo: string | null;
  card_profile_photo: string | null;
}

interface Property {
  id: string;
  title: string;
  slug: string;
  price: number | null;
  city: string | null;
  state: string | null;
  property_type: string | null;
  listing_type: 'rent' | 'sale';
  photos: string[] | null;
  status: string;
  views: number;
  created_at: string;
  language: 'es' | 'en';
}

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

const detectBrowserLanguage = (): 'es' | 'en' => {
  if (typeof window === 'undefined') return 'es';
  const browserLang = navigator.language.toLowerCase();
  return browserLang.startsWith('es') ? 'es' : 'en';
};

export default function AgentPortfolioPage() {
  const params = useParams();
  const router = useRouter();
  const username = params.username as string;
  const { t } = useTranslation();
  const [language, setLanguage] = useState<'es' | 'en'>('es');

  // Detectar idioma del navegador al montar
  useEffect(() => {
    setLanguage(detectBrowserLanguage());
  }, []);

  const [agent, setAgent] = useState<Agent | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'sold' | 'rented'>('active');
  const [languageFilter, setLanguageFilter] = useState<'all' | 'es' | 'en'>('all');
  const [currencies, setCurrencies] = useState<any[]>([]);

  useEffect(() => {
    if (username) {
      loadAgentData();
    }
  }, [username]);

  useEffect(() => {
    loadCurrencies();
  }, []);

  const loadCurrencies = async () => {
    try {
      const response = await fetch('/api/currencies/list');
      if (response.ok) {
        const data = await response.json();
        setCurrencies(data.currencies || []);
      }
    } catch (error) {
      console.error('Error loading currencies:', error);
    }
  };

  const loadAgentData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/agent/portfolio/${username}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          setError(language === 'en' ? 'Agent not found' : 'Agente no encontrado');
        } else {
          setError(language === 'en' ? 'Error loading portfolio' : 'Error al cargar el portfolio');
        }
        return;
      }
      
      const data = await response.json();
      setAgent(data.agent);
      setProperties(data.properties);
    } catch (err) {
      console.error('Error loading portfolio:', err);
      setError(language === 'en' ? 'Error loading portfolio' : 'Error al cargar el portfolio');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number | null, currencyId: string | null) => {
    if (!price) return language === 'en' ? 'Price upon request' : 'Precio a consultar';
    
    const currency = currencies.find(c => c.id === currencyId);
    const symbol = currency?.symbol || '$';
    
    return `${symbol}${new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price)}`;
  };

  const filteredProperties = properties.filter(p => {
    // Filtro por estado
    if (filter === 'active' && p.status !== 'active') return false;
    if (filter === 'sold' && p.status !== 'sold') return false;
    if (filter === 'rented' && p.status !== 'rented') return false;
    
    // Filtro por idioma
    if (languageFilter !== 'all' && p.language !== languageFilter) return false;
    
    return true;
  });

  const stats = {
    total: properties.length,
    active: properties.filter(p => p.status === 'active').length,
    sold: properties.filter(p => p.status === 'sold').length,
    rented: properties.filter(p => p.status === 'rented').length,
    totalViews: properties.reduce((sum, p) => sum + p.views, 0),
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F5EAD3' }}>
        <div className="text-center">
          <div className="text-5xl mb-4 animate-pulse">👤</div>
          <div className="text-xl" style={{ color: '#0F172A' }}>
            {language === 'en' ? 'Loading portfolio...' : 'Cargando portfolio...'}
          </div>
        </div>
      </div>
    );
  }

  if (error || !agent) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F5EAD3' }}>
        <div className="text-center px-6">
          <div className="text-5xl mb-4">❌</div>
          <h1 className="text-2xl font-bold mb-2" style={{ color: '#0F172A' }}>
            {error || (language === 'en' ? 'Agent not found' : 'Agente no encontrado')}
          </h1>
          <button
            onClick={() => router.push('/')}
            className="mt-6 px-6 py-3 rounded-xl font-bold text-white shadow-lg active:scale-95 transition-transform hover:opacity-90"
            style={{ backgroundColor: '#2563EB' }}
          >
            ← {language === 'en' ? 'Back to home' : 'Volver al inicio'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5EAD3' }}>
      {/* Header */}
      <header className="shadow-lg" style={{ backgroundColor: '#0F172A' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🏠</span>
              <span className="text-xl font-bold text-white">{agent?.brokerage || 'Flow Estate AI'}</span>
            </div>
            <button
              onClick={() => router.push('/')}
              className="text-white hover:opacity-80 font-semibold transition-opacity"
            >
              {language === 'en' ? 'Home' : 'Inicio'}
            </button>
          </div>
        </div>
      </header>

      {/* Share Button - Mobile Only */}
      <div className="px-4 pt-4 lg:hidden">
        <button
          onClick={() => {
            const url = window.location.href;
            if (navigator.share) {
              navigator.share({
                title: `Portfolio ${language === 'en' ? 'of' : 'de'} ${agent.full_name || agent.name}`,
                text: language === 'en' ? 'Check out my properties for sale' : 'Mira mis propiedades en venta',
                url: url,
              });
            } else {
              navigator.clipboard.writeText(url);
              alert(language === 'en' ? 'Link copied!' : '¡Link copiado!');
            }
          }}
          className="w-full py-3 rounded-xl font-bold shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2 hover:opacity-90"
          style={{ backgroundColor: '#2563EB', color: '#FFFFFF' }}
        >
          <span>📤</span> {language === 'en' ? 'Share My Portfolio' : 'Compartir Mi Portfolio'}
        </button>
      </div>

      {/* Agent Info Section */}
      <section className="py-8 lg:py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div 
            className="rounded-3xl p-6 lg:p-8 shadow-xl"
            style={{ backgroundColor: '#FFFFFF' }}
          >
            <div className="flex flex-col lg:flex-row items-center lg:items-start gap-6">
              {/* Avatar */}
              <div 
                className="w-24 h-24 lg:w-32 lg:h-32 rounded-full flex items-center justify-center text-4xl lg:text-5xl font-bold text-white shadow-xl flex-shrink-0"
                style={{ backgroundColor: '#2563EB' }}
              >
                {(agent.card_profile_photo || agent.profile_photo) ? (
                  <Image
                    src={agent.card_profile_photo || agent.profile_photo!}
                    alt={agent.name || 'Agent'}
                    width={128}
                    height={128}
                    className="rounded-full object-cover w-full h-full"
                  />
                ) : (
                  (agent.full_name || agent.name || 'A').charAt(0).toUpperCase()
                )}
              </div>

              {/* Info */}
              <div className="flex-1 text-center lg:text-left">
                <h1 className="text-2xl lg:text-3xl font-bold mb-2" style={{ color: '#0F172A' }}>
                  {agent.full_name || agent.name}
                </h1>
                {agent.brokerage && (
                  <p className="text-base lg:text-lg mb-3 opacity-70" style={{ color: '#0F172A' }}>
                    {agent.brokerage}
                  </p>
                )}
                {agent.bio && (
                  <p className="mb-4 opacity-80 text-sm lg:text-base" style={{ color: '#0F172A' }}>
                    {agent.bio}
                  </p>
                )}
                
                {/* Contact Buttons */}
                <div className="flex flex-wrap gap-3 justify-center lg:justify-start">
                  {agent.phone && (
                    <>
                      <a
                        href={`tel:${agent.phone}`}
                        className="px-4 lg:px-5 py-2 rounded-xl font-bold text-white shadow-lg active:scale-95 transition-transform hover:opacity-90"
                        style={{ backgroundColor: '#2563EB' }}
                      >
                        📞 {language === 'en' ? 'Call' : 'Llamar'}
                      </a>
                      <a
                        href={`https://wa.me/${agent.phone.replace(/\D/g, '')}?text=${encodeURIComponent(language === 'en' ? 'Hi, I saw your portfolio and I\'m interested in contacting you' : 'Hola, vi tu portfolio y me interesa contactarte')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 lg:px-5 py-2 rounded-xl font-bold text-white shadow-lg active:scale-95 transition-transform hover:opacity-90"
                        style={{ backgroundColor: '#25D366' }}
                      >
                        💬 WhatsApp
                      </a>
                    </>
                  )}
                  <a
                    href={`mailto:${agent.email}?subject=${encodeURIComponent(language === 'en' ? 'Inquiry from your portfolio' : 'Consulta desde tu portfolio')}`}
                    className="px-4 lg:px-5 py-2 rounded-xl font-bold border-2 shadow-lg active:scale-95 transition-transform hover:bg-gray-50"
                    style={{ 
                      borderColor: '#2563EB',
                      color: '#2563EB',
                      backgroundColor: '#FFFFFF'
                    }}
                  >
                    ✉️ Email
                  </a>
                  {/* Desktop Share Button */}
                  <button
                    onClick={() => {
                      const url = window.location.href;
                      if (navigator.share) {
                        navigator.share({
                          title: `Portfolio ${language === 'en' ? 'of' : 'de'} ${agent.full_name || agent.name}`,
                          text: language === 'en' ? 'Check out my properties for sale' : 'Mira mis propiedades en venta',
                          url: url,
                        });
                      } else {
                        navigator.clipboard.writeText(url);
                        alert(language === 'en' ? 'Link copied!' : '¡Link copiado!');
                      }
                    }}
                    className="hidden lg:inline-flex px-4 lg:px-5 py-2 rounded-xl font-bold shadow-lg active:scale-95 transition-transform hover:opacity-90 items-center gap-2"
                    style={{ backgroundColor: '#2563EB', color: '#FFFFFF' }}
                  >
                    <span>📤</span> {language === 'en' ? 'Share Portfolio' : 'Compartir Portfolio'}
                  </button>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-8 pt-8 border-t" style={{ borderColor: '#E5E7EB' }}>
              <div className="text-center">
                <div className="text-2xl lg:text-3xl font-bold mb-1" style={{ color: '#2563EB' }}>
                  {stats.total}
                </div>
                <div className="text-xs lg:text-sm opacity-70" style={{ color: '#0F172A' }}>
                  {language === 'en' ? 'Properties' : 'Propiedades'}
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl lg:text-3xl font-bold mb-1" style={{ color: '#10B981' }}>
                  {stats.active}
                </div>
                <div className="text-xs lg:text-sm opacity-70" style={{ color: '#0F172A' }}>
                  {language === 'en' ? 'Available' : 'Disponibles'}
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl lg:text-3xl font-bold mb-1" style={{ color: '#6B7280' }}>
                  {stats.sold}
                </div>
                <div className="text-xs lg:text-sm opacity-70" style={{ color: '#0F172A' }}>
                  {language === 'en' ? 'Sold' : 'Vendidas'}
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl lg:text-3xl font-bold mb-1" style={{ color: '#6B7280' }}>
                  {stats.rented}
                </div>
                <div className="text-xs lg:text-sm opacity-70" style={{ color: '#0F172A' }}>
                  {language === 'en' ? 'Rented' : 'Alquiladas'}
                </div>
              </div>
              <div className="text-center col-span-2 md:col-span-1">
                <div className="text-2xl lg:text-3xl font-bold mb-1" style={{ color: '#F59E0B' }}>
                  {stats.totalViews}
                </div>
                <div className="text-xs lg:text-sm opacity-70" style={{ color: '#0F172A' }}>
                  {language === 'en' ? 'Total Views' : 'Vistas Totales'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Properties Section */}
      <section className="pb-12 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Filter Tabs */}
          <div className="flex gap-2 mb-6 overflow-x-auto scrollbar-hide">
            {[
              { key: 'active', label: language === 'en' ? '🟢 Available' : '🟢 Disponibles', count: stats.active },
              { key: 'all', label: language === 'en' ? '📋 All' : '📋 Todas', count: stats.total },
              { key: 'sold', label: language === 'en' ? '✅ Sold' : '✅ Vendidas', count: stats.sold },
              { key: 'rented', label: language === 'en' ? '🔑 Rented' : '🔑 Alquiladas', count: stats.rented },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key as any)}
                className={`px-4 lg:px-5 py-3 rounded-xl font-bold whitespace-nowrap transition-all active:scale-95 hover:scale-105 ${
                  filter === tab.key ? 'shadow-lg' : ''
                }`}
                style={{
                  backgroundColor: filter === tab.key ? '#2563EB' : '#FFFFFF',
                  color: filter === tab.key ? '#FFFFFF' : '#0F172A',
                }}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>

          {/* Language Filter Tabs */}
          <div className="flex gap-2 mb-6 overflow-x-auto scrollbar-hide">
            {[
              { key: 'all', label: language === 'en' ? '🌐 All' : '🌐 Todos', count: properties.length },
              { key: 'es', label: '🇪🇸 ES • Español', count: properties.filter(p => p.language === 'es').length },
              { key: 'en', label: '🇺🇸 EN • English', count: properties.filter(p => p.language === 'en').length },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setLanguageFilter(tab.key as any)}
                className={`px-4 lg:px-5 py-2.5 rounded-xl font-bold whitespace-nowrap transition-all active:scale-95 hover:scale-105 ${
                  languageFilter === tab.key ? 'shadow-lg' : ''
                }`}
                style={{
                  backgroundColor: languageFilter === tab.key ? '#10B981' : '#FFFFFF',
                  color: languageFilter === tab.key ? '#FFFFFF' : '#0F172A',
                }}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>

          {/* Properties Grid */}
          {filteredProperties.length === 0 ? (
            <div 
              className="rounded-2xl p-12 text-center"
              style={{ backgroundColor: '#FFFFFF' }}
            >
              <div className="text-5xl mb-4">🏘️</div>
              <p className="text-lg" style={{ color: '#0F172A' }}>
                {language === 'en' 
                  ? `No ${filter === 'active' ? 'available' : filter === 'sold' ? 'sold' : filter === 'rented' ? 'rented' : ''} properties yet`
                  : `No hay propiedades ${filter === 'active' ? 'disponibles' : filter === 'sold' ? 'vendidas' : filter === 'rented' ? 'alquiladas' : ''} aún`
                }
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
              {filteredProperties.map((property) => (
                <div
                  key={property.id}
                  onClick={() => router.push(`/p/${property.slug}`)}
                  className="rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all cursor-pointer active:scale-[0.98] hover:scale-[1.02]"
                  style={{ backgroundColor: '#FFFFFF' }}
                >
                  {/* Image */}
                  <div className="relative aspect-video bg-gray-200">
                    {property.photos && property.photos.length > 0 ? (
                      <Image
                        src={property.photos[0]}
                        alt={property.title}
                        fill
                        className="object-contain bg-gray-900"
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-5xl">
                        🏠
                      </div>
                    )}
                    
                    {/* Status Badge */}
                    <div className="absolute top-3 left-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold text-white shadow-lg ${
                        property.status === 'active' ? 'bg-green-500' : property.status === 'rented' ? 'bg-blue-500' : 'bg-gray-500'
                      }`}>
                        {property.status === 'active' 
                          ? (language === 'en' ? '● Available' : '● Disponible')
                          : property.status === 'rented' 
                            ? (language === 'en' ? '● Rented' : '● Alquilada')
                            : (language === 'en' ? '● Sold' : '● Vendida')
                        }
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <h3 className="font-bold text-base lg:text-lg mb-2 line-clamp-2" style={{ color: '#0F172A' }}>
                      {property.title}
                    </h3>
                    
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-lg lg:text-xl font-bold" style={{ color: '#2563EB' }}>
                        {formatPrice(property.price, property.currency_id)}
                      </span>
                      {property.city && property.state && (
                        <span className="text-xs lg:text-sm opacity-70" style={{ color: '#0F172A' }}>
                          📍 {property.city}
                        </span>
                      )}
                    </div>

                    {/* Property Type and Listing Type Badges */}
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      {property.property_type && (
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{
                          backgroundColor: '#F5EAD3',
                          color: '#0F172A'
                        }}>
                          🏡 {translatePropertyType(property.property_type, language)}
                        </span>
                      )}
                      {property.listing_type && (
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{
                          backgroundColor: property.listing_type === 'rent' ? '#FEF3C7' : '#D1FAE5',
                          color: property.listing_type === 'rent' ? '#92400E' : '#065F46'
                        }}>
                          {property.listing_type === 'rent' 
                            ? (language === 'en' ? 'Rent' : 'Alquiler')
                            : (language === 'en' ? 'Sale' : 'Venta')
                          }
                        </span>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="flex justify-between items-center text-xs pt-3 border-t opacity-60" style={{ color: '#0F172A', borderTopColor: '#E5E7EB' }}>
                      <span>👁️ {property.views} {language === 'en' ? 'views' : 'vistas'}</span>
                      <span>{new Date(property.created_at).toLocaleDateString(language === 'en' ? 'en-US' : 'es-ES', { day: 'numeric', month: 'short' })}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t" style={{ borderColor: '#E5E7EB', backgroundColor: '#FFFFFF' }}>
        <div className="max-w-6xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="text-2xl">🏠</span>
            <span className="text-lg font-bold" style={{ color: '#0F172A' }}>
              Flow Estate AI
            </span>
          </div>
          <p className="text-sm opacity-60 mb-3" style={{ color: '#0F172A' }}>
            {language === 'en' 
              ? 'Portfolio created with Flow Estate AI'
              : 'Portfolio creado con Flow Estate AI'
            }
          </p>
          <a
            href="/"
            className="text-sm font-semibold hover:opacity-70 transition-opacity"
            style={{ color: '#2563EB' }}
          >
            {language === 'en' 
              ? 'Create your own portfolio →'
              : 'Crea tu propio portfolio →'
            }
          </a>
        </div>
      </footer>
    </div>
  );
}