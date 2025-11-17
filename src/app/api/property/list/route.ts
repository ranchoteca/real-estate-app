/ app/api/property/list/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    // Verificar autenticación
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    // Obtener el agente actual
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

    // Obtener propiedades del agente (incluyendo currency_id)
    const { data: properties, error: propertiesError } = await supabaseAdmin
      .from('properties')
      .select('id, title, slug, price, currency_id, city, state, property_type, photos, status, views, created_at, listing_type')
      .eq('agent_id', agent.id)
      .order('created_at', { ascending: false });

    if (propertiesError) {
      console.error('Error al obtener propiedades:', propertiesError);
      return NextResponse.json(
        { error: 'Error al cargar propiedades' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      properties: properties || [],
    });

  } catch (error) {
    console.error('❌ Error al listar propiedades:', error);
    
    return NextResponse.json(
      { 
        error: 'Error al cargar propiedades',
        details: error 
      },
      { status: 500 }
    );
  }
}