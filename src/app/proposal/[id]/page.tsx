// app/proposal/[id]/page.tsx
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

  console.log('🔍 Proposal metadata for id:', id);

  // Query 1: propuesta básica
  const { data: proposal, error } = await supabase
    .from('proposals')
    .select('id, title, template_style, created_at, agent_id')
    .eq('id', id)
    .single();

  console.log('📦 Proposal found:', proposal ? 'YES' : 'NO');
  console.log('❌ Supabase error:', error);

  if (error || !proposal) {
    return {
      title: 'Propuesta no encontrada — Flow Estate AI',
      description: 'Esta propuesta no está disponible.',
    };
  }

  // Query 2: agente
  const { data: agent } = await supabase
    .from('agents')
    .select('full_name, name, brokerage')
    .eq('id', (proposal as any).agent_id)
    .single();

  console.log('👤 Agent found:', agent ? 'YES' : 'NO');

  // Query 3: IDs de propiedades de la propuesta
  const { data: proposalProperties } = await supabase
    .from('proposal_properties')
    .select('display_order, property_id')
    .eq('proposal_id', id)
    .order('display_order', { ascending: true });

  // Query 4: datos de las propiedades
  let sortedProps: any[] = [];
  if (proposalProperties && proposalProperties.length > 0) {
    const propertyIds = proposalProperties.map((pp: any) => pp.property_id);
    const { data: properties } = await supabase
      .from('properties')
      .select('id, title, price, city, state, photos, currency_id')
      .in('id', propertyIds);

    if (properties) {
      sortedProps = proposalProperties
        .map((pp: any) => properties.find((p: any) => p.id === pp.property_id))
        .filter(Boolean);
    }
  }

  console.log('🏠 Properties found:', sortedProps.length);

  const agentName = agent?.full_name || agent?.name || 'Agente';
  const brokerage = agent?.brokerage || 'Flow Estate AI';
  const propertyCount = sortedProps.length;

  // Primera foto disponible
  const rawPhoto = sortedProps.find((p: any) => p?.photos?.[0])?.photos?.[0] || null;
  const ogImage = rawPhoto
    ? (rawPhoto.startsWith('http') ? rawPhoto : `https://flowestateai.com${rawPhoto}`)
    : 'https://flowestateai.com/og-default.jpg';

  // Precio desde primera propiedad con precio
  const firstPrice = sortedProps.find((p: any) => p?.price)?.price || null;
  const priceText = firstPrice
    ? `$${new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(firstPrice)}`
    : null;

  const title = `${proposal.title} — ${agentName}`;
  const description = [
    `${propertyCount} ${propertyCount === 1 ? 'propiedad seleccionada' : 'propiedades seleccionadas'}`,
    priceText ? `desde ${priceText}` : null,
    brokerage !== 'Flow Estate AI' ? brokerage : null,
    'Propuesta creada con Flow Estate AI',
  ].filter(Boolean).join(' · ');

  const url = `https://flowestateai.com/proposal/${id}`;

  console.log('✅ Proposal metadata OK');
  console.log('📝 Title:', title);
  console.log('🖼️ Image:', ogImage);

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      siteName: 'Flow Estate AI',
      images: [{
        url: ogImage,
        width: 1200,
        height: 630,
        alt: proposal.title,
      }],
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