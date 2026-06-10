'use client';

import { useEffect, useState } from 'react';
import { useI18nStore } from '@/lib/i18n-store';

interface ProposalProperty {
  id: string;
  title: string;
  photos: string[] | null;
}

interface Proposal {
  id: string;
  title: string;
  template_style: 'minimalist' | 'dynamic' | 'organic' | 'beach' | 'mountain';
  created_at: string;
  property_count: number;
  public_url: string;
  properties: ProposalProperty[];
}

const TEMPLATE_LABELS: Record<string, { es: string; en: string; emoji: string }> = {
  minimalist: { es: 'Ejecutiva', en: 'Executive', emoji: '🖤' },
  dynamic:    { es: 'Comercial', en: 'Commercial', emoji: '⚡' },
  organic:    { es: 'Natural',   en: 'Natural',    emoji: '🌿' },
  beach:      { es: 'Costera',    en: 'Coastal',     emoji: '🌊' },
  mountain:   { es: 'Alpina',     en: 'Alpine',      emoji: '🏔️' },
};

interface MyProposalsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MyProposalsModal({ isOpen, onClose }: MyProposalsModalProps) {
  const { language } = useI18nStore();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) loadProposals();
  }, [isOpen]);

  const loadProposals = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/proposals/list');
      if (res.ok) {
        const data = await res.json();
        setProposals(data.proposals || []);
      }
    } catch {}
    finally { setLoading(false); }
  };

  const getFullUrl = (proposal: Proposal) =>
    `${window.location.origin}${proposal.public_url}`;

  const handleCopy = async (proposal: Proposal) => {
    const url = getFullUrl(proposal);
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const el = document.createElement('textarea');
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopiedId(proposal.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleShare = async (proposal: Proposal) => {
    const url = getFullUrl(proposal);
    const tpl = TEMPLATE_LABELS[proposal.template_style];

    if (navigator.share) {
      try {
        await navigator.share({
          title: proposal.title,
          text: language === 'en'
            ? `${proposal.property_count} selected ${proposal.property_count === 1 ? 'property' : 'properties'} — ${tpl.en} style`
            : `${proposal.property_count} ${proposal.property_count === 1 ? 'propiedad seleccionada' : 'propiedades seleccionadas'} — estilo ${tpl.es}`,
          url,
        });
      } catch {
        // Usuario canceló — no hacer nada
      }
    } else {
      // Fallback: copiar al portapapeles
      await handleCopy(proposal);
    }
  };

  const handleDelete = async (proposal: Proposal) => {
    const confirmed = confirm(
      language === 'en'
        ? `Delete proposal "${proposal.title}"? The link will stop working.`
        : `¿Eliminar la propuesta "${proposal.title}"? El link dejará de funcionar.`
    );
    if (!confirmed) return;

    setDeletingId(proposal.id);
    try {
      const res = await fetch(`/api/proposals/${proposal.id}`, { method: 'DELETE' });
      if (res.ok) {
        setProposals(prev => prev.filter(p => p.id !== proposal.id));
      } else {
        alert(language === 'en' ? 'Error deleting proposal' : 'Error al eliminar la propuesta');
      }
    } catch {
      alert(language === 'en' ? 'Error deleting proposal' : 'Error al eliminar la propuesta');
    } finally {
      setDeletingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(2px)' }}>
      <div
        className="w-full rounded-t-3xl shadow-2xl overflow-hidden"
        style={{ backgroundColor: '#FFFFFF', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full" style={{ backgroundColor: '#E5E7EB' }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 flex-shrink-0" style={{ borderBottom: '1px solid #F3F4F6' }}>
          <div>
            <h2 className="text-lg font-bold" style={{ color: '#0F172A' }}>
              {language === 'en' ? '🗂️ My Proposals' : '🗂️ Mis Propuestas'}
            </h2>
            {!loading && (
              <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>
                {proposals.length === 0
                  ? (language === 'en' ? 'No proposals yet' : 'Aún no hay propuestas')
                  : `${proposals.length} ${language === 'en'
                      ? (proposals.length === 1 ? 'proposal' : 'proposals')
                      : (proposals.length === 1 ? 'propuesta' : 'propuestas')}`}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full"
            style={{ backgroundColor: '#F3F4F6', color: '#6B7280' }}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 px-5 py-4">

          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="text-4xl mb-3 animate-pulse">🗂️</div>
                <p className="text-sm" style={{ color: '#6B7280' }}>
                  {language === 'en' ? 'Loading...' : 'Cargando...'}
                </p>
              </div>
            </div>
          )}

          {!loading && proposals.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="text-5xl mb-4">📭</div>
              <p className="font-semibold mb-1" style={{ color: '#0F172A' }}>
                {language === 'en' ? 'No proposals yet' : 'Aún no tienes propuestas'}
              </p>
              <p className="text-sm" style={{ color: '#6B7280' }}>
                {language === 'en'
                  ? 'Select properties from the dashboard and tap "Create proposal"'
                  : 'Selecciona propiedades desde el dashboard y toca "Crear propuesta"'}
              </p>
            </div>
          )}

          {!loading && proposals.length > 0 && (
            <div className="space-y-3 pb-24">
              {proposals.map((proposal) => {
                const tpl = TEMPLATE_LABELS[proposal.template_style];
                const isCopied = copiedId === proposal.id;
                const isDeleting = deletingId === proposal.id;
                const fullUrl = getFullUrl(proposal);

                return (
                  <div
                    key={proposal.id}
                    className="rounded-2xl overflow-hidden"
                    style={{ border: '1.5px solid #F3F4F6', backgroundColor: '#FAFAFA' }}
                  >
                    {/* Thumbnails */}
                    {proposal.properties.length > 0 && (
                      <div className="flex h-16 overflow-hidden">
                        {proposal.properties.slice(0, 4).map((prop, idx) => (
                          <div
                            key={prop.id}
                            className="flex-1 relative overflow-hidden"
                            style={{ borderRight: idx < Math.min(proposal.properties.length, 4) - 1 ? '1px solid #FFFFFF' : 'none' }}
                          >
                            {prop.photos?.[0] ? (
                              <img src={prop.photos[0]} alt={prop.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-2xl" style={{ backgroundColor: '#F0F0EE' }}>🏠</div>
                            )}
                            {idx === 3 && proposal.property_count > 4 && (
                              <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                                <span className="text-white font-bold text-sm">+{proposal.property_count - 4}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Info */}
                    <div className="px-4 pt-3 pb-3">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-sm leading-snug line-clamp-1" style={{ color: '#0F172A' }}>
                            {proposal.title}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs" style={{ color: '#6B7280' }}>
                              {tpl.emoji} {language === 'en' ? tpl.en : tpl.es}
                            </span>
                            <span style={{ color: '#D1D5DB' }}>·</span>
                            <span className="text-xs" style={{ color: '#6B7280' }}>
                              {proposal.property_count} {language === 'en'
                                ? (proposal.property_count === 1 ? 'property' : 'properties')
                                : (proposal.property_count === 1 ? 'propiedad' : 'propiedades')}
                            </span>
                            <span style={{ color: '#D1D5DB' }}>·</span>
                            <span className="text-xs" style={{ color: '#6B7280' }}>
                              {new Date(proposal.created_at).toLocaleDateString(
                                language === 'en' ? 'en-US' : 'es-ES',
                                { day: 'numeric', month: 'short' }
                              )}
                            </span>
                          </div>
                        </div>
                        {/* Delete */}
                        <button
                          onClick={() => handleDelete(proposal)}
                          disabled={isDeleting}
                          className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg active:scale-90 transition-transform disabled:opacity-40"
                          style={{ backgroundColor: '#FEF2F2', color: '#DC2626' }}
                          aria-label={language === 'en' ? 'Delete' : 'Eliminar'}
                        >
                          {isDeleting ? '⏳' : '🗑️'}
                        </button>
                      </div>

                      {/* Link preview */}
                      <div
                        className="flex items-center gap-2 px-3 py-2 rounded-xl mb-2.5"
                        style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0' }}
                      >
                        <span className="flex-1 text-xs font-mono truncate" style={{ color: '#15803D' }}>
                          {fullUrl}
                        </span>
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-2">
                        {/* Copiar link */}
                        <button
                          onClick={() => handleCopy(proposal)}
                          className="flex-1 py-2 rounded-xl font-bold text-sm active:scale-95 transition-transform flex items-center justify-center gap-1.5"
                          style={{
                            backgroundColor: isCopied ? '#10B981' : '#2563EB',
                            color: '#FFFFFF',
                          }}
                        >
                          {isCopied
                            ? (language === 'en' ? '✅ Copied!' : '✅ ¡Copiado!')
                            : (language === 'en' ? '📋 Copy link' : '📋 Copiar link')}
                        </button>

                        {/* Share nativo — botón con ícono SVG */}
                        <button
                          onClick={() => handleShare(proposal)}
                          className="px-4 py-2 rounded-xl font-bold text-sm active:scale-95 transition-transform flex items-center justify-center gap-1.5"
                          style={{ backgroundColor: '#F0FDF4', color: '#15803D', border: '1px solid #BBF7D0' }}
                          aria-label={language === 'en' ? 'Share' : 'Compartir'}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="18" cy="5" r="3"/>
                            <circle cx="6" cy="12" r="3"/>
                            <circle cx="18" cy="19" r="3"/>
                            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                          </svg>
                          {language === 'en' ? 'Share' : 'Compartir'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}