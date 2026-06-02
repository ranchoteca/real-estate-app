// app/api/proposals/list/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // Obtener agente
    const { data: agent, error: agentError } = await supabaseAdmin
      .from('agents')
      .select('id')
      .eq('email', session.user.email)
      .single();

    if (agentError || !agent) {
      return NextResponse.json({ error: 'Agente no encontrado' }, { status: 404 });
    }

    // Obtener propuestas del agente con sus propiedades relacionadas
    const { data: proposals, error: proposalsError } = await supabaseAdmin
      .from('proposals')
      .select(`
        id,
        title,
        template_style,
        created_at,
        updated_at,
        proposal_properties (
          display_order,
          property_id,
          properties (
            id,
            title,
            slug,
            price,
            currency_id,
            city,
            state,
            property_type,
            listing_type,
            photos,
            status
          )
        )
      `)
      .eq('agent_id', agent.id)
      .order('created_at', { ascending: false });

    if (proposalsError) {
      console.error('Error cargando propuestas:', proposalsError);
      return NextResponse.json({ error: 'Error al cargar propuestas' }, { status: 500 });
    }

    // Formatear: ordenar propiedades por display_order y limpiar foto
    const formatted = (proposals || []).map(proposal => ({
      id: proposal.id,
      title: proposal.title,
      template_style: proposal.template_style,
      created_at: proposal.created_at,
      updated_at: proposal.updated_at,
      public_url: `/proposal/${proposal.id}`,
      property_count: proposal.proposal_properties?.length ?? 0,
      properties: (proposal.proposal_properties || [])
        .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
        .map(pp => ({
          ...pp.properties,
          // Solo primera foto para el thumbnail
          photos: pp.properties?.photos ? [pp.properties.photos[0]] : [],
        })),
    }));

    return NextResponse.json({
      success: true,
      proposals: formatted,
    });

  } catch (error) {
    console.error('❌ Error listando propuestas:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}