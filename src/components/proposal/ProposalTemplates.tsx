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
  template_style: 'minimalist' | 'dynamic' | 'organic' | 'beach' | 'mountain';
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
                  {lang === 'en' ? 'Lot' : 'Lote'} · {String(idx + 1).padStart(2, '0')} / {String(proposal.properties.length).padStart(2, '00')}
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
                  <div style={{ marginTop: '24px', padding: '16px', backgroundColor: '#F4F1EA', borderLeft: '3px solid #b8935a' }}>
                    <p style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#9A9488', marginBottom: '12px', fontFamily: "'Inter', sans-serif" }}>
                      {lang === 'en' ? 'Features' : 'Características'}
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                      {fields.map((f, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '16px' }}>{f.icon}</span>
                          <div>
                            <div style={{ fontSize: '10px', color: '#9A9488', fontFamily: "'Inter', sans-serif", textTransform: 'uppercase', letterSpacing: '0.1em' }}>{f.label}</div>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: '#0a0a0a', fontFamily: "'Playfair Display', serif" }}>{f.value}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div style={{ marginTop: '20px' }}>
                  <button style={{ width: '100%', padding: '10px 16px', backgroundColor: '#0a0a0a', color: '#f4f1ea', fontSize: '11px', fontFamily: "'Inter', sans-serif", letterSpacing: '0.2em', textTransform: 'uppercase', border: 'none', cursor: 'pointer' }}>
                    {lang === 'en' ? 'View property →' : 'Ver propiedad →'}
                  </button>
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
                  <div style={{ marginTop: '24px', padding: '16px 20px', backgroundColor: '#e8dcc8', borderRadius: '12px' }}>
                    <p style={{ fontSize: '10px', letterSpacing: '0.25em', textTransform: 'uppercase', color: '#6b8e6b', marginBottom: '12px', fontFamily: "'Inter', sans-serif" }}>
                      {lang === 'en' ? 'Features' : 'Características'}
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                      {fields.map((f, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '16px' }}>{f.icon}</span>
                          <div>
                            <div style={{ fontSize: '10px', color: '#6b8e6b', fontFamily: "'Inter', sans-serif", textTransform: 'uppercase', letterSpacing: '0.1em' }}>{f.label}</div>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: '#2b3a2b', fontFamily: "'Cormorant Garamond', serif" }}>{f.value}</div>
                          </div>
                        </div>
                      ))}
                    </div>
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
                <div style={{ marginTop: '20px' }}>
                  <button style={{ width: '100%', padding: '10px 16px', backgroundColor: '#3d5a3d', color: '#f4ede0', fontSize: '11px', fontFamily: "'Inter', sans-serif", letterSpacing: '0.15em', textTransform: 'uppercase', borderRadius: '100px', border: 'none', cursor: 'pointer' }}>
                    {lang === 'en' ? 'View property →' : 'Ver propiedad →'}
                  </button>
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

// ─────────────────────────────────────────────────────────────────────────────
// 4. PLANTILLA BEACH — Costera / Luminosa (Fraunces + Inter)
// ─────────────────────────────────────────────────────────────────────────────

export function TemplateBeach({
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

  // Paleta costera
  const SAND = '#fef6ec';
  const OCEAN = '#0a6e7a';
  const TURQUOISE = '#22c4c4';
  const CORAL = '#ff7d62';
  const DEEP = '#063943';

  const phoneHref = agent.phone ? `tel:${agent.phone}` : '#';
  const waHref = agent.phone
    ? `https://wa.me/${agent.phone.replace(/\D/g, '')}?text=${encodeURIComponent(lang === 'en' ? `Hi, I saw the proposal "${proposal.title}"` : `Hola, vi la propuesta "${proposal.title}"`)}`
    : '#';
  const emailHref = `mailto:${agent.email}`;

  return (
    <div
      className="min-h-screen overflow-hidden"
      style={{
        fontFamily: "'Inter', sans-serif",
        background: `radial-gradient(ellipse at top, ${SAND} 0%, #f9ead3 100%)`,
        color: DEEP,
      }}
    >
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,500;0,9..144,700;1,9..144,500&family=Inter:wght@300;400;500;600&display=swap');`}</style>

      {/* Top bar */}
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 pt-6 sm:px-10">
        <span className="text-[10px] uppercase tracking-[0.25em]" style={{ color: OCEAN }}>Flow Estate AI</span>
        <p className="text-[10px] uppercase tracking-[0.3em]" style={{ color: `${OCEAN}99` }}>
          {new Date(proposal.created_at).toLocaleDateString(lang === 'en' ? 'en-US' : 'es-ES', { month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* HERO */}
      <header className="relative mx-auto max-w-7xl px-6 pb-16 pt-12 sm:px-10 sm:pb-24 sm:pt-16">
        {/* Decorative glows */}
        <div
          className="pointer-events-none absolute -right-32 -top-20 h-[520px] w-[520px] rounded-full opacity-60 blur-3xl"
          style={{ background: `radial-gradient(circle, ${CORAL}55 0%, transparent 65%)` }}
        />
        <div
          className="pointer-events-none absolute -left-40 top-40 h-[420px] w-[420px] rounded-full opacity-50 blur-3xl"
          style={{ background: `radial-gradient(circle, ${TURQUOISE}66 0%, transparent 65%)` }}
        />

        <div className="relative grid gap-12 sm:grid-cols-12 sm:items-end">
          {/* Left: headline */}
          <div className="sm:col-span-8">
            <span
              className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[10px] font-medium uppercase tracking-[0.25em] backdrop-blur"
              style={{ borderColor: `${DEEP}22`, backgroundColor: 'rgba(255,255,255,0.6)', color: OCEAN }}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: CORAL }} />
              {lang === 'en' ? 'Personalized proposal' : 'Propuesta personalizada'}
            </span>

            <h1
              className="mt-6 text-[3.4rem] leading-[0.95] tracking-tight sm:text-[6rem]"
              style={{ fontFamily: "'Fraunces', serif", fontWeight: 500 }}
            >
              {proposal.title.split(' ').slice(0, Math.ceil(proposal.title.split(' ').length / 2)).join(' ')}
              <br />
              <em
                style={{
                  fontStyle: 'italic',
                  background: `linear-gradient(120deg, ${OCEAN} 0%, ${TURQUOISE} 100%)`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                {proposal.title.split(' ').slice(Math.ceil(proposal.title.split(' ').length / 2)).join(' ') || (lang === 'en' ? 'selected.' : 'seleccionadas.')}
              </em>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-relaxed" style={{ color: `${DEEP}bb` }}>
              {agent.bio
                ? agent.bio.substring(0, 160)
                : (lang === 'en'
                  ? 'Coastal properties curated for you. Each with its light, its breeze, and its unique way of making you feel at home facing the ocean.'
                  : 'Propiedades costeras seleccionadas para ti. Cada una con su luz, su brisa y su forma única de hacerte sentir en casa frente al océano.')}
            </p>
          </div>

          {/* Right: agent card */}
          <div className="sm:col-span-4">
            <div
              className="relative rounded-[2rem] p-6 shadow-xl backdrop-blur"
              style={{ border: '1px solid rgba(255,255,255,0.6)', backgroundColor: 'rgba(255,255,255,0.5)', boxShadow: `0 20px 60px -20px ${OCEAN}22` }}
            >
              <div className="flex items-center gap-4">
                {agent.profile_photo ? (
                  <img src={agent.profile_photo} alt={agent.name || ''} width={80} height={80} className="h-20 w-20 rounded-full object-cover ring-4 ring-white" />
                ) : (
                  <div className="h-20 w-20 rounded-full flex items-center justify-center text-2xl font-semibold text-white ring-4 ring-white" style={{ backgroundColor: OCEAN }}>
                    {(agent.full_name || agent.name || 'A').charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="text-[10px] uppercase tracking-[0.25em]" style={{ color: OCEAN }}>{lang === 'en' ? 'Your advisor' : 'Tu asesor'}</p>
                  <p className="mt-0.5 text-xl leading-tight" style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, color: DEEP }}>
                    {agent.full_name || agent.name}
                  </p>
                  {agent.brokerage && <p className="text-xs" style={{ color: `${DEEP}99` }}>{agent.brokerage}</p>}
                </div>
              </div>
              <div className="mt-5 flex flex-col gap-2">
                {agent.phone && (
                  <a href={phoneHref} className="inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-medium text-white shadow-lg transition hover:opacity-90" style={{ background: `linear-gradient(135deg, ${CORAL} 0%, #ff5a3c 100%)`, boxShadow: `0 8px 24px -8px ${CORAL}66` }}>
                    <PhoneIcon size={16} /> {lang === 'en' ? 'Call now' : 'Llamar ahora'}
                  </a>
                )}
                {agent.phone && (
                  <a href={waHref} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-medium transition hover:bg-white" style={{ backgroundColor: 'rgba(255,255,255,0.7)', color: DEEP }}>
                    <WhatsappIcon size={16} /> {agent.phone}
                  </a>
                )}
                <a href={emailHref} className="inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-medium transition hover:bg-white" style={{ backgroundColor: 'rgba(255,255,255,0.7)', color: DEEP }}>
                  <EmailIcon size={16} /> Email
                </a>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Properties */}
      <section className="relative mx-auto max-w-7xl px-6 pb-24 sm:px-10">
        <div className="mb-12 flex items-end justify-between pb-6" style={{ borderBottom: `1px solid ${DEEP}18` }}>
          <h2 className="text-3xl sm:text-4xl" style={{ fontFamily: "'Fraunces', serif", fontWeight: 500, color: DEEP }}>
            {lang === 'en' ? 'The selection' : 'La selección'}
          </h2>
          <p className="text-[10px] uppercase tracking-[0.3em]" style={{ color: `${OCEAN}aa` }}>
            {String(proposal.properties.length).padStart(2, '0')} {lang === 'en' ? 'curated properties' : 'propiedades curadas'}
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {proposal.properties.map((property, idx) => {
            const fields = getFilledFields(proposal.custom_fields, property.custom_fields_data, lang);
            return (
              <article
                key={property.id}
                className="group relative flex flex-col overflow-hidden bg-white cursor-pointer"
                style={{ borderRadius: '2rem', boxShadow: `0 20px 60px -20px ${OCEAN}22` }}
                onClick={() => router.push(`/p/${property.slug}?proposal=${proposal.id}`)}
              >
                {/* Image */}
                <div className="relative overflow-hidden" style={{ height: '288px' }}>
                  {property.photos?.[0] ? (
                    <img
                      src={property.photos[0]}
                      alt={property.title}
                      loading="lazy"
                      className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                      style={{ filter: 'saturate(1.15)' }}
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-6xl" style={{ backgroundColor: '#e8f4f5' }}>🏖️</div>
                  )}
                  <div
                    className="absolute inset-0"
                    style={{ background: 'linear-gradient(to bottom, transparent 50%, rgba(6,57,67,0.55) 100%)' }}
                  />
                  {/* Badges */}
                  <div className="absolute left-4 top-4 flex flex-col gap-2">
                    <span className="rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-white" style={{ backgroundColor: CORAL }}>
                      {translatePropertyType(property.property_type, lang)}
                    </span>
                  </div>
                  <span className="absolute right-4 top-4 rounded-full px-3 py-1 text-[10px] font-medium uppercase tracking-wider backdrop-blur" style={{ backgroundColor: 'rgba(255,255,255,0.9)', color: DEEP }}>
                    {String(idx + 1).padStart(2, '0')} / {String(proposal.properties.length).padStart(2, '0')}
                  </span>
                  {/* Location bottom */}
                  {(property.city || property.state) && (
                    <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-medium backdrop-blur" style={{ backgroundColor: 'rgba(255,255,255,0.95)', color: OCEAN }}>
                      🌊 {[property.city, property.state].filter(Boolean).join(', ')}
                    </div>
                  )}
                </div>

                {/* Body */}
                <div className="flex flex-1 flex-col p-7">
                  <h3 className="text-2xl leading-tight" style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, color: DEEP }}>
                    {property.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed line-clamp-3" style={{ color: `${DEEP}aa` }}>
                    {property.description}
                  </p>

                  {fields.length > 0 && (
                    <div className="mt-5 rounded-2xl p-4" style={{ backgroundColor: SAND }}>
                      <p className="mb-3 text-[10px] uppercase tracking-[0.25em]" style={{ color: `${OCEAN}99` }}>
                        {lang === 'en' ? 'Features' : 'Características'}
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {fields.map((f, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <span className="text-base">{f.icon}</span>
                            <div>
                              <div className="text-[9px] uppercase tracking-wider" style={{ color: `${OCEAN}88` }}>{f.label}</div>
                              <div className="text-xs font-semibold" style={{ color: DEEP }}>{f.value}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Price + CTA */}
                  <div className="mt-auto pt-6">
                    <div className="flex items-end justify-between border-t pt-5" style={{ borderColor: `${DEEP}12` }}>
                      <div>
                        <p className="text-2xl font-semibold" style={{ fontFamily: "'Fraunces', serif", color: OCEAN }}>
                          {formatPrice(property.price, currencySymbol, lang)}
                        </p>
                        <p className="text-[10px] uppercase tracking-wider" style={{ color: `${OCEAN}88` }}>
                          {property.listing_type === 'rent' ? (lang === 'en' ? 'monthly' : 'mensual') : (lang === 'en' ? 'for sale' : 'en venta')}
                        </p>
                      </div>
                      <button
                        className="inline-flex h-11 w-11 items-center justify-center rounded-full text-white transition hover:scale-110"
                        style={{ background: `linear-gradient(135deg, ${TURQUOISE}, ${OCEAN})` }}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 12h14M13 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <footer
        className="relative mx-auto max-w-7xl overflow-hidden px-8 pb-16 pt-16 sm:px-16 sm:pt-20"
        style={{
          background: `linear-gradient(135deg, ${DEEP} 0%, ${OCEAN} 60%, ${TURQUOISE} 130%)`,
          color: SAND,
          borderRadius: '3rem 3rem 0 0',
        }}
      >
        <div
          className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full opacity-30 blur-3xl"
          style={{ backgroundColor: CORAL }}
        />
        <div className="relative grid gap-10 sm:grid-cols-[1fr_auto] sm:items-end">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-white/60">
              {lang === 'en' ? "When you're ready" : 'Cuando estés listo'}
            </p>
            <h3 className="mt-4 text-4xl leading-tight sm:text-6xl" style={{ fontFamily: "'Fraunces', serif", fontWeight: 500 }}>
              {lang === 'en'
                ? <><span>Let's find your</span><br /><em style={{ fontStyle: 'italic' }}>place by the sea.</em></>
                : <><span>Vamos a encontrar</span><br /><em style={{ fontStyle: 'italic' }}>tu lugar frente al mar.</em></>}
            </h3>
            <p className="mt-5 max-w-md text-sm text-white/70">
              {agent.full_name || agent.name}{agent.brokerage ? ` · ${agent.brokerage}` : ''}
            </p>
          </div>
          <div className="flex flex-col gap-3">
            {agent.phone && (
              <a href={phoneHref} className="inline-flex items-center gap-3 rounded-full bg-white px-6 py-3 text-sm font-semibold transition hover:bg-[#fef6ec]" style={{ color: DEEP }}>
                <PhoneIcon size={16} /> {lang === 'en' ? 'Call' : 'Llamar'}
              </a>
            )}
            {agent.phone && (
              <a href={waHref} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-3 rounded-full px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90" style={{ backgroundColor: CORAL }}>
                <WhatsappIcon size={16} /> {agent.phone}
              </a>
            )}
            <a href={emailHref} className="inline-flex items-center gap-3 rounded-full border border-white/30 px-6 py-3 text-sm font-medium text-white transition hover:bg-white/10">
              <EmailIcon size={16} /> {agent.email}
            </a>
          </div>
        </div>
        <div className="mt-12 border-t border-white/10 pt-6 text-center text-[10px] uppercase tracking-[0.3em] text-white/40">
          Flow Estate AI · {lang === 'en' ? 'Confidential document' : 'Documento confidencial'}
        </div>
      </footer>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. PLANTILLA MOUNTAIN — Alpina / Dossier (Bebas Neue + Cormorant Garamond)
// ─────────────────────────────────────────────────────────────────────────────

export function TemplateMountain({
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

  // Paleta alpina
  const INK = '#0e1612';
  const FOREST = '#1c2a24';
  const COPPER = '#c8794a';
  const AMBER = '#e8a04a';
  const BONE = '#ece4d4';
  const MOSS = '#5b6b58';

  const phoneHref = agent.phone ? `tel:${agent.phone}` : '#';
  const waHref = agent.phone
    ? `https://wa.me/${agent.phone.replace(/\D/g, '')}?text=${encodeURIComponent(lang === 'en' ? `Hi, I saw the proposal "${proposal.title}"` : `Hola, vi la propuesta "${proposal.title}"`)}`
    : '#';
  const emailHref = `mailto:${agent.email}`;

  return (
    <div
      className="min-h-screen"
      style={{ fontFamily: "'Inter', sans-serif", backgroundColor: INK, color: BONE }}
    >
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Cormorant+Garamond:ital,wght@0,400;0,500;1,400;1,500&family=Inter:wght@300;400;500;600&display=swap');`}</style>

      {/* Topo grid texture */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 opacity-[0.04]"
        style={{
          backgroundImage: 'repeating-linear-gradient(90deg, #fff 0 1px, transparent 1px 80px), repeating-linear-gradient(0deg, #fff 0 1px, transparent 1px 80px)',
        }}
      />

      {/* TOP BAR */}
      <div className="relative border-b border-white/5">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 sm:px-10">
          <span className="text-[10px] uppercase tracking-[0.3em] text-white/50">Flow Estate AI</span>
          <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.3em] text-white/50">
            <span>{new Date(proposal.created_at).toLocaleDateString(lang === 'en' ? 'en-US' : 'es-ES', { month: 'long', year: 'numeric' })}</span>
            <span className="h-1 w-1 rounded-full" style={{ backgroundColor: AMBER }} />
            <span>{lang === 'en' ? `${proposal.properties.length} properties` : `${proposal.properties.length} propiedades`}</span>
          </div>
        </div>
      </div>

      {/* HERO */}
      <header className="relative mx-auto max-w-7xl px-6 pb-20 pt-16 sm:px-10 sm:pb-32 sm:pt-24">
        <div
          className="pointer-events-none absolute right-0 top-10 h-[600px] w-[600px] rounded-full opacity-20 blur-3xl"
          style={{ background: `radial-gradient(circle, ${AMBER} 0%, transparent 60%)` }}
        />

        <div className="relative grid gap-16 sm:grid-cols-12">
          <div className="sm:col-span-8">
            <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.35em] text-white/40">
              <span className="inline-block h-px w-12" style={{ backgroundColor: COPPER }} />
              {lang === 'en' ? 'Mountain collection · Private proposal' : 'Colección de altura · Propuesta privada'}
            </div>
            <h1
              className="mt-8 text-[4rem] uppercase leading-[0.85] tracking-tight sm:text-[8.5rem]"
              style={{ fontFamily: "'Bebas Neue', sans-serif", color: BONE }}
            >
              {proposal.title.split(' ').slice(0, 2).join(' ')}
              <br />
              <span style={{ color: COPPER }}>
                {proposal.title.split(' ').slice(2).join(' ') || (lang === 'en' ? 'for you.' : 'para ti.')}
              </span>
            </h1>
            <p
              className="mt-8 max-w-xl text-lg italic leading-relaxed text-white/75"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
            >
              {agent.bio
                ? `«${agent.bio.substring(0, 160)}»`
                : (lang === 'en'
                  ? '«Refuges in the forest and mountain, chosen for those who seek silence, views and character. Private curation.»'
                  : '«Refugios en bosque y montaña, elegidos para quienes buscan silencio, vista y carácter. Curaduría privada.»')}
            </p>
          </div>

          {/* Agent card — dossier style */}
          <div className="sm:col-span-4 sm:pt-8">
            <div
              className="border border-white/10 p-6 backdrop-blur"
              style={{ borderLeft: `3px solid ${COPPER}`, backgroundColor: 'rgba(255,255,255,0.03)' }}
            >
              <p className="text-[10px] uppercase tracking-[0.3em] text-white/50">
                {lang === 'en' ? 'Expedition guide' : 'Guía de la expedición'}
              </p>
              <div className="mt-4 flex items-center gap-4">
                {agent.profile_photo ? (
                  <img src={agent.profile_photo} alt={agent.name || ''} width={80} height={80} className="h-20 w-20 object-cover" style={{ filter: 'grayscale(1) contrast(1.05)' }} />
                ) : (
                  <div className="h-20 w-20 flex items-center justify-center text-2xl font-bold" style={{ backgroundColor: COPPER, color: INK, fontFamily: "'Bebas Neue', sans-serif" }}>
                    {(agent.full_name || agent.name || 'A').charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="text-2xl uppercase leading-none" style={{ fontFamily: "'Bebas Neue', sans-serif", color: BONE }}>
                    {agent.full_name || agent.name}
                  </p>
                  {agent.brokerage && <p className="mt-1 text-[11px] uppercase tracking-widest text-white/50">{agent.brokerage}</p>}
                </div>
              </div>
              <div className="mt-6 grid gap-2">
                {agent.phone && (
                  <a
                    href={phoneHref}
                    className="flex items-center justify-between gap-3 px-4 py-3 text-sm font-medium uppercase tracking-wider transition hover:opacity-90"
                    style={{ backgroundColor: COPPER, color: INK }}
                  >
                    <span className="flex items-center gap-2"><PhoneIcon size={14} /> {lang === 'en' ? 'Call' : 'Llamar'}</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 5l7 7-7 7" /></svg>
                  </a>
                )}
                {agent.phone && (
                  <a href={waHref} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between gap-3 border border-white/20 px-4 py-3 text-sm text-white transition hover:border-white/50">
                    <span className="flex items-center gap-2"><WhatsappIcon size={14} /> {agent.phone}</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 5l7 7-7 7" /></svg>
                  </a>
                )}
                <a href={emailHref} className="flex items-center justify-between gap-3 border border-white/20 px-4 py-3 text-sm text-white transition hover:border-white/50">
                  <span className="flex items-center gap-2"><EmailIcon size={14} /> Email</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 5l7 7-7 7" /></svg>
                </a>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* PROPERTIES — vertical dossier layout */}
      <section className="relative mx-auto max-w-7xl border-t border-white/10 px-6 sm:px-10">
        {proposal.properties.map((property, idx) => {
          const fields = getFilledFields(proposal.custom_fields, property.custom_fields_data, lang);
          return (
            <article
              key={property.id}
              className="grid gap-10 border-b border-white/10 py-20 sm:grid-cols-12 sm:py-28 cursor-pointer"
              onClick={() => router.push(`/p/${property.slug}?proposal=${proposal.id}`)}
            >
              {/* Left: index + meta */}
              <aside className="sm:col-span-3">
                <div className="sm:sticky sm:top-10">
                  <p
                    className="text-7xl leading-none"
                    style={{ fontFamily: "'Bebas Neue', sans-serif", color: COPPER }}
                  >
                    {String(idx + 1).padStart(2, '0')}
                  </p>
                  <div className="my-5 h-px w-12" style={{ backgroundColor: COPPER }} />
                  <p className="text-[10px] uppercase tracking-[0.3em] text-white/40">
                    {lang === 'en' ? 'Property' : 'Propiedad'}
                  </p>
                  <p className="mt-3 text-xl uppercase leading-tight text-white" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                    {translatePropertyType(property.property_type, lang)}
                  </p>
                  {(property.city || property.state) && (
                    <>
                      <p className="mt-6 text-[11px] uppercase tracking-widest text-white/40">{lang === 'en' ? 'Location' : 'Ubicación'}</p>
                      <p className="mt-1 text-xs text-white/70">{[property.city, property.state].filter(Boolean).join(', ')}</p>
                    </>
                  )}
                  <p className="mt-4 text-[11px] uppercase tracking-widest text-white/40">
                    {lang === 'en' ? 'Price' : 'Precio'}
                  </p>
                  <p className="mt-1 text-2xl" style={{ fontFamily: "'Bebas Neue', sans-serif", color: AMBER }}>
                    {formatPrice(property.price, currencySymbol, lang)}
                  </p>
                  <p className="mt-1 text-[10px] uppercase tracking-wider" style={{ color: COPPER }}>
                    {property.listing_type === 'rent' ? (lang === 'en' ? 'For rent' : 'En alquiler') : (lang === 'en' ? 'For sale' : 'En venta')}
                  </p>
                </div>
              </aside>

              {/* Center: image */}
              <div className="sm:col-span-6">
                <div className="relative overflow-hidden">
                  {property.photos?.[0] ? (
                    <img
                      src={property.photos[0]}
                      alt={property.title}
                      loading="lazy"
                      className="h-[460px] w-full object-cover"
                      style={{ filter: 'contrast(1.05) saturate(0.92)' }}
                    />
                  ) : (
                    <div className="h-[460px] w-full flex items-center justify-center text-7xl" style={{ backgroundColor: FOREST }}>🏔️</div>
                  )}
                  <div
                    className="pointer-events-none absolute inset-0"
                    style={{ background: 'linear-gradient(180deg, rgba(14,22,18,0.1) 0%, rgba(14,22,18,0.55) 100%)' }}
                  />
                  <div
                    className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-5 py-4 text-[10px] uppercase tracking-widest text-white/80"
                    style={{ background: 'linear-gradient(0deg, rgba(0,0,0,0.6) 0%, transparent 100%)' }}
                  >
                    <span>{property.status === 'active' ? (lang === 'en' ? '● Available' : '● Disponible') : (lang === 'en' ? '○ Sold' : '○ Vendida')}</span>
                    <span>{lang === 'en' ? 'View details →' : 'Ver detalles →'}</span>
                  </div>
                </div>
              </div>

              {/* Right: details */}
              <div className="sm:col-span-3">
                <h2
                  className="text-4xl uppercase leading-[0.9]"
                  style={{ fontFamily: "'Bebas Neue', sans-serif", color: BONE }}
                >
                  {property.title}
                </h2>
                <p
                  className="mt-5 text-base italic leading-relaxed text-white/75"
                  style={{ fontFamily: "'Cormorant Garamond', serif" }}
                >
                  {property.description.substring(0, 200)}{property.description.length > 200 ? '…' : ''}
                </p>

                {fields.length > 0 && (
                  <dl className="mt-7 space-y-3 border-y border-white/10 py-5">
                    {fields.map((f, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-base">{f.icon}</span>
                        <div>
                          <dt className="text-[9px] uppercase tracking-wider text-white/40">{f.label}</dt>
                          <dd className="text-sm font-medium text-white/80">{f.value}</dd>
                        </div>
                      </div>
                    ))}
                  </dl>
                )}

                <div className="mt-8">
                  <button
                    className="inline-flex w-full items-center justify-between border-b pb-1 text-xs uppercase tracking-[0.25em] transition hover:opacity-80"
                    style={{ borderColor: COPPER, color: COPPER }}
                  >
                    {lang === 'en' ? 'View property' : 'Ver propiedad'}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 5l7 7-7 7" /></svg>
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </section>

      {/* FOOTER */}
      <footer className="relative mx-auto max-w-7xl px-6 py-24 sm:px-10">
        <div
          className="relative overflow-hidden border border-white/10 p-10 sm:p-16"
          style={{ background: `linear-gradient(135deg, ${FOREST} 0%, ${INK} 100%)` }}
        >
          <div
            className="pointer-events-none absolute -right-32 -top-32 h-80 w-80 rounded-full opacity-30 blur-3xl"
            style={{ backgroundColor: COPPER }}
          />
          <div className="relative grid gap-10 sm:grid-cols-[1fr_auto] sm:items-end">
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-white/40">
                {lang === 'en' ? 'Next expedition' : 'Próxima expedición'}
              </p>
              <h3
                className="mt-5 text-5xl uppercase leading-[0.9] sm:text-7xl"
                style={{ fontFamily: "'Bebas Neue', sans-serif" }}
              >
                {lang === 'en'
                  ? <><span>We summit</span><br /><span style={{ color: COPPER }}>when you're ready.</span></>
                  : <><span>Subimos</span><br /><span style={{ color: COPPER }}>cuando quieras.</span></>}
              </h3>
              <p className="mt-6 max-w-md text-sm text-white/60">
                {agent.full_name || agent.name}{agent.brokerage ? ` · ${agent.brokerage}` : ''}
              </p>
            </div>
            <div className="flex flex-col gap-2">
              {agent.phone && (
                <a
                  href={phoneHref}
                  className="flex items-center justify-between gap-6 px-5 py-3 text-sm font-semibold uppercase tracking-wider transition hover:opacity-90"
                  style={{ backgroundColor: COPPER, color: INK }}
                >
                  <span className="flex items-center gap-2"><PhoneIcon size={14} /> {lang === 'en' ? 'Call' : 'Llamar'}</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 5l7 7-7 7" /></svg>
                </a>
              )}
              {agent.phone && (
                <a href={waHref} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between gap-6 border border-white/20 px-5 py-3 text-sm text-white transition hover:border-white/60">
                  <span className="flex items-center gap-2"><WhatsappIcon size={14} /> {agent.phone}</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 5l7 7-7 7" /></svg>
                </a>
              )}
              <a href={emailHref} className="flex items-center justify-between gap-6 border border-white/20 px-5 py-3 text-sm text-white transition hover:border-white/60">
                <span className="flex items-center gap-2"><EmailIcon size={14} /> Email</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 5l7 7-7 7" /></svg>
              </a>
            </div>
          </div>
        </div>
        <div className="mt-8 text-center text-[10px] uppercase tracking-[0.3em] text-white/30">
          Flow Estate AI · {lang === 'en' ? 'Confidential document' : 'Documento confidencial'}
        </div>
      </footer>
    </div>
  );
}