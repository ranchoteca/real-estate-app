import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { id } = await params;
    const updates = await req.json();

    const { data: agent } = await supabaseAdmin
      .from('agents')
      .select('id, default_currency_id')
      .eq('email', session.user.email)
      .single();

    if (!agent) {
      return NextResponse.json({ error: 'Agente no encontrado' }, { status: 404 });
    }

    // Verificar propiedad pertenece al agente
    const { data: property } = await supabaseAdmin
      .from('properties')
      .select('id')
      .eq('id', id)
      .eq('agent_id', agent.id)
      .single();

    if (!property) {
      return NextResponse.json({ error: 'No tienes permiso' }, { status: 403 });
    }

    // Si no viene currency_id, usar la del agente o la por defecto del sistema
    let currencyId = updates.currency_id;
    if (!currencyId) {
      if (agent.default_currency_id) {
        currencyId = agent.default_currency_id;
      } else {
        const { data: defaultCurrency } = await supabaseAdmin
          .from('currencies')
          .select('id')
          .eq('is_default', true)
          .single();
        currencyId = defaultCurrency?.id || null;
      }
      console.log('📌 Asignando divisa por defecto:', currencyId);
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

    // Actualizar propiedad
    const { error } = await supabaseAdmin
      .from('properties')
      .update({
        title: updates.title,
        description: updates.description,
        price: updates.price,
        currency_id: currencyId,
        address: updates.address,
        city: updates.city,
        state: updates.state,
        zip_code: updates.zip_code,
        bedrooms: updates.bedrooms,
        bathrooms: updates.bathrooms,
        sqft: updates.sqft,
        property_type: updates.property_type,
        listing_type: updates.listing_type,
        status: updates.status,
        photos: updates.photos,
        latitude: updates.latitude,
        longitude: updates.longitude,
        plus_code: updates.plus_code,
        show_map: updates.show_map,
        custom_fields_data: updates.custom_fields_data || {},
      })
      .eq('id', id);

    if (error) {
      console.error('Error al actualizar:', error);
      return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 });
    }

    console.log('✅ Propiedad actualizada:', id);
    console.log('💰 Divisa:', currencyId);
    console.log('📍 Plus Code:', updates.plus_code);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('❌ Error en update:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}