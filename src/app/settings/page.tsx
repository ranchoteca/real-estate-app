'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import MobileLayout from '@/components/MobileLayout';

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <MobileLayout title="Ajustes" showTabs={true}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center py-12">
            <div className="text-5xl mb-4 animate-pulse">⚙️</div>
            <div className="text-lg" style={{ color: '#0F172A' }}>Cargando...</div>
          </div>
        </div>
      </MobileLayout>
    );
  }

  if (!session) {
    return null;
  }

  const settingsOptions = [
    {
      icon: '💰',
      title: 'Divisa por Defecto',
      description: 'Configura la moneda de tus propiedades',
      href: '/settings/currency',
      color: '#F59E0B',
    },
    {
      icon: '🎨',
      title: 'Logo Personalizado',
      description: 'Configura tu marca en las fotos',
      href: '/settings/watermark',
      color: '#8B5CF6',
    },
    {
      icon: '📇',
      title: 'Tarjeta Digital',
      description: 'Configura tu tarjeta de presentación',
      href: '/settings/digital-card',
      color: '#6366F1',
    },
    {
      icon: '🏷️',
      title: 'Campos Personalizados',
      description: 'Configura campos para cada tipo de propiedad',
      href: '/settings/custom-fields',
      color: '#2563EB',
    },
    {
      icon: '📘',
      title: 'Facebook (BETA)',
      description: 'Publica automáticamente tus propiedades',
      href: '/settings/facebook',
      color: '#1877F2',
    },
    {
      icon: '🔗',
      title: 'Mi Portfolio',
      description: 'Ver tu portfolio público',
      href: session.user.username ? `/agent/${session.user.username}` : '/profile',
      color: '#10B981',
      disabled: !session.user.username,
    },
    {
      icon: '📥',
      title: 'Exportar Propiedades',
      description: 'Descarga tus propiedades en CSV',
      action: 'export',
      color: '#F59E0B',
    },
    {
      icon: '💳',
      title: 'Plan y Facturación',
      description: 'Administrar suscripción',
      href: '/pricing',
      color: '#EC4899',
    },
  ];

  const handleExport = async () => {
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
  };

  const handleOptionClick = (option: typeof settingsOptions[0]) => {
    if (option.action === 'export') {
      handleExport();
    } else if (option.href) {
      if (option.disabled) {
        alert('⚠️ Primero configura tu username en tu perfil');
      } else {
        router.push(option.href);
      }
    }
  };

  return (
    <MobileLayout title="Ajustes" showTabs={true}>
      <div className="px-4 pt-4 pb-6 space-y-4">
        {/* Header Info */}
        <div 
          className="rounded-2xl p-5 shadow-lg"
          style={{ backgroundColor: '#FFFFFF' }}
        >
          <div className="flex items-center gap-4">
            <div 
              className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white shadow-lg"
              style={{ backgroundColor: '#2563EB' }}
            >
              {session.user.name?.charAt(0).toUpperCase() || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold truncate" style={{ color: '#0F172A' }}>
                {session.user.name || 'Usuario'}
              </h2>
              <p className="text-sm opacity-70 truncate" style={{ color: '#0F172A' }}>
                {session.user.email}
              </p>
              <div className="mt-2">
                <span 
                  className="inline-block px-3 py-1 rounded-full text-xs font-bold text-white"
                  style={{ backgroundColor: session.user.plan === 'pro' ? '#10B981' : '#6B7280' }}
                >
                  {session.user.plan === 'pro' ? '⭐ Plan Pro' : '🆓 Plan Free'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Settings Options */}
        <div className="space-y-3">
          {settingsOptions.map((option, index) => (
            <button
              key={index}
              onClick={() => handleOptionClick(option)}
              className="w-full rounded-2xl p-5 shadow-lg active:scale-98 transition-transform disabled:opacity-50"
              style={{ backgroundColor: '#FFFFFF' }}
              disabled={option.disabled}
            >
              <div className="flex items-center gap-4">
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-sm"
                  style={{ backgroundColor: `${option.color}20` }}
                >
                  {option.icon}
                </div>
                <div className="flex-1 text-left">
                  <h3 className="font-bold mb-0.5" style={{ color: '#0F172A' }}>
                    {option.title}
                    {option.disabled && <span className="text-xs ml-2 opacity-50">(Configura username)</span>}
                  </h3>
                  <p className="text-sm opacity-70" style={{ color: '#0F172A' }}>
                    {option.description}
                  </p>
                </div>
                <svg 
                  className="w-6 h-6 opacity-50" 
                  fill="none" 
                  stroke="#0F172A" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M9 5l7 7-7 7" 
                  />
                </svg>
              </div>
            </button>
          ))}
        </div>
      </div>
    </MobileLayout>
  );
}