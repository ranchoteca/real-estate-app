'use client';

// ─────────────────────────────────────────────────────────────────────────────
// ProposalTemplates.tsx
// Tres plantillas para la página pública de propuesta
// Uso: import { TemplateMinimalist, TemplateDynamic, TemplateOrganic }
// ─────────────────────────────────────────────────────────────────────────────

import Image from 'next/image';
import { useRouter } from 'next/navigation';

// ── Tipos compartidos ────────────────────────────────────────────────────────

export interface ProposalProperty {
  id: string;
  title: string;
  slug: string;
  description: string;
  price: number | null;
  currency_id: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  property_type: string | null;
  listing_type: 'rent' | 'sale';
  photos: string[] | null;
  status: string;
  views: number;
  language: 'es' | 'en';
  custom_fields_data: Record<string, string> | null;
}

export interface ProposalAgent {
  id: string;
  name: string | null;
  full_name: string | null;
  phone: string | null;
  phone_2: string | null;
  email: string;
  brokerage: string | null;
  bio: string | null;
  profile_photo: string | null;
  username: string;
}

export interface ProposalData {
  id: string;
  title: string;
  template_style: 'minimalist' | 'dynamic' | 'organic';
  created_at: string;
  agent: ProposalAgent;
  properties: ProposalProperty[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const translatePropertyType = (type: string | null, lang: 'es' | 'en'): string => {
  const map: Record<string, Record<'es' | 'en', string>> = {
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
  return type ? (map[type]?.[lang] || type) : (lang === 'en' ? 'Property' : 'Propiedad');
};

const formatPrice = (price: number | null, symbol: string, lang: 'es' | 'en') => {
  if (!price) return lang === 'en' ? 'Price upon request' : 'Precio a consultar';
  return `${symbol}${new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(price)}`;
};

// ─────────────────────────────────────────────────────────────────────────────
// 1. PLANTILLA MINIMALIST — Ejecutiva / Luxury
//    Tipografía serif, mucho espacio blanco, monocromática
// ─────────────────────────────────────────────────────────────────────────────

export function TemplateMinimalist({
  proposal,
  lang,
  currencySymbol,
}: {
  proposal: ProposalData;
  lang: 'es' | 'en';
  currencySymbol: string;
}) {
  const router = useRouter();
  const agent = proposal.agent;

  const openProperty = (slug: string) => {
    router.push(`/p/${slug}?proposal=${proposal.id}`);
  };

  const whatsappUrl = agent.phone
    ? `https://wa.me/${agent.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
        lang === 'en'
          ? `Hi, I saw the proposal "${proposal.title}" and I'm interested.`
          : `Hola, vi la propuesta "${proposal.title}" y me interesa.`
      )}`
    : null;

  return (
    <div style={{ fontFamily: "'Georgia', 'Times New Roman', serif", backgroundColor: '#FAFAF8', minHeight: '100vh' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Jost:wght@300;400;500&display=swap');
        .min-title { font-family: 'Cormorant Garamond', Georgia, serif; }
        .min-body { font-family: 'Jost', sans-serif; }
        .min-card:hover .min-card-img { transform: scale(1.04); }
        .min-card-img { transition: transform 0.6s ease; }
      `}</style>

      {/* Header */}
      <header style={{ borderBottom: '1px solid #E8E4DC', backgroundColor: '#FAFAF8', padding: '32px 24px 24px' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <p className="min-body" style={{ fontSize: '11px', letterSpacing: '3px', textTransform: 'uppercase', color: '#9A9488', marginBottom: '8px' }}>
              {lang === 'en' ? 'Property Proposal' : 'Propuesta Inmobiliaria'}
            </p>
            <h1 className="min-title" style={{ fontSize: 'clamp(28px, 5vw, 48px)', fontWeight: 300, color: '#1A1714', lineHeight: 1.1, fontStyle: 'italic' }}>
              {proposal.title}
            </h1>
          </div>
          {agent.profile_photo && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', overflow: 'hidden', border: '1px solid #E8E4DC' }}>
                <Image src={agent.profile_photo} alt={agent.name || ''} width={48} height={48} style={{ objectFit: 'cover', width: '100%', height: '100%' }} />
              </div>
              <div>
                <p className="min-body" style={{ fontSize: '13px', fontWeight: 500, color: '#1A1714' }}>{agent.full_name || agent.name}</p>
                {agent.brokerage && <p className="min-body" style={{ fontSize: '11px', color: '#9A9488' }}>{agent.brokerage}</p>}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Properties */}
      <main style={{ maxWidth: '900px', margin: '0 auto', padding: '48px 24px' }}>
        <p className="min-body" style={{ fontSize: '11px', letterSpacing: '3px', textTransform: 'uppercase', color: '#9A9488', marginBottom: '32px' }}>
          {proposal.properties.length} {lang === 'en' ? 'selected properties' : 'propiedades seleccionadas'}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>
          {proposal.properties.map((property, idx) => (
            <div
              key={property.id}
              className="min-card"
              onClick={() => openProperty(property.slug)}
              style={{ cursor: 'pointer', display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: '0', borderBottom: '1px solid #E8E4DC', paddingBottom: '48px' }}
            >
              {/* Foto */}
              <div style={{ overflow: 'hidden', aspectRatio: '4/3' }}>
                {property.photos?.[0] ? (
                  <img
                    src={property.photos[0]}
                    alt={property.title}
                    className="min-card-img"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                ) : (
                  <div style={{ width: '100%', height: '100%', backgroundColor: '#F0EDE8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '48px' }}>🏠</div>
                )}
              </div>

              {/* Info */}
              <div style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', backgroundColor: '#FFFFFF' }}>
                <div>
                  <p className="min-body" style={{ fontSize: '10px', letterSpacing: '3px', textTransform: 'uppercase', color: '#9A9488', marginBottom: '12px' }}>
                    {String(idx + 1).padStart(2, '0')} · {translatePropertyType(property.property_type, lang)} · {property.listing_type === 'rent' ? (lang === 'en' ? 'Rent' : 'Alquiler') : (lang === 'en' ? 'Sale' : 'Venta')}
                  </p>
                  <h2 className="min-title" style={{ fontSize: 'clamp(18px, 2.5vw, 26px)', fontWeight: 400, color: '#1A1714', lineHeight: 1.2, marginBottom: '12px' }}>
                    {property.title}
                  </h2>
                  {(property.city || property.state) && (
                    <p className="min-body" style={{ fontSize: '12px', color: '#9A9488', marginBottom: '20px' }}>
                      {[property.city, property.state].filter(Boolean).join(', ')}
                    </p>
                  )}
                  <p className="min-body" style={{ fontSize: '12px', color: '#5A5650', lineHeight: 1.7, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {property.description}
                  </p>
                </div>
                <div style={{ marginTop: '24px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                  <p className="min-title" style={{ fontSize: 'clamp(22px, 3vw, 32px)', fontWeight: 600, color: '#1A1714', fontStyle: 'italic' }}>
                    {formatPrice(property.price, currencySymbol, lang)}
                  </p>
                  <span className="min-body" style={{ fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', color: '#9A9488', borderBottom: '1px solid #9A9488', paddingBottom: '2px' }}>
                    {lang === 'en' ? 'View details →' : 'Ver detalles →'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Agent Contact */}
        <div style={{ marginTop: '64px', paddingTop: '48px', borderTop: '1px solid #E8E4DC', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', alignItems: 'center' }}>
          <div>
            <p className="min-body" style={{ fontSize: '11px', letterSpacing: '3px', textTransform: 'uppercase', color: '#9A9488', marginBottom: '12px' }}>
              {lang === 'en' ? 'Your agent' : 'Tu agente'}
            </p>
            <h3 className="min-title" style={{ fontSize: '24px', fontWeight: 400, color: '#1A1714', fontStyle: 'italic', marginBottom: '4px' }}>
              {agent.full_name || agent.name}
            </h3>
            {agent.brokerage && <p className="min-body" style={{ fontSize: '13px', color: '#9A9488' }}>{agent.brokerage}</p>}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {whatsappUrl && (
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'block', textAlign: 'center', padding: '12px 24px', backgroundColor: '#1A1714', color: '#FAFAF8', textDecoration: 'none', fontSize: '12px', letterSpacing: '2px', textTransform: 'uppercase', fontFamily: "'Jost', sans-serif" }}>
                WhatsApp
              </a>
            )}
            {agent.phone && (
              <a href={`tel:${agent.phone}`} style={{ display: 'block', textAlign: 'center', padding: '12px 24px', border: '1px solid #1A1714', color: '#1A1714', textDecoration: 'none', fontSize: '12px', letterSpacing: '2px', textTransform: 'uppercase', fontFamily: "'Jost', sans-serif" }}>
                {lang === 'en' ? 'Call' : 'Llamar'}
              </a>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid #E8E4DC', padding: '24px', textAlign: 'center' }}>
        <p className="min-body" style={{ fontSize: '11px', color: '#C8C4BC', letterSpacing: '2px' }}>
          FLOW ESTATE AI
        </p>
      </footer>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. PLANTILLA DYNAMIC — Comercial / Fast Broker
//    Bloques de color, datos duros, alto contraste, sans-serif bold
// ─────────────────────────────────────────────────────────────────────────────

export function TemplateDynamic({
  proposal,
  lang,
  currencySymbol,
}: {
  proposal: ProposalData;
  lang: 'es' | 'en';
  currencySymbol: string;
}) {
  const router = useRouter();
  const agent = proposal.agent;

  const openProperty = (slug: string) => {
    router.push(`/p/${slug}?proposal=${proposal.id}`);
  };

  const whatsappUrl = agent.phone
    ? `https://wa.me/${agent.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
        lang === 'en'
          ? `Hi, I saw the proposal "${proposal.title}" and I'm interested.`
          : `Hola, vi la propuesta "${proposal.title}" y me interesa.`
      )}`
    : null;

  const statusColor = (status: string) => {
    if (status === 'active') return { bg: '#DCFCE7', text: '#15803D' };
    if (status === 'rented') return { bg: '#DBEAFE', text: '#1D4ED8' };
    return { bg: '#F3F4F6', text: '#6B7280' };
  };

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", backgroundColor: '#0F172A', minHeight: '100vh' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800&family=Barlow:wght@400;500;600&display=swap');
        .dyn-title { font-family: 'Barlow Condensed', sans-serif; }
        .dyn-body { font-family: 'Barlow', sans-serif; }
        .dyn-card { transition: transform 0.2s ease, box-shadow 0.2s ease; }
        .dyn-card:hover { transform: translateY(-4px); box-shadow: 0 20px 40px rgba(0,0,0,0.4); }
      `}</style>

      {/* Header */}
      <header style={{ backgroundColor: '#2563EB', padding: '24px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'inline-block', backgroundColor: 'rgba(255,255,255,0.15)', padding: '4px 12px', borderRadius: '4px', marginBottom: '8px' }}>
              <span className="dyn-body" style={{ fontSize: '11px', fontWeight: 600, color: '#FFFFFF', letterSpacing: '2px', textTransform: 'uppercase' }}>
                {lang === 'en' ? 'Property Proposal' : 'Propuesta Inmobiliaria'}
              </span>
            </div>
            <h1 className="dyn-title" style={{ fontSize: 'clamp(28px, 5vw, 52px)', fontWeight: 800, color: '#FFFFFF', lineHeight: 1, textTransform: 'uppercase', letterSpacing: '-1px' }}>
              {proposal.title}
            </h1>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p className="dyn-body" style={{ fontSize: '32px', fontWeight: 800, color: '#FFFFFF' }}>
              {proposal.properties.length}
            </p>
            <p className="dyn-body" style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '1px' }}>
              {lang === 'en' ? 'properties' : 'propiedades'}
            </p>
          </div>
        </div>
      </header>

      {/* Properties Grid */}
      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
          {proposal.properties.map((property) => {
            const sc = statusColor(property.status);
            return (
              <div
                key={property.id}
                className="dyn-card"
                onClick={() => openProperty(property.slug)}
                style={{ backgroundColor: '#1E293B', borderRadius: '8px', overflow: 'hidden', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                {/* Imagen */}
                <div style={{ position: 'relative', aspectRatio: '16/9', overflow: 'hidden' }}>
                  {property.photos?.[0] ? (
                    <img src={property.photos[0]} alt={property.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', backgroundColor: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px' }}>🏠</div>
                  )}
                  {/* Status badge */}
                  <div style={{ position: 'absolute', top: '10px', left: '10px', backgroundColor: sc.bg, color: sc.text, padding: '3px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, fontFamily: "'Barlow', sans-serif" }}>
                    {property.status === 'active' ? (lang === 'en' ? 'Available' : 'Disponible') : property.status === 'rented' ? (lang === 'en' ? 'Rented' : 'Alquilada') : (lang === 'en' ? 'Sold' : 'Vendida')}
                  </div>
                  {/* Listing type */}
                  <div style={{ position: 'absolute', top: '10px', right: '10px', backgroundColor: property.listing_type === 'rent' ? '#F59E0B' : '#10B981', color: '#FFFFFF', padding: '3px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, fontFamily: "'Barlow', sans-serif" }}>
                    {property.listing_type === 'rent' ? (lang === 'en' ? 'RENT' : 'ALQUILER') : (lang === 'en' ? 'SALE' : 'VENTA')}
                  </div>
                </div>

                {/* Content */}
                <div style={{ padding: '16px' }}>
                  <p className="dyn-body" style={{ fontSize: '11px', color: '#64748B', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>
                    {translatePropertyType(property.property_type, lang)}{property.city ? ` · ${property.city}` : ''}
                  </p>
                  <h2 className="dyn-title" style={{ fontSize: '20px', fontWeight: 700, color: '#F1F5F9', lineHeight: 1.2, marginBottom: '12px', textTransform: 'uppercase' }}>
                    {property.title}
                  </h2>

                  {/* Price — dato duro destacado */}
                  <div style={{ backgroundColor: '#2563EB', padding: '10px 14px', borderRadius: '6px', marginBottom: '12px' }}>
                    <p className="dyn-title" style={{ fontSize: '26px', fontWeight: 800, color: '#FFFFFF', lineHeight: 1 }}>
                      {formatPrice(property.price, currencySymbol, lang)}
                    </p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span className="dyn-body" style={{ fontSize: '11px', color: '#64748B' }}>
                      👁 {property.views} {lang === 'en' ? 'views' : 'vistas'}
                    </span>
                    <span className="dyn-body" style={{ fontSize: '12px', fontWeight: 600, color: '#2563EB' }}>
                      {lang === 'en' ? 'Details →' : 'Detalles →'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Agent CTA */}
        <div style={{ marginTop: '40px', backgroundColor: '#1E293B', borderRadius: '8px', padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {agent.profile_photo ? (
              <img src={agent.profile_photo} alt="" style={{ width: '52px', height: '52px', borderRadius: '8px', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '52px', height: '52px', borderRadius: '8px', backgroundColor: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 800, color: '#FFFFFF', fontFamily: "'Barlow Condensed', sans-serif" }}>
                {(agent.full_name || agent.name || 'A').charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <p className="dyn-title" style={{ fontSize: '20px', fontWeight: 700, color: '#F1F5F9', textTransform: 'uppercase' }}>
                {agent.full_name || agent.name}
              </p>
              {agent.brokerage && <p className="dyn-body" style={{ fontSize: '12px', color: '#64748B' }}>{agent.brokerage}</p>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {whatsappUrl && (
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" style={{ padding: '10px 20px', backgroundColor: '#25D366', color: '#FFFFFF', borderRadius: '6px', textDecoration: 'none', fontSize: '13px', fontWeight: 700, fontFamily: "'Barlow', sans-serif" }}>
                WhatsApp
              </a>
            )}
            {agent.phone && (
              <a href={`tel:${agent.phone}`} style={{ padding: '10px 20px', backgroundColor: '#2563EB', color: '#FFFFFF', borderRadius: '6px', textDecoration: 'none', fontSize: '13px', fontWeight: 700, fontFamily: "'Barlow', sans-serif" }}>
                {lang === 'en' ? 'Call' : 'Llamar'}
              </a>
            )}
            <a href={`mailto:${agent.email}`} style={{ padding: '10px 20px', backgroundColor: 'transparent', color: '#64748B', borderRadius: '6px', textDecoration: 'none', fontSize: '13px', fontWeight: 700, fontFamily: "'Barlow', sans-serif", border: '1px solid #334155' }}>
              Email
            </a>
          </div>
        </div>
      </main>

      <footer style={{ textAlign: 'center', padding: '24px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <p className="dyn-body" style={{ fontSize: '11px', color: '#334155', letterSpacing: '2px' }}>FLOW ESTATE AI</p>
      </footer>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. PLANTILLA ORGANIC — Natural / Cozy
//    Tonos tierra, bordes redondeados, tipografía suave, ideal playa/montaña
// ─────────────────────────────────────────────────────────────────────────────

export function TemplateOrganic({
  proposal,
  lang,
  currencySymbol,
}: {
  proposal: ProposalData;
  lang: 'es' | 'en';
  currencySymbol: string;
}) {
  const router = useRouter();
  const agent = proposal.agent;

  const openProperty = (slug: string) => {
    router.push(`/p/${slug}?proposal=${proposal.id}`);
  };

  const whatsappUrl = agent.phone
    ? `https://wa.me/${agent.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
        lang === 'en'
          ? `Hi, I saw the proposal "${proposal.title}" and I'm interested.`
          : `Hola, vi la propuesta "${proposal.title}" y me interesa.`
      )}`
    : null;

  return (
    <div style={{ fontFamily: 'system-ui', backgroundColor: '#F7F3EE', minHeight: '100vh' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500&display=swap');
        .org-title { font-family: 'DM Serif Display', Georgia, serif; }
        .org-body { font-family: 'DM Sans', system-ui, sans-serif; }
        .org-card { transition: box-shadow 0.3s ease; }
        .org-card:hover { box-shadow: 0 12px 32px rgba(101,75,47,0.15); }
      `}</style>

      {/* Hero Header */}
      <header style={{ backgroundColor: '#4A3728', padding: '40px 24px', position: 'relative', overflow: 'hidden' }}>
        {/* Texture overlay */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(210,180,140,0.15) 0%, transparent 60%), radial-gradient(circle at 80% 20%, rgba(139,90,43,0.2) 0%, transparent 50%)', pointerEvents: 'none' }} />

        <div style={{ maxWidth: '800px', margin: '0 auto', position: 'relative' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', backgroundColor: 'rgba(255,255,255,0.1)', padding: '6px 14px', borderRadius: '100px', marginBottom: '20px' }}>
            <span style={{ fontSize: '14px' }}>🌿</span>
            <span className="org-body" style={{ fontSize: '12px', color: '#DDD0C0', letterSpacing: '1px' }}>
              {lang === 'en' ? 'Property Proposal' : 'Propuesta Inmobiliaria'}
            </span>
          </div>
          <h1 className="org-title" style={{ fontSize: 'clamp(28px, 5vw, 52px)', fontWeight: 400, color: '#FDF6EE', lineHeight: 1.1, marginBottom: '16px', fontStyle: 'italic' }}>
            {proposal.title}
          </h1>
          <p className="org-body" style={{ fontSize: '14px', color: '#C4B49A' }}>
            {proposal.properties.length} {lang === 'en' ? 'curated properties' : 'propiedades seleccionadas'} · {agent.full_name || agent.name}
          </p>
        </div>
      </header>

      {/* Properties */}
      <main style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {proposal.properties.map((property, idx) => (
            <div
              key={property.id}
              className="org-card"
              onClick={() => openProperty(property.slug)}
              style={{ backgroundColor: '#FFFFFF', borderRadius: '20px', overflow: 'hidden', cursor: 'pointer', border: '1px solid #EDE8E0' }}
            >
              {/* Imagen full width */}
              <div style={{ position: 'relative', aspectRatio: '16/7', overflow: 'hidden' }}>
                {property.photos?.[0] ? (
                  <img src={property.photos[0]} alt={property.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', backgroundColor: '#EDE8E0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '48px' }}>🏡</div>
                )}
                {/* Gradient overlay */}
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(74,55,40,0.6) 0%, transparent 50%)' }} />
                {/* Price overlay */}
                <div style={{ position: 'absolute', bottom: '16px', left: '20px' }}>
                  <p className="org-title" style={{ fontSize: 'clamp(20px, 3vw, 28px)', fontWeight: 400, color: '#FFFFFF', fontStyle: 'italic' }}>
                    {formatPrice(property.price, currencySymbol, lang)}
                  </p>
                </div>
                {/* Number */}
                <div style={{ position: 'absolute', top: '16px', right: '16px', width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="org-body" style={{ fontSize: '13px', fontWeight: 500, color: '#4A3728' }}>{idx + 1}</span>
                </div>
              </div>

              {/* Content */}
              <div style={{ padding: '20px 24px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '10px' }}>
                  <h2 className="org-title" style={{ fontSize: 'clamp(18px, 2.5vw, 22px)', fontWeight: 400, color: '#2C1F15', lineHeight: 1.2, fontStyle: 'italic' }}>
                    {property.title}
                  </h2>
                  <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                    <span className="org-body" style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '100px', backgroundColor: property.listing_type === 'rent' ? '#FEF3C7' : '#DCFCE7', color: property.listing_type === 'rent' ? '#92400E' : '#166534', fontWeight: 500 }}>
                      {property.listing_type === 'rent' ? (lang === 'en' ? 'Rent' : 'Alquiler') : (lang === 'en' ? 'Sale' : 'Venta')}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
                  {(property.city || property.state) && (
                    <span className="org-body" style={{ fontSize: '13px', color: '#8C7B6E' }}>
                      📍 {[property.city, property.state].filter(Boolean).join(', ')}
                    </span>
                  )}
                  <span className="org-body" style={{ fontSize: '13px', color: '#8C7B6E' }}>
                    🏡 {translatePropertyType(property.property_type, lang)}
                  </span>
                </div>

                <p className="org-body" style={{ fontSize: '13px', color: '#6B5D52', lineHeight: 1.7, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', marginBottom: '16px' }}>
                  {property.description}
                </p>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                  <span className="org-body" style={{ fontSize: '13px', fontWeight: 500, color: '#4A3728', borderBottom: '1px solid #C4B49A', paddingBottom: '1px' }}>
                    {lang === 'en' ? 'View property →' : 'Ver propiedad →'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Agent */}
        <div style={{ marginTop: '48px', backgroundColor: '#4A3728', borderRadius: '20px', padding: '28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {agent.profile_photo ? (
              <img src={agent.profile_photo} alt="" style={{ width: '56px', height: '56px', borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.2)' }} />
            ) : (
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#6B5D52', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', fontWeight: 400, color: '#FDF6EE', fontFamily: "'DM Serif Display', serif", fontStyle: 'italic' }}>
                {(agent.full_name || agent.name || 'A').charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <p className="org-title" style={{ fontSize: '18px', fontWeight: 400, color: '#FDF6EE', fontStyle: 'italic' }}>
                {agent.full_name || agent.name}
              </p>
              {agent.brokerage && <p className="org-body" style={{ fontSize: '12px', color: '#C4B49A' }}>{agent.brokerage}</p>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {whatsappUrl && (
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" style={{ padding: '10px 20px', backgroundColor: '#25D366', color: '#FFFFFF', borderRadius: '100px', textDecoration: 'none', fontSize: '13px', fontWeight: 500, fontFamily: "'DM Sans', sans-serif" }}>
                WhatsApp
              </a>
            )}
            {agent.phone && (
              <a href={`tel:${agent.phone}`} style={{ padding: '10px 20px', backgroundColor: 'rgba(255,255,255,0.15)', color: '#FDF6EE', borderRadius: '100px', textDecoration: 'none', fontSize: '13px', fontWeight: 500, fontFamily: "'DM Sans', sans-serif" }}>
                {lang === 'en' ? 'Call' : 'Llamar'}
              </a>
            )}
          </div>
        </div>
      </main>

      <footer style={{ textAlign: 'center', padding: '24px', borderTop: '1px solid #EDE8E0' }}>
        <p className="org-body" style={{ fontSize: '11px', color: '#C4B49A', letterSpacing: '2px' }}>FLOW ESTATE AI</p>
      </footer>
    </div>
  );
}