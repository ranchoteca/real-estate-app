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
  portfolio_template: 'minimalist' | 'dynamic' | 'organic' | 'beach' | 'mountain' | null;
}

interface Property {
  id: string;
  title: string;
  slug: string;
  price: number | null;
  currency_id: string | null;
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

type TemplateStyle = 'minimalist' | 'dynamic' | 'organic' | 'beach' | 'mountain';

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

const detectBrowserLanguage = (): 'es' | 'en' => {
  if (typeof window === 'undefined') return 'es';
  return navigator.language.toLowerCase().startsWith('es') ? 'es' : 'en';
};

const TEMPLATE_THEME: Record<TemplateStyle, {
  headerBg: string;
  headerText: string;
  bodyBg: string;
  cardBg: string;
  accent: string;
  accentText: string;
  border: string;
  tagBg: string;
  fontHeader: string;
  fontBody: string;
  rounded: string;
}> = {
  minimalist: {
    headerBg: '#FAFAF8',
    headerText: '#1A1714',
    bodyBg: '#FAFAF8',
    cardBg: '#FFFFFF',
    accent: '#1A1714',
    accentText: '#FFFFFF',
    border: '#E8E4DC',
    tagBg: '#F0EDE8',
    fontHeader: "'Cormorant Garamond', Georgia, serif",
    fontBody: "'Jost', system-ui, sans-serif",
    rounded: '4px',
  },
  dynamic: {
    headerBg: '#2563EB',
    headerText: '#FFFFFF',
    bodyBg: '#0F172A',
    cardBg: '#1E293B',
    accent: '#2563EB',
    accentText: '#FFFFFF',
    border: 'rgba(255,255,255,0.06)',
    tagBg: '#334155',
    fontHeader: "'Barlow Condensed', sans-serif",
    fontBody: "'Barlow', system-ui, sans-serif",
    rounded: '8px',
  },
  organic: {
    headerBg: '#4A3728',
    headerText: '#FDF6EE',
    bodyBg: '#F7F3EE',
    cardBg: '#FFFFFF',
    accent: '#4A3728',
    accentText: '#FDF6EE',
    border: '#EDE8E0',
    tagBg: '#F0EDE8',
    fontHeader: "'DM Serif Display', Georgia, serif",
    fontBody: "'DM Sans', system-ui, sans-serif",
    rounded: '20px',
  },
  beach: {
    headerBg: '#0a6e7a',
    headerText: '#FFFFFF',
    bodyBg: '#fef6ec',
    cardBg: '#FFFFFF',
    accent: '#0a6e7a',
    accentText: '#FFFFFF',
    border: '#d1e5e7',
    tagBg: '#e0f2f1',
    fontHeader: "'Playfair Display', serif",
    fontBody: "'Lato', sans-serif",
    rounded: '12px',
  },
  mountain: {
    headerBg: '#1c2a24',
    headerText: '#f1f5f9',
    bodyBg: '#f1f5f9',
    cardBg: '#FFFFFF',
    accent: '#c8794a',
    accentText: '#FFFFFF',
    border: '#d1d5db',
    tagBg: '#e2e8f0',
    fontHeader: "'Montserrat', sans-serif",
    fontBody: "'Open Sans', sans-serif",
    rounded: '0px',
  },
};

export default function AgentPortfolioPage() {
  const params = useParams();
  const router = useRouter();
  const username = params.username as string;
  const { t } = useTranslation();
  const [language, setLanguage] = useState<'es' | 'en'>('es');

  useEffect(() => { setLanguage(detectBrowserLanguage()); }, []);

  const [agent, setAgent] = useState<Agent | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'sold' | 'rented'>('active');
  const [languageFilter, setLanguageFilter] = useState<'all' | 'es' | 'en'>('all');
  const [currencies, setCurrencies] = useState<any[]>([]);
  const [template, setTemplate] = useState<TemplateStyle>('minimalist');

  useEffect(() => { if (username) loadAgentData(); }, [username]);
  useEffect(() => { loadCurrencies(); }, []);

  const loadCurrencies = async () => {
    try {
      const res = await fetch('/api/currencies/list');
      if (res.ok) { const data = await res.json(); setCurrencies(data.currencies || []); }
    } catch {}
  };

  const loadAgentData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/agent/portfolio/${username}`);
      if (!res.ok) {
        setError(language === 'en' ? 'Agent not found' : 'Agente no encontrado');
        return;
      }
      const data = await res.json();
      setAgent(data.agent);
      setProperties(data.properties);
      // Aplicar plantilla del agente
      if (data.agent?.portfolio_template) {
        setTemplate(data.agent.portfolio_template);
      }
    } catch {
      setError(language === 'en' ? 'Error loading portfolio' : 'Error al cargar el portfolio');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number | null, currencyId: string | null) => {
    if (!price) return language === 'en' ? 'Price upon request' : 'Precio a consultar';
    const currency = currencies.find(c => c.id === currencyId);
    const symbol = currency?.symbol || '$';
    return `${symbol}${new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(price)}`;
  };

  const filteredProperties = properties.filter(p => {
    if (filter === 'active' && p.status !== 'active') return false;
    if (filter === 'sold' && p.status !== 'sold') return false;
    if (filter === 'rented' && p.status !== 'rented') return false;
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

  const openProperty = (slug: string) => {
    router.push(`/p/${slug}?from=portfolio`);
  };

  const sharePortfolio = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({
        title: `Portfolio ${language === 'en' ? 'of' : 'de'} ${agent?.full_name || agent?.name}`,
        text: language === 'en' ? 'Check out my properties' : 'Mira mis propiedades',
        url,
      });
    } else {
      navigator.clipboard.writeText(url);
      alert(language === 'en' ? 'Link copied!' : '¡Link copiado!');
    }
  };

  // ── Loading ───────────────────────────────────────────────────────────────
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

  // ── Error ─────────────────────────────────────────────────────────────────
  if (error || !agent) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F5EAD3' }}>
        <div className="text-center px-6">
          <div className="text-5xl mb-4">❌</div>
          <h1 className="text-2xl font-bold mb-2" style={{ color: '#0F172A' }}>
            {error || (language === 'en' ? 'Agent not found' : 'Agente no encontrado')}
          </h1>
          <button onClick={() => router.push('/')} className="mt-6 px-6 py-3 rounded-xl font-bold text-white" style={{ backgroundColor: '#2563EB' }}>
            ← {language === 'en' ? 'Back to home' : 'Volver al inicio'}
          </button>
        </div>
      </div>
    );
  }

  const th = TEMPLATE_THEME[template];

  // ── Render con plantilla ──────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', backgroundColor: th.bodyBg, fontFamily: th.fontBody }}>

      {/* Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,400&family=Jost:wght@300;400;500&family=Barlow+Condensed:wght@600;700;800&family=Barlow:wght@400;500;600&family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500&display=swap');
        .portfolio-card { transition: transform 0.2s ease, box-shadow 0.2s ease; }
        .portfolio-card:hover { transform: translateY(-3px); }
      `}</style>

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <header style={{ backgroundColor: th.headerBg, borderBottom: `1px solid ${th.border}`, padding: '20px 16px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '22px' }}>🏠</span>
            <span style={{ fontFamily: th.fontHeader, fontSize: '18px', fontWeight: template === 'dynamic' ? 800 : 600, color: th.headerText, textTransform: template === 'dynamic' ? 'uppercase' : 'none' }}>
              {agent.brokerage || 'Flow Estate AI'}
            </span>
          </div>
          <button onClick={() => router.push('/')} style={{ fontFamily: th.fontBody, fontSize: '13px', fontWeight: 500, color: th.headerText, background: 'none', border: 'none', cursor: 'pointer', opacity: 0.7 }}>
            {language === 'en' ? 'Home' : 'Inicio'}
          </button>
        </div>
      </header>

      {/* ── SHARE BUTTON MOBILE ───────────────────────────────────────────── */}
      <div className="lg:hidden px-4 pt-4">
        <button onClick={sharePortfolio} className="w-full py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2" style={{ backgroundColor: th.accent, borderRadius: th.rounded }}>
          <span>📤</span> {language === 'en' ? 'Share My Portfolio' : 'Compartir Mi Portfolio'}
        </button>
      </div>

      {/* ── AGENT INFO ────────────────────────────────────────────────────── */}
      <section style={{ padding: '24px 16px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ backgroundColor: th.cardBg, borderRadius: th.rounded, padding: '24px', border: `1px solid ${th.border}`, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

              {/* Avatar + info */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '72px', height: '72px', borderRadius: '50%', backgroundColor: th.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: 700, color: th.accentText, flexShrink: 0, overflow: 'hidden' }}>
                  {(agent.card_profile_photo || agent.profile_photo) ? (
                    <Image src={agent.card_profile_photo || agent.profile_photo!} alt={agent.name || 'Agent'} width={72} height={72} style={{ objectFit: 'cover', width: '100%', height: '100%', borderRadius: '50%' }} />
                  ) : (
                    <span style={{ fontFamily: th.fontHeader }}>{(agent.full_name || agent.name || 'A').charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div>
                  <h1 style={{ fontFamily: th.fontHeader, fontSize: 'clamp(20px,4vw,28px)', fontWeight: template === 'dynamic' ? 800 : 400, color: template === 'dynamic' ? '#F1F5F9' : '#0F172A', fontStyle: template === 'minimalist' || template === 'organic' ? 'italic' : 'normal', textTransform: template === 'dynamic' ? 'uppercase' : 'none', marginBottom: '4px' }}>
                    {agent.full_name || agent.name}
                  </h1>
                  {agent.brokerage && (
                    <p style={{ fontFamily: th.fontBody, fontSize: '13px', color: template === 'dynamic' ? '#64748B' : '#6B7280', marginBottom: '4px' }}>{agent.brokerage}</p>
                  )}
                  {agent.bio && (
                    <p style={{ fontFamily: th.fontBody, fontSize: '13px', color: template === 'dynamic' ? '#64748B' : '#6B7280', lineHeight: 1.5 }}>{agent.bio}</p>
                  )}
                </div>
              </div>

              {/* Contact buttons */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {agent.phone && (
                  <>
                    <a href={`tel:${agent.phone}`} style={{ padding: '10px 18px', backgroundColor: th.accent, color: th.accentText, borderRadius: th.rounded, textDecoration: 'none', fontSize: '13px', fontWeight: 600, fontFamily: th.fontBody }}>
                      📞 {language === 'en' ? 'Call' : 'Llamar'}
                    </a>
                    <a href={`https://wa.me/${agent.phone.replace(/\D/g, '')}?text=${encodeURIComponent(language === 'en' ? 'Hi, I saw your portfolio' : 'Hola, vi tu portfolio')}`} target="_blank" rel="noopener noreferrer" style={{ padding: '10px 18px', backgroundColor: '#25D366', color: '#FFFFFF', borderRadius: th.rounded, textDecoration: 'none', fontSize: '13px', fontWeight: 600, fontFamily: th.fontBody }}>
                      💬 WhatsApp
                    </a>
                  </>
                )}
                <a href={`mailto:${agent.email}`} style={{ padding: '10px 18px', backgroundColor: 'transparent', color: template === 'dynamic' ? '#64748B' : th.accent, borderRadius: th.rounded, textDecoration: 'none', fontSize: '13px', fontWeight: 600, fontFamily: th.fontBody, border: `1px solid ${th.border}` }}>
                  ✉️ Email
                </a>
                <button onClick={sharePortfolio} className="hidden lg:inline-flex" style={{ padding: '10px 18px', backgroundColor: th.accent, color: th.accentText, borderRadius: th.rounded, fontSize: '13px', fontWeight: 600, fontFamily: th.fontBody, border: 'none', cursor: 'pointer', alignItems: 'center', gap: '6px' }}>
                  📤 {language === 'en' ? 'Share Portfolio' : 'Compartir Portfolio'}
                </button>
              </div>

              {/* Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px', paddingTop: '16px', borderTop: `1px solid ${th.border}` }}>
                {[
                  { label: language === 'en' ? 'Properties' : 'Propiedades', value: stats.total, color: th.accent },
                  { label: language === 'en' ? 'Available' : 'Disponibles', value: stats.active, color: '#10B981' },
                  { label: language === 'en' ? 'Sold' : 'Vendidas', value: stats.sold, color: '#6B7280' },
                  { label: language === 'en' ? 'Rented' : 'Alquiladas', value: stats.rented, color: '#6B7280' },
                  { label: language === 'en' ? 'Views' : 'Vistas', value: stats.totalViews, color: '#F59E0B' },
                ].map((stat, i) => (
                  <div key={i} style={{ textAlign: 'center' }}>
                    <div style={{ fontFamily: th.fontHeader, fontSize: 'clamp(18px,3vw,26px)', fontWeight: template === 'dynamic' ? 800 : 600, color: stat.color }}>{stat.value}</div>
                    <div style={{ fontFamily: th.fontBody, fontSize: '10px', color: template === 'dynamic' ? '#64748B' : '#6B7280', marginTop: '2px' }}>{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FILTER TABS ───────────────────────────────────────────────────── */}
      <section style={{ padding: '0 16px 16px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
            {[
              { key: 'active', label: language === 'en' ? '🟢 Available' : '🟢 Disponibles', count: stats.active },
              { key: 'all', label: language === 'en' ? '📋 All' : '📋 Todas', count: stats.total },
              { key: 'sold', label: language === 'en' ? '✅ Sold' : '✅ Vendidas', count: stats.sold },
              { key: 'rented', label: language === 'en' ? '🔑 Rented' : '🔑 Alquiladas', count: stats.rented },
            ].map((tab) => (
              <button key={tab.key} onClick={() => setFilter(tab.key as any)} style={{ padding: '10px 16px', borderRadius: th.rounded, fontWeight: 700, whiteSpace: 'nowrap', backgroundColor: filter === tab.key ? th.accent : th.cardBg, color: filter === tab.key ? th.accentText : (template === 'dynamic' ? '#64748B' : '#0F172A'), border: `1px solid ${th.border}`, cursor: 'pointer', fontFamily: th.fontBody, fontSize: '13px' }}>
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Language filter tabs */}
      <section style={{ padding: '0 16px 16px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
        {[
          { key: 'all', label: language === 'en' ? '🌐 All' : '🌐 Todos', count: properties.length },
          { key: 'es', label: '🇪🇸 ES', count: properties.filter(p => p.language === 'es').length },
          { key: 'en', label: '🇺🇸 EN', count: properties.filter(p => p.language === 'en').length },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setLanguageFilter(tab.key as any)}
            style={{
              padding: '8px 14px',
              borderRadius: th.rounded,
              fontWeight: 600,
              whiteSpace: 'nowrap',
              backgroundColor: languageFilter === tab.key ? '#10B981' : th.cardBg,
              color: languageFilter === tab.key ? '#FFFFFF' : (template === 'dynamic' ? '#64748B' : '#0F172A'),
              border: `1px solid ${th.border}`,
              cursor: 'pointer',
              fontFamily: th.fontBody,
              fontSize: '13px',
            }}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
        </div>
       </div>
      </section>

      {/* ── PROPERTIES GRID ───────────────────────────────────────────────── */}
      <section style={{ padding: '0 16px 48px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          {filteredProperties.length === 0 ? (
            <div style={{ backgroundColor: th.cardBg, borderRadius: th.rounded, padding: '48px', textAlign: 'center', border: `1px solid ${th.border}` }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>🏘️</div>
              <p style={{ fontFamily: th.fontBody, color: template === 'dynamic' ? '#64748B' : '#6B7280' }}>
                {language === 'en' ? 'No properties found' : 'No hay propiedades'}
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
              {filteredProperties.map((property) => (
                <div
                  key={property.id}
                  className="portfolio-card"
                  onClick={() => openProperty(property.slug)}
                  style={{ backgroundColor: th.cardBg, borderRadius: th.rounded, overflow: 'hidden', cursor: 'pointer', border: `1px solid ${th.border}`, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
                >
                  {/* Foto */}
                  <div style={{ position: 'relative', aspectRatio: '16/9', overflow: 'hidden', backgroundColor: template === 'dynamic' ? '#334155' : '#F0EDE8' }}>
                    {property.photos?.[0] ? (
                      <Image src={property.photos[0]} alt={property.title} fill style={{ objectFit: 'cover' }} sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px' }}>🏠</div>
                    )}
                    {/* Status badge */}
                    <div style={{ position: 'absolute', top: '10px', left: '10px' }}>
                      <span style={{ padding: '3px 10px', borderRadius: '100px', fontSize: '11px', fontWeight: 700, color: '#FFFFFF', backgroundColor: property.status === 'active' ? '#10B981' : property.status === 'rented' ? '#3B82F6' : '#6B7280', fontFamily: th.fontBody }}>
                        {property.status === 'active' ? (language === 'en' ? '● Available' : '● Disponible') : property.status === 'rented' ? (language === 'en' ? '● Rented' : '● Alquilada') : (language === 'en' ? '● Sold' : '● Vendida')}
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div style={{ padding: '14px 16px 16px' }}>
                    <h3 style={{ fontFamily: th.fontHeader, fontSize: template === 'dynamic' ? '16px' : '15px', fontWeight: template === 'dynamic' ? 700 : 400, color: template === 'dynamic' ? '#F1F5F9' : '#0F172A', lineHeight: 1.3, marginBottom: '8px', fontStyle: template === 'minimalist' || template === 'organic' ? 'italic' : 'normal', textTransform: template === 'dynamic' ? 'uppercase' : 'none', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {property.title}
                    </h3>

                    {/* Price */}
                    <div style={{ fontFamily: th.fontHeader, fontSize: 'clamp(16px,2.5vw,20px)', fontWeight: template === 'dynamic' ? 800 : 600, color: th.accent, marginBottom: '8px', fontStyle: template === 'minimalist' ? 'italic' : 'normal' }}>
                      {formatPrice(property.price, property.currency_id)}
                    </div>

                    {property.city && (
                      <p style={{ fontFamily: th.fontBody, fontSize: '12px', color: template === 'dynamic' ? '#64748B' : '#6B7280', marginBottom: '8px' }}>
                        📍 {property.city}{property.state ? `, ${property.state}` : ''}
                      </p>
                    )}

                    {/* Tags */}
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '100px', backgroundColor: th.tagBg, color: template === 'dynamic' ? '#94A3B8' : '#44403C', fontFamily: th.fontBody }}>
                        🏡 {translatePropertyType(property.property_type, language)}
                      </span>
                      <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '100px', backgroundColor: property.listing_type === 'rent' ? '#FEF3C7' : '#D1FAE5', color: property.listing_type === 'rent' ? '#92400E' : '#065F46', fontFamily: th.fontBody }}>
                        {property.listing_type === 'rent' ? (language === 'en' ? 'Rent' : 'Alquiler') : (language === 'en' ? 'Sale' : 'Venta')}
                      </span>
                      <span style={{ fontSize: '13px' }}>
                        {property.language === 'es' ? '🇪🇸' : '🇺🇸'}
                      </span>
                    </div>

                    {/* Footer */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', paddingTop: '10px', borderTop: `1px solid ${th.border}`, fontSize: '11px', color: template === 'dynamic' ? '#475569' : '#9CA3AF', fontFamily: th.fontBody }}>
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

      {/* ── FOOTER ───────────────────────────────────────────────────────── */}
      <footer style={{ borderTop: `1px solid ${th.border}`, padding: '24px 16px', textAlign: 'center', backgroundColor: template === 'dynamic' ? '#0F172A' : th.cardBg }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
          <span style={{ fontSize: '20px' }}>🏠</span>
          <span style={{ fontFamily: th.fontHeader, fontSize: '16px', fontWeight: 600, color: template === 'dynamic' ? '#F1F5F9' : '#0F172A' }}>Flow Estate AI</span>
        </div>
        <p style={{ fontFamily: th.fontBody, fontSize: '12px', color: template === 'dynamic' ? '#334155' : '#9CA3AF', marginBottom: '8px' }}>
          {language === 'en' ? 'Portfolio created with Flow Estate AI' : 'Portfolio creado con Flow Estate AI'}
        </p>
        <a href="/" style={{ fontFamily: th.fontBody, fontSize: '13px', fontWeight: 600, color: th.accent, textDecoration: 'none' }}>
          {language === 'en' ? 'Create your own portfolio →' : 'Crea tu propio portfolio →'}
        </a>
      </footer>
    </div>
  );
}