import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const property_type = searchParams.get('property_type');
    const listing_type = searchParams.get('listing_type');
    const username = searchParams.get('username'); 

    // ===== CASO 1: Usuario AUTENTICADO (Dashboard) =====
    const session = await getServerSession();
    if (session?.user?.email) {
      // Obtener agente por email (usuario autenticado)
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

      console.log(`✅ Campos cargados (autenticado): ${fields?.length || 0}`);

      return NextResponse.json({
        success: true,
        fields: fields || [],
      });
    }

    // ===== CASO 2: Usuario NO AUTENTICADO (Vista Pública) =====
    // Requiere username + property_type + listing_type
    if (!username || !property_type || !listing_type) {
      return NextResponse.json(
        { error: 'Se requiere username, property_type y listing_type para acceso público' },
        { status: 400 }
      );
    }

    // Buscar agente por username
    const { data: agent, error: agentError } = await supabaseAdmin
      .from('agents')
      .select('id')
      .eq('username', username)
      .single();

    if (agentError || !agent) {
      return NextResponse.json(
        { error: 'Agente no encontrado' },
        { status: 404 }
      );
    }

    // Obtener campos personalizados (solo campos necesarios para renderizar)
    const { data: fields, error: fieldsError } = await supabaseAdmin
      .from('custom_fields')
      .select('id, field_key, field_name, field_name_en, field_type, icon, display_order')
      .eq('agent_id', agent.id)
      .eq('property_type', property_type)
      .eq('listing_type', listing_type)
      .order('display_order', { ascending: true });

    if (fieldsError) {
      console.error('Error al cargar campos públicos:', fieldsError);
      return NextResponse.json(
        { error: 'Error al cargar campos personalizados' },
        { status: 500 }
      );
    }

    console.log(`✅ Campos cargados (público): ${fields?.length || 0}`);

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