'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import FacebookPublishModal from '@/components/FacebookPublishModal';
import MobileLayout from '@/components/MobileLayout';
import Image from 'next/image';

interface Property {
  id: string;
  title: string;
  slug: string;
  price: number | null;
  city: string | null;
  state: string | null;
  property_type: string | null;
  photos: string[] | null;
  status: string;
  views: number;
  created_at: string;
  listing_type: 'rent' | 'sale';
}

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

const PROPERTY_TYPES = [
  { value: '', label: 'Todos los tipos' },
  { value: 'house', label: '🏠 Casa' },
  { value: 'condo', label: '🏢 Condominio' },
  { value: 'apartment', label: '🏘️ Apartamento' },
  { value: 'land', label: '🌳 Terreno' },
  { value: 'commercial', label: '🏪 Comercial' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'Todos los estados' },
  { value: 'active', label: '● Disponible' },
  { value: 'pending', label: '● Pendiente' },
  { value: 'rented', label: '● Alquilada' },
  { value: 'sold', label: '● Vendida' },
];

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMenu, setShowMenu] = useState<string | null>(null);
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [planInfo, setPlanInfo] = useState<{ plan: string; properties_this_month: number } | null>(null);

  // Estados de filtros
  const [filterPropertyType, setFilterPropertyType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user?.id) {
      loadProperties();
      loadPlanInfo();
    }
  }, [session]);

  const loadPlanInfo = async () => {
    try {
      const response = await fetch('/api/agent/current-plan');
      const data = await response.json();
      setPlanInfo(data);
    } catch (error) {
      console.error('Error loading plan:', error);
    }
  };

  const loadProperties = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/property/list');
      
      if (!response.ok) {
        throw new Error('Error al cargar propiedades');
      }
      
      const data = await response.json();
      setProperties(data.properties || []);
    } catch (error) {
      console.error('Error loading properties:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProperty = async (propertyId: string) => {
    setShowMenu(null);
    
    if (!confirm('¿Eliminar esta propiedad?')) return;

    try {
      const response = await fetch(`/api/property/delete/${propertyId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Error al eliminar');
      }

      loadProperties();
    } catch (error) {
      console.error('Error deleting property:', error);
      alert('Error al eliminar la propiedad');
    }
  };

  // Función para filtrar propiedades
  const getFilteredProperties = () => {
    return properties.filter(property => {
      // Filtro por tipo de propiedad
      if (filterPropertyType && property.property_type !== filterPropertyType) {
        return false;
      }

      // Filtro por estado
      if (filterStatus && property.status !== filterStatus) {
        return false;
      }

      // Filtro por búsqueda de texto
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const titleMatch = property.title.toLowerCase().includes(query);
        const cityMatch = property.city?.toLowerCase().includes(query);
        const stateMatch = property.state?.toLowerCase().includes(query);
        
        if (!titleMatch && !cityMatch && !stateMatch) {
          return false;
        }
      }

      return true;
    });
  };

  const clearFilters = () => {
    setFilterPropertyType('');
    setFilterStatus('');
    setSearchQuery('');
  };

  const hasActiveFilters = filterPropertyType || filterStatus || searchQuery.trim();

  if (status === 'loading' || loading) {
    return (
      <MobileLayout title="Mis Propiedades" showTabs={false}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center py-12">
            <div className="text-5xl mb-4 animate-pulse">🏠</div>
            <div className="text-lg" style={{ color: '#0F172A' }}>Cargando...</div>
          </div>
        </div>
      </MobileLayout>
    );
  }

  if (!session) {
    return null;
  }

  const formatPrice = (price: number | null) => {
    if (!price) return 'Precio a consultar';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const filteredProperties = getFilteredProperties();

  return (
    <MobileLayout title="Mis Propiedades" showTabs={true}>
      {/* Stats Card */}
      <div className="px-4 pt-4 pb-2">
        <div 
          className="rounded-2xl p-5 shadow-lg"
          style={{ backgroundColor: '#FFFFFF' }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-70" style={{ color: '#0F172A' }}>
                Total propiedades
              </p>
              <p className="text-3xl font-bold mt-1" style={{ color: '#2563EB' }}>
                {properties.length}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm opacity-70" style={{ color: '#0F172A' }}>
                {planInfo?.plan === 'free' ? 'Límite' : 'Este mes'}
              </p>
              <p className="text-3xl font-bold mt-1" style={{ color: '#2563EB' }}>
                {planInfo?.plan === 'free' 
                  ? `${properties.length} / 20`
                  : `${planInfo?.properties_this_month || 0} / 30`
                }
              </p>
            </div>
          </div>
          
          {planInfo?.plan === 'free' && properties.length >= 20 && (
            <div className="mt-4 pt-4 border-t" style={{ borderColor: '#E5E7EB' }}>
              <p className="text-sm mb-3" style={{ color: '#DC2626' }}>
                ⚠️ Has alcanzado el límite. Elimina una propiedad o actualiza a Pro.
              </p>
              <button
                onClick={() => router.push('/pricing')}
                className="w-full py-2 rounded-xl font-bold text-white shadow-lg active:scale-95 transition-transform"
                style={{ backgroundColor: '#2563EB' }}
              >
                Actualizar a Pro
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Filters Section - STICKY */}
      <div className="sticky top-0 z-20 px-4 pt-3 pb-2" style={{ backgroundColor: '#F5EAD3' }}>
        <div 
          className="rounded-2xl p-4 shadow-xl space-y-3"
          style={{ backgroundColor: '#FFFFFF' }}
        >
          <h3 className="font-bold text-sm" style={{ color: '#0F172A' }}>
            🔍 Filtrar Propiedades
          </h3>

          {/* Search Input */}
          <div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por título, ciudad o estado..."
              className="w-full px-4 py-2.5 rounded-xl border-2 focus:outline-none text-sm"
              style={{ 
                borderColor: '#E5E7EB',
                backgroundColor: '#F9FAFB',
                color: '#0F172A'
              }}
            />
          </div>

          {/* Filter Selects */}
          <div className="grid grid-cols-2 gap-3">
            <select
              value={filterPropertyType}
              onChange={(e) => setFilterPropertyType(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border-2 focus:outline-none text-sm font-semibold"
              style={{ 
                borderColor: '#E5E7EB',
                backgroundColor: '#F9FAFB',
                color: '#0F172A'
              }}
            >
              {PROPERTY_TYPES.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border-2 focus:outline-none text-sm font-semibold"
              style={{ 
                borderColor: '#E5E7EB',
                backgroundColor: '#F9FAFB',
                color: '#0F172A'
              }}
            >
              {STATUS_OPTIONS.map(status => (
                <option key={status.value} value={status.value}>{status.label}</option>
              ))}
            </select>
          </div>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-sm font-semibold underline"
              style={{ color: '#2563EB' }}
            >
              Limpiar filtros
            </button>
          )}

          {/* Results Count */}
          {hasActiveFilters && (
            <div 
              className="px-3 py-2 rounded-lg text-xs font-semibold"
              style={{ 
                backgroundColor: '#EFF6FF',
                color: '#1E40AF'
              }}
            >
              {filteredProperties.length === 0 
                ? '❌ No hay coincidencias' 
                : `✓ ${filteredProperties.length} ${filteredProperties.length === 1 ? 'resultado' : 'resultados'}`
              }
            </div>
          )}
        </div>
      </div>

      {/* No Credits Warning */}
      {session.user.credits === 0 && (
        <div className="px-4 pt-3">
          <div 
            className="rounded-2xl p-4 border-2"
            style={{ 
              backgroundColor: '#FEF3C7',
              borderColor: '#F59E0B'
            }}
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl">⚠️</span>
              <div className="flex-1">
                <p className="font-semibold mb-1" style={{ color: '#0F172A' }}>
                  Sin créditos
                </p>
                <p className="text-sm mb-3 opacity-80" style={{ color: '#0F172A' }}>
                  Compra más créditos para crear listings
                </p>
                <button
                  onClick={() => router.push('/credits')}
                  className="w-full py-2.5 rounded-xl font-semibold text-white shadow-md active:scale-95 transition-transform"
                  style={{ backgroundColor: '#F59E0B' }}
                >
                  Comprar Créditos
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Properties List */}
      {filteredProperties.length === 0 ? (
        <div className="px-4 pt-8">
          <div 
            className="rounded-2xl p-8 text-center"
            style={{ backgroundColor: '#FFFFFF' }}
          >
            <div className="text-6xl mb-4">
              {hasActiveFilters ? '🔍' : '🏘️'}
            </div>
            <h3 className="text-xl font-bold mb-2" style={{ color: '#0F172A' }}>
              {hasActiveFilters ? 'Sin coincidencias' : 'Sin propiedades'}
            </h3>
            <p className="opacity-70 mb-6" style={{ color: '#0F172A' }}>
              {hasActiveFilters 
                ? 'No se encontraron propiedades con los filtros seleccionados'
                : 'Crea tu primera propiedad con IA'
              }
            </p>
            {hasActiveFilters ? (
              <button
                onClick={clearFilters}
                className="w-full py-3 rounded-xl font-semibold border-2 active:scale-95 transition-transform"
                style={{ 
                  borderColor: '#2563EB',
                  color: '#2563EB',
                  backgroundColor: '#FFFFFF'
                }}
              >
                Limpiar filtros
              </button>
            ) : (
              <button
                onClick={() => router.push('/create-property')}
                disabled={session.user.credits < 1}
                className="w-full py-3 rounded-xl font-semibold text-white shadow-lg active:scale-95 transition-transform disabled:opacity-50"
                style={{ backgroundColor: '#2563EB' }}
              >
                ➕ Crear Propiedad
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="px-4 pt-3 space-y-3 pb-4">
          {filteredProperties.map((property) => (
            <div
              key={property.id}
              className="rounded-2xl overflow-hidden shadow-lg active:scale-[0.98] transition-transform relative"
              style={{ backgroundColor: '#FFFFFF' }}
            >
              {/* Image */}
              <div 
                className="relative aspect-video bg-gray-200"
                onClick={() => router.push(`/p/${property.slug}`)}
              >
                {property.photos && property.photos.length > 0 ? (
                  <Image
                    src={property.photos[0]}
                    alt={property.title}
                    fill
                    className="object-contain bg-gray-900"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-6xl">
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

                {/* Menu Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(showMenu === property.id ? null : property.id);
                  }}
                  className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-transform"
                  style={{ backgroundColor: 'rgba(255,255,255,0.95)' }}
                >
                  <svg className="w-5 h-5" fill="#0F172A" viewBox="0 0 24 24">
                    <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                  </svg>
                </button>

                {/* Dropdown Menu */}
                {showMenu === property.id && (
                  <div 
                    className="absolute top-12 right-3 rounded-xl shadow-2xl overflow-hidden z-10 min-w-[160px]"
                    style={{ backgroundColor: '#FFFFFF' }}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowMenu(null);
                        router.push(`/edit-property/${property.id}`);
                      }}
                      className="w-full px-4 py-3 text-left font-semibold active:bg-gray-100 transition-colors flex items-center gap-2"
                      style={{ color: '#0F172A' }}
                    >
                      <span>✏️</span> Editar
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteProperty(property.id);
                      }}
                      className="w-full px-4 py-3 text-left font-semibold active:bg-red-50 transition-colors flex items-center gap-2 border-t"
                      style={{ color: '#DC2626', borderTopColor: '#F3F4F6' }}
                    >
                      <span>🗑️</span> Eliminar
                    </button>
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        setShowMenu(null);
                        const { exportPropertyToPDF } = await import('@/lib/exportPDF');
                        await exportPropertyToPDF(property);
                      }}
                      className="w-full px-4 py-3 text-left font-semibold active:bg-gray-100 transition-colors flex items-center gap-2 border-t"
                      style={{ color: '#0F172A', borderTopColor: '#F3F4F6' }}
                    >
                      <span>📄</span> Exportar PDF
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowMenu(null);
                        setSelectedPropertyId(property.id);
                        setPublishModalOpen(true);
                      }}
                      className="w-full px-4 py-3 text-left font-semibold active:bg-gray-100 transition-colors flex items-center gap-2 border-t"
                      style={{ color: '#1877F2', borderTopColor: '#F3F4F6' }}
                    >
                      <span>📘</span> Publicar en Facebook
                    </button>
                  </div>
                )}
              </div>

              {/* Content */}
              <div 
                className="p-4"
                onClick={() => router.push(`/p/${property.slug}`)}
              >
                <h3 className="font-bold text-lg mb-2 line-clamp-2" style={{ color: '#0F172A' }}>
                  {property.title}
                </h3>
                
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xl font-bold" style={{ color: '#2563EB' }}>
                    {formatPrice(property.price)}
                  </span>
                  {property.city && property.state && (
                    <span className="text-sm opacity-70" style={{ color: '#0F172A' }}>
                      📍 {property.city}, {property.state}
                    </span>
                  )}
                </div>

                {/* Property Type Badge */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{
                    backgroundColor: '#F5EAD3',
                    color: '#0F172A'
                  }}>
                    🏡 {translatePropertyType(property.property_type)}
                  </span>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{
                    backgroundColor: property.listing_type === 'rent' ? '#FEF3C7' : '#D1FAE5',
                    color: property.listing_type === 'rent' ? '#92400E' : '#065F46'
                  }}>
                    {property.listing_type === 'rent' ? 'Alquiler' : 'Venta'}
                  </span>
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
      {/* Facebook Publish Modal */}
      <FacebookPublishModal
        isOpen={publishModalOpen}
        onClose={() => setPublishModalOpen(false)}
        propertyId={selectedPropertyId || ''}
      />
    </MobileLayout>
  );
}