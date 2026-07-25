import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { supabaseAdmin } from '@/lib/supabase';
import { disconnectTikTokAccount } from '@/lib/tiktok';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { data: agent } = await supabaseAdmin
      .from('agents')
      .select('id')
      .eq('email', session.user.email)
      .single();

    if (!agent) {
      return NextResponse.json({ error: 'Agente no encontrado' }, { status: 404 });
    }

    const { data: agentData } = await supabaseAdmin
      .from('agents')
      .select('tiktok_account_id')
      .eq('id', agent.id)
      .single();

    if (agentData?.tiktok_account_id) {
      try {
        await disconnectTikTokAccount(agentData.tiktok_account_id);
      } catch (pfmError) {
        // No es crítico si falla en Post for Me, igual limpiamos la BD
        console.error('Error desconectando TikTok en Post for Me (no crítico):', pfmError);
      }
    }

    const { error } = await supabaseAdmin
      .from('agents')
      .update({
        tiktok_account_id: null,
        tiktok_username: null,
        tiktok_connected_at: null,
      })
      .eq('id', agent.id);

    if (error) {
      throw new Error('Error al desvincular cuenta de TikTok');
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error en TikTok disconnect:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}