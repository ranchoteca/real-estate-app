// app/api/proposals/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { supabaseAdmin } from '@/lib/supabase';

// ── GET público ─────────────────────────────────────────────────────────────
// Sin autenticación — es el endpoint que usa la página pública /propuesta/[id]
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    }

    // Obtener propuesta con propiedades y datos del agente
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

    // Ordenar propiedades por display_order
    const sortedProperties = (proposal.proposal_properties || [])
      .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
      .map(pp => pp.properties);

    return NextResponse.json({
      success: true,
      proposal: {
        id: proposal.id,
        title: proposal.title,
        template_style: proposal.template_style,
        created_at: proposal.created_at,
        agent: proposal.agents,
        properties: sortedProperties,
      },
    });

  } catch (error) {
    console.error('❌ Error obteniendo propuesta:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// ── DELETE autenticado ───────────────────────────────────────────────────────
// Solo el agente dueño puede eliminar su propuesta
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { id } = await params;

    // Obtener agente
    const { data: agent, error: agentError } = await supabaseAdmin
      .from('agents')
      .select('id')
      .eq('email', session.user.email)
      .single();

    if (agentError || !agent) {
      return NextResponse.json({ error: 'Agente no encontrado' }, { status: 404 });
    }

    // Verificar que la propuesta pertenece al agente antes de eliminar
    const { data: proposal, error: checkError } = await supabaseAdmin
      .from('proposals')
      .select('id, agent_id')
      .eq('id', id)
      .eq('agent_id', agent.id)
      .single();

    if (checkError || !proposal) {
      return NextResponse.json({ error: 'Propuesta no encontrada o sin permiso' }, { status: 404 });
    }

    // El ON DELETE CASCADE en proposal_properties elimina las relaciones automáticamente
    const { error: deleteError } = await supabaseAdmin
      .from('proposals')
      .delete()
      .eq('id', id)
      .eq('agent_id', agent.id);

    if (deleteError) {
      console.error('Error eliminando propuesta:', deleteError);
      return NextResponse.json({ error: 'Error al eliminar la propuesta' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('❌ Error eliminando propuesta:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}