'use client';

import { Suspense } from 'react';
import FacebookSettingsContent from './FacebookSettingsContent';

export default function FacebookSettingsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F5EAD3' }}>
        <div className="text-center">
          <div className="text-5xl mb-4 animate-pulse">📘</div>
          <div className="text-lg" style={{ color: '#0F172A' }}>Cargando...</div>
        </div>
      </div>
    }>
      <FacebookSettingsContent />
    </Suspense>
  );
}
