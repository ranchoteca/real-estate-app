'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import MuxPlayer from '@mux/mux-player-react';

export default function LandingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isScrolled, setIsScrolled] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallButton, setShowInstallButton] = useState(false);
  const videoCrearRef = useRef<any>(null);

  useEffect(() => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (isMobile) setShowInstallButton(true);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') console.log('PWA instalada');
    setDeferredPrompt(null);
    setShowInstallButton(false);
  };

  useEffect(() => {
    if (status === 'authenticated') router.push('/dashboard');
  }, [status, router]);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleVerDemo = () => {
    const section = document.getElementById('video-crear-propiedad');
    if (section) {
      section.scrollIntoView({ behavior: 'smooth' });
      setTimeout(() => {
        if (videoCrearRef.current) {
          videoCrearRef.current.play().catch(() => {});
        }
      }, 800);
    }
  };

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
          <div className="flex items-center h-16">
            <Image
              src="/logo_header.png"
              alt="FlowEstateAI"
              width={410}
              height={184}
              className="w-[91px] h-[40px] sm:w-[120px] sm:h-auto"
              priority
            />
          </div>
        </div>
      </header>

      {/* Hero Section — degradado azul */}
      <section
        className="relative pt-32 pb-24 px-4 overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #1E3A8A 0%, #1D4ED8 40%, #2563EB 70%, #3B82F6 100%)',
        }}
      >
        {/* Círculos decorativos de fondo */}
        <div
          className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-10 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #FFFFFF 0%, transparent 70%)', transform: 'translate(30%, -30%)' }}
        />
        <div
          className="absolute bottom-0 left-0 w-72 h-72 rounded-full opacity-10 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #FFFFFF 0%, transparent 70%)', transform: 'translate(-30%, 30%)' }}
        />

        <div className="relative max-w-4xl mx-auto text-center">

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold mb-6 tracking-tight text-white leading-tight">
            Sabemos lo complicado que es mantener tus propiedades ordenadas y siempre a la mano
          </h1>

          <p className="text-lg sm:text-xl mb-6 max-w-3xl mx-auto leading-relaxed" style={{ color: '#BFDBFE' }}>
            Olvídate de propiedades guardadas en varios archivos de Excel o de tediosos registros manuales en cuadernos que solo complican tu trabajo.
          </p>

          <p className="text-base sm:text-lg mb-10 max-w-3xl mx-auto leading-relaxed" style={{ color: '#DBEAFE' }}>
            Con <span className="font-bold text-white">FlowEstateAI</span> tienes tus propiedades al alcance de la mano. Te verás más profesional y actualizado con herramientas intuitivas y ágiles. Y si necesitas ayuda, nuestro canal de WhatsApp está siempre disponible para ti.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10">
            <Link
              href="/login"
              className="px-8 py-4 rounded-xl font-bold text-lg shadow-xl transition-all active:scale-95"
              style={{ backgroundColor: '#FFFFFF', color: '#1D4ED8' }}
            >
              🚀 Comenzar Gratis
            </Link>
            <button
              onClick={handleVerDemo}
              className="px-8 py-4 rounded-xl font-semibold text-white border-2 transition-all text-lg"
              style={{ borderColor: 'rgba(255,255,255,0.5)', backgroundColor: 'rgba(255,255,255,0.1)' }}
            >
              Ver demostración
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

          <p className="text-sm font-medium uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Agentes en Costa Rica ya confían en nosotros
          </p>
        </div>
      </section>

      {/* Video — Crear propiedad */}
      <section id="video-crear-propiedad" className="py-16 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 uppercase" style={{ color: '#0F172A' }}>
              Crea una propiedad en segundos
            </h2>
            <p className="text-lg opacity-70 max-w-2xl mx-auto" style={{ color: '#0F172A' }}>
              Mira lo fácil que es publicar una propiedad con tu voz desde el celular.
            </p>
          </div>
          <div className="rounded-2xl overflow-hidden shadow-2xl mx-auto" style={{ maxWidth: '360px' }}>
            <MuxPlayer
              ref={videoCrearRef}
              playbackId="9i9RHXUIHHIqYqRLCykCIpQ727VBpE7lO9Kzxic02Pi8"
              autoPlay={false}
              muted={false}
              style={{ width: '100%', aspectRatio: '9/16' }}
            />
          </div>
        </div>
      </section>

      {/* App en tu celular — screenshots */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 uppercase" style={{ color: '#0F172A' }}>
              La productividad en la palma de tu mano
            </h2>
            <p className="text-lg opacity-70 max-w-2xl mx-auto" style={{ color: '#0F172A' }}>
              Trabaja desde cualquier lugar. FlowEstateAI está diseñada para que gestiones tus propiedades directamente desde tu celular, sin complicaciones.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="rounded-2xl overflow-hidden shadow-xl">
              <Image src="/app-dashboard.jpg" alt="Dashboard de FlowEstateAI" width={300} height={600} className="w-full h-auto object-cover" />
            </div>
            <div className="rounded-2xl overflow-hidden shadow-xl mt-6">
              <Image src="/app-property.jpg" alt="Propiedad en FlowEstateAI" width={300} height={600} className="w-full h-auto object-cover" />
            </div>
            <div className="rounded-2xl overflow-hidden shadow-xl">
              <Image src="/app-card.jpg" alt="Tarjeta digital FlowEstateAI" width={300} height={600} className="w-full h-auto object-cover" />
            </div>
          </div>

          <ul className="grid sm:grid-cols-3 gap-4 mb-8">
            {[
              { emoji: '⚡', text: 'Acceso rápido desde cualquier lugar con tu celular' },
              { emoji: '🔄', text: 'Todas las funciones disponibles en tu navegador móvil' },
              { emoji: '📲', text: 'Instálala en tu pantalla de inicio como una app nativa' },
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-3 rounded-2xl p-4 shadow-md" style={{ backgroundColor: '#FFFFFF' }}>
                <span className="text-2xl flex-shrink-0">{item.emoji}</span>
                <span className="text-sm font-semibold" style={{ color: '#0F172A' }}>{item.text}</span>
              </li>
            ))}
          </ul>

          <div className="text-center">
            <div className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl shadow-md" style={{ backgroundColor: '#0F172A' }}>
              <span className="text-xl">🌐</span>
              <p className="text-sm font-semibold" style={{ color: '#FFFFFF' }}>
                Abre <span style={{ color: '#93C5FD' }}>flowestateai.com</span> en Chrome o Safari —{' '}
                <span style={{ color: '#86EFAC' }}>sin descargar nada</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Banda — Hecha para usarse en tu móvil */}
      <section className="py-10 px-4 w-full" style={{ backgroundColor: '#0F172A' }}>
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-4 text-center sm:text-left">
          <span className="text-4xl">📱</span>
          <div>
            <h2 className="text-2xl font-bold text-white uppercase tracking-wide">Hecha para usarse en tu móvil</h2>
            <p className="text-sm mt-1" style={{ color: '#94A3B8' }}>No necesitas laptop ni computadora. Todo desde tu teléfono.</p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 uppercase" style={{ color: '#0F172A' }}>Cómo Funciona</h2>
            <p className="text-lg opacity-70" style={{ color: '#0F172A' }}>Tan fácil como enviar un mensaje de voz</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { step: '1', emoji: '📸', title: 'Sube Fotos', description: 'Selecciona las fotos de la propiedad desde tu celular. Entre 2 y 10 fotos.' },
              { step: '2', emoji: '🎤', title: 'Graba tu Voz', description: 'Describe la propiedad hablando 30-120 segundos. Como si le explicaras a un cliente.' },
              { step: '3', emoji: '✅', title: 'Listo para Compartir', description: 'Recibe la descripción profesional lista. Comparte PDF o link de tu portafolio.' },
            ].map((item, index) => (
              <div key={index} className="relative rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow" style={{ backgroundColor: '#FFFFFF' }}>
                <div className="absolute -top-4 -left-4 w-12 h-12 rounded-full flex items-center justify-center font-bold text-white text-xl shadow-lg" style={{ backgroundColor: '#2563EB' }}>
                  {item.step}
                </div>
                <div className="text-5xl mb-4 text-center">{item.emoji}</div>
                <h3 className="text-xl font-bold mb-2 text-center" style={{ color: '#0F172A' }}>{item.title}</h3>
                <p className="text-center opacity-80" style={{ color: '#0F172A' }}>{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Video — Publicar en Facebook */}
      <section className="py-16 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 uppercase" style={{ color: '#0F172A' }}>
              Publica en Facebook con un toque
            </h2>
            <p className="text-lg opacity-70 max-w-2xl mx-auto" style={{ color: '#0F172A' }}>
              Comparte tus propiedades directamente en tu página de Facebook desde la app, sin copiar ni pegar nada.
            </p>
          </div>
          <div className="rounded-2xl overflow-hidden shadow-2xl mx-auto" style={{ maxWidth: '360px' }}>
            <MuxPlayer
              playbackId="yCYWwv00Hiohs27xTuRSm6SfEmGM1vcdt8B7v4d9y00Oc"
              autoPlay={false}
              muted={false}
              style={{ width: '100%', aspectRatio: '9/16' }}
            />
          </div>
        </div>
      </section>

      {/* Testimonios */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 uppercase" style={{ color: '#0F172A' }}>Quien lo Usa lo Recomienda</h2>
            <p className="text-lg opacity-70" style={{ color: '#0F172A' }}>Agentes inmobiliarios de Costa Rica ya usan FlowEstateAI</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                name: 'Jorge Calderón Ortega',
                company: 'Real Natural CR',
                photo: '/testimonial-jorge.jpg',
                quote: 'Nos ha mejorado el rendimiento, las publicaciones y el ordenamiento. El tiempo es muy valioso y esta app nos da un gran avance. La información es rápida, ordenada y profesional. La recomiendo.',
              },
              {
                name: 'Eitel Vallejos',
                company: 'Pampa Bienes Raíces',
                photo: '/testimonial-eitel.jpg',
                quote: 'Me parece una herramienta magnífica, muy práctica, ágil y técnica. Perfecta para el trabajo inmobiliario.',
              },
              {
                name: 'Guadalupe Mancía',
                company: 'Guadalupe Real Estate',
                photo: '/testimonial-guadalupe.jpg',
                quote: 'Me ha ayudado a facilitar el trabajo, mis publicaciones y ahorrar tiempo. Una gran herramienta, una gran ayuda.',
              },
            ].map((t, i) => (
              <div key={i} className="rounded-2xl p-6 shadow-lg flex flex-col gap-4" style={{ backgroundColor: '#FFFFFF' }}>
                <div className="text-6xl font-serif leading-none" style={{ color: '#2563EB', opacity: 0.3 }}>"</div>
                <p className="text-base leading-relaxed flex-1 italic opacity-90" style={{ color: '#0F172A' }}>{t.quote}</p>
                <div className="flex items-center gap-3 pt-4 border-t" style={{ borderColor: '#E5E7EB' }}>
                  <div className="w-14 h-14 rounded-full overflow-hidden flex-shrink-0 shadow-md">
                    <Image src={t.photo} alt={t.name} width={56} height={56} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <p className="font-bold text-base" style={{ color: '#0F172A' }}>{t.name}</p>
                    <p className="text-sm opacity-60" style={{ color: '#0F172A' }}>{t.company}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features — Lo Que Obtienes */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 uppercase" style={{ color: '#0F172A' }}>Lo Que Obtienes</h2>
            <p className="text-lg opacity-70" style={{ color: '#0F172A' }}>Todo lo necesario para verte profesional</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { emoji: '🌐', title: 'Portafolio Bilingüe', desc: 'Tu portafolio público bilingüe español / inglés listo para compartir con cualquier cliente.' },
              { emoji: '📇', title: 'Tarjeta Digital Bilingüe', desc: 'Tarjeta digital profesional español/inglés para compartir fácilmente con tus contactos.' },
              { emoji: '🏷️', title: 'Tu Logo como Marca de Agua', desc: 'Agrega tu logo como marca de agua a todas tus propiedades automáticamente.' },
              { emoji: '💵', title: 'Colones y Dólares', desc: 'Maneja los precios de tus propiedades en colones y en dólares sin complicaciones.' },
              { emoji: '🗺️', title: 'Mapa de Google Integrado', desc: 'Muestra la ubicación exacta de tus propiedades con Google Maps cuando lo desees.' },
              { emoji: '🎬', title: 'Videos de Propiedades', desc: 'Incluye videos en tus propiedades para destacar su presentación y captar más la atención de tus clientes.' },
            ].map((feature, index) => (
              <div key={index} className="rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all" style={{ backgroundColor: '#FFFFFF' }}>
                <div className="text-4xl mb-3">{feature.emoji}</div>
                <h3 className="text-lg font-bold mb-2" style={{ color: '#0F172A' }}>{feature.title}</h3>
                <p className="text-sm opacity-80" style={{ color: '#0F172A' }}>{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Video — Modo TikTok */}
      <section className="py-16 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 uppercase" style={{ color: '#0F172A' }}>
              Modo TikTok para tus propiedades
            </h2>
            <p className="text-lg opacity-70 max-w-2xl mx-auto" style={{ color: '#0F172A' }}>
              Navega entre los videos de tus propiedades al estilo TikTok. Una experiencia moderna que engancha a tus clientes.
            </p>
          </div>
          <div className="rounded-2xl overflow-hidden shadow-2xl mx-auto" style={{ maxWidth: '360px' }}>
            <MuxPlayer
              playbackId="2GGgMmXJhWQoQp2XpOTPRw5uPnzN6Mwy8OjkhyP9mXY"
              autoPlay={false}
              muted={false}
              style={{ width: '100%', aspectRatio: '9/16' }}
            />
          </div>
        </div>
      </section>

      {/* Planes y Precios */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 uppercase" style={{ color: '#0F172A' }}>Planes y Precios</h2>
            <p className="text-lg opacity-70" style={{ color: '#0F172A' }}>Empieza gratis. Crece cuando estés listo.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Plan Free */}
            <div className="rounded-2xl p-8 shadow-lg border-2" style={{ backgroundColor: '#FFFFFF', borderColor: '#E5E7EB' }}>
              <h3 className="text-xl font-bold mb-1" style={{ color: '#0F172A' }}>Free</h3>
              <p className="text-4xl font-bold mb-1" style={{ color: '#0F172A' }}>₡0</p>
              <p className="text-sm opacity-60 mb-6" style={{ color: '#0F172A' }}>Para empezar sin riesgo</p>
              <ul className="space-y-3 mb-8">
                {[
                  'Hasta 5 propiedades',
                  'Generación de descripciones con IA',
                  'Portafolio web público',
                  'Tarjeta digital',
                  'Exportación a PDF',
                  'Soporte estándar',
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm" style={{ color: '#0F172A' }}>
                    <span className="text-green-500 font-bold">✓</span> {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/login"
                className="block w-full py-3 rounded-xl font-bold text-center border-2 active:scale-95 transition-transform"
                style={{ borderColor: '#2563EB', color: '#2563EB', backgroundColor: '#FFFFFF' }}
              >
                Empezar Gratis
              </Link>
            </div>

            {/* Plan Pro — azul */}
            <div className="rounded-2xl p-8 shadow-xl relative overflow-hidden border-2" style={{ backgroundColor: '#1D4ED8', borderColor: '#2563EB' }}>
              <div className="absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: '#FFFFFF', color: '#1D4ED8' }}>
                MÁS POPULAR
              </div>
              <h3 className="text-xl font-bold mb-1 text-white">Pro</h3>
              <p className="text-4xl font-bold mb-1 text-white">₡14,803</p>
              <p className="text-sm mb-6" style={{ color: '#BFDBFE' }}>por mes · ~$28 USD</p>
              <ul className="space-y-3 mb-8">
                {[
                  'Hasta 150 propiedades',
                  'Todo lo del plan Free +',
                  'Tarjeta digital bilingüe (ES/EN)',
                  'Publicación automática en Facebook',
                  'Traducciones con IA (Inglés/Español)',
                  'Sin marca de agua de FlowEstateAI',
                  'Agrega tu logo en fotos',
                  'Agrega videos a tus propiedades para destacar su presentación',
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-white">
                    <span style={{ color: '#86EFAC' }} className="font-bold">✓</span> {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/pro"
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-bold active:scale-95 transition-transform"
                style={{ backgroundColor: '#FFFFFF', color: '#1D4ED8' }}
              >
                🚀 Contratar Pro
              </Link>
            </div>
          </div>

          {/* FAQ */}
          <div className="mt-10 rounded-2xl p-8 shadow-lg" style={{ backgroundColor: '#FFFFFF' }}>
            <h3 className="text-xl font-bold mb-6 uppercase" style={{ color: '#0F172A' }}>Preguntas Frecuentes</h3>
            <div className="space-y-5">
              {[
                { q: '¿Cómo funciona el pago por SINPE?', a: 'Realizas la transferencia al número indicado y nos envías el comprobante por WhatsApp. Activaremos tu cuenta en minutos.' },
                { q: '¿Qué pasa con mis propiedades si dejo de pagar?', a: 'Tus propiedades seguirán guardadas, pero pasarás al límite del plan Free (5 propiedades). No pierdes tu información.' },
                { q: '¿Puedo cancelar en cualquier momento?', a: 'Sí. Como los pagos son manuales mes a mes, simplemente dejas de enviar el SINPE y tu plan vuelve automáticamente al plan gratuito.' },
                { q: '¿Hay límite de fotos por propiedad?', a: 'Puedes subir hasta 15 fotos por propiedad en cualquier plan.' },
              ].map((faq, i) => (
                <div key={i} className="border-b pb-4 last:border-0 last:pb-0" style={{ borderColor: '#E5E7EB' }}>
                  <p className="font-bold mb-1" style={{ color: '#0F172A' }}>❓ {faq.q}</p>
                  <p className="text-sm opacity-70" style={{ color: '#0F172A' }}>{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Por qué usar FlowEstateAI */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 uppercase" style={{ color: '#0F172A' }}>¿Por qué usar FlowEstateAI?</h2>
            <p className="text-lg opacity-70" style={{ color: '#0F172A' }}>Diseñado específicamente para agentes independientes</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {[
              {
                icon: '📊',
                title: 'Aléjate del caos',
                description: 'Deja atrás el desorden de manejar tus propiedades en Excel o cuadernos. Todo en un solo lugar, organizado y listo para usar.',
              },
              {
                icon: '🌐',
                title: 'Tu portafolio digital sin pagar sitio web',
                description: 'Tienes tu propio portafolio digital bilingüe listo para compartir con tus clientes, ahorrándote pagar sitios web caros y el mantenimiento que eso conlleva.',
              },
              {
                icon: '🚀',
                title: 'FlowEstateAI está en constante evolución',
                description: 'Podrás participar en el uso de nuevas funcionalidades antes que nadie. Siempre mejorando para ti.',
              },
              {
                icon: '🎤',
                title: 'Habla y FlowEstateAI hace el resto',
                description: 'Con solo describir los detalles de una propiedad hablando, FlowEstateAI te arma la ficha lista para publicar y compartir con tus clientes.',
              },
              {
                icon: '📘',
                title: 'Publica en Facebook en menos de un minuto',
                description: 'Ahora puedes publicar directamente desde FlowEstateAI en tu página de Facebook. Lo logras en menos de un minuto sin salir de la app.',
              },
              {
                icon: '📦',
                title: 'Todo ordenado, más productividad',
                description: 'Olvídate de propiedades perdidas por todo lado. Ahora mantienes todo ordenado y ganas productividad en tu día a día.',
              },
            ].map((item, index) => (
              <div key={index} className="rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all" style={{ backgroundColor: '#FFFFFF' }}>
                <div className="flex items-start gap-4">
                  <div className="text-4xl flex-shrink-0">{item.icon}</div>
                  <div>
                    <h3 className="text-xl font-bold mb-2" style={{ color: '#0F172A' }}>{item.title}</h3>
                    <p className="opacity-80" style={{ color: '#0F172A' }}>{item.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA — banda de lado a lado */}
      <section className="py-20 px-4 w-full" style={{ backgroundColor: '#0F172A' }}>
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-white uppercase">¿Listo Para Verte Más Profesional?</h2>
          <p className="text-lg mb-2 text-white opacity-80">Comienza gratis hoy. Sin tarjeta de crédito.</p>
          <p className="text-sm mb-8 opacity-50 text-white">📱 Abre esta página desde tu celular para la mejor experiencia</p>
          <Link
            href="/login"
            className="inline-block px-10 py-4 rounded-xl font-bold text-lg shadow-xl active:scale-95 transition-transform"
            style={{ backgroundColor: '#2563EB', color: '#FFFFFF' }}
          >
            🚀 Probar Gratis Ahora
          </Link>
          <p className="text-sm mt-4 text-white opacity-60">Empieza en menos de 2 minutos</p>
        </div>
      </section>

      {/* Footer mejorado */}
      <footer className="py-10 px-4" style={{ backgroundColor: '#0F172A', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="max-w-6xl mx-auto">
          {/* Logo centrado con fondo suave */}
          <div className="flex justify-center mb-5">
            <div className="px-5 py-3 rounded-xl" style={{ backgroundColor: 'rgb(15, 23, 42)' }}>
              <Image
                src="/logo_header.png"
                alt="FlowEstateAI"
                width={410}
                height={184}
                className="w-[110px] h-auto"
                priority
              />
            </div>
          </div>

          <p className="text-center text-sm mb-5" style={{ color: '#94A3B8' }}>
            Herramientas digitales para agentes independientes
          </p>

          {/* Links */}
          <div className="flex flex-wrap justify-center gap-6 text-sm mb-5" style={{ color: '#94A3B8' }}>
            <Link href="/terms" className="hover:text-white transition-colors">Términos y Condiciones</Link>
            <Link href="/privacy" className="hover:text-white transition-colors">Política de Privacidad</Link>
            <a href="mailto:support@flowestateai.com" className="hover:text-white transition-colors">Contacto</a>
          </div>

          {/* Separador */}
          <div className="border-t mb-5" style={{ borderColor: 'rgba(255,255,255,0.08)' }} />

          {/* Copyright + Facebook */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs" style={{ color: '#475569' }}>© 2026 FlowEstateAI. Todos los derechos reservados.</p>
            <a
              href="https://www.facebook.com/flowestateai/"
              target="_blank"
              rel="noopener noreferrer"
              className="w-9 h-9 rounded-full flex items-center justify-center transition-opacity hover:opacity-80"
              style={{ backgroundColor: '#1877F2' }}
              aria-label="Facebook de FlowEstateAI"
            >
              <svg className="w-5 h-5" fill="white" viewBox="0 0 24 24">
                <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.235 2.686.235v2.97h-1.513c-1.491 0-1.956.93-1.956 1.874v2.25h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/>
              </svg>
            </a>
          </div>
        </div>
      </footer>

      {/* Botón flotante de WhatsApp con texto */}
      <a
        href="https://wa.me/50683688684?text=Hola!%20Tengo%20una%20consulta%20sobre%20Flow%20Estate%20AI%20%F0%9F%8F%A0"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-full shadow-2xl active:scale-90 transition-transform"
        style={{ backgroundColor: '#25D366' }}
        aria-label="Contactar por WhatsApp"
      >
        <svg className="w-5 h-5 flex-shrink-0" fill="white" viewBox="0 0 24 24">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
        <span className="text-white font-semibold text-sm">Hablar por WhatsApp</span>
      </a>

    </div>
  );
}