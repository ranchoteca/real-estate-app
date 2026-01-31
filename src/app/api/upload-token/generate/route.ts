import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { supabaseAdmin } from '@/lib/supabase';
import crypto from 'crypto';

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

    // Generar token único
    const token = crypto.randomBytes(32).toString('hex');
    
    // Expira en 7 días
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Insertar token
    const { data: uploadToken, error } = await supabaseAdmin
      .from('upload_tokens')
      .insert({
        agent_id: agent.id,
        token,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw new Error('Error al crear token');
    }

    // Construir URL completa
    const uploadUrl = `${process.env.NEXT_PUBLIC_APP_URL}/upload/${token}`;

    return NextResponse.json({
      success: true,
      token: uploadToken.token,
      url: uploadUrl,
      expires_at: uploadToken.expires_at,
    });

  } catch (error: any) {
    console.error('Error generando token:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}