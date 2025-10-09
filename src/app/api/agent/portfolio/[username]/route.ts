import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params;

    if (!username) {
      return NextResponse.json(
        { error: 'Username no proporcionado' },
        { status: 400 }
      );
    }

    console.log('🔍 Buscando portfolio de:', username);

    // Obtener agente por username
    const { data: agent, error: agentError } = await supabaseAdmin
      .from('agents')
      .select('id, name, full_name, username, email, phone, brokerage, bio, profile_photo')
      .eq('username', username)
      .single();

    if (agentError || !agent) {
      console.error('❌ Agente no encontrado:', agentError);
      return NextResponse.json(
        { error: 'Agente no encontrado' },
        { status: 404 }
      );
    }

    // Obtener todas las propiedades del agente (activas y vendidas)
    const { data: properties, error: propertiesError } = await supabaseAdmin
      .from('properties')
      .select('*')
      .eq('agent_id', agent.id)
      .in('status', ['active', 'sold']) // Solo activas y vendidas (no pending)
      .order('created_at', { ascending: false });

    if (propertiesError) {
      console.error('❌ Error al obtener propiedades:', propertiesError);
      return NextResponse.json(
        { error: 'Error al cargar propiedades' },
        { status: 500 }
      );
    }

    console.log('✅ Portfolio encontrado:', agent.username);
    console.log('📊 Propiedades:', properties?.length || 0);

    return NextResponse.json({
      success: true,
      agent,
      properties: properties || [],
    });

  } catch (error: any) {
    console.error('❌ Error al cargar portfolio:', error);
    
    return NextResponse.json(
      { 
        error: 'Error al cargar el portfolio',
        details: error.message 
      },
      { status: 500 }
    );
  }
}