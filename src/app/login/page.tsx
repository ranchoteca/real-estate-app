'use client';

import { signIn } from 'next-auth/react';
import { useState, useEffect, Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';

type Lang = 'es' | 'en';

// ─────────────────────────────────────────────────────────────────────────────
// COPY — strings en ES y EN. El idioma viene de ?lang= en la URL (lo manda
// la landing según lo que el usuario tenía seleccionado) y se puede cambiar
// también desde este toggle.
// ─────────────────────────────────────────────────────────────────────────────
const COPY = {
  es: {
    title: 'Ingresa a tu portafolio',
    introPre: 'Únete a',
    badge: '🏠 +50 agentes inmobiliarios',
    introPost: 'que ya automatizan sus ventas con Flow Estate AI.',
    googleButton: 'Continuar con Google',
    freeDisclaimer: 'Gratis para tus primeras 5 propiedades. Sin tarjeta.',
    acceptPre: 'Al continuar, aceptas nuestros',
    terms: 'Términos',
    and: 'y',
    privacy: 'Política de Privacidad',
    backHome: '← Volver a la página principal',
    warningLine1: '⚠️ ¿Problemas para ingresar con Google?',
    warningLine2Pre: 'Toca los 3 puntos (⋮) arriba a la derecha y selecciona',
    warningLine2Link: 'Abrir en el navegador',
  },
  en: {
    title: 'Access your portfolio',
    introPre: 'Join',
    badge: '🏠 +50 real estate agents',
    introPost: 'who are already automating their sales with Flow Estate AI.',
    googleButton: 'Continue with Google',
    freeDisclaimer: 'Free for your first 5 properties. No credit card.',
    acceptPre: 'By continuing, you accept our',
    terms: 'Terms',
    and: 'and',
    privacy: 'Privacy Policy',
    backHome: '← Back to homepage',
    warningLine1: '⚠️ Having trouble signing in with Google?',
    warningLine2Pre: 'Tap the 3 dots (⋮) in the top right and select',
    warningLine2Link: 'Open in browser',
  },
} as const;

const TESTIMONIALS: Record<Lang, { quote: string; name: string; company: string; photo: string }[]> = {
  es: [
    { quote: 'Me ha ayudado a facilitar el trabajo, mis publicaciones y ahorrar tiempo. Una gran herramienta.', name: 'Guadalupe Mancía', company: 'Guadalupe Real Estate', photo: '/testimonial-guadalupe.jpg' },
    { quote: 'Me parece una herramienta magnífica, muy práctica, ágil y técnica. Perfecta para el trabajo inmobiliario.', name: 'Eitel Vallejos', company: 'Pampa Bienes Raíces', photo: '/testimonial-eitel.jpg' },
    { quote: 'Nos ha mejorado el rendimiento, las publicaciones y el ordenamiento. La información es rápida, ordenada y profesional. La recomiendo.', name: 'Jorge Calderón Ortega', company: 'Real Natural CR', photo: '/testimonial-jorge.jpg' },
  ],
  en: [
    { quote: 'It has helped me streamline my work, my publications and save time. A great tool, a great help.', name: 'Guadalupe Mancía', company: 'Guadalupe Real Estate', photo: '/testimonial-guadalupe.jpg' },
    { quote: 'I find it a magnificent tool, very practical, agile and technical. Perfect for real estate work.', name: 'Eitel Vallejos', company: 'Pampa Bienes Raíces', photo: '/testimonial-eitel.jpg' },
    { quote: 'It has improved our performance, publications and organization. The information is fast, organized and professional. I recommend it.', name: 'Jorge Calderón Ortega', company: 'Real Natural CR', photo: '/testimonial-jorge.jpg' },
  ],
};

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

function LoginPageFallback() {
  return <div className="min-h-screen bg-slate-950" />;
}

function LoginPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [lang, setLang] = useState<Lang>(searchParams.get('lang') === 'en' ? 'en' : 'es');
  const [isLoading, setIsLoading] = useState(false);
  const [current, setCurrent] = useState(0);
  const [fading, setFading] = useState(false);
  const [isInAppBrowser, setIsInAppBrowser] = useState(false);

  const c = COPY[lang];
  const list = TESTIMONIALS[lang];
  const t = list[current];

  useEffect(() => {
    const ua = navigator.userAgent || navigator.vendor || (window as any).opera;
    const isFacebookOrInstagram = ua.indexOf('FBAN') > -1 || ua.indexOf('FBAV') > -1 || ua.indexOf('Instagram') > -1;
    if (isFacebookOrInstagram) setIsInAppBrowser(true);

    const interval = setInterval(() => {
      setFading(true);
      setTimeout(() => {
        setCurrent((prev) => (prev + 1) % list.length);
        setFading(false);
      }, 400);
    }, 4000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSignIn = async () => {
    setIsLoading(true);
    try {
      await signIn('google', { callbackUrl: '/dashboard' });
    } catch (error) {
      console.error('Error signing in:', error);
      setIsLoading(false);
    }
  };

  const toggleLang = () => {
    const next: Lang = lang === 'es' ? 'en' : 'es';
    setLang(next);
    router.replace(`/login?lang=${next}`, { scroll: false });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between relative overflow-x-hidden">

      {isInAppBrowser && (
        <div className="absolute top-0 left-0 w-full z-50 bg-amber-500 text-slate-900 px-4 py-3 text-center text-[13px] leading-tight font-bold shadow-lg animate-in slide-in-from-top-4">
          {c.warningLine1} <br />
          {c.warningLine2Pre} <span className="underline">"{c.warningLine2Link}"</span>.
        </div>
      )}

      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-950 to-slate-950 pointer-events-none" />

      <div className="flex flex-col flex-grow p-6">
        {/* Logo + toggle de idioma (logo arriba, bandera debajo, todo centrado) */}
        <header className={`relative z-10 w-full flex flex-col items-center gap-3 pb-4 ${isInAppBrowser ? 'pt-16' : 'pt-10'}`}>
          <Link href="/">
            <Image
              src="/logo_header.png"
              alt="Flow Estate AI"
              width={140}
              height={44}
              className="brightness-0 invert object-contain"
              priority
            />
          </Link>

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
        </header>

        {/* Formulario */}
        <main className="relative z-10 w-full max-w-sm mx-auto flex flex-col justify-center my-auto py-4">

          <div className="text-center mb-8">
            <h1 className="text-2xl font-extrabold tracking-tight mb-3 text-white">
              {c.title}
            </h1>
            <p className="text-sm text-slate-400 px-2 leading-relaxed">
              {c.introPre}{' '}
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold" style={{ backgroundColor: '#2563EB', color: '#FFFFFF' }}>
                {c.badge}
              </span>
              {' '}{c.introPost}
            </p>
          </div>

          <div className="space-y-4">
            <button
              onClick={handleSignIn}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 px-4 py-4 border border-slate-800 rounded-xl bg-slate-900 text-slate-100 font-bold active:scale-[0.98] transition-all disabled:opacity-50 shadow-xl"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-slate-600 border-t-blue-500 rounded-full animate-spin" />
              ) : (
                <>
                  <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span>{c.googleButton}</span>
                </>
              )}
            </button>

            <p className="text-center text-[11px] text-slate-500 leading-normal">
              {c.freeDisclaimer}<br />
              {c.acceptPre}{' '}
              <Link href="/terms" className="underline hover:text-slate-400">{c.terms}</Link>{' '}{c.and}{' '}
              <Link href="/privacy" className="underline hover:text-slate-400">{c.privacy}</Link>.
            </p>
          </div>

          {/* Slider de testimonios */}
          <div
            className="mt-8 p-5 rounded-xl shadow-xl relative border border-slate-700"
            style={{
              backgroundColor: '#0F172A',
              transition: 'opacity 0.4s ease',
              opacity: fading ? 0 : 1,
              minHeight: '140px',
            }}
          >
            <span className="absolute top-1 right-3 text-4xl font-serif pointer-events-none select-none" style={{ color: '#2563EB', opacity: 0.4 }}>"</span>

            <p className="text-sm leading-relaxed mb-4 relative z-10 italic" style={{ color: '#CBD5E1' }}>
              "{t.quote}"
            </p>

            <div className="flex items-center gap-3 border-t pt-3" style={{ borderColor: '#1E293B' }}>
              <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 border-2" style={{ borderColor: '#2563EB' }}>
                <Image
                  src={t.photo}
                  alt={t.name}
                  width={40}
                  height={40}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <p className="font-bold text-xs text-white">{t.name}</p>
                <p className="text-[10px] font-semibold tracking-wider uppercase" style={{ color: '#60A5FA' }}>{t.company}</p>
              </div>
            </div>

            {/* Dots indicadores */}
            <div className="flex justify-center gap-1.5 mt-4">
              {list.map((_, i) => (
                <button
                  key={i}
                  onClick={() => { setFading(true); setTimeout(() => { setCurrent(i); setFading(false); }, 400); }}
                  className="w-1.5 h-1.5 rounded-full transition-all"
                  style={{ backgroundColor: i === current ? '#2563EB' : '#334155' }}
                />
              ))}
            </div>
          </div>

        </main>

        {/* Footer */}
        <footer className="relative z-10 w-full text-center pt-4 pb-2 mt-auto">
          <Link
            href="/"
            className="inline-flex items-center text-xs font-medium text-slate-500 hover:text-slate-300 transition-colors"
          >
            {c.backHome}
          </Link>
        </footer>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginPageFallback />}>
      <LoginPageContent />
    </Suspense>
  );
}