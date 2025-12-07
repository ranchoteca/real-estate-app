'use client';

import { Suspense } from 'react';
import FacebookSettingsContent from './FacebookSettingsContent';
import { useTranslation } from '@/hooks/useTranslation';

function LoadingFallback() {
  const { t } = useTranslation();
  
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F5EAD3' }}>
      <div className="text-center">
        <div className="text-5xl mb-4 animate-pulse">📘</div>
        <div className="text-lg" style={{ color: '#0F172A' }}>
          {t('facebook.loading')}
        </div>
      </div>
    </div>
  );
}

export default function FacebookSettingsPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <FacebookSettingsContent />
    </Suspense>
  );
}