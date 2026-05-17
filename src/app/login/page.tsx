'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = async () => {
    setIsLoading(true);
    try {
      await signIn('google', { callbackUrl: '/dashboard' });
    } catch (error) {
      console.error('Error signing in:', error);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-6 font-sans relative overflow-x-hidden">
      
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-950 to-slate-950 pointer-events-none" />

      {/* 1. TOP: Logo — más cerca del centro */}
      <header className="relative z-10 w-full flex justify-center pt-10 pb-4">
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
      </header>

      {/* 2. CENTER: Formulario */}
      <main className="relative z-10 w-full max-w-sm mx-auto flex flex-col justify-center my-auto py-4">
        
        <div className="text-center mb-8">
          <h1 className="text-2xl font-extrabold tracking-tight mb-3 text-white">
            Ingresa a tu portafolio
          </h1>
          <p className="text-sm text-slate-400 px-2 leading-relaxed">
            Únete a{' '}
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold" style={{ backgroundColor: '#2563EB', color: '#FFFFFF' }}>
              🏠 +50 agentes inmobiliarios
            </span>
            {' '}que ya automatizan sus ventas con Flow Estate AI.
          </p>
        </div>

        <div className="space-y-4">
          <button
            onClick={handleSignIn}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 px-4 py-4 border border-slate-800 rounded-xl bg-slate-900 text-slate-100 font-bold hover:bg-slate-850 active:scale-[0.98] transition-all disabled:opacity-50 shadow-xl"
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
                <span>Continuar con Google</span>
              </>
            )}
          </button>

          <p className="text-center text-[11px] text-slate-500 leading-normal">
            Gratis para tus primeras 5 propiedades. Sin tarjeta.<br/>
            Al continuar, aceptas nuestros{' '}
            <Link href="/terms" className="underline hover:text-slate-400">Términos</Link> y{' '}
            <Link href="/privacy" className="underline hover:text-slate-400">Política de Privacidad</Link>.
          </p>
        </div>

        {/* Testimonio — negro con foto real */}
        <div className="mt-8 p-5 rounded-xl shadow-xl relative border border-slate-700" style={{ backgroundColor: '#0F172A' }}>
          <span className="absolute top-1 right-3 text-4xl font-serif pointer-events-none select-none" style={{ color: '#2563EB', opacity: 0.4 }}>"</span>
          
          <p className="text-sm leading-relaxed mb-4 relative z-10 italic" style={{ color: '#CBD5E1' }}>
            "Me ha ayudado a facilitar el trabajo, mis publicaciones y ahorrar tiempo. Una gran herramienta."
          </p>
          
          <div className="flex items-center gap-3 border-t pt-3" style={{ borderColor: '#1E293B' }}>
            <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 border-2" style={{ borderColor: '#2563EB' }}>
              <Image
                src="/testimonial-guadalupe.jpg"
                alt="Guadalupe Mancía"
                width={40}
                height={40}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <p className="font-bold text-xs text-white">Guadalupe Mancía</p>
              <p className="text-[10px] font-semibold tracking-wider uppercase" style={{ color: '#60A5FA' }}>Guadalupe Real Estate</p>
            </div>
          </div>
        </div>

      </main>

      {/* 4. BOTTOM */}
      <footer className="relative z-10 w-full text-center pt-4 pb-2">
        <Link
          href="/"
          className="inline-flex items-center text-xs font-medium text-slate-500 hover:text-slate-300 transition-colors"
        >
          ← Volver a la página principal
        </Link>
      </footer>

    </div>
  );
}