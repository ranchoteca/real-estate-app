'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import MobileLayout from '@/components/MobileLayout';

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [brokerage, setBrokerage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user) {
      setUsername(session.user.username || '');
      setFullName(session.user.fullName || session.user.name || '');
      setPhone(session.user.phone || '');
      setBrokerage(session.user.brokerage || '');
    }
  }, [session]);

  if (status === 'loading') {
    return (
      <MobileLayout title="Perfil" showTabs={true}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center py-12">
            <div className="text-5xl mb-4 animate-pulse">👤</div>
            <div className="text-lg" style={{ color: '#0F172A' }}>Cargando...</div>
          </div>
        </div>
      </MobileLayout>
    );
  }

  if (!session) {
    return null;
  }

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/agent/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          fullName,
          phone,
          brokerage,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al guardar');
      }

      alert('✅ Perfil actualizado');
      
      // Recargar sesión
      window.location.reload();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    if (confirm('¿Cerrar sesión?')) {
      signOut({ callbackUrl: '/login' });
    }
  };

  return (
    <MobileLayout title="Mi Perfil" showTabs={true}>
      <div className="px-4 pt-4 pb-6 space-y-4">
        {/* Profile Header */}
        <div 
          className="rounded-2xl p-6 text-center shadow-lg"
          style={{ backgroundColor: '#FFFFFF' }}
        >
          <div 
            className="w-24 h-24 rounded-full mx-auto mb-4 flex items-center justify-center text-4xl shadow-lg"
            style={{ backgroundColor: '#2563EB' }}
          >
            <span className="text-white font-bold">
              {session.user.name?.charAt(0).toUpperCase()}
            </span>
          </div>
          <h2 className="text-2xl font-bold mb-1" style={{ color: '#0F172A' }}>
            {session.user.name}
          </h2>
          <p className="text-sm opacity-70" style={{ color: '#0F172A' }}>
            {session.user.email}
          </p>
        </div>

        {/* Stats Card */}
        <div 
          className="rounded-2xl p-5 shadow-lg"
          style={{ backgroundColor: '#FFFFFF' }}
        >
          <div className="flex justify-around text-center">
            <div>
              <p className="text-2xl font-bold" style={{ color: '#2563EB' }}>
                {session.user.credits}
              </p>
              <p className="text-sm opacity-70" style={{ color: '#0F172A' }}>
                Créditos
              </p>
            </div>
            <div className="border-l" style={{ borderColor: '#E5E7EB' }} />
            <div>
              <p className="text-2xl font-bold" style={{ color: '#2563EB' }}>
                {username ? '✓' : '○'}
              </p>
              <p className="text-sm opacity-70" style={{ color: '#0F172A' }}>
                Username
              </p>
            </div>
          </div>
        </div>

        {/* Profile Form */}
        <div 
          className="rounded-2xl p-5 shadow-lg"
          style={{ backgroundColor: '#FFFFFF' }}
        >
          <h3 className="font-bold mb-4 text-lg" style={{ color: '#0F172A' }}>
            Información del Agente
          </h3>

          <div className="space-y-4">
            {/* Username */}
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#0F172A' }}>
                Username único
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                placeholder="tu-username"
                className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none transition-colors"
                style={{ 
                  borderColor: '#E5E7EB',
                  backgroundColor: '#F9FAFB'
                }}
              />
              <p className="text-xs mt-1 opacity-70" style={{ color: '#0F172A' }}>
                {username && `Tu portfolio: /agent/${username}`}
              </p>
            </div>

            {/* Full Name */}
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#0F172A' }}>
                Nombre completo
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Juan Pérez"
                className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none transition-colors"
                style={{ 
                  borderColor: '#E5E7EB',
                  backgroundColor: '#F9FAFB'
                }}
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#0F172A' }}>
                Teléfono
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+506 1234-5678"
                className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none transition-colors"
                style={{ 
                  borderColor: '#E5E7EB',
                  backgroundColor: '#F9FAFB'
                }}
              />
            </div>

            {/* Brokerage */}
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#0F172A' }}>
                Inmobiliaria
              </label>
              <input
                type="text"
                value={brokerage}
                onChange={(e) => setBrokerage(e.target.value)}
                placeholder="Century 21"
                className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none transition-colors"
                style={{ 
                  borderColor: '#E5E7EB',
                  backgroundColor: '#F9FAFB'
                }}
              />
            </div>

            {/* Save Button */}
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-3 rounded-xl font-bold text-white shadow-lg active:scale-95 transition-transform disabled:opacity-50"
              style={{ backgroundColor: '#2563EB' }}
            >
              {saving ? 'Guardando...' : '💾 Guardar Cambios'}
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          {session.user.plan === 'free' && (
            <button
              onClick={() => router.push('/pricing')}
              className="w-full py-3 rounded-xl font-bold shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2 text-white"
              style={{ backgroundColor: '#2563EB' }}
            >
              <span>⭐</span> Actualizar a Pro
            </button>
          )}

          {username && (
            <button
              onClick={() => router.push(`/agent/${username}`)}
              className="w-full py-3 rounded-xl font-bold shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2"
              style={{ backgroundColor: '#FFFFFF', color: '#0F172A' }}
            >
              <span>🔗</span> Ver Mi Portfolio
            </button>
          )}

          <button
            onClick={async () => {
              try {
                const response = await fetch('/api/agent/export-csv');
                if (!response.ok) throw new Error('Error al exportar');
                
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `mis-propiedades-${new Date().toISOString().split('T')[0]}.csv`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                
                alert('✅ Propiedades exportadas exitosamente');
              } catch (error) {
                alert('Error al exportar. Intenta nuevamente.');
              }
            }}
            className="w-full py-3 rounded-xl font-bold shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2"
            style={{ backgroundColor: '#FFFFFF', color: '#0F172A' }}
          >
            <span>📥</span> Exportar Mis Propiedades (CSV)
          </button>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="w-full py-3 rounded-xl font-bold shadow-lg active:scale-95 transition-transform border-2"
          style={{ 
            borderColor: '#DC2626',
            color: '#DC2626',
            backgroundColor: '#FFFFFF'
          }}
        >
          🚪 Cerrar Sesión
        </button>

        {/* App Info */}
        <div className="text-center pt-6 pb-4 opacity-50">
          <p className="text-xs" style={{ color: '#0F172A' }}>
            Real Estate AI • v1.0.0
          </p>
        </div>
      </div>
    </MobileLayout>
  );
}