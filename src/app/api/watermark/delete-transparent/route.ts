import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // Obtener agente
    const { data: agent } = await supabaseAdmin
      .from('agents')
      .select('id, watermark_image')
      .eq('email', session.user.email)
      .single();

    if (!agent) {
      return NextResponse.json({ error: 'Agente no encontrado' }, { status: 404 });
    }

    // Eliminar watermark de Storage si existe
    if (agent.watermark_image) {
      const oldPath = agent.watermark_image.split('/').pop();
      if (oldPath) {
        await supabaseAdmin.storage
          .from('watermarks')
          .remove([`${agent.id}/${oldPath}`]);
      }
    }

    // Actualizar BD (poner watermark en null y deshabilitar uso)
    await supabaseAdmin
      .from('agents')
      .update({ 
        watermark_image: null,
        use_watermark: false 
      })
      .eq('id', agent.id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}