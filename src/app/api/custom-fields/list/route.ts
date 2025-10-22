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

    // Obtener query params
    const { searchParams } = new URL(req.url);
    const property_type = searchParams.get('property_type');
    const listing_type = searchParams.get('listing_type');

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

    // Construir query con filtros opcionales
    let query = supabaseAdmin
      .from('custom_fields')
      .select('*')
      .eq('agent_id', agent.id);

    // Aplicar filtros si existen
    if (property_type) {
      query = query.eq('property_type', property_type);
    }
    if (listing_type) {
      query = query.eq('listing_type', listing_type);
    }

    const { data: fields, error: fieldsError } = await query
      .order('display_order', { ascending: true });

    if (fieldsError) {
      console.error('Error al cargar campos:', fieldsError);
      return NextResponse.json(
        { error: 'Error al cargar campos personalizados' },
        { status: 500 }
      );
    }

    console.log(`✅ Campos cargados: ${fields?.length || 0} (type: ${property_type}, listing: ${listing_type})`);

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