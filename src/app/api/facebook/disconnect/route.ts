import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { supabaseAdmin } from '@/lib/supabase';
import { disconnectPostForMeAccount } from '@/lib/facebook';

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

    // Obtener account_id antes de limpiar
    const { data: agentData } = await supabaseAdmin
      .from('agents')
      .select('postforme_account_id')
      .eq('id', agent.id)
      .single();

    // Desconectar en Post for Me si hay cuenta vinculada
    if (agentData?.postforme_account_id) {
      try {
        await disconnectPostForMeAccount(agentData.postforme_account_id);
      } catch (pfmError) {
        // No es crítico si falla en Post for Me, igual limpiamos la BD
        console.error('Error desconectando en Post for Me (no crítico):', pfmError);
      }
    }

    // Limpiar datos en Supabase
    const { error } = await supabaseAdmin
      .from('agents')
      .update({
        postforme_account_id: null,
        postforme_username: null,
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