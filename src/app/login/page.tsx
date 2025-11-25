'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';
import Image from 'next/image';

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
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#F5EAD3' }}>
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute top-20 -left-20 w-96 h-96 rounded-full opacity-20 blur-3xl animate-pulse"
          style={{ backgroundColor: '#2563EB' }}
        />
        <div 
          className="absolute bottom-20 -right-20 w-96 h-96 rounded-full opacity-20 blur-3xl animate-pulse"
          style={{ backgroundColor: '#2563EB', animationDelay: '1s' }}
        />
      </div>

      {/* Content */}
      <div className="relative flex-1 flex flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          {/* Logo & Hero */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl shadow-2xl mb-6 animate-bounce"
                 style={{ backgroundColor: '#FFFFFF' }}>
              <Image
                src="/favicon-32x32.png"
                alt="Flow Estate AI"
                width={32}
                height={32}
                className="w-12 h-12"
                priority
              />
            </div>
            
            <h1 className="text-4xl font-bold mb-3" style={{ color: '#0F172A' }}>
              Flow Estate AI
            </h1>
            
            <p className="text-lg opacity-80" style={{ color: '#0F172A' }}>
              Crea listings profesionales en 60 segundos
            </p>
          </div>

          {/* Login Card */}
          <div 
            className="rounded-3xl p-8 shadow-2xl"
            style={{ backgroundColor: '#FFFFFF' }}
          >
            <h2 className="text-2xl font-bold text-center mb-6" style={{ color: '#0F172A' }}>
              Bienvenido
            </h2>

            {/* Benefits */}
            <div className="space-y-3 mb-6">
              {[
                { emoji: '✨', text: 'Genera descripciones con IA' },
                { emoji: '📸', text: 'Sube fotos desde tu móvil' },
                { emoji: '⚡', text: 'Publica en menos de 1 minuto' },
                { emoji: '🌐', text: 'Tu portafolio profesional público' }
              ].map((benefit, index) => (
                <div key={index} className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: '#F5EAD3' }}>
                  <span className="text-2xl">{benefit.emoji}</span>
                  <span className="font-semibold" style={{ color: '#0F172A' }}>
                    {benefit.text}
                  </span>
                </div>
              ))}
            </div>

            {/* Google Sign In Button */}
            <button
              onClick={handleSignIn}
              disabled={isLoading}
              className="w-full py-4 rounded-xl font-bold shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
              style={{ 
                backgroundColor: '#FFFFFF',
                color: '#0F172A',
                border: '2px solid #E5E7EB'
              }}
            >
              {isLoading ? (
                <>
                  <div className="w-6 h-6 border-3 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
                  <span>Cargando...</span>
                </>
              ) : (
                <>
                  <svg className="w-6 h-6" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span>Continuar con Google</span>
                </>
              )}
            </button>

            {/* Terms */}
            <p className="text-xs text-center mt-6 opacity-60" style={{ color: '#0F172A' }}>
              Al continuar, aceptas nuestros{' '}
              <a href="#" className="underline hover:opacity-80">Términos de Servicio</a>
              {' '}y{' '}
              <a href="#" className="underline hover:opacity-80">Política de Privacidad</a>
            </p>
          </div>

          {/* Footer CTA */}
          <div className="text-center mt-6">
            <button
              onClick={() => window.location.href = '/'}
              className="text-sm font-semibold hover:opacity-70 transition-opacity"
              style={{ color: '#2563EB' }}
            >
              ← Volver al inicio
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Features */}
      <div className="relative py-8 px-4 border-t" style={{ borderColor: '#E5E7EB', backgroundColor: 'rgba(255,255,255,0.5)' }}>
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-wrap justify-center gap-8 text-center">
            <div>
              <div className="text-3xl mb-2">
                🤖
              </div>
              <div className="text-sm font-semibold mb-1" style={{ color: '#0F172A' }}>
                IA Avanzada
              </div>
              <div className="text-xs opacity-70" style={{ color: '#0F172A' }}>
                Genera textos profesionales
              </div>
            </div>
            <div>
              <div className="text-3xl mb-2">
                📱
              </div>
              <div className="text-sm font-semibold mb-1" style={{ color: '#0F172A' }}>
                App Móvil
              </div>
              <div className="text-xs opacity-70" style={{ color: '#0F172A' }}>
                Funciona en cualquier dispositivo
              </div>
            </div>
            <div>
              <div className="text-3xl mb-2">
                🔒
              </div>
              <div className="text-sm font-semibold mb-1" style={{ color: '#0F172A' }}>
                100% Seguro
              </div>
              <div className="text-xs opacity-70" style={{ color: '#0F172A' }}>
                Tus datos protegidos
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}