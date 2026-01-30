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

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallButton, setShowInstallButton] = useState(false);

  useEffect(() => {
    // Detectar si es móvil
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    // Handler para el evento beforeinstallprompt
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Solo mostrar en móviles
      if (isMobile) {
        setShowInstallButton(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('PWA instalada');
    }
    
    setDeferredPrompt(null);
    setShowInstallButton(false);
  };

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
        style={{ backgroundColor: '#0F172A' }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16 gap-4">
            <div className="flex items-center gap-2 min-w-0">
              <Image
                src="/logo_header.png"
                alt="Flow Estate AI"
                width={410}
                height={184}
                className="w-[91px] h-[40px] sm:w-[120px] sm:h-auto"
                priority
              />
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
            <span className="font-semibold"> Optimiza tu trabajo en segundos.</span>
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
            
            {/* Botón de Instalación PWA - Solo móviles */}
            {showInstallButton && (
              <button
                onClick={handleInstallClick}
                className="px-8 py-4 rounded-xl font-bold text-white shadow-xl text-lg active:scale-95 transition-transform animate-pulse"
                style={{ backgroundColor: '#10B981' }}
              >
                📱 Instalar App
              </button>
            )}
          </div>

          {/* Key Benefits */}
          <div className="flex flex-wrap items-center justify-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-2xl">⚡</span>
              <div className="text-left">
                <div className="text-sm font-bold" style={{ color: '#0F172A' }}>Súper Rápido</div>
                <div className="text-xs opacity-70" style={{ color: '#0F172A' }}>Listings en 60s</div>
              </div>
            </div>
            <div className="w-px h-10" style={{ backgroundColor: '#0F172A', opacity: 0.2 }} />
            <div className="flex items-center gap-2">
              <span className="text-2xl">🎤</span>
              <div className="text-left">
                <div className="text-sm font-bold" style={{ color: '#0F172A' }}>100% Voz</div>
                <div className="text-xs opacity-70" style={{ color: '#0F172A' }}>Sin escribir</div>
              </div>
            </div>
            <div className="w-px h-10" style={{ backgroundColor: '#0F172A', opacity: 0.2 }} />
            <div className="flex items-center gap-2">
              <span className="text-2xl">🤖</span>
              <div className="text-left">
                <div className="text-sm font-bold" style={{ color: '#0F172A' }}>IA Avanzada</div>
                <div className="text-xs opacity-70" style={{ color: '#0F172A' }}>Textos pro</div>
              </div>
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
              Comienza a organizar tu trabajo hoy
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
              { emoji: '📊', title: 'Métricas Valiosas', desc: 'Controla tus propiedades y su rendimiento' }
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

      {/* Customization Features */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ color: '#0F172A' }}>
              Personaliza Tu Marca
            </h2>
            <p className="text-lg opacity-70" style={{ color: '#0F172A' }}>
              Herramientas profesionales para destacar en el mercado
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: '📇',
                title: 'Tarjeta Digital',
                description: 'Crea tu tarjeta de presentación digital con foto, portada y descripción personalizada. Compártela fácilmente con tus clientes.',
                color: '#6366F1'
              },
              {
                icon: '🎨',
                title: 'Logo Personalizado',
                description: 'Agrega tu logo a todas las fotos de propiedades. Define posición y tamaño para mantener tu identidad de marca.',
                color: '#8B5CF6'
              },
              {
                icon: '💰',
                title: 'Multi-Divisa',
                description: 'Gestiona fácilmente tus propiedades en colones o dólares. Comparte tu portafolio completo con un solo link.',
                color: '#F59E0B'
              }
            ].map((feature, index) => (
              <div
                key={index}
                className="rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all"
                style={{ backgroundColor: '#FFFFFF' }}
              >
                <div 
                  className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl mb-4 shadow-sm"
                  style={{ backgroundColor: `${feature.color}20` }}
                >
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold mb-3" style={{ color: '#0F172A' }}>
                  {feature.title}
                </h3>
                <p className="opacity-80 leading-relaxed" style={{ color: '#0F172A' }}>
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ color: '#0F172A' }}>
              ¿Por Qué Flow Estate AI?
            </h2>
            <p className="text-lg opacity-70" style={{ color: '#0F172A' }}>
              La solución completa para agentes inmobiliarios modernos
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {[
              {
                title: 'Ahorra Tiempo Valioso',
                description: 'Deja de perder horas escribiendo descripciones. Nuestra IA lo hace por ti en segundos, permitiéndote enfocarte en cerrar ventas.',
                icon: '⏱️'
              },
              {
                title: 'Textos Profesionales',
                description: 'La IA genera descripciones persuasivas y profesionales que destacan las mejores características de cada propiedad.',
                icon: '✍️'
              },
              {
                title: 'Fácil de Usar',
                description: 'Interfaz intuitiva diseñada para agentes ocupados. Si sabes usar WhatsApp, sabes usar Flow Estate AI.',
                icon: '👌'
              },
              {
                title: 'Portfolio Profesional',
                description: 'Cada agente obtiene su portafolio público personalizado para compartir con clientes y redes sociales.',
                icon: '🎯'
              }
            ].map((item, index) => (
              <div
                key={index}
                className="rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all"
                style={{ backgroundColor: '#FFFFFF' }}
              >
                <div className="flex items-start gap-4">
                  <div className="text-4xl flex-shrink-0">{item.icon}</div>
                  <div>
                    <h3 className="text-xl font-bold mb-2" style={{ color: '#0F172A' }}>
                      {item.title}
                    </h3>
                    <p className="opacity-80" style={{ color: '#0F172A' }}>
                      {item.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Commented Pricing Section
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
      */}

      {/* Final CTA */}
      <section className="py-16 px-4">
        <div 
          className="max-w-4xl mx-auto rounded-3xl p-12 text-center shadow-2xl"
          style={{ backgroundColor: '#0F172A' }}
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-white">
            ¿Listo para Transformar tu Forma de Trabajar?
          </h2>
          <p className="text-lg mb-8 text-white opacity-80">
            Únete a la nueva generación de agentes inmobiliarios que trabajan más inteligente
          </p>
          <Link
            href="/login"
            className="inline-block px-10 py-4 rounded-xl font-bold text-lg shadow-xl active:scale-95 transition-transform"
            style={{ backgroundColor: '#2563EB', color: '#FFFFFF' }}
          >
            🚀 Comenzar Gratis Ahora
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t" style={{ borderColor: '#E5E7EB' }}>
        <div className="max-w-6xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Image
              src="/logo_footer.png"
              alt="Flow Estate AI"
              width={410}
              height={184}
              className="w-[91px] h-[40px] sm:w-[120px] sm:h-auto"
              priority
            />
          </div>
          <p className="text-sm opacity-60 mb-4" style={{ color: '#0F172A' }}>
            Creando el futuro de los listings inmobiliarios
          </p>
          <div className="flex justify-center gap-6 text-sm" style={{ color: '#0F172A' }}>
            <Link href="/terms" className="hover:opacity-60 transition-opacity">
              Términos y Condiciones
            </Link>
            <Link href="/privacy" className="hover:opacity-60 transition-opacity">
              Política de Privacidad
            </Link>
            <a href="mailto:support@flowestateai.com" className="hover:opacity-60 transition-opacity">
              Contacto
            </a>
          </div>
          <p className="text-xs mt-4 opacity-40" style={{ color: '#0F172A' }}>
            © 2025 Flow Estate AI. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}