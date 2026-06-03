'use client';

// ─────────────────────────────────────────────────────────────────────────────
// ProposalTemplates.tsx — Diseños adaptados de Lovable
// ─────────────────────────────────────────────────────────────────────────────

import { useRouter } from 'next/navigation';

// ── Tipos compartidos ─────────────────────────────────────────────────────────

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

export interface CustomField {
  field_key: string;
  field_name: string;
  field_name_en: string | null;
  icon: string | null;
}

export interface ProposalData {
  id: string;
  title: string;
  template_style: 'minimalist' | 'dynamic' | 'organic';
  created_at: string;
  agent: ProposalAgent;
  properties: ProposalProperty[];
  custom_fields: CustomField[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

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

const getFilledFields = (
  customFields: CustomField[],
  customFieldsData: Record<string, string> | null,
  lang: 'es' | 'en'
) => {
  if (!customFieldsData || !customFields.length) return [];
  return customFields
    .filter(f => customFieldsData[f.field_key])
    .map(f => ({
      label: lang === 'en' && f.field_name_en ? f.field_name_en : f.field_name,
      value: customFieldsData[f.field_key],
      icon: f.icon || '🏷️',
    }));
};

const formatPrice = (price: number | null, symbol: string, lang: 'es' | 'en') => {
  if (!price) return lang === 'en' ? 'Price upon request' : 'Precio a consultar';
  return `${symbol}${new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(price)}`;
};

// ── Iconos compartidos ────────────────────────────────────────────────────────

function PhoneIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function EmailIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-10 5L2 7" />
    </svg>
  );
}

function WhatsappIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.5 14.4c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.7.2s-.8.9-1 1.1c-.2.2-.4.2-.7.1-1.4-.7-2.3-1.2-3.3-2.8-.3-.5.3-.4.8-1.4.1-.2.1-.4 0-.5s-.7-1.6-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4s-1 1-1 2.4 1 2.8 1.2 3c.1.2 2 3.1 4.9 4.3 1.8.7 2.5.8 3.4.7.5-.1 1.7-.7 1.9-1.4.2-.7.2-1.2.2-1.4-.1-.1-.3-.2-.6-.3zM12 2C6.5 2 2 6.5 2 12c0 1.8.5 3.5 1.3 5L2 22l5.2-1.4c1.4.8 3.1 1.2 4.8 1.2 5.5 0 10-4.5 10-10S17.5 2 12 2z" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. PLANTILLA MINIMALIST — Ejecutiva / Luxury (Playfair Display)
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
  const GOLD = '#b8935a';
  const INK = '#0a0a0a';
  const BONE = '#f4f1ea';

  const phoneHref = agent.phone ? `tel:${agent.phone}` : '#';
  const waHref = agent.phone
    ? `https://wa.me/${agent.phone.replace(/\D/g, '')}?text=${encodeURIComponent(lang === 'en' ? `Hi, I saw the proposal "${proposal.title}"` : `Hola, vi la propuesta "${proposal.title}"`)}`
    : '#';
  const emailHref = `mailto:${agent.email}`;

  return (
    <div className="min-h-screen text-[#0a0a0a]" style={{ fontFamily: "'Inter', sans-serif", backgroundColor: BONE }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,700;1,400&family=Inter:wght@300;400;500;600&display=swap');`}</style>

      {/* Top bar */}
      <div className="border-b border-[#0a0a0a]/10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 text-[11px] uppercase tracking-[0.25em]">
          <span className="text-[#0a0a0a]/60">{lang === 'en' ? 'Private proposal · Confidential' : 'Propuesta privada · Confidencial'}</span>
          <span className="text-[#0a0a0a]/60">Flow Estate AI</span>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-16 sm:px-10 sm:py-24">

        {/* Header */}
        <header className="border-b border-[#0a0a0a]/15 pb-16">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[11px] uppercase tracking-[0.3em] text-[#0a0a0a]/50">
            <span style={{ color: GOLD }}>—— {proposal.properties.length} {lang === 'en' ? 'properties' : 'propiedades'}</span>
            <span>{new Date(proposal.created_at).toLocaleDateString(lang === 'en' ? 'en-US' : 'es-ES', { month: 'long', year: 'numeric' })}</span>
          </div>

          <h1 className="mt-12 text-5xl leading-[0.95] tracking-tight sm:text-8xl" style={{ fontFamily: "'Playfair Display', serif", fontWeight: 500 }}>
            {proposal.title.split(' ').slice(0, 3).join(' ')}
            <br />
            <em style={{ fontStyle: 'italic', color: GOLD }}>{proposal.title.split(' ').slice(3).join(' ') || (lang === 'en' ? 'selected.' : 'seleccionadas.')}</em>
          </h1>

          <div className="mt-16 grid gap-8 sm:grid-cols-[2fr_1fr] sm:items-end">
            <p className="max-w-xl text-lg leading-relaxed text-[#0a0a0a]/75" style={{ fontFamily: "'Playfair Display', serif", fontStyle: 'italic' }}>
              {agent.bio
                ? `«${agent.bio.substring(0, 120)}»`
                : (lang === 'en'
                  ? '«A careful selection of properties, each chosen for its character, light and context.»'
                  : '«Una selección cuidada de propiedades, cada una elegida por su carácter, su luz y su contexto.»')}
            </p>
            <div className="border-l pl-6" style={{ borderColor: GOLD }}>
              <p className="text-[10px] uppercase tracking-[0.3em] text-[#0a0a0a]/50">{lang === 'en' ? 'Your advisor' : 'Tu asesor'}</p>
              <p className="mt-2 text-2xl" style={{ fontFamily: "'Playfair Display', serif", fontWeight: 500 }}>
                {agent.full_name || agent.name}
              </p>
              {agent.brokerage && <p className="mt-1 text-xs text-[#0a0a0a]/60">{agent.brokerage}</p>}
            </div>
          </div>
        </header>

        {/* Agent contact */}
        <section className="grid gap-10 border-b border-[#0a0a0a]/15 py-12 sm:grid-cols-[auto_1fr_auto] sm:items-center">
          {agent.profile_photo ? (
            <img src={agent.profile_photo} alt={agent.name || ''} width={128} height={128} className="h-28 w-28 object-cover grayscale" style={{ borderRadius: 0 }} />
          ) : (
            <div className="h-28 w-28 flex items-center justify-center text-4xl font-bold text-white" style={{ backgroundColor: GOLD }}>
              {(agent.full_name || agent.name || 'A').charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-[#0a0a0a]/50">{lang === 'en' ? 'Direct contact' : 'Contacto directo'}</p>
            <p className="mt-2 text-3xl" style={{ fontFamily: "'Playfair Display', serif", fontWeight: 500 }}>{agent.full_name || agent.name}</p>
            {agent.brokerage && <p className="mt-1 text-sm text-[#0a0a0a]/60">{agent.brokerage}</p>}
          </div>
          <div className="flex flex-col gap-2">
            {agent.phone && (
              <a href={phoneHref} className="inline-flex items-center justify-between gap-6 border border-[#0a0a0a] px-5 py-3 text-xs uppercase tracking-[0.25em] text-[#0a0a0a] transition hover:bg-[#0a0a0a] hover:text-[#f4f1ea]">
                <span>{lang === 'en' ? 'Call' : 'Llamar'}</span><PhoneIcon />
              </a>
            )}
            {agent.phone && (
              <a href={waHref} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-between gap-6 border border-[#0a0a0a]/40 px-5 py-3 text-xs uppercase tracking-[0.25em] text-[#0a0a0a] transition hover:border-[#0a0a0a]">
                <span>{agent.phone}</span><WhatsappIcon />
              </a>
            )}
            <a href={emailHref} className="inline-flex items-center justify-between gap-6 border border-[#0a0a0a]/40 px-5 py-3 text-xs uppercase tracking-[0.25em] text-[#0a0a0a] transition hover:border-[#0a0a0a]">
              <span>Email</span><EmailIcon />
            </a>
          </div>
        </section>

        {/* Properties */}
        <section className="mt-16 space-y-24">
          {proposal.properties.map((property, idx) => {
            const fields = getFilledFields(proposal.custom_fields, property.custom_fields_data, lang);
            return (
            <article key={property.id} className="grid gap-12 sm:grid-cols-12 cursor-pointer" onClick={() => router.push(`/p/${property.slug}?proposal=${proposal.id}`)}>
              <div className="sm:col-span-4">
                <p className="text-[10px] uppercase tracking-[0.4em]" style={{ color: GOLD }}>
                  {lang === 'en' ? 'Lot' : 'Lote'} · {String(idx + 1).padStart(2, '0')} / {String(proposal.properties.length).padStart(2, '0')}
                </p>
                <h2 className="mt-6 text-4xl leading-tight" style={{ fontFamily: "'Playfair Display', serif", fontWeight: 500 }}>
                  {property.title}
                </h2>
                {(property.city || property.state) && (
                  <p className="mt-3 text-sm italic text-[#0a0a0a]/60" style={{ fontFamily: "'Playfair Display', serif" }}>
                    {[property.city, property.state].filter(Boolean).join(', ')}
                  </p>
                )}
                <div className="mt-10 border-t border-[#0a0a0a]/15 pt-6">
                  <p className="text-[10px] uppercase tracking-[0.3em] text-[#0a0a0a]/50">{lang === 'en' ? 'Reference value' : 'Valor de referencia'}</p>
                  <p className="mt-2 text-3xl" style={{ fontFamily: "'Playfair Display', serif", fontWeight: 500 }}>
                    {formatPrice(property.price, currencySymbol, lang)}
                  </p>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.3em]" style={{ color: GOLD }}>
                    {property.listing_type === 'rent' ? (lang === 'en' ? 'For rent' : 'En alquiler') : (lang === 'en' ? 'For sale' : 'En venta')}
                    {' · '}{translatePropertyType(property.property_type, lang)}
                  </p>
                </div>
              </div>

              <div className="sm:col-span-8">
                <div className="overflow-hidden">
                  {property.photos?.[0] ? (
                    <img src={property.photos[0]} alt={property.title} loading="lazy" className="h-full w-full object-cover" style={{ filter: 'grayscale(0.2) contrast(1.05)', aspectRatio: '16/10' }} />
                  ) : (
                    <div className="flex items-center justify-center text-5xl" style={{ aspectRatio: '16/10', backgroundColor: '#E8E4DC' }}>🏠</div>
                  )}
                </div>
                <p className="mt-8 text-lg leading-relaxed text-[#0a0a0a]/80" style={{ fontFamily: "'Playfair Display', serif" }}>
                  {property.description.substring(0, 220)}{property.description.length > 220 ? '…' : ''}
                </p>
                {fields.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginTop: '16px' }}>
                    {fields.map((f, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                        <span>{f.icon}</span>
                        <span style={{ opacity: 0.6 }}>{f.label}:</span>
                        <span style={{ fontWeight: 600 }}>{f.value}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-6 flex items-center justify-end">
                  <span className="text-xs uppercase tracking-[0.2em] text-[#0a0a0a]/50 border-b border-[#0a0a0a]/30 pb-0.5">
                    {lang === 'en' ? 'View details →' : 'Ver detalles →'}
                  </span>
                </div>
              </div>
            </article>
            );
          })}
        </section>

        {/* Footer */}
        <footer className="mt-28 border-t-2 pt-12" style={{ borderColor: INK }}>
          <div className="grid gap-12 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <p className="text-[10px] uppercase tracking-[0.3em]" style={{ color: GOLD }}>{lang === 'en' ? 'Next step' : 'Próximo paso'}</p>
              <h3 className="mt-4 text-4xl leading-tight sm:text-5xl" style={{ fontFamily: "'Playfair Display', serif", fontWeight: 500 }}>
                {lang === 'en' ? <>A conversation,<br /><em style={{ color: GOLD }}>no commitment.</em></> : <>Una conversación,<br /><em style={{ color: GOLD }}>sin compromiso.</em></>}
              </h3>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-[#0a0a0a]/50">{lang === 'en' ? 'Contact' : 'Contacto'}</p>
              <ul className="mt-4 space-y-2 text-sm">
                {agent.phone && <li>{agent.phone}</li>}
                <li className="text-[#0a0a0a]/70">{agent.email}</li>
                {agent.brokerage && <li className="pt-3 text-[10px] uppercase tracking-[0.3em] text-[#0a0a0a]/50">{agent.brokerage}</li>}
              </ul>
            </div>
          </div>
          <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-[#0a0a0a]/15 pt-6 text-[10px] uppercase tracking-[0.3em] text-[#0a0a0a]/50 sm:flex-row sm:items-center">
            <span>Flow Estate AI · {lang === 'en' ? 'Confidential document' : 'Documento confidencial'}</span>
            <span style={{ color: GOLD }}>{agent.full_name || agent.name}</span>
          </div>
        </footer>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. PLANTILLA DYNAMIC — Comercial / Fast Broker (Archivo Black)
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

  const phoneHref = agent.phone ? `tel:${agent.phone}` : '#';
  const waHref = agent.phone
    ? `https://wa.me/${agent.phone.replace(/\D/g, '')}?text=${encodeURIComponent(lang === 'en' ? `Hi, I saw the proposal "${proposal.title}"` : `Hola, vi la propuesta "${proposal.title}"`)}`
    : '#';
  const emailHref = `mailto:${agent.email}`;

  return (
    <div className="min-h-screen bg-slate-50" style={{ fontFamily: "'Inter', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Archivo+Black&family=Inter:wght@400;500;600;700;800&display=swap');`}</style>

      {/* Top strip */}
      <div className="bg-[#0b2545] text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-2 text-xs">
          <span className="text-white/70">Flow Estate AI</span>
          <p className="font-medium tracking-wider">
            🔥 {lang === 'en' ? 'ACTIVE PROPOSAL' : 'PROPUESTA ACTIVA'}
          </p>
        </div>
      </div>

      {/* Header */}
      <header className="bg-white border-b-4 border-[#ff6b1a]">
        <div className="mx-auto max-w-7xl px-6 py-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              {agent.profile_photo ? (
                <img src={agent.profile_photo} alt={agent.name || ''} width={64} height={64} className="h-16 w-16 rounded-lg object-cover ring-2 ring-[#0b2545]/10" />
              ) : (
                <div className="h-16 w-16 rounded-lg flex items-center justify-center text-2xl font-black text-white bg-[#0b2545]">
                  {(agent.full_name || agent.name || 'A').charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#ff6b1a]">{lang === 'en' ? 'Your advisor' : 'Tu asesor'}</p>
                <p className="text-lg font-bold text-[#0b2545]">{agent.full_name || agent.name}</p>
                {agent.brokerage && <p className="text-xs text-slate-500">{agent.brokerage}</p>}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {agent.phone && (
                <a href={phoneHref} className="inline-flex items-center gap-2 rounded-md bg-[#ff6b1a] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#e85a0e]">
                  <PhoneIcon size={14} /> {lang === 'en' ? 'CALL' : 'LLAMAR'}
                </a>
              )}
              {agent.phone && (
                <a href={waHref} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-md bg-[#25D366] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#1da851]">
                  <WhatsappIcon size={14} /> {agent.phone}
                </a>
              )}
              <a href={emailHref} className="inline-flex items-center gap-2 rounded-md border-2 border-[#0b2545] bg-white px-4 py-2.5 text-sm font-bold text-[#0b2545] transition hover:bg-[#0b2545] hover:text-white">
                <EmailIcon size={14} /> EMAIL
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-br from-[#0b2545] via-[#13315c] to-[#1d4ed8] text-white">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-[#ff6b1a]" style={{ fontFamily: "'Archivo Black', sans-serif" }}>
            ★ {lang === 'en' ? 'Exclusive proposal' : 'Propuesta exclusiva'}
          </p>
          <h1 className="mt-4 text-4xl uppercase leading-[0.95] tracking-tight sm:text-6xl" style={{ fontFamily: "'Archivo Black', sans-serif" }}>
            {proposal.properties.length} {lang === 'en' ? 'opportunities' : 'oportunidades'}<br />
            <span className="text-[#fbbf24]">{lang === 'en' ? 'ready to close.' : 'listas para cerrar.'}</span>
          </h1>
          <p className="mt-4 max-w-2xl text-base text-white/80">
            {proposal.title}
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-white/15 bg-white/5 p-5 backdrop-blur">
              <p className="text-3xl text-[#fbbf24]" style={{ fontFamily: "'Archivo Black', sans-serif" }}>{proposal.properties.length}</p>
              <p className="mt-1 text-xs uppercase tracking-wider text-white/70">{lang === 'en' ? 'Selected properties' : 'Propiedades seleccionadas'}</p>
            </div>
            <div className="rounded-lg border border-white/15 bg-white/5 p-5 backdrop-blur">
              <p className="text-3xl text-[#fbbf24]" style={{ fontFamily: "'Archivo Black', sans-serif" }}>
                {proposal.properties.filter(p => p.status === 'active').length}
              </p>
              <p className="mt-1 text-xs uppercase tracking-wider text-white/70">{lang === 'en' ? 'Available now' : 'Disponibles ahora'}</p>
            </div>
            <div className="rounded-lg border border-white/15 bg-white/5 p-5 backdrop-blur">
              <p className="text-3xl text-[#fbbf24]" style={{ fontFamily: "'Archivo Black', sans-serif" }}>
                {new Date(proposal.created_at).toLocaleDateString(lang === 'en' ? 'en-US' : 'es-ES', { day: 'numeric', month: 'short' })}
              </p>
              <p className="mt-1 text-xs uppercase tracking-wider text-white/70">{lang === 'en' ? 'Proposal date' : 'Fecha propuesta'}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Properties */}
      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="mb-8 flex items-end justify-between border-b-2 border-[#0b2545] pb-4">
          <h2 className="text-3xl uppercase text-[#0b2545]" style={{ fontFamily: "'Archivo Black', sans-serif" }}>
            {lang === 'en' ? 'Selected catalog' : 'Catálogo seleccionado'}
          </h2>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            {String(proposal.properties.length).padStart(2, '0')} {lang === 'en' ? 'units' : 'unidades'}
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {proposal.properties.map((property, idx) => {
            const fields = getFilledFields(proposal.custom_fields, property.custom_fields_data, lang);
            return (
            <article
              key={property.id}
              className="group overflow-hidden rounded-xl bg-white shadow-md ring-1 ring-slate-200 transition hover:-translate-y-1 hover:shadow-2xl cursor-pointer"
              onClick={() => router.push(`/p/${property.slug}?proposal=${proposal.id}`)}
            >
              <div className="relative overflow-hidden bg-slate-200" style={{ aspectRatio: '4/3' }}>
                {property.photos?.[0] ? (
                  <img src={property.photos[0]} alt={property.title} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-5xl bg-slate-100">🏠</div>
                )}
                <div className="absolute left-3 top-3 flex gap-2">
                  <span className="rounded bg-[#ff6b1a] px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white">
                    {translatePropertyType(property.property_type, lang)}
                  </span>
                  <span className="rounded bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-[#0b2545]">
                    #{String(idx + 1).padStart(2, '0')}
                  </span>
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                  {(property.city || property.state) && (
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/70">
                      {[property.city, property.state].filter(Boolean).join(', ')}
                    </p>
                  )}
                  <h3 className="mt-1 text-lg font-bold leading-tight text-white">{property.title}</h3>
                </div>
              </div>

              <div className="p-5">
                <div className="flex items-baseline justify-between border-b border-dashed border-slate-200 pb-4">
                  <div>
                    <p className="text-2xl text-[#0b2545]" style={{ fontFamily: "'Archivo Black', sans-serif" }}>
                      {formatPrice(property.price, currencySymbol, lang)}
                    </p>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#ff6b1a]">
                      {property.listing_type === 'rent' ? (lang === 'en' ? 'For rent' : 'En alquiler') : (lang === 'en' ? 'For sale' : 'En venta')}
                    </p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${property.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                    {property.status === 'active' ? (lang === 'en' ? 'Available' : 'Disponible') : (lang === 'en' ? 'Sold' : 'Vendida')}
                  </span>
                </div>

                <p className="mt-4 text-sm leading-relaxed text-slate-600 line-clamp-3">{property.description}</p>

                {fields.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginTop: '16px' }}>
                    {fields.map((f, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                        <span>{f.icon}</span>
                        <span style={{ opacity: 0.6 }}>{f.label}:</span>
                        <span style={{ fontWeight: 600 }}>{f.value}</span>
                      </div>
                    ))}
                  </div>
                )}

                <button className="mt-5 w-full rounded-md bg-[#0b2545] py-3 text-sm font-black uppercase tracking-wider text-white transition hover:bg-[#13315c]">
                  {lang === 'en' ? 'View property →' : 'Ver propiedad →'}
                </button>
              </div>
            </article>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0b2545] text-white">
        <div className="mx-auto max-w-7xl px-6 py-14">
          <div className="grid gap-8 sm:grid-cols-[1fr_auto] sm:items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#ff6b1a]">
                {lang === 'en' ? "Don't miss this opportunity" : 'No dejes pasar la oportunidad'}
              </p>
              <h3 className="mt-3 text-3xl uppercase sm:text-4xl" style={{ fontFamily: "'Archivo Black', sans-serif" }}>
                {lang === 'en' ? 'Schedule your visit today' : 'Agenda tu visita hoy mismo'}
              </h3>
              <p className="mt-2 text-sm text-white/70">{agent.full_name || agent.name} · {agent.brokerage || 'Flow Estate AI'}</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              {agent.phone && (
                <a href={phoneHref} className="inline-flex items-center justify-center gap-2 rounded-md bg-[#ff6b1a] px-6 py-4 text-base font-black uppercase tracking-wider text-white shadow-lg transition hover:bg-[#e85a0e]">
                  <PhoneIcon size={16} /> {lang === 'en' ? 'Call now' : 'Llamar ya'}
                </a>
              )}
              {agent.phone && (
                <a href={waHref} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 rounded-md bg-[#25D366] px-6 py-4 text-base font-black uppercase tracking-wider text-white shadow-lg transition hover:bg-[#1da851]">
                  <WhatsappIcon size={16} /> WhatsApp
                </a>
              )}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. PLANTILLA ORGANIC — Natural / Cozy (Cormorant Garamond)
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

  const phoneHref = agent.phone ? `tel:${agent.phone}` : '#';
  const waHref = agent.phone
    ? `https://wa.me/${agent.phone.replace(/\D/g, '')}?text=${encodeURIComponent(lang === 'en' ? `Hi, I saw the proposal "${proposal.title}"` : `Hola, vi la propuesta "${proposal.title}"`)}`
    : '#';
  const emailHref = `mailto:${agent.email}`;

  return (
    <div className="min-h-screen bg-[#f4ede0] text-[#2b3a2b]" style={{ fontFamily: "'Inter', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=Inter:wght@300;400;500;600&display=swap');`}</style>

      <div className="mx-auto max-w-6xl px-6 py-10 sm:px-10 sm:py-16">

        {/* Header */}
        <header className="mt-6 grid gap-10 border-b border-[#3d5a3d]/15 pb-12 sm:grid-cols-[1fr_auto] sm:items-end">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-[#6b8e6b]">
              {lang === 'en' ? 'Personalized proposal' : 'Propuesta personalizada'} · {new Date(proposal.created_at).toLocaleDateString(lang === 'en' ? 'en-US' : 'es-ES', { month: 'long', year: 'numeric' })}
            </p>
            <h1 className="mt-6 text-5xl leading-[1.05] tracking-tight sm:text-7xl" style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500 }}>
              {proposal.title.includes(' ') ? (
                <>
                  {proposal.title.split(' ').slice(0, Math.ceil(proposal.title.split(' ').length / 2)).join(' ')}
                  <br />
                  <em className="text-[#3d5a3d]">{proposal.title.split(' ').slice(Math.ceil(proposal.title.split(' ').length / 2)).join(' ')}</em>
                </>
              ) : (
                <em className="text-[#3d5a3d]">{proposal.title}</em>
              )}
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-[#5c6b5c]">
              {agent.bio
                ? agent.bio.substring(0, 150)
                : (lang === 'en'
                  ? 'A careful selection of properties, each chosen for its character, its light and its context.'
                  : 'Una selección cuidada de propiedades pensadas para acompañar tu próximo capítulo. Cada una elegida con su carácter, su luz y su contexto.')}
            </p>
          </div>

          <div className="flex items-center gap-5">
            {agent.profile_photo ? (
              <img src={agent.profile_photo} alt={agent.name || ''} width={112} height={112} className="h-28 w-28 rounded-full object-cover ring-4 ring-[#3d5a3d]/10" />
            ) : (
              <div className="h-28 w-28 rounded-full flex items-center justify-center text-3xl font-semibold text-white ring-4 ring-[#3d5a3d]/10" style={{ backgroundColor: '#3d5a3d', fontFamily: "'Cormorant Garamond', serif" }}>
                {(agent.full_name || agent.name || 'A').charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-xs uppercase tracking-widest text-[#6b8e6b]">{lang === 'en' ? 'Your advisor' : 'Tu asesor'}</p>
              <p className="mt-1 text-2xl" style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600 }}>
                {agent.full_name || agent.name}
              </p>
              {agent.brokerage && <p className="text-sm text-[#5c6b5c]">{agent.brokerage}</p>}
            </div>
          </div>
        </header>

        {/* Contact buttons */}
        <div className="mt-8 flex flex-wrap gap-3">
          {agent.phone && (
            <a href={phoneHref} className="inline-flex items-center gap-2 rounded-full bg-[#3d5a3d] px-5 py-2.5 text-sm font-medium text-[#f4ede0] transition hover:bg-[#2d4530]">
              <PhoneIcon /> {lang === 'en' ? 'Call' : 'Llamar'}
            </a>
          )}
          {agent.phone && (
            <a href={waHref} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full border border-[#3d5a3d]/30 bg-[#f4ede0] px-5 py-2.5 text-sm font-medium text-[#3d5a3d] transition hover:bg-[#e8dcc4]">
              <WhatsappIcon /> {agent.phone}
            </a>
          )}
          <a href={emailHref} className="inline-flex items-center gap-2 rounded-full border border-[#3d5a3d]/30 bg-transparent px-5 py-2.5 text-sm font-medium text-[#3d5a3d] transition hover:bg-[#f4ede0]">
            <EmailIcon /> Email
          </a>
        </div>

        {/* Properties */}
        <section className="mt-20 space-y-24">
          {proposal.properties.map((property, idx) => {
            const fields = getFilledFields(proposal.custom_fields, property.custom_fields_data, lang);
            return (
            <article
              key={property.id}
              className={`grid gap-10 sm:grid-cols-12 sm:items-center cursor-pointer`}
              onClick={() => router.push(`/p/${property.slug}?proposal=${proposal.id}`)}
            >
              <div className={`sm:col-span-7 ${idx % 2 === 1 ? 'sm:order-2' : ''}`}>
                <div className="overflow-hidden rounded-[2rem] shadow-[0_20px_60px_-30px_rgba(45,69,48,0.45)]">
                  {property.photos?.[0] ? (
                    <img src={property.photos[0]} alt={property.title} loading="lazy" className="h-full w-full object-cover" style={{ filter: 'saturate(1.05) contrast(1.02)', aspectRatio: '4/3' }} />
                  ) : (
                    <div className="flex items-center justify-center text-6xl" style={{ aspectRatio: '4/3', backgroundColor: '#E8DCC4' }}>🏡</div>
                  )}
                </div>
              </div>

              <div className="sm:col-span-5">
                <p className="text-xs uppercase tracking-[0.3em] text-[#c08566]">
                  {lang === 'en' ? 'Property' : 'Propiedad'} {String(idx + 1).padStart(2, '0')} · {translatePropertyType(property.property_type, lang)}
                </p>
                <h2 className="mt-4 text-4xl leading-tight" style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500 }}>
                  {property.title}
                </h2>
                {(property.city || property.state) && (
                  <p className="mt-2 text-sm text-[#5c6b5c]">
                    {[property.city, property.state].filter(Boolean).join(', ')}
                  </p>
                )}

                <p className="mt-6 text-base leading-relaxed text-[#3d4a3d] line-clamp-4">
                  {property.description}
                </p>

                <div className="mt-8 flex items-baseline gap-3">
                  <p className="text-3xl text-[#3d5a3d]" style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600 }}>
                    {formatPrice(property.price, currencySymbol, lang)}
                  </p>
                  <span className="text-xs uppercase tracking-wider text-[#6b8e6b]">
                    {property.listing_type === 'rent' ? (lang === 'en' ? 'monthly' : 'mensual') : (lang === 'en' ? 'for sale' : 'en venta')}
                  </span>
                </div>

                {fields.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginTop: '16px' }}>
                    {fields.map((f, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                        <span>{f.icon}</span>
                        <span style={{ opacity: 0.6 }}>{f.label}:</span>
                        <span style={{ fontWeight: 600 }}>{f.value}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-4 flex items-center justify-end">
                  <span className="text-xs uppercase tracking-[0.2em] text-[#3d5a3d]/60 border-b border-[#3d5a3d]/30 pb-0.5">
                    {lang === 'en' ? 'View property →' : 'Ver propiedad →'}
                  </span>
                </div>
              </div>
            </article>
            );
          })}
        </section>

        {/* Footer */}
        <footer className="mt-28 rounded-[2rem] bg-[#3d5a3d] px-8 py-12 text-[#f4ede0] sm:px-14 sm:py-16">
          <div className="grid gap-10 sm:grid-cols-[1fr_auto] sm:items-center">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-[#a3b899]">
                {lang === 'en' ? 'Shall we talk about the next step?' : '¿Hablamos del siguiente paso?'}
              </p>
              <h3 className="mt-4 text-4xl sm:text-5xl" style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500 }}>
                {lang === 'en' ? <>When you're ready,<br /><em>I'm here.</em></> : <>Cuando estés listo,<br /><em>aquí estoy.</em></>}
              </h3>
              {agent.brokerage && <p className="mt-4 text-sm text-[#d8e0cc]">{agent.brokerage}</p>}
            </div>
            <div className="space-y-3">
              {agent.phone && (
                <a href={phoneHref} className="flex items-center gap-3 rounded-full bg-[#f4ede0] px-6 py-3 text-sm font-medium text-[#3d5a3d] transition hover:bg-white">
                  <PhoneIcon /> {lang === 'en' ? 'Call now' : 'Llamar ahora'}
                </a>
              )}
              {agent.phone && (
                <a href={waHref} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-full border border-[#f4ede0]/30 px-6 py-3 text-sm font-medium text-[#f4ede0] transition hover:bg-[#f4ede0]/10">
                  <WhatsappIcon /> {agent.phone}
                </a>
              )}
              <a href={emailHref} className="flex items-center gap-3 rounded-full border border-[#f4ede0]/30 px-6 py-3 text-sm font-medium text-[#f4ede0] transition hover:bg-[#f4ede0]/10">
                <EmailIcon /> {agent.email}
              </a>
            </div>
          </div>
        </footer>

        <div className="mt-8 text-center text-[10px] uppercase tracking-[0.3em] text-[#9aaa9a]">Flow Estate AI</div>
      </div>
    </div>
  );
}