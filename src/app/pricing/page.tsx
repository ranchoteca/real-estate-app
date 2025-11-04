'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import MobileLayout from '@/components/MobileLayout';

const PLANS = [
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
    cta: 'Plan Actual',
    highlight: false
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 19,
    properties: 30,
    period: 'mes',
    paypalPlanId: 'P-TU-PLAN-ID-AQUI', // Reemplazar con tu plan real de PayPal
    features: [
      '30 propiedades nuevas/mes',
      'Todo en Free +',
      'Sin marca de agua',
      'Incluye tu logo personalizado',
      'Soporte prioritario',
      'Analytics básico'
    ],
    cta: 'Comenzar',
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
      // Obtener plan actual del usuario
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

  const handleSubscribe = async (planId: string, paypalPlanId: string) => {
    if (planId === 'free') return;

    try {
      // Crear suscripción en PayPal
      const response = await fetch('/api/payments/create-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, paypalPlanId }),
      });

      const data = await response.json();

      if (data.approvalUrl) {
        // Redirigir a PayPal
        window.location.href = data.approvalUrl;
      } else {
        alert('Error al crear suscripción');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al procesar el pago');
    }
  };

  if (status === 'loading') {
    return (
      <MobileLayout title="Planes" showBack={true} showTabs={false}>
        <div className="flex items-center justify-center h-full">
          <div className="text-5xl animate-pulse">💳</div>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout title="Planes y Precios" showBack={true} showTabs={false}>
      <div className="px-4 pt-4 pb-24">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-3" style={{ color: '#0F172A' }}>
            Elige tu plan de Flow Estate AI
          </h1>
          <p className="opacity-80" style={{ color: '#0F172A' }}>
            Crea más propiedades y crece tu negocio
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
                  ${plan.price}
                </span>
                {plan.price > 0 && (
                  <span className="text-sm opacity-70" style={{ color: '#0F172A' }}>
                    /{plan.period}
                  </span>
                )}
              </div>

              <p className="text-sm mb-4 font-semibold" style={{ color: '#0F172A' }}>
                {plan.properties} propiedades {plan.period === 'mes' ? 'nuevas por mes' : 'en total'}
              </p>

              <ul className="space-y-2 mb-6">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm" style={{ color: '#0F172A' }}>
                    <span style={{ color: '#2563EB' }}>✓</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => plan.paypalPlanId && handleSubscribe(plan.id, plan.paypalPlanId)}
                disabled={currentPlan === plan.id || plan.id === 'free'}
                className="w-full py-3 rounded-xl font-bold shadow-lg active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: plan.highlight ? '#2563EB' : currentPlan === plan.id ? '#10B981' : '#FFFFFF',
                  color: plan.highlight || currentPlan === plan.id ? '#FFFFFF' : '#2563EB',
                  border: plan.highlight || currentPlan === plan.id ? 'none' : '2px solid #2563EB',
                }}
              >
                {currentPlan === plan.id ? '✓ Plan Actual' : plan.cta}
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
              q: '¿Qué pasa si no uso todas mis propiedades del mes?',
              a: 'Se pierden. El contador se resetea cada mes. No se acumulan.'
            },
            {
              q: '¿Puedo cancelar en cualquier momento?',
              a: 'Sí, cancelas cuando quieras. Tus propiedades permanecen activas.'
            },
            {
              q: '¿Hay límite de fotos por propiedad?',
              a: 'Sí, máximo 10 fotos por propiedad.'
            },
            {
              q: '¿Puedo cambiar de plan?',
              a: 'Sí, upgrades son inmediatos. Downgrades al final del periodo.'
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