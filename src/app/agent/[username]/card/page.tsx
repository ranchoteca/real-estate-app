import { Metadata } from 'next';
import AgentCardPage from './AgentCardPage';

interface Props {
  params: { username: string };
  searchParams: { lang?: string };
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { username } = params;
  const lang = searchParams.lang || 'es';

  try {
    // Fetch de la data del agente
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://tu-dominio.vercel.app';
    const response = await fetch(`${baseUrl}/api/agent-card/get?username=${username}`, {
      cache: 'no-store'
    });

    if (!response.ok) {
      return {
        title: lang === 'en' ? 'Agent Card' : 'Tarjeta de Agente',
      };
    }

    const data = await response.json();
    const { card, agent } = data;

    const displayName = lang === 'en' && card?.display_name_en 
      ? card.display_name_en 
      : card?.display_name || agent?.email || 'Agent';
    
    const brokerage = lang === 'en' && card?.brokerage_en 
      ? card.brokerage_en 
      : card?.brokerage || '';

    const title = brokerage 
      ? `${displayName} - ${brokerage}`
      : displayName;

    const description = lang === 'en' && card?.bio_en
      ? card.bio_en
      : card?.bio || (lang === 'en' 
          ? `Contact ${displayName} for real estate services`
          : `Contacta a ${displayName} para servicios inmobiliarios`);

    const imageUrl = card?.profile_photo || card?.cover_photo || `${baseUrl}/default-agent-card.jpg`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        images: [
          {
            url: imageUrl,
            width: 1200,
            height: 630,
            alt: displayName,
          }
        ],
        type: 'profile',
        url: `${baseUrl}/agent/${username}/card${lang ? `?lang=${lang}` : ''}`,
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [imageUrl],
      },
    };
  } catch (error) {
    console.error('Error generating metadata:', error);
    return {
      title: lang === 'en' ? 'Agent Card' : 'Tarjeta de Agente',
    };
  }
}

export default function Page() {
  return <AgentCardPage />;
}