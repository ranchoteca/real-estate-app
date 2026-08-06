'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { trackEvent } from '@/lib/fbpixel';
import GeneratingPDFModal from '@/components/GeneratingPDFModal';
import FacebookPublishModal from '@/components/FacebookPublishModal';
import SocialReelPublishModal from '@/components/SocialReelPublishModal';
import AppLayout from '@/components/AppLayout';
import Image from 'next/image';
import { useTranslation } from '@/hooks/useTranslation';
import { useI18nStore } from '@/lib/i18n-store';
import PropertyActionModal from '@/components/property/PropertyActionModal';
import CalculateAltitudeModal from '@/components/property/CalculateAltitudeModal';
import CreateProposalModal from '@/components/proposal/CreateProposalModal';
import MyProposalsModal from '@/components/proposal/MyProposalsModal';

const T = {
  navy:       '#1B2D5B',
  navyMid:    '#243770',
  gold:       '#C9A84C',
  goldLight:  '#E8C96A',
  goldPale:   '#F5EDD8',
  cream:      '#F8F6F2',
  white:      '#FFFFFF',
  charcoal:   '#1A1A2E',
  muted:      '#6B7280',
  border:     '#E8E4DC',
  borderSoft: '#F0EDE8',
};

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
    house: { es: 'Casa', en: 'House' }, condo: { es: 'Condominio', en: 'Condo' },
    apartment: { es: 'Apartamento', en: 'Apartment' }, land: { es: 'Terreno', en: 'Land' },
    commercial: { es: 'Comercial', en: 'Commercial' }, hotel: { es: 'Hotel', en: 'Hotel' },
    finca: { es: 'Finca', en: 'Farm' }, ranch: { es: 'Quinta', en: 'Ranch' },
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
    { value: 'house', label: language === 'en' ? 'House' : 'Casa' },
    { value: 'condo', label: language === 'en' ? 'Condo' : 'Condominio' },
    { value: 'apartment', label: language === 'en' ? 'Apartment' : 'Apartamento' },
    { value: 'land', label: language === 'en' ? 'Land' : 'Terreno' },
    { value: 'commercial', label: language === 'en' ? 'Commercial' : 'Comercial' },
    { value: 'hotel', label: 'Hotel' },
    { value: 'finca', label: language === 'en' ? 'Farm' : 'Finca' },
    { value: 'ranch', label: language === 'en' ? 'Ranch' : 'Quinta' },
    { value: 'other', label: language === 'en' ? 'Other' : 'Otros' },
  ];

  const STATUS_OPTIONS = [
    { value: '', label: language === 'en' ? 'All statuses' : 'Todos los estados' },
    { value: 'active', label: language === 'en' ? 'Available' : 'Disponible' },
    { value: 'pending', label: language === 'en' ? 'Pending' : 'Pendiente' },
    { value: 'rented', label: language === 'en' ? 'Rented' : 'Alquilada' },
    { value: 'sold', label: language === 'en' ? 'Sold' : 'Vendida' },
  ];

  const LANGUAGE_OPTIONS = [
    { value: '', label: language === 'en' ? 'All languages' : 'Todos los idiomas' },
    { value: 'es', label: 'Español' },
    { value: 'en', label: 'English' },
  ];

  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMenu, setShowMenu] = useState<string | null>(null);
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [reelModalOpen, setReelModalOpen] = useState(false);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [planInfo, setPlanInfo] = useState<{ plan: string; role: string; expires_at: string | null; full_name?: string } | null>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [translateModal, setTranslateModal] = useState<{ open: boolean; propertyId: string | null; currentLang: 'es' | 'en' | null }>({ open: false, propertyId: null, currentLang: null });
  const [filterPropertyType, setFilterPropertyType] = useState('');
  const [filterLanguage, setFilterLanguage] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currencies, setCurrencies] = useState<any[]>([]);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [actionModal, setActionModal] = useState<{ open: boolean; type: 'duplicating' | 'translating'; message: string }>({ open: false, type: 'duplicating', message: '' });
  const [mounted, setMounted] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [isAltitudeModalOpen, setIsAltitudeModalOpen] = useState(false);
  const [isCreateProposalOpen, setIsCreateProposalOpen] = useState(false);
  const [isMyProposalsOpen, setIsMyProposalsOpen] = useState(false);
  const [selectedForProposal, setSelectedForProposal] = useState<Set<string>>(new Set());
  const [proposalLanguage, setProposalLanguage] = useState<'es' | 'en' | null>(null);
  const [proposalLangToast, setProposalLangToast] = useState(false);
  const [proposalModeActive, setProposalModeActive] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [hintDismissed, setHintDismissed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('proposal_hint_dismissed') === 'true';
  });
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);

  useEffect(() => { if (status === 'unauthenticated') router.push('/login'); }, [status, router]);
  useEffect(() => {
    if (session?.user?.id) {
      loadProperties(); loadPlanInfo(); loadCurrencies();
      if (session.user.username) loadProfilePhoto(session.user.username);
    }
  }, [session]);
  useEffect(() => setMounted(true), []);
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
            if (diffMinutes < 2) trackEvent('CompleteRegistration', { value: 0, currency: 'CRC', content_name: 'Google Sign Up' });
          }
        } catch (error) { console.error('Error checking new user:', error); }
      };
      checkIfNewUser();
    }
  }, [session?.user?.id]);

  const loadPlanInfo = async () => {
    try { const response = await fetch('/api/agent/current-plan'); const data = await response.json(); setPlanInfo(data); }
    catch (error) { console.error('Error loading plan:', error); }
  };
  const loadProfilePhoto = async (username: string) => {
    try {
      const res = await fetch(`/api/agent-card/get?username=${username}`);
      if (res.ok) { const data = await res.json(); if (data?.card?.profile_photo) setProfilePhoto(data.card.profile_photo); }
    } catch {}
  };
  const loadCurrencies = async () => {
    try { const response = await fetch('/api/currencies/list'); if (response.ok) { const data = await response.json(); setCurrencies(data.currencies || []); } }
    catch (error) { console.error('Error loading currencies:', error); }
  };
  const loadProperties = async () => {
    try { setLoading(true); const response = await fetch('/api/property/list'); if (!response.ok) throw new Error('Error al cargar propiedades'); const data = await response.json(); setProperties(data.properties || []); }
    catch (error) { console.error('Error loading properties:', error); }
    finally { setLoading(false); }
  };
  const refreshSession = async () => {
    const event = new Event('visibilitychange'); document.dispatchEvent(event);
    await fetch('/api/auth/session', { method: 'GET' });
  };
  const handleDeleteProperty = async (propertyId: string) => {
    if (!confirm(language === 'en' ? 'Delete this property?' : '¿Eliminar esta propiedad?')) return;
    try { const response = await fetch(`/api/property/delete/${propertyId}`, { method: 'DELETE' }); if (!response.ok) throw new Error('Error al eliminar'); await loadProperties(); }
    catch (error) { console.error('Error deleting property:', error); alert(language === 'en' ? 'Error deleting property' : 'Error al eliminar la propiedad'); }
  };
  const handleDuplicate = async (propertyId: string) => {
    const confirmed = confirm(language === 'en' ? 'Duplicate this property in the same language?' : '¿Duplicar esta propiedad en el mismo idioma?');
    if (!confirmed) return;
    try {
      setDuplicating(true);
      setActionModal({ open: true, type: 'duplicating', message: language === 'en' ? 'Duplicating property...' : 'Duplicando propiedad...' });
      const response = await fetch('/api/property/duplicate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ propertyId }) });
      if (!response.ok) throw new Error('Error al duplicar');
      const { newPropertyId } = await response.json();
      await loadProperties(); await refreshSession();
      alert(language === 'en' ? '✅ Property duplicated successfully' : '✅ Propiedad duplicada exitosamente');
      setActionModal({ open: false, type: 'duplicating', message: '' });
      router.push(`/edit-property/${newPropertyId}`);
    } catch (error) {
      setActionModal({ open: false, type: 'duplicating', message: '' });
      alert(language === 'en' ? '❌ Error duplicating property' : '❌ Error al duplicar la propiedad');
    } finally { setDuplicating(false); }
  };
  const getFilteredProperties = () => properties.filter(property => {
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
  const clearFilters = () => { setFilterPropertyType(''); setFilterStatus(''); setFilterLanguage(''); setSearchQuery(''); };
  const hasActiveFilters = filterPropertyType || filterStatus || filterLanguage || searchQuery.trim();
  const toggleCardExpand = (e: React.MouseEvent, propertyId: string) => {
    const target = e.target as HTMLElement;
    if (target.closest('[data-bookmark]') || target.closest('[data-menu]')) return;
    setExpandedCards(prev => { const next = new Set(prev); next.has(propertyId) ? next.delete(propertyId) : next.add(propertyId); return next; });
  };
  const longPressTimers = new Map<string, NodeJS.Timeout>();
  const handlePropertyPressStart = (e: React.TouchEvent | React.MouseEvent, property: Property) => {
    if (!proposalModeActive) return;
    const timer = setTimeout(() => {
      longPressTimers.delete(property.id);
      setSelectedForProposal(prev => {
        const next = new Set(prev);
        if (next.has(property.id)) { next.delete(property.id); if (next.size === 0) setProposalLanguage(null); }
        else {
          if (next.size === 0) { setProposalLanguage(property.language); setProposalLangToast(true); setTimeout(() => setProposalLangToast(false), 3000); }
          if (proposalLanguage === null || property.language === proposalLanguage) next.add(property.id);
        }
        return next;
      });
    }, 700);
    longPressTimers.set(property.id, timer);
  };
  const handlePropertyPressEnd = (propertyId: string) => {
    const timer = longPressTimers.get(propertyId);
    if (timer) { clearTimeout(timer); longPressTimers.delete(propertyId); }
  };
  const clearProposalSelection = () => { setSelectedForProposal(new Set()); setProposalLanguage(null); setProposalModeActive(false); };
  const dismissHint = () => { setHintDismissed(true); localStorage.setItem('proposal_hint_dismissed', 'true'); };
  const formatExpandDate = (dateStr: string | null): string | null => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString(language === 'en' ? 'en-US' : 'es-ES', { day: 'numeric', month: 'short' });
  };

  if (status === 'loading' || loading) {
    return (
      <AppLayout title={language === 'en' ? 'My Properties' : 'Mis Propiedades'} showTabs={false}>
        <div className="flex items-center justify-center h-full" style={{ backgroundColor: T.cream }}>
          <div className="text-center py-12">
            <div className="text-5xl mb-4 animate-pulse">🏠</div>
            <div className="text-base font-medium" style={{ color: T.muted }}>
              {language === 'en' ? 'Loading...' : 'Cargando...'}
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!session) return null;

  const formatPrice = (price: number | null, currencyId: string | null) => {
    if (!price) return language === 'en' ? 'Price upon request' : 'Precio a consultar';
    const currency = currencies.find(c => c.id === currencyId);
    const symbol = currency?.symbol || '$';
    return `${symbol}${new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(price)}`;
  };

  const isProActivo = planInfo?.role === 'admin' || (planInfo?.plan === 'pro' && !!planInfo?.expires_at && new Date(planInfo.expires_at) > new Date());
  const isFree = planInfo?.plan === 'free';
  const filteredProperties = getFilteredProperties();
  const hasProperties = properties.length > 0;

  // FIX 6: nombre completo del agente (no Gmail)
  const fullName = planInfo?.full_name || session?.user?.name || '';

  const statusConfig: Record<string, { label: string; dot: string; bg: string; text: string }> = {
    active:  { label: language === 'en' ? 'Available' : 'Disponible', dot: '#15803D', bg: '#F0FDF4', text: '#15803D' },
    rented:  { label: language === 'en' ? 'Rented' : 'Alquilada',    dot: T.navy,    bg: '#EEF2FF', text: T.navy    },
    sold:    { label: language === 'en' ? 'Sold' : 'Vendida',         dot: '#6B7280', bg: '#F9FAFB', text: '#6B7280' },
    pending: { label: language === 'en' ? 'Pending' : 'Pendiente',    dot: T.gold,    bg: '#FFFBEB', text: '#92400E' },
  };

  // ── Welcome screen ─────────────────────────────────────────────────────────
  if (!hasProperties) {
    return (
      <AppLayout title={language === 'en' ? 'My Properties' : 'Mis Propiedades'} showTabs={true} currentPropertyCount={0} onCreateLimitReached={() => {}}>
        <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center" style={{ backgroundColor: T.cream }}>
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl mb-6 shadow-lg" style={{ backgroundColor: T.navy }}>🏠</div>
          <h2 className="text-2xl font-bold mb-3" style={{ color: T.navy }}>
            {language === 'en' ? 'Welcome to Flow Estate AI!' : '¡Bienvenido a Flow Estate AI!'}
          </h2>
          <p className="text-base mb-2" style={{ color: T.muted }}>
            {language === 'en' ? 'You only need 3 minutes and your phone.' : 'Solo necesitas 3 minutos y tu celular.'}
          </p>
          <p className="text-sm mb-8" style={{ color: T.muted }}>
            {language === 'en' ? 'Speak the description, upload photos and share your first professional listing.' : 'Habla la descripción, sube las fotos y comparte tu primera propiedad profesional.'}
          </p>
          <button onClick={() => router.push('/create-property')} className="w-full max-w-xs py-4 rounded-xl font-bold text-lg shadow-xl active:scale-95 transition-transform" style={{ backgroundColor: T.gold, color: T.navy }}>
            🎤 {language === 'en' ? 'Create my first property' : 'Crear mi primera propiedad'}
          </button>
          <p className="text-xs mt-4" style={{ color: T.muted }}>
            {language === 'en' ? 'Free forever for your first 5 properties' : 'Gratis para tus primeras 5 propiedades'}
          </p>
        </div>
      </AppLayout>
    );
  }

  // ── Dashboard ──────────────────────────────────────────────────────────────
  return (
    <AppLayout
      title={language === 'en' ? 'My Properties' : 'Mis Propiedades'}
      showTabs={true}
      currentPropertyCount={properties.length}
      onCreateLimitReached={() => setShowLimitModal(true)}
    >
      <div style={{ backgroundColor: T.cream, minHeight: '100%' }}>

        {/* ── STATS + FILTROS ── */}
        <div className="px-4 pt-4 pb-2 md:px-6 md:pt-5">

          {/* FIX 5: Bienvenida — solo tablet/desktop */}
          <div className="hidden md:block mb-4">
            <h2 className="text-lg font-bold" style={{ color: T.navy }}>
              {language === 'en'
                ? `Welcome, ${fullName}`
                : `Bienvenido(a), ${fullName}`}
            </h2>
          </div>

          {/* FIX 3: Stats row — más compactos y estilizados */}
          <div className="hidden md:flex items-center gap-3 mb-4">

            {/* Stat: total */}
            <div
              className="flex items-center gap-3 px-4 py-2.5 rounded-xl flex-shrink-0"
              style={{ backgroundColor: T.white, border: `1px solid ${T.border}` }}
            >
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: T.muted }}>
                  {language === 'en' ? 'Total' : 'Total'}
                </p>
                <p className="text-xl font-bold leading-tight" style={{ color: T.navy }}>{properties.length}</p>
              </div>
              <div style={{ width: '1px', height: '28px', backgroundColor: T.border }} />
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: T.muted }}>
                  {language === 'en' ? 'Limit' : 'Límite'}
                </p>
                <p className="text-xl font-bold leading-tight" style={{ color: T.navy }}>
                  {isProActivo ? `${properties.length}/150` : `${properties.length}/5`}
                </p>
              </div>
            </div>

            {/* Banner Pro / Free */}
            {isProActivo ? (
              <div
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
                style={{ backgroundColor: T.goldPale, border: `1px solid rgba(201,168,76,0.35)` }}
              >
                <span style={{ color: T.gold, fontSize: '11px' }}>✦</span>
                <span className="text-xs font-semibold" style={{ color: T.navy }}>Plan Pro</span>
              </div>
            ) : (
              <div
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
                style={{ backgroundColor: T.cream, border: `1px solid ${T.border}` }}
              >
                <span className="text-xs font-medium" style={{ color: T.muted }}>Plan Free</span>
              </div>
            )}

            {/* Mis Propuestas — FIX 3: compacto */}
            <button
              onClick={() => setIsMyProposalsOpen(true)}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl font-semibold text-xs active:scale-95 transition-transform ml-auto"
              style={{ backgroundColor: T.navy, color: T.white }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
              {language === 'en' ? 'My Proposals' : 'Mis Propuestas'}
            </button>
          </div>

          {/* ── BIENVENIDA MOBILE ── */}
          <div className="md:hidden mb-4">

            {/* Título estilizado */}
            <div className="flex items-center gap-2 mb-4">
              <div style={{ width: '3px', height: '22px', backgroundColor: T.gold, borderRadius: '2px', flexShrink: 0 }} />
              <h1 className="text-xl font-bold tracking-tight" style={{ color: T.navy }}>
                {language === 'en' ? 'My Properties' : 'Mis Propiedades'}
              </h1>
            </div>

            {/* Foto + nombre + fecha */}
            <div
              className="flex items-center gap-4 p-4 rounded-2xl mb-3"
              style={{ backgroundColor: T.white, border: `1px solid ${T.border}`, boxShadow: '0 2px 8px rgba(27,45,91,0.06)' }}
            >
              {/* Avatar circular — foto si existe, inicial si no */}
              <div
                className="w-14 h-14 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center font-bold text-xl"
                style={{
                  backgroundColor: T.gold,
                  color: T.navy,
                  border: `2px solid ${T.gold}`,
                  boxShadow: '0 2px 8px rgba(201,168,76,0.3)',
                }}
              >
                {profilePhoto ? (
                  <Image
                    src={profilePhoto}
                    alt={fullName}
                    width={56}
                    height={56}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{fullName ? fullName.charAt(0).toUpperCase() : '?'}</span>
                )}
              </div>

              {/* Nombre y fecha */}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium mb-0.5" style={{ color: T.muted }}>
                  {language === 'en' ? 'Welcome,' : 'Bienvenido(a),'}
                </p>
                <p className="text-base font-bold truncate" style={{ color: T.navy }}>
                  {fullName}
                </p>
                <p className="text-xs mt-0.5" style={{ color: T.muted }}>
                  {new Date().toLocaleDateString(
                    language === 'en' ? 'en-US' : 'es-CR',
                    { day: 'numeric', month: 'long', year: 'numeric' }
                  )}
                </p>
              </div>

              {/* Badge plan */}
              {isProActivo && (
                <div
                  className="flex items-center gap-1 px-2 py-1 rounded-lg flex-shrink-0"
                  style={{ backgroundColor: T.goldPale, border: `1px solid rgba(201,168,76,0.35)` }}
                >
                  <span style={{ color: T.gold, fontSize: '10px' }}>✦</span>
                  <span className="text-[10px] font-bold" style={{ color: T.navy }}>Pro</span>
                </div>
              )}
            </div>

            {/* Stats compactos */}
            <div className="flex items-center gap-3">
              <div className="flex-1 rounded-xl p-3" style={{ backgroundColor: T.white, border: `1px solid ${T.border}` }}>
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: T.muted }}>
                  {language === 'en' ? 'Total' : 'Total'}
                </p>
                <p className="text-2xl font-bold" style={{ color: T.navy }}>{properties.length}</p>
              </div>
              <div className="flex-1 rounded-xl p-3" style={{ backgroundColor: T.white, border: `1px solid ${T.border}` }}>
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: T.muted }}>
                  {language === 'en' ? 'Limit' : 'Límite'}
                </p>
                <p className="text-2xl font-bold" style={{ color: T.navy }}>
                  {isProActivo ? `${properties.length}/150` : `${properties.length}/5`}
                </p>
              </div>
              <button
                onClick={() => setIsMyProposalsOpen(true)}
                className="flex flex-col items-center gap-1 px-3 py-3 rounded-xl font-semibold text-[10px] active:scale-95 transition-transform"
                style={{ backgroundColor: T.navy, color: T.white }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                </svg>
                {language === 'en' ? 'Proposals' : 'Propuestas'}
              </button>
            </div>
          </div>

          {/* Panel de filtros */}
          <div className="rounded-xl p-4 mt-2" style={{ backgroundColor: T.white, border: `1px solid ${T.border}` }}>
            <p className="text-xs font-semibold uppercase tracking-wider mb-3 md:hidden" style={{ color: T.muted }}>
              {language === 'en' ? 'Filter Properties' : 'Filtrar Propiedades'}
            </p>

            {/* Búsqueda */}
            <div className="relative mb-3">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" fill="none" stroke={T.muted} viewBox="0 0 24 24" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={language === 'en' ? 'Search by title, city or state...' : 'Buscar por título, ciudad o estado...'}
                className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm focus:outline-none"
                style={{ border: `1.5px solid ${T.border}`, backgroundColor: T.cream, color: T.charcoal }}
              />
            </div>

            {/* Botones mobile */}
            <div className="flex gap-2 md:hidden mb-2">
              <button
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className="flex-1 py-2 rounded-lg font-semibold text-sm flex items-center justify-center gap-1.5"
                style={{ backgroundColor: showAdvancedFilters ? T.navy : T.cream, color: showAdvancedFilters ? T.white : T.navy, border: `1.5px solid ${T.border}` }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/>
                </svg>
                {language === 'en' ? 'Filters' : 'Filtros'}
              </button>
              <button
                onClick={() => setIsAltitudeModalOpen(true)}
                className="flex-1 py-2 rounded-lg font-semibold text-sm flex items-center justify-center gap-1.5"
                style={{ backgroundColor: T.cream, color: T.navy, border: `1.5px solid ${T.border}` }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 2 22 22 22"/>
                </svg>
                {language === 'en' ? 'Altitude' : 'Altura'}
              </button>
            </div>

            {/* Selects */}
            <div className="md:flex md:flex-wrap md:gap-3 md:items-center">
              <div className={`space-y-2 pt-2 border-t md:border-0 md:pt-0 md:space-y-0 md:flex md:flex-wrap md:gap-3 ${showAdvancedFilters ? 'block' : 'hidden md:flex'}`} style={{ borderTopColor: T.border }}>
                {[
                  { value: filterPropertyType, onChange: setFilterPropertyType, options: PROPERTY_TYPES },
                  { value: filterStatus, onChange: setFilterStatus, options: STATUS_OPTIONS },
                  { value: filterLanguage, onChange: setFilterLanguage, options: LANGUAGE_OPTIONS },
                ].map((sel, i) => (
                  <select
                    key={i}
                    value={sel.value}
                    onChange={(e) => sel.onChange(e.target.value)}
                    className="w-full md:w-auto px-3 py-2 rounded-lg text-sm font-medium focus:outline-none"
                    style={{ border: `1.5px solid ${T.border}`, backgroundColor: T.cream, color: T.charcoal }}
                  >
                    {sel.options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                ))}
                <button
                  onClick={() => setIsAltitudeModalOpen(true)}
                  className="hidden md:flex py-2 px-3 rounded-lg font-medium text-sm items-center gap-1.5"
                  style={{ border: `1.5px solid ${T.border}`, backgroundColor: T.cream, color: T.navy }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="12 2 2 22 22 22"/>
                  </svg>
                  {language === 'en' ? 'Altitude' : 'Altura'}
                </button>
              </div>

              {/* Toggle modo propuesta */}
              <div className="flex items-center justify-between px-1 py-1 mt-2 md:mt-0 md:ml-auto">
                <span className="text-sm font-medium mr-3 md:mr-2" style={{ color: T.charcoal }}>
                  {language === 'en' ? 'Proposal mode' : 'Modo propuesta'}
                </span>
                <button
                  onClick={() => {
                    const next = !proposalModeActive;
                    setProposalModeActive(next);
                    if (!next) { setSelectedForProposal(new Set()); setProposalLanguage(null); }
                  }}
                  className="relative flex-shrink-0 transition-colors duration-200"
                  style={{ width: '44px', height: '24px', borderRadius: '100px', backgroundColor: proposalModeActive ? T.navy : T.border, border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  <span
                    className="absolute transition-transform duration-200"
                    style={{ top: '3px', left: '3px', width: '18px', height: '18px', borderRadius: '50%', backgroundColor: proposalModeActive ? T.gold : T.white, boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transform: proposalModeActive ? 'translateX(20px)' : 'translateX(0px)', display: 'block' }}
                  />
                </button>
              </div>
            </div>

            {hasActiveFilters && (
              <div className="flex items-center gap-3 mt-3 pt-3" style={{ borderTop: `1px solid ${T.border}` }}>
                <button onClick={clearFilters} className="text-sm font-semibold" style={{ color: T.navy, textDecoration: 'underline' }}>
                  {language === 'en' ? 'Clear filters' : 'Limpiar filtros'}
                </button>
                <div className="px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ backgroundColor: T.goldPale, color: T.navy }}>
                  {filteredProperties.length === 0
                    ? (language === 'en' ? 'No matches' : 'Sin coincidencias')
                    : `${filteredProperties.length} ${language === 'en' ? (filteredProperties.length === 1 ? 'result' : 'results') : (filteredProperties.length === 1 ? 'resultado' : 'resultados')}`}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── GRID DE PROPIEDADES ── */}
        {filteredProperties.length === 0 ? (
          <div className="px-4 md:px-6 pt-6">
            <div className="rounded-xl p-10 text-center" style={{ backgroundColor: T.white, border: `1px solid ${T.border}` }}>
              <div className="text-5xl mb-4">{hasActiveFilters ? '🔍' : '🏘️'}</div>
              <h3 className="text-xl font-bold mb-2" style={{ color: T.navy }}>
                {hasActiveFilters ? (language === 'en' ? 'No matches' : 'Sin coincidencias') : (language === 'en' ? 'No properties' : 'Sin propiedades')}
              </h3>
              <p className="mb-6" style={{ color: T.muted }}>
                {hasActiveFilters
                  ? (language === 'en' ? 'No properties found with the selected filters' : 'No se encontraron propiedades con los filtros seleccionados')
                  : (language === 'en' ? 'Create your first property with AI' : 'Crea tu primera propiedad con IA')}
              </p>
              {hasActiveFilters ? (
                <button onClick={clearFilters} className="py-2.5 px-6 rounded-xl font-semibold active:scale-95 transition-transform" style={{ border: `2px solid ${T.navy}`, color: T.navy, backgroundColor: 'transparent' }}>
                  {language === 'en' ? 'Clear filters' : 'Limpiar filtros'}
                </button>
              ) : (
                <button onClick={() => router.push('/create-property')} disabled={!isProActivo && properties.length >= 5} className="py-2.5 px-6 rounded-xl font-semibold text-white active:scale-95 transition-transform disabled:opacity-50" style={{ backgroundColor: T.navy }}>
                  {language === 'en' ? 'Create Property' : 'Crear Propiedad'}
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="px-4 md:px-6 pt-3 pb-32 md:pb-8">
            {proposalModeActive && (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium mb-3" style={{ backgroundColor: T.goldPale, color: T.navy, border: `1px solid rgba(201,168,76,0.4)` }}>
                <span style={{ color: T.gold }}>✦</span>
                <span>
                  {language === 'en'
                    ? 'Hold any property 2 seconds to add it to a proposal · Tap ˅ for details'
                    : 'Mantén presionada una propiedad 2 segundos para agregarla a una propuesta · Toca ˅ para detalles'}
                </span>
              </div>
            )}

            <div className="space-y-3 md:space-y-0 md:grid md:grid-cols-2 md:gap-4 lg:grid-cols-3">
              {filteredProperties.map((property) => {
                const isBlockedByLanguage = proposalLanguage !== null && property.language !== proposalLanguage;
                const isSelected = selectedForProposal.has(property.id);
                const isExpanded = expandedCards.has(property.id);
                const hasFacebook = !!property.last_facebook_published_at;
                const sc = statusConfig[property.status] || statusConfig.active;

                return (
                  <div
                    key={property.id}
                    className="rounded-xl overflow-hidden relative transition-all"
                    style={{
                      backgroundColor: T.white,
                      border: isSelected ? `2px solid ${T.gold}` : `1px solid ${T.border}`,
                      boxShadow: isSelected
                        ? `0 0 0 3px rgba(201,168,76,0.15), 0 4px 16px rgba(27,45,91,0.10)`
                        : `0 2px 8px rgba(27,45,91,0.06)`,
                      opacity: isBlockedByLanguage ? 0.3 : 1,
                      pointerEvents: isBlockedByLanguage ? 'none' : 'auto',
                    }}
                  >
                    <div
                      className="flex flex-row md:flex-col cursor-pointer group"
                      style={{ minHeight: '130px' }}
                      onClick={() => router.push(`/p/${property.slug}`)}
                      onTouchStart={(e) => handlePropertyPressStart(e, property)}
                      onTouchEnd={() => handlePropertyPressEnd(property.id)}
                      onMouseDown={(e) => handlePropertyPressStart(e, property)}
                      onMouseUp={() => handlePropertyPressEnd(property.id)}
                      onMouseLeave={() => handlePropertyPressEnd(property.id)}
                    >
                      {/* Foto */}
                      <div className="photo-container relative flex-shrink-0 overflow-hidden" style={{ backgroundColor: T.navy }}>
                        <div className="relative w-full h-full">
                          {property.photos && property.photos.length > 0 ? (
                            <Image
                              src={property.photos[0]}
                              alt={property.title}
                              fill
                              className="object-cover lg:transition-transform lg:duration-500 lg:group-hover:scale-105"
                              sizes="(min-width: 1200px) 33vw, (min-width: 768px) 50vw, 130px"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-3xl opacity-40">🏠</div>
                          )}
                          <div className="absolute bottom-2 left-2">
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ backgroundColor: 'rgba(255,255,255,0.92)', color: sc.text }}>
                              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: sc.dot }} />
                              {sc.label}
                            </span>
                          </div>
                          <div className="absolute top-2 left-2">
                            {property.language === 'es' ? (
                              <svg width="18" height="13" viewBox="0 0 20 14" style={{ borderRadius: '2px', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }}>
                                <rect width="20" height="14" fill="#AA151B"/>
                                <rect y="3.5" width="20" height="7" fill="#F1BF00"/>
                              </svg>
                            ) : (
                              <svg width="18" height="13" viewBox="0 0 20 14" style={{ borderRadius: '2px', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }}>
                                <rect width="20" height="14" fill="#B22234"/>
                                <rect y="1.08" width="20" height="1.08" fill="#FFFFFF"/>
                                <rect y="3.23" width="20" height="1.08" fill="#FFFFFF"/>
                                <rect y="5.38" width="20" height="1.08" fill="#FFFFFF"/>
                                <rect y="7.54" width="20" height="1.08" fill="#FFFFFF"/>
                                <rect y="9.69" width="20" height="1.08" fill="#FFFFFF"/>
                                <rect y="11.85" width="20" height="1.08" fill="#FFFFFF"/>
                                <rect width="8" height="7.54" fill="#3C3B6E"/>
                              </svg>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Info */}
                      <div className="flex flex-col justify-between flex-1 min-w-0 p-3 pr-10 md:pr-3">
                        <p className="text-sm font-semibold leading-snug line-clamp-2 mb-1.5" style={{ color: T.charcoal }}>
                          {property.title}
                        </p>
                        <p className="text-base font-bold mb-1.5" style={{ color: T.navy }}>
                          {formatPrice(property.price, property.currency_id)}
                        </p>
                        {property.city && property.state && (
                          <p className="text-xs mb-2 flex items-center gap-1" style={{ color: T.muted }}>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                            </svg>
                            {property.city}, {property.state}
                          </p>
                        )}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: T.cream, color: T.navy, border: `1px solid ${T.border}` }}>
                            {translatePropertyType(property.property_type, language)}
                          </span>
                          <span
                            className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                            style={{
                              backgroundColor: property.listing_type === 'rent' ? '#FFFBEB' : '#F0FDF4',
                              color: property.listing_type === 'rent' ? '#92400E' : '#15803D',
                              border: `1px solid ${property.listing_type === 'rent' ? '#FDE68A' : '#BBF7D0'}`,
                            }}
                          >
                            {property.listing_type === 'rent' ? (language === 'en' ? 'Rent' : 'Alquiler') : (language === 'en' ? 'Sale' : 'Venta')}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Expand */}
                    <button
                      onClick={(e) => toggleCardExpand(e, property.id)}
                      className="w-full flex items-center justify-center py-1.5 transition-colors"
                      style={{ borderTop: `1px solid ${T.borderSoft}` }}
                    >
                      <svg
                        className="transition-transform duration-200"
                        style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
                        width="12" height="12" viewBox="0 0 24 24" fill="none"
                        stroke={T.muted} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                      >
                        <path d="M6 9l6 6 6-6"/>
                      </svg>
                    </button>

                    <div
                      className="overflow-hidden transition-all duration-200 ease-in-out"
                      style={{ maxHeight: isExpanded ? '36px' : '0px', opacity: isExpanded ? 1 : 0, borderTop: isExpanded ? `1px solid ${T.borderSoft}` : 'none' }}
                    >
                      <div className="flex items-center gap-3 px-3 py-1.5 text-[10px] font-medium" style={{ color: T.muted, whiteSpace: 'nowrap', overflow: 'hidden' }}>
                        <span className="flex items-center gap-1">
                          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                          {property.views}
                        </span>
                        <span style={{ color: T.borderSoft }}>·</span>
                        <span>{formatExpandDate(property.created_at)}</span>
                        <span style={{ color: T.borderSoft }}>·</span>
                        <span style={{ color: hasFacebook ? '#15803D' : T.muted }}>
                          {hasFacebook ? `FB ${formatExpandDate(property.last_facebook_published_at)}` : (language === 'en' ? 'Not on FB' : 'Sin publicar')}
                        </span>
                      </div>
                    </div>

                    {/* Menú 3 puntos */}
                    <div className="absolute" style={{ top: '8px', right: '8px' }}>
                      <button
                        data-menu="true"
                        onClick={(e) => { e.stopPropagation(); setShowMenu(showMenu === property.id ? null : property.id); }}
                        className="flex items-center justify-center rounded-full transition-transform active:scale-90"
                        style={{ width: '28px', height: '28px', backgroundColor: 'rgba(255,255,255,0.95)', boxShadow: '0 1px 4px rgba(27,45,91,0.15)', border: 'none', cursor: 'pointer' }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill={T.navy}>
                          <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {isFree && (
              <div className="rounded-xl p-5 mt-5" style={{ backgroundColor: T.goldPale, border: `1px solid rgba(201,168,76,0.35)` }}>
                <p className="font-bold text-sm mb-1" style={{ color: T.navy }}>
                  {language === 'en' ? 'Ready for more?' : '¿Lista para más?'}
                </p>
                <p className="text-xs mb-3" style={{ color: T.navy, opacity: 0.7 }}>
                  {language === 'en' ? 'Upgrade to Pro and manage up to 150 properties with AI tools.' : 'Pásate a Pro y gestiona hasta 150 propiedades con funciones IA.'}
                </p>
                <a href="/pro" className="inline-block px-4 py-2 rounded-xl font-bold text-sm active:scale-95 transition-transform" style={{ backgroundColor: T.navy, color: T.white }}>
                  {language === 'en' ? 'See Pro plan' : 'Ver plan Pro'}
                </a>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── MODAL OPCIONES ── */}
      {mounted && showMenu && (() => {
        const property = properties.find(p => p.id === showMenu);
        if (!property) return null;
        return createPortal(
          <div
            className="fixed inset-0 z-50 flex flex-col justify-end md:items-center md:justify-center"
            style={{ backgroundColor: 'rgba(27,45,91,0.55)', backdropFilter: 'blur(4px)' }}
            onClick={() => setShowMenu(null)}
          >
            <div
              className="w-full rounded-t-2xl md:rounded-2xl md:max-w-sm shadow-2xl flex flex-col"
              style={{ backgroundColor: T.white, maxHeight: '92dvh', border: `1px solid ${T.border}` }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-center pt-3 pb-1 flex-shrink-0 md:hidden">
                <div className="w-8 h-1 rounded-full" style={{ backgroundColor: T.border }} />
              </div>
              <div className="flex items-center justify-between px-5 py-3 flex-shrink-0" style={{ borderBottom: `1px solid ${T.borderSoft}` }}>
                <div className="flex-1 min-w-0 pr-3">
                  <p className="text-[10px] uppercase tracking-widest font-semibold mb-0.5" style={{ color: T.muted }}>
                    {language === 'en' ? 'Property options' : 'Opciones de propiedad'}
                  </p>
                  <h3 className="text-sm font-bold leading-snug line-clamp-1" style={{ color: T.navy }}>{property.title}</h3>
                </div>
                <button onClick={() => setShowMenu(null)} className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-sm" style={{ backgroundColor: T.cream, color: T.muted }}>✕</button>
              </div>
              <div className="flex-1 overflow-y-auto min-h-0" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}>
                {[
                  { icon: '✏️', label: language === 'en' ? 'Edit' : 'Editar', onClick: () => { setShowMenu(null); router.push(`/edit-property/${property.id}`); }, disabled: false, pro: false },
                  { icon: '📋', label: language === 'en' ? 'Duplicate' : 'Duplicar', onClick: () => { setShowMenu(null); handleDuplicate(property.id); }, disabled: duplicating, pro: false },
                  { icon: '🌐', label: language === 'en' ? `Translate to ${property.language === 'es' ? 'English' : 'Spanish'}` : `Traducir a ${property.language === 'es' ? 'Inglés' : 'Español'}`, onClick: () => { if (isFree) return; setShowMenu(null); setTranslateModal({ open: true, propertyId: property.id, currentLang: property.language }); }, disabled: false, pro: isFree },
                  { icon: '📄', label: language === 'en' ? 'Export PDF' : 'Exportar PDF', onClick: async () => {
                    setShowMenu(null); setIsGeneratingPDF(true);
                    try {
                      const propertyResponse = await fetch(`/api/property/${property.slug}`);
                      if (!propertyResponse.ok) throw new Error('No se pudo cargar la propiedad completa');
                      const propertyData = await propertyResponse.json();
                      const fullProperty = propertyData.property;
                      let customFields: any[] = [];
                      if (fullProperty.property_type && fullProperty.listing_type) {
                        try {
                          const cfParams = new URLSearchParams({ property_type: fullProperty.property_type, listing_type: fullProperty.listing_type });
                          const cfResponse = await fetch(`/api/custom-fields/list?${cfParams.toString()}`);
                          if (cfResponse.ok) { const cfData = await cfResponse.json(); customFields = cfData.fields || []; }
                        } catch {}
                      }
                      const currencyInfo = currencies.find(c => c.id === fullProperty.currency_id);
                      const currency = currencyInfo ? { symbol: currencyInfo.symbol, code: currencyInfo.code } : { symbol: '$', code: 'USD' };
                      const { exportPropertyToPDF } = await import('@/lib/exportPDF');
                      await exportPropertyToPDF(fullProperty, fullProperty.agent, customFields, fullProperty.language, currency);
                    } catch { alert(language === 'en' ? 'Error generating PDF' : 'Error al generar el PDF'); }
                    finally { setIsGeneratingPDF(false); }
                  }, disabled: false, pro: false },
                ].map((item, i) => (
                  <button key={i} onClick={item.onClick} disabled={item.disabled}
                    className="w-full px-5 py-4 text-left font-medium text-sm flex items-center gap-3 transition-colors"
                    style={{ color: item.pro ? T.muted : T.charcoal, borderBottom: `1px solid ${T.borderSoft}`, opacity: item.disabled ? 0.5 : 1 }}
                    onMouseEnter={(e) => { if (!item.disabled) (e.currentTarget as HTMLElement).style.backgroundColor = T.cream; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
                  >
                    <span className="text-lg">{item.icon}</span>
                    {item.label}
                    {item.pro && <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: T.goldPale, color: T.navy }}>Pro</span>}
                  </button>
                ))}

                <button
                  onClick={() => { if (isFree) return; setShowMenu(null); setSelectedPropertyId(property.id); setPublishModalOpen(true); }}
                  className="w-full px-5 py-4 text-left font-medium text-sm flex items-center gap-3 transition-colors"
                  style={{ color: isFree ? T.muted : T.charcoal, borderBottom: `1px solid ${T.borderSoft}` }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = T.cream; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
                >
                  <svg width="18" height="18" fill="#1877F2" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  {language === 'en' ? 'Post to Facebook' : 'Publicar en Facebook'}
                  {isFree && <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: T.goldPale, color: T.navy }}>Pro</span>}
                </button>

                {!!property.video_urls?.length && (
                  <button
                    onClick={() => { if (isFree) return; setShowMenu(null); setSelectedPropertyId(property.id); setReelModalOpen(true); }}
                    className="w-full px-5 py-4 text-left font-medium text-sm flex items-center gap-3 transition-colors"
                    style={{ color: isFree ? T.muted : T.charcoal, borderBottom: `1px solid ${T.borderSoft}` }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = T.cream; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
                  >
                    <span className="text-lg">📲</span>
                    {language === 'en' ? 'Publish video to social media' : 'Publicar video en redes'}
                    {isFree && <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: T.goldPale, color: T.navy }}>Pro</span>}
                  </button>
                )}

                <button
                  onClick={() => { setShowMenu(null); handleDeleteProperty(property.id); }}
                  className="w-full px-5 py-4 text-left font-medium text-sm flex items-center gap-3 transition-colors"
                  style={{ color: '#DC2626' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#FEF2F2'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>
                  </svg>
                  {language === 'en' ? 'Delete' : 'Eliminar'}
                </button>
              </div>
            </div>
          </div>,
          document.body
        );
      })()}

      {/* Toast idioma */}
      {proposalLangToast && (
        <div className="fixed left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-xl" style={{ bottom: '170px', backgroundColor: T.navy, color: T.white, whiteSpace: 'nowrap' }}>
          <span style={{ color: T.gold }}>✦</span>
          <span className="text-sm font-medium">
            {proposalLanguage === 'es' ? 'Propuesta en Español — solo propiedades en Español' : 'Proposal in English — only English properties'}
          </span>
        </div>
      )}

      {/* Floating proposal bar */}
      {selectedForProposal.size > 0 && (
        <div className="fixed left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl" style={{ bottom: '96px', backgroundColor: T.navy, color: T.white, whiteSpace: 'nowrap', border: `1px solid ${T.gold}` }}>
          <span className="px-2.5 py-0.5 rounded-full text-sm font-bold" style={{ backgroundColor: T.gold, color: T.navy }}>{selectedForProposal.size}</span>
          <span className="text-sm">{language === 'en' ? 'selected' : 'seleccionadas'}</span>
          <button onClick={() => setIsCreateProposalOpen(true)} className="px-3.5 py-1.5 rounded-lg text-sm font-bold active:scale-95 transition-transform" style={{ backgroundColor: T.gold, color: T.navy, border: 'none', cursor: 'pointer' }}>
            {language === 'en' ? 'Create proposal ↗' : 'Crear propuesta ↗'}
          </button>
          <button onClick={clearProposalSelection} className="opacity-60 active:opacity-100" style={{ background: 'none', border: 'none', color: T.white, cursor: 'pointer', fontSize: '16px' }}>✕</button>
        </div>
      )}

      {/* Modales */}
      <GeneratingPDFModal isOpen={isGeneratingPDF} />
      <FacebookPublishModal isOpen={publishModalOpen} onClose={() => setPublishModalOpen(false)} propertyId={selectedPropertyId || ''} />
      <SocialReelPublishModal isOpen={reelModalOpen} onClose={() => setReelModalOpen(false)} propertyId={selectedPropertyId || ''} videoUrls={properties.find(p => p.id === selectedPropertyId)?.video_urls || []} language={language} />

      {/* Modal traducir */}
      {translateModal.open && translateModal.propertyId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(27,45,91,0.55)', backdropFilter: 'blur(4px)' }}>
          <div className="rounded-2xl p-6 max-w-md w-full shadow-2xl" style={{ backgroundColor: T.white, border: `1px solid ${T.border}` }}>
            <h3 className="text-xl font-bold mb-4" style={{ color: T.navy }}>🌐 {language === 'en' ? 'Translate property' : 'Traducir la propiedad'}</h3>
            <div className="mb-4">
              <p className="text-sm mb-2" style={{ color: T.charcoal }}><strong>{language === 'en' ? 'Current language:' : 'Idioma actual:'}</strong> {translateModal.currentLang === 'es' ? 'Español' : 'English'}</p>
              <p className="text-sm mb-4" style={{ color: T.charcoal }}><strong>{language === 'en' ? 'Translate to:' : 'Traducir a:'}</strong> {translateModal.currentLang === 'es' ? 'English' : 'Español'}</p>
              <div className="rounded-xl p-4 mb-4" style={{ backgroundColor: T.cream, border: `1px solid ${T.border}` }}>
                <p className="text-sm font-semibold mb-2" style={{ color: T.navy }}>{language === 'en' ? 'How do you want to create the translation?' : '¿Cómo deseas crear la traducción?'}</p>
                <label className="flex items-start gap-3 mb-3 cursor-pointer">
                  <input type="radio" name="translate-option" value="ai" defaultChecked className="mt-1" />
                  <div>
                    <div className="font-semibold text-sm" style={{ color: T.navy }}>🤖 {language === 'en' ? 'With AI (recommended)' : 'Con IA (recomendado)'}</div>
                    <div className="text-xs mt-0.5" style={{ color: T.muted }}>{language === 'en' ? 'Automatically translates title, description and custom fields' : 'Traduce automáticamente título, descripción y campos personalizados'}</div>
                  </div>
                </label>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="radio" name="translate-option" value="manual" className="mt-1" />
                  <div>
                    <div className="font-semibold text-sm" style={{ color: T.navy }}>✍️ {language === 'en' ? 'Manual' : 'Manual'}</div>
                    <div className="text-xs mt-0.5" style={{ color: T.muted }}>{language === 'en' ? 'Creates a copy without translating' : 'Crea una copia sin traducir'}</div>
                  </div>
                </label>
              </div>
              <div className="rounded-lg p-3 mb-4" style={{ backgroundColor: T.goldPale, border: `1px solid rgba(201,168,76,0.35)` }}>
                <p className="text-xs" style={{ color: T.navy }}>⚠️ {language === 'en' ? 'The original property will remain unchanged.' : 'La propiedad original se mantendrá sin cambios.'}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setTranslateModal({ open: false, propertyId: null, currentLang: null })} className="flex-1 py-3 rounded-xl font-bold" style={{ border: `2px solid ${T.border}`, color: T.charcoal }}>
                {language === 'en' ? 'Cancel' : 'Cancelar'}
              </button>
              <button
                onClick={async () => {
                  const useAI = (document.querySelector('input[name="translate-option"]:checked') as HTMLInputElement)?.value === 'ai';
                  const targetLang = translateModal.currentLang === 'es' ? 'en' : 'es';
                  setTranslateModal({ open: false, propertyId: null, currentLang: null });
                  setActionModal({ open: true, type: 'translating', message: useAI ? (language === 'en' ? 'Translating with AI...' : 'Traduciendo con IA...') : (language === 'en' ? 'Creating copy...' : 'Creando copia...') });
                  try {
                    const response = await fetch('/api/property/translate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ propertyId: translateModal.propertyId, targetLanguage: targetLang, useAI }) });
                    if (!response.ok) throw new Error('Error al traducir');
                    const { newPropertyId } = await response.json();
                    await loadProperties(); await refreshSession();
                    setActionModal({ open: false, type: 'translating', message: '' });
                    alert(useAI ? (language === 'en' ? '✅ Property translated with AI.' : '✅ Propiedad traducida con IA.') : (language === 'en' ? '✅ Property cloned.' : '✅ Propiedad clonada.'));
                    router.push(`/edit-property/${newPropertyId}`);
                  } catch (error) {
                    setActionModal({ open: false, type: 'translating', message: '' });
                    alert(language === 'en' ? '❌ Error translating property' : '❌ Error al traducir la propiedad');
                  }
                }}
                className="flex-1 py-3 rounded-xl font-bold"
                style={{ backgroundColor: T.gold, color: T.navy }}
              >
                🌐 {language === 'en' ? 'Create translation' : 'Crear traducción'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal límite */}
      {showLimitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(27,45,91,0.55)', backdropFilter: 'blur(4px)' }}>
          <div className="rounded-2xl p-6 max-w-sm w-full shadow-2xl" style={{ backgroundColor: T.white, border: `1px solid ${T.border}` }}>
            <div className="text-center mb-4">
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: T.goldPale }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={T.gold} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </div>
            </div>
            <h3 className="text-lg font-bold text-center mb-2" style={{ color: T.navy }}>{language === 'en' ? 'Property limit reached' : 'Límite de propiedades alcanzado'}</h3>
            <p className="text-sm text-center mb-5" style={{ color: T.muted }}>{language === 'en' ? 'Upgrade to Pro to keep adding more properties.' : 'Actualiza tu plan a Pro para poder seguir agregando más propiedades.'}</p>
            <div className="flex flex-col gap-2">
              <a href="/pro" className="w-full py-3 rounded-xl font-bold text-center active:scale-95 transition-transform flex items-center justify-center gap-2" style={{ backgroundColor: T.gold, color: T.navy }}>
                🚀 {language === 'en' ? 'Upgrade to Pro' : 'Actualizar a Pro'}
              </a>
              <button onClick={() => setShowLimitModal(false)} className="w-full py-3 rounded-xl font-bold" style={{ border: `2px solid ${T.border}`, color: T.charcoal }}>
                {language === 'en' ? 'Close' : 'Cerrar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <PropertyActionModal isOpen={actionModal.open} message={actionModal.message} type={actionModal.type} />
      <CalculateAltitudeModal isOpen={isAltitudeModalOpen} onClose={() => setIsAltitudeModalOpen(false)} />
      <MyProposalsModal isOpen={isMyProposalsOpen} onClose={() => setIsMyProposalsOpen(false)} />
      <CreateProposalModal isOpen={isCreateProposalOpen} onClose={() => setIsCreateProposalOpen(false)} selectedPropertyIds={Array.from(selectedForProposal)} proposalLanguage={proposalLanguage} onProposalCreated={() => { clearProposalSelection(); }} />
    </AppLayout>
  );
}