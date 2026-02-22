import { Metadata } from 'next';
import { createClient } from '@supabase/supabase-js';
import AgentCardPage from './AgentCardPage';

interface PageProps {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ lang?: string }>;
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  // ← Hacer await de params y searchParams
  const { username } = await params;
  const { lang } = await searchParams;
  const language = (lang || 'es') as 'es' | 'en';

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

    if (agentError || !agent) {
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

    if (cardError || !card) {
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
    let imageUrl = `https://www.flowestateai.com/api/og/agent-card/${username}${lang ? `?lang=${lang}` : ''}`;
    
    if (imageUrl && !imageUrl.startsWith('http')) {
      imageUrl = `https://www.flowestateai.com${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
    }
    
    if (!imageUrl) {
      imageUrl = 'https://www.flowestateai.com/og-default-agent.jpg';
    }

    const url = `https://www.flowestateai.com/agent/${username}/card${lang ? `?lang=${lang}` : ''}`;

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