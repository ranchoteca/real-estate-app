import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { position, size } = await req.json();

    // Validar valores
    const validPositions = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
    const validSizes = ['small', 'medium', 'large'];

    if (position && !validPositions.includes(position)) {
      return NextResponse.json({ error: 'Posición inválida' }, { status: 400 });
    }

    if (size && !validSizes.includes(size)) {
      return NextResponse.json({ error: 'Tamaño inválido' }, { status: 400 });
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

    // Actualizar configuración
    const updates: any = {};
    if (position) updates.watermark_position = position;
    if (size) updates.watermark_size = size;

    await supabaseAdmin
      .from('agents')
      .update(updates)
      .eq('id', agent.id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}