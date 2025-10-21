import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Obtener agente
    const { data: agent, error: agentError } = await supabaseAdmin
      .from('agents')
      .select('id')
      .eq('email', session.user.email)
      .single();

    if (agentError || !agent) {
      return NextResponse.json(
        { error: 'Agente no encontrado' },
        { status: 404 }
      );
    }

    // Verificar que el campo pertenece al agente
    const { data: field, error: fieldError } = await supabaseAdmin
      .from('custom_fields')
      .select('*')
      .eq('id', id)
      .eq('agent_id', agent.id)
      .single();

    if (fieldError || !field) {
      return NextResponse.json(
        { error: 'Campo no encontrado o no tienes permiso' },
        { status: 404 }
      );
    }

    // Eliminar campo
    const { error: deleteError } = await supabaseAdmin
      .from('custom_fields')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error al eliminar campo:', deleteError);
      return NextResponse.json(
        { error: 'Error al eliminar el campo' },
        { status: 500 }
      );
    }

    console.log('✅ Campo personalizado eliminado:', id);

    return NextResponse.json({
      success: true,
      message: 'Campo eliminado correctamente',
    });

  } catch (error: any) {
    console.error('Error en delete custom field:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno' },
      { status: 500 }
    );
  }
}