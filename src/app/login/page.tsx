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
    <div className="min-h-screen bg-slate-50 flex">
      {/* Lado Izquierdo: Formulario de Login (Limpio y directo) */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 sm:px-16 xl:px-24">
        <div className="max-w-md w-full mx-auto">
          {/* Logo */}
          <div className="mb-10">
            <Link href="/">
              <Image src="/logo_header.png" alt="Flow Estate AI" width={150} height={60} priority />
            </Link>
          </div>

          <h1 className="text-3xl font-bold text-slate-900 mb-2">Bienvenido a tu portafolio</h1>
          <p className="text-slate-600 mb-8">Únete a los agentes que ya automatizan su trabajo.</p>

          {/* Botón de Google Mejorado */}
          <button
            onClick={handleSignIn}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-slate-300 rounded-xl bg-white text-slate-700 font-semibold hover:bg-slate-50 transition-colors disabled:opacity-50 shadow-sm"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin" />
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continuar con Google
              </>
            )}
          </button>

          <p className="mt-6 text-center text-sm text-slate-500">
            Gratis para tus primeras 5 propiedades. <br/> Sin tarjeta de crédito.
          </p>
        </div>
      </div>

      {/* Lado Derecho: Propuesta de Valor (Oculto en móviles, visible en Desktop) */}
      <div className="hidden lg:flex w-1/2 bg-slate-900 flex-col justify-between p-12 relative overflow-hidden">
        {/* Fondo decorativo sutil */}
        <div className="absolute inset-0 bg-[url('/pattern.svg')] opacity-10"></div>
        
        <div className="relative z-10 mt-12">
          <h2 className="text-4xl font-bold text-white mb-6 leading-tight">
            Todo lo que necesitas para vender más rápido.
          </h2>
          <ul className="space-y-4 text-slate-300 text-lg">
            <li className="flex items-center gap-3"><span className="text-blue-500">✓</span> PDFs generados con tu marca</li>
            <li className="flex items-center gap-3"><span className="text-blue-500">✓</span> Descripciones creadas con Inteligencia Artificial</li>
            <li className="flex items-center gap-3"><span className="text-blue-500">✓</span> Portafolio web público y optimizado</li>
          </ul>
        </div>

        {/* Testimonio */}
        <div className="relative z-10 bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/20">
          <p className="text-slate-200 italic mb-4">"Me ha ayudado a facilitar el trabajo, mis publicaciones y ahorrar tiempo. Una gran herramienta."</p>
          <div className="flex items-center gap-3">
            <Image src="/testimonial-guadalupe.jpg" alt="Guadalupe Mancía" width={40} height={40} className="rounded-full" />
            <div>
              <p className="text-white font-semibold text-sm">Guadalupe Mancía</p>
              <p className="text-blue-300 text-xs">Guadalupe Real Estate</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}