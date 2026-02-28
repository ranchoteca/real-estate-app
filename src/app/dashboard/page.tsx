'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import GeneratingPDFModal from '@/components/GeneratingPDFModal';
import FacebookPublishModal from '@/components/FacebookPublishModal';
import MobileLayout from '@/components/MobileLayout';
import Image from 'next/image';
import { useTranslation } from '@/hooks/useTranslation';
import { useI18nStore } from '@/lib/i18n-store';
import PropertyActionModal from '@/components/property/PropertyActionModal';

interface Property {
  id: string;
  title: string;
  slug: string;
  price: number | null;
  currency_id: string | null;
  city: string | null;
  state: string | null;
  property_type: string | null;
  photos: string[] | null;
  status: string;
  views: number;
  created_at: string;
  listing_type: 'rent' | 'sale';
  language: 'es' | 'en';
  video_url: string | null;
  video_urls: string[] | null;
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

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { t } = useTranslation();
  const { language } = useI18nStore();

  const PROPERTY_TYPES = [
    { value: '', label: language === 'en' ? 'All types' : 'Todos los tipos' },
    { value: 'house', label: '🏠 ' + (language === 'en' ? 'House' : 'Casa') },
    { value: 'condo', label: '🏢 ' + (language === 'en' ? 'Condo' : 'Condominio') },
    { value: 'apartment', label: '🏘️ ' + (language === 'en' ? 'Apartment' : 'Apartamento') },
    { value: 'land', label: '🌳 ' + (language === 'en' ? 'Land' : 'Terreno') },
    { value: 'commercial', label: '🏪 ' + (language === 'en' ? 'Commercial' : 'Comercial') },
  ];

  const STATUS_OPTIONS = [
    { value: '', label: language === 'en' ? 'All statuses' : 'Todos los estados' },
    { value: 'active', label: '● ' + (language === 'en' ? 'Available' : 'Disponible') },
    { value: 'pending', label: '● ' + (language === 'en' ? 'Pending' : 'Pendiente') },
    { value: 'rented', label: '● ' + (language === 'en' ? 'Rented' : 'Alquilada') },
    { value: 'sold', label: '● ' + (language === 'en' ? 'Sold' : 'Vendida') },
  ];

  const LANGUAGE_OPTIONS = [
    { value: '', label: language === 'en' ? 'All languages' : 'Todos los idiomas' },
    { value: 'es', label: '🇪🇸 Español' },
    { value: 'en', label: '🇺🇸 English' },
  ];

  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMenu, setShowMenu] = useState<string | null>(null);
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [planInfo, setPlanInfo] = useState<{ plan: string; properties_this_month: number } | null>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // Estados para duplicar y traducir
  const [duplicating, setDuplicating] = useState(false);
  const [translateModal, setTranslateModal] = useState<{
    open: boolean;
    propertyId: string | null;
    currentLang: 'es' | 'en' | null;
  }>({ open: false, propertyId: null, currentLang: null });

  // Estados de filtros
  const [filterPropertyType, setFilterPropertyType] = useState('');
  const [filterLanguage, setFilterLanguage] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [currencies, setCurrencies] = useState<any[]>([]);

  // Estados para modal de acción
  const [actionModal, setActionModal] = useState<{
    open: boolean;
    type: 'duplicating' | 'translating';
    message: string;
  }>({ open: false, type: 'duplicating', message: '' });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user?.id) {
      loadProperties();
      loadPlanInfo();
      loadCurrencies();
    }
  }, [session]);

  // Estado para mostrar/ocultar filtros avanzados
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const loadPlanInfo = async () => {
    try {
      const response = await fetch('/api/agent/current-plan');
      const data = await response.json();
      setPlanInfo(data);
    } catch (error) {
      console.error('Error loading plan:', error);
    }
  };

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

  const refreshSession = async () => {
    // Forzar actualización de la sesión
    const event = new Event("visibilitychange");
    document.dispatchEvent(event);
    
    // Alternativa: hacer fetch al endpoint de sesión
    await fetch('/api/auth/session', { method: 'GET' });
  };

  const handleDeleteProperty = async (propertyId: string) => {
    setShowMenu(null);
    
    if (!confirm(language === 'en' 
      ? 'Delete this property?' 
      : '¿Eliminar esta propiedad?'
    )) return;

    try {
      const response = await fetch(`/api/property/delete/${propertyId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Error al eliminar');
      }

      // Solo recargar propiedades (el contador se actualiza automáticamente)
      await loadProperties();
      
    } catch (error) {
      console.error('Error deleting property:', error);
      alert(language === 'en' 
        ? 'Error deleting property'
        : 'Error al eliminar la propiedad'
      );
    }
  };

  const handleDuplicate = async (propertyId: string) => {
    const confirmed = confirm(
      language === 'en' 
        ? 'Duplicate this property in the same language?'
        : '¿Duplicar esta propiedad en el mismo idioma?'
    );
    
    if (!confirmed) return;

    try {
      setDuplicating(true);
      
      // Mostrar modal
      setActionModal({
        open: true,
        type: 'duplicating',
        message: language === 'en' ? 'Duplicating property...' : 'Duplicando propiedad...'
      });
      
      const response = await fetch('/api/property/duplicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId }),
      });

      if (!response.ok) throw new Error('Error al duplicar');

      const { newPropertyId } = await response.json();
      
      // NUEVO: Recargar propiedades para actualizar el contador
      await loadProperties();
      
      // NUEVO: Actualizar sesión
      await refreshSession();
      
      alert(
        language === 'en'
          ? '✅ Property duplicated successfully'
          : '✅ Propiedad duplicada exitosamente'
      );

      // Cerrar modal antes de redirigir
      setActionModal({ open: false, type: 'duplicating', message: '' });
      router.push(`/edit-property/${newPropertyId}`);
      
    } catch (error) {
      // Cerrar modal en caso de error
      setActionModal({ open: false, type: 'duplicating', message: '' });
      alert(
        language === 'en'
          ? '❌ Error duplicating property'
          : '❌ Error al duplicar la propiedad'
      );
    } finally {
      setDuplicating(false);
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

      // Filtro por idioma
      if (filterLanguage && property.language !== filterLanguage) {
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
    setFilterLanguage('');
    setSearchQuery('');
  };

  const hasActiveFilters = filterPropertyType || filterStatus || filterLanguage || searchQuery.trim();

  if (status === 'loading' || loading) {
    return (
      <MobileLayout title={language === 'en' ? 'My Properties' : 'Mis Propiedades'} showTabs={false}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center py-12">
            <div className="text-5xl mb-4 animate-pulse">🏠</div>
            <div className="text-lg" style={{ color: '#0F172A' }}>
              {language === 'en' ? 'Loading...' : 'Cargando...'}
            </div>
          </div>
        </div>
      </MobileLayout>
    );
  }

  if (!session) {
    return null;
  }

  const formatPrice = (price: number | null, currencyId: string | null) => {
    if (!price) return language === 'en' ? 'Price upon request' : 'Precio a consultar';
    
    const currency = currencies.find(c => c.id === currencyId);
    const symbol = currency?.symbol || '$';
    
    return `${symbol}${new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price)}`;
  };

  const filteredProperties = getFilteredProperties();

  return (
    <MobileLayout 
      title={language === 'en' ? 'My Properties' : 'Mis Propiedades'} 
      showTabs={true}
      currentPropertyCount={properties.length}
    >
      {/* Stats Card */}
      <div className="px-4 pt-3 pb-2">
        <div 
          className="rounded-xl p-3 shadow-md"
          style={{ backgroundColor: '#FFFFFF' }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs opacity-70" style={{ color: '#0F172A' }}>
                {language === 'en' ? 'Total properties' : 'Total propiedades'}
              </p>
              <p className="text-2xl font-bold mt-1" style={{ color: '#2563EB' }}>
                {properties.length}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs opacity-70" style={{ color: '#0F172A' }}>
                {planInfo?.plan === 'free' 
                  ? (language === 'en' ? 'Limit' : 'Límite')
                  : (language === 'en' ? 'This month' : 'Este mes')
                }
              </p>
              <p className="text-2xl font-bold mt-1" style={{ color: '#2563EB' }}>
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
                ⚠️ {language === 'en' 
                  ? 'You have reached the limit. Delete a property or upgrade to Pro.'
                  : 'Has alcanzado el límite. Elimina una propiedad o actualiza a Pro.'
                }
              </p>
              <button
                onClick={() => router.push('/pricing')}
                className="w-full py-2 rounded-xl font-bold text-white shadow-lg active:scale-95 transition-transform"
                style={{ backgroundColor: '#2563EB' }}
              >
                {language === 'en' ? 'Upgrade to Pro' : 'Actualizar a Pro'}
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
          🔍 {language === 'en' ? 'Filter Properties' : 'Filtrar Propiedades'}
        </h3>

        {/* Search Input - SIEMPRE VISIBLE */}
        <div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={language === 'en' ? 'Search by title, city or state...' : 'Buscar por título, ciudad o estado...'}
            className="w-full px-4 py-2.5 rounded-xl border-2 focus:outline-none text-sm"
            style={{ 
              borderColor: '#E5E7EB',
              backgroundColor: '#F9FAFB',
              color: '#0F172A'
            }}
          />
        </div>

        {/* Botón para mostrar/ocultar filtros avanzados */}
        <button
          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          className="w-full py-2 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
          style={{ 
            backgroundColor: '#EFF6FF',
            color: '#2563EB'
          }}
        >
          {showAdvancedFilters ? '▲' : '▼'} 
          {language === 'en' ? 'Advanced Filters' : 'Filtros Avanzados'}
        </button>

        {/* Filter Selects - COLAPSABLES */}
        {showAdvancedFilters && (
          <div className="space-y-2 pt-2 border-t" style={{ borderTopColor: '#E5E7EB' }}>
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

            <select
              value={filterLanguage}
              onChange={(e) => setFilterLanguage(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border-2 focus:outline-none text-sm font-semibold"
              style={{ 
                borderColor: '#E5E7EB',
                backgroundColor: '#F9FAFB',
                color: '#0F172A'
              }}
            >
              {LANGUAGE_OPTIONS.map(lang => (
                <option key={lang.value} value={lang.value}>{lang.label}</option>
              ))}
            </select>
          </div>
        )}

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="text-sm font-semibold underline"
            style={{ color: '#2563EB' }}
          >
            {language === 'en' ? 'Clear filters' : 'Limpiar filtros'}
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
              ? (language === 'en' ? '❌ No matches' : '❌ No hay coincidencias')
              : `✓ ${filteredProperties.length} ${language === 'en' ? (filteredProperties.length === 1 ? 'result' : 'results') : (filteredProperties.length === 1 ? 'resultado' : 'resultados')}`
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
                  {language === 'en' ? 'No credits' : 'Sin créditos'}
                </p>
                <p className="text-sm mb-3 opacity-80" style={{ color: '#0F172A' }}>
                  {language === 'en' 
                    ? 'Buy more credits to create listings'
                    : 'Compra más créditos para crear listings'
                  }
                </p>
                <button
                  onClick={() => router.push('/credits')}
                  className="w-full py-2.5 rounded-xl font-semibold text-white shadow-md active:scale-95 transition-transform"
                  style={{ backgroundColor: '#F59E0B' }}
                >
                  {language === 'en' ? 'Buy Credits' : 'Comprar Créditos'}
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
              {hasActiveFilters 
                ? (language === 'en' ? 'No matches' : 'Sin coincidencias')
                : (language === 'en' ? 'No properties' : 'Sin propiedades')
              }
            </h3>
            <p className="opacity-70 mb-6" style={{ color: '#0F172A' }}>
              {hasActiveFilters 
                ? (language === 'en' 
                    ? 'No properties found with the selected filters'
                    : 'No se encontraron propiedades con los filtros seleccionados')
                : (language === 'en'
                    ? 'Create your first property with AI'
                    : 'Crea tu primera propiedad con IA')
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
                {language === 'en' ? 'Clear filters' : 'Limpiar filtros'}
              </button>
            ) : (
              <button
                onClick={() => router.push('/create-property')}
                disabled={session.user.credits < 1}
                className="w-full py-3 rounded-xl font-semibold text-white shadow-lg active:scale-95 transition-transform disabled:opacity-50"
                style={{ backgroundColor: '#2563EB' }}
              >
                ➕ {language === 'en' ? 'Create Property' : 'Crear Propiedad'}
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
                    unoptimized
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
                    {property.status === 'active' 
                      ? (language === 'en' ? '● Available' : '● Disponible')
                      : property.status === 'rented' 
                        ? (language === 'en' ? '● Rented' : '● Alquilada')
                        : (language === 'en' ? '● Sold' : '● Vendida')
                    }
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
                    {/* Editar */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowMenu(null);
                        router.push(`/edit-property/${property.id}`);
                      }}
                      className="w-full px-4 py-3 text-left font-semibold active:bg-gray-100 transition-colors flex items-center gap-2"
                      style={{ color: '#0F172A' }}
                    >
                      <span>✏️</span> {language === 'en' ? 'Edit' : 'Editar'}
                    </button>

                    {/* Duplicar */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowMenu(null);
                        handleDuplicate(property.id);
                      }}
                      className="w-full px-4 py-3 text-left font-semibold active:bg-gray-100 transition-colors flex items-center gap-2 border-t"
                      style={{ color: '#0F172A', borderTopColor: '#F3F4F6' }}
                      disabled={duplicating}
                    >
                      <span>📋</span> {language === 'en' ? 'Duplicate' : 'Duplicar'}
                    </button>

                    {/* Traducir */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowMenu(null);
                        setTranslateModal({ 
                          open: true, 
                          propertyId: property.id, 
                          currentLang: property.language 
                        });
                      }}
                      className="w-full px-4 py-3 text-left font-semibold active:bg-gray-100 transition-colors flex items-center gap-2 border-t"
                      style={{ color: '#0F172A', borderTopColor: '#F3F4F6' }}
                    >
                      <span>🌐</span> {language === 'en' 
                        ? `Translate to ${property.language === 'es' ? 'English' : 'Spanish'}`
                        : `Traducir a ${property.language === 'es' ? 'Inglés' : 'Español'}`
                      }
                    </button>

                    {/* Eliminar - MANTENER EN ROJO */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteProperty(property.id);
                      }}
                      className="w-full px-4 py-3 text-left font-semibold active:bg-red-50 transition-colors flex items-center gap-2 border-t"
                      style={{ color: '#DC2626', borderTopColor: '#F3F4F6' }}
                    >
                      <span>🗑️</span> {language === 'en' ? 'Delete' : 'Eliminar'}
                    </button>

                    {/* Exportar PDF */}
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        setShowMenu(null);
                        setIsGeneratingPDF(true);
                        try {
                          const propertyResponse = await fetch(`/api/property/${property.slug}`);
                          if (!propertyResponse.ok) {
                            throw new Error('No se pudo cargar la propiedad completa');
                          }
                          
                          const propertyData = await propertyResponse.json();
                          const fullProperty = propertyData.property;

                          let customFields = [];
                          if (fullProperty.property_type && fullProperty.listing_type) {
                            try {
                              const params = new URLSearchParams({
                                property_type: fullProperty.property_type,
                                listing_type: fullProperty.listing_type,
                              });
                              const response = await fetch(`/api/custom-fields/list?${params.toString()}`);
                              if (response.ok) {
                                const data = await response.json();
                                customFields = data.fields || [];
                              }
                            } catch (err) {
                              console.warn('No se pudieron cargar campos personalizados');
                            }
                          }

                          // Obtener información de la divisa
                          const currencyInfo = currencies.find(c => c.id === fullProperty.currency_id);
                          const currency = currencyInfo ? { symbol: currencyInfo.symbol, code: currencyInfo.code } : { symbol: '$', code: 'USD' };

                          const { exportPropertyToPDF } = await import('@/lib/exportPDF');
                          await exportPropertyToPDF(fullProperty, fullProperty.agent, customFields, fullProperty.language, currency);
                        } catch (error) {
                          console.error('Error generando PDF:', error);
                          alert('Error al generar el PDF');
                        } finally {
                          setIsGeneratingPDF(false);
                        }
                      }}
                      className="w-full px-4 py-3 text-left font-semibold active:bg-gray-100 transition-colors flex items-center gap-2 border-t"
                      style={{ color: '#0F172A', borderTopColor: '#F3F4F6' }}
                    >
                      <span>📄</span> {language === 'en' ? 'Export PDF' : 'Exportar PDF'}
                    </button>

                    {/* Publicar en Facebook */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowMenu(null);
                        setSelectedPropertyId(property.id);
                        setPublishModalOpen(true);
                      }}
                      className="w-full px-4 py-3 text-left font-semibold active:bg-gray-100 transition-colors flex items-center gap-2 border-t"
                      style={{ color: '#0F172A', borderTopColor: '#F3F4F6' }}
                    >
                      <span>📘</span> {language === 'en' ? 'Publish on Facebook' : 'Publicar en Facebook'}
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
                    {formatPrice(property.price, property.currency_id)}
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
                    🏡 {translatePropertyType(property.property_type, language)}
                  </span>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{
                    backgroundColor: property.listing_type === 'rent' ? '#FEF3C7' : '#D1FAE5',
                    color: property.listing_type === 'rent' ? '#92400E' : '#065F46'
                  }}>
                    {property.listing_type === 'rent' 
                      ? (language === 'en' ? 'Rent' : 'Alquiler')
                      : (language === 'en' ? 'Sale' : 'Venta')
                    }
                  </span>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{
                    backgroundColor: '#DBEAFE',
                    color: '#1E40AF'
                  }}>
                    {property.language === 'es' ? '🇪🇸' : property.language === 'en' ? '🇺🇸' : '❓'}
                  </span>
                </div>

                {/* Footer */}
                <div className="flex justify-between items-center text-xs pt-3 border-t opacity-60" style={{ color: '#0F172A', borderTopColor: '#E5E7EB' }}>
                  <span>👁️ {property.views} {language === 'en' ? 'views' : 'vistas'}</span>
                  <span>{new Date(property.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {/* Modal de Generando PDF */}
      <GeneratingPDFModal isOpen={isGeneratingPDF} />
      
      {/* Facebook Publish Modal */}
      <FacebookPublishModal
        isOpen={publishModalOpen}
        onClose={() => setPublishModalOpen(false)}
        propertyId={selectedPropertyId || ''}
      />

      {/* NUEVO: Modal de Traducir */}
      {translateModal.open && translateModal.propertyId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold mb-4" style={{ color: '#0F172A' }}>
              🌐 {language === 'en' ? 'Translate property' : 'Traducir propiedad'}
            </h3>

            <div className="mb-4">
              <p className="text-sm mb-2" style={{ color: '#0F172A' }}>
                <strong>{language === 'en' ? 'Current language:' : 'Idioma actual:'}</strong> {translateModal.currentLang === 'es' ? '🇪🇸 Español' : '🇺🇸 English'}
              </p>
              <p className="text-sm mb-4" style={{ color: '#0F172A' }}>
                <strong>{language === 'en' ? 'Translate to:' : 'Traducir a:'}</strong> {translateModal.currentLang === 'es' ? '🇺🇸 English' : '🇪🇸 Español'}
              </p>

              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 mb-4">
                <p className="text-sm font-semibold mb-2" style={{ color: '#1E40AF' }}>
                  {language === 'en' 
                    ? 'How do you want to create the translation?'
                    : '¿Cómo deseas crear la traducción?'
                  }
                </p>

                <label className="flex items-start gap-3 mb-3 cursor-pointer">
                  <input
                    type="radio"
                    name="translate-option"
                    value="ai"
                    defaultChecked
                    className="mt-1"
                  />
                  <div>
                    <div className="font-semibold text-sm" style={{ color: '#0F172A' }}>
                      🤖 {language === 'en' ? 'With AI (recommended)' : 'Con IA (recomendado)'}
                    </div>
                    <div className="text-xs" style={{ color: '#6B7280' }}>
                      {language === 'en'
                        ? 'Automatically translates title, description, address and custom fields'
                        : 'Traduce automáticamente título, descripción, dirección y campos personalizados'
                      }
                    </div>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="translate-option"
                    value="manual"
                    className="mt-1"
                  />
                  <div>
                    <div className="font-semibold text-sm" style={{ color: '#0F172A' }}>
                      ✍️ {language === 'en' ? 'Manual' : 'Manual'}
                    </div>
                    <div className="text-xs" style={{ color: '#6B7280' }}>
                      {language === 'en'
                        ? 'Creates a copy without translating (you will have to edit manually)'
                        : 'Crea una copia sin traducir (tendrás que editar manualmente)'
                      }
                    </div>
                  </div>
                </label>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                <p className="text-xs" style={{ color: '#92400E' }}>
                  ⚠️ <strong>{language === 'en' ? 'Note:' : 'Nota:'}</strong> {language === 'en'
                    ? 'The original property will remain unchanged. You can edit the translation after creating it.'
                    : 'La propiedad original se mantendrá sin cambios. Podrás editar la traducción después de crearla.'
                  }
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setTranslateModal({ open: false, propertyId: null, currentLang: null })}
                className="flex-1 py-3 rounded-xl font-bold border-2"
                style={{ borderColor: '#E5E7EB', color: '#0F172A' }}
              >
                {language === 'en' ? 'Cancel' : 'Cancelar'}
              </button>
              <button
              onClick={async () => {
                const useAI = (document.querySelector('input[name="translate-option"]:checked') as HTMLInputElement)?.value === 'ai';
                const targetLang = translateModal.currentLang === 'es' ? 'en' : 'es';

                // Cerrar modal de opciones
                setTranslateModal({ open: false, propertyId: null, currentLang: null });

                // Mostrar modal de progreso
                setActionModal({
                  open: true,
                  type: 'translating',
                  message: useAI 
                    ? (language === 'en' ? 'Translating with AI...' : 'Traduciendo con IA...')
                    : (language === 'en' ? 'Creating copy...' : 'Creando copia...')
                });

                try {
                  const response = await fetch('/api/property/translate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      propertyId: translateModal.propertyId,
                      targetLanguage: targetLang,
                      useAI,
                    }),
                  });

                  if (!response.ok) throw new Error('Error al traducir');

                  const { newPropertyId } = await response.json();

                  // NUEVO: Recargar propiedades para actualizar el contador
                  await loadProperties();
                  
                  // NUEVO: Actualizar sesión
                  await refreshSession();

                  // Cerrar modal de progreso
                  setActionModal({ open: false, type: 'translating', message: '' });
                  
                  alert(useAI 
                    ? (language === 'en' 
                        ? '✅ Property translated with AI. Review and adjust if necessary.'
                        : '✅ Propiedad traducida con IA. Revisa y ajusta si es necesario.')
                    : (language === 'en'
                        ? '✅ Property cloned. Edit the content manually.'
                        : '✅ Propiedad clonada. Edita el contenido manualmente.')
                  );
                  
                  router.push(`/edit-property/${newPropertyId}`);

                } catch (error) {
                  // Cerrar modal en caso de error
                  setActionModal({ open: false, type: 'translating', message: '' });
                  alert(language === 'en'
                    ? '❌ Error translating property'
                    : '❌ Error al traducir la propiedad'
                  );
                }
              }}
              className="flex-1 py-3 rounded-xl font-bold text-white shadow-lg"
              style={{ backgroundColor: '#F59E0B' }}
            >
              🌐 {language === 'en' ? 'Create translation' : 'Crear traducción'}
            </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal de acción (Duplicar/Traducir) */}
      <PropertyActionModal
        isOpen={actionModal.open}
        message={actionModal.message}
        type={actionModal.type}
      />
    </MobileLayout>
  );
}