import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const username = searchParams.get('username');

    // Caso 1: Usuario autenticado pide su propia tarjeta
    const session = await getServerSession();
    if (session?.user?.email && !username) {
      const { data: agent } = await supabaseAdmin
        .from('agents')
        .select('id, username')
        .eq('email', session.user.email)
        .single();

      if (!agent) {
        return NextResponse.json(
          { error: 'Agente no encontrado' },
          { status: 404 }
        );
      }

      const { data: card } = await supabaseAdmin
        .from('agent_cards')
        .select('*')
        .eq('agent_id', agent.id)
        .single();

      return NextResponse.json({
        success: true,
        card: card || null,
        agent: { username: agent.username }
      });
    }

    // Caso 2: Acceso público por username
    if (!username) {
      return NextResponse.json(
        { error: 'Se requiere username' },
        { status: 400 }
      );
    }

    const { data: agent } = await supabaseAdmin
      .from('agents')
      .select('id, username, name, full_name, email, phone')
      .eq('username', username)
      .single();

    if (!agent) {
      return NextResponse.json(
        { error: 'Agente no encontrado' },
        { status: 404 }
      );
    }

    const { data: card } = await supabaseAdmin
      .from('agent_cards')
      .select('*')
      .eq('agent_id', agent.id)
      .single();

    return NextResponse.json({
      success: true,
      card: card || null,
      agent: {
        username: agent.username,
        name: agent.name,
        full_name: agent.full_name,
        email: agent.email,
        phone: agent.phone
      }
    });

  } catch (error: any) {
    console.error('Error getting agent card:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno' },
      { status: 500 }
    );
  }
}