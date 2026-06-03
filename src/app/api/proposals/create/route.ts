// app/api/proposals/create/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // Obtener agente
    const { data: agent, error: agentError } = await supabaseAdmin
      .from('agents')
      .select('id, plan, expires_at')
      .eq('email', session.user.email)
      .single();

    if (agentError || !agent) {
      return NextResponse.json({ error: 'Agente no encontrado' }, { status: 404 });
    }

    // Parsear body
    const body = await req.json();
    const { title, template_style, property_ids } = body as {
      title: string;
      template_style: 'minimalist' | 'dynamic' | 'organic';
      property_ids: string[];
    };

    // Validaciones
    if (!title?.trim()) {
      return NextResponse.json({ error: 'El título es requerido' }, { status: 400 });
    }
    if (!['minimalist', 'dynamic', 'organic'].includes(template_style)) {
      return NextResponse.json({ error: 'Plantilla no válida' }, { status: 400 });
    }
    if (!Array.isArray(property_ids) || property_ids.length === 0) {
      return NextResponse.json({ error: 'Selecciona al menos una propiedad' }, { status: 400 });
    }
    if (property_ids.length > 20) {
      return NextResponse.json({ error: 'Máximo 20 propiedades por propuesta' }, { status: 400 });
    }

    // Verificar que todas las propiedades pertenecen al agente
    const { data: ownedProps, error: propsError } = await supabaseAdmin
      .from('properties')
      .select('id')
      .eq('agent_id', agent.id)
      .in('id', property_ids);

    if (propsError) {
      return NextResponse.json({ error: 'Error verificando propiedades' }, { status: 500 });
    }
    if ((ownedProps || []).length !== property_ids.length) {
      return NextResponse.json({ error: 'Algunas propiedades no te pertenecen' }, { status: 403 });
    }

    // Crear propuesta
    const { data: proposal, error: proposalError } = await supabaseAdmin
      .from('proposals')
      .insert({
        agent_id: agent.id,
        title: title.trim(),
        template_style,
      })
      .select('id, title, template_style, created_at')
      .single();

    if (proposalError || !proposal) {
      console.error('Error creando propuesta:', proposalError);
      return NextResponse.json({ error: 'Error al crear la propuesta' }, { status: 500 });
    }

    // Insertar relaciones proposal_properties respetando display_order
    const proposalProperties = property_ids.map((property_id, index) => ({
      proposal_id: proposal.id,
      property_id,
      display_order: index,
    }));

    const { error: relError } = await supabaseAdmin
      .from('proposal_properties')
      .insert(proposalProperties);

    if (relError) {
      console.error('Error insertando proposal_properties:', relError);
      // Limpiar propuesta huérfana
      await supabaseAdmin.from('proposals').delete().eq('id', proposal.id);
      return NextResponse.json({ error: 'Error al vincular propiedades' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      proposal: {
        id: proposal.id,
        title: proposal.title,
        template_style: proposal.template_style,
        created_at: proposal.created_at,
        property_count: property_ids.length,
        // El link público que el agente comparte con su cliente
        public_url: `/proposal/${proposal.id}`,
      },
    });

  } catch (error) {
    console.error('❌ Error creando propuesta:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}