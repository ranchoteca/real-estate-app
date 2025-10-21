import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    // Obtener agente
    const { data: agent, error: agentError } = await supabaseAdmin
      .from('agents')
      .select('id')
      .eq('email', session.user.email)
      .single();

    if (agentError || !agent) {
      return NextResponse.json(
        { error: 'Agente no encontrado' },
        { status: 404 }
      );
    }

    // Obtener campos personalizados del agente
    const { data: fields, error: fieldsError } = await supabaseAdmin
      .from('custom_fields')
      .select('*')
      .eq('agent_id', agent.id)
      .order('property_type', { ascending: true })
      .order('listing_type', { ascending: true })
      .order('display_order', { ascending: true });

    if (fieldsError) {
      console.error('Error al cargar campos:', fieldsError);
      return NextResponse.json(
        { error: 'Error al cargar campos personalizados' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      fields: fields || [],
    });

  } catch (error: any) {
    console.error('Error en list custom fields:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno' },
      { status: 500 }
    );
  }
}