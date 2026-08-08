'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { useI18nStore } from '@/lib/i18n-store';

const T = {
  navy:      '#1B2D5B',
  navyMid:   '#243770',
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

interface FlowIAConfig {
  whatsapp_number: string;
  wasender_api_key: string;
  wasender_instance_id: string;
  is_active: boolean;
  welcome_message: string;
  language: 'es' | 'en';
}

export default function FlowIASettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { language } = useI18nStore();

  const [config, setConfig] = useState<FlowIAConfig>({
    whatsapp_number: '',
    wasender_api_key: '',
    wasender_instance_id: '',
    is_active: false,
    welcome_message: '',
    language: 'es',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [activeTab, setActiveTab] = useState<'config' | 'commands'>('config');

  const copy = {
    title:          language === 'en' ? 'FlowIA Assistant' : 'Asistente FlowIA',
    subtitle:       language === 'en' ? 'Configure your WhatsApp bot' : 'Configura tu bot de WhatsApp',
    tabConfig:      language === 'en' ? 'Configuration' : 'Configuración',
    tabCommands:    language === 'en' ? 'Commands' : 'Comandos',
    statusActive:   language === 'en' ? 'Active' : 'Activo',
    statusInactive: language === 'en' ? 'Inactive' : 'Inactivo',
    enableBot:      language === 'en' ? 'Enable WhatsApp bot' : 'Activar bot de WhatsApp',
    phoneLabel:     language === 'en' ? 'WhatsApp Number' : 'Número de WhatsApp',
    phoneTip:       language === 'en' ? 'Include country code: +506...' : 'Incluye código de país: +506...',
    apiKeyLabel:    language === 'en' ? 'Wasender API Key' : 'API Key de Wasender',
    apiKeyTip:      language === 'en' ? 'From your Wasender dashboard' : 'Desde tu panel de Wasender',
    instanceLabel:  language === 'en' ? 'Instance ID' : 'ID de Instancia',
    instanceTip:    language === 'en' ? 'Your WhatsApp instance identifier' : 'El identificador de tu instancia de WhatsApp',
    welcomeLabel:   language === 'en' ? 'Welcome Message' : 'Mensaje de Bienvenida',
    welcomePlaceholder: language === 'en'
      ? 'Hello! I am your FlowIA assistant. How can I help you?'
      : '¡Hola! Soy tu asistente FlowIA. ¿En qué puedo ayudarte?',
    botLang:        language === 'en' ? 'Bot Language' : 'Idioma del Bot',
    save:           language === 'en' ? 'Save Changes' : 'Guardar Cambios',
    saving:         language === 'en' ? 'Saving...' : 'Guardando...',
    savedOk:        language === 'en' ? '✅ Saved!' : '✅ ¡Guardado!',
    commandsTitle:  language === 'en' ? 'Available Commands' : 'Comandos Disponibles',
    commandsDesc:   language === 'en' ? 'These commands work when your clients send them via WhatsApp' : 'Estos comandos funcionan cuando tus clientes los envían por WhatsApp',
    tip:            language === 'en' ? 'Tip' : 'Tip',
    wasenderNote:   language === 'en'
      ? 'You need a Wasender account to connect your WhatsApp number. Get your credentials at wasender.app'
      : 'Necesitas una cuenta en Wasender para conectar tu número de WhatsApp. Obtén tus credenciales en wasender.app',
  };

  const commands = [
    { cmd: '/propiedades', desc: language === 'en' ? 'Lists all your active properties' : 'Lista todas tus propiedades activas' },
    { cmd: '/buscar [keyword]', desc: language === 'en' ? 'Searches properties by keyword' : 'Busca propiedades por palabra clave' },
    { cmd: '/propiedad [id]', desc: language === 'en' ? 'Shows details of a specific property' : 'Muestra detalles de una propiedad específica' },
    { cmd: '/crear', desc: language === 'en' ? 'Starts the property creation flow' : 'Inicia el flujo de creación de propiedad' },
    { cmd: '/ayuda', desc: language === 'en' ? 'Shows the list of available commands' : 'Muestra la lista de comandos disponibles' },
  ];

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
    else if (status === 'authenticated') loadConfig();
  }, [status, router]);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/flowia/config');
      if (response.ok) {
        const data = await response.json();
        if (data.config) setConfig(data.config);
      }
    } catch (error) {
      console.error('Error loading FlowIA config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/flowia/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (!response.ok) throw new Error('Error al guardar');
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      alert(language === 'en' ? 'Error saving configuration' : 'Error al guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  // ── UI helpers ────────────────────────────────────────────────────────────

  const SectionCard = ({ children }: { children: React.ReactNode }) => (
    <div className="rounded-2xl p-5 shadow-sm" style={{ backgroundColor: T.white, border: `1px solid ${T.border}` }}>
      {children}
    </div>
  );

  const FieldLabel = ({ label, tip }: { label: string; tip?: string }) => (
    <div className="mb-1.5">
      <label className="block text-xs font-bold uppercase tracking-wider" style={{ color: T.muted }}>{label}</label>
      {tip && <p className="text-xs mt-0.5" style={{ color: T.muted }}>{tip}</p>}
    </div>
  );

  const StyledInput = ({ value, onChange, placeholder, type = 'text' }: {
    value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
  }) => (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none transition-colors"
      style={{ border: `1.5px solid ${T.border}`, backgroundColor: T.cream, color: T.charcoal }}
    />
  );

  if (loading) {
    return (
      <AppLayout title={copy.title} showBack={true} showTabs={true}>
        <div className="flex items-center justify-center h-full" style={{ backgroundColor: T.cream }}>
          <div className="text-center py-12">
            <div className="text-5xl mb-4 animate-pulse">🤖</div>
            <div className="text-base font-medium" style={{ color: T.muted }}>
              {language === 'en' ? 'Loading...' : 'Cargando...'}
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={copy.title} showBack={true} showTabs={true}>
      <div className="px-4 pt-4 pb-24 md:px-8 md:pt-6 md:pb-10 md:max-w-2xl md:mx-auto" style={{ backgroundColor: T.cream }}>

        {/* Título estilizado — mobile */}
        <div className="flex items-center gap-2 mb-4 md:hidden">
          <div style={{ width: '3px', height: '22px', backgroundColor: T.gold, borderRadius: '2px', flexShrink: 0 }} />
          <h1 className="text-xl font-bold tracking-tight" style={{ color: T.navy }}>{copy.title}</h1>
        </div>

        {/* Hero card */}
        <div
          className="rounded-2xl p-5 mb-4 shadow-sm"
          style={{ backgroundColor: T.navy }}
        >
          <div className="flex items-start gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0"
              style={{ backgroundColor: 'rgba(201,168,76,0.15)', border: `1px solid rgba(201,168,76,0.3)` }}
            >
              🤖
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h2 className="text-base font-bold text-white">{copy.title}</h2>
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                  style={{
                    backgroundColor: config.is_active ? 'rgba(21,128,61,0.2)' : 'rgba(255,255,255,0.1)',
                    color: config.is_active ? '#86EFAC' : 'rgba(255,255,255,0.5)',
                    border: `1px solid ${config.is_active ? 'rgba(134,239,172,0.4)' : 'rgba(255,255,255,0.15)'}`,
                  }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: config.is_active ? '#86EFAC' : 'rgba(255,255,255,0.4)' }}
                  />
                  {config.is_active ? copy.statusActive : copy.statusInactive}
                </span>
              </div>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.55)' }}>{copy.subtitle}</p>
            </div>
          </div>

          {/* Toggle activar/desactivar */}
          <div
            className="flex items-center justify-between mt-4 pt-4"
            style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
          >
            <span className="text-sm font-medium text-white">{copy.enableBot}</span>
            <button
              onClick={() => setConfig(prev => ({ ...prev, is_active: !prev.is_active }))}
              className="relative flex-shrink-0 transition-colors duration-200"
              style={{
                width: '48px', height: '26px', borderRadius: '100px',
                backgroundColor: config.is_active ? T.gold : 'rgba(255,255,255,0.2)',
                border: 'none', cursor: 'pointer', padding: 0,
              }}
            >
              <span
                className="absolute transition-transform duration-200"
                style={{
                  top: '4px', left: '4px', width: '18px', height: '18px',
                  borderRadius: '50%', backgroundColor: T.white,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                  transform: config.is_active ? 'translateX(22px)' : 'translateX(0px)',
                  display: 'block',
                }}
              />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div
          className="flex rounded-xl p-1 mb-4"
          style={{ backgroundColor: T.white, border: `1px solid ${T.border}` }}
        >
          {(['config', 'commands'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
              style={{
                backgroundColor: activeTab === tab ? T.navy : 'transparent',
                color: activeTab === tab ? T.white : T.muted,
              }}
            >
              {tab === 'config' ? copy.tabConfig : copy.tabCommands}
            </button>
          ))}
        </div>

        {/* ── TAB: Configuración ── */}
        {activeTab === 'config' && (
          <div className="space-y-4">

            {/* Nota Wasender */}
            <div
              className="rounded-xl p-4 flex items-start gap-3"
              style={{ backgroundColor: T.goldPale, border: `1px solid rgba(201,168,76,0.35)` }}
            >
              <span className="text-lg flex-shrink-0">💡</span>
              <div>
                <p className="text-xs font-bold mb-0.5" style={{ color: T.navy }}>{copy.tip}</p>
                <p className="text-xs leading-relaxed" style={{ color: T.navy, opacity: 0.75 }}>
                  {copy.wasenderNote}{' '}
                  <a
                    href="https://wasender.app"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold underline"
                    style={{ color: T.navy }}
                  >
                    wasender.app
                  </a>
                </p>
              </div>
            </div>

            {/* Número de WhatsApp */}
            <SectionCard>
              <FieldLabel label={copy.phoneLabel} tip={copy.phoneTip} />
              <StyledInput
                value={config.whatsapp_number}
                onChange={(v) => setConfig(prev => ({ ...prev, whatsapp_number: v }))}
                placeholder="+50612345678"
              />
            </SectionCard>

            {/* API Key */}
            <SectionCard>
              <FieldLabel label={copy.apiKeyLabel} tip={copy.apiKeyTip} />
              <div className="relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={config.wasender_api_key}
                  onChange={(e) => setConfig(prev => ({ ...prev, wasender_api_key: e.target.value }))}
                  placeholder="sk-..."
                  className="w-full px-4 py-3 pr-12 rounded-xl text-sm focus:outline-none"
                  style={{ border: `1.5px solid ${T.border}`, backgroundColor: T.cream, color: T.charcoal }}
                />
                <button
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg transition-colors"
                  style={{ color: T.muted }}
                  type="button"
                >
                  {showApiKey ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </SectionCard>

            {/* Instance ID */}
            <SectionCard>
              <FieldLabel label={copy.instanceLabel} tip={copy.instanceTip} />
              <StyledInput
                value={config.wasender_instance_id}
                onChange={(v) => setConfig(prev => ({ ...prev, wasender_instance_id: v }))}
                placeholder="instance_xxx"
              />
            </SectionCard>

            {/* Idioma del bot */}
            <SectionCard>
              <FieldLabel label={copy.botLang} />
              <div className="flex gap-3">
                {(['es', 'en'] as const).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setConfig(prev => ({ ...prev, language: lang }))}
                    className="flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95"
                    style={{
                      backgroundColor: config.language === lang ? T.navy : T.cream,
                      color: config.language === lang ? T.white : T.muted,
                      border: `1.5px solid ${config.language === lang ? T.navy : T.border}`,
                    }}
                  >
                    {lang === 'es' ? (
                      <svg width="18" height="13" viewBox="0 0 20 14" style={{ borderRadius: '2px' }}>
                        <rect width="20" height="14" fill="#AA151B"/>
                        <rect y="3.5" width="20" height="7" fill="#F1BF00"/>
                      </svg>
                    ) : (
                      <svg width="18" height="13" viewBox="0 0 20 14" style={{ borderRadius: '2px' }}>
                        <rect width="20" height="14" fill="#B22234"/>
                        <rect y="1.08" width="20" height="1.08" fill="#FFF"/>
                        <rect y="3.23" width="20" height="1.08" fill="#FFF"/>
                        <rect y="5.38" width="20" height="1.08" fill="#FFF"/>
                        <rect y="7.54" width="20" height="1.08" fill="#FFF"/>
                        <rect y="9.69" width="20" height="1.08" fill="#FFF"/>
                        <rect y="11.85" width="20" height="1.08" fill="#FFF"/>
                        <rect width="8" height="7.54" fill="#3C3B6E"/>
                      </svg>
                    )}
                    {lang === 'es' ? 'Español' : 'English'}
                  </button>
                ))}
              </div>
            </SectionCard>

            {/* Mensaje de bienvenida */}
            <SectionCard>
              <FieldLabel label={copy.welcomeLabel} />
              <textarea
                value={config.welcome_message}
                onChange={(e) => setConfig(prev => ({ ...prev, welcome_message: e.target.value }))}
                placeholder={copy.welcomePlaceholder}
                rows={4}
                className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none"
                style={{ border: `1.5px solid ${T.border}`, backgroundColor: T.cream, color: T.charcoal, resize: 'vertical' }}
              />
            </SectionCard>

            {/* Guardar */}
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-4 rounded-xl font-bold text-sm shadow-sm active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              style={{
                background: saved
                  ? `linear-gradient(135deg, ${T.green} 0%, #16A34A 100%)`
                  : `linear-gradient(135deg, ${T.gold} 0%, ${T.goldLight} 100%)`,
                color: saved ? T.white : T.navy,
                boxShadow: '0 2px 8px rgba(201,168,76,0.3)',
              }}
            >
              {saving ? copy.saving : saved ? copy.savedOk : `💾 ${copy.save}`}
            </button>
          </div>
        )}

        {/* ── TAB: Comandos ── */}
        {activeTab === 'commands' && (
          <div className="space-y-3">
            <div
              className="rounded-xl p-4 flex items-start gap-3"
              style={{ backgroundColor: T.goldPale, border: `1px solid rgba(201,168,76,0.35)` }}
            >
              <span className="text-lg flex-shrink-0">ℹ️</span>
              <p className="text-xs leading-relaxed" style={{ color: T.navy, opacity: 0.8 }}>
                {copy.commandsDesc}
              </p>
            </div>

            {commands.map((item, i) => (
              <div
                key={i}
                className="rounded-xl p-4 flex items-start gap-3 shadow-sm"
                style={{ backgroundColor: T.white, border: `1px solid ${T.border}` }}
              >
                <div
                  className="px-2.5 py-1.5 rounded-lg flex-shrink-0"
                  style={{ backgroundColor: T.cream, border: `1px solid ${T.border}` }}
                >
                  <code className="text-xs font-bold" style={{ color: T.navy }}>{item.cmd}</code>
                </div>
                <p className="text-sm" style={{ color: T.muted }}>{item.desc}</p>
              </div>
            ))}
          </div>
        )}

      </div>
    </AppLayout>
  );
}