'use client';

import { Suspense } from 'react';
import SocialSettingsContent from './SocialSettingsContent';
import { useI18nStore } from '@/lib/i18n-store';

function LoadingFallback() {
  const { language } = useI18nStore();

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F5EAD3' }}>
      <div className="text-center">
        <div className="text-5xl mb-4 animate-pulse">📱</div>
        <div className="text-lg" style={{ color: '#0F172A' }}>
          {language === 'en' ? 'Loading social networks...' : 'Cargando redes sociales...'}
        </div>
      </div>
    </div>
  );
}

export default function SocialSettingsPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <SocialSettingsContent />
    </Suspense>
  );
}