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
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
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
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'shadow-lg' : ''}`}
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
          {/* Badge móvil */}
          <div 
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 shadow-lg"
            style={{ backgroundColor: '#FFFFFF' }}
          >
            <span className="text-xl">📱</span>
            <span className="font-semibold" style={{ color: '#0F172A' }}>
              Diseñada para tu celular
            </span>
          </div>

          {/* Main Headline */}
          <h1 
            className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 leading-tight"
            style={{ color: '#0F172A' }}
          >
            Deja de Enviar Fotos Sueltas por{' '}
            <span className="relative inline-block" style={{ color: '#2563EB' }}>
              WhatsApp
              <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 200 12" fill="none">
                <path d="M2 10C50 2 150 2 198 10" stroke="#2563EB" strokeWidth="3" strokeLinecap="round"/>
              </svg>
            </span>
          </h1>

          <p 
            className="text-lg sm:text-xl mb-8 max-w-2xl mx-auto opacity-80"
            style={{ color: '#0F172A' }}
          >
            Crea tu portafolio digital profesional sin pagar sitio web. 
            <span className="font-semibold"> Mientras tu describes la propiedad usando tu voz, nosotros nos encargamos del trabajo difícil.</span>
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Link
              href="/login"
              className="px-8 py-4 rounded-xl font-bold text-white shadow-xl text-lg active:scale-95 transition-transform"
              style={{ backgroundColor: '#2563EB' }}
            >
              🚀 Probar Gratis
            </Link>
            <button
              onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
              className="px-8 py-4 rounded-xl font-bold border-2 text-lg active:scale-95 transition-transform"
              style={{ borderColor: '#0F172A', color: '#0F172A', backgroundColor: '#FFFFFF' }}
            >
              Ver Cómo Funciona
            </button>
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

          {/* Banner móvil */}
          <div
            className="inline-flex items-center gap-3 px-5 py-3 rounded-2xl mb-10 shadow-md"
            style={{ backgroundColor: '#0F172A' }}
          >
            <span className="text-2xl">📲</span>
            <p className="text-sm font-semibold text-left" style={{ color: '#FFFFFF' }}>
              Úsala desde el navegador de tu celular o instálala como app.
              <span style={{ color: '#93C5FD' }}> No requiere descarga en la tienda.</span>
            </p>
          </div>

          {/* Mockup de celular con pantallas de la app */}
          <div className="flex justify-center mb-12">
            <div className="relative">
              {/* Teléfono principal */}
              <div
                className="relative rounded-[36px] shadow-2xl overflow-hidden border-4"
                style={{
                  width: '200px',
                  height: '400px',
                  backgroundColor: '#0F172A',
                  borderColor: '#1E293B',
                }}
              >
                {/* Notch */}
                <div
                  className="absolute top-3 left-1/2 -translate-x-1/2 rounded-full z-10"
                  style={{ width: '60px', height: '10px', backgroundColor: '#0F172A' }}
                />
                {/* Pantalla */}
                <div
                  className="absolute inset-1 rounded-[30px] overflow-hidden"
                  style={{ backgroundColor: '#F5EAD3' }}
                >
                  {/* Header simulado */}
                  <div
                    className="px-3 py-2 flex items-center justify-between"
                    style={{ backgroundColor: '#0F172A' }}
                  >
                    <span className="text-white text-[9px] font-bold">Flow Estate AI</span>
                    <span className="text-[9px]">⭐</span>
                  </div>
                  {/* Contenido simulado */}
                  <div className="px-2 pt-2 space-y-2">
                    {/* Card propiedad 1 */}
                    <div className="rounded-xl overflow-hidden shadow-md" style={{ backgroundColor: '#FFFFFF' }}>
                      <div className="h-16 flex items-center justify-center text-2xl" style={{ backgroundColor: '#DBEAFE' }}>🏠</div>
                      <div className="p-1.5">
                        <div className="h-2 rounded-full mb-1" style={{ backgroundColor: '#0F172A', width: '80%' }} />
                        <div className="h-1.5 rounded-full mb-1" style={{ backgroundColor: '#94A3B8', width: '60%' }} />
                        <div className="flex gap-1">
                          <div className="h-4 rounded-full px-1 flex items-center text-[6px] font-bold text-white" style={{ backgroundColor: '#2563EB' }}>Pro</div>
                          <div className="h-1.5 rounded-full mt-1" style={{ backgroundColor: '#BBF7D0', width: '30%' }} />
                        </div>
                      </div>
                    </div>
                    {/* Card propiedad 2 */}
                    <div className="rounded-xl overflow-hidden shadow-md" style={{ backgroundColor: '#FFFFFF' }}>
                      <div className="h-16 flex items-center justify-center text-2xl" style={{ backgroundColor: '#D1FAE5' }}>🏢</div>
                      <div className="p-1.5">
                        <div className="h-2 rounded-full mb-1" style={{ backgroundColor: '#0F172A', width: '70%' }} />
                        <div className="h-1.5 rounded-full" style={{ backgroundColor: '#94A3B8', width: '50%' }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Teléfono pequeño flotando a la derecha */}
              <div
                className="absolute -right-16 top-16 rounded-[28px] shadow-xl border-4"
                style={{
                  width: '120px',
                  height: '240px',
                  backgroundColor: '#0F172A',
                  borderColor: '#1E293B',
                }}
              >
                <div
                  className="absolute inset-1 rounded-[22px] overflow-hidden"
                  style={{ backgroundColor: '#FFFFFF' }}
                >
                  <div className="px-2 py-1.5 flex items-center gap-1" style={{ backgroundColor: '#F0FDF4' }}>
                    <span className="text-[8px]">🎤</span>
                    <span className="text-[7px] font-bold" style={{ color: '#15803D' }}>Grabando...</span>
                  </div>
                  <div className="p-2 space-y-1.5">
                    <div className="h-1.5 rounded-full" style={{ backgroundColor: '#E2E8F0', width: '90%' }} />
                    <div className="h-1.5 rounded-full" style={{ backgroundColor: '#E2E8F0', width: '75%' }} />
                    <div className="h-1.5 rounded-full" style={{ backgroundColor: '#E2E8F0', width: '85%' }} />
                    <div className="h-1.5 rounded-full" style={{ backgroundColor: '#E2E8F0', width: '60%' }} />
                    <div className="mt-2 h-6 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#2563EB' }}>
                      <span className="text-white text-[7px] font-bold">Generar con IA ✨</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Badge flotante */}
              <div
                className="absolute -left-12 bottom-16 rounded-xl shadow-xl px-2 py-1.5"
                style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0' }}
              >
                <p className="text-[9px] font-bold" style={{ color: '#15803D' }}>✅ PDF generado</p>
                <p className="text-[8px]" style={{ color: '#64748B' }}>Listo para compartir</p>
              </div>
            </div>
          </div>

          {/* Key Benefits */}
          <div className="flex flex-wrap items-center justify-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🎤</span>
              <div className="text-left">
                <div className="text-sm font-bold" style={{ color: '#0F172A' }}>Sin Escribir</div>
                <div className="text-xs opacity-70" style={{ color: '#0F172A' }}>Solo habla</div>
              </div>
            </div>
            <div className="w-px h-10" style={{ backgroundColor: '#0F172A', opacity: 0.2 }} />
            <div className="flex items-center gap-2">
              <span className="text-2xl">📄</span>
              <div className="text-left">
                <div className="text-sm font-bold" style={{ color: '#0F172A' }}>PDFs con Logo</div>
                <div className="text-xs opacity-70" style={{ color: '#0F172A' }}>Tu marca</div>
              </div>
            </div>
            <div className="w-px h-10" style={{ backgroundColor: '#0F172A', opacity: 0.2 }} />
            <div className="flex items-center gap-2">
              <span className="text-2xl">💼</span>
              <div className="text-left">
                <div className="text-sm font-bold" style={{ color: '#0F172A' }}>Verse Pro</div>
                <div className="text-xs opacity-70" style={{ color: '#0F172A' }}>Sin sitio web</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sección: Funciona en tu celular */}
      <section className="py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <div
            className="rounded-3xl p-8 shadow-xl"
            style={{ backgroundColor: '#0F172A' }}
          >
            <div className="text-center mb-6">
              <span className="text-4xl">📱</span>
              <h2 className="text-2xl font-bold mt-3 text-white">
                Hecha para usarse en tu celular
              </h2>
              <p className="text-sm mt-2 opacity-70 text-white">
                No necesitas laptop ni computadora. Todo desde tu teléfono.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-4 rounded-2xl p-4" style={{ backgroundColor: '#1E293B' }}>
                <span className="text-2xl flex-shrink-0">🌐</span>
                <div>
                  <p className="font-bold text-white text-sm">Desde el navegador</p>
                  <p className="text-xs opacity-70 text-white mt-0.5">
                    Abre <span style={{ color: '#93C5FD' }}>flowestateai.com</span> en Chrome o Safari de tu celular y úsala como cualquier app. Sin descargar nada.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 rounded-2xl p-4" style={{ backgroundColor: '#1E293B' }}>
                <span className="text-2xl flex-shrink-0">⬇️</span>
                <div>
                  <p className="font-bold text-white text-sm">O instálala en tu pantalla de inicio</p>
                  <p className="text-xs opacity-70 text-white mt-0.5">
                    En Chrome toca los tres puntos → "Agregar a pantalla de inicio". En Safari toca compartir → "Añadir a inicio". Queda igual que una app de la tienda.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 rounded-2xl p-4" style={{ backgroundColor: '#1E293B' }}>
                <span className="text-2xl flex-shrink-0">💻</span>
                <div>
                  <p className="font-bold text-white text-sm">¿Y desde computadora?</p>
                  <p className="text-xs opacity-70 text-white mt-0.5">
                    También funciona, pero está optimizada para móvil. La experiencia más cómoda es desde tu celular.
                  </p>
                </div>
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
              Cómo Funciona
            </h2>
            <p className="text-lg opacity-70" style={{ color: '#0F172A' }}>
              Tan fácil como enviar un mensaje de voz
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                step: '1',
                emoji: '📸',
                title: 'Sube Fotos',
                description: 'Selecciona las fotos de la propiedad desde tu celular. Entre 2 y 10 fotos.'
              },
              {
                step: '2',
                emoji: '🎤',
                title: 'Graba tu Voz',
                description: 'Describe la propiedad hablando 30-120 segundos. Como si le explicaras a un cliente.'
              },
              {
                step: '3',
                emoji: '✅',
                title: 'Listo para Compartir',
                description: 'Recibe la descripción profesional lista. Comparte PDF o link de tu portafolio.'
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

      {/* Problem/Solution */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ color: '#0F172A' }}>
              ¿Te Suena Familiar?
            </h2>
            <p className="text-lg opacity-70" style={{ color: '#0F172A' }}>
              Problemas que todos los agentes tienen
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-12">
            {[
              {
                problem: '❌ Envías 10 fotos sueltas por WhatsApp a cada cliente',
                solution: '✅ Envía 1 PDF profesional con tu logo'
              },
              {
                problem: '❌ No tienes sitio web porque es caro',
                solution: '✅ Tu portafolio digital sin pagar sitio web'
              },
              {
                problem: '❌ Pierdes tiempo escribiendo descripciones',
                solution: '✅ Solo hablas, nosotros escribimos'
              },
              {
                problem: '❌ Tus propiedades en Facebook se pierden',
                solution: '✅ Todo organizado en un solo lugar'
              }
            ].map((item, index) => (
              <div
                key={index}
                className="rounded-2xl p-6 shadow-lg"
                style={{ backgroundColor: '#FFFFFF' }}
              >
                <div className="mb-3 text-sm opacity-70" style={{ color: '#0F172A' }}>
                  {item.problem}
                </div>
                <div className="font-semibold" style={{ color: '#2563EB' }}>
                  {item.solution}
                </div>
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
              Lo Que Obtienes
            </h2>
            <p className="text-lg opacity-70" style={{ color: '#0F172A' }}>
              Todo lo necesario para verte profesional
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { emoji: '📄', title: 'PDFs Profesionales', desc: 'Genera PDFs con marca de agua en tus fotos para enviar a clientes' },
              { emoji: '🏷️', title: 'Tu Logo en Fotos', desc: 'Agrega tu logo a todas las fotos automáticamente' },
              { emoji: '📇', title: 'Tarjeta Digital', desc: 'Comparte tu información de contacto profesionalmente' },
              { emoji: '🌐', title: 'Portafolio Público', desc: 'Link para compartir todas tus propiedades' },
              { emoji: '💵', title: 'Colones y Dólares', desc: 'Maneja precios en ambas monedas fácilmente' },
              { emoji: '🗺️', title: 'Mapa Integrado', desc: 'Ubicación exacta con Google Maps' }
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

      {/* Bilingual Features */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ color: '#0F172A' }}>
              Para el Mercado Internacional
            </h2>
            <p className="text-lg opacity-70" style={{ color: '#0F172A' }}>
              Atrae clientes extranjeros sin esfuerzo
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {[
              {
                icon: '🌎',
                title: 'Portafolio Bilingüe',
                description: 'Tus propiedades en español e inglés. Perfecto para turistas y extranjeros interesados en Costa Rica.',
                color: '#10B981'
              },
              {
                icon: '📇',
                title: 'Tarjeta en 2 Idiomas',
                description: 'Tu tarjeta digital se adapta al idioma del cliente automáticamente.',
                color: '#F59E0B'
              }
            ].map((feature, index) => (
              <div
                key={index}
                className="rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all"
                style={{ backgroundColor: '#FFFFFF' }}
              >
                <div 
                  className="w-16 h-16 rounded-xl flex items-center justify-center text-4xl mb-4 shadow-sm"
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
              Diseñado específicamente para agentes independientes
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {[
              {
                title: 'Ahorra Horas de Trabajo',
                description: 'No más escribir descripciones largas. Habla 1 minuto y recibe texto profesional listo para compartir.',
                icon: '⏱️'
              },
              {
                title: 'Verse Más Profesional',
                description: 'PDFs con tu logo, portafolio organizado, tarjeta digital. Tus clientes verán que eres serio.',
                icon: '💼'
              },
              {
                title: 'Fácil de Usar',
                description: 'Si usas WhatsApp, puedes usar Flow Estate. No necesitas ser experto en tecnología.',
                icon: '👍'
              },
              {
                title: 'Sin Sitio Web Caro',
                description: 'Obtén tu portafolio profesional sin pagar miles en desarrollo web.',
                icon: '💰'
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

      {/* Final CTA */}
      <section className="py-16 px-4">
        <div 
          className="max-w-4xl mx-auto rounded-3xl p-12 text-center shadow-2xl"
          style={{ backgroundColor: '#0F172A' }}
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-white">
            ¿Listo Para Verse Más Profesional?
          </h2>
          <p className="text-lg mb-2 text-white opacity-80">
            Comienza gratis hoy. Sin tarjeta de crédito.
          </p>
          <p className="text-sm mb-8 opacity-50 text-white">
            📱 Abre esta página desde tu celular para la mejor experiencia
          </p>
          <Link
            href="/login"
            className="inline-block px-10 py-4 rounded-xl font-bold text-lg shadow-xl active:scale-95 transition-transform"
            style={{ backgroundColor: '#2563EB', color: '#FFFFFF' }}
          >
            🚀 Probar Gratis Ahora
          </Link>
          <p className="text-sm mt-4 text-white opacity-60">
            Empieza en menos de 2 minutos
          </p>
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
            Herramientas digitales para agentes independientes
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
            © 2026 Flow Estate AI. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}