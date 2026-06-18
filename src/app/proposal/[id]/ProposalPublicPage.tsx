'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { TemplateMinimalist, TemplateDynamic, TemplateOrganic, TemplateBeach, TemplateMountain, ProposalData } from '@/components/proposal/ProposalTemplates';

const detectBrowserLanguage = (): 'es' | 'en' => {
  if (typeof window === 'undefined') return 'es';
  return navigator.language.toLowerCase().startsWith('es') ? 'es' : 'en';
};

export default function ProposalPublicPage() {
  const params = useParams();
  const proposalId = params.id as string;

  const [proposal, setProposal] = useState<ProposalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currencySymbol, setCurrencySymbol] = useState('$');

  useEffect(() => {
    if (!proposalId) return;
    loadProposal();
  }, [proposalId]);

  const loadProposal = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/proposals/${proposalId}`);
      if (!res.ok) {
        setError('not_found');
        return;
      }
      const data = await res.json();
      setProposal(data.proposal);

      const firstWithCurrency = data.proposal.properties.find((p: any) => p.currency_id);
      if (firstWithCurrency?.currency_id) {
        loadCurrencySymbol(firstWithCurrency.currency_id);
      }
    } catch {
      setError('error');
    } finally {
      setLoading(false);
    }
  };

  const loadCurrencySymbol = async (currencyId: string) => {
    try {
      const res = await fetch('/api/currencies/list');
      if (res.ok) {
        const data = await res.json();
        const found = (data.currencies || []).find((c: any) => c.id === currencyId);
        if (found) setCurrencySymbol(found.symbol);
      }
    } catch {}
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5F5F5' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏠</div>
          <p style={{ fontSize: '16px', color: '#6B7280', fontFamily: 'system-ui' }}>
            {lang === 'en' ? 'Loading proposal...' : 'Cargando propuesta...'}
          </p>
        </div>
      </div>
    );
  }

  if (error || !proposal) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5F5F5', padding: '24px' }}>
        <div style={{ textAlign: 'center', maxWidth: '360px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>❌</div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#0F172A', marginBottom: '8px', fontFamily: 'system-ui' }}>
            {lang === 'en' ? 'Proposal not found' : 'Propuesta no encontrada'}
          </h1>
          <p style={{ fontSize: '14px', color: '#6B7280', fontFamily: 'system-ui' }}>
            {lang === 'en'
              ? 'The link may have expired or been deleted by the agent.'
              : 'El link puede haber expirado o fue eliminado por el agente.'}
          </p>
        </div>
      </div>
    );
  }

  const templateProps = { proposal, lang, currencySymbol };

  switch (proposal.template_style) {
    case 'dynamic':
      return <TemplateDynamic {...templateProps} />;
    case 'organic':
      return <TemplateOrganic {...templateProps} />;
    case 'beach':
      return <TemplateBeach {...templateProps} />;
    case 'mountain':
      return <TemplateMountain {...templateProps} />;
    case 'minimalist':
    default:
      return <TemplateMinimalist {...templateProps} />;
  }
}