'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { useTranslation } from '@/hooks/useTranslation';
import { useI18nStore } from '@/lib/i18n-store';

interface LanguageOption {
  code: 'es' | 'en';
  name: string;
  nativeName: string;
}

// SVG banderas inline — igual que en edit-property y landing
const FlagES = ({ size = 28 }: { size?: number }) => (
  <svg width={size} height={Math.round(size * 0.7)} viewBox="0 0 20 14" style={{ borderRadius: '3px', flexShrink: 0 }} aria-hidden="true">
    <rect width="20" height="14" fill="#c60b1e"/>
    <rect y="3.5" width="20" height="7" fill="#ffc400"/>
  </svg>
);

const FlagEN = ({ size = 28 }: { size?: number }) => (
  <svg width={size} height={Math.round(size * 0.7)} viewBox="0 0 20 14" style={{ borderRadius: '3px', flexShrink: 0 }} aria-hidden="true">
    <rect width="20" height="14" fill="#B22234"/>
    <rect y="1.08" width="20" height="1.08" fill="#FFFFFF"/>
    <rect y="3.23" width="20" height="1.08" fill="#FFFFFF"/>
    <rect y="5.38" width="20" height="1.08" fill="#FFFFFF"/>
    <rect y="7.54" width="20" height="1.08" fill="#FFFFFF"/>
    <rect y="9.69" width="20" height="1.08" fill="#FFFFFF"/>
    <rect y="11.85" width="20" height="1.08" fill="#FFFFFF"/>
    <rect width="8" height="7.54" fill="#3C3B6E"/>
  </svg>
);

export default function LanguageSettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { t } = useTranslation();
  const { language, setLanguage } = useI18nStore();

  const [selectedLanguage, setSelectedLanguage] = useState<'es' | 'en'>(language);
  const [agentLanguage, setAgentLanguage] = useState<'es' | 'en'>(language);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const languages: LanguageOption[] = [
    { code: 'es', name: 'Spanish', nativeName: 'Español' },
    { code: 'en', name: 'English', nativeName: 'English' },
  ];

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
      const response = await fetch('/api/user/language');
      if (response.ok) {
        const data = await response.json();
        const currentLang = data.language || 'es';
        setAgentLanguage(currentLang);
        setSelectedLanguage(currentLang);
        setLanguage(currentLang);
      }
    } catch (error) {
      console.error('Error al cargar configuración:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (selectedLanguage === agentLanguage) {
      alert(t('settings.options.language.alreadySelected'));
      return;
    }

    setSaving(true);

    try {
      const response = await fetch('/api/user/language', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: selectedLanguage }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al actualizar');
      }

      const data = await response.json();
      setLanguage(selectedLanguage);
      setAgentLanguage(selectedLanguage);
      alert(`✅ ${data.message}`);
      router.back();

    } catch (error: any) {
      console.error('Error saving language:', error);
      alert(`❌ Error: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AppLayout title={t('settings.options.language.title')} showBack={true} showTabs={true}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center py-12">
            <div className="text-5xl mb-4 animate-pulse">🌐</div>
            <div className="text-lg" style={{ color: '#0F172A' }}>
              {t('common.loading')}
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={t('settings.options.language.title')} showBack={true} showTabs={true}>
      {/*
        mobile:  1 columna, igual que antes
        tablet+: contenido centrado con max-w-xl
      */}
      <div className="px-4 py-6 md:px-8 md:py-8 md:max-w-xl md:mx-auto space-y-6">

        {/* Info Banner */}
        <div
          className="rounded-2xl p-4 border-2"
          style={{ backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }}
        >
          <div className="flex items-start gap-3">
            <span className="text-3xl">💡</span>
            <div className="flex-1">
              <h3 className="font-bold mb-1" style={{ color: '#1E40AF' }}>
                {t('settings.options.language.infoTitle')}
              </h3>
              <p className="text-sm" style={{ color: '#1E40AF' }}>
                {t('settings.options.language.infoDescription')}
              </p>
            </div>
          </div>
        </div>

        {/* Current Selection Preview */}
        <div className="rounded-2xl p-5 shadow-lg" style={{ backgroundColor: '#FFFFFF' }}>
          <div className="text-center">
            <div className="flex justify-center mb-3">
              {selectedLanguage === 'es' ? <FlagES size={56} /> : <FlagEN size={56} />}
            </div>
            <h2 className="text-2xl font-bold mb-1" style={{ color: '#0F172A' }}>
              {selectedLanguage === 'es' ? 'Español' : 'English'}
            </h2>
            <p className="text-sm opacity-70" style={{ color: '#0F172A' }}>
              {selectedLanguage === 'es' ? 'Spanish' : 'English'}
            </p>
            {selectedLanguage === agentLanguage && (
              <div className="mt-3">
                <span
                  className="inline-block px-3 py-1 rounded-full text-xs font-bold"
                  style={{ backgroundColor: '#10B981', color: '#FFFFFF' }}
                >
                  ✓ {t('settings.options.language.currentLanguage')}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Language Options */}
        <div className="space-y-3">
          <h3 className="font-bold text-lg" style={{ color: '#0F172A' }}>
            {t('settings.options.language.selectTitle')}
          </h3>

          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => setSelectedLanguage(lang.code)}
              className="w-full rounded-2xl p-4 shadow-lg active:scale-98 transition-transform border-2 text-left"
              style={{
                backgroundColor: '#FFFFFF',
                borderColor: selectedLanguage === lang.code ? '#2563EB' : '#E5E7EB',
              }}
            >
              <div className="flex items-center gap-4">
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center shadow-sm flex-shrink-0"
                  style={{ backgroundColor: selectedLanguage === lang.code ? '#DBEAFE' : '#F3F4F6' }}
                >
                  {lang.code === 'es' ? <FlagES size={32} /> : <FlagEN size={32} />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-lg" style={{ color: '#0F172A' }}>
                      {lang.nativeName}
                    </h3>
                    {lang.code === agentLanguage && (
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-bold"
                        style={{ backgroundColor: '#D1FAE5', color: '#065F46' }}
                      >
                        {t('settings.options.language.yourDefault')}
                      </span>
                    )}
                  </div>
                  <p className="text-sm opacity-70" style={{ color: '#0F172A' }}>
                    {lang.name}
                  </p>
                </div>

                {selectedLanguage === lang.code && (
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
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
          <p className="font-semibold mb-1">📊 {t('settings.options.language.important')}:</p>
          <ul className="space-y-1 text-xs opacity-90">
            <li>• {t('settings.options.language.note1')}</li>
            <li>• {t('settings.options.language.note2')}</li>
            <li>• {t('settings.options.language.note3')}</li>
          </ul>
        </div>

        {/* Save Button */}
        <div className="border-t pt-4 space-y-2" style={{ borderColor: '#E5E7EB' }}>
          <button
            onClick={handleSave}
            disabled={saving || selectedLanguage === agentLanguage}
            className="w-full py-4 rounded-xl font-bold text-white shadow-lg active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#2563EB' }}
          >
            {saving ? `⏳ ${t('common.loading')}...` : `💾 ${t('settings.options.language.saveButton')}`}
          </button>
        </div>

      </div>
    </AppLayout>
  );
}