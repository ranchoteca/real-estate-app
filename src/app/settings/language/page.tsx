'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { useTranslation } from '@/hooks/useTranslation';
import { useI18nStore } from '@/lib/i18n-store';

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
};

interface LanguageOption {
  code: 'es' | 'en';
  name: string;
  nativeName: string;
}

// SVG banderas inline — sin emojis
const FlagES = ({ size = 32 }: { size?: number }) => (
  <svg width={size} height={Math.round(size * 0.7)} viewBox="0 0 20 14" style={{ borderRadius: '3px', flexShrink: 0 }} aria-hidden="true">
    <rect width="20" height="14" fill="#AA151B"/>
    <rect y="3.5" width="20" height="7" fill="#F1BF00"/>
  </svg>
);

const FlagEN = ({ size = 32 }: { size?: number }) => (
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
        <div className="flex items-center justify-center h-full" style={{ backgroundColor: T.cream }}>
          <div className="text-center py-12">
            <div className="text-5xl mb-4 animate-pulse">🌐</div>
            <div className="text-base font-medium" style={{ color: T.muted }}>{t('common.loading')}</div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={t('settings.options.language.title')} showBack={true} showTabs={true}>
      <div
        className="px-4 py-6 pb-24 md:px-8 md:py-8 md:pb-10 md:max-w-xl md:mx-auto space-y-5"
        style={{ backgroundColor: T.cream }}
      >

        {/* Título estilizado — mobile */}
        <div className="flex items-center gap-2 md:hidden">
          <div style={{ width: '3px', height: '22px', backgroundColor: T.gold, borderRadius: '2px', flexShrink: 0 }} />
          <h1 className="text-xl font-bold tracking-tight" style={{ color: T.navy }}>
            {t('settings.options.language.title')}
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
              {t('settings.options.language.infoTitle')}
            </h3>
            <p className="text-xs leading-relaxed" style={{ color: T.navy, opacity: 0.75 }}>
              {t('settings.options.language.infoDescription')}
            </p>
          </div>
        </div>

        {/* Preview del idioma seleccionado */}
        <div
          className="rounded-2xl p-5 shadow-sm text-center"
          style={{ backgroundColor: T.white, border: `1px solid ${T.border}` }}
        >
          <div className="flex justify-center mb-3">
            {selectedLanguage === 'es' ? <FlagES size={56} /> : <FlagEN size={56} />}
          </div>
          <h2 className="text-2xl font-bold mb-0.5" style={{ color: T.navy }}>
            {selectedLanguage === 'es' ? 'Español' : 'English'}
          </h2>
          <p className="text-sm" style={{ color: T.muted }}>
            {selectedLanguage === 'es' ? 'Spanish' : 'English'}
          </p>
          {selectedLanguage === agentLanguage && (
            <div className="mt-3">
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold"
                style={{ backgroundColor: T.greenBg, color: T.green, border: `1px solid ${T.greenBorder}` }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: T.green }} />
                {t('settings.options.language.currentLanguage')}
              </span>
            </div>
          )}
        </div>

        {/* Opciones de idioma */}
        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider px-1" style={{ color: T.muted }}>
            {t('settings.options.language.selectTitle')}
          </p>

          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => setSelectedLanguage(lang.code)}
              className="w-full rounded-2xl p-4 shadow-sm active:scale-[0.98] transition-all text-left"
              style={{
                backgroundColor: T.white,
                border: `${selectedLanguage === lang.code ? '2px' : '1px'} solid ${selectedLanguage === lang.code ? T.navy : T.border}`,
                boxShadow: selectedLanguage === lang.code
                  ? `0 0 0 3px rgba(27,45,91,0.08), 0 2px 8px rgba(27,45,91,0.08)`
                  : '0 1px 4px rgba(27,45,91,0.05)',
              }}
            >
              <div className="flex items-center gap-4">
                {/* Bandera en contenedor */}
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    backgroundColor: selectedLanguage === lang.code ? T.goldPale : T.cream,
                    border: `1px solid ${selectedLanguage === lang.code ? 'rgba(201,168,76,0.35)' : T.border}`,
                  }}
                >
                  {lang.code === 'es' ? <FlagES size={32} /> : <FlagEN size={32} />}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <h3 className="text-base font-bold" style={{ color: T.navy }}>
                      {lang.nativeName}
                    </h3>
                    {lang.code === agentLanguage && (
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                        style={{ backgroundColor: T.greenBg, color: T.green, border: `1px solid ${T.greenBorder}` }}
                      >
                        {t('settings.options.language.yourDefault')}
                      </span>
                    )}
                  </div>
                  <p className="text-sm" style={{ color: T.muted }}>{lang.name}</p>
                </div>

                {/* Check */}
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
                  style={{
                    backgroundColor: selectedLanguage === lang.code ? T.navy : 'transparent',
                    border: `2px solid ${selectedLanguage === lang.code ? T.navy : T.border}`,
                  }}
                >
                  {selectedLanguage === lang.code && (
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
            📊 {t('settings.options.language.important')}
          </p>
          <ul className="space-y-1.5">
            {[
              t('settings.options.language.note1'),
              t('settings.options.language.note2'),
              t('settings.options.language.note3'),
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
          disabled={saving || selectedLanguage === agentLanguage}
          className="w-full py-4 rounded-xl font-bold text-sm shadow-sm active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          style={{
            background: `linear-gradient(135deg, ${T.gold} 0%, ${T.goldLight} 100%)`,
            color: T.navy,
            boxShadow: '0 2px 8px rgba(201,168,76,0.3)',
          }}
        >
          {saving ? `⏳ ${t('common.loading')}...` : `💾 ${t('settings.options.language.saveButton')}`}
        </button>

      </div>
    </AppLayout>
  );
}