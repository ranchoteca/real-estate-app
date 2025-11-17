// app/settings/currency/page.tsx
'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import MobileLayout from '@/components/MobileLayout';

interface Currency {
  id: string;
  code: string;
  name: string;
  symbol: string;
  is_default: boolean;
}

export default function CurrencySettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [selectedCurrency, setSelectedCurrency] = useState<string | null>(null);
  const [agentDefaultCurrency, setAgentDefaultCurrency] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      loadData();
    }
  }, [status, router]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Cargar divisas disponibles
      const currenciesResponse = await fetch('/api/currencies/list');
      if (currenciesResponse.ok) {
        const currenciesData = await currenciesResponse.json();
        setCurrencies(currenciesData.currencies || []);
      }

      // Cargar divisa actual del agente
      const profileResponse = await fetch('/api/agent/profile');
      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        const currentCurrency = profileData.agent.default_currency_id;
        setAgentDefaultCurrency(currentCurrency);
        setSelectedCurrency(currentCurrency);
      }

    } catch (error) {
      console.error('Error al cargar configuración:', error);
      alert('Error al cargar la configuración');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedCurrency) {
      alert('Debes seleccionar una divisa');
      return;
    }

    if (selectedCurrency === agentDefaultCurrency) {
      alert('Esta ya es tu divisa por defecto');
      return;
    }

    setSaving(true);

    try {
      const response = await fetch('/api/agent/update-currency', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currency_id: selectedCurrency }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al actualizar');
      }

      const data = await response.json();
      setAgentDefaultCurrency(selectedCurrency);
      
      alert(`✅ ${data.message}`);
      router.back();

    } catch (error: any) {
      alert(`❌ Error: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <MobileLayout title="Divisa por Defecto" showBack={true} showTabs={true}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center py-12">
            <div className="text-5xl mb-4 animate-pulse">💰</div>
            <div className="text-lg" style={{ color: '#0F172A' }}>Cargando...</div>
          </div>
        </div>
      </MobileLayout>
    );
  }

  const selectedCurrencyData = currencies.find(c => c.id === selectedCurrency);

  return (
    <MobileLayout title="Divisa por Defecto" showBack={true} showTabs={true}>
      <div className="px-4 py-6 space-y-6">
        
        {/* Info Banner */}
        <div 
          className="rounded-2xl p-4 border-2"
          style={{ 
            backgroundColor: '#EFF6FF',
            borderColor: '#BFDBFE'
          }}
        >
          <div className="flex items-start gap-3">
            <span className="text-3xl">💡</span>
            <div className="flex-1">
              <h3 className="font-bold mb-1" style={{ color: '#1E40AF' }}>
                ¿Qué es la divisa por defecto?
              </h3>
              <p className="text-sm" style={{ color: '#1E40AF' }}>
                Esta será la divisa que aparecerá preseleccionada cuando crees nuevas propiedades. 
                Puedes cambiarla en cualquier momento para cada propiedad individual.
              </p>
            </div>
          </div>
        </div>

        {/* Current Selection Preview */}
        {selectedCurrencyData && (
          <div 
            className="rounded-2xl p-5 shadow-lg"
            style={{ backgroundColor: '#FFFFFF' }}
          >
            <div className="text-center">
              <div className="text-5xl mb-3">
                {selectedCurrencyData.symbol}
              </div>
              <h2 className="text-2xl font-bold mb-1" style={{ color: '#0F172A' }}>
                {selectedCurrencyData.code}
              </h2>
              <p className="text-sm opacity-70" style={{ color: '#0F172A' }}>
                {selectedCurrencyData.name}
              </p>
              {selectedCurrency === agentDefaultCurrency && (
                <div className="mt-3">
                  <span 
                    className="inline-block px-3 py-1 rounded-full text-xs font-bold"
                    style={{ backgroundColor: '#10B981', color: '#FFFFFF' }}
                  >
                    ✓ Divisa actual
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Currency Options */}
        <div className="space-y-3">
          <h3 className="font-bold text-lg" style={{ color: '#0F172A' }}>
            Selecciona tu divisa
          </h3>
          
          {currencies.map((currency) => (
            <button
              key={currency.id}
              onClick={() => setSelectedCurrency(currency.id)}
              className="w-full rounded-2xl p-4 shadow-lg active:scale-98 transition-transform border-2"
              style={{ 
                backgroundColor: '#FFFFFF',
                borderColor: selectedCurrency === currency.id ? '#2563EB' : '#E5E7EB'
              }}
            >
              <div className="flex items-center gap-4">
                <div 
                  className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl shadow-sm"
                  style={{ 
                    backgroundColor: selectedCurrency === currency.id ? '#DBEAFE' : '#F3F4F6'
                  }}
                >
                  {currency.symbol}
                </div>
                
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-lg" style={{ color: '#0F172A' }}>
                      {currency.code}
                    </h3>
                    {currency.is_default && (
                      <span 
                        className="text-xs px-2 py-0.5 rounded-full font-bold"
                        style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}
                      >
                        Sistema
                      </span>
                    )}
                    {currency.id === agentDefaultCurrency && (
                      <span 
                        className="text-xs px-2 py-0.5 rounded-full font-bold"
                        style={{ backgroundColor: '#D1FAE5', color: '#065F46' }}
                      >
                        Tu default
                      </span>
                    )}
                  </div>
                  <p className="text-sm opacity-70" style={{ color: '#0F172A' }}>
                    {currency.name}
                  </p>
                </div>

                {selectedCurrency === currency.id && (
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: '#2563EB' }}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="#FFFFFF" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Info adicional */}
        <div 
          className="rounded-xl p-4 text-sm"
          style={{ backgroundColor: '#F0FDFA', color: '#134E4A' }}
        >
          <p className="font-semibold mb-1">📊 Importante:</p>
          <ul className="space-y-1 text-xs opacity-90">
            <li>• Esta configuración solo afecta nuevas propiedades</li>
            <li>• Las propiedades existentes mantienen su divisa original</li>
            <li>• Puedes cambiar la divisa al crear o editar cada propiedad</li>
            <li>• No hay conversión automática de precios</li>
          </ul>
        </div>

        {/* Save Button */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t space-y-2" style={{ borderColor: '#E5E7EB' }}>
          <button
            onClick={handleSave}
            disabled={saving || selectedCurrency === agentDefaultCurrency}
            className="w-full py-4 rounded-xl font-bold text-white shadow-lg active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#2563EB' }}
          >
            {saving ? '⏳ Guardando...' : '💾 Guardar Divisa por Defecto'}
          </button>
        </div>

        {/* Spacer para el botón fijo */}
        <div style={{ height: '80px' }}></div>
      </div>
    </MobileLayout>
  );
}