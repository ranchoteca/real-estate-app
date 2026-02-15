import { Metadata } from 'next';
import { createClient } from '@supabase/supabase-js';
import AgentCardPage from './AgentCardPage';

interface PageProps {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ lang?: string }>;
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { username } = await params;
  const { lang } = await searchParams;
  const language = (lang || 'es') as 'es' | 'en';

  console.log('🔍 Metadata generation for agent card:', username);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Obtener el agente
  const { data: agent, error: agentError } = await supabase
    .from('agents')
    .select('email, phone')
    .eq('username', username)
    .single();

  if (agentError || !agent) {
    console.error('❌ Agent not found:', agentError);
    return {
      title: language === 'en' ? 'Agent Card' : 'Tarjeta de Agente',
      description: language === 'en' ? 'Real estate agent digital card' : 'Tarjeta digital de agente inmobiliario',
    };
  }

  // Obtener la tarjeta del agente
  const { data: card, error: cardError } = await supabase
    .from('agent_cards')
    .select('*')
    .eq('agent_email', agent.email)
    .single();

  if (cardError || !card) {
    console.error('❌ Agent card not found:', cardError);
    return {
      title: language === 'en' ? 'Agent Card' : 'Tarjeta de Agente',
      description: language === 'en' ? 'Real estate agent digital card' : 'Tarjeta digital de agente inmobiliario',
    };
  }

  console.log('✅ Agent card found:', card.display_name);

  // Construir metadata
  const displayName = language === 'en' && card.display_name_en 
    ? card.display_name_en 
    : card.display_name || agent.email;
  
  const brokerage = language === 'en' && card.brokerage_en 
    ? card.brokerage_en 
    : card.brokerage || '';

  const title = brokerage 
    ? `${displayName} - ${brokerage}`
    : displayName;

  const bio = language === 'en' && card.bio_en
    ? card.bio_en
    : card.bio;

  const description = bio || (language === 'en' 
    ? `Contact ${displayName} for real estate services`
    : `Contacta a ${displayName} para servicios inmobiliarios`);

  // Asegurar que la imagen sea URL absoluta
  let imageUrl = card.profile_photo || card.cover_photo;
  
  if (imageUrl && !imageUrl.startsWith('http')) {
    imageUrl = `https://www.flowestateai.com${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
  }
  
  if (!imageUrl) {
    imageUrl = 'https://www.flowestateai.com/og-default-agent.jpg';
  }

  const url = `https://www.flowestateai.com/agent/${username}/card${language ? `?lang=${language}` : ''}`;

  console.log('✅ Metadata generated successfully');
  console.log('📝 Title:', title);
  console.log('🖼️ Image:', imageUrl);

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      siteName: 'FlowEstateAI',
      images: [{
        url: imageUrl,
        width: 1200,
        height: 630,
        alt: displayName,
        type: 'image/jpeg',
      }],
      locale: language === 'es' ? 'es_ES' : 'en_US',
      type: 'profile',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
    alternates: {
      canonical: url,
    },
  };
}

// Deshabilitar caché estático
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function Page() {
  return <AgentCardPage />;
}