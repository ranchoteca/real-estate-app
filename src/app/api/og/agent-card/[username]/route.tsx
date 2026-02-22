import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

export async function GET(
  request: NextRequest,
  { params }: { params: { username: string } }
) {
  try {
    const { username } = params;
    const searchParams = request.nextUrl.searchParams;
    const lang = searchParams.get('lang') || 'es';

    // Obtener datos del agente y tarjeta
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: agent } = await supabase
      .from('agents')
      .select('id, username, name, full_name, email')
      .eq('username', username)
      .single();

    if (!agent) {
      return new Response('Agent not found', { status: 404 });
    }

    const { data: card } = await supabase
      .from('agent_cards')
      .select('*')
      .eq('agent_id', agent.id)
      .single();

    if (!card) {
      return new Response('Card not found', { status: 404 });
    }

    const displayName = lang === 'en' && card.display_name_en 
      ? card.display_name_en 
      : card.display_name;
    
    const brokerage = lang === 'en' && card.brokerage_en 
      ? card.brokerage_en 
      : card.brokerage;

    // Generar imagen OG
    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#F8FAFC',
            backgroundImage: 'linear-gradient(to bottom right, #3B82F6, #8B5CF6)',
            position: 'relative',
          }}
        >
          {/* Foto de perfil */}
          {card.profile_photo && (
            <img
              src={card.profile_photo}
              alt={displayName}
              width={150}
              height={150}
              style={{
                borderRadius: '50%',
                border: '6px solid white',
                objectFit: 'cover',
              }}
            />
          )}

          {/* Nombre */}
          <div
            style={{
              marginTop: 24,
              fontSize: 60,
              fontWeight: 'bold',
              color: 'white',
              textAlign: 'center',
              textShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
            }}
          >
            {displayName}
          </div>

          {/* Brokerage */}
          {brokerage && (
            <div
              style={{
                marginTop: 12,
                fontSize: 36,
                color: 'rgba(255, 255, 255, 0.9)',
                textAlign: 'center',
              }}
            >
              {brokerage}
            </div>
          )}

          {/* Badge inferior */}
          <div
            style={{
              position: 'absolute',
              bottom: 40,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              backgroundColor: 'white',
              padding: '16px 32px',
              borderRadius: 50,
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
            }}
          >
            <div style={{ fontSize: 32 }}>📇</div>
            <div
              style={{
                fontSize: 28,
                fontWeight: '600',
                color: '#0F172A',
              }}
            >
              FlowEstateAI
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (error) {
    console.error('Error generating OG image:', error);
    return new Response('Error generating image', { status: 500 });
  }
}