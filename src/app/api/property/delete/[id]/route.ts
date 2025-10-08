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

    // Verificar que la propiedad pertenece al agente
    const { data: property, error: propertyError } = await supabaseAdmin
      .from('properties')
      .select('id, agent_id, photos')
      .eq('id', id)
      .single();

    if (propertyError || !property) {
      return NextResponse.json(
        { error: 'Propiedad no encontrada' },
        { status: 404 }
      );
    }

    if (property.agent_id !== agent.id) {
      return NextResponse.json(
        { error: 'No tienes permiso para eliminar esta propiedad' },
        { status: 403 }
      );
    }

    // Eliminar fotos del storage (opcional, pero recomendado)
    if (property.photos && property.photos.length > 0) {
      for (const photoUrl of property.photos) {
        try {
          // Extraer el path del storage desde la URL
          const urlParts = photoUrl.split('/property-photos/');
          if (urlParts.length > 1) {
            const filePath = urlParts[1];
            await supabaseAdmin.storage
              .from('property-photos')
              .remove([filePath]);
          }
        } catch (err) {
          console.error('Error eliminando foto:', err);
          // Continuar aunque falle eliminar una foto
        }
      }
    }

    // Eliminar propiedad de la base de datos
    const { error: deleteError } = await supabaseAdmin
      .from('properties')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error al eliminar propiedad:', deleteError);
      return NextResponse.json(
        { error: 'Error al eliminar la propiedad' },
        { status: 500 }
      );
    }

    console.log('✅ Propiedad eliminada:', id);

    return NextResponse.json({
      success: true,
      message: 'Propiedad eliminada exitosamente',
    });

  } catch (error) {
    console.error('❌ Error al eliminar propiedad:', error);
    
    return NextResponse.json(
      { 
        error: 'Error al eliminar la propiedad',
        details: error
      },
      { status: 500 }
    );
  }
}