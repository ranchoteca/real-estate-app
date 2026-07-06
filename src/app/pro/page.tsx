'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Suspense, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

type Lang = 'es' | 'en';

// ─────────────────────────────────────────────────────────────────────────────
// COPY — strings en ES y EN. El idioma viene de ?lang= en la URL (lo manda
// la landing según lo que el usuario tenía seleccionado) y se puede cambiar
// también desde el toggle de esta página.
// ─────────────────────────────────────────────────────────────────────────────
const COPY = {
  es: {
    badge: '🚀 PLAN PRO',
    price: '₡14,803',
    priceSubtitle: 'por mes · ~$28 USD',
    intro: 'Realiza tu pago por SINPE Móvil y activa tu cuenta Pro en minutos.',
    sinpeLabel: '💳 SINPE Móvil',
    steps: [
      'Abre tu app bancaria y realiza el SINPE al número de arriba',
      'Toma una captura del comprobante',
      'Envíanosla por WhatsApp con tu correo de Flow Estate AI',
    ],
    whatsappButton: 'Enviar Comprobante por WhatsApp',
    whatsappUrl: 'https://wa.me/50683688684?text=Hola!%20Acabo%20de%20realizar%20el%20pago%20SINPE%20para%20activar%20mi%20plan%20Pro%20en%20Flow%20Estate%20AI.%20Te%20env%C3%ADo%20el%20comprobante.',
    footnote: 'Activamos tu cuenta Pro en menos de 24 horas hábiles.',
    backHome: '← Volver a la página principal',
  },
  en: {
    badge: '🚀 PRO PLAN',
    price: '$28',
    priceSubtitle: 'per month · ~₡14,803 CRC',
    intro: 'Pay via SINPE Móvil and activate your Pro account within minutes.',
    sinpeLabel: '💳 SINPE Móvil',
    steps: [
      'Open your banking app and send the SINPE transfer to the number above',
      'Take a screenshot of the receipt',
      'Send it to us on WhatsApp along with your Flow Estate AI email',
    ],
    whatsappButton: 'Send Receipt via WhatsApp',
    whatsappUrl: "https://wa.me/50683688684?text=Hi!%20I%20just%20made%20the%20SINPE%20payment%20to%20activate%20my%20Pro%20plan%20on%20Flow%20Estate%20AI.%20Here%27s%20my%20receipt.",
    footnote: 'We activate your Pro account within 24 business hours.',
    backHome: '← Back to homepage',
  },
} as const;

// Banderas en SVG — los emojis 🇺🇸/🇪🇸 no renderizan en muchos sistemas
// (Windows, algunos Android/Linux), así que usamos SVG propio.
function USFlagIcon() {
  return (
    <svg width="20" height="14" viewBox="0 0 20 14" className="rounded-[2px] flex-shrink-0" aria-hidden="true">
      <rect width="20" height="14" fill="#B22234" />
      <rect y="1.08" width="20" height="1.08" fill="#FFFFFF" />
      <rect y="3.23" width="20" height="1.08" fill="#FFFFFF" />
      <rect y="5.38" width="20" height="1.08" fill="#FFFFFF" />
      <rect y="7.54" width="20" height="1.08" fill="#FFFFFF" />
      <rect y="9.69" width="20" height="1.08" fill="#FFFFFF" />
      <rect y="11.85" width="20" height="1.08" fill="#FFFFFF" />
      <rect width="8" height="7.54" fill="#3C3B6E" />
    </svg>
  );
}

function ESFlagIcon() {
  return (
    <svg width="20" height="14" viewBox="0 0 20 14" className="rounded-[2px] flex-shrink-0" aria-hidden="true">
      <rect width="20" height="14" fill="#AA151B" />
      <rect y="3.5" width="20" height="7" fill="#F1BF00" />
    </svg>
  );
}

function ProPageFallback() {
  return <div className="min-h-screen" style={{ backgroundColor: 'rgb(15 23 42)' }} />;
}

function ProPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [lang, setLang] = useState<Lang>(searchParams.get('lang') === 'en' ? 'en' : 'es');
  const c = COPY[lang];

  const toggleLang = () => {
    const next: Lang = lang === 'es' ? 'en' : 'es';
    setLang(next);
    router.replace(`/pro?lang=${next}`, { scroll: false });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-16" style={{ backgroundColor: 'rgb(15 23 42)' }}>

      {/* Logo + toggle de idioma (logo arriba, bandera debajo, todo centrado) */}
      <div className="mb-8 flex flex-col items-center gap-3">
        <Image src="/logo_header.png" alt="Flow Estate AI" width={140} height={60} className="object-contain brightness-0 invert" />

        <button
          onClick={toggleLang}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all active:scale-95"
          style={{
            backgroundColor: 'rgba(255,255,255,0.10)',
            border: '1px solid rgba(255,255,255,0.18)',
            color: '#FFFFFF',
          }}
          aria-label="Switch language"
        >
          {lang === 'es' ? <USFlagIcon /> : <ESFlagIcon />}
          <span>{lang === 'es' ? 'EN' : 'ES'}</span>
        </button>
      </div>

      {/* Card principal */}
      <div className="w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">

        {/* Header de la card */}
        <div className="px-8 pt-8 pb-6 text-center" style={{ backgroundColor: 'rgb(25 78 203)' }}>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold mb-4" style={{ backgroundColor: '#2563EB', color: '#FFFFFF' }}>
            {c.badge}
          </div>
          <p className="text-4xl font-bold text-white mb-1">{c.price}</p>
          <p className="text-sm" style={{ color: '#93C5FD' }}>{c.priceSubtitle}</p>
        </div>

        {/* Cuerpo de la card */}
        <div className="px-8 py-8" style={{ backgroundColor: '#FFFFFF' }}>

          <p className="text-sm font-semibold mb-6 text-center" style={{ color: '#0F172A' }}>
            {c.intro}
          </p>

          {/* Número SINPE */}
          <div className="rounded-2xl p-5 mb-4 text-center" style={{ backgroundColor: '#F0FDF4', border: '2px solid #BBF7D0' }}>
            <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: '#166534' }}>
              {c.sinpeLabel}
            </p>
            <p className="text-3xl font-bold tracking-widest mb-1" style={{ color: '#15803D' }}>
              8368 8684
            </p>
          </div>

          {/* Pasos */}
          <div className="space-y-3 mb-6">
            {c.steps.map((text, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mt-0.5" style={{ backgroundColor: '#2563EB' }}>
                  {i + 1}
                </div>
                <p className="text-sm" style={{ color: '#0F172A' }}>{text}</p>
              </div>
            ))}
          </div>

          {/* Botón WhatsApp */}
          <a
            href={c.whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-3 w-full py-4 rounded-xl font-bold text-white shadow-lg active:scale-95 transition-transform text-base"
            style={{ backgroundColor: '#25D366' }}
          >
            <svg className="w-5 h-5" fill="white" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            {c.whatsappButton}
          </a>

          <p className="text-xs text-center mt-4 opacity-60" style={{ color: '#0F172A' }}>
            {c.footnote}
          </p>
        </div>
      </div>

      {/* Volver */}
      <div className="mt-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-semibold hover:opacity-70 transition-opacity"
          style={{ color: '#FFFFFF' }}
        >
          {c.backHome}
        </Link>
      </div>

    </div>
  );
}

export default function ProPage() {
  return (
    <Suspense fallback={<ProPageFallback />}>
      <ProPageContent />
    </Suspense>
  );
}