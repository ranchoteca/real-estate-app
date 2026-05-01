import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { propertyId } = await req.json();

    // 1. Obtener propiedad original
    const { data: original, error: fetchError } = await supabaseAdmin
      .from('properties')
      .select('*')
      .eq('id', propertyId)
      .single();

    if (fetchError || !original) {
      return NextResponse.json({ error: 'Propiedad no encontrada' }, { status: 404 });
    }

    // Verificar plan y límite — AQUÍ, después de confirmar que original existe
    const { data: agent } = await supabaseAdmin
      .from('agents')
      .select('plan, expires_at')
      .eq('id', original.agent_id)
      .single();

    const isProActivo = 
      agent?.plan === 'pro' && 
      agent?.expires_at && 
      new Date(agent.expires_at) > new Date();

    const propertyLimit = isProActivo ? 150 : 5;

    const { count } = await supabaseAdmin
      .from('properties')
      .select('*', { count: 'exact', head: true })
      .eq('agent_id', original.agent_id);

    if (count !== null && count >= propertyLimit) {
      return NextResponse.json(
        { 
          error: isProActivo 
            ? 'Has alcanzado el límite de 150 propiedades del plan Pro.'
            : 'Has alcanzado el límite de 5 propiedades. Actualiza a Pro para crear más.'
        },
        { status: 403 }
      );
    }

    // 2. Buscar slugs existentes para generar número único
    const baseSlug = original.slug;
    const { data: existingSlugs } = await supabaseAdmin
      .from('properties')
      .select('slug')
      .like('slug', `${baseSlug}%`);

    // Encontrar el siguiente número disponible
    let nextNumber = 2;
    const slugNumbers = existingSlugs
      ?.map(p => {
        const match = p.slug.match(new RegExp(`${baseSlug}-(\\d+)$`));
        return match ? parseInt(match[1]) : null;
      })
      .filter(n => n !== null) || [];

    if (slugNumbers.length > 0) {
      nextNumber = Math.max(...slugNumbers) + 1;
    }

    const newSlug = `${baseSlug}-${nextNumber}`;

    // 3. Crear copia EXACTA
    const { data: newProperty, error: insertError } = await supabaseAdmin
      .from('properties')
      .insert({
        agent_id: original.agent_id,
        title: original.title,
        description: original.description,
        price: original.price,
        currency_id: original.currency_id,
        address: original.address,
        city: original.city,
        state: original.state,
        zip_code: original.zip_code,
        country: original.country,
        property_type: original.property_type,
        listing_type: original.listing_type,
        language: original.language,
        photos: original.photos,
        latitude: original.latitude,
        longitude: original.longitude,
        plus_code: original.plus_code,
        show_map: original.show_map,
        custom_fields_data: original.custom_fields_data,
        slug: newSlug,
        status: 'active',
        views: 0,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error al duplicar:', insertError);
      return NextResponse.json({ error: 'Error al duplicar' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      newPropertyId: newProperty.id,
      slug: newProperty.slug,
    });

  } catch (error) {
    console.error('Error en duplicate:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}