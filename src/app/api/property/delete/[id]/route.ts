import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { supabaseAdmin } from '@/lib/supabase';
import Mux from '@mux/mux-node';

const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID!,
  tokenSecret: process.env.MUX_TOKEN_SECRET!,
});

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { id } = await params;

    const { data: agent, error: agentError } = await supabaseAdmin!
      .from('agents')
      .select('id')
      .eq('email', session.user.email)
      .single();

    if (agentError || !agent) {
      return NextResponse.json({ error: 'Agente no encontrado' }, { status: 404 });
    }

    const { data: property, error: propertyError } = await supabaseAdmin!
      .from('properties')
      .select('id, agent_id, photos, mux_asset_ids')
      .eq('id', id)
      .single();

    if (propertyError || !property) {
      return NextResponse.json({ error: 'Propiedad no encontrada' }, { status: 404 });
    }

    if (property.agent_id !== agent.id) {
      return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });
    }

    // Eliminar fotos de Supabase Storage
    if (property.photos && property.photos.length > 0) {
      for (const photoUrl of property.photos) {
        try {
          const urlParts = photoUrl.split('/property-photos/');
          if (urlParts.length > 1) {
            await supabaseAdmin!.storage
              .from('property-photos')
              .remove([urlParts[1]]);
          }
        } catch (err) {
          console.error('Error eliminando foto:', err);
        }
      }
    }

    // Eliminar assets de Mux
    if (property.mux_asset_ids && property.mux_asset_ids.length > 0) {
      for (const assetId of property.mux_asset_ids) {
        try {
          await mux.video.assets.delete(assetId);
          console.log(`🗑️ Asset Mux eliminado: ${assetId}`);
        } catch (err) {
          console.error(`Error eliminando asset Mux ${assetId}:`, err);
          // Continuar aunque falle uno
        }
      }
    }

    // Eliminar propiedad de la DB
    const { error: deleteError } = await supabaseAdmin!
      .from('properties')
      .delete()
      .eq('id', id);

    if (deleteError) {
      return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 });
    }

    console.log('✅ Propiedad eliminada:', id);
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('❌ Error al eliminar propiedad:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}