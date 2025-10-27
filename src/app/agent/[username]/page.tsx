'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';

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
}

// 🆕 Función para traducir tipos de propiedad
const translatePropertyType = (type: string | null): string => {
  const translations: Record<string, string> = {
    house: 'Casa',
    condo: 'Condominio',
    apartment: 'Apartamento',
    land: 'Terreno',
    commercial: 'Comercial',
  };
  return type ? translations[type] || type : 'Propiedad';
};

export default function AgentPortfolioPage() {
  const params = useParams();
  const router = useRouter();
  const username = params.username as string;

  const [agent, setAgent] = useState<Agent | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'sold' | 'rented'>('active');

  useEffect(() => {
    if (username) {
      loadAgentData();
    }
  }, [username]);

  const loadAgentData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/agent/portfolio/${username}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('Agente no encontrado');
        } else {
          setError('Error al cargar el portfolio');
        }
        return;
      }
      
      const data = await response.json();
      setAgent(data.agent);
      setProperties(data.properties);
    } catch (err) {
      console.error('Error loading portfolio:', err);
      setError('Error al cargar el portfolio');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number | null) => {
    if (!price) return 'Precio a consultar';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const filteredProperties = properties.filter(p => {
    if (filter === 'all') return true;
    if (filter === 'active') return p.status === 'active';
    if (filter === 'sold') return p.status === 'sold';
    if (filter === 'rented') return p.status === 'rented';
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
          <div className="text-xl" style={{ color: '#0F172A' }}>Cargando portfolio...</div>
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
            {error || 'Agente no encontrado'}
          </h1>
          <button
            onClick={() => router.push('/')}
            className="mt-6 px-6 py-3 rounded-xl font-bold text-white shadow-lg active:scale-95 transition-transform"
            style={{ backgroundColor: '#2563EB' }}
          >
            ← Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5EAD3' }}>
      {/* Header */}
      <header className="shadow-lg" style={{ backgroundColor: '#0F172A' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🏠</span>
              <span className="text-xl font-bold text-white">Real Estate AI</span>
            </div>
            <button
              onClick={() => router.push('/')}
              className="text-white hover:opacity-80 font-semibold transition-opacity"
            >
              Inicio
            </button>
          </div>
        </div>
      </header>

      {/* Share Button */}
      <div className="px-4 pt-4">
        <button
          onClick={() => {
            const url = window.location.href;
            if (navigator.share) {
              navigator.share({
                title: `Portfolio de ${agent.full_name || agent.name}`,
                text: `Mira mis propiedades en venta`,
                url: url,
              });
            } else {
              navigator.clipboard.writeText(url);
              alert('¡Link copiado!');
            }
          }}
          className="w-full py-3 rounded-xl font-bold shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2"
          style={{ backgroundColor: '#2563EB', color: '#FFFFFF' }}
        >
          <span>📤</span> Compartir Mi Portfolio
        </button>
      </div>

      {/* Agent Info Section */}
      <section className="py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div 
            className="rounded-3xl p-8 shadow-xl"
            style={{ backgroundColor: '#FFFFFF' }}
          >
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
              {/* Avatar */}
              <div 
                className="w-32 h-32 rounded-full flex items-center justify-center text-5xl font-bold text-white shadow-xl flex-shrink-0"
                style={{ backgroundColor: '#2563EB' }}
              >
                {agent.profile_photo ? (
                  <Image
                    src={agent.profile_photo}
                    alt={agent.name || 'Agent'}
                    width={128}
                    height={128}
                    className="rounded-full"
                  />
                ) : (
                  (agent.full_name || agent.name || 'A').charAt(0).toUpperCase()
                )}
              </div>

              {/* Info */}
              <div className="flex-1 text-center md:text-left">
                <h1 className="text-3xl font-bold mb-2" style={{ color: '#0F172A' }}>
                  {agent.full_name || agent.name}
                </h1>
                {agent.brokerage && (
                  <p className="text-lg mb-3 opacity-70" style={{ color: '#0F172A' }}>
                    {agent.brokerage}
                  </p>
                )}
                {agent.bio && (
                  <p className="mb-4 opacity-80" style={{ color: '#0F172A' }}>
                    {agent.bio}
                  </p>
                )}
                
                {/* Contact Buttons */}
                <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                  {agent.phone && (
                    <>
                      <a
                        href={`tel:${agent.phone}`}
                        className="px-5 py-2 rounded-xl font-bold text-white shadow-lg active:scale-95 transition-transform"
                        style={{ backgroundColor: '#2563EB' }}
                      >
                        📞 Llamar
                      </a>
                      <a
                        href={`https://wa.me/${agent.phone.replace(/\D/g, '')}?text=${encodeURIComponent('Hola, vi tu portfolio y me interesa contactarte')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-5 py-2 rounded-xl font-bold text-white shadow-lg active:scale-95 transition-transform"
                        style={{ backgroundColor: '#25D366' }}
                      >
                        💬 WhatsApp
                      </a>
                    </>
                  )}
                  <a
                    href={`mailto:${agent.email}?subject=${encodeURIComponent('Consulta desde tu portfolio')}`}
                    className="px-5 py-2 rounded-xl font-bold border-2 shadow-lg active:scale-95 transition-transform"
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

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-8 border-t" style={{ borderColor: '#E5E7EB' }}>
              <div className="text-center">
                <div className="text-3xl font-bold mb-1" style={{ color: '#2563EB' }}>
                  {stats.total}
                </div>
                <div className="text-sm opacity-70" style={{ color: '#0F172A' }}>
                  Propiedades
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold mb-1" style={{ color: '#10B981' }}>
                  {stats.active}
                </div>
                <div className="text-sm opacity-70" style={{ color: '#0F172A' }}>
                  Disponibles
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold mb-1" style={{ color: '#6B7280' }}>
                  {stats.sold}
                </div>
                <div className="text-sm opacity-70" style={{ color: '#0F172A' }}>
                  Vendidas
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold mb-1" style={{ color: '#6B7280' }}>
                  {stats.rented}
                </div>
                <div className="text-sm opacity-70" style={{ color: '#0F172A' }}>
                  Alquiladas
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold mb-1" style={{ color: '#F59E0B' }}>
                  {stats.totalViews}
                </div>
                <div className="text-sm opacity-70" style={{ color: '#0F172A' }}>
                  Vistas Totales
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
          <div className="flex gap-2 mb-6 overflow-x-auto">
            {[
              { key: 'active', label: '🟢 Disponibles', count: stats.active },
              { key: 'all', label: '📋 Todas', count: stats.total },
              { key: 'sold', label: '✅ Vendidas', count: stats.sold },
              { key: 'rented', label: '🔑 Alquiladas', count: stats.rented },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key as any)}
                className={`px-5 py-3 rounded-xl font-bold whitespace-nowrap transition-all active:scale-95 ${
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

          {/* Properties Grid */}
          {filteredProperties.length === 0 ? (
            <div 
              className="rounded-2xl p-12 text-center"
              style={{ backgroundColor: '#FFFFFF' }}
            >
              <div className="text-5xl mb-4">🏘️</div>
              <p className="text-lg" style={{ color: '#0F172A' }}>
                No hay propiedades {filter === 'active' ? 'disponibles' : filter === 'sold' ? 'vendidas' : filter === 'rented' ? 'alquiladas' : ''} aún
              </p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProperties.map((property) => (
                <div
                  key={property.id}
                  onClick={() => router.push(`/p/${property.slug}`)}
                  className="rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all cursor-pointer active:scale-[0.98]"
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
                        {property.status === 'active' ? '● Disponible' : property.status === 'rented' ? '● Alquilada' : '● Vendida'}
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <h3 className="font-bold text-lg mb-2 line-clamp-2" style={{ color: '#0F172A' }}>
                      {property.title}
                    </h3>
                    
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xl font-bold" style={{ color: '#2563EB' }}>
                        {formatPrice(property.price)}
                      </span>
                      {property.city && property.state && (
                        <span className="text-sm opacity-70" style={{ color: '#0F172A' }}>
                          📍 {property.city}
                        </span>
                      )}
                    </div>

                    {/* Property Type and Listing Type Badges */}
                    <div className="flex items-center gap-2 mb-3">
                      {property.property_type && (
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{
                          backgroundColor: '#F5EAD3',
                          color: '#0F172A'
                        }}>
                          🏡 {translatePropertyType(property.property_type)}
                        </span>
                      )}
                      {property.listing_type && (
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{
                          backgroundColor: property.listing_type === 'rent' ? '#FEF3C7' : '#D1FAE5',
                          color: property.listing_type === 'rent' ? '#92400E' : '#065F46'
                        }}>
                          {property.listing_type === 'rent' ? 'Alquiler' : 'Venta'}
                        </span>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="flex justify-between items-center text-xs pt-3 border-t opacity-60" style={{ color: '#0F172A', borderTopColor: '#E5E7EB' }}>
                      <span>👁️ {property.views} vistas</span>
                      <span>{new Date(property.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>
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
              RealFlow
            </span>
          </div>
          <p className="text-sm opacity-60 mb-3" style={{ color: '#0F172A' }}>
            Portfolio creado con RealFlow AI
          </p>
          <a
            href="/"
            className="text-sm font-semibold hover:opacity-70 transition-opacity"
            style={{ color: '#2563EB' }}
          >
            Crea tu propio portfolio →
          </a>
        </div>
      </footer>
    </div>
  );
}