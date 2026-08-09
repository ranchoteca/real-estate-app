'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
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
};

type TemplateStyle = 'minimalist' | 'dynamic' | 'organic' | 'beach' | 'mountain';

const TEMPLATES: {
  id: TemplateStyle;
  emoji: string;
  label_es: string;
  label_en: string;
  desc_es: string;
  desc_en: string;
  accent: string;
  bg: string;
  preview_bg: string;
}[] = [
  {
    id: 'minimalist',
    emoji: '🖤',
    label_es: 'Ejecutiva',
    label_en: 'Executive',
    desc_es: 'Tipografía serif, espacios blancos. Ideal para propiedades de alto valor.',
    desc_en: 'Serif typography, white space. Ideal for high-value properties.',
    accent: '#1A1714',
    bg: '#FAFAF8',
    preview_bg: '#F0EDE8',
  },
  {
    id: 'dynamic',
    emoji: '⚡',
    label_es: 'Comercial',
    label_en: 'Commercial',
    desc_es: 'Bloques de color, datos duros destacados. Ideal para alta rotación.',
    desc_en: 'Bold color blocks, key data highlighted. Ideal for high turnover.',
    accent: '#2563EB',
    bg: '#EFF6FF',
    preview_bg: '#1E293B',
  },
  {
    id: 'organic',
    emoji: '🌿',
    label_es: 'Natural',
    label_en: 'Natural',
    desc_es: 'Tonos tierra, bordes suaves. Ideal para playa y montaña.',
    desc_en: 'Earth tones, soft edges. Ideal for beach and mountain.',
    accent: '#4A3728',
    bg: '#F7F3EE',
    preview_bg: '#EDE8E0',
  },
  {
    id: 'beach',
    emoji: '🌊',
    label_es: 'Costera',
    label_en: 'Coastal',
    desc_es: 'Tonos oceánicos, luminosa. Ideal para propiedades frente al mar.',
    desc_en: 'Ocean tones, bright. Ideal for beachfront properties.',
    accent: '#0a6e7a',
    bg: '#fef6ec',
    preview_bg: '#e8f4f5',
  },
  {
    id: 'mountain',
    emoji: '🏔️',
    label_es: 'Alpina',
    label_en: 'Alpine',
    desc_es: 'Oscura y cinematográfica. Ideal para cabañas y refugios de montaña.',
    desc_en: 'Dark and cinematic. Ideal for cabins and mountain retreats.',
    accent: '#c8794a',
    bg: '#1c2a24',
    preview_bg: '#0e1612',
  },
];

export default function PortfolioTemplatePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { language } = useI18nStore();

  const [selected, setSelected] = useState<TemplateStyle>('minimalist');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status, router]);

  useEffect(() => {
    if (!session?.user?.email) return;
    if (!session?.user?.username) { setLoading(false); return; }
    fetch(`/api/agent/portfolio-template?username=${session.user.username}`)
      .then(res => res.json())
      .then(data => {
        if (data.template) setSelected(data.template);
        else if (data.portfolio_template) setSelected(data.portfolio_template);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [session]);

  const handleSave = async () => {
    setSaving(true); setSaved(false);
    try {
      const res = await fetch('/api/agent/portfolio-template', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ portfolio_template: selected }),
      });
      if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 3000); }
      else alert(language === 'en' ? 'Error saving template' : 'Error al guardar la plantilla');
    } catch {
      alert(language === 'en' ? 'Connection error' : 'Error de conexión');
    } finally { setSaving(false); }
  };

  if (status === 'loading' || loading) {
    return (
      <AppLayout title={language === 'en' ? 'Portfolio Template' : 'Plantilla del Portafolio'} showBack={true} showTabs={false}>
        <div className="flex items-center justify-center h-full" style={{ backgroundColor: T.cream }}>
          <div className="text-center py-12">
            <div className="text-5xl mb-4 animate-pulse">🎨</div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!session) return null;

  const selectedTpl = TEMPLATES.find(t => t.id === selected)!;

  // ── Mini preview SVG de cada plantilla ───────────────────────────────────
  const MiniPreview = ({ tpl, size = 'sm' }: { tpl: typeof TEMPLATES[0]; size?: 'sm' | 'lg' }) => (
    <div
      className="flex flex-col overflow-hidden"
      style={{
        backgroundColor: tpl.preview_bg,
        width: size === 'lg' ? '100%' : '80px',
        height: size === 'lg' ? '160px' : '80px',
        borderRadius: size === 'lg' ? '12px' : '8px',
        flexShrink: 0,
      }}
    >
      {/* Header simulado */}
      <div
        className="flex items-center justify-between px-2 py-1.5 flex-shrink-0"
        style={{ backgroundColor: tpl.accent, opacity: 0.9 }}
      >
        <div style={{ width: size === 'lg' ? '40px' : '20px', height: '3px', borderRadius: '2px', backgroundColor: 'rgba(255,255,255,0.7)' }} />
        <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.5)' }} />
      </div>
      {/* Foto simulada */}
      <div className="flex-1 flex items-center justify-center" style={{ backgroundColor: tpl.bg, opacity: 0.8 }}>
        <span style={{ fontSize: size === 'lg' ? '32px' : '18px' }}>🏠</span>
      </div>
      {/* Info simulada */}
      <div className="px-2 py-1.5 flex-shrink-0" style={{ backgroundColor: tpl.bg }}>
        <div style={{ width: '60%', height: '3px', borderRadius: '2px', backgroundColor: tpl.accent, opacity: 0.7, marginBottom: '3px' }} />
        <div style={{ width: '40%', height: '2px', borderRadius: '2px', backgroundColor: tpl.accent, opacity: 0.4 }} />
      </div>
    </div>
  );

  return (
    <AppLayout
      title={language === 'en' ? 'Portfolio Template' : 'Plantilla del Portafolio'}
      showBack={true}
      showTabs={false}
    >
      {/*
        mobile:  1 columna
        tablet+: 2 columnas — izquierda lista, derecha preview grande sticky
      */}
      <div
        className="px-4 pt-4 pb-24 md:pb-8 md:px-6 md:pt-6 md:grid md:grid-cols-2 md:gap-6 md:items-start lg:grid-cols-[1fr_340px]"
        style={{ backgroundColor: T.cream }}
      >

        {/* ── COLUMNA IZQUIERDA ── */}
        <div className="space-y-4">

          {/* Título mobile */}
          <div className="flex items-center gap-2 md:hidden">
            <div style={{ width: '3px', height: '22px', backgroundColor: T.gold, borderRadius: '2px', flexShrink: 0 }} />
            <h1 className="text-xl font-bold tracking-tight" style={{ color: T.navy }}>
              {language === 'en' ? 'Portfolio Template' : 'Plantilla del Portafolio'}
            </h1>
          </div>

          {/* Descripción */}
          <div
            className="rounded-2xl p-4 flex items-start gap-3"
            style={{ backgroundColor: T.goldPale, border: `1px solid rgba(201,168,76,0.35)` }}
          >
            <span className="text-lg flex-shrink-0">💡</span>
            <p className="text-xs leading-relaxed" style={{ color: T.navy, opacity: 0.8 }}>
              {language === 'en'
                ? 'Choose the visual style for your portfolio and property pages. Applied when clients visit your portfolio or open a property.'
                : 'Elige el estilo visual de tu portafolio y páginas de propiedades. Se aplica cuando los clientes visitan tu portafolio o abren una propiedad.'}
            </p>
          </div>

          {/* Lista de plantillas */}
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider px-1" style={{ color: T.muted }}>
              {language === 'en' ? 'Select a template' : 'Selecciona una plantilla'}
            </p>

            {TEMPLATES.map((tpl) => {
              const isActive = selected === tpl.id;
              return (
                <button
                  key={tpl.id}
                  onClick={() => { setSelected(tpl.id); setSaved(false); }}
                  className="w-full rounded-2xl overflow-hidden active:scale-[0.98] transition-transform text-left"
                  style={{
                    border: `${isActive ? '2px' : '1px'} solid ${isActive ? tpl.accent : T.border}`,
                    boxShadow: isActive
                      ? `0 0 0 3px ${tpl.accent}15, 0 2px 8px rgba(0,0,0,0.08)`
                      : '0 1px 4px rgba(27,45,91,0.05)',
                    backgroundColor: T.white,
                  }}
                >
                  <div className="flex items-stretch">
                    {/* Mini preview */}
                    <MiniPreview tpl={tpl} size="sm" />

                    {/* Info */}
                    <div className="flex-1 px-4 py-3">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{tpl.emoji}</span>
                          <p
                            className="font-bold text-sm"
                            style={{ color: isActive ? tpl.accent : T.navy }}
                          >
                            {language === 'en' ? tpl.label_en : tpl.label_es}
                          </p>
                        </div>
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
                          style={{
                            backgroundColor: isActive ? tpl.accent : 'transparent',
                            border: `2px solid ${isActive ? tpl.accent : T.border}`,
                          }}
                        >
                          {isActive && (
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M5 13l4 4L19 7"/>
                            </svg>
                          )}
                        </div>
                      </div>
                      <p className="text-xs leading-snug" style={{ color: T.muted }}>
                        {language === 'en' ? tpl.desc_en : tpl.desc_es}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Botón guardar — solo mobile */}
          <div className="md:hidden space-y-2 pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-4 rounded-2xl font-bold text-sm active:scale-95 transition-all disabled:opacity-60"
              style={{
                background: saved
                  ? 'linear-gradient(135deg, #15803D 0%, #16A34A 100%)'
                  : `linear-gradient(135deg, ${T.gold} 0%, ${T.goldLight} 100%)`,
                color: saved ? T.white : T.navy,
                boxShadow: '0 2px 8px rgba(201,168,76,0.3)',
              }}
            >
              {saving
                ? (language === 'en' ? 'Saving...' : 'Guardando...')
                : saved
                ? (language === 'en' ? '✅ Saved!' : '✅ ¡Guardado!')
                : (language === 'en' ? '💾 Save template' : '💾 Guardar plantilla')}
            </button>
            <p className="text-xs text-center" style={{ color: T.muted }}>
              {language === 'en'
                ? 'Changes apply immediately to your portfolio.'
                : 'Los cambios aplican de inmediato en tu portafolio.'}
            </p>
          </div>

        </div>{/* fin columna izquierda */}

        {/* ── COLUMNA DERECHA — preview grande sticky (solo tablet+) ── */}
        <div className="hidden md:block md:sticky md:top-4 space-y-4">

          {/* Preview grande */}
          <div
            className="rounded-2xl overflow-hidden shadow-sm"
            style={{ border: `2px solid ${selectedTpl.accent}` }}
          >
            <MiniPreview tpl={selectedTpl} size="lg" />
          </div>

          {/* Info de la plantilla seleccionada */}
          <div
            className="rounded-2xl p-4 shadow-sm"
            style={{ backgroundColor: T.white, border: `1px solid ${T.border}` }}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">{selectedTpl.emoji}</span>
              <p className="font-bold text-sm" style={{ color: T.navy }}>
                {language === 'en' ? selectedTpl.label_en : selectedTpl.label_es}
              </p>
            </div>
            <p className="text-xs" style={{ color: T.muted }}>
              {language === 'en' ? selectedTpl.desc_en : selectedTpl.desc_es}
            </p>
          </div>

          {/* Botón guardar */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-4 rounded-2xl font-bold text-sm active:scale-95 transition-all disabled:opacity-60"
            style={{
              background: saved
                ? 'linear-gradient(135deg, #15803D 0%, #16A34A 100%)'
                : `linear-gradient(135deg, ${T.gold} 0%, ${T.goldLight} 100%)`,
              color: saved ? T.white : T.navy,
              boxShadow: '0 2px 8px rgba(201,168,76,0.3)',
            }}
          >
            {saving
              ? (language === 'en' ? 'Saving...' : 'Guardando...')
              : saved
              ? (language === 'en' ? '✅ Saved!' : '✅ ¡Guardado!')
              : (language === 'en' ? '💾 Save template' : '💾 Guardar plantilla')}
          </button>

          <p className="text-xs text-center" style={{ color: T.muted }}>
            {language === 'en'
              ? 'Changes apply immediately to your portfolio and property pages.'
              : 'Los cambios aplican de inmediato en tu portafolio y páginas de propiedades.'}
          </p>
        </div>

      </div>
    </AppLayout>
  );
}