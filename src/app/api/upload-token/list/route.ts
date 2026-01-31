import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
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

    // Obtener tokens activos y no expirados
    const { data: tokens } = await supabaseAdmin
      .from('upload_tokens')
      .select('*')
      .eq('agent_id', agent.id)
      .eq('is_active', true)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    return NextResponse.json({
      success: true,
      tokens: tokens || [],
    });

  } catch (error: any) {
    console.error('Error listando tokens:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}