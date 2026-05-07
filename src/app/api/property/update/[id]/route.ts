import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { supabaseAdmin } from '@/lib/supabase';
import Mux from '@mux/mux-node';

const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID!,
  tokenSecret: process.env.MUX_TOKEN_SECRET!,
});

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    const uploadToken = req.headers.get('X-Upload-Token');

    if (!session?.user?.email && !uploadToken) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    let agentId: string | null = null;

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
    }

    const { id } = await params;
    const updates = await req.json();

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

    const { data: property } = await supabaseAdmin
      .from('properties')
      .select('id')
      .eq('id', id)
      .eq('agent_id', agentId)
      .single();

    if (!property) {
      return NextResponse.json({ error: 'No tienes permiso' }, { status: 403 });
    }

    // Eliminar fotos del storage
    if (updates.photosToDelete && updates.photosToDelete.length > 0) {
      for (const photoUrl of updates.photosToDelete) {
        try {
          const urlParts = photoUrl.split('/property-photos/');
          if (urlParts.length > 1) {
            await supabaseAdmin.storage
              .from('property-photos')
              .remove([urlParts[1]]);
          }
        } catch (err) {
          console.error('Error eliminando foto:', err);
        }
      }
    }

    // NUEVO: Eliminar assets de Mux que fueron removidos
    if (updates.mux_asset_ids_to_delete && updates.mux_asset_ids_to_delete.length > 0) {
      for (const assetId of updates.mux_asset_ids_to_delete) {
        try {
          await mux.video.assets.delete(assetId);
          console.log(`🗑️ Asset Mux eliminado: ${assetId}`);
        } catch (err) {
          console.error(`Error eliminando asset Mux ${assetId}:`, err);
        }
      }
    }

    const allowedFields = [
      'title', 'description', 'price', 'currency_id', 'address', 'city', 
      'state', 'zip_code', 'property_type', 'listing_type', 'status', 
      'photos', 'latitude', 'longitude', 'plus_code', 'show_map', 
      'custom_fields_data', 'video_urls', 'video_processing', 
      'mux_upload_ids', 'mux_asset_ids'
    ];

    const updateData: Record<string, any> = {};
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updateData[field] = updates[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ success: true, message: 'Nada que actualizar' });
    }

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