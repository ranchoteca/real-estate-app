// app/proposal/[id]/page.tsx
// Server Component — genera metadata para previews en WhatsApp, Facebook, etc.

import { Metadata } from 'next';
import { createClient } from '@supabase/supabase-js';
import ProposalPublicPage from './ProposalPublicPage';

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Obtener propuesta con agente y primera propiedad
  const { data: proposal, error } = await supabase
    .from('proposals')
    .select(`
      id,
      title,
      template_style,
      created_at,
      agents (
        full_name,
        name,
        brokerage,
        profile_photo
      ),
      proposal_properties (
        display_order,
        properties (
          title,
          price,
          city,
          state,
          photos,
          currency_id,
          listing_type,
          property_type
        )
      )
    `)
    .eq('id', id)
    .single();

  if (error || !proposal) {
    return {
      title: 'Propuesta no encontrada — Flow Estate AI',
      description: 'Esta propuesta no está disponible.',
    };
  }

  const agent = proposal.agents as any;
  const agentName = agent?.full_name || agent?.name || 'Agente';
  const brokerage = agent?.brokerage || 'Flow Estate AI';

  // Propiedades ordenadas
  const sortedProps = ((proposal.proposal_properties as any[]) || [])
    .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
    .map(pp => pp.properties)
    .filter(Boolean);

  const propertyCount = sortedProps.length;

  // Primera foto disponible
  const firstPhoto = sortedProps.find(p => p?.photos?.[0])?.photos?.[0] || null;
  const ogImage = firstPhoto
    ? (firstPhoto.startsWith('http') ? firstPhoto : `https://flowestateai.com${firstPhoto}`)
    : 'https://flowestateai.com/og-default.jpg';

  // Precios de las primeras 3 propiedades para la descripción
  const priceSnippets = sortedProps
    .slice(0, 3)
    .filter(p => p?.price)
    .map(p => {
      const price = new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(p.price);
      return `$${price}`;
    });

  // Título y descripción
  const title = `${proposal.title} — ${agentName}`;

  const description = [
    `${propertyCount} ${propertyCount === 1 ? 'propiedad seleccionada' : 'propiedades seleccionadas'}`,
    priceSnippets.length > 0 ? `desde ${priceSnippets[0]}` : null,
    brokerage !== 'Flow Estate AI' ? `${brokerage}` : null,
    `Propuesta creada con Flow Estate AI`,
  ]
    .filter(Boolean)
    .join(' · ');

  const url = `https://flowestateai.com/proposal/${id}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      siteName: 'Flow Estate AI',
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: proposal.title,
        },
      ],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
    alternates: {
      canonical: url,
    },
  };
}

export default function ProposalPage() {
  return <ProposalPublicPage />;
}