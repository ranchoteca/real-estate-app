'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { useTranslation } from '@/hooks/useTranslation';

const T = {
  navy:       '#1B2D5B',
  gold:       '#C9A84C',
  goldLight:  '#E8C96A',
  goldPale:   '#F5EDD8',
  cream:      '#F8F6F2',
  white:      '#FFFFFF',
  charcoal:   '#1A1A2E',
  muted:      '#6B7280',
  border:     '#E8E4DC',
  green:      '#15803D',
  greenBg:    '#F0FDF4',
  greenBorder:'#BBF7D0',
};

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
  const { t } = useTranslation();

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

      const currenciesResponse = await fetch('/api/currencies/list');
      if (currenciesResponse.ok) {
        const currenciesData = await currenciesResponse.json();
        setCurrencies(currenciesData.currencies || []);
      }

      const profileResponse = await fetch('/api/agent/profile');
      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        const currentCurrency = profileData.agent.default_currency_id;
        setAgentDefaultCurrency(currentCurrency);
        setSelectedCurrency(currentCurrency);
      }
    } catch (error) {
      console.error('Error al cargar configuración:', error);
      alert(t('currency.errorLoading'));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedCurrency) {
      alert(t('currency.mustSelect'));
      return;
    }
    if (selectedCurrency === agentDefaultCurrency) {
      alert(t('currency.alreadyDefault'));
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
        throw new Error(data.error || t('common.error'));
      }
      const data = await response.json();
      setAgentDefaultCurrency(selectedCurrency);
      alert(`✅ ${data.message}`);
      router.back();
    } catch (error: any) {
      alert(`❌ ${t('common.error')}: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AppLayout title={t('currency.title')} showBack={true} showTabs={true}>
        <div className="flex items-center justify-center h-full" style={{ backgroundColor: T.cream }}>
          <div className="text-center py-12">
            <div className="text-5xl mb-4 animate-pulse">💰</div>
            <div className="text-base font-medium" style={{ color: T.muted }}>{t('currency.loading')}</div>
          </div>
        </div>
      </AppLayout>
    );
  }

  const selectedCurrencyData = currencies.find(c => c.id === selectedCurrency);

  return (
    <AppLayout title={t('currency.title')} showBack={true} showTabs={true}>
      <div
        className="px-4 py-6 pb-24 md:px-8 md:py-8 md:pb-10 md:max-w-xl md:mx-auto space-y-5"
        style={{ backgroundColor: T.cream }}
      >

        {/* Título estilizado — mobile */}
        <div className="flex items-center gap-2 md:hidden">
          <div style={{ width: '3px', height: '22px', backgroundColor: T.gold, borderRadius: '2px', flexShrink: 0 }} />
          <h1 className="text-xl font-bold tracking-tight" style={{ color: T.navy }}>
            {t('currency.title')}
          </h1>
        </div>

        {/* Info Banner */}
        <div
          className="rounded-2xl p-4 flex items-start gap-3"
          style={{ backgroundColor: T.goldPale, border: `1px solid rgba(201,168,76,0.35)` }}
        >
          <span className="text-2xl flex-shrink-0">💡</span>
          <div>
            <h3 className="text-sm font-bold mb-0.5" style={{ color: T.navy }}>
              {t('currency.infoTitle')}
            </h3>
            <p className="text-xs leading-relaxed" style={{ color: T.navy, opacity: 0.75 }}>
              {t('currency.infoDescription')}
            </p>
          </div>
        </div>

        {/* Preview de moneda seleccionada */}
        {selectedCurrencyData && (
          <div
            className="rounded-2xl p-5 shadow-sm text-center"
            style={{ backgroundColor: T.white, border: `1px solid ${T.border}` }}
          >
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl font-bold mx-auto mb-3"
              style={{
                background: `linear-gradient(135deg, ${T.gold} 0%, ${T.goldLight} 100%)`,
                color: T.navy,
                boxShadow: '0 2px 12px rgba(201,168,76,0.3)',
              }}
            >
              {selectedCurrencyData.symbol}
            </div>
            <h2 className="text-2xl font-bold mb-0.5" style={{ color: T.navy }}>
              {selectedCurrencyData.code}
            </h2>
            <p className="text-sm" style={{ color: T.muted }}>{selectedCurrencyData.name}</p>
            {selectedCurrency === agentDefaultCurrency && (
              <div className="mt-3">
                <span
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold"
                  style={{ backgroundColor: T.greenBg, color: T.green, border: `1px solid ${T.greenBorder}` }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: T.green }} />
                  {t('currency.currentCurrency')}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Opciones de moneda */}
        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider px-1" style={{ color: T.muted }}>
            {t('currency.selectCurrency')}
          </p>

          {currencies.map((currency) => (
            <button
              key={currency.id}
              onClick={() => setSelectedCurrency(currency.id)}
              className="w-full rounded-2xl p-4 shadow-sm active:scale-[0.98] transition-all text-left"
              style={{
                backgroundColor: T.white,
                border: `${selectedCurrency === currency.id ? '2px' : '1px'} solid ${selectedCurrency === currency.id ? T.navy : T.border}`,
                boxShadow: selectedCurrency === currency.id
                  ? `0 0 0 3px rgba(27,45,91,0.08), 0 2px 8px rgba(27,45,91,0.08)`
                  : '0 1px 4px rgba(27,45,91,0.05)',
              }}
            >
              <div className="flex items-center gap-4">
                {/* Símbolo en contenedor */}
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl font-bold flex-shrink-0"
                  style={{
                    backgroundColor: selectedCurrency === currency.id ? T.goldPale : T.cream,
                    border: `1px solid ${selectedCurrency === currency.id ? 'rgba(201,168,76,0.35)' : T.border}`,
                    color: T.navy,
                  }}
                >
                  {currency.symbol}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <h3 className="text-base font-bold" style={{ color: T.navy }}>
                      {currency.code}
                    </h3>
                    {currency.is_default && (
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                        style={{ backgroundColor: T.goldPale, color: T.navy, border: `1px solid rgba(201,168,76,0.35)` }}
                      >
                        {t('currency.system')}
                      </span>
                    )}
                    {currency.id === agentDefaultCurrency && (
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                        style={{ backgroundColor: T.greenBg, color: T.green, border: `1px solid ${T.greenBorder}` }}
                      >
                        {t('currency.yourDefault')}
                      </span>
                    )}
                  </div>
                  <p className="text-sm" style={{ color: T.muted }}>{currency.name}</p>
                </div>

                {/* Check */}
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
                  style={{
                    backgroundColor: selectedCurrency === currency.id ? T.navy : 'transparent',
                    border: `2px solid ${selectedCurrency === currency.id ? T.navy : T.border}`,
                  }}
                >
                  {selectedCurrency === currency.id && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 13l4 4L19 7"/>
                    </svg>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Info adicional */}
        <div
          className="rounded-xl p-4"
          style={{ backgroundColor: T.white, border: `1px solid ${T.border}` }}
        >
          <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: T.muted }}>
            📊 {t('currency.important')}
          </p>
          <ul className="space-y-1.5">
            {[
              t('currency.note1'),
              t('currency.note2'),
              t('currency.note3'),
              t('currency.note4'),
            ].map((note, i) => (
              <li key={i} className="flex items-start gap-2 text-xs" style={{ color: T.muted }}>
                <span className="flex-shrink-0 mt-0.5" style={{ color: T.gold }}>•</span>
                {note}
              </li>
            ))}
          </ul>
        </div>

        {/* Botón guardar */}
        <button
          onClick={handleSave}
          disabled={saving || selectedCurrency === agentDefaultCurrency}
          className="w-full py-4 rounded-xl font-bold text-sm shadow-sm active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            background: `linear-gradient(135deg, ${T.gold} 0%, ${T.goldLight} 100%)`,
            color: T.navy,
            boxShadow: '0 2px 8px rgba(201,168,76,0.3)',
          }}
        >
          {saving ? `⏳ ${t('currency.saving')}` : `💾 ${t('currency.saveButton')}`}
        </button>

      </div>
    </AppLayout>
  );
}