'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import MobileLayout from '@/components/MobileLayout';

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: '0',
    currency: '₡',
    properties: 5,
    period: 'total',
    features: [
      'Hasta 5 propiedades en total',
      'Generación de descripciones con IA',
      'Portfolio web público',
      'Exportación básica a PDF',
      'Soporte estándar'
    ],
    cta: 'Plan Actual',
    highlight: false
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '14,803',
    currency: '₡',
    properties: 150,
    period: 'mes',
    features: [
      'Hasta 150 propiedades',
      'Todo lo del plan Free +',
      'Publicación automática en Facebook',
      'Traducciones con IA (Inglés/Español)',
      'Sin marca de agua de Flow Estate',
      'Agrega tu logo personalizado en fotos'
    ],
    cta: 'Pagar con SINPE Móvil',
    highlight: true
  }
];

export default function PricingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [currentPlan, setCurrentPlan] = useState('free');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user) {
      fetchCurrentPlan();
    }
  }, [session]);

  const fetchCurrentPlan = async () => {
    try {
      const response = await fetch('/api/agent/current-plan');
      const data = await response.json();
      setCurrentPlan(data.plan || 'free');
    } catch (error) {
      console.error('Error fetching plan:', error);
    }
  };

  const handleSinpePayment = () => {
    const userEmail = session?.user?.email || 'mi correo';
    const message = encodeURIComponent(`¡Hola! Deseo adquirir el plan Pro de Flow Estate AI. Ya realicé el pago por SINPE. Mi correo de usuario es: ${userEmail}`);
    // Asegúrate de cambiar el 88888888 por tu número real de Costa Rica
    window.open(`https://wa.me/50688888888?text=${message}`, '_blank');
  };

  if (status === 'loading') {
    return (
      <MobileLayout title="Planes" showTabs={true}>
        <div className="flex items-center justify-center h-full">
          <div className="text-5xl animate-pulse">💳</div>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout title="Planes" showTabs={true}>
      <div className="px-4 pt-4 pb-24">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-3" style={{ color: '#0F172A' }}>
            Elige tu plan de Flow Estate AI
          </h1>
          <p className="opacity-80" style={{ color: '#0F172A' }}>
            Escala tu negocio y automatiza tus propiedades
          </p>
        </div>

        {/* Current Plan Badge */}
        {currentPlan !== 'free' && (
          <div 
            className="mb-6 rounded-2xl p-4 text-center"
            style={{ backgroundColor: '#FFFFFF', border: '2px solid #2563EB' }}
          >
            <p className="font-bold" style={{ color: '#2563EB' }}>
              ✓ Plan actual: {PLANS.find(p => p.id === currentPlan)?.name}
            </p>
          </div>
        )}

        {/* Plans Grid */}
        <div className="space-y-4">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`rounded-2xl p-6 shadow-lg ${
                plan.highlight ? 'border-4' : 'border-2'
              }`}
              style={{
                backgroundColor: '#FFFFFF',
                borderColor: plan.highlight ? '#2563EB' : '#E5E7EB',
              }}
            >
              {plan.highlight && (
                <div
                  className="text-xs font-bold text-center py-1 px-3 rounded-full mb-3 inline-block"
                  style={{ backgroundColor: '#2563EB', color: '#FFFFFF' }}
                >
                  MÁS POPULAR
                </div>
              )}

              <h3 className="text-2xl font-bold mb-2" style={{ color: '#0F172A' }}>
                {plan.name}
              </h3>

              <div className="mb-4">
                <span className="text-4xl font-bold" style={{ color: '#2563EB' }}>
                  {plan.currency}{plan.price}
                </span>
                {plan.price !== '0' && (
                  <span className="text-sm opacity-70" style={{ color: '#0F172A' }}>
                    /{plan.period}
                  </span>
                )}
              </div>

              <p className="text-sm mb-4 font-semibold" style={{ color: '#0F172A' }}>
                {plan.properties} propiedades {plan.period === 'mes' ? 'en total por mes' : 'en total'}
              </p>

              <ul className="space-y-2 mb-6">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm" style={{ color: '#0F172A' }}>
                    <span style={{ color: '#2563EB' }}>✓</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              {plan.id === 'pro' && currentPlan !== 'pro' && (
                <div className="bg-blue-50 p-3 rounded-lg mb-4 text-center border border-blue-100">
                  <p className="text-xs font-semibold text-blue-800">
                    Paga por SINPE Móvil al:
                  </p>
                  <p className="text-lg font-bold text-blue-900">(+506)8368 8684</p>
                  <p className="text-xs text-blue-700">A nombre de: Steven Espinoza</p>
                </div>
              )}

              <button
                onClick={() => plan.id === 'pro' ? handleSinpePayment() : null}
                disabled={currentPlan === plan.id || plan.id === 'free'}
                className={`w-full py-3 rounded-xl font-bold shadow-lg transition-transform ${
                  currentPlan === plan.id || plan.id === 'free' 
                    ? 'opacity-50 cursor-not-allowed' 
                    : 'active:scale-95'
                }`}
                style={{
                  backgroundColor: plan.highlight && currentPlan !== plan.id ? '#25D366' : currentPlan === plan.id ? '#10B981' : '#FFFFFF',
                  color: plan.highlight && currentPlan !== plan.id ? '#FFFFFF' : currentPlan === plan.id ? '#FFFFFF' : '#2563EB',
                  border: plan.highlight || currentPlan === plan.id ? 'none' : '2px solid #2563EB',
                }}
              >
                {currentPlan === plan.id 
                  ? '✓ Plan Actual' 
                  : plan.id === 'pro' 
                    ? '💬 Enviar Comprobante (WhatsApp)' 
                    : plan.cta}
              </button>
            </div>
          ))}
        </div>

        {/* FAQ */}
        <div className="mt-12 space-y-4">
          <h3 className="text-xl font-bold text-center mb-6" style={{ color: '#0F172A' }}>
            Preguntas Frecuentes
          </h3>

          {[
            {
              q: '¿Cómo funciona el pago por SINPE?',
              a: 'Es muy sencillo. Realizas la transferencia al número indicado y nos envías el comprobante por WhatsApp tocando el botón verde. Activaremos tu cuenta en minutos.'
            },
            {
              q: '¿Qué pasa con mis propiedades si se acaba el mes?',
              a: 'El plan Pro te permite gestionar hasta 150 propiedades de forma simultánea. Si dejas de pagar, tus propiedades seguirán guardadas, pero pasarás al límite del plan Free (5 propiedades).'
            },
            {
              q: '¿Hay límite de fotos por propiedad?',
              a: 'Sí, puedes subir hasta 15 fotos por propiedad independientemente del plan activo que uses.'
            },
            {
              q: '¿Puedo cancelar en cualquier momento?',
              a: 'Sí, como los pagos son manuales mes a mes, simplemente dejas de enviar el SINPE y tu plan volverá automáticamente al plan gratuito.'
            }
          ].map((faq, index) => (
            <div
              key={index}
              className="rounded-2xl p-5"
              style={{ backgroundColor: '#FFFFFF' }}
            >
              <p className="font-bold mb-2" style={{ color: '#0F172A' }}>
                {faq.q}
              </p>
              <p className="text-sm opacity-80" style={{ color: '#0F172A' }}>
                {faq.a}
              </p>
            </div>
          ))}
        </div>
      </div>
    </MobileLayout>
  );
}