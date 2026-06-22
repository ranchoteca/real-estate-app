'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import MobileLayout from '@/components/MobileLayout';

export default function FlowIASettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [phoneNumber, setPhoneNumber] = useState('');
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

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/agent/flowia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          whatsapp_number: phoneNumber,
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
      <MobileLayout title="FlowIA Asistente" showBack={true} showTabs={true}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center py-12">
            <div className="text-5xl mb-4 animate-bounce">🤖</div>
            <div className="text-lg" style={{ color: '#0F172A' }}>
              Cargando asistente...
            </div>
          </div>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout title="FlowIA Asistente" showBack={true} showTabs={true}>
      <div className="px-4 py-6 space-y-6">
        
        {/* Info Banner */}
        <div 
          className="rounded-2xl p-4 border-2"
          style={{ backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }}
        >
          <div className="flex items-start gap-3">
            <span className="text-3xl">💡</span>
            <div className="flex-1">
              <h3 className="font-bold mb-1" style={{ color: '#1E40AF' }}>
                Tu Asistente Virtual
              </h3>
              <p className="text-sm" style={{ color: '#1E40AF' }}>
                Ingresa tu número de WhatsApp para autorizarte en el sistema. Una vez activo, guárdanos en tus contactos y comienza a pedirle información a FlowIA.
              </p>
            </div>
          </div>
        </div>

        {/* Formulario */}
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="font-bold text-lg block" style={{ color: '#0F172A' }}>
              Tu número de WhatsApp
            </label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+50688888888"
              className="w-full rounded-xl p-4 border-2 shadow-sm focus:outline-none"
              style={{ borderColor: '#E5E7EB', backgroundColor: '#FFFFFF' }}
            />
            <p className="text-xs opacity-70">Incluye el código de país (ej. +506)</p>
          </div>

          <div 
            className="rounded-2xl p-4 shadow-lg border-2 flex items-center justify-between mt-4"
            style={{ 
              backgroundColor: '#FFFFFF',
              borderColor: isActive ? '#10B981' : '#E5E7EB'
            }}
          >
            <div>
              <h3 className="font-bold text-lg" style={{ color: '#0F172A' }}>
                Estado de FlowIA
              </h3>
              <p className="text-sm opacity-70" style={{ color: '#0F172A' }}>
                {isActive ? 'El bot responderá a tus mensajes' : 'El bot ignorará tus mensajes'}
              </p>
            </div>
            
            {/* Toggle Switch Simple */}
            <button
              onClick={() => setIsActive(!isActive)}
              className={`w-14 h-8 rounded-full flex items-center p-1 transition-colors ${isActive ? 'bg-green-500' : 'bg-gray-300'}`}
            >
              <div 
                className={`bg-white w-6 h-6 rounded-full shadow-md transform transition-transform ${isActive ? 'translate-x-6' : 'translate-x-0'}`} 
              />
            </button>
          </div>
        </div>

        {/* Save Button */}
        <div className="bottom-0 left-0 right-0 p-4 border-t space-y-2 mt-8" style={{ borderColor: '#E5E7EB' }}>
          <button
            onClick={handleSave}
            disabled={saving || !phoneNumber}
            className="w-full py-4 rounded-xl font-bold text-white shadow-lg active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#2563EB' }}
          >
            {saving ? '⏳ Guardando...' : '💾 Guardar Configuración'}
          </button>
        </div>

        <div style={{ height: '80px' }}></div>
      </div>
    </MobileLayout>
  );
}