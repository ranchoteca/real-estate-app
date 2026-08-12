'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';

const T = {
  navy:      '#1B2D5B',
  gold:      '#C9A84C',
  goldLight: '#E8C96A',
  goldPale:  '#F5EDD8',
  cream:     '#F8F6F2',
  white:     '#FFFFFF',
  charcoal:  '#1A1A2E',
  muted:     '#6B7280',
  border:    '#E8E4DC',
  green:     '#15803D',
  greenBg:   '#F0FDF4',
  greenBorder:'#BBF7D0',
  red:       '#DC2626',
};

export default function FlowIASettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [isActive, setIsActive] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      // Bloqueo de seguridad por si un usuario free adivina la URL
      const isProUser = session.user.plan === 'pro' || session.user.role === 'admin';
      if (!isProUser) {
        router.push('/settings');
        return;
      }
      loadData();
    }
  }, [status, router, session]);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/agent/flowia');
      if (response.ok) {
        const data = await response.json();
        setPhoneNumber(data.whatsapp_number || '');
        setIsActive(data.is_flowia_active || false);
      }
    } catch (error) {
      console.error('Error al cargar configuración FlowIA:', error);
      alert('Error al cargar la configuración');
    } finally {
      setLoading(false);
    }
  };

  // Formato: + seguido del código de país y el número, todo pegado sin espacios (ej. +50688888888)
  const isValidWhatsAppFormat = (value: string) => /^\+\d{8,15}$/.test(value.trim());

  const handleSave = async () => {
    const trimmedPhone = phoneNumber.trim();

    if (!isValidWhatsAppFormat(trimmedPhone)) {
      setPhoneError('Formato inválido. Debe ser código de país + número pegado, sin espacios (ej. +50688888888)');
      return;
    }

    setPhoneError('');
    setSaving(true);
    try {
      const response = await fetch('/api/agent/flowia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          whatsapp_number: trimmedPhone,
          is_flowia_active: isActive
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al guardar');
      }

      alert('✅ Configuración de FlowIA guardada correctamente');
      router.back();
    } catch (error: any) {
      alert(`❌ Error: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AppLayout title="FlowIA Asistente" showBack={true} showTabs={true}>
        <div className="flex items-center justify-center h-full" style={{ backgroundColor: T.cream }}>
          <div className="text-center py-12">
            <div className="text-5xl mb-4 animate-bounce">🤖</div>
            <div className="text-base font-medium" style={{ color: T.muted }}>
              Cargando asistente...
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="FlowIA Asistente" showBack={true} showTabs={true}>
      <div
        className="px-4 py-6 pb-24 md:px-6 md:pb-10 md:max-w-5xl md:mx-auto md:grid md:grid-cols-2 md:gap-6 md:items-start lg:grid-cols-[1fr_420px] space-y-4 md:space-y-0"
        style={{ backgroundColor: T.cream }}
      >

        {/* Título estilizado — mobile */}
        <div className="flex items-center gap-2 md:hidden">
          <div style={{ width: '3px', height: '22px', backgroundColor: T.gold, borderRadius: '2px', flexShrink: 0 }} />
          <h1 className="text-xl font-bold tracking-tight" style={{ color: T.navy }}>FlowIA Asistente</h1>
        </div>

        {/* Info Banner — derecha en desktop, arriba en mobile */}
        <div
          className="rounded-2xl p-5 shadow-sm md:order-2 md:sticky md:top-4"
          style={{ backgroundColor: T.goldPale, border: `1px solid rgba(201,168,76,0.35)` }}
        >
          <div className="flex items-start gap-3">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
              style={{ backgroundColor: 'rgba(201,168,76,0.2)', border: `1px solid rgba(201,168,76,0.35)` }}
            >
              🤖
            </div>
            <div className="flex-1">
              <h3 className="font-bold mb-1.5" style={{ color: T.navy }}>
                Tu Asistente Virtual
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: T.navy, opacity: 0.75 }}>
                Ingresa tu número de WhatsApp para autorizarte en el sistema. Una vez activo, guárdanos en tus contactos y comienza a pedirle información a FlowIA.
              </p>
            </div>
          </div>
        </div>

        {/* Columna principal: formulario + guardar */}
        <div className="space-y-4 md:order-1">

          {/* Número de WhatsApp */}
          <div
            className="rounded-2xl p-5 shadow-sm"
            style={{ backgroundColor: T.white, border: `1px solid ${T.border}` }}
          >
            <label
              className="block text-xs font-bold uppercase tracking-wider mb-1.5"
              style={{ color: T.muted }}
            >
              Tu número de WhatsApp
            </label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => {
                setPhoneNumber(e.target.value);
                if (phoneError) setPhoneError('');
              }}
              placeholder="+50688888888"
              className="w-full rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none"
              style={{
                border: `1.5px solid ${phoneError ? T.red : T.border}`,
                backgroundColor: T.cream,
                color: T.charcoal,
              }}
            />
            <p className="text-xs mt-1.5" style={{ color: T.muted }}>
              Incluye el código de país (ej. +506)
            </p>
            {phoneError && (
              <p className="text-xs font-semibold mt-1.5" style={{ color: T.red }}>
                ⚠️ {phoneError}
              </p>
            )}
          </div>

          {/* Estado de FlowIA — toggle */}
          <div
            className="rounded-2xl p-5 shadow-sm flex items-center justify-between"
            style={{
              backgroundColor: T.white,
              border: `1.5px solid ${isActive ? T.greenBorder : T.border}`,
            }}
          >
            <div>
              <h3 className="font-bold text-sm mb-0.5" style={{ color: T.navy }}>
                Estado de FlowIA
              </h3>
              <p className="text-xs" style={{ color: T.muted }}>
                {isActive ? 'El bot responderá a tus mensajes' : 'El bot ignorará tus mensajes'}
              </p>
            </div>

            {/* Toggle Switch */}
            <button
              onClick={() => setIsActive(!isActive)}
              className="relative flex-shrink-0 transition-colors duration-200"
              style={{
                width: '48px', height: '26px', borderRadius: '100px',
                backgroundColor: isActive ? T.navy : T.border,
                border: 'none', cursor: 'pointer', padding: 0,
              }}
            >
              <span
                className="absolute transition-transform duration-200"
                style={{
                  top: '4px', left: '4px', width: '18px', height: '18px',
                  borderRadius: '50%', backgroundColor: isActive ? T.gold : T.white,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  transform: isActive ? 'translateX(22px)' : 'translateX(0px)',
                  display: 'block',
                }}
              />
            </button>
          </div>

          {/* Botón guardar */}
          <button
            onClick={handleSave}
            disabled={saving || !phoneNumber}
            className="w-full py-4 rounded-xl font-bold text-sm active:scale-95 transition-transform disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            style={{
              background: `linear-gradient(135deg, ${T.gold} 0%, ${T.goldLight} 100%)`,
              color: T.navy,
              boxShadow: '0 2px 8px rgba(201,168,76,0.3)',
            }}
          >
            {saving ? '⏳ Guardando...' : '💾 Guardar Configuración'}
          </button>

        </div>

        <div style={{ height: '80px' }} className="md:hidden"></div>
      </div>
    </AppLayout>
  );
}