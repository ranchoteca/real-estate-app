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
    const { data: agent } = await supabaseAdmin
      .from('agents')
      .select('id')
      .eq('email', session.user.email)
      .single();

    if (!agent) {
      return NextResponse.json({ error: 'Agente no encontrado' }, { status: 404 });
    }

    // Limpiar datos de Facebook
    const { error } = await supabaseAdmin
      .from('agents')
      .update({
        facebook_page_id: null,
        facebook_page_name: null,
        facebook_access_token: null,
        facebook_connected_at: null,
      })
      .eq('id', agent.id);

    if (error) {
      throw new Error('Error al desvincular cuenta');
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error en disconnect:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}