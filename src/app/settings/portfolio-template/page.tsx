'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import AppLayout from '@/components/AppLayout';
import { useI18nStore } from '@/lib/i18n-store';

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
    if (!session?.user?.username) {
      setLoading(false);
      return;
    }
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
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch('/api/agent/portfolio-template', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ portfolio_template: selected }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        alert(language === 'en' ? 'Error saving template' : 'Error al guardar la plantilla');
      }
    } catch {
      alert(language === 'en' ? 'Connection error' : 'Error de conexión');
    } finally {
      setSaving(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <AppLayout title={language === 'en' ? 'Portfolio Template' : 'Plantilla del Portafolio'} showBack={true} showTabs={false}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center py-12">
            <div className="text-5xl mb-4 animate-pulse">🎨</div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!session) return null;

  const selectedTpl = TEMPLATES.find(t => t.id === selected)!;

  return (
    <AppLayout
      title={language === 'en' ? 'Portfolio Template' : 'Plantilla del Portafolio'}
      showBack={true}
      showTabs={false}
    >
      {/*
        mobile:  1 columna, igual que antes
        tablet+: 2 columnas — izquierda: descripción + lista de plantillas
                               derecha: preview de la selección + botón guardar (sticky)
      */}
      <div className="px-4 pt-4 pb-10 md:px-6 md:pt-6 md:grid md:grid-cols-2 md:gap-6 md:items-start lg:grid-cols-[1fr_360px]">

        {/* ── COLUMNA IZQUIERDA — descripción + selector ── */}
        <div className="space-y-4">

          {/* Descripción */}
          <div className="rounded-2xl p-4 shadow-md" style={{ backgroundColor: '#FFFFFF' }}>
            <p className="text-sm leading-relaxed" style={{ color: '#6B7280' }}>
              {language === 'en'
                ? 'Choose the visual style for your portfolio and property pages. This template is applied when clients visit your portfolio or open a property directly.'
                : 'Elige el estilo visual de tu portafolio y páginas de propiedades. Esta plantilla se aplica cuando los clientes visitan tu portafolio o abren una propiedad directamente.'}
            </p>
          </div>

          {/* Selector de plantillas */}
          <div className="space-y-3">
            {TEMPLATES.map((tpl) => {
              const isActive = selected === tpl.id;
              return (
                <button
                  key={tpl.id}
                  onClick={() => { setSelected(tpl.id); setSaved(false); }}
                  className="w-full rounded-2xl overflow-hidden active:scale-[0.98] transition-transform"
                  style={{
                    border: isActive ? `2px solid ${tpl.accent}` : '2px solid #F3F4F6',
                    boxShadow: isActive ? `0 0 0 3px ${tpl.accent}18` : 'none',
                    backgroundColor: '#FFFFFF',
                  }}
                >
                  <div className="flex items-stretch">
                    {/* Mini preview */}
                    <div
                      className="w-20 flex-shrink-0 flex flex-col justify-center items-center gap-1.5 py-4"
                      style={{ backgroundColor: tpl.preview_bg }}
                    >
                      <span className="text-2xl">{tpl.emoji}</span>
                      <div style={{ width: '32px', height: '3px', borderRadius: '2px', backgroundColor: tpl.accent, opacity: 0.6 }} />
                      <div style={{ width: '24px', height: '2px', borderRadius: '2px', backgroundColor: tpl.accent, opacity: 0.3 }} />
                      <div style={{ width: '28px', height: '2px', borderRadius: '2px', backgroundColor: tpl.accent, opacity: 0.3 }} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 px-4 py-4 text-left">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-bold text-sm" style={{ color: isActive ? tpl.accent : '#0F172A' }}>
                          {language === 'en' ? tpl.label_en : tpl.label_es}
                        </p>
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{
                            backgroundColor: isActive ? tpl.accent : 'transparent',
                            border: isActive ? 'none' : '2px solid #D1D5DB',
                          }}
                        >
                          {isActive && <span className="text-white text-xs font-bold">✓</span>}
                        </div>
                      </div>
                      <p className="text-xs leading-snug" style={{ color: '#6B7280' }}>
                        {language === 'en' ? tpl.desc_en : tpl.desc_es}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Botón guardar — solo visible en mobile (en desktop está en columna derecha) */}
          <div className="md:hidden space-y-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-4 rounded-2xl font-bold text-white shadow-lg active:scale-95 transition-transform disabled:opacity-60"
              style={{ backgroundColor: saved ? '#10B981' : '#2563EB' }}
            >
              {saving
                ? (language === 'en' ? 'Saving...' : 'Guardando...')
                : saved
                ? (language === 'en' ? '✅ Saved!' : '✅ ¡Guardado!')
                : (language === 'en' ? 'Save template' : 'Guardar plantilla')}
            </button>
            <p className="text-xs text-center" style={{ color: '#9CA3AF' }}>
              {language === 'en'
                ? 'Changes apply immediately to your portfolio and property pages.'
                : 'Los cambios aplican de inmediato en tu portafolio y páginas de propiedades.'}
            </p>
          </div>

        </div>{/* fin columna izquierda */}

        {/* ── COLUMNA DERECHA — preview grande + guardar (sticky, solo tablet+) ── */}
        <div className="hidden md:block md:sticky md:top-4 space-y-4">

          {/* Preview grande de la plantilla seleccionada */}
          <div className="rounded-2xl overflow-hidden shadow-lg" style={{ border: `2px solid ${selectedTpl.accent}` }}>
            {/* Header simulado */}
            <div
              className="px-5 py-4 flex items-center justify-between"
              style={{ backgroundColor: selectedTpl.preview_bg }}
            >
              <div className="flex flex-col gap-1.5">
                <div style={{ width: '80px', height: '4px', borderRadius: '2px', backgroundColor: selectedTpl.accent, opacity: 0.8 }} />
                <div style={{ width: '56px', height: '3px', borderRadius: '2px', backgroundColor: selectedTpl.accent, opacity: 0.4 }} />
              </div>
              <span className="text-3xl">{selectedTpl.emoji}</span>
            </div>

            {/* Simulación de card de propiedad */}
            <div className="p-5 space-y-3" style={{ backgroundColor: selectedTpl.bg }}>
              {/* Foto simulada */}
              <div
                className="w-full rounded-xl flex items-center justify-center"
                style={{ height: '120px', backgroundColor: selectedTpl.preview_bg }}
              >
                <span className="text-4xl opacity-60">🏠</span>
              </div>
              {/* Título */}
              <div style={{ width: '70%', height: '4px', borderRadius: '2px', backgroundColor: selectedTpl.accent, opacity: 0.7 }} />
              {/* Precio */}
              <div style={{ width: '40%', height: '6px', borderRadius: '2px', backgroundColor: selectedTpl.accent }} />
              {/* Detalles */}
              <div className="flex gap-2">
                <div style={{ width: '28%', height: '3px', borderRadius: '2px', backgroundColor: selectedTpl.accent, opacity: 0.3 }} />
                <div style={{ width: '28%', height: '3px', borderRadius: '2px', backgroundColor: selectedTpl.accent, opacity: 0.3 }} />
                <div style={{ width: '28%', height: '3px', borderRadius: '2px', backgroundColor: selectedTpl.accent, opacity: 0.3 }} />
              </div>
            </div>

            {/* Footer con nombre de la plantilla */}
            <div
              className="px-5 py-3 flex items-center justify-between"
              style={{ backgroundColor: selectedTpl.preview_bg }}
            >
              <p className="text-sm font-bold" style={{ color: selectedTpl.accent }}>
                {language === 'en' ? selectedTpl.label_en : selectedTpl.label_es}
              </p>
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center"
                style={{ backgroundColor: selectedTpl.accent }}
              >
                <span className="text-white text-xs font-bold">✓</span>
              </div>
            </div>
          </div>

          {/* Descripción de la plantilla seleccionada */}
          <div className="rounded-2xl p-4 shadow-md" style={{ backgroundColor: '#FFFFFF' }}>
            <p className="text-sm font-semibold mb-1" style={{ color: '#0F172A' }}>
              {selectedTpl.emoji} {language === 'en' ? selectedTpl.label_en : selectedTpl.label_es}
            </p>
            <p className="text-xs" style={{ color: '#6B7280' }}>
              {language === 'en' ? selectedTpl.desc_en : selectedTpl.desc_es}
            </p>
          </div>

          {/* Botón guardar */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-4 rounded-2xl font-bold text-white shadow-lg active:scale-95 transition-transform disabled:opacity-60"
            style={{ backgroundColor: saved ? '#10B981' : '#2563EB' }}
          >
            {saving
              ? (language === 'en' ? 'Saving...' : 'Guardando...')
              : saved
              ? (language === 'en' ? '✅ Saved!' : '✅ ¡Guardado!')
              : (language === 'en' ? 'Save template' : 'Guardar plantilla')}
          </button>

          <p className="text-xs text-center" style={{ color: '#9CA3AF' }}>
            {language === 'en'
              ? 'Changes apply immediately to your portfolio and property pages.'
              : 'Los cambios aplican de inmediato en tu portafolio y páginas de propiedades.'}
          </p>

        </div>{/* fin columna derecha */}

      </div>
    </AppLayout>
  );
}