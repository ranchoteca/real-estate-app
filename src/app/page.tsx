'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function LandingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    if (status === 'authenticated') {
      router.push('/dashboard');
    }
  }, [status, router]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F5EAD3' }}>
        <div className="text-5xl animate-pulse">🏠</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5EAD3' }}>
      {/* Sticky Header */}
      <header 
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled ? 'shadow-lg' : ''
        }`}
        style={{ backgroundColor: isScrolled ? '#0F172A' : 'transparent' }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16 gap-4">
            <div className="flex items-center gap-2 min-w-0">
              <Image
                src="/logo_pwa_bg.png"
                alt="Flow Estate AI Logo"
                width={32}
                height={32}
                className="w-6 h-6 sm:w-8 sm:h-8"
                priority
              />
              <span className="text-base sm:text-xl font-bold text-white truncate">
                Flow Estate AI
              </span>
            </div>
            
            <Link
              href="/login"
              className="px-4 sm:px-6 py-2 rounded-xl font-bold text-white shadow-lg active:scale-95 transition-transform text-sm sm:text-base flex-shrink-0"
              style={{ backgroundColor: '#2563EB' }}
            >
              Empezar Gratis
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-24 pb-16 px-4 overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div 
            className="absolute top-20 left-10 w-72 h-72 rounded-full opacity-20 blur-3xl animate-pulse"
            style={{ backgroundColor: '#2563EB' }}
          />
          <div 
            className="absolute bottom-20 right-10 w-96 h-96 rounded-full opacity-20 blur-3xl animate-pulse"
            style={{ backgroundColor: '#2563EB', animationDelay: '1s' }}
          />
        </div>

        <div className="relative max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div 
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 shadow-lg"
            style={{ backgroundColor: '#FFFFFF' }}
          >
            <span className="text-xl">✨</span>
            <span className="font-semibold" style={{ color: '#0F172A' }}>
              Impulsado por IA
            </span>
          </div>

          {/* Main Headline */}
          <h1 
            className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 leading-tight"
            style={{ color: '#0F172A' }}
          >
            Crea Listings Profesionales en{' '}
            <span 
              className="relative inline-block"
              style={{ color: '#2563EB' }}
            >
              60 Segundos
              <svg 
                className="absolute -bottom-2 left-0 w-full" 
                viewBox="0 0 200 12" 
                fill="none"
              >
                <path 
                  d="M2 10C50 2 150 2 198 10" 
                  stroke="#2563EB" 
                  strokeWidth="3" 
                  strokeLinecap="round"
                />
              </svg>
            </span>
          </h1>

          <p 
            className="text-lg sm:text-xl mb-8 max-w-2xl mx-auto opacity-80"
            style={{ color: '#0F172A' }}
          >
            Sube fotos, describe por voz, y nuestra IA genera descripciones profesionales automáticamente.
            <span className="font-semibold"> Sin escribir, sin perder tiempo.</span>
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link
              href="/login"
              className="px-8 py-4 rounded-xl font-bold text-white shadow-xl text-lg active:scale-95 transition-transform"
              style={{ backgroundColor: '#2563EB' }}
            >
              🚀 Empezar Gratis
            </Link>
            <button
              onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
              className="px-8 py-4 rounded-xl font-bold border-2 text-lg active:scale-95 transition-transform"
              style={{ 
                borderColor: '#0F172A',
                color: '#0F172A',
                backgroundColor: '#FFFFFF'
              }}
            >
              Ver Cómo Funciona
            </button>
          </div>

          {/* Social Proof */}
          <div className="flex flex-wrap items-center justify-center gap-6 opacity-70">
            <div className="text-center">
              <div className="text-2xl font-bold" style={{ color: '#0F172A' }}>500+</div>
              <div className="text-sm" style={{ color: '#0F172A' }}>Agentes</div>
            </div>
            <div className="w-px h-8" style={{ backgroundColor: '#0F172A' }} />
            <div className="text-center">
              <div className="text-2xl font-bold" style={{ color: '#0F172A' }}>2,400+</div>
              <div className="text-sm" style={{ color: '#0F172A' }}>Propiedades</div>
            </div>
            <div className="w-px h-8" style={{ backgroundColor: '#0F172A' }} />
            <div className="text-center">
              <div className="text-2xl font-bold" style={{ color: '#0F172A' }}>98%</div>
              <div className="text-sm" style={{ color: '#0F172A' }}>Satisfacción</div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ color: '#0F172A' }}>
              3 Pasos Simples
            </h2>
            <p className="text-lg opacity-70" style={{ color: '#0F172A' }}>
              Tan fácil que tu abuela podría hacerlo
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                step: '1',
                emoji: '📸',
                title: 'Sube Fotos',
                description: 'Selecciónalas de tu galería. Mínimo 2, máximo 10.'
              },
              {
                step: '2',
                emoji: '🎤',
                title: 'Describe por Voz',
                description: 'Graba 30-120 segundos describiendo la propiedad. Sin escribir nada.'
              },
              {
                step: '3',
                emoji: '✨',
                title: 'IA Genera Todo',
                description: 'Nuestra IA crea título, descripción profesional y extrae todos los detalles. Además puedes entrenar a la IA con tus propios campos personalizados.'
              }
            ].map((item, index) => (
              <div
                key={index}
                className="relative rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow"
                style={{ backgroundColor: '#FFFFFF' }}
              >
                <div 
                  className="absolute -top-4 -left-4 w-12 h-12 rounded-full flex items-center justify-center font-bold text-white text-xl shadow-lg"
                  style={{ backgroundColor: '#2563EB' }}
                >
                  {item.step}
                </div>
                <div className="text-5xl mb-4 text-center">{item.emoji}</div>
                <h3 className="text-xl font-bold mb-2 text-center" style={{ color: '#0F172A' }}>
                  {item.title}
                </h3>
                <p className="text-center opacity-80" style={{ color: '#0F172A' }}>
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ color: '#0F172A' }}>
              Todo lo que Necesitas
            </h2>
            <p className="text-lg opacity-70" style={{ color: '#0F172A' }}>
              Herramientas profesionales a precio accesible
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { emoji: '🤖', title: 'IA Avanzada', desc: 'Nuestra IA hará más agradable registrar tus propiedades' },
              { emoji: '📱', title: 'App Móvil', desc: 'PWA nativa para iOS y Android' },
              { emoji: '⚡', title: 'Super Rápido', desc: 'Crea listings en menos de 60 segundos' },
              { emoji: '🔒', title: 'Seguro', desc: 'Tus datos protegidos con encriptación' },
              { emoji: '🌐', title: 'Links Públicos', desc: 'Comparte con un solo click' },
              { emoji: '📊', title: 'Analytics', desc: 'Ve cuántas personas ven tus propiedades' }
            ].map((feature, index) => (
              <div
                key={index}
                className="rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all active:scale-95"
                style={{ backgroundColor: '#FFFFFF' }}
              >
                <div className="text-4xl mb-3">{feature.emoji}</div>
                <h3 className="text-lg font-bold mb-2" style={{ color: '#0F172A' }}>
                  {feature.title}
                </h3>
                <p className="text-sm opacity-80" style={{ color: '#0F172A' }}>
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ color: '#0F172A' }}>
              Agentes Felices 😊
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                name: 'María González',
                role: 'Century 21',
                text: 'Antes tardaba 30 minutos por listing. Ahora son 60 segundos. ¡Increíble!',
                rating: 5
              },
              {
                name: 'Carlos Rodríguez',
                role: 'RE/MAX',
                text: 'La IA escribe mejor que yo. Mis clientes están impresionados.',
                rating: 5
              },
              {
                name: 'Ana Martínez',
                role: 'Independiente',
                text: 'Perfecto para agentes ocupados. Lo uso todos los días.',
                rating: 5
              }
            ].map((testimonial, index) => (
              <div
                key={index}
                className="rounded-2xl p-6 shadow-lg"
                style={{ backgroundColor: '#FFFFFF' }}
              >
                <div className="flex gap-1 mb-3">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <span key={i} className="text-yellow-500">★</span>
                  ))}
                </div>
                <p className="mb-4 italic" style={{ color: '#0F172A' }}>
                  &ldquo;{testimonial.text}&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  <div 
                    className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-white"
                    style={{ backgroundColor: '#2563EB' }}
                  >
                    {testimonial.name.charAt(0)}
                  </div>
                  <div>
                    <div className="font-bold" style={{ color: '#0F172A' }}>
                      {testimonial.name}
                    </div>
                    <div className="text-sm opacity-70" style={{ color: '#0F172A' }}>
                      {testimonial.role}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
       <section className="py-16 px-4" id="pricing">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ color: '#0F172A' }}>
              Planes y Precios
            </h2>
            <p className="text-lg opacity-70" style={{ color: '#0F172A' }}>
              Elige el plan ideal para hacer crecer tu negocio
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              {
                id: 'free',
                name: 'Free',
                price: 0,
                properties: 3,
                period: 'total',
                features: [
                  '3 propiedades totales',
                  'Portfolio público',
                  'Descripción con IA',
                  'Hasta 10 fotos por propiedad',
                  'Exporta tus propiedades a CSV'
                ],
                highlight: false
              },
              {
                id: 'pro',
                name: 'Pro',
                price: 19,
                properties: 30,
                period: 'mes',
                features: [
                  '30 propiedades nuevas/mes',
                  'Todo en Free +',
                  'Sin marca de agua',
                  'Incluye tu logo personalizado',
                  'Soporte prioritario',
                  'Analytics básico'
                ],
                highlight: true
              }
            ].map((plan) => (
              <div
                key={plan.id}
                className={`relative rounded-2xl p-6 shadow-lg ${
                  plan.highlight ? 'border-4 scale-105' : 'border-2'
                }`}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderColor: plan.highlight ? '#2563EB' : '#E5E7EB'
                }}
              >
                {plan.highlight && (
                  <div
                    className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-white text-sm font-bold shadow-lg"
                    style={{ backgroundColor: '#2563EB' }}
                  >
                    MÁS POPULAR
                  </div>
                )}
                <div className="text-center mb-4">
                  <h3 className="text-2xl font-bold mb-2" style={{ color: '#0F172A' }}>
                    {plan.name}
                  </h3>
                  <div className="text-4xl font-bold mb-1" style={{ color: '#2563EB' }}>
                    ${plan.price}
                  </div>
                  {plan.price > 0 && (
                    <div className="text-sm opacity-70" style={{ color: '#0F172A' }}>
                      /{plan.period}
                    </div>
                  )}
                  <div className="text-sm mt-1 opacity-70" style={{ color: '#0F172A' }}>
                    {plan.properties} propiedades {plan.period === 'mes' ? 'por mes' : 'en total'}
                  </div>
                </div>
                <ul className="space-y-2 mb-6">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="text-sm flex gap-2 items-start" style={{ color: '#0F172A' }}>
                      <span style={{ color: '#2563EB' }}>✓</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/login"
                  className="block w-full py-3 rounded-xl font-bold text-center shadow-lg active:scale-95 transition-transform"
                  style={{
                    backgroundColor: plan.highlight ? '#2563EB' : '#FFFFFF',
                    color: plan.highlight ? '#FFFFFF' : '#2563EB',
                    border: plan.highlight ? 'none' : '2px solid #2563EB'
                  }}
                >
                  Empezar Ahora
                </Link>
              </div>
            ))}
          </div>

          <p className="text-center mt-8 text-sm opacity-70" style={{ color: '#0F172A' }}>
            🎁 <strong>3 propiedades gratis</strong> al registrarte • Cancela cuando quieras
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 px-4">
        <div 
          className="max-w-4xl mx-auto rounded-3xl p-12 text-center shadow-2xl"
          style={{ backgroundColor: '#0F172A' }}
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-white">
            ¿Listo para Acelerar tu Negocio?
          </h2>
          <p className="text-lg mb-8 text-white opacity-80">
            Únete a cientos de agentes que ya confían en Flow Estate AI
          </p>
          <Link
            href="/login"
            className="inline-block px-10 py-4 rounded-xl font-bold text-lg shadow-xl active:scale-95 transition-transform"
            style={{ backgroundColor: '#2563EB', color: '#FFFFFF' }}
          >
            🚀 Comenzar Gratis Ahora
          </Link>
          <p className="mt-4 text-sm text-white opacity-60">
            No requiere tarjeta de crédito
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t" style={{ borderColor: '#E5E7EB' }}>
        <div className="max-w-6xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Image
              src="/logo_pwa_bg.png"
              alt="Flow Estate AI Logo"
              width={32}
              height={32}
              className="w-8 h-8"
            />
            <span className="text-xl font-bold" style={{ color: '#0F172A' }}>
              Flow Estate AI
            </span>
          </div>
          <p className="text-sm opacity-60 mb-4" style={{ color: '#0F172A' }}>
            Creando el futuro de los listings inmobiliarios
          </p>
          <div className="flex justify-center gap-6 text-sm" style={{ color: '#0F172A' }}>
            <a href="#" className="hover:opacity-60">Términos</a>
            <a href="#" className="hover:opacity-60">Privacidad</a>
            <a href="#" className="hover:opacity-60">Contacto</a>
          </div>
          <p className="text-xs mt-4 opacity-40" style={{ color: '#0F172A' }}>
            © 2025 Flow Estate AI. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}