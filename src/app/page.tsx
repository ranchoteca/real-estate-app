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
      <section className="relative pt-32 pb-20 px-4 bg-white overflow-hidden border-b border-slate-100">
        <div className="relative max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8 bg-blue-50 border border-blue-100 text-blue-700 text-sm font-medium">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
            La nueva forma de gestionar bienes raíces
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold mb-6 tracking-tight text-slate-900">
            Deja de enviar fotos sueltas por{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-blue-400">WhatsApp</span>
          </h1>

          <p className="text-xl mb-10 max-w-2xl mx-auto text-slate-600 leading-relaxed">
            Crea tu portafolio digital profesional sin pagar por un sitio web.
            <span className="font-semibold text-slate-800"> Tú describes la propiedad con tu voz; nuestra IA hace el resto.</span>
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link
              href="/login"
              className="px-8 py-4 rounded-xl font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all text-lg"
            >
              Comenzar Gratis
            </Link>
            <button
              onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
              className="px-8 py-4 rounded-xl font-semibold border-2 border-slate-200 text-slate-700 bg-white hover:border-slate-300 hover:bg-slate-50 transition-all text-lg"
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

          <p className="text-sm text-slate-400 font-medium uppercase tracking-wide">
            Agentes en Costa Rica ya confían en nosotros
          </p>
        </div>
      </section>

      {/* App en tu celular — screenshots */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ color: '#0F172A' }}>
              La productividad en la palma de tu mano
            </h2>
            <p className="text-lg opacity-70 max-w-2xl mx-auto" style={{ color: '#0F172A' }}>
              Trabaja desde cualquier lugar. Flow Estate AI está diseñada para que gestiones tus propiedades directamente desde tu celular, sin complicaciones.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="rounded-2xl overflow-hidden shadow-xl">
              <Image src="/app-dashboard.jpg" alt="Dashboard de Flow Estate AI" width={300} height={600} className="w-full h-auto object-cover" />
            </div>
            <div className="rounded-2xl overflow-hidden shadow-xl mt-6">
              <Image src="/app-property.jpg" alt="Propiedad en Flow Estate AI" width={300} height={600} className="w-full h-auto object-cover" />
            </div>
            <div className="rounded-2xl overflow-hidden shadow-xl">
              <Image src="/app-card.jpg" alt="Tarjeta digital Flow Estate AI" width={300} height={600} className="w-full h-auto object-cover" />
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

      {/* Hecha para tu celular — solo encabezado */}
      <section className="py-8 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <div className="rounded-3xl p-8 shadow-xl inline-flex flex-col items-center gap-3" style={{ backgroundColor: '#0F172A' }}>
            <span className="text-4xl">📱</span>
            <h2 className="text-2xl font-bold text-white">Hecha para usarse en tu celular</h2>
            <p className="text-sm opacity-70 text-white">No necesitas laptop ni computadora. Todo desde tu teléfono.</p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ color: '#0F172A' }}>Cómo Funciona</h2>
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

      {/* Testimonios */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ color: '#0F172A' }}>Lo Que Dicen los Agentes</h2>
            <p className="text-lg opacity-70" style={{ color: '#0F172A' }}>Agentes inmobiliarios de Costa Rica ya usan Flow Estate AI</p>
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
                <div className="text-5xl font-serif leading-none" style={{ color: '#2563EB', opacity: 0.3 }}>"</div>
                <p className="text-sm leading-relaxed flex-1 italic opacity-80" style={{ color: '#0F172A' }}>{t.quote}</p>
                <div className="flex items-center gap-3 pt-4 border-t" style={{ borderColor: '#E5E7EB' }}>
                  <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 shadow-md">
                    <Image src={t.photo} alt={t.name} width={48} height={48} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <p className="font-bold text-sm" style={{ color: '#0F172A' }}>{t.name}</p>
                    <p className="text-xs opacity-60" style={{ color: '#0F172A' }}>{t.company}</p>
                  </div>
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
            <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ color: '#0F172A' }}>Lo Que Obtienes</h2>
            <p className="text-lg opacity-70" style={{ color: '#0F172A' }}>Todo lo necesario para verte profesional</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { emoji: '📄', title: 'PDFs Profesionales', desc: 'Genera PDFs con marca de agua en tus fotos para enviar a clientes' },
              { emoji: '🏷️', title: 'Tu Logo en Fotos', desc: 'Agrega tu logo a todas las fotos automáticamente' },
              { emoji: '📇', title: 'Tarjeta Digital', desc: 'Comparte tu información de contacto profesionalmente' },
              { emoji: '🌐', title: 'Portafolio Público', desc: 'Link para compartir todas tus propiedades' },
              { emoji: '💵', title: 'Colones y Dólares', desc: 'Maneja precios en ambas monedas fácilmente' },
              { emoji: '🗺️', title: 'Mapa Integrado', desc: 'Ubicación exacta con Google Maps' },
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

      {/* Bilingual */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ color: '#0F172A' }}>Para el Mercado Internacional</h2>
            <p className="text-lg opacity-70" style={{ color: '#0F172A' }}>Atrae clientes extranjeros sin esfuerzo</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {[
              { icon: '🌎', title: 'Portafolio Bilingüe', description: 'Tus propiedades en español e inglés. Perfecto para turistas y extranjeros interesados en Costa Rica.', color: '#10B981' },
              { icon: '📇', title: 'Tarjeta en 2 Idiomas', description: 'Tu tarjeta digital se adapta al idioma del cliente automáticamente.', color: '#F59E0B' },
            ].map((feature, index) => (
              <div key={index} className="rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all" style={{ backgroundColor: '#FFFFFF' }}>
                <div className="w-16 h-16 rounded-xl flex items-center justify-center text-4xl mb-4 shadow-sm" style={{ backgroundColor: `${feature.color}20` }}>
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold mb-3" style={{ color: '#0F172A' }}>{feature.title}</h3>
                <p className="opacity-80 leading-relaxed" style={{ color: '#0F172A' }}>{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Planes y Precios */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ color: '#0F172A' }}>Planes y Precios</h2>
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

            {/* Plan Pro */}
            <div className="rounded-2xl p-8 shadow-xl relative overflow-hidden border-2" style={{ backgroundColor: '#0F172A', borderColor: '#2563EB' }}>
              <div className="absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: '#2563EB', color: '#FFFFFF' }}>
                MÁS POPULAR
              </div>
              <h3 className="text-xl font-bold mb-1 text-white">Pro</h3>
              <p className="text-4xl font-bold mb-1 text-white">₡14,803</p>
              <p className="text-sm mb-6" style={{ color: '#93C5FD' }}>por mes · ~$28 USD</p>
              <ul className="space-y-3 mb-8">
                {[
                  'Hasta 150 propiedades',
                  'Todo lo del plan Free +',
                  'Tarjeta digital bilingüe (ES/EN)',
                  'Publicación automática en Facebook',
                  'Traducciones con IA (Inglés/Español)',
                  'Sin marca de agua de Flow Estate',
                  'Agrega tu logo en fotos',
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-white">
                    <span style={{ color: '#86EFAC' }} className="font-bold">✓</span> {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/pro"
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-bold text-white active:scale-95 transition-transform"
                style={{ backgroundColor: '#2563EB' }}
              >
                🚀 Contratar Pro
              </Link>
            </div>
          </div>

          {/* FAQ */}
          <div className="mt-10 rounded-2xl p-8 shadow-lg" style={{ backgroundColor: '#FFFFFF' }}>
            <h3 className="text-xl font-bold mb-6" style={{ color: '#0F172A' }}>Preguntas Frecuentes</h3>
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

      {/* Why Choose Us */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ color: '#0F172A' }}>¿Por Qué Flow Estate AI?</h2>
            <p className="text-lg opacity-70" style={{ color: '#0F172A' }}>Diseñado específicamente para agentes independientes</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {[
              { title: 'Ahorra Horas de Trabajo', description: 'No más escribir descripciones largas. Habla 1 minuto y recibe texto profesional listo para compartir.', icon: '⏱️' },
              { title: 'Verse Más Profesional', description: 'PDFs con tu logo, portafolio organizado, tarjeta digital. Tus clientes verán que eres serio.', icon: '💼' },
              { title: 'Fácil de Usar', description: 'Si usas WhatsApp, puedes usar Flow Estate. No necesitas ser experto en tecnología.', icon: '👍' },
              { title: 'Sin Sitio Web Caro', description: 'Obtén tu portafolio profesional sin pagar miles en desarrollo web.', icon: '💰' },
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

      {/* Final CTA */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto rounded-3xl p-12 text-center shadow-2xl" style={{ backgroundColor: '#0F172A' }}>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-white">¿Listo Para Verse Más Profesional?</h2>
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

      {/* Footer */}
      <footer className="py-8 px-4 border-t" style={{ borderColor: '#E5E7EB' }}>
        <div className="max-w-6xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Image src="/logo_footer.png" alt="Flow Estate AI" width={410} height={184} className="w-[91px] h-[40px] sm:w-[120px] sm:h-auto" priority />
          </div>
          <p className="text-sm opacity-60 mb-4" style={{ color: '#0F172A' }}>Herramientas digitales para agentes independientes</p>
          <div className="flex justify-center gap-6 text-sm" style={{ color: '#0F172A' }}>
            <Link href="/terms" className="hover:opacity-60 transition-opacity">Términos y Condiciones</Link>
            <Link href="/privacy" className="hover:opacity-60 transition-opacity">Política de Privacidad</Link>
            <a href="mailto:support@flowestateai.com" className="hover:opacity-60 transition-opacity">Contacto</a>
          </div>
          <p className="text-xs mt-4 opacity-40" style={{ color: '#0F172A' }}>© 2026 Flow Estate AI. Todos los derechos reservados.</p>
        </div>
      </footer>

      {/* Botón flotante de WhatsApp */}
      <a
        href="https://wa.me/50683688684?text=Hola!%20Tengo%20una%20consulta%20sobre%20Flow%20Estate%20AI%20%F0%9F%8F%A0"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-2xl active:scale-90 transition-transform"
        style={{ backgroundColor: '#25D366' }}
        aria-label="Contactar por WhatsApp"
      >
        <svg className="w-7 h-7" fill="white" viewBox="0 0 24 24">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
      </a>

    </div>
  );
}