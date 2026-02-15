import { Metadata } from 'next';
import { createClient } from '@supabase/supabase-js';
import AgentCardPage from './AgentCardPage';

interface PageProps {
  params: { username: string };
  searchParams: { lang?: string };
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const username = params.username;
  const language = (searchParams?.lang || 'es') as 'es' | 'en';

  console.log('========================================');
  console.log('🔍 AGENT CARD METADATA GENERATION START');
  console.log('Username:', username);
  console.log('Language:', language);
  console.log('========================================');

  try {
    // Crear cliente de Supabase (igual que en la API route)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Paso 1: Obtener el agente por username
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id, username, name, full_name, email, phone')
      .eq('username', username)
      .single();

    console.log('Agent query:', { agent, agentError });

    if (agentError || !agent) {
      console.error('❌ Agent not found');
      return {
        title: 'Agent Card - FlowEstateAI',
        description: 'Real estate agent digital card',
        openGraph: {
          title: 'Agent Card',
          description: 'Real estate agent digital card',
          images: ['https://www.flowestateai.com/og-default-agent.jpg'],
        },
      };
    }

    // Paso 2: Obtener la tarjeta usando agent_id
    const { data: card, error: cardError } = await supabase
      .from('agent_cards')
      .select('*')
      .eq('agent_id', agent.id)
      .single();

    console.log('Card query:', { card, cardError });

    if (cardError || !card) {
      console.error('❌ Card not found');
      return {
        title: `${agent.full_name || agent.name || agent.username} - FlowEstateAI`,
        description: 'Real estate agent digital card',
        openGraph: {
          title: agent.full_name || agent.name || agent.username,
          description: 'Real estate agent digital card',
          images: ['https://www.flowestateai.com/og-default-agent.jpg'],
        },
      };
    }

    // Construir metadata
    const displayName = language === 'en' && card.display_name_en 
      ? card.display_name_en 
      : card.display_name || agent.full_name || agent.name || agent.email;
    
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

    const url = `https://www.flowestateai.com/agent/${username}/card`;

    console.log('========================================');
    console.log('✅ METADATA GENERATED SUCCESSFULLY');
    console.log('Title:', title);
    console.log('Description:', description);
    console.log('Image:', imageUrl);
    console.log('URL:', url);
    console.log('========================================');

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
    };
  } catch (error) {
    console.error('========================================');
    console.error('❌ FATAL ERROR IN METADATA GENERATION');
    console.error('Error:', error);
    console.error('========================================');
    
    return {
      title: 'Agent Card - FlowEstateAI',
      description: 'Real estate agent digital card',
      openGraph: {
        title: 'Agent Card',
        description: 'Real estate agent digital card',
        images: ['https://www.flowestateai.com/og-default-agent.jpg'],
      },
    };
  }
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function Page() {
  return <AgentCardPage />;
}