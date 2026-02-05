import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { 
      position, 
      size, 
      opacity, 
      scale, 
      useCornerLogo, 
      useWatermark 
    } = await req.json();

    // Validar valores de logo en esquina
    const validPositions = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
    const validSizes = ['small', 'medium', 'large'];

    if (position && !validPositions.includes(position)) {
      return NextResponse.json({ error: 'Posición inválida' }, { status: 400 });
    }

    if (size && !validSizes.includes(size)) {
      return NextResponse.json({ error: 'Tamaño inválido' }, { status: 400 });
    }

    // Validar valores de watermark
    if (opacity !== undefined && (opacity < 0 || opacity > 100)) {
      return NextResponse.json({ error: 'Opacidad debe estar entre 0 y 100' }, { status: 400 });
    }

    if (scale !== undefined && (scale < 30 || scale > 70)) {
      return NextResponse.json({ error: 'Escala debe estar entre 30 y 70' }, { status: 400 });
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

    // Preparar actualización
    const updates: any = {};
    
    // Logo en esquina
    if (position !== undefined) updates.watermark_position = position;
    if (size !== undefined) updates.watermark_size = size;
    if (useCornerLogo !== undefined) updates.use_corner_logo = useCornerLogo;
    
    // Watermark centrado
    if (opacity !== undefined) updates.watermark_opacity = opacity;
    if (scale !== undefined) updates.watermark_scale = scale;
    if (useWatermark !== undefined) updates.use_watermark = useWatermark;

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