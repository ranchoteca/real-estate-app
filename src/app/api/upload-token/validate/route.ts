import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();

    if (!token) {
      return NextResponse.json({ valid: false, error: 'Token requerido' }, { status: 400 });
    }

    const { data: uploadToken } = await supabaseAdmin
      .from('upload_tokens')
      .select('agent_id, expires_at, is_active, agents(full_name, name)')
      .eq('token', token)
      .single();

    if (!uploadToken) {
      return NextResponse.json({ valid: false, error: 'Token inválido' });
    }

    if (!uploadToken.is_active) {
      return NextResponse.json({ valid: false, error: 'Token revocado' });
    }

    if (new Date(uploadToken.expires_at) < new Date()) {
      return NextResponse.json({ valid: false, error: 'Token expirado' });
    }

    const agentName = uploadToken.agents.full_name || uploadToken.agents.name || 'Agente';

    return NextResponse.json({
      valid: true,
      agentId: uploadToken.agent_id,
      agentName,
    });

  } catch (error: any) {
    console.error('Error validando token:', error);
    return NextResponse.json({ valid: false, error: 'Error del servidor' }, { status: 500 });
  }
}