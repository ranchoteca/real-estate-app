// app/api/proposals/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { supabaseAdmin } from '@/lib/supabase';

// ── GET público ──────────────────────────────────────────────────────────────
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    }

    // Query principal — sin agent_cards anidado
    const { data: proposal, error: proposalError } = await supabaseAdmin
      .from('proposals')
      .select(`
        id,
        title,
        template_style,
        created_at,
        agent_id,
        agents (
          id,
          full_name,
          name,
          phone,
          phone_2,
          email,
          brokerage,
          bio,
          profile_photo,
          username
        ),
        proposal_properties (
          display_order,
          property_id,
          properties (
            id,
            title,
            slug,
            description,
            price,
            currency_id,
            city,
            state,
            country,
            property_type,
            listing_type,
            photos,
            status,
            views,
            latitude,
            longitude,
            show_map,
            custom_fields_data,
            language,
            video_urls
          )
        )
      `)
      .eq('id', id)
      .single();

    if (proposalError || !proposal) {
      return NextResponse.json({ error: 'Propuesta no encontrada' }, { status: 404 });
    }

    const agentData = proposal.agents as any;

    // Query separada para agent_cards — más confiable que join anidado
    let cardProfilePhoto: string | null = null;
    if (agentData?.id) {
      const { data: card } = await supabaseAdmin
        .from('agent_cards')
        .select('profile_photo')
        .eq('agent_id', agentData.id)
        .single();

      cardProfilePhoto = card?.profile_photo || null;
    }

    const agent = {
      ...agentData,
      // card_profile_photo tiene prioridad, luego agents.profile_photo
      profile_photo: cardProfilePhoto || agentData?.profile_photo || null,
    };

    // Ordenar propiedades por display_order
    const sortedProperties = (proposal.proposal_properties || [])
      .sort((a: any, b: any) => (a.display_order ?? 0) - (b.display_order ?? 0))
      .map((pp: any) => pp.properties);

    return NextResponse.json({
      success: true,
      proposal: {
        id: proposal.id,
        title: proposal.title,
        template_style: proposal.template_style,
        created_at: proposal.created_at,
        agent,
        properties: sortedProperties,
      },
    });

  } catch (error) {
    console.error('❌ Error obteniendo propuesta:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// ── DELETE autenticado ───────────────────────────────────────────────────────
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { id } = await params;

    const { data: agent, error: agentError } = await supabaseAdmin
      .from('agents')
      .select('id')
      .eq('email', session.user.email)
      .single();

    if (agentError || !agent) {
      return NextResponse.json({ error: 'Agente no encontrado' }, { status: 404 });
    }

    const { data: proposal, error: checkError } = await supabaseAdmin
      .from('proposals')
      .select('id, agent_id')
      .eq('id', id)
      .eq('agent_id', agent.id)
      .single();

    if (checkError || !proposal) {
      return NextResponse.json({ error: 'Propuesta no encontrada o sin permiso' }, { status: 404 });
    }

    const { error: deleteError } = await supabaseAdmin
      .from('proposals')
      .delete()
      .eq('id', id)
      .eq('agent_id', agent.id);

    if (deleteError) {
      return NextResponse.json({ error: 'Error al eliminar la propuesta' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('❌ Error eliminando propuesta:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}