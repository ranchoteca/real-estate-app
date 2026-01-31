import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { tokenId } = await req.json();

    const { data: agent } = await supabaseAdmin
      .from('agents')
      .select('id')
      .eq('email', session.user.email)
      .single();

    if (!agent) {
      return NextResponse.json({ error: 'Agente no encontrado' }, { status: 404 });
    }

    // Revocar token (solo si pertenece al agente)
    const { error } = await supabaseAdmin
      .from('upload_tokens')
      .update({ is_active: false })
      .eq('id', tokenId)
      .eq('agent_id', agent.id);

    if (error) {
      throw new Error('Error al revocar token');
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Error revocando token:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}