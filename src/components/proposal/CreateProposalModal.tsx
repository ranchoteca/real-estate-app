'use client';

import { useState } from 'react';
import { useI18nStore } from '@/lib/i18n-store';

type TemplateStyle = 'minimalist' | 'dynamic' | 'organic' | 'beach' | 'mountain';

interface CreateProposalModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPropertyIds: string[];
  onProposalCreated?: (proposalId: string, publicUrl: string) => void;
  proposalLanguage?: 'es' | 'en' | null;
}

const TEMPLATES: {
  id: TemplateStyle;
  emoji: string;
  label_es: string;
  label_en: string;
  desc_es: string;
  desc_en: string;
  accent: string;
  bg: string;
}[] = [
  {
    id: 'minimalist',
    emoji: '🖤',
    label_es: 'Ejecutiva',
    label_en: 'Executive',
    desc_es: 'Serif elegante, espacios blancos. Ideal para propiedades de alto valor.',
    desc_en: 'Elegant serif, white space. Ideal for high-value properties.',
    accent: '#0F172A',
    bg: '#F8F8F6',
  },
  {
    id: 'dynamic',
    emoji: '⚡',
    label_es: 'Comercial',
    label_en: 'Commercial',
    desc_es: 'Bloques y datos duros destacados. Ideal para alta rotación.',
    desc_en: 'Bold blocks and key data. Ideal for high-turnover listings.',
    accent: '#2563EB',
    bg: '#EFF6FF',
  },
  {
    id: 'organic',
    emoji: '🌿',
    label_es: 'Natural',
    label_en: 'Natural',
    desc_es: 'Tonos tierra, bordes suaves. Ideal para playa y montaña.',
    desc_en: 'Earth tones, soft edges. Ideal for beach and mountain.',
    accent: '#65A30D',
    bg: '#F7FEE7',
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
  },
];

export default function CreateProposalModal({
  isOpen,
  onClose,
  selectedPropertyIds,
  onProposalCreated,
}: CreateProposalModalProps) {
  const { language } = useI18nStore();

  const [step, setStep] = useState<'form' | 'success'>('form');
  const [title, setTitle] = useState('');
  const [templateStyle, setTemplateStyle] = useState<TemplateStyle>('minimalist');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdUrl, setCreatedUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [createdPropertyCount, setCreatedPropertyCount] = useState(0);

  const handleClose = () => {
    setStep('form');
    setTitle('');
    setTemplateStyle('minimalist');
    setLoading(false);
    setError(null);
    setCreatedUrl(null);
    setCopied(false);
    onClose();
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      setError(language === 'en' ? 'Please enter a name for the proposal' : 'Ingresa un nombre para la propuesta');
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const response = await fetch('/api/proposals/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          template_style: templateStyle,
          property_ids: selectedPropertyIds,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || (language === 'en' ? 'Error creating proposal' : 'Error al crear la propuesta'));
        return;
      }

      const fullUrl = `${window.location.origin}${data.proposal.public_url}`;
      setCreatedPropertyCount(selectedPropertyIds.length);
      setCreatedUrl(fullUrl);
      setStep('success');
      onProposalCreated?.(data.proposal.id, fullUrl);

    } catch (err) {
      setError(language === 'en' ? 'Connection error. Please try again.' : 'Error de conexión. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!createdUrl) return;
    try {
      await navigator.clipboard.writeText(createdUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      const el = document.createElement('textarea');
      el.value = createdUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleShare = () => {
    if (!createdUrl) return;
    if (navigator.share) {
      navigator.share({
        title: title,
        text: language === 'en' ? 'Check out these properties I selected for you' : 'Mira estas propiedades que seleccioné para ti',
        url: createdUrl,
      });
    } else {
      handleCopy();
    }
  };

  if (!isOpen) return null;

  return (
    /* Overlay semitransparente — se ve el dashboard detrás */
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end"
      style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(2px)' }}
      onClick={handleClose}
    >
      {/* Sheet — ocupa casi toda la pantalla, con scroll interno */}
      <div
        className="w-full rounded-t-3xl shadow-2xl flex flex-col"
        style={{
          backgroundColor: '#FFFFFF',
          /* Sube casi hasta el tope — deja solo 8% de overlay visible arriba */
          maxHeight: '92dvh',
          height: '92dvh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full" style={{ backgroundColor: '#E5E7EB' }} />
        </div>

        {/* Área scrollable */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-28 pt-2">

          {/* ── PASO 1: FORMULARIO ── */}
          {step === 'form' && (
            <>
              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-lg font-bold" style={{ color: '#0F172A' }}>
                    {language === 'en' ? '🗂️ Create Proposal' : '🗂️ Crear Propuesta'}
                  </h2>
                  <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>
                    {selectedPropertyIds.length}{' '}
                    {language === 'en'
                      ? `propert${selectedPropertyIds.length === 1 ? 'y' : 'ies'} selected`
                      : `propiedad${selectedPropertyIds.length === 1 ? '' : 'es'} seleccionada${selectedPropertyIds.length === 1 ? '' : 's'}`}
                  </p>
                </div>
                <button
                  onClick={handleClose}
                  className="w-8 h-8 flex items-center justify-center rounded-full"
                  style={{ backgroundColor: '#F3F4F6', color: '#6B7280' }}
                  aria-label="Cerrar"
                >
                  ✕
                </button>
              </div>

              {/* Nombre de la propuesta */}
              <div className="mb-5">
                <label className="block text-sm font-semibold mb-2" style={{ color: '#0F172A' }}>
                  {language === 'en' ? 'Proposal name' : 'Nombre de la propuesta'}
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => { setTitle(e.target.value); setError(null); }}
                  placeholder={language === 'en' ? 'e.g. Properties for the Johnson family' : 'Ej. Propiedades para la familia Rodríguez'}
                  maxLength={80}
                  className="w-full px-4 py-3 rounded-xl border-2 text-sm focus:outline-none transition-colors"
                  style={{
                    borderColor: error ? '#FCA5A5' : '#E5E7EB',
                    backgroundColor: '#F9FAFB',
                    color: '#0F172A',
                  }}
                  autoFocus
                />
                {error && (
                  <p className="text-xs mt-1.5 font-semibold" style={{ color: '#DC2626' }}>
                    {error}
                  </p>
                )}
              </div>

              {/* Selector de plantilla */}
              <div className="mb-6">
                <label className="block text-sm font-semibold mb-3" style={{ color: '#0F172A' }}>
                  {language === 'en' ? 'Choose a template' : 'Elige una plantilla'}
                </label>
                <div className="flex flex-col gap-2.5">
                  {TEMPLATES.map((tpl) => {
                    const isActive = templateStyle === tpl.id;
                    return (
                      <button
                        key={tpl.id}
                        onClick={() => setTemplateStyle(tpl.id)}
                        className="flex items-center gap-3 px-4 py-3 rounded-2xl border-2 text-left transition-all active:scale-[0.98]"
                        style={{
                          borderColor: isActive ? tpl.accent : '#E5E7EB',
                          backgroundColor: isActive ? tpl.bg : '#FAFAFA',
                          boxShadow: isActive ? `0 0 0 3px ${tpl.accent}18` : 'none',
                        }}
                      >
                        <div
                          className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                          style={{ backgroundColor: isActive ? tpl.accent : '#F3F4F6' }}
                        >
                          <span>{tpl.emoji}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p
                            className="text-sm font-bold"
                            style={{ color: isActive ? tpl.accent : '#0F172A' }}
                          >
                            {language === 'en' ? tpl.label_en : tpl.label_es}
                          </p>
                          <p className="text-xs mt-0.5 leading-snug" style={{ color: '#6B7280' }}>
                            {language === 'en' ? tpl.desc_en : tpl.desc_es}
                          </p>
                        </div>
                        <div
                          className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center"
                          style={{
                            backgroundColor: isActive ? tpl.accent : 'transparent',
                            border: isActive ? 'none' : '2px solid #D1D5DB',
                          }}
                        >
                          {isActive && <span className="text-white text-xs font-bold">✓</span>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Botones */}
              <div className="flex gap-3">
                <button
                  onClick={handleClose}
                  className="flex-1 py-3.5 rounded-xl font-bold border-2 active:scale-95 transition-transform"
                  style={{ borderColor: '#E5E7EB', color: '#6B7280', backgroundColor: '#FFFFFF' }}
                >
                  {language === 'en' ? 'Cancel' : 'Cancelar'}
                </button>
                <button
                  onClick={handleCreate}
                  disabled={loading || !title.trim()}
                  className="flex-1 py-3.5 rounded-xl font-bold text-white shadow-lg active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: '#2563EB' }}
                >
                  {loading
                    ? (language === 'en' ? 'Creating...' : 'Creando...')
                    : (language === 'en' ? 'Create & get link ↗' : 'Crear y obtener link ↗')}
                </button>
              </div>
            </>
          )}

          {/* ── PASO 2: ÉXITO + LINK ── */}
          {step === 'success' && createdUrl && (
            <>
              <div className="text-center mb-6 pt-2">
                <div className="text-5xl mb-3">🎉</div>
                <h2 className="text-xl font-bold mb-1" style={{ color: '#0F172A' }}>
                  {language === 'en' ? 'Proposal created!' : '¡Propuesta creada!'}
                </h2>
                <p className="text-sm" style={{ color: '#6B7280' }}>
                  {language === 'en'
                    ? 'Share this link with your client'
                    : 'Comparte este link con tu cliente'}
                </p>
              </div>

              <div
                className="flex items-center gap-2 px-4 py-3 rounded-2xl mb-4"
                style={{ backgroundColor: '#F0FDF4', border: '1.5px solid #BBF7D0' }}
              >
                <span className="flex-1 text-xs font-mono truncate" style={{ color: '#15803D' }}>
                  {createdUrl}
                </span>
              </div>

              <div className="flex flex-col gap-2.5 mb-4">
                <button
                  onClick={handleCopy}
                  className="w-full py-3.5 rounded-xl font-bold text-white shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2"
                  style={{ backgroundColor: copied ? '#10B981' : '#2563EB' }}
                >
                  {copied
                    ? (language === 'en' ? '✅ Copied!' : '✅ ¡Copiado!')
                    : (language === 'en' ? '📋 Copy link' : '📋 Copiar link')}
                </button>

                <button
                  onClick={handleShare}
                  className="w-full py-3.5 rounded-xl font-bold active:scale-95 transition-transform flex items-center justify-center gap-2"
                  style={{ backgroundColor: '#F0FDF4', color: '#15803D', border: '1.5px solid #BBF7D0' }}
                >
                  📤 {language === 'en' ? 'Share via WhatsApp / other' : 'Compartir por WhatsApp / otro'}
                </button>
              </div>

              <div
                className="px-4 py-3 rounded-xl mb-5 text-xs"
                style={{ backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB' }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span style={{ color: '#6B7280' }}>{language === 'en' ? 'Name' : 'Nombre'}</span>
                  <span className="font-semibold" style={{ color: '#0F172A' }}>{title}</span>
                </div>
                <div className="flex items-center justify-between mb-1">
                  <span style={{ color: '#6B7280' }}>{language === 'en' ? 'Template' : 'Plantilla'}</span>
                  <span className="font-semibold" style={{ color: '#0F172A' }}>
                    {TEMPLATES.find(t => t.id === templateStyle)?.[language === 'en' ? 'label_en' : 'label_es']}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span style={{ color: '#6B7280' }}>{language === 'en' ? 'Properties' : 'Propiedades'}</span>
                  <span className="font-semibold" style={{ color: '#0F172A' }}>{createdPropertyCount}</span>
                </div>
              </div>

              <button
                onClick={handleClose}
                className="w-full py-3 rounded-xl font-semibold border-2 active:scale-95 transition-transform"
                style={{ borderColor: '#E5E7EB', color: '#6B7280' }}
              >
                {language === 'en' ? 'Close' : 'Cerrar'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}