import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    const uploadToken = req.headers.get('X-Upload-Token');

    // Permitir acceso con sesión O token
    if (!session?.user?.email && !uploadToken) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    let agentId: string | null = null;

    // Si hay token pero NO hay sesión, validar el token
    if (uploadToken && !session) {
      const { data: tokenData, error: tokenError } = await supabaseAdmin
        .from('upload_tokens')
        .select('id, agent_id, expires_at, is_active')
        .eq('token', uploadToken)
        .single();

      if (tokenError || !tokenData || !tokenData.is_active) {
        return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
      }

      if (new Date(tokenData.expires_at) < new Date()) {
        return NextResponse.json({ error: 'Token expirado' }, { status: 401 });
      }

      agentId = tokenData.agent_id;
      console.log('✅ Token validado - agentId:', agentId);
    }

    const { id } = await params;
    const updates = await req.json();

    // Obtener agent_id según el método de autenticación
    if (!agentId && session?.user?.email) {
      const { data: agent } = await supabaseAdmin
        .from('agents')
        .select('id, default_currency_id')
        .eq('email', session.user.email)
        .single();

      if (!agent) {
        return NextResponse.json({ error: 'Agente no encontrado' }, { status: 404 });
      }
      
      agentId = agent.id;
    }

    if (!agentId) {
      return NextResponse.json({ error: 'Agente no encontrado' }, { status: 404 });
    }

    // Verificar propiedad pertenece al agente
    const { data: property } = await supabaseAdmin
      .from('properties')
      .select('id')
      .eq('id', id)
      .eq('agent_id', agentId)
      .single();

    if (!property) {
      return NextResponse.json({ error: 'No tienes permiso' }, { status: 403 });
    }

    // Eliminar fotos del storage si hay en photosToDelete
    if (updates.photosToDelete && updates.photosToDelete.length > 0) {
      for (const photoUrl of updates.photosToDelete) {
        try {
          const urlParts = photoUrl.split('/property-photos/');
          if (urlParts.length > 1) {
            const filePath = urlParts[1];
            await supabaseAdmin.storage
              .from('property-photos')
              .remove([filePath]);
            console.log('🗑️ Foto eliminada del storage:', filePath);
          }
        } catch (err) {
          console.error('Error eliminando foto:', err);
        }
      }
    }

    // ✅ Construir objeto SOLO con campos que vienen definidos
    const allowedFields = [
      'title', 'description', 'price', 'currency_id', 'address', 'city', 
      'state', 'zip_code', 'property_type', 'listing_type', 'status', 
      'photos', 'latitude', 'longitude', 'plus_code', 'show_map', 
      'custom_fields_data'
    ];

    const updateData: Record<string, any> = {};
    
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updateData[field] = updates[field];
      }
    }

    // Solo actualizar si hay algo que actualizar
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ success: true, message: 'Nada que actualizar' });
    }

    console.log('📝 Campos a actualizar:', Object.keys(updateData));

    const { error } = await supabaseAdmin
      .from('properties')
      .update(updateData)
      .eq('id', id);

    if (error) {
      console.error('Error al actualizar:', error);
      return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 });
    }

    console.log('✅ Propiedad actualizada:', id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('❌ Error en update:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}