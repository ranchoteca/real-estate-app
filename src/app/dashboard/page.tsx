'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { trackEvent } from '@/lib/fbpixel';
import GeneratingPDFModal from '@/components/GeneratingPDFModal';
import FacebookPublishModal from '@/components/FacebookPublishModal';
import MobileLayout from '@/components/MobileLayout';
import Image from 'next/image';
import { useTranslation } from '@/hooks/useTranslation';
import { useI18nStore } from '@/lib/i18n-store';
import PropertyActionModal from '@/components/property/PropertyActionModal';
import CalculateAltitudeModal from '@/components/property/CalculateAltitudeModal';
import CreateProposalModal from '@/components/proposal/CreateProposalModal';
import MyProposalsModal from '@/components/proposal/MyProposalsModal';

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
  last_facebook_published_at: string | null;
}

const translatePropertyType = (type: string | null, lang: 'es' | 'en'): string => {
  const translations: Record<string, Record<'es' | 'en', string>> = {
    house: { es: 'Casa', en: 'House' },
    condo: { es: 'Condominio', en: 'Condo' },
    apartment: { es: 'Apartamento', en: 'Apartment' },
    land: { es: 'Terreno', en: 'Land' },
    commercial: { es: 'Comercial', en: 'Commercial' },
    hotel: { es: 'Hotel', en: 'Hotel' },
    finca: { es: 'Finca', en: 'Farm' },
    ranch: { es: 'Quinta', en: 'Ranch' },
    other: { es: 'Otros', en: 'Other' },
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
    { value: 'hotel', label: '🏨 ' + (language === 'en' ? 'Hotel' : 'Hotel') },
    { value: 'finca', label: '🌾 ' + (language === 'en' ? 'Farm' : 'Finca') },
    { value: 'ranch', label: '🌄 ' + (language === 'en' ? 'Ranch' : 'Quinta') },
    { value: 'other', label: '🏷️ ' + (language === 'en' ? 'Other' : 'Otros') },
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

  // ── ESTADO EXISTENTE ───────────────────────────────────────────────────────
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMenu, setShowMenu] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; right: number }>({ top: 0, right: 0 });
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [planInfo, setPlanInfo] = useState<{ plan: string; role: string; expires_at: string | null } | null>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [translateModal, setTranslateModal] = useState<{
    open: boolean;
    propertyId: string | null;
    currentLang: 'es' | 'en' | null;
  }>({ open: false, propertyId: null, currentLang: null });
  const [filterPropertyType, setFilterPropertyType] = useState('');
  const [filterLanguage, setFilterLanguage] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currencies, setCurrencies] = useState<any[]>([]);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [actionModal, setActionModal] = useState<{
    open: boolean;
    type: 'duplicating' | 'translating';
    message: string;
  }>({ open: false, type: 'duplicating', message: '' });
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [isAltitudeModalOpen, setIsAltitudeModalOpen] = useState(false);
  const [isCreateProposalOpen, setIsCreateProposalOpen] = useState(false);
  const [isMyProposalsOpen, setIsMyProposalsOpen] = useState(false);

  // ── NUEVO: PROPOSAL SELECTION STATE ───────────────────────────────────────
  const [selectedForProposal, setSelectedForProposal] = useState<Set<string>>(new Set());
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [hintDismissed, setHintDismissed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('proposal_hint_dismissed') === 'true';
  });

  // ── EFFECTS EXISTENTES ────────────────────────────────────────────────────
  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status, router]);

  useEffect(() => {
    if (session?.user?.id) {
      loadProperties();
      loadPlanInfo();
      loadCurrencies();
    }
  }, [session]);

  useEffect(() => {
    if (session?.user?.id) {
      const checkIfNewUser = async () => {
        try {
          const response = await fetch('/api/agent/current-plan');
          const data = await response.json();
          if (data.created_at) {
            const createdAt = new Date(data.created_at).getTime();
            const now = Date.now();
            const diffMinutes = (now - createdAt) / 1000 / 60;
            if (diffMinutes < 2) {
              trackEvent('CompleteRegistration', {
                value: 0,
                currency: 'CRC',
                content_name: 'Google Sign Up',
              });
              console.log('✅ Facebook: CompleteRegistration fired');
            }
          }
        } catch (error) {
          console.error('Error checking new user:', error);
        }
      };
      checkIfNewUser();
    }
  }, [session?.user?.id]);

  useEffect(() => {
    const close = () => setShowMenu(null);
    window.addEventListener('scroll', close, true);
    return () => window.removeEventListener('scroll', close, true);
  }, []);

  // ── FUNCIONES EXISTENTES ──────────────────────────────────────────────────
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
      if (!response.ok) throw new Error('Error al cargar propiedades');
      const data = await response.json();
      setProperties(data.properties || []);
    } catch (error) {
      console.error('Error loading properties:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshSession = async () => {
    const event = new Event('visibilitychange');
    document.dispatchEvent(event);
    await fetch('/api/auth/session', { method: 'GET' });
  };

  const handleDeleteProperty = async (propertyId: string) => {
    setShowMenu(null);
    if (!confirm(language === 'en' ? 'Delete this property?' : '¿Eliminar esta propiedad?')) return;
    try {
      const response = await fetch(`/api/property/delete/${propertyId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Error al eliminar');
      await loadProperties();
    } catch (error) {
      console.error('Error deleting property:', error);
      alert(language === 'en' ? 'Error deleting property' : 'Error al eliminar la propiedad');
    }
  };

  const handleDuplicate = async (propertyId: string) => {
    const confirmed = confirm(
      language === 'en' ? 'Duplicate this property in the same language?' : '¿Duplicar esta propiedad en el mismo idioma?'
    );
    if (!confirmed) return;
    try {
      setDuplicating(true);
      setActionModal({ open: true, type: 'duplicating', message: language === 'en' ? 'Duplicating property...' : 'Duplicando propiedad...' });
      const response = await fetch('/api/property/duplicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId }),
      });
      if (!response.ok) throw new Error('Error al duplicar');
      const { newPropertyId } = await response.json();
      await loadProperties();
      await refreshSession();
      alert(language === 'en' ? '✅ Property duplicated successfully' : '✅ Propiedad duplicada exitosamente');
      setActionModal({ open: false, type: 'duplicating', message: '' });
      router.push(`/edit-property/${newPropertyId}`);
    } catch (error) {
      setActionModal({ open: false, type: 'duplicating', message: '' });
      alert(language === 'en' ? '❌ Error duplicating property' : '❌ Error al duplicar la propiedad');
    } finally {
      setDuplicating(false);
    }
  };

  const getFilteredProperties = () => {
    return properties.filter(property => {
      if (filterPropertyType && property.property_type !== filterPropertyType) return false;
      if (filterStatus && property.status !== filterStatus) return false;
      if (filterLanguage && property.language !== filterLanguage) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const titleMatch = property.title.toLowerCase().includes(query);
        const cityMatch = property.city?.toLowerCase().includes(query);
        const stateMatch = property.state?.toLowerCase().includes(query);
        if (!titleMatch && !cityMatch && !stateMatch) return false;
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

  // ── NUEVAS FUNCIONES: PROPOSALS ───────────────────────────────────────────
  const toggleCardExpand = (e: React.MouseEvent, propertyId: string) => {
    const target = e.target as HTMLElement;
    if (target.closest('[data-bookmark]') || target.closest('[data-menu]')) return;
    setExpandedCards(prev => {
      const next = new Set(prev);
      next.has(propertyId) ? next.delete(propertyId) : next.add(propertyId);
      return next;
    });
  };

  const toggleProposalBookmark = (e: React.MouseEvent, propertyId: string) => {
    e.stopPropagation();
    setSelectedForProposal(prev => {
      const next = new Set(prev);
      next.has(propertyId) ? next.delete(propertyId) : next.add(propertyId);
      return next;
    });
  };

  const clearProposalSelection = () => {
    setSelectedForProposal(new Set());
  };

  const dismissHint = () => {
    setHintDismissed(true);
    localStorage.setItem('proposal_hint_dismissed', 'true');
  };

  const formatExpandDate = (dateStr: string | null): string | null => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString(language === 'en' ? 'en-US' : 'es-ES', {
      day: 'numeric',
      month: 'short',
    });
  };

  // ── GUARDS ────────────────────────────────────────────────────────────────
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

  if (!session) return null;

  const formatPrice = (price: number | null, currencyId: string | null) => {
    if (!price) return language === 'en' ? 'Price upon request' : 'Precio a consultar';
    const currency = currencies.find(c => c.id === currencyId);
    const symbol = currency?.symbol || '$';
    return `${symbol}${new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(price)}`;
  };

  const isProActivo =
    planInfo?.role === 'admin' ||
    (planInfo?.plan === 'pro' && !!planInfo?.expires_at && new Date(planInfo.expires_at) > new Date());

  const isFree = planInfo?.plan === 'free';
  const filteredProperties = getFilteredProperties();
  const hasProperties = properties.length > 0;

  // ── PANTALLA DE BIENVENIDA (0 propiedades) ─────────────────────────────────
  if (!hasProperties) {
    return (
      <MobileLayout
        title={language === 'en' ? 'My Properties' : 'Mis Propiedades'}
        showTabs={true}
        currentPropertyCount={0}
        onCreateLimitReached={() => {}}
      >
        <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center">
          <div className="text-6xl mb-4">🏠</div>
          <h2 className="text-2xl font-bold mb-3" style={{ color: '#0F172A' }}>
            {language === 'en' ? 'Welcome to Flow Estate AI!' : '¡Bienvenido a Flow Estate AI!'}
          </h2>
          <p className="text-base opacity-70 mb-2" style={{ color: '#0F172A' }}>
            {language === 'en' ? 'You only need 3 minutes and your phone.' : 'Solo necesitas 3 minutos y tu celular.'}
          </p>
          <p className="text-sm opacity-50 mb-8" style={{ color: '#0F172A' }}>
            {language === 'en'
              ? 'Speak the description, upload photos and share your first professional listing.'
              : 'Habla la descripción, sube las fotos y comparte tu primera propiedad profesional.'}
          </p>
          <button
            onClick={() => router.push('/create-property')}
            className="w-full max-w-xs py-4 rounded-2xl font-bold text-white text-lg shadow-xl active:scale-95 transition-transform"
            style={{ backgroundColor: '#2563EB' }}
          >
            🎤 {language === 'en' ? 'Create my first property' : 'Crear mi primera propiedad'}
          </button>
          <p className="text-xs mt-4 opacity-40" style={{ color: '#0F172A' }}>
            {language === 'en' ? 'Free forever for your first 5 properties' : 'Gratis para tus primeras 5 propiedades'}
          </p>
        </div>
      </MobileLayout>
    );
  }

  // ── DASHBOARD NORMAL (1+ propiedades) ─────────────────────────────────────
  return (
    <MobileLayout
      title={language === 'en' ? 'My Properties' : 'Mis Propiedades'}
      showTabs={true}
      currentPropertyCount={properties.length}
      onCreateLimitReached={() => setShowLimitModal(true)}
    >
      {/* Stats Card */}
      <div className="px-4 pt-3 pb-2">
        {isProActivo && (
          <div className="mt-2 mb-2 px-3 py-2 rounded-xl flex items-center gap-2" style={{ backgroundColor: '#F0FDF4', border: '1.5px solid #BBF7D0' }}>
            <span className="text-lg">⭐</span>
            <p className="text-sm font-bold" style={{ color: '#15803D' }}>
              {language === 'en' ? 'Your current plan is Pro' : 'Tu plan actual es Pro'}
            </p>
          </div>
        )}
        {/* ── Stats badge (sin botón Propuestas) ── */}
        <div className="rounded-xl p-3 shadow-md" style={{ backgroundColor: '#FFFFFF' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs opacity-70" style={{ color: '#0F172A' }}>
                {language === 'en' ? 'Total properties' : 'Total propiedades'}
              </p>
              <p className="text-2xl font-bold mt-1" style={{ color: '#2563EB' }}>{properties.length}</p>
            </div>
            <div className="text-right">
              <p className="text-xs opacity-70" style={{ color: '#0F172A' }}>
                {language === 'en' ? 'Limit' : 'Límite'}
              </p>
              <p className="text-2xl font-bold mt-1" style={{ color: '#2563EB' }}>
                {planInfo?.plan === 'free' ? `${properties.length} / 5` : `${properties.length} / 150`}
              </p>
            </div>
          </div>
        </div>

        {/* ── Botón Mis Propuestas — debajo del stats badge, encima de filtros ── */}
        <button
          onClick={() => setIsMyProposalsOpen(true)}
          className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm active:scale-95 transition-transform"
          style={{ backgroundColor: '#EFF6FF', color: '#2563EB', border: '1.5px solid #BFDBFE' }}
        >
          🗂️ {language === 'en' ? 'My Proposals' : 'Mis Propuestas'}
        </button>
      </div>

      {/* Filters Section */}
      <div className="sticky top-0 z-20 px-4 pt-3 pb-2" style={{ backgroundColor: '#F5EAD3' }}>
        <div className="rounded-2xl p-4 shadow-xl space-y-3" style={{ backgroundColor: '#FFFFFF' }}>
          <h3 className="font-bold text-sm" style={{ color: '#0F172A' }}>
            🔍 {language === 'en' ? 'Filter Properties' : 'Filtrar Propiedades'}
          </h3>
          <div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={language === 'en' ? 'Search by title, city or state...' : 'Buscar por título, ciudad o estado...'}
              className="w-full px-4 py-2.5 rounded-xl border-2 focus:outline-none text-sm"
              style={{ borderColor: '#E5E7EB', backgroundColor: '#F9FAFB', color: '#0F172A' }}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="flex-1 py-2 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
              style={{ backgroundColor: '#EFF6FF', color: '#2563EB' }}
            >
              {showAdvancedFilters ? '▲' : '▼'}
              {language === 'en' ? 'Advanced Filters' : 'Filtros Avanzados'}
            </button>
            <button
              onClick={() => setIsAltitudeModalOpen(true)}
              className="flex-1 py-2 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-colors border-2 shadow-sm"
              style={{ backgroundColor: '#FFFFFF', borderColor: '#E5E7EB', color: '#0F172A' }}
            >
              🏔️ {language === 'en' ? 'Calculate Altitude' : 'Calcular Altura'}
            </button>
          </div>
          {showAdvancedFilters && (
            <div className="space-y-2 pt-2 border-t" style={{ borderTopColor: '#E5E7EB' }}>
              <select value={filterPropertyType} onChange={(e) => setFilterPropertyType(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border-2 focus:outline-none text-sm font-semibold" style={{ borderColor: '#E5E7EB', backgroundColor: '#F9FAFB', color: '#0F172A' }}>
                {PROPERTY_TYPES.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}
              </select>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border-2 focus:outline-none text-sm font-semibold" style={{ borderColor: '#E5E7EB', backgroundColor: '#F9FAFB', color: '#0F172A' }}>
                {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              <select value={filterLanguage} onChange={(e) => setFilterLanguage(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border-2 focus:outline-none text-sm font-semibold" style={{ borderColor: '#E5E7EB', backgroundColor: '#F9FAFB', color: '#0F172A' }}>
                {LANGUAGE_OPTIONS.map(lang => <option key={lang.value} value={lang.value}>{lang.label}</option>)}
              </select>
            </div>
          )}
          {hasActiveFilters && (
            <button onClick={clearFilters} className="text-sm font-semibold underline" style={{ color: '#2563EB' }}>
              {language === 'en' ? 'Clear filters' : 'Limpiar filtros'}
            </button>
          )}
          {hasActiveFilters && (
            <div className="px-3 py-2 rounded-lg text-xs font-semibold" style={{ backgroundColor: '#EFF6FF', color: '#1E40AF' }}>
              {filteredProperties.length === 0
                ? (language === 'en' ? '❌ No matches' : '❌ No hay coincidencias')
                : `✓ ${filteredProperties.length} ${language === 'en' ? (filteredProperties.length === 1 ? 'result' : 'results') : (filteredProperties.length === 1 ? 'resultado' : 'resultados')}`
              }
            </div>
          )}
        </div>
      </div>

      {/* ── PROPERTIES LIST ─────────────────────────────────────────────────── */}
      {filteredProperties.length === 0 ? (
        <div className="px-4 pt-8">
          <div className="rounded-2xl p-8 text-center" style={{ backgroundColor: '#FFFFFF' }}>
            <div className="text-6xl mb-4">{hasActiveFilters ? '🔍' : '🏘️'}</div>
            <h3 className="text-xl font-bold mb-2" style={{ color: '#0F172A' }}>
              {hasActiveFilters
                ? (language === 'en' ? 'No matches' : 'Sin coincidencias')
                : (language === 'en' ? 'No properties' : 'Sin propiedades')}
            </h3>
            <p className="opacity-70 mb-6" style={{ color: '#0F172A' }}>
              {hasActiveFilters
                ? (language === 'en' ? 'No properties found with the selected filters' : 'No se encontraron propiedades con los filtros seleccionados')
                : (language === 'en' ? 'Create your first property with AI' : 'Crea tu primera propiedad con IA')}
            </p>
            {hasActiveFilters ? (
              <button onClick={clearFilters} className="w-full py-3 rounded-xl font-semibold border-2 active:scale-95 transition-transform" style={{ borderColor: '#2563EB', color: '#2563EB', backgroundColor: '#FFFFFF' }}>
                {language === 'en' ? 'Clear filters' : 'Limpiar filtros'}
              </button>
            ) : (
              <button onClick={() => router.push('/create-property')} disabled={!isProActivo && properties.length >= 5} className="w-full py-3 rounded-xl font-semibold text-white shadow-lg active:scale-95 transition-transform disabled:opacity-50" style={{ backgroundColor: '#2563EB' }}>
                ➕ {language === 'en' ? 'Create Property' : 'Crear Propiedad'}
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="px-4 pt-3 space-y-2.5 pb-32">

          {/* Hint educativo */}
          {!hintDismissed && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold" style={{ backgroundColor: '#EFF6FF', color: '#1E40AF' }}>
              <span className="flex-shrink-0">💡</span>
              <span>
                {language === 'en'
                  ? 'Tap ˅ on any property to see views, publish date and more'
                  : 'Toca ˅ en cualquier propiedad para ver vistas, fecha y más'}
              </span>
              <button
                onClick={dismissHint}
                className="ml-auto flex-shrink-0 opacity-60 active:opacity-100 text-base leading-none"
                style={{ color: '#1E40AF', background: 'none', border: 'none' }}
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>
          )}

          {filteredProperties.map((property) => {
            const isSelected = selectedForProposal.has(property.id);
            const isExpanded = expandedCards.has(property.id);
            const hasFacebook = !!property.last_facebook_published_at;

            return (
              <div
                key={property.id}
                className="rounded-2xl overflow-hidden relative transition-all"
                style={{
                  backgroundColor: '#FFFFFF',
                  border: isSelected ? '1.5px solid #2563EB' : '1.5px solid transparent',
                  boxShadow: isSelected
                    ? '0 0 0 3px rgba(37,99,235,0.10), 0 2px 8px rgba(0,0,0,0.08)'
                    : '0 2px 8px rgba(0,0,0,0.06)',
                }}
              >
                {/* ── Cuerpo horizontal de la card ── */}
                {/* CAMBIO: altura aumentada de 110px a 130px para cards más grandes */}
                <div
                  className="flex flex-row active:bg-gray-50 transition-colors cursor-pointer"
                  style={{ minHeight: '130px' }}
                  onClick={() => router.push(`/p/${property.slug}`)}
                >
                  {/* Foto — CAMBIO: ancho aumentado de 110px a 130px */}
                  <div
                    className="relative flex-shrink-0 overflow-hidden"
                    style={{ width: '130px', backgroundColor: '#1f2937' }}
                  >
                    {property.photos && property.photos.length > 0 ? (
                      <Image
                        src={property.photos[0]}
                        alt={property.title}
                        fill
                        className="object-cover"
                        sizes="130px"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl">🏠</div>
                    )}
                    {/* Badge de estado */}
                    <div className="absolute bottom-1.5 left-1.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold text-white ${
                          property.status === 'active'
                            ? 'bg-green-500'
                            : property.status === 'rented'
                            ? 'bg-blue-500'
                            : 'bg-gray-500'
                        }`}
                      >
                        {property.status === 'active'
                          ? (language === 'en' ? '● Available' : '● Disponible')
                          : property.status === 'rented'
                          ? (language === 'en' ? '● Rented' : '● Alquilada')
                          : (language === 'en' ? '● Sold' : '● Vendida')}
                      </span>
                    </div>
                  </div>

                  {/* Info — CAMBIO: padding derecho aumentado para los dos botones apilados */}
                  <div className="flex flex-col justify-between flex-1 min-w-0 py-3 pl-3 pr-14">
                    {/* CAMBIO: título con text-[14px] en lugar de text-[13px] */}
                    <p className="text-[14px] font-semibold leading-snug line-clamp-2" style={{ color: '#0F172A' }}>
                      {property.title}
                    </p>
                    {/* CAMBIO: precio con text-[16px] en lugar de text-[15px] */}
                    <p className="text-[16px] font-bold" style={{ color: '#2563EB' }}>
                      {formatPrice(property.price, property.currency_id)}
                    </p>
                    {property.city && property.state && (
                      <p className="text-[12px]" style={{ color: '#6B7280' }}>
                        📍 {property.city}, {property.state}
                      </p>
                    )}
                    {/* Tags */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: '#F5EAD3', color: '#44403C' }}
                      >
                        🏡 {translatePropertyType(property.property_type, language)}
                      </span>
                      <span
                        className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: property.listing_type === 'rent' ? '#FEF3C7' : '#D1FAE5',
                          color: property.listing_type === 'rent' ? '#92400E' : '#065F46',
                        }}
                      >
                        {property.listing_type === 'rent'
                          ? (language === 'en' ? 'Rent' : 'Alquiler')
                          : (language === 'en' ? 'Sale' : 'Venta')}
                      </span>
                      <span className="text-[13px] leading-none">
                        {property.language === 'es' ? '🇪🇸' : property.language === 'en' ? '🇺🇸' : '❓'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Botón expandir detalles */}
                <button
                  onClick={(e) => toggleCardExpand(e, property.id)}
                  className="w-full flex items-center justify-center py-1 active:bg-gray-50 transition-colors"
                  style={{ borderTop: '0.5px solid #F3F4F6', color: '#9CA3AF' }}
                  aria-label="Ver detalles"
                >
                  <svg
                    className="transition-transform duration-200"
                    style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
                    width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2.5"
                    strokeLinecap="round" strokeLinejoin="round"
                  >
                    <path d="M6 9l6 6 6-6"/>
                  </svg>
                </button>

                {/* ── Panel expandible ── */}
                <div
                  className="overflow-hidden transition-all duration-200 ease-in-out"
                  style={{
                    maxHeight: isExpanded ? '38px' : '0px',
                    opacity: isExpanded ? 1 : 0,
                    borderTop: isExpanded ? '0.5px solid #F3F4F6' : 'none',
                  }}
                >
                  <div
                    className="flex items-center gap-2 px-3 py-1.5 text-[11px]"
                    style={{ color: '#6B7280', whiteSpace: 'nowrap', overflow: 'hidden' }}
                  >
                    <span>👁️ {property.views} {language === 'en' ? 'views' : 'vistas'}</span>
                    <span style={{ color: '#D1D5DB' }}>·</span>
                    <span>📅 {formatExpandDate(property.created_at)}</span>
                    <span style={{ color: '#D1D5DB' }}>·</span>
                    <span style={{ color: hasFacebook ? '#10B981' : '#9CA3AF' }}>
                      📘 {hasFacebook
                        ? formatExpandDate(property.last_facebook_published_at)
                        : (language === 'en' ? 'Not on FB' : 'Sin publicar')}
                    </span>
                  </div>
                </div>

                {/* ── Botones apilados: tres puntos arriba, bookmark abajo ── */}
                {/* CAMBIO: los botones ahora están en una columna vertical en la esquina superior derecha */}
                <div
                  className="absolute flex flex-col items-center gap-1.5"
                  style={{ top: '8px', right: '8px' }}
                >
                  {/* Menú tres puntos — PRIMERO (arriba) */}
                  <button
                    data-menu="true"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (showMenu === property.id) {
                        setShowMenu(null);
                      } else {
                        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                        setMenuPosition({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
                        setShowMenu(property.id);
                      }
                    }}
                    className="flex items-center justify-center rounded-full active:scale-90 transition-transform shadow-md"
                    style={{
                      width: '28px',
                      height: '28px',
                      backgroundColor: 'rgba(255,255,255,0.95)',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                    aria-label="Opciones"
                  >
                    <svg className="w-4 h-4" fill="#0F172A" viewBox="0 0 24 24">
                      <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                    </svg>
                  </button>

                  {/* Bookmark — SEGUNDO (abajo) */}
                  <button
                    data-bookmark="true"
                    onClick={(e) => toggleProposalBookmark(e, property.id)}
                    className="flex items-center justify-center rounded-lg active:scale-90 transition-transform"
                    style={{
                      width: '28px',
                      height: '28px',
                      backgroundColor: isSelected ? '#EFF6FF' : 'rgba(255,255,255,0.92)',
                      border: isSelected ? '1.5px solid #BFDBFE' : '1px solid rgba(0,0,0,0.08)',
                      color: isSelected ? '#2563EB' : '#9CA3AF',
                      fontSize: '15px',
                      cursor: 'pointer',
                    }}
                    aria-label={language === 'en' ? 'Add to proposal' : 'Agregar a propuesta'}
                    title={language === 'en' ? 'Add to proposal' : 'Agregar a propuesta'}
                  >
                    {isSelected ? '🔖' : '🏷️'}
                  </button>
                </div>

                {/* ── Dropdown menú ── */}
                {showMenu === property.id && (
                    <div
                      className="fixed rounded-xl shadow-2xl overflow-hidden z-50 min-w-[160px]"
                      style={{
                        backgroundColor: '#FFFFFF',
                        top: menuPosition.top,
                        right: menuPosition.right,
                      }}
                    >
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowMenu(null); router.push(`/edit-property/${property.id}`); }}
                      className="w-full px-4 py-3 text-left font-semibold active:bg-gray-100 transition-colors flex items-center gap-2"
                      style={{ color: '#0F172A' }}
                    >
                      <span>✏️</span> {language === 'en' ? 'Edit' : 'Editar'}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowMenu(null); handleDuplicate(property.id); }}
                      className="w-full px-4 py-3 text-left font-semibold active:bg-gray-100 transition-colors flex items-center gap-2 border-t"
                      style={{ color: '#0F172A', borderTopColor: '#F3F4F6' }}
                      disabled={duplicating}
                    >
                      <span>📋</span> {language === 'en' ? 'Duplicate' : 'Duplicar'}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isFree) return;
                        setShowMenu(null);
                        setTranslateModal({ open: true, propertyId: property.id, currentLang: property.language });
                      }}
                      className="w-full px-4 py-3 text-left font-semibold transition-colors flex items-center gap-2 border-t"
                      style={{ color: isFree ? '#9CA3AF' : '#0F172A', borderTopColor: '#F3F4F6', cursor: isFree ? 'default' : 'pointer' }}
                    >
                      <span>🌐</span>
                      {language === 'en'
                        ? `Translate to ${property.language === 'es' ? 'English' : 'Spanish'}`
                        : `Traducir a ${property.language === 'es' ? 'Inglés' : 'Español'}`}
                      {isFree && (
                        <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}>
                          Pro
                        </span>
                      )}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteProperty(property.id); }}
                      className="w-full px-4 py-3 text-left font-semibold active:bg-red-50 transition-colors flex items-center gap-2 border-t"
                      style={{ color: '#DC2626', borderTopColor: '#F3F4F6' }}
                    >
                      <span>🗑️</span> {language === 'en' ? 'Delete' : 'Eliminar'}
                    </button>
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        setShowMenu(null);
                        setIsGeneratingPDF(true);
                        try {
                          const propertyResponse = await fetch(`/api/property/${property.slug}`);
                          if (!propertyResponse.ok) throw new Error('No se pudo cargar la propiedad completa');
                          const propertyData = await propertyResponse.json();
                          const fullProperty = propertyData.property;
                          let customFields: any[] = [];
                          if (fullProperty.property_type && fullProperty.listing_type) {
                            try {
                              const params = new URLSearchParams({ property_type: fullProperty.property_type, listing_type: fullProperty.listing_type });
                              const cfResponse = await fetch(`/api/custom-fields/list?${params.toString()}`);
                              if (cfResponse.ok) { const cfData = await cfResponse.json(); customFields = cfData.fields || []; }
                            } catch (err) { console.warn('No se pudieron cargar campos personalizados'); }
                          }
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
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isFree) return;
                        setShowMenu(null);
                        setSelectedPropertyId(property.id);
                        setPublishModalOpen(true);
                      }}
                      className="w-full px-4 py-3 text-left font-semibold transition-colors flex items-center gap-2 border-t"
                      style={{ color: isFree ? '#9CA3AF' : '#0F172A', borderTopColor: '#F3F4F6', cursor: isFree ? 'default' : 'pointer' }}
                    >
                      <span>📘</span>
                      {language === 'en' ? 'Publish on Facebook' : 'Publicar en Facebook'}
                      {isFree && (
                        <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}>
                          Pro
                        </span>
                      )}
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {/* Banner Pro */}
          {isFree && (
            <div className="rounded-2xl p-5 shadow-md mt-2" style={{ backgroundColor: '#EFF6FF', border: '1.5px solid #BFDBFE' }}>
              <p className="font-bold text-sm mb-1" style={{ color: '#1E40AF' }}>
                🚀 {language === 'en' ? 'Ready for more?' : '¿Listo para más?'}
              </p>
              <p className="text-xs opacity-80 mb-3" style={{ color: '#1E40AF' }}>
                {language === 'en'
                  ? 'Upgrade to Pro and manage up to 150 properties with AI tools.'
                  : 'Pásate a Pro y gestiona hasta 150 propiedades con funciones IA.'}
              </p>
              <a
                href="/pro"
                className="inline-block px-4 py-2 rounded-xl font-bold text-white text-sm active:scale-95 transition-transform"
                style={{ backgroundColor: '#2563EB' }}
              >
                {language === 'en' ? 'See Pro plan' : 'Ver plan Pro'}
              </a>
            </div>
          )}
        </div>
      )}

      {/* ── FLOATING PROPOSAL BAR ─────────────────────────────────────────── */}
      {/* CAMBIO: bottom aumentado de 6 (24px) a 24 (96px) para que quede por encima del footer */}
      {selectedForProposal.size > 0 && (
        <div
          className="fixed left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl"
          style={{
            bottom: '96px',
            backgroundColor: '#1E3A8A',
            color: 'white',
            whiteSpace: 'nowrap',
          }}
        >
          <span
            className="px-2.5 py-0.5 rounded-full text-sm font-bold"
            style={{ backgroundColor: '#2563EB' }}
          >
            {selectedForProposal.size}
          </span>
          <span className="text-sm">
            {language === 'en' ? 'selected' : 'seleccionadas'}
          </span>
          <button
            onClick={() => setIsCreateProposalOpen(true)}
            className="px-3.5 py-1.5 rounded-xl text-sm font-bold active:scale-95 transition-transform"
            style={{ backgroundColor: 'white', color: '#1E3A8A', border: 'none', cursor: 'pointer' }}
          >
            {language === 'en' ? 'Create proposal ↗' : 'Crear propuesta ↗'}
          </button>
          <button
            onClick={clearProposalSelection}
            className="opacity-60 active:opacity-100 text-base"
            style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}
            aria-label="Limpiar selección"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── MODALES EXISTENTES ─────────────────────────────── */}
      <GeneratingPDFModal isOpen={isGeneratingPDF} />
      <FacebookPublishModal
        isOpen={publishModalOpen}
        onClose={() => setPublishModalOpen(false)}
        propertyId={selectedPropertyId || ''}
      />

      {translateModal.open && translateModal.propertyId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold mb-4" style={{ color: '#0F172A' }}>
              🌐 {language === 'en' ? 'Translate property' : 'Traducir la propiedad'}
            </h3>
            <div className="mb-4">
              <p className="text-sm mb-2" style={{ color: '#0F172A' }}>
                <strong>{language === 'en' ? 'Current language:' : 'Idioma actual:'}</strong>{' '}
                {translateModal.currentLang === 'es' ? '🇪🇸 Español' : '🇺🇸 English'}
              </p>
              <p className="text-sm mb-4" style={{ color: '#0F172A' }}>
                <strong>{language === 'en' ? 'Translate to:' : 'Traducir a:'}</strong>{' '}
                {translateModal.currentLang === 'es' ? '🇺🇸 English' : '🇪🇸 Español'}
              </p>
              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 mb-4">
                <p className="text-sm font-semibold mb-2" style={{ color: '#1E40AF' }}>
                  {language === 'en' ? 'How do you want to create the translation?' : '¿Cómo deseas crear la traducción?'}
                </p>
                <label className="flex items-start gap-3 mb-3 cursor-pointer">
                  <input type="radio" name="translate-option" value="ai" defaultChecked className="mt-1" />
                  <div>
                    <div className="font-semibold text-sm" style={{ color: '#0F172A' }}>
                      🤖 {language === 'en' ? 'With AI (recommended)' : 'Con IA (recomendado)'}
                    </div>
                    <div className="text-xs" style={{ color: '#6B7280' }}>
                      {language === 'en'
                        ? 'Automatically translates title, description, address and custom fields'
                        : 'Traduce automáticamente título, descripción, dirección y campos personalizados'}
                    </div>
                  </div>
                </label>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="radio" name="translate-option" value="manual" className="mt-1" />
                  <div>
                    <div className="font-semibold text-sm" style={{ color: '#0F172A' }}>
                      ✍️ {language === 'en' ? 'Manual' : 'Manual'}
                    </div>
                    <div className="text-xs" style={{ color: '#6B7280' }}>
                      {language === 'en'
                        ? 'Creates a copy without translating (you will have to edit manually)'
                        : 'Crea una copia sin traducir (tendrás que editar manualmente)'}
                    </div>
                  </div>
                </label>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                <p className="text-xs" style={{ color: '#92400E' }}>
                  ⚠️ <strong>{language === 'en' ? 'Note:' : 'Nota:'}</strong>{' '}
                  {language === 'en'
                    ? 'The original property will remain unchanged. You can edit the translation after creating it.'
                    : 'La propiedad original se mantendrá sin cambios. Podrás editar la traducción después de crearla.'}
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
                  setTranslateModal({ open: false, propertyId: null, currentLang: null });
                  setActionModal({
                    open: true,
                    type: 'translating',
                    message: useAI
                      ? (language === 'en' ? 'Translating with AI...' : 'Traduciendo con IA...')
                      : (language === 'en' ? 'Creating copy...' : 'Creando copia...'),
                  });
                  try {
                    const response = await fetch('/api/property/translate', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ propertyId: translateModal.propertyId, targetLanguage: targetLang, useAI }),
                    });
                    if (!response.ok) throw new Error('Error al traducir');
                    const { newPropertyId } = await response.json();
                    await loadProperties();
                    await refreshSession();
                    setActionModal({ open: false, type: 'translating', message: '' });
                    alert(
                      useAI
                        ? (language === 'en' ? '✅ Property translated with AI. Review and adjust if necessary.' : '✅ Propiedad traducida con IA. Revisa y ajusta si es necesario.')
                        : (language === 'en' ? '✅ Property cloned. Edit the content manually.' : '✅ Propiedad clonada. Edita el contenido manualmente.')
                    );
                    router.push(`/edit-property/${newPropertyId}`);
                  } catch (error) {
                    setActionModal({ open: false, type: 'translating', message: '' });
                    alert(language === 'en' ? '❌ Error translating property' : '❌ Error al traducir la propiedad');
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

      {showLimitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="text-center mb-4"><span className="text-4xl">🔒</span></div>
            <h3 className="text-lg font-bold text-center mb-2" style={{ color: '#0F172A' }}>
              {language === 'en' ? 'Property limit reached' : 'Límite de propiedades alcanzado'}
            </h3>
            <p className="text-sm text-center mb-5 opacity-70" style={{ color: '#0F172A' }}>
              {language === 'en'
                ? 'Your current plan is Free. Please upgrade to Pro to keep adding more properties.'
                : 'Tu plan actual es Free. Por favor actualiza tu plan a Pro para poder seguir agregando más propiedades.'}
            </p>
            <div className="flex flex-col gap-2">
              <a
                href="/pro"
                className="w-full py-3 rounded-xl font-bold text-white shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2"
                style={{ backgroundColor: '#2563EB' }}
              >
                🚀 {language === 'en' ? 'Upgrade to Pro' : 'Actualizar a Pro'}
              </a>
              <button
                onClick={() => setShowLimitModal(false)}
                className="w-full py-3 rounded-xl font-bold border-2 active:scale-95 transition-transform"
                style={{ borderColor: '#E5E7EB', color: '#0F172A' }}
              >
                {language === 'en' ? 'Close' : 'Cerrar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <PropertyActionModal isOpen={actionModal.open} message={actionModal.message} type={actionModal.type} />

      <CalculateAltitudeModal
        isOpen={isAltitudeModalOpen}
        onClose={() => setIsAltitudeModalOpen(false)}
      />

      <MyProposalsModal
        isOpen={isMyProposalsOpen}
        onClose={() => setIsMyProposalsOpen(false)}
      />

      <CreateProposalModal
        isOpen={isCreateProposalOpen}
        onClose={() => setIsCreateProposalOpen(false)}
        selectedPropertyIds={Array.from(selectedForProposal)}
        onProposalCreated={(proposalId, publicUrl) => {
          clearProposalSelection();
        }}
      />
    </MobileLayout>
  );
}